import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_route_plan_micro19_to_unirii_contract(client: AsyncClient):
    query_payload = {
        "origin": {
            "name": "Micro 19",
            "city": "Galați",
            "coords": {
                "latitude": 45.4125,
                "longitude": 27.9982,
                "city": "Galați",
                "platform": "B"
            }
        },
        "destination": {
            "name": "Piața Unirii",
            "city": "București",
            "coords": {
                "latitude": 44.4276,
                "longitude": 26.1026,
                "city": "București",
                "platform": "Piața Unirii 1/2"
            }
        },
        "allowedModes": ["BUS", "TRAIN", "METRO", "WALK"],
        "optimizationPreference": "SAFE_BUFFERS",
        "minimumBufferMinutes": 25
    }

    res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert res.status_code == 200
    data = res.json()

    assert "plans" in data
    assert len(data["plans"]) >= 1

    plan = data["plans"][0]
    # Check root fields
    assert plan["summary"] == "Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2"
    assert plan["totalDurationMinutes"] == 275
    assert plan["transfersCount"] == 2
    assert plan["curatedPillar"] == "MOST_RELIABLE"
    assert plan["mascotRecommendation"]["persona"] == "bumble"

    # Romanian Transfer Shield Risk Analysis
    risk = plan["riskAnalysis"]
    assert "overallRiskScore" in risk
    assert risk["riskLevel"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert risk["tightestBufferMinutes"] == 20
    assert risk["bufferAdequacy"] == "OPTIMAL"
    assert len(risk["riskSummaryText"]) > 0

    # Fares
    assert plan["fare"]["totalAmountLei"] == 69.00
    assert plan["fare"]["totalAmountEur"] == 13.80
    assert len(plan["fare"]["legFares"]) == 3

    # Eco benchmarks
    assert plan["eco"]["percentageSaved"] == 80.0
    assert plan["eco"]["savedKgCO2"] > 0

    # Verify legs and coordinates
    legs = plan["legs"]
    assert len(legs) == 3

    # Leg 1: Transurb Bus 102
    leg1 = legs[0]
    assert leg1["transportType"] == "BUS"
    assert leg1["names"]["originName"] == "Micro 19"
    assert leg1["names"]["originCity"] == "Galați"
    assert leg1["names"]["destinationName"] == "Gara CFR Galați"
    assert leg1["names"]["lineCode"] == "102"
    assert leg1["names"]["operatorName"] == "Transurb S.A. Galați"
    assert leg1["coords"]["originCoords"]["latitude"] == 45.4125
    assert leg1["coords"]["geometry"]["type"] == "LineString"
    assert len(leg1["coords"]["geometry"]["coordinates"]) >= 2

    # Leg 2: CFR InterRegio IR 1572
    leg2 = legs[1]
    assert leg2["transportType"] == "TRAIN"
    assert leg2["names"]["lineCode"] == "IR 1572"
    assert leg2["names"]["operatorName"] == "CFR Călători"
    assert leg2["risk"]["transferBufferAfterMinutes"] == 20
    assert leg2["risk"]["isShieldedBuffer"] is True

    # Leg 3: Metrorex M2
    leg3 = legs[2]
    assert leg3["transportType"] == "METRO"
    assert leg3["names"]["lineCode"] == "M2"
    assert leg3["names"]["operatorName"] == "Metrorex S.A."


@pytest.mark.asyncio
async def test_route_plan_bucharest_to_brasov(client: AsyncClient):
    query_payload = {
        "origin": {"name": "București Nord", "city": "București"},
        "destination": {"name": "Gara Brașov", "city": "Brașov"},
        "allowedModes": ["TRAIN"],
        "optimizationPreference": "FASTEST"
    }

    res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert res.status_code == 200
    data = res.json()
    plan = data["plans"][0]

    assert plan["curatedPillar"] == "FASTEST"
    assert plan["mascotRecommendation"]["persona"] == "barnaby"
    assert plan["transfersCount"] == 0
    assert len(plan["legs"]) == 1
    assert plan["legs"][0]["transportType"] == "TRAIN"
    assert plan["legs"][0]["names"]["lineCode"] == "IR 1631"


@pytest.mark.asyncio
async def test_save_and_retrieve_routes(client: AsyncClient):
    # Signup user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "saved.routes.user@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Plan a route
    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    # Save route
    save_res = await client.post(
        "/api/v1/routes/saved",
        json={"plan": plan},
        headers=headers
    )
    assert save_res.status_code == 201
    saved_data = save_res.json()
    assert saved_data["origin_name"] == "Micro 19"
    assert saved_data["destination_name"] == "Piața Unirii"
    route_id = saved_data["id"]

    # List saved routes
    list_res = await client.get("/api/v1/routes/saved", headers=headers)
    assert list_res.status_code == 200
    saved_list = list_res.json()
    assert len(saved_list) == 1
    assert saved_list[0]["id"] == route_id

    # Delete saved route
    del_res = await client.delete(f"/api/v1/routes/saved/{route_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    list_res_2 = await client.get("/api/v1/routes/saved", headers=headers)
    assert len(list_res_2.json()) == 0


@pytest.mark.asyncio
async def test_generic_route_plan(client: AsyncClient):
    query_payload = {
        "origin": {"name": "Gara Timișoara Nord", "city": "Timișoara"},
        "destination": {"name": "Gara Cluj-Napoca", "city": "Cluj-Napoca"},
        "allowedModes": ["TRAIN"]
    }

    res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["plans"]) >= 1
    plan = data["plans"][0]
    assert plan["curatedPillar"] == "BEST_VALUE"
    assert len(plan["legs"]) >= 1


@pytest.mark.asyncio
async def test_save_route_unauthorized(client: AsyncClient):
    res = await client.post("/api/v1/routes/saved", json={"plan": {}})
    assert res.status_code == 401
