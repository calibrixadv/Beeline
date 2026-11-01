import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_saved_routes_pagination(client: AsyncClient):
    # 1. Signup user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "saved.pagination@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Plan a sample route
    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    # 3. Save 3 routes
    for i in range(3):
        p = dict(plan)
        p["id"] = f"plan-{i}"
        await client.post("/api/v1/routes/saved", json={"plan": p}, headers=headers)

    # 4. Fetch page 1 (pageSize 2)
    res_p1 = await client.get("/api/v1/routes/saved?page=1&pageSize=2", headers=headers)
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()

    assert "data" in data_p1
    assert "pagination" in data_p1
    assert len(data_p1["data"]) == 2
    assert data_p1["pagination"]["page"] == 1
    assert data_p1["pagination"]["pageSize"] == 2
    assert data_p1["pagination"]["totalItems"] == 3
    assert data_p1["pagination"]["totalPages"] == 2
    assert data_p1["pagination"]["hasNext"] is True
    assert data_p1["pagination"]["hasPrev"] is False

    # 5. Fetch page 2 (pageSize 2)
    res_p2 = await client.get("/api/v1/routes/saved?page=2&pageSize=2", headers=headers)
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["data"]) == 1
    assert data_p2["pagination"]["page"] == 2
    assert data_p2["pagination"]["hasNext"] is False
    assert data_p2["pagination"]["hasPrev"] is True

    # 6. Unpaginated returns raw list
    res_raw = await client.get("/api/v1/routes/saved", headers=headers)
    assert res_raw.status_code == 200
    assert isinstance(res_raw.json(), list)
    assert len(res_raw.json()) == 3
