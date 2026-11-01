import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_stations_autocomplete(client: AsyncClient):
    resp = await client.get("/api/v1/stations/search?query=Bucur&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "stations" in data
    assert len(data["stations"]) >= 2

    station_codes = [s["code"] for s in data["stations"]]
    assert "BCT" in station_codes
    assert "BCO" in station_codes

    bct = next(s for s in data["stations"] if s["code"] == "BCT")
    assert bct["name"] == "București Nord"
    assert bct["city"] == "București"
    assert "TRAIN" in bct["modes"]
    assert bct["coordinates"]["latitude"] > 44.0
    assert bct["coordinates"]["longitude"] > 25.0


@pytest.mark.asyncio
async def test_search_stations_query_too_short(client: AsyncClient):
    resp = await client.get("/api/v1/stations/search?query=B")
    assert resp.status_code == 400
    assert "at least 2 characters" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_search_stations_by_city(client: AsyncClient):
    resp = await client.get("/api/v1/stations/search?query=Gara&city=Galați")
    assert resp.status_code == 200
    stations = resp.json()["stations"]
    assert len(stations) >= 1
    assert stations[0]["code"] == "GLT"
    assert stations[0]["city"] == "Galați"


@pytest.mark.asyncio
async def test_station_board_departures(client: AsyncClient):
    resp = await client.get("/api/v1/stations/BCT/board?type=DEPARTURES&windowHours=4")
    assert resp.status_code == 200
    data = resp.json()
    assert data["boardType"] == "DEPARTURES"
    assert data["station"]["code"] == "BCT"
    assert data["station"]["name"] == "București Nord"
    assert "items" in data
    assert len(data["items"]) >= 1

    first_item = data["items"][0]
    assert "trainNumber" in first_item
    assert "operator" in first_item
    assert "destination" in first_item
    assert "scheduledTime" in first_item
    assert "platform" in first_item
    assert first_item["status"] in ["ON_TIME", "DELAYED", "CANCELLED", "BOARDING"]


@pytest.mark.asyncio
async def test_station_board_arrivals(client: AsyncClient):
    resp = await client.get("/api/v1/stations/BCT/board?type=ARRIVALS&windowHours=4")
    assert resp.status_code == 200
    data = resp.json()
    assert data["boardType"] == "ARRIVALS"
    assert data["station"]["code"] == "BCT"
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_station_board_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/stations/UNKNOWN999/board")
    assert resp.status_code == 404
