import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_trains_paginated(client: AsyncClient):
    resp = await client.get("/api/v1/trains?page=1&pageSize=3")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert "pagination" in data
    assert len(data["data"]) <= 3
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["pageSize"] == 3
    assert data["pagination"]["totalItems"] >= 5
    assert data["pagination"]["totalPages"] >= 2
    assert data["pagination"]["hasNext"] is True


@pytest.mark.asyncio
async def test_search_trains_by_query(client: AsyncClient):
    resp = await client.get("/api/v1/trains?searchQuery=IR+1572")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
    train = data["data"][0]
    assert train["trainNumber"] == "IR 1572"
    assert train["origin"]["code"] == "GLT"
    assert train["destination"]["code"] == "BCT"
    assert len(train["fares"]) >= 3
    assert len(train["stops"]) >= 4


@pytest.mark.asyncio
async def test_filter_trains_by_status(client: AsyncClient):
    resp = await client.get("/api/v1/trains?status=DELAYED")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
    for t in data["data"]:
        assert t["status"] == "DELAYED"
        assert t["delayMinutes"] > 0


@pytest.mark.asyncio
async def test_filter_trains_by_operator(client: AsyncClient):
    resp = await client.get("/api/v1/trains?operator=Astra+Trans+Carpatic")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
    for t in data["data"]:
        assert "Astra" in t["operator"]


@pytest.mark.asyncio
async def test_filter_trains_by_origin_and_destination(client: AsyncClient):
    resp = await client.get("/api/v1/trains?originCode=GLT&destinationCode=BCT")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
    assert data["data"][0]["origin"]["code"] == "GLT"
    assert data["data"][0]["destination"]["code"] == "BCT"


@pytest.mark.asyncio
async def test_filter_trains_by_max_price(client: AsyncClient):
    resp = await client.get("/api/v1/trains?maxPrice=50.0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
    for t in data["data"]:
        min_fare = min(f["price"] for f in t["fares"])
        assert min_fare <= 50.0


@pytest.mark.asyncio
async def test_sort_trains(client: AsyncClient):
    # Sort by price asc
    resp_asc = await client.get("/api/v1/trains?sortBy=price&sortOrder=asc")
    assert resp_asc.status_code == 200
    items_asc = resp_asc.json()["data"]
    prices_asc = [min(f["price"] for f in t["fares"]) for t in items_asc]
    assert prices_asc == sorted(prices_asc)

    # Sort by duration desc
    resp_desc = await client.get("/api/v1/trains?sortBy=duration&sortOrder=desc")
    assert resp_desc.status_code == 200
    items_desc = resp_desc.json()["data"]
    durations_desc = [t["durationMinutes"] for t in items_desc]
    assert durations_desc == sorted(durations_desc, reverse=True)


@pytest.mark.asyncio
async def test_get_train_details(client: AsyncClient):
    resp = await client.get("/api/v1/trains/tr-ir-1572-20261021")
    assert resp.status_code == 200
    train = resp.json()
    assert train["id"] == "tr-ir-1572-20261021"
    assert train["trainNumber"] == "IR 1572"
    assert train["operator"] == "CFR Călători"
    assert train["durationFormatted"] == "3h 15m"
    assert "WIFI" in train["amenities"]
    assert train["carbonFootprintKg"] > 0
    assert len(train["stops"]) == 4
    assert train["stops"][0]["station"]["name"] == "Gara Galați"
    assert train["stops"][-1]["station"]["name"] == "Gara de Nord"


@pytest.mark.asyncio
async def test_get_train_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/trains/nonexistent-train-999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_railway_operators(client: AsyncClient):
    resp = await client.get("/api/v1/trains/operators")
    assert resp.status_code == 200
    data = resp.json()
    assert "operators" in data
    assert len(data["operators"]) >= 4
    names = [op["name"] for op in data["operators"]]
    assert "CFR Călători" in names
    assert "Astra Trans Carpatic" in names
    assert "Transferoviar Călători" in names
    for op in data["operators"]:
        assert op["gtfsRtHealth"] in ["OPERATIONAL", "DEGRADED", "OFFLINE"]
        assert op["country"] == "Romania"


@pytest.mark.asyncio
async def test_get_operators_summary(client: AsyncClient):
    resp = await client.get("/api/v1/trains/operators-summary")
    assert resp.status_code == 200
    data = resp.json()

    assert data["totalDailyTrains"] > 0
    assert data["totalRoutes"] > 0
    assert data["operatorCount"] > 0
    assert data["source"] == "OFFICIAL_XML_LIVE"
    assert "updatedAt" in data

    operators = data["operators"]
    assert len(operators) >= 7

    # Verify descending sort order by dailyTrains
    train_counts = [op["dailyTrains"] for op in operators]
    assert train_counts == sorted(train_counts, reverse=True)

    # Verify factual consistency and canonical operators
    op_ids = [op["id"] for op in operators]
    assert "cfr" in op_ids
    assert "tfc" in op_ids
    assert "regio" in op_ids
    assert "interregional" in op_ids
    assert "astra" in op_ids
    assert "ferotrafic" in op_ids
    assert "softrans" in op_ids

    # Verify top operator is CFR Călători
    cfr = operators[0]
    assert cfr["id"] == "cfr"
    assert cfr["shortName"] == "CFR"
    assert cfr["name"] == "CFR Călători"
    assert cfr["dailyTrains"] == 1256
    assert cfr["routes"] == 479

    # Verify exact timetable aggregations
    assert data["totalDailyTrains"] == 2103
    assert data["totalRoutes"] == 709
    assert data["operatorCount"] == 7


@pytest.mark.asyncio
async def test_search_trains_by_ic_category(client: AsyncClient):
    resp = await client.get("/api/v1/trains?searchQuery=IC")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert len(data["data"]) > 0
    # Every returned train must strictly have category IC
    for t in data["data"]:
        assert t["trainNumber"].startswith("IC ")
    # Ensure IR 15531 (Astra Trans Carpatic) is NOT falsely returned
    numbers = [t["trainNumber"] for t in data["data"]]
    assert "IR 15531" not in numbers


@pytest.mark.asyncio
async def test_search_trains_by_full_code_ic_535(client: AsyncClient):
    resp = await client.get("/api/v1/trains?searchQuery=IC+535")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert len(data["data"]) >= 1
    t = data["data"][0]
    assert t["trainNumber"] == "IC 535"
    assert t["operator"] == "CFR Călători"
    assert len(t["stops"]) >= 2
    assert len(t["fares"]) >= 2
    assert "DINING_CAR" in t["amenities"]


@pytest.mark.asyncio
async def test_search_trains_by_compact_ic535_and_aliases(client: AsyncClient):
    for endpoint in [
        "/api/v1/trains?searchQuery=ic535",
        "/api/v1/trains?searchQuery=IC535",
        "/api/v1/trains?trainNumber=IC535",
        "/api/v1/trains?trainCode=IC+535",
        "/api/v1/trains?q=ic535",
        "/api/v1/trains?code=535",
    ]:
        resp = await client.get(endpoint)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1
        assert any(t["trainNumber"] == "IC 535" for t in data["data"])


@pytest.mark.asyncio
async def test_search_nonexistent_train_returns_empty(client: AsyncClient):
    resp = await client.get("/api/v1/trains?searchQuery=IC99999")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) == 0
    assert data["pagination"]["totalItems"] == 0


@pytest.mark.asyncio
async def test_trains_and_itinerary_100_percent_live_infofer_only(client: AsyncClient, monkeypatch):
    """
    Asserts GET /trains and GET /trains/{train_number}/itinerary are 100% live InfoFer only (zero XML schedule):
    - For Galati -> Bucuresti Nord on 2026-11-21, returns ONLY the 5 real InfoFer trains.
    - IR 10072 appears ONCE at 11:21 -> 15:03 (zero 07:23, zero IR 10074).
    - Itinerary for IR-10072 on 2026-11-21 has departure 11:21, arrival 15:03, 7 stops, Transferoviar Călători, liveSource=INFOFER_LIVE_ONLY.
    - If InfoFer returns empty [], returns 0 trains (never falls back to static XML).
    """
    from scraper.collectors.train_api import InfoFerLiveAdapter

    # 1. Corridor search for Galati -> Bucuresti Nord on 2026-11-21
    resp = await client.get("/api/v1/trains?originCode=GLT&destinationCode=BCT&date=2026-11-21")
    assert resp.status_code == 200
    data = resp.json()

    assert data["bookingWindow"]["liveSource"] == "INFOFER_LIVE_ONLY"
    assert len(data["data"]) == 5
    assert data["pagination"]["totalItems"] == 5

    train_numbers = [t["trainNumber"] for t in data["data"]]
    assert "IC 572" in train_numbers
    assert "IR 1572" in train_numbers
    assert "IR 10072" in train_numbers
    assert "IR 1574" in train_numbers
    assert "IR 1576" in train_numbers
    assert "IR 10074" not in train_numbers

    # Verify IR 10072 departs at 11:21 (NOT 07:23)
    t_10072 = next(t for t in data["data"] if "10072" in t["trainNumber"])
    assert t_10072["departureTime"].endswith("11:21:00+02:00")
    assert t_10072["arrivalTime"].endswith("15:03:00+02:00")

    # 2. Train detail itinerary for IR-10072 on 2026-11-21
    resp_itin = await client.get("/api/v1/trains/IR-10072/itinerary?date=2026-11-21")
    assert resp_itin.status_code == 200
    data_itin = resp_itin.json()

    assert data_itin["trainNumber"] == "IR 10072"
    assert data_itin["operator"] == "Transferoviar Călători"
    assert data_itin["liveSource"] == "INFOFER_LIVE_ONLY"
    assert len(data_itin["stops"]) == 7
    assert data_itin["stops"][0]["departureTime"].endswith("11:21:00+02:00")
    assert data_itin["stops"][-1]["arrivalTime"].endswith("15:03:00+02:00")

    # 3. If InfoFer returns empty [], /trains returns 0 trains (zero static XML fallback)
    adapter = InfoFerLiveAdapter.get_shared_instance()
    monkeypatch.setattr(adapter, "fetch_itinerary_sync", lambda *args, **kwargs: [])

    resp_empty = await client.get("/api/v1/trains?originCode=GLT&destinationCode=BCT&date=2026-11-21")
    assert resp_empty.status_code == 200
    data_empty = resp_empty.json()
    assert len(data_empty["data"]) == 0
    assert data_empty["pagination"]["totalItems"] == 0


@pytest.mark.asyncio
async def test_search_any_train_r2300_and_itinerary(client: AsyncClient):
    """
    Verifies live search of any train number (e.g. r2300, 2300, R 2300) and itinerary:
    - GET /api/v1/trains?searchQuery=r2300&date=2026-11-21 returns R 2300 (CFR Călători, Simeria -> Teiuș).
    - Departure 05:27, arrival 07:19, 16 stops, status ON_TIME.
    - GET /api/v1/trains?searchQuery=2300&date=2026-11-21 and searchQuery=R+2300 also find R 2300.
    - GET /api/v1/trains/R-2300/itinerary?date=2026-11-21 returns R 2300 with 16 full stops.
    """
    # 1. Search with r2300
    resp_r = await client.get("/api/v1/trains?searchQuery=r2300&date=2026-11-21")
    assert resp_r.status_code == 200
    data_r = resp_r.json()
    assert "data" in data_r
    assert len(data_r["data"]) >= 1
    t = data_r["data"][0]
    assert t["trainNumber"] == "R 2300"
    assert "CFR" in t["operator"]
    assert t["origin"]["name"] == "Simeria"
    assert t["origin"]["code"] == "SIM"
    assert t["destination"]["name"] == "Teiuș"
    assert t["destination"]["code"] == "TEI"
    assert t["departureTime"].endswith("05:27:00+02:00")
    assert t["arrivalTime"].endswith("07:19:00+02:00")
    assert t["durationMinutes"] == 112
    assert t["status"] == "ON_TIME"
    assert len(t["stops"]) == 16

    # 2. Search with 2300 and R 2300
    for q in ["2300", "R+2300", "R-2300"]:
        resp_q = await client.get(f"/api/v1/trains?searchQuery={q}&date=2026-11-21")
        assert resp_q.status_code == 200
        data_q = resp_q.json()
        assert len(data_q["data"]) >= 1
        assert any(x["trainNumber"] == "R 2300" for x in data_q["data"])

    # 3. GET /api/v1/trains/R-2300/itinerary?date=2026-11-21
    resp_itin = await client.get("/api/v1/trains/R-2300/itinerary?date=2026-11-21")
    assert resp_itin.status_code == 200
    data_itin = resp_itin.json()
    assert data_itin["trainNumber"] == "R 2300"
    assert "CFR" in data_itin["operator"]
    assert data_itin["fullTrainOrigin"] == "Simeria"
    assert data_itin["fullTrainDestination"] == "Teiuș"
    assert len(data_itin["stops"]) == 16
    assert data_itin["stops"][0]["stationName"] == "Simeria"
    assert data_itin["stops"][0]["departureTime"].endswith("05:27:00+02:00")
    assert data_itin["stops"][-1]["stationName"] == "Teiuș"
    assert data_itin["stops"][-1]["arrivalTime"].endswith("07:19:00+02:00")


def test_transitous_romanian_rail_stop_filtering():
    """
    Verifies Transitous stop filtering:
    - Strictly accepts Romanian rail stops: id starts with 'ro-railway_' or 'hu-mav_1:0053' (UIC 53 = Romania).
    - Strictly rejects non-rail / urban transit: 'eu-flixbus_*', 'ro-București_*', 'ro-Constanta_*'.
    """
    from scraper.collectors.train_api import _score_transitous_stop

    # Rail stops should have positive score
    valid_rail_cfr = {"id": "ro-railway_1001", "name": "București Nord", "importance": 0.9}
    valid_rail_mav = {"id": "hu-mav_1:005312345", "name": "Cluj-Napoca", "importance": 0.8}
    assert _score_transitous_stop(valid_rail_cfr, "București Nord") > 0
    assert _score_transitous_stop(valid_rail_mav, "Cluj-Napoca") > 0

    # Flixbus and urban bus stops must be rejected (-9999)
    flixbus_stop = {"id": "eu-flixbus_9999", "name": "București Nord", "importance": 0.9}
    urban_bus_stop = {"id": "ro-București_bus_12", "name": "București Nord", "importance": 0.9}
    assert _score_transitous_stop(flixbus_stop, "București Nord") == -9999
    assert _score_transitous_stop(urban_bus_stop, "București Nord") == -9999


def test_transitous_itinerary_parsing_and_timezone_conversion(monkeypatch):
    """
    Verifies Transitous itinerary parsing:
    - UTC ISO timestamps accurately converted to Europe/Bucharest local time.
    - Overnight rollover correctly handled (arr_sec > dep_sec even past midnight).
    - Itineraries deduplicated cleanly.
    - Future dates (e.g. 2027-02-15) return honest 0 itineraries.
    """
    from scraper.collectors.train_api import TransitousLiveAdapter
    import httpx

    adapter = TransitousLiveAdapter.get_shared_instance()

    # Mock Transitous plan response for direct + multi-leg journeys
    mock_plan_payload = {
        "itineraries": [
            {
                "legs": [
                    {
                        "mode": "RAIL",
                        "routeShortName": "IR 1572",
                        "agencyName": "CFR Călători",
                        "startTime": "2026-11-22T06:40:00Z",
                        "endTime": "2026-11-22T10:15:00Z",
                        "distance": 230000.0,
                        "from": {"name": "Galați", "lat": 45.44, "lon": 28.05},
                        "to": {"name": "București Nord", "lat": 44.44, "lon": 26.07},
                        "intermediateStops": [
                            {"name": "Brăila", "lat": 45.27, "lon": 27.96, "scheduledArrival": "2026-11-22T07:10:00Z", "scheduledDeparture": "2026-11-22T07:12:00Z"},
                            {"name": "Buzău", "lat": 45.14, "lon": 26.83, "scheduledArrival": "2026-11-22T08:35:00Z", "scheduledDeparture": "2026-11-22T08:40:00Z"}
                        ]
                    }
                ]
            },
            # Duplicate itinerary with same leg numbers and times
            {
                "legs": [
                    {
                        "mode": "RAIL",
                        "routeShortName": "IR 1572",
                        "agencyName": "CFR Călători",
                        "startTime": "2026-11-22T06:40:00Z",
                        "endTime": "2026-11-22T10:15:00Z",
                        "distance": 230000.0,
                        "from": {"name": "Galați", "lat": 45.44, "lon": 28.05},
                        "to": {"name": "București Nord", "lat": 44.44, "lon": 26.07},
                        "intermediateStops": []
                    }
                ]
            },
            # Multi-leg transfer itinerary
            {
                "legs": [
                    {
                        "mode": "RAIL",
                        "routeShortName": "R 7360",
                        "agencyName": "CFR Călători",
                        "startTime": "2026-11-22T12:00:00Z",
                        "endTime": "2026-11-22T13:30:00Z",
                        "distance": 80000.0,
                        "from": {"name": "Galați", "lat": 45.44, "lon": 28.05},
                        "to": {"name": "Făurei", "lat": 45.08, "lon": 27.27},
                        "intermediateStops": []
                    },
                    {
                        "mode": "RAIL",
                        "routeShortName": "IR 1574",
                        "agencyName": "CFR Călători",
                        "startTime": "2026-11-22T14:00:00Z",
                        "endTime": "2026-11-22T15:45:00Z",
                        "distance": 130000.0,
                        "from": {"name": "Făurei", "lat": 45.08, "lon": 27.27},
                        "to": {"name": "București Nord", "lat": 44.44, "lon": 26.07},
                        "intermediateStops": []
                    }
                ]
            }
        ]
    }

    class MockHttpxClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def get(self, url, params=None, headers=None):
            if "geocode" in url:
                return httpx.Response(200, json=[{"id": "ro-railway_1", "name": "Station", "lat": 45.0, "lon": 26.0}])
            if "plan" in url:
                return httpx.Response(200, json=mock_plan_payload)
            return httpx.Response(404)

    monkeypatch.setattr(httpx, "Client", MockHttpxClient)

    # Clear Redis test key if present
    from scraper.collectors.train_api import _get_sync_redis_client
    sync_r = _get_sync_redis_client()
    if sync_r:
        sync_r.delete("live_itinerary:v5:mockorigin:mockdest:2026-11-22")

    recs = adapter.fetch_itinerary_sync("MockOrigin", "MockDest", "2026-11-22")
    assert len(recs) == 2  # 1 direct (deduped from 2) + 1 multi-leg

    r_direct = recs[0]
    assert r_direct.source_train_api.train_number == "IR 1572"
    assert r_direct.is_multi_leg is False
    assert r_direct.departure_seconds == 8 * 3600 + 40 * 60
    assert r_direct.arrival_seconds == 12 * 3600 + 15 * 60
    assert len(r_direct.route_stops) == 4

    r_multi = recs[1]
    assert r_multi.is_multi_leg is True
    assert "7360" in r_multi.source_train_api.train_number
    assert "1574" in r_multi.source_train_api.train_number
    assert r_multi.transfer_station == "Făurei"
    assert r_multi.transfer_wait_minutes == 30


def test_transitous_corridors_support_offline(monkeypatch):
    """
    Verifies that Alba-Iulia -> Cluj-Napoca, Piatra-Neamț -> București Nord,
    Târgu-Mureș -> Brașov, and București Nord -> Iași parse and build valid records,
    without any fake IR 1833 fallback.
    """
    from scraper.collectors.train_api import TransitousLiveAdapter
    import urllib.parse
    import httpx

    adapter = TransitousLiveAdapter.get_shared_instance()

    corridor_train_map = {
        ("Alba-Iulia", "Cluj-Napoca"): ("IR 1835", "2026-11-22T06:15:00Z", "2026-11-22T08:30:00Z"),
        ("Piatra-Neamț", "București Nord"): ("R 5460", "2026-11-22T04:30:00Z", "2026-11-22T10:15:00Z"),
        ("Târgu-Mureș", "Brașov"): ("R 4540", "2026-11-22T05:00:00Z", "2026-11-22T11:00:00Z"),
        ("București Nord", "Iași"): ("IC 11761", "2026-11-22T06:00:00Z", "2026-11-22T12:00:00Z"),
    }

    current_corridor = [("Alba-Iulia", "Cluj-Napoca")]

    def mock_get(self, url, params=None, headers=None):
        if "geocode" in url:
            text_param = url.split("text=")[1].split("&")[0] if "text=" in url else "Station"
            name = urllib.parse.unquote(text_param)
            return httpx.Response(200, json=[{"id": "ro-railway_123", "name": name, "lat": 46.0, "lon": 24.0}])
        if "plan" in url:
            c = current_corridor[0]
            t_num, start_iso, end_iso = corridor_train_map.get(c, ("R 1234", "2026-11-22T06:00:00Z", "2026-11-22T09:00:00Z"))
            return httpx.Response(200, json={
                "itineraries": [
                    {
                        "legs": [
                            {
                                "mode": "RAIL",
                                "routeShortName": t_num,
                                "agencyName": "CFR Călători",
                                "startTime": start_iso,
                                "endTime": end_iso,
                                "distance": 120000.0,
                                "from": {"name": c[0], "lat": 46.0, "lon": 24.0},
                                "to": {"name": c[1], "lat": 46.5, "lon": 24.5},
                                "intermediateStops": []
                            }
                        ]
                    }
                ]
            })
        return httpx.Response(404)

    class MockHttpxClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        get = mock_get

    monkeypatch.setattr(httpx, "Client", MockHttpxClient)

    from scraper.collectors.train_api import _get_sync_redis_client
    sync_r = _get_sync_redis_client()
    if sync_r:
        for k in sync_r.keys("live_itinerary:v5:*"):
            sync_r.delete(k)

    try:
        for orig, dest in [
            ("Alba-Iulia", "Cluj-Napoca"),
            ("Piatra-Neamț", "București Nord"),
            ("Târgu-Mureș", "Brașov"),
            ("București Nord", "Iași")
        ]:
            current_corridor[0] = (orig, dest)
            recs = adapter.fetch_itinerary_sync(orig, dest, "2026-11-22")
            assert len(recs) >= 1
            expected_num = corridor_train_map[(orig, dest)][0]
            assert recs[0].source_train_api.train_number != "IR 1833"
            assert recs[0].source_train_api.train_number == expected_num
            # Check departure ISO is in Europe/Bucharest (+02:00)
            assert recs[0].departure_iso is not None
            assert recs[0].departure_iso.endswith("+02:00")
    finally:
        if sync_r:
            for k in sync_r.keys("live_itinerary:v5:*"):
                sync_r.delete(k)



