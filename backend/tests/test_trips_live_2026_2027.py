import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from app.services.timetable_sync_service import timetable_sync_service, BUCHAREST_TZ
from scraper.collectors.train_api import DataGovXMLAdapter


@pytest.mark.asyncio
async def test_timetable_transition_and_version_resolution():
    """Verifies seamless resolution of 2025-2026 and 2026-2027 timetable periods at mid-December rail transition."""
    # Dates up to 2026-12-12 use 2025-2026 XML catalog
    assert timetable_sync_service.resolve_timetable_version("2026-11-18") == "2025-2026"
    assert timetable_sync_service.resolve_timetable_version("2026-12-01") == "2025-2026"
    assert timetable_sync_service.resolve_timetable_version("2026-12-12") == "2025-2026"

    # Mid-December annual rail transition: from 2026-12-13 onward routes through 2026-2027 catalog
    assert timetable_sync_service.resolve_timetable_version("2026-12-13") == "2026-2027"
    assert timetable_sync_service.resolve_timetable_version("2026-12-20") == "2026-2027"
    assert timetable_sync_service.resolve_timetable_version("2027-01-15") == "2026-2027"


@pytest.mark.asyncio
async def test_booking_window_validation_boundaries(client: AsyncClient):
    """Verifies provider-accepted planning horizon [minDate, maxDate] enforcement."""
    bw = timetable_sync_service.get_booking_window()
    min_date = bw["minDate"]
    max_date = bw["maxDate"]

    # 1. Past dates must be rejected with HTTP 422
    past_date = "2025-01-01"
    res_past = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Brașov", "city": "Brașov"},
        "departureTime": f"{past_date}T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    })
    assert res_past.status_code == 422
    assert "Cannot plan or book a trip in the past" in res_past.json()["detail"]

    res_trains_past = await client.get(f"/api/v1/trains?travel_date={past_date}")
    assert res_trains_past.status_code == 422
    assert "Cannot plan or book a trip in the past" in res_trains_past.json()["detail"]

    # 2. Out-of-window future dates (> +90 days) must be rejected with HTTP 422
    far_future_date = (datetime.now(BUCHAREST_TZ).date() + timedelta(days=120)).isoformat()
    res_far = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Brașov", "city": "Brașov"},
        "departureTime": f"{far_future_date}T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    })
    assert res_far.status_code == 422
    assert "outside the booking window" in res_far.json()["detail"]

    # 3. Valid date within window succeeds with HTTP 200 and attaches bookingWindow metadata
    valid_date = (datetime.now(BUCHAREST_TZ).date() + timedelta(days=10)).isoformat()
    res_valid = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Brașov", "city": "Brașov"},
        "departureTime": f"{valid_date}T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    })
    assert res_valid.status_code == 200
    valid_data = res_valid.json()
    assert "bookingWindow" in valid_data
    assert valid_data["bookingWindow"]["advanceBookingDays"] == 90
    assert valid_data["bookingWindow"]["minDate"] == min_date
    assert valid_data["bookingWindow"]["maxDate"] == max_date


@pytest.mark.asyncio
async def test_timetable_status_endpoint(client: AsyncClient):
    """Verifies GET /api/v1/trains/timetable-status returns accurate rail catalog metrics across 7 operators."""
    res = await client.get("/api/v1/trains/timetable-status")
    assert res.status_code == 200
    data = res.json()

    assert "activeTimetable" in data
    assert data["totalActiveDailyTrains"] >= 2100
    assert data["totalRoutes"] >= 700

    operators = data["operatorCounts"]
    assert "CFR Călători" in operators
    assert "Regio Călători" in operators
    assert "Transferoviar Călători" in operators
    assert "Interregional Călători" in operators
    assert "Astra Trans Carpatic" in operators
    assert "Ferotrafic TFI" in operators
    assert "Softrans" in operators
    assert all(count > 0 for count in operators.values())


@pytest.mark.asyncio
async def test_train_only_routing_and_no_bus_invariant(client: AsyncClient):
    """Enforces 100% train-only routing on /routes/plan when allowedModes: ['TRAIN']."""
    today_str = datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")

    res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Timișoara Nord", "city": "Timișoara"},
        "destination": {"name": "Cluj-Napoca", "city": "Cluj-Napoca"},
        "departureTime": f"{today_str}T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["plans"]) >= 1

    for plan in data["plans"]:
        assert len(plan["legs"]) >= 1
        for leg in plan["legs"]:
            # Strict invariant: exactly TRAIN, zero bus/metro/tram
            assert leg["transportType"] == "TRAIN"
            assert leg["names"]["lineCode"] is not None
            assert leg["names"]["operatorName"] is not None


@pytest.mark.asyncio
async def test_direct_and_transfer_rail_journeys(client: AsyncClient):
    """Tests direct train retrieval and 1-transfer routing across real Romanian rail hubs."""
    today_str = datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")

    # 1. Direct rail query: Timișoara Nord ➔ Cluj-Napoca
    res_direct = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Timișoara Nord", "city": "Timișoara"},
        "destination": {"name": "Cluj-Napoca", "city": "Cluj-Napoca"},
        "departureTime": f"{today_str}T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
        "optimizationPreference": "FASTEST"
    })
    assert res_direct.status_code == 200
    direct_plans = res_direct.json()["plans"]
    assert len(direct_plans) >= 1
    direct_plan = direct_plans[0]
    assert direct_plan["transfersCount"] == 0
    assert len(direct_plan["legs"]) == 1

    # 2. 1-transfer rail query: Galați ➔ Timișoara Nord (via hub București or Ploiești)
    res_transfer = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "Timișoara Nord", "city": "Timișoara"},
        "departureTime": f"{today_str}T06:00:00+02:00",
        "allowedModes": ["TRAIN"],
        "minimumBufferMinutes": 15
    })
    assert res_transfer.status_code == 200
    transfer_plans = res_transfer.json()["plans"]
    assert len(transfer_plans) >= 1
    transfer_plan = transfer_plans[0]
    assert transfer_plan["transfersCount"] >= 1
    assert len(transfer_plan["legs"]) == transfer_plan["transfersCount"] + 1
    assert all(l["transportType"] == "TRAIN" for l in transfer_plan["legs"])

    # Leg 1 transfer buffer must be valid and within realistic bounds (e.g., 10..480 minutes)
    leg1 = transfer_plan["legs"][0]
    assert leg1["risk"]["transferBufferAfterMinutes"] is not None
    assert 10 <= leg1["risk"]["transferBufferAfterMinutes"] <= 480


@pytest.mark.asyncio
async def test_trains_endpoint_2026_2027_transition(client: AsyncClient):
    """Verifies GET /api/v1/trains returns real trains across both 2025-2026 and 2026-2027 timetable catalogs."""
    # Active 2025-2026 timetable query
    res_2025 = await client.get("/api/v1/trains?origin=BCT&destination=BSV&travel_date=2026-11-21")
    assert res_2025.status_code == 200
    data_2025 = res_2025.json()
    assert len(data_2025["data"]) > 0

    # 2026-2027 timetable query (dates after transition 2026-12-13)
    res_2026 = await client.get("/api/v1/trains?origin=BCT&destination=BSV&travel_date=2026-12-20")
    assert res_2026.status_code == 200
    data_2026 = res_2026.json()
    assert len(data_2026["data"]) > 0
    # Every train has valid real train number, operator, and stops
    for item in data_2026["data"][:5]:
        assert len(item["trainNumber"]) > 0
        assert item["operator"] in [
            "CFR Călători", "Regio Călători", "Transferoviar Călători",
            "Interregional Călători", "Astra Trans Carpatic", "Ferotrafic TFI", "Softrans"
        ]
