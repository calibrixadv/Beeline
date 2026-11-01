import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_schedules_pagination_standard(client: AsyncClient):
    # Request first page with pageSize 2
    res_p1 = await client.get("/api/v1/schedules?page=1&pageSize=2")
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()

    assert "data" in data_p1
    assert "pagination" in data_p1
    assert len(data_p1["data"]) == 2
    meta1 = data_p1["pagination"]
    assert meta1["page"] == 1
    assert meta1["pageSize"] == 2
    assert meta1["totalItems"] >= 5
    assert meta1["totalPages"] >= 3
    assert meta1["hasNext"] is True
    assert meta1["hasPrev"] is False

    # Request second page
    res_p2 = await client.get("/api/v1/schedules?page=2&pageSize=2")
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["data"]) == 2
    meta2 = data_p2["pagination"]
    assert meta2["page"] == 2
    assert meta2["hasPrev"] is True
    # Items on p2 should differ from p1
    p1_ids = {s["id"] for s in data_p1["data"]}
    p2_ids = {s["id"] for s in data_p2["data"]}
    assert p1_ids.isdisjoint(p2_ids)


@pytest.mark.asyncio
async def test_schedules_unpaginated_backward_compatibility(client: AsyncClient):
    # When page/pageSize are omitted, returns raw list
    res = await client.get("/api/v1/schedules")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 5
