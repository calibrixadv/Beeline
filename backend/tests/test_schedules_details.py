import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_supported_cities(client: AsyncClient):
    resp = await client.get("/api/v1/schedules/cities")
    assert resp.status_code == 200
    data = resp.json()
    assert "cities" in data
    assert len(data["cities"]) >= 6

    city_names = [c["name"] for c in data["cities"]]
    assert "București" in city_names
    assert "Galați" in city_names
    assert "Cluj-Napoca" in city_names
    assert "Brașov" in city_names

    buc = next(c for c in data["cities"] if c["name"] == "București")
    assert "METRO" in buc["modes"]
    assert buc["hasRealtime"] is True


@pytest.mark.asyncio
async def test_get_schedule_details(client: AsyncClient):
    resp = await client.get("/api/v1/schedules/sch-gl-102")
    assert resp.status_code == 200
    data = resp.json()

    assert "schedule" in data
    assert data["schedule"]["lineCode"] == "102"
    assert data["schedule"]["city"] == "Galați"

    assert "stops" in data
    assert len(data["stops"]) >= 4
    first_stop = data["stops"][0]
    assert first_stop["stopSequence"] == 1
    assert first_stop["name"] == "Micro 19"
    assert first_stop["latitude"] > 40.0
    assert first_stop["longitude"] > 20.0
    assert len(first_stop["scheduledDepartures"]) >= 1

    assert "operatingDays" in data
    assert "Monday" in data["operatingDays"]


@pytest.mark.asyncio
async def test_get_schedule_details_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/schedules/invalid-schedule-999")
    assert resp.status_code == 404
