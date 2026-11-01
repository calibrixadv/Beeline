import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_saved_routes_idempotency(client: AsyncClient):
    # Signup user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "saved.idem@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    key = "route:v1:user-1:gl-buc:2026-10-21"
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": key
    }

    # Plan a route
    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    # Save route with Idempotency-Key
    save_1 = await client.post("/api/v1/routes/saved", json={"plan": plan}, headers=headers)
    assert save_1.status_code == 201
    route_id_1 = save_1.json()["id"]

    # Replay with same key + body: returns cached response
    save_2 = await client.post("/api/v1/routes/saved", json={"plan": plan}, headers=headers)
    assert save_2.status_code == 201
    assert save_2.json()["id"] == route_id_1

    # Verify only 1 route was saved in user's wallet
    list_res = await client.get("/api/v1/routes/saved", headers=headers)
    assert len(list_res.json()) == 1

    # Replay with mismatched payload: raises 422
    plan_modified = dict(plan)
    plan_modified["id"] = "different-plan-id"
    save_3 = await client.post("/api/v1/routes/saved", json={"plan": plan_modified}, headers=headers)
    assert save_3.status_code == 422
