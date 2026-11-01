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
