import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_all_schedules(client: AsyncClient):
    res = await client.get("/api/v1/schedules")
    assert res.status_code == 200
    schedules = res.json()
    assert len(schedules) >= 5


@pytest.mark.asyncio
async def test_filter_schedules_by_section(client: AsyncClient):
    # Train section
    res_train = await client.get("/api/v1/schedules?section=TRAIN")
    assert res_train.status_code == 200
    for s in res_train.json():
        assert s["mode"] == "TRAIN"

    # Urban section
    res_urban = await client.get("/api/v1/schedules?section=URBAN")
    assert res_urban.status_code == 200
    for s in res_urban.json():
        assert s["mode"] in ["BUS", "TRAM", "METRO"]


@pytest.mark.asyncio
async def test_filter_schedules_by_city_and_search(client: AsyncClient):
    # Filter by Galați
    res_gl = await client.get("/api/v1/schedules?city=Galați")
    assert res_gl.status_code == 200
    lines = [s["lineCode"] for s in res_gl.json()]
    assert "102" in lines

    # Search by line code
    res_m2 = await client.get("/api/v1/schedules?search=M2")
    assert res_m2.status_code == 200
    assert len(res_m2.json()) == 1
    assert res_m2.json()[0]["lineCode"] == "M2"
