import copy
import pytest
from httpx import AsyncClient
from tests.conftest import signup_and_verify


@pytest.mark.asyncio
async def test_saved_routes_deduplication_and_clean_delete(client: AsyncClient):
    # 1. Signup and verify user
    signup_data = await signup_and_verify(client, {
        "email": "saved.dedup@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Plan a route on Galați -> București corridor
    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    assert plan_res.status_code == 200
    plan_1 = plan_res.json()["plans"][0]

    # Save route first time
    save_1 = await client.post("/api/v1/routes/saved", json={"plan": plan_1}, headers=headers)
    assert save_1.status_code == 201
    route_id_1 = save_1.json()["id"]

    # Save same physical route second time (without Idempotency-Key and with altered client plan id)
    plan_1_dup = copy.deepcopy(plan_1)
    plan_1_dup["id"] = "client-temp-generated-plan-id-999"
    save_2 = await client.post("/api/v1/routes/saved", json={"plan": plan_1_dup}, headers=headers)
    assert save_2.status_code in [200, 201]
    assert save_2.json()["id"] == route_id_1  # 0 duplicates: returns existing record

    # Verify exactly 1 route exists in user's saved list
    list_res_1 = await client.get("/api/v1/routes/saved", headers=headers)
    assert list_res_1.status_code == 200
    routes_1 = list_res_1.json()
    assert len(routes_1) == 1
    assert routes_1[0]["id"] == route_id_1

    # 3. Post two distinct trains on the same corridor produces 2 rows
    plan_2 = copy.deepcopy(plan_1)
    plan_2["id"] = "plan-distinct-train-corridor"
    for leg in plan_2["legs"]:
        if leg["transportType"] == "TRAIN":
            leg["names"]["lineCode"] = "IR 1574"
            break
    plan_2["summary"] = "Transurb Bus 102 ➔ CFR IR 1574 ➔ Metrorex M2"

    save_3 = await client.post("/api/v1/routes/saved", json={"plan": plan_2}, headers=headers)
    assert save_3.status_code == 201
    route_id_2 = save_3.json()["id"]
    assert route_id_2 != route_id_1

    list_res_2 = await client.get("/api/v1/routes/saved", headers=headers)
    assert list_res_2.status_code == 200
    routes_2 = list_res_2.json()
    assert len(routes_2) == 2
    saved_ids = {r["id"] for r in routes_2}
    assert route_id_1 in saved_ids
    assert route_id_2 in saved_ids

    # 4. Verify deleting a saved route removes it cleanly
    del_res = await client.delete(f"/api/v1/routes/saved/{route_id_1}", headers=headers)
    assert del_res.status_code == 200

    list_res_3 = await client.get("/api/v1/routes/saved", headers=headers)
    assert list_res_3.status_code == 200
    routes_3 = list_res_3.json()
    assert len(routes_3) == 1
    assert routes_3[0]["id"] == route_id_2

    # Deleting already deleted route yields 404
    del_res_404 = await client.delete(f"/api/v1/routes/saved/{route_id_1}", headers=headers)
    assert del_res_404.status_code == 404
