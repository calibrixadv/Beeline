import pytest
from datetime import datetime
from httpx import AsyncClient

from app.schemas.route_plan import (
    LegStop,
    TransferDetail,
    TransitLeg,
    TransitRoutePlan,
    TransitRouteQuery,
    LocationQuery,
    TransitMode,
    LegNames,
    LegCoordinates,
    GeoPoint,
    GeoJSONLineString,
    LegTimings,
    LegRiskProfile,
    LegFare,
    LegAmenities,
    LegInstructions,
    MascotRecommendation,
    RouteRiskAnalysis,
    RouteFareSummary,
    EcoBenchmark,
    RiskLevel,
    BufferAdequacy,
)
from app.services.timetable_sync_service import BUCHAREST_TZ


@pytest.mark.asyncio
async def test_direct_route_itinerary_galati_to_bucharest(client: AsyncClient):
    """
    Verifies that direct rail routes for Galați ➔ București Nord return complete
    stop-by-stop itineraries with monotonic timestamps, real Romanian intermediate
    stations, non-negative dwell times, and increasing cumulative distance.
    """
    res = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "Galați", "city": "Galați"},
            "destination": {"name": "București Nord", "city": "București"},
            "departureTime": "2026-11-20T08:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "MOST_RELIABLE",
        },
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    plans = data.get("plans", [])
    assert len(plans) > 0, "Expected at least 1 plan"

    direct_plans = [p for p in plans if p.get("transfersCount") == 0]
    assert len(direct_plans) >= 1, "Expected at least 1 direct train plan"

    for plan in direct_plans:
        assert len(plan["legs"]) == 1
        leg = plan["legs"][0]
        stops = leg.get("stops", [])
        assert len(stops) >= 2, f"Expected at least 2 stops, got {len(stops)}"

        # 1. Endpoints stopType & times
        assert stops[0]["stopType"] == "BOARDING"
        assert stops[0]["arrivalTime"] is None
        assert stops[0]["departureTime"] is not None
        assert stops[0]["dwellMinutes"] == 0
        assert stops[0]["distanceFromOriginKm"] == 0.0

        assert stops[-1]["stopType"] == "ALIGHTING"
        assert stops[-1]["arrivalTime"] is not None
        assert stops[-1]["departureTime"] is None
        assert stops[-1]["dwellMinutes"] == 0
        assert stops[-1]["distanceFromOriginKm"] > 0.0

        # 2. Leg-level summary fields
        assert leg["distanceKm"] == stops[-1]["distanceFromOriginKm"]
        assert leg["intermediateStopCount"] == len(stops) - 2
        assert leg["fullTrainOrigin"] is not None
        assert leg["fullTrainDestination"] is not None

        # 3. Intermediate stops validation
        station_names = [s["stationName"] for s in stops]
        station_codes = [s["stationCode"] for s in stops]
        assert stops[0]["stationCode"] == "GLT"
        assert stops[-1]["stationCode"] == "BCT"

        # Check for real intermediate Romanian stations on this corridor
        has_corridor_stop = any(
            code in station_codes for code in ["BRL", "FAU", "BUZ", "PLS", "MZL", "BBS"]
        )
        assert has_corridor_stop, f"Expected real corridor stations in {station_codes}"

        # 4. Strict monotonicity across stops
        for idx in range(len(stops) - 1):
            curr_s = stops[idx]
            next_s = stops[idx + 1]

            # Monotonic distance
            assert next_s["distanceFromOriginKm"] >= curr_s["distanceFromOriginKm"]

            # Monotonic timestamps
            curr_time = curr_s["departureTime"] or curr_s["arrivalTime"]
            next_time = next_s["arrivalTime"] or next_s["departureTime"]
            assert next_time >= curr_time, f"Non-monotonic times: {curr_time} -> {next_time}"

        # Check intermediate stop attributes
        for mid_s in stops[1:-1]:
            assert mid_s["stopType"] == "INTERMEDIATE"
            assert mid_s["arrivalTime"] is not None
            assert mid_s["departureTime"] is not None
            assert mid_s["dwellMinutes"] >= 0
            assert mid_s["departureTime"] >= mid_s["arrivalTime"]


@pytest.mark.asyncio
async def test_one_transfer_route_itinerary_and_transfers_timeline(client: AsyncClient):
    """
    Verifies that 1-transfer routes (e.g. Galați ➔ Brașov) populate complete stop lists
    on both legs, correctly tag transfer stations as 'TRANSFER', and generate accurate
    plan.transfers details with waitMinutes and bufferStatus.
    """
    res = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "Galați", "city": "Galați"},
            "destination": {"name": "Brașov", "city": "Brașov"},
            "departureTime": "2026-11-20T08:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "FASTEST",
        },
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    plans = data.get("plans", [])

    transfer_plans = [p for p in plans if p.get("transfersCount") > 0]
    assert len(transfer_plans) >= 1, "Expected at least 1 transfer plan for Galați -> Brașov"

    tp = transfer_plans[0]
    assert len(tp["legs"]) == tp["transfersCount"] + 1
    assert len(tp["transfers"]) == tp["transfersCount"]

    # Verify transfers timeline
    for tr in tp["transfers"]:
        assert tr["transferIndex"] >= 0
        assert tr["stationCode"] is not None and len(tr["stationCode"]) >= 2
        assert tr["stationName"] is not None and len(tr["stationName"]) >= 2
        assert tr["arrivalTime"] is not None
        assert tr["departureTime"] is not None
        assert tr["waitMinutes"] >= 10, f"Transfer wait too short: {tr['waitMinutes']} min"
        assert tr["fromLineCode"] is not None
        assert tr["toLineCode"] is not None
        assert tr["fromOperator"] is not None
        assert tr["toOperator"] is not None
        assert tr["bufferStatus"] in ["SAFE", "TIGHT", "RISKY"]

    # Verify leg stops tagging at transfer hub
    leg0 = tp["legs"][0]
    leg1 = tp["legs"][1]

    assert len(leg0["stops"]) >= 2
    assert len(leg1["stops"]) >= 2

    # Leg 0: starts BOARDING, ends TRANSFER at the hub
    assert leg0["stops"][0]["stopType"] == "BOARDING"
    assert leg0["stops"][-1]["stopType"] == "TRANSFER"

    # Leg 1: starts TRANSFER at the hub, ends ALIGHTING at terminus
    assert leg1["stops"][0]["stopType"] == "TRANSFER"
    assert leg1["stops"][-1]["stopType"] == "ALIGHTING"

    # Transfer hub station matches
    hub_arrival_station = leg0["stops"][-1]["stationCode"]
    hub_departure_station = leg1["stops"][0]["stationCode"]
    assert hub_arrival_station == hub_departure_station


@pytest.mark.asyncio
async def test_overnight_train_itinerary_timestamp_rollover(client: AsyncClient):
    """
    Verifies that trains crossing midnight (e.g. night train IR 1641) cleanly
    roll over date to X+1 with strictly monotonic ISO timestamps and non-negative dwell times.
    """
    res = await client.get("/api/v1/trains/IR-1641/itinerary?date=2026-11-20")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    itin = res.json()

    stops = itin["stops"]
    assert len(stops) >= 15, f"Expected full overnight stop list, got {len(stops)}"

    first_stop = stops[0]
    last_stop = stops[-1]

    # Departs in evening on 2026-11-20
    assert first_stop["departureTime"].startswith("2026-11-20T21:")

    # Arrives following morning on 2026-11-21
    assert last_stop["arrivalTime"].startswith("2026-11-21T11:")

    # Verify strictly monotonic timestamps across all stops
    for i in range(len(stops) - 1):
        s_cur = stops[i]
        s_nxt = stops[i + 1]

        t_cur = s_cur["departureTime"] or s_cur["arrivalTime"]
        t_nxt = s_nxt["arrivalTime"] or s_nxt["departureTime"]

        dt_cur = datetime.fromisoformat(t_cur)
        dt_nxt = datetime.fromisoformat(t_nxt)

        assert dt_nxt >= dt_cur, f"Non-monotonic overnight timestamps: {t_cur} >= {t_nxt}"
        assert s_cur["dwellMinutes"] >= 0
        assert s_nxt["distanceFromOriginKm"] >= s_cur["distanceFromOriginKm"]


@pytest.mark.asyncio
async def test_train_itinerary_endpoint_success_and_errors(client: AsyncClient):
    """
    Verifies GET /api/v1/trains/{train_number}/itinerary:
    - Normalizes various train number formats ('IR-1572', 'IR 1572', '1572')
    - Returns full end-to-end commercial itinerary with liveSource and bookingWindow
    - Returns HTTP 404 for non-existent train
    - Returns HTTP 422 for past or out-of-booking-window dates
    """
    # 1. Normalization check: IR-1572
    res_hyphen = await client.get("/api/v1/trains/IR-1572/itinerary?date=2026-11-20")
    assert res_hyphen.status_code == 200
    data_hyphen = res_hyphen.json()
    assert data_hyphen["trainNumber"] == "IR 1572"
    assert data_hyphen["fullTrainOrigin"] == "Galați"
    assert data_hyphen["fullTrainDestination"] == "București Nord"
    assert data_hyphen["totalDistanceKm"] > 250.0
    assert data_hyphen["totalDurationMinutes"] > 180
    assert len(data_hyphen["stops"]) >= 8
    assert "bookingWindow" in data_hyphen
    assert data_hyphen["liveSource"] == "INFOFER_LIVE_ONLY"

    # 2. Normalization check: digits only ('1572')
    res_digits = await client.get("/api/v1/trains/1572/itinerary?date=2026-11-20")
    assert res_digits.status_code == 200
    assert res_digits.json()["trainNumber"] == "IR 1572"

    # 3. Non-existent train returns HTTP 404
    res_fake = await client.get("/api/v1/trains/FAKE-99999/itinerary?date=2026-11-20")
    assert res_fake.status_code == 404
    assert "not found" in res_fake.json()["detail"].lower()

    # 4. Past date returns HTTP 422
    res_past = await client.get("/api/v1/trains/IR-1572/itinerary?date=2025-01-01")
    assert res_past.status_code == 422
    assert "past" in res_past.json()["detail"].lower()

    # 5. Out-of-window future date (> 90 days) returns HTTP 422
    res_future = await client.get("/api/v1/trains/IR-1572/itinerary?date=2027-10-01")
    assert res_future.status_code == 422
    assert "booking window" in res_future.json()["detail"].lower()


def test_schema_backward_compatibility():
    """
    Verifies that TransitLeg and TransitRoutePlan can be instantiated without
    the new 'stops' and 'transfers' fields, preserving zero-regression safety
    for legacy tests and payloads.
    """
    leg = TransitLeg(
        id="leg-test-001",
        legIndex=0,
        transportType=TransitMode.TRAIN,
        names=LegNames(
            originName="Galați",
            originCity="Galați",
            destinationName="Brăila",
            destinationCity="Brăila",
            lineCode="R 7360",
        ),
        coords=LegCoordinates(
            originCoords=GeoPoint(latitude=45.4418, longitude=28.0583, city="Galați"),
            destinationCoords=GeoPoint(latitude=45.2715, longitude=27.9622, city="Brăila"),
            geometry=GeoJSONLineString(type="LineString", coordinates=[(28.0583, 45.4418), (27.9622, 45.2715)]),
        ),
        timings=LegTimings(
            scheduledDeparture="2026-11-20T08:00:00+02:00",
            scheduledArrival="2026-11-20T08:35:00+02:00",
            estimatedDeparture="2026-11-20T08:00:00+02:00",
            estimatedArrival="2026-11-20T08:35:00+02:00",
            durationMinutes=35,
        ),
        risk=LegRiskProfile(legRiskScore=5.0, historicalPunctualityPercent=95.0),
        fare=LegFare(amount=12.0, ticketCategory="RAIL_REGIO"),
        amenities=LegAmenities(items=[]),
        instructions=LegInstructions(leadText="Board R 7360"),
    )

    # Safe defaults
    assert leg.stops == []
    assert leg.intermediateStopCount == 0
    assert leg.distanceKm is None
    assert leg.trainCategory is None
    assert leg.fullTrainOrigin is None
    assert leg.fullTrainDestination is None

    # Plan with legacy constructor without transfers
    plan = TransitRoutePlan(
        id="plan-test-001",
        query=TransitRouteQuery(
            origin=LocationQuery(name="Galați"),
            destination=LocationQuery(name="Brăila"),
        ),
        summary="R 7360 Direct",
        departureTime="2026-11-20T08:00:00+02:00",
        arrivalTime="2026-11-20T08:35:00+02:00",
        totalDurationMinutes=35,
        totalWalkMinutes=0,
        totalWalkDistanceMeters=0,
        transfersCount=0,
        mascotRecommendation=MascotRecommendation(persona="barnaby", badgeLabel="FAST", advice="Go"),
        riskAnalysis=RouteRiskAnalysis(
            overallRiskScore=5.0,
            riskLevel=RiskLevel.LOW,
            historicalPunctualityRate=0.95,
            tightestBufferMinutes=0,
            bufferAdequacy=BufferAdequacy.GENEROUS,
            riskSummaryText="Safe",
        ),
        fare=RouteFareSummary(totalAmountLei=12.0, totalAmountEur=2.4, isIntegratedTicketAvailable=True),
        eco=EcoBenchmark(
            routeEmissionsKgCO2=1.0,
            carEmissionsKgCO2=5.0,
            savedKgCO2=4.0,
            percentageSaved=80.0,
            treeDaysEquivalent=0.5,
        ),
        legs=[leg],
        createdAt="2026-11-20T08:00:00Z",
        validUntil="2026-11-20T10:00:00Z",
    )

    assert plan.transfers == []


def test_station_canonical_resolution_buzau_vs_intorsura_buzaului():
    """
    Regression test for Stage 1.1:
    Asserts canonical_station_code('Întorsura Buzăului') != canonical_station_code('Buzău')
    and that intermediate stops (e.g. Poiana Florilor) are not mis-mapped to unrelated stations.
    """
    from scraper.collectors.train_api import (
        canonical_station_code,
        clean_romanian_station_name,
        DataGovXMLAdapter,
    )

    code_ibz = canonical_station_code("Întorsura Buzăului")
    code_buz = canonical_station_code("Buzău")
    assert code_ibz != code_buz, f"Expected distinct codes, got {code_ibz} == {code_buz}"
    assert code_buz == "BUZ"
    assert code_ibz == "IBZ"

    # Also verify suffixes
    assert canonical_station_code("Întorsura Buzăului Hm") == "IBZ"
    assert canonical_station_code("Gara Buzău") == "BUZ"

    # Verify Poiana Florilor is not mapped to Ianca (IAN)
    code_poi = canonical_station_code("Poiana Florilor h.")
    assert code_poi != "IAN", f"Poiana Florilor must not match IAN, got {code_poi}"
    clean_poi = clean_romanian_station_name(code_poi, "Poiana Florilor h.")
    assert clean_poi == "Poiana Florilor"

    # Verify Buzău -> Brașov direct records have distance >= 100 km (no fake 33.4km trains)
    adapter = DataGovXMLAdapter.get_shared_instance()
    buz_bsv_recs = adapter.fetch_itinerary_sync("Buzău", "Brașov")
    for r in buz_bsv_recs:
        dist = r.source_train_api.distance_km
        assert dist >= 100.0, f"Found impossible short train {r.train_number} ({dist} km) connecting Buzău to Brașov"


@pytest.mark.asyncio
async def test_route_plan_galati_to_brasov_no_impossible_trains(client: AsyncClient):
    """
    Regression test for Stage 1.2:
    Verifies POST /api/v1/routes/plan for Galați ➔ Brașov returns ONLY physically valid
    rail connections and NEVER pairs Buzău with Întorsura Buzăului (R 11292).
    """
    res = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "Galați", "city": "Galați"},
            "destination": {"name": "Brașov", "city": "Brașov"},
            "departureTime": "2026-11-20T05:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "MOST_RELIABLE",
        },
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    plans = data.get("plans", [])
    assert len(plans) >= 1, "Expected at least 1 plan for Galați ➔ Brașov"

    for plan in plans:
        for leg in plan["legs"]:
            line_code = leg["names"]["lineCode"]
            # Train R 11292 originates in Întorsura Buzăului and must never appear
            assert "11292" not in line_code, f"Found invalid train {line_code} in plan {plan['id']}"

            # Any leg between Buzău and Brașov must be a real mainline run (>= 100 km)
            orig_name = leg["names"]["originName"]
            dest_name = leg["names"]["destinationName"]
            if orig_name == "Buzău" and dest_name == "Brașov":
                dist = leg.get("distanceKm", 0.0)
                assert dist >= 100.0, f"Physically impossible leg distance {dist}km for {orig_name} -> {dest_name}"


@pytest.mark.asyncio
async def test_invalid_and_gibberish_stations_return_zero_trains(client: AsyncClient):
    """
    Regression test for surgical hotfix:
    Verifies that querying gibberish or invalid stations never returns false trains:
    1. 'da Nordgalaaa' -> 'Brașov' MUST return plans=[] and totalDayRoutes=0 (never 5 trains).
    2. 'București Nord' -> 'Atlantis XYZ' MUST return plans=[] and totalDayRoutes=0 (never generic plan).
    3. Valid stations ('Brăila' -> 'București Nord', 'Galați' -> 'Brașov') still return real operating trains.
    """
    # 1. 'da Nordgalaaa' -> 'Brașov'
    res1 = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "da Nordgalaaa", "city": "da Nordgalaaa"},
            "destination": {"name": "Brașov", "city": "Brașov"},
            "departureTime": "2026-11-20T08:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "FASTEST",
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1.get("plans", [])) == 0, f"Expected 0 plans for gibberish station, got {len(data1['plans'])}"
    assert data1.get("totalDayRoutes") == 0, f"Expected totalDayRoutes=0, got {data1.get('totalDayRoutes')}"

    # 2. 'București Nord' -> 'Atlantis XYZ'
    res2 = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "București Nord", "city": "București"},
            "destination": {"name": "Atlantis XYZ", "city": "Atlantis XYZ"},
            "departureTime": "2026-11-20T08:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "FASTEST",
        },
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2.get("plans", [])) == 0, f"Expected 0 plans for non-existent station, got {len(data2['plans'])}"
    assert data2.get("totalDayRoutes") == 0

    # 3. Valid stations return real operating trains
    res3 = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "Brăila", "city": "Brăila"},
            "destination": {"name": "București Nord", "city": "București"},
            "departureTime": "2026-11-20T08:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "FASTEST",
        },
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert len(data3.get("plans", [])) >= 1, "Expected real trains for Brăila -> București Nord"

    res4 = await client.post(
        "/api/v1/routes/plan",
        json={
            "origin": {"name": "Galați", "city": "Galați"},
            "destination": {"name": "Brașov", "city": "Brașov"},
            "departureTime": "2026-11-20T08:00:00+02:00",
            "allowedModes": ["TRAIN"],
            "optimizationPreference": "MOST_RELIABLE",
        },
    )
    assert res4.status_code == 200
    data4 = res4.json()
    assert len(data4.get("plans", [])) >= 1, "Expected real trains for Galați -> Brașov"


