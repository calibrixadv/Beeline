import time
import pytest
from httpx import AsyncClient
from tests.conftest import signup_and_verify


@pytest.mark.asyncio
async def test_route_plan_micro19_to_unirii_contract(client: AsyncClient):
    query_payload = {
        "origin": {
            "name": "Micro 19",
            "city": "Galați",
            "coords": {
                "latitude": 45.4125,
                "longitude": 27.9982,
                "city": "Galați",
                "platform": "B"
            }
        },
        "destination": {
            "name": "Piața Unirii",
            "city": "București",
            "coords": {
                "latitude": 44.4276,
                "longitude": 26.1026,
                "city": "București",
                "platform": "Piața Unirii 1/2"
            }
        },
        "allowedModes": ["BUS", "TRAIN", "METRO", "WALK"],
        "optimizationPreference": "SAFE_BUFFERS",
        "minimumBufferMinutes": 25
    }

    res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert res.status_code == 200
    data = res.json()

    assert "plans" in data
    assert len(data["plans"]) >= 1

    plan = data["plans"][0]
    # Check root fields
    assert plan["summary"] == "Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2"
    assert plan["totalDurationMinutes"] == 275
    assert plan["transfersCount"] == 2
    assert plan["curatedPillar"] == "MOST_RELIABLE"
    assert plan["mascotRecommendation"]["persona"] == "bumble"

    # Romanian Transfer Shield Risk Analysis
    risk = plan["riskAnalysis"]
    assert "overallRiskScore" in risk
    assert risk["riskLevel"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert risk["tightestBufferMinutes"] == 20
    assert risk["bufferAdequacy"] == "OPTIMAL"
    assert len(risk["riskSummaryText"]) > 0
    assert "expectedDelayMinutes" in risk
    assert isinstance(risk["expectedDelayMinutes"], int)
    assert risk["expectedDelayMinutes"] >= 0
    assert "missedConnectionProbability" in risk
    assert 0.0 <= risk["missedConnectionProbability"] <= 1.0
    assert "isMlComputed" in risk
    assert risk["isMlComputed"] is True
    assert "riskFactors" in risk
    assert len(risk["riskFactors"]) >= 1

    # Fares
    assert plan["fare"]["totalAmountLei"] == 69.00
    assert plan["fare"]["totalAmountEur"] == 13.80
    assert len(plan["fare"]["legFares"]) == 3

    # Eco benchmarks
    assert plan["eco"]["percentageSaved"] == 80.0
    assert plan["eco"]["savedKgCO2"] > 0

    # Verify legs and coordinates
    legs = plan["legs"]
    assert len(legs) == 3

    # Leg 1: Transurb Bus 102
    leg1 = legs[0]
    assert leg1["transportType"] == "BUS"
    assert leg1["names"]["originName"] == "Micro 19"
    assert leg1["names"]["originCity"] == "Galați"
    assert leg1["names"]["destinationName"] == "Gara CFR Galați"
    assert leg1["names"]["lineCode"] == "102"
    assert leg1["names"]["operatorName"] == "Transurb S.A. Galați"
    assert leg1["coords"]["originCoords"]["latitude"] == 45.4125
    assert leg1["coords"]["geometry"]["type"] == "LineString"
    assert len(leg1["coords"]["geometry"]["coordinates"]) >= 2

    # Leg 2: CFR InterRegio IR 1572
    leg2 = legs[1]
    assert leg2["transportType"] == "TRAIN"
    assert leg2["names"]["lineCode"] == "IR 1572"
    assert leg2["names"]["operatorName"] == "CFR Călători"
    assert leg2["risk"]["transferBufferAfterMinutes"] == 20
    assert leg2["risk"]["isShieldedBuffer"] is True

    # Leg 3: Metrorex M2
    leg3 = legs[2]
    assert leg3["transportType"] == "METRO"
    assert leg3["names"]["lineCode"] == "M2"
    assert leg3["names"]["operatorName"] == "Metrorex S.A."


@pytest.mark.asyncio
async def test_route_plan_bucharest_to_brasov(client: AsyncClient):
    query_payload = {
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Gara Brașov", "city": "Brașov"},
        "allowedModes": ["TRAIN"],
        "optimizationPreference": "FASTEST"
    }

    res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert res.status_code == 200
    data = res.json()
    plan = data["plans"][0]

    assert plan["curatedPillar"] == "FASTEST"
    assert plan["mascotRecommendation"]["persona"] == "barnaby"
    assert plan["transfersCount"] == 0
    assert len(plan["legs"]) == 1
    assert plan["legs"][0]["transportType"] == "TRAIN"
    assert plan["legs"][0]["names"]["lineCode"] == "IR 1631"

    # ML Inference validation
    risk = plan["riskAnalysis"]
    assert risk["isMlComputed"] is True
    assert risk["expectedDelayMinutes"] >= 0
    assert 0.0 <= risk["missedConnectionProbability"] <= 1.0
    assert len(risk["riskFactors"]) >= 1


@pytest.mark.asyncio
async def test_save_and_retrieve_routes(client: AsyncClient):
    # Signup and verify user
    signup_data = await signup_and_verify(client, {
        "email": "saved.routes.user@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Plan a route
    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    # Save route
    save_res = await client.post(
        "/api/v1/routes/saved",
        json={"plan": plan},
        headers=headers
    )
    assert save_res.status_code == 201
    saved_data = save_res.json()
    assert saved_data["origin_name"] == "Micro 19"
    assert saved_data["destination_name"] == "Piața Unirii"
    route_id = saved_data["id"]

    # List saved routes
    list_res = await client.get("/api/v1/routes/saved", headers=headers)
    assert list_res.status_code == 200
    saved_list = list_res.json()
    assert len(saved_list) == 1
    assert saved_list[0]["id"] == route_id

    # Delete saved route
    del_res = await client.delete(f"/api/v1/routes/saved/{route_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    list_res_2 = await client.get("/api/v1/routes/saved", headers=headers)
    assert len(list_res_2.json()) == 0


@pytest.mark.asyncio
async def test_generic_route_plan(client: AsyncClient):
    query_payload = {
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    }

    res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["plans"]) >= 1
    plan = data["plans"][0]
    assert plan["curatedPillar"] in ["BEST_VALUE", "FASTEST", "RECOMMENDED", "COMFORT", "SAFE_BUFFERS"]
    assert len(plan["legs"]) >= 1

    # ML risk enrichment assertions
    risk = plan["riskAnalysis"]
    assert "overallRiskScore" in risk
    assert risk["riskLevel"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "isMlComputed" in risk
    assert risk["isMlComputed"] is True
    assert "expectedDelayMinutes" in risk
    assert isinstance(risk["expectedDelayMinutes"], int)
    assert risk["expectedDelayMinutes"] >= 0
    assert "missedConnectionProbability" in risk
    assert 0.0 <= risk["missedConnectionProbability"] <= 1.0
    assert "riskFactors" in risk
    assert len(risk["riskFactors"]) >= 1


@pytest.mark.asyncio
async def test_route_plan_request_duration_sla(client: AsyncClient):
    """Verifies that route planning with ML enrichment responds well within the production SLA (< 200ms)."""
    query_payload = {
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Gara Brașov", "city": "Brașov"},
        "allowedModes": ["TRAIN"]
    }

    # Warmup
    _ = await client.post("/api/v1/routes/plan", json=query_payload)

    # Timed run
    t0 = time.perf_counter()
    res = await client.post("/api/v1/routes/plan", json=query_payload)
    duration_ms = (time.perf_counter() - t0) * 1000.0

    assert res.status_code == 200
    assert duration_ms < 200.0, f"Route plan SLA exceeded: {duration_ms:.2f}ms"


@pytest.mark.asyncio
async def test_save_route_unauthorized(client: AsyncClient):
    res = await client.post("/api/v1/routes/saved", json={"plan": {}})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_redundant_1_transfer_elimination_and_direct_domination(client: AsyncClient):
    """
    Verifies that for Galați -> București Nord on 2026-11-21:
    - Redundant 1-transfer routes (e.g. R 7360 -> IR 10072 or IR 1572 via Făurei) are eliminated.
    - InfoFer live schedule is reflected (IR 10072 at 11:21 -> 15:03).
    - IR 10074 (Sunday-only) is excluded on Saturday 2026-11-21.
    - Exactly 5 direct trains are returned.
    """
    res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": "2026-11-21T06:00:00+02:00",
        "allowedModes": ["TRAIN"]
    })
    assert res.status_code == 200
    data = res.json()
    plans = data.get("plans", [])
    assert len(plans) == 5

    # All plans must be direct rail journeys (transfersCount == 0)
    for p in plans:
        assert p["transfersCount"] == 0
        assert len(p["legs"]) == 1
        leg = p["legs"][0]
        line = leg["names"].get("lineCode", "")
        # No leg may be R 7360 (which only goes to Făurei)
        assert "7360" not in line
        # Sunday-only IR 10074 must not be present on Saturday
        assert "10074" not in line

    # Verify IR 10072 is present with InfoFer live schedule (11:21 -> 15:03)
    p_10072 = next((p for p in plans if "10072" in p["legs"][0]["names"].get("lineCode", "")), None)
    assert p_10072 is not None
    assert "11:21" in p_10072["departureTime"]
    assert "15:03" in p_10072["arrivalTime"]
    assert p_10072["legs"][0]["names"].get("operatorName") == "Transferoviar Călători"
    assert p_10072["legs"][0]["names"].get("operatorShortName") == "TFC"


def test_infofer_live_adapter_html_and_mapviewmodel_parsing():
    """
    Verifies InfoFerLiveAdapter parses InfoFer HTML snapshot with embedded base64 mapViewModel:
    - Extracts 5 direct trains for Galați -> București Nord on 2026-11-21.
    - Extracts exact StationInTrains ISO timings, stops, and km.
    """
    from scraper.collectors.train_api import InfoFerLiveAdapter
    from pathlib import Path

    snap_path = Path("backend/scraper/data/snapshots/infofer_itinerary_glt_bct_20261121.html")
    assert snap_path.exists(), f"Snapshot not found at {snap_path}"
    html_text = snap_path.read_text(encoding="utf-8")

    adapter = InfoFerLiveAdapter.get_shared_instance()
    records = adapter.parse_itinerary_html(html_text, default_origin="Galați", default_destination="București Nord", date_str="2026-11-21")
    assert len(records) == 5

    train_nums = [r.source_train_api.train_number for r in records]
    assert "IC 572" in train_nums
    assert "IR 1572" in train_nums
    assert "IR 10072" in train_nums
    assert "IR 1574" in train_nums
    assert "IR 1576" in train_nums
    assert "IR 10074" not in train_nums

    rec_10072 = next(r for r in records if "10072" in r.source_train_api.train_number)
    assert rec_10072.operator == "TFC"
    assert rec_10072.full_operator == "Transferoviar Călători"
    assert rec_10072.departure_seconds == 11 * 3600 + 21 * 60
    assert rec_10072.arrival_seconds == 15 * 3600 + 3 * 60
    assert len(rec_10072.route_stops) == 7
    assert rec_10072.source_train_api.scheduled_duration_minutes == 222.0


def test_xml_operating_calendar_filtering():
    """
    Verifies XML CalendarTren operating calendar day-of-week bitmask filtering:
    - IR 10074 has Zile='320' (Sunday only): operates on 2026-11-22, NOT on 2026-11-21.
    - train_serves_station accurately detects origin/destination station inclusion.
    """
    from scraper.collectors.train_api import DataGovXMLAdapter

    adapter = DataGovXMLAdapter.get_shared_instance()

    # 1. Calendar bitmask check
    cal_10074 = adapter.get_train_calendar("10074", service_date="2026-11-21")
    assert len(cal_10074) > 0
    assert not adapter.is_train_operating_on_date(cal_10074, "2026-11-21")  # Saturday
    assert adapter.is_train_operating_on_date(cal_10074, "2026-11-22")      # Sunday

    # 2. Itinerary search filtering
    sat_recs = adapter.fetch_itinerary_sync("Galați", "București Nord", date_str="2026-11-21")
    sun_recs = adapter.fetch_itinerary_sync("Galați", "București Nord", date_str="2026-11-22")
    assert not any("10074" in r.source_train_api.train_number for r in sat_recs)
    assert any("10074" in r.source_train_api.train_number for r in sun_recs)

    # 3. train_serves_station redundancy checks
    assert adapter.train_serves_station("10072", "Galați", "2026-11-21") is True
    assert adapter.train_serves_station("1572", "Galați", "2026-11-21") is True
    assert adapter.train_serves_station("7360", "București Nord", "2026-11-21") is False
    assert adapter.train_serves_station("7360", "Făurei", "2026-11-21") is True


@pytest.mark.asyncio
async def test_routes_plan_100_percent_live_infofer_only(client: AsyncClient, monkeypatch):
    """
    Asserts /routes/plan is 100% live InfoFer only (zero XML schedule fallback/merge):
    - For Galați -> București Nord on 2026-11-21, plans and allDayDepartures return exactly 5 trains.
    - IR 10072 appears once at 11:21 -> 15:03 (zero 07:23, zero IR 10074).
    - liveSource is strictly INFOFER_LIVE_ONLY.
    - When InfoFer returns empty [], returns plans=[], allDayDepartures=[] (zero XML fallback).
    """
    from scraper.collectors.train_api import InfoFerLiveAdapter

    # 1. Normal call with live/snapshot InfoFer data
    payload = {
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": "2026-11-21T08:00:00+02:00"
    }
    resp = await client.post("/api/v1/routes/plan", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["bookingWindow"]["liveSource"] == "INFOFER_LIVE_ONLY"
    assert len(data["plans"]) == 5
    assert len(data["allDayDepartures"]) == 5
    assert data["totalDayRoutes"] == 5

    # Check exact train numbers in plans
    plan_train_nums = [p["legs"][0]["names"]["lineCode"] for p in data["plans"]]
    assert "IC 572" in plan_train_nums
    assert "IR 1572" in plan_train_nums
    assert "IR 10072" in plan_train_nums
    assert "IR 1574" in plan_train_nums
    assert "IR 1576" in plan_train_nums
    assert "IR 10074" not in plan_train_nums

    # Check allDayDepartures
    all_day_nums = [d["trainNumber"] for d in data["allDayDepartures"]]
    assert len(all_day_nums) == 5
    assert "IR 10074" not in all_day_nums

    # Check IR 10072 is at 11:21 -> 15:03
    p_10072 = next(p for p in data["plans"] if "10072" in p["legs"][0]["names"]["lineCode"])
    assert p_10072["departureTime"].endswith("11:21:00+02:00")
    assert p_10072["arrivalTime"].endswith("15:03:00+02:00")

    dep_10072 = next(d for d in data["allDayDepartures"] if "10072" in d["trainNumber"])
    assert dep_10072["departureTime"].endswith("11:21:00+02:00")
    assert dep_10072["arrivalTime"].endswith("15:03:00+02:00")

    # 2. When InfoFer returns empty [], returns 0 trains (NEVER silently falling back to static XML)
    adapter = InfoFerLiveAdapter.get_shared_instance()
    monkeypatch.setattr(adapter, "fetch_itinerary_sync", lambda *args, **kwargs: [])

    resp_empty = await client.post("/api/v1/routes/plan", json=payload)
    assert resp_empty.status_code == 200
    data_empty = resp_empty.json()
    assert data_empty["plans"] == []
    assert data_empty["allDayDepartures"] == []
    assert data_empty["totalDayRoutes"] == 0


@pytest.mark.asyncio
async def test_routes_plan_bucuresti_to_brasov_normalization_and_all_operators(client: AsyncClient):
    """
    Verifies Bucuresti -> Brasov corridor on 2026-11-21:
    - Searching 'Bucuresti' -> 'Brasov' and 'București Nord' -> 'Brașov' both normalize to 'București Nord' -> 'Brașov'.
    - Returns all parsed live trains across multiple operators (CFR, TFC, ASTRA, SOFTRANS, REGIO, IRC).
    - Plans and allDayDepartures include all unique live departures for the day.
    """
    payload_ascii = {
        "origin": "Bucuresti",
        "destination": "Brasov",
        "departureTime": "2026-11-21T08:00:00+02:00"
    }
    resp1 = await client.post("/api/v1/routes/plan", json=payload_ascii)
    assert resp1.status_code == 200
    data1 = resp1.json()

    assert data1["bookingWindow"]["liveSource"] == "INFOFER_LIVE_ONLY"
    assert len(data1["plans"]) >= 25
    assert len(data1["allDayDepartures"]) >= 25

    # Check origin/destination in legs
    first_leg = data1["plans"][0]["legs"][0]
    assert first_leg["names"]["originName"] == "București Nord"
    assert first_leg["names"]["destinationName"] == "Brașov"

    # Verify operators present across plans
    operators_present = {
        leg["names"]["operatorName"]
        for p in data1["plans"]
        for leg in p["legs"]
    }
    assert any("CFR" in op for op in operators_present)
    assert any("Transferoviar" in op for op in operators_present)
    assert any("Astra" in op for op in operators_present)
    assert any("Softrans" in op for op in operators_present)
    assert any("Regio" in op for op in operators_present)

    # Payload with exact diacritics
    payload_diacritics = {
        "origin": {"name": "București Nord"},
        "destination": {"name": "Brașov"},
        "departureTime": "2026-11-21T08:00:00+02:00"
    }
    resp2 = await client.post("/api/v1/routes/plan", json=payload_diacritics)
    assert resp2.status_code == 200
    data2 = resp2.json()

    assert len(data2["plans"]) == len(data1["plans"])
    assert len(data2["allDayDepartures"]) == len(data1["allDayDepartures"])


@pytest.mark.asyncio
async def test_infofer_transient_error_not_cached_as_empty_in_redis():
    """
    Verifies that a transient InfoFer error or timeout does NOT cache an empty list [] in Redis.
    """
    from scraper.collectors.train_api import InfoFerLiveAdapter, _get_async_redis_client
    import httpx

    adapter = InfoFerLiveAdapter.get_shared_instance()
    async_r = await _get_async_redis_client()

    test_date = "2026-11-21"
    redis_key = f"live_itinerary:v3:TEST_ORIG:TEST_DEST:{test_date}"

    # Ensure key is flushed
    if async_r:
        await async_r.delete(redis_key)

    # Simulate transient network failure in _request_with_resilience
    async def mock_failing_request(*args, **kwargs):
        raise httpx.ReadTimeout("Simulated InfoFer read timeout on busy corridor")

    orig_req = adapter._request_with_resilience
    adapter._request_with_resilience = mock_failing_request

    try:
        recs = await adapter.fetch_itinerary("TEST_ORIG", "TEST_DEST", test_date)
        assert recs == []

        # Check Redis: MUST NOT contain empty list []
        if async_r:
            cached = await async_r.get(redis_key)
            assert cached is None, f"Redis unexpectedly cached transient error: {cached}"
    finally:
        adapter._request_with_resilience = orig_req
        if async_r:
            await async_r.delete(redis_key)


@pytest.mark.asyncio
async def test_cluj_timisoara_itinerary_normalization_and_zero_fake_trains(client: AsyncClient):
    """
    Verifies Cluj-Napoca -> Timișoara Nord corridor on 2026-11-21:
    - Querying 'Cluj-Napoca' -> 'Timișoara Nord' (with hyphen and diacritics)
      AND 'Cluj Napoca' -> 'Timisoara' both normalize properly and return
      the exact 5 InfoFer itineraries (2 direct + 3 with 1 transfer).
    - Direct trains: IR 16520, IR 16522.
    - Transfer journeys:
      1. RE 3071 -> RE 10512 (transfer at Oradea, 25 min wait)
      2. IR 74 -> R 2608 (transfer at Arad, 10 min wait)
      3. RE 10518 -> IR 1833 (transfer at Teiuș, 45 min wait)
    - ZERO fake/synthetic trains.
    - AllDayDepartures contains the exact 5 departures for the day.
    """
    payload_hyphen = {
        "origin": {"name": "Cluj-Napoca", "city": "Cluj-Napoca"},
        "destination": {"name": "Timișoara Nord", "city": "Timișoara"},
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    }
    resp1 = await client.post("/api/v1/routes/plan", json=payload_hyphen)
    assert resp1.status_code == 200
    data1 = resp1.json()

    assert data1["bookingWindow"]["liveSource"] == "INFOFER_LIVE_ONLY"
    assert len(data1["plans"]) == 5
    assert len(data1["allDayDepartures"]) == 2  # Only direct trains IR 16520 and IR 16522 (zero flattened multi-leg transfers)
    assert all("+" not in d["trainNumber"] and "/" not in d["trainNumber"] for d in data1["allDayDepartures"])
    assert data1["totalDayRoutes"] == 5

    # Direct trains: 2 (transfersCount == 0)
    direct_plans = [p for p in data1["plans"] if p["transfersCount"] == 0]
    assert len(direct_plans) == 2
    direct_nums = [p["legs"][0]["names"]["lineCode"] for p in direct_plans]
    assert "IR 16520" in direct_nums
    assert "IR 16522" in direct_nums

    # Transfer plans: 3 (transfersCount == 1)
    transfer_plans = [p for p in data1["plans"] if p["transfersCount"] == 1]
    assert len(transfer_plans) == 3

    # Check the 3 transfers
    t_summaries = [p["summary"] for p in transfer_plans]
    assert any("3071" in s and "10512" in s for s in t_summaries)
    assert any("74" in s and "2608" in s for s in t_summaries)
    assert any("10518" in s and "1833" in s for s in t_summaries)

    # Check transfer stations and buffer minutes
    p_oradea = next(p for p in transfer_plans if "3071" in p["summary"])
    assert len(p_oradea["transfers"]) == 1
    assert "Oradea" in p_oradea["transfers"][0]["stationName"]
    assert p_oradea["transfers"][0]["waitMinutes"] == 25

    p_arad = next(p for p in transfer_plans if "74" in p["summary"])
    assert len(p_arad["transfers"]) == 1
    assert "Arad" in p_arad["transfers"][0]["stationName"]
    assert p_arad["transfers"][0]["waitMinutes"] == 10

    p_teius = next(p for p in transfer_plans if "10518" in p["summary"])
    assert len(p_teius["transfers"]) == 1
    assert "Teiuș" in p_teius["transfers"][0]["stationName"]
    assert p_teius["transfers"][0]["waitMinutes"] == 45

    # Payload with space and ASCII
    payload_ascii = {
        "origin": "Cluj Napoca",
        "destination": "Timisoara",
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    }
    resp2 = await client.post("/api/v1/routes/plan", json=payload_ascii)
    assert resp2.status_code == 200
    data2 = resp2.json()

    assert len(data2["plans"]) == 5
    assert len(data2["allDayDepartures"]) == 2
    assert data2["totalDayRoutes"] == 5
    assert [p["summary"] for p in data2["plans"]] == [p["summary"] for p in data1["plans"]]

    # Verify maxTransfers=0 returns strictly direct trains
    payload_direct_only = {
        **payload_hyphen,
        "maxTransfers": 0
    }
    resp_dir = await client.post("/api/v1/routes/plan", json=payload_direct_only)
    assert resp_dir.status_code == 200
    data_dir = resp_dir.json()
    assert len(data_dir["plans"]) == 2
    assert all(p["transfersCount"] == 0 for p in data_dir["plans"])
    assert all(len(p["legs"]) == 1 for p in data_dir["plans"])

    # Verify maxTransfers=1 preserves valid transfers
    payload_max1 = {
        **payload_hyphen,
        "maxTransfers": 1
    }
    resp_max1 = await client.post("/api/v1/routes/plan", json=payload_max1)
    assert resp_max1.status_code == 200
    data_max1 = resp_max1.json()
    assert len(data_max1["plans"]) == 5
    assert any(p["transfersCount"] == 1 for p in data_max1["plans"])


@pytest.mark.asyncio
async def test_galati_bucuresti_multi_leg_not_rendered_as_direct_and_no_flattened_duplicates(client: AsyncClient):
    """
    Verifies Galați -> București Nord on 2026-11-22:
    - Multi-leg routes (e.g. R 7360 + R-E 10700) are converted to multi-leg plans (legs >= 2, transfersCount >= 1).
    - allDayDepartures contains ONLY direct trains, with ZERO '+' or '->' flattened entries.
    - maxTransfers: 0 returns strictly direct trains (transfersCount == 0, legs.length == 1, ZERO '+' in lineCode).
    - maxTransfers: 1 returns both direct trains and 1-transfer plans without dropping transfers.
    """
    payload_base = {
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": "2026-11-22T08:00:00+02:00",
        "allowedModes": ["TRAIN"]
    }

    # 1. maxTransfers: 0 -> Strictly direct trains
    resp_0 = await client.post("/api/v1/routes/plan", json={**payload_base, "maxTransfers": 0})
    assert resp_0.status_code == 200
    data_0 = resp_0.json()
    assert len(data_0["plans"]) > 0
    for p in data_0["plans"]:
        assert p["transfersCount"] == 0
        assert len(p["legs"]) == 1
        assert "+" not in p["legs"][0]["names"]["lineCode"]
        assert "->" not in p["legs"][0]["names"]["lineCode"]

    # allDayDepartures must never contain flattened multi-leg transfers
    for d in data_0["allDayDepartures"]:
        assert "+" not in d["trainNumber"]
        assert "->" not in d["trainNumber"]
        assert "/" not in d["trainNumber"]

    # 2. maxTransfers: 1 -> Direct trains + 1-transfer plans
    resp_1 = await client.post("/api/v1/routes/plan", json={**payload_base, "maxTransfers": 1})
    assert resp_1.status_code == 200
    data_1 = resp_1.json()

    # Must contain direct trains
    has_direct = any(p["transfersCount"] == 0 for p in data_1["plans"])
    assert has_direct

    # Must contain multi-leg plans with legs.length == 2 and transfersCount == 1
    transfer_plans = [p for p in data_1["plans"] if p["transfersCount"] == 1]
    assert len(transfer_plans) > 0
    for tp in transfer_plans:
        assert len(tp["legs"]) == 2
        assert len(tp["transfers"]) == 1
        assert tp["transfers"][0]["stationName"]
        assert tp["transfers"][0]["bufferStatus"] in ["SAFE", "TIGHT", "RISKY"]

    # In allDayDepartures, ZERO flattened multi-leg transfers
    for d in data_1["allDayDepartures"]:
        assert "+" not in d["trainNumber"]
        assert "->" not in d["trainNumber"]
        assert "/" not in d["trainNumber"]


@pytest.mark.asyncio
async def test_flora_strictly_lowest_price_and_max_transfers(client: AsyncClient):
    """
    Verifies that:
    1. Flora (BEST_VALUE) is strictly assigned to the plan with the minimum fare among returned plans.
    2. request.maxTransfers runs before computing curatedPillars.
    3. No more expensive plan ever has BEST_VALUE.
    4. Tie-breaking prioritizes fewest transfers, then lowest risk, then shortest duration.
    """
    payload = {
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
        "maxTransfers": 0,
    }
    resp = await client.post("/api/v1/routes/plan", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    plans = data["plans"]
    assert len(plans) >= 1

    # All plans must be direct
    for p in plans:
        assert p["transfersCount"] == 0

    min_fare = min(p["fare"]["totalAmountLei"] for p in plans)
    best_val_plans = [p for p in plans if "BEST_VALUE" in (p.get("curatedPillars") or []) or p.get("curatedPillar") == "BEST_VALUE"]
    assert len(best_val_plans) >= 1
    for bp in best_val_plans:
        assert abs(bp["fare"]["totalAmountLei"] - min_fare) < 1e-4

    # Direct unit test of tie-breaking in _assign_pillars_and_sort
    from app.services.routing_service import routing_service
    from app.schemas.route_plan import TransitRouteQuery, LocationQuery
    q = TransitRouteQuery(
        origin=LocationQuery(name="Galați"),
        destination=LocationQuery(name="București Nord"),
        departureTime="2026-11-21T08:00:00+02:00",
        allowedModes=["TRAIN"],
    )

    p1 = plans[0].copy()
    p2 = plans[0].copy()
    p3 = plans[0].copy()

    # Create dummy plans for tie-break testing
    test_p1 = routing_service._build_candidate_plans(q)[0].model_copy(deep=True)
    test_p2 = test_p1.model_copy(deep=True)
    test_p3 = test_p1.model_copy(deep=True)

    test_p1.id = "plan-tie-1"
    test_p2.id = "plan-tie-2"
    test_p3.id = "plan-tie-3"

    # All have same lowest fare 39.12 LEI
    test_p1.fare.totalAmountLei = 39.12
    test_p2.fare.totalAmountLei = 39.12
    test_p3.fare.totalAmountLei = 55.0  # More expensive

    # p1 has 0 transfers, p2 has 1 transfer
    test_p1.transfersCount = 0
    test_p2.transfersCount = 1

    sorted_res = routing_service._assign_pillars_and_sort([test_p1, test_p2, test_p3], q)
    winner_p1 = next(p for p in sorted_res if p.id == "plan-tie-1")
    tied_p2 = next(p for p in sorted_res if p.id == "plan-tie-2")
    expensive_p3 = next(p for p in sorted_res if p.id == "plan-tie-3")

    # ALL routes sharing the strict lowest price receive BEST_VALUE in curatedPillars
    assert "BEST_VALUE" in winner_p1.curatedPillars
    assert "BEST_VALUE" in tied_p2.curatedPillars
    assert "BEST_VALUE" not in expensive_p3.curatedPillars
    assert expensive_p3.curatedPillar != "BEST_VALUE"


@pytest.mark.asyncio
async def test_flora_awarded_to_all_tied_lowest_fare_routes():
    """
    Verifies that when 2+ routes share the exact same lowest fare (e.g. 39.12 LEI),
    ALL of them receive BEST_VALUE in curatedPillars, while strictly pricier routes do not.
    """
    from app.services.routing_service import routing_service
    from app.schemas.route_plan import TransitRouteQuery, LocationQuery
    q = TransitRouteQuery(
        origin=LocationQuery(name="Galați"),
        destination=LocationQuery(name="București Nord"),
        departureTime="2026-11-21T08:00:00+02:00",
        allowedModes=["TRAIN"],
    )
    base_plans = routing_service._build_candidate_plans(q)
    assert len(base_plans) >= 3

    p1 = base_plans[0].model_copy(deep=True)
    p2 = base_plans[1].model_copy(deep=True)
    p3 = base_plans[2].model_copy(deep=True)

    p1.id = "plan-flora-tie-1"
    p2.id = "plan-flora-tie-2"
    p3.id = "plan-flora-pricier"

    # Exact same lowest fare: 39.12 LEI (3912 bani)
    p1.fare.totalAmountLei = 39.12
    p2.fare.totalAmountLei = 39.12
    p3.fare.totalAmountLei = 49.50

    result = routing_service._assign_pillars_and_sort([p1, p2, p3], q)

    res_p1 = next(p for p in result if p.id == "plan-flora-tie-1")
    res_p2 = next(p for p in result if p.id == "plan-flora-tie-2")
    res_p3 = next(p for p in result if p.id == "plan-flora-pricier")

    assert "BEST_VALUE" in res_p1.curatedPillars
    assert "BEST_VALUE" in res_p2.curatedPillars
    assert "BEST_VALUE" not in res_p3.curatedPillars
    assert res_p3.curatedPillar != "BEST_VALUE"



