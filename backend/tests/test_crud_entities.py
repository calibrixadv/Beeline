import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_station_crud_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test full CRUD lifecycle for Station entity."""
    station_payload = {
        "code": "TST_STN",
        "name": "Stația de Testare Ploiești Vest",
        "city": "Ploiești",
        "modes": ["TRAIN", "BUS"],
        "coordinates": {
            "latitude": 44.9312,
            "longitude": 26.0125,
            "city": "Ploiești"
        }
    }

    # 1. CREATE
    create_res = await client.post("/api/v1/stations", json=station_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["code"] == "TST_STN"
    assert created_data["city"] == "Ploiești"

    # Database level verification
    db_row = (await db_session.execute(text("SELECT code, name, city FROM stations WHERE code = 'TST_STN'"))).fetchone()
    assert db_row is not None
    assert db_row[0] == "TST_STN"
    assert db_row[1] == "Stația de Testare Ploiești Vest"

    # Duplicate create should return 409 Conflict
    dup_res = await client.post("/api/v1/stations", json=station_payload)
    assert dup_res.status_code == 409

    # 2. READ (List & Single)
    list_res = await client.get("/api/v1/stations?city=Ploiești")
    assert list_res.status_code == 200
    st_codes = [s["code"] for s in list_res.json()]
    assert "TST_STN" in st_codes

    get_res = await client.get("/api/v1/stations/TST_STN")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Stația de Testare Ploiești Vest"

    # 3. UPDATE (PATCH)
    patch_res = await client.patch("/api/v1/stations/TST_STN", json={
        "name": "Ploiești Vest Terminal Central",
        "modes": ["TRAIN", "BUS", "TRAM"]
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Ploiești Vest Terminal Central"
    assert "TRAM" in patch_res.json()["modes"]

    # Database level verification of update
    db_patch = (await db_session.execute(text("SELECT name FROM stations WHERE code = 'TST_STN'"))).scalar()
    assert db_patch == "Ploiești Vest Terminal Central"

    # 4. DELETE
    del_res = await client.delete("/api/v1/stations/TST_STN")
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Verify deleted in API and in SQL database table
    get_after_del = await client.get("/api/v1/stations/TST_STN")
    assert get_after_del.status_code == 404

    db_after_del = (await db_session.execute(text("SELECT code FROM stations WHERE code = 'TST_STN'"))).fetchone()
    assert db_after_del is None

    # Foreign Key constraint check: Attempting to delete a station referenced by active train must fail
    fk_res = await client.delete("/api/v1/stations/BCT")
    assert fk_res.status_code == 409
    assert "Foreign Key constraint" in fk_res.json()["detail"]


@pytest.mark.asyncio
async def test_train_crud_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test full CRUD lifecycle for Train journey entity."""
    train_payload = {
        "id": "trn-test-9999",
        "trainNumber": "IR 9999",
        "operator": "CFR Călători",
        "origin": {
            "code": "BCT",
            "name": "București Nord",
            "city": "București",
            "platform": "Linia 3"
        },
        "destination": {
            "code": "GLT",
            "name": "Gara Galați",
            "city": "Galați",
            "platform": "Linia 1"
        },
        "departureTime": "2026-10-21T09:00:00+03:00",
        "arrivalTime": "2026-10-21T12:45:00+03:00",
        "durationMinutes": 225,
        "status": "ON_TIME",
        "delayMinutes": 0,
        "fares": [
            {"classType": "STANDARD", "price": 65.0, "currency": "RON", "seatsAvailable": 120},
            {"classType": "FIRST", "price": 105.0, "currency": "RON", "seatsAvailable": 35}
        ],
        "amenities": ["WIFI", "POWER_OUTLETS", "DINING_CAR"]
    }

    # 1. CREATE
    res = await client.post("/api/v1/trains", json=train_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["trainNumber"] == "IR 9999"
    assert data["id"] == "trn-test-9999"

    # Database level verification
    db_tr = (await db_session.execute(text("SELECT id, train_number, status FROM trains WHERE id = 'trn-test-9999'"))).fetchone()
    assert db_tr is not None
    assert db_tr[1] == "IR 9999"
    assert db_tr[2] == "ON_TIME"

    # Duplicate check
    dup_res = await client.post("/api/v1/trains", json=train_payload)
    assert dup_res.status_code == 409

    # 2. READ
    get_res = await client.get("/api/v1/trains/trn-test-9999")
    assert get_res.status_code == 200
    assert get_res.json()["trainNumber"] == "IR 9999"

    # 3. UPDATE (PATCH)
    patch_res = await client.patch("/api/v1/trains/trn-test-9999", json={
        "status": "DELAYED",
        "delayMinutes": 20,
        "amenities": ["WIFI", "POWER_OUTLETS", "DINING_CAR", "QUIET_ZONE"]
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "DELAYED"
    assert patch_res.json()["delayMinutes"] == 20
    assert "QUIET_ZONE" in patch_res.json()["amenities"]

    # Database level verification of update
    db_patch = (await db_session.execute(text("SELECT status, delay_minutes FROM trains WHERE id = 'trn-test-9999'"))).fetchone()
    assert db_patch[0] == "DELAYED"
    assert db_patch[1] == 20

    # 4. DELETE
    del_res = await client.delete("/api/v1/trains/trn-test-9999")
    assert del_res.status_code == 200

    # Verify deleted in API and SQL database
    get_after = await client.get("/api/v1/trains/trn-test-9999")
    assert get_after.status_code == 404

    db_after = (await db_session.execute(text("SELECT id FROM trains WHERE id = 'trn-test-9999'"))).fetchone()
    assert db_after is None


@pytest.mark.asyncio
async def test_schedule_crud_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test full CRUD lifecycle for Transit Schedule entity."""
    schedule_payload = {
        "id": "sch-test-107",
        "lineCode": "107",
        "lineName": "Traseu 107 Micro 19 - Barboși",
        "mode": "BUS",
        "provider": {
            "id": "transurb",
            "name": "Transurb S.A. Galați",
            "shortName": "Transurb",
            "city": "Galați",
            "modes": ["BUS", "TRAM"],
            "badgeColor": "#059669"
        },
        "city": "Galați",
        "origin": "Micro 19",
        "destination": "Barboși",
        "fareLei": 2.5,
        "status": "ON_TIME"
    }

    # 1. CREATE
    res = await client.post("/api/v1/schedules", json=schedule_payload)
    assert res.status_code == 201
    assert res.json()["lineCode"] == "107"

    # Database level check
    db_sch = (await db_session.execute(text("SELECT id, line_code, fare_lei FROM schedules WHERE id = 'sch-test-107'"))).fetchone()
    assert db_sch is not None
    assert db_sch[1] == "107"

    # 2. READ
    get_res = await client.get("/api/v1/schedules/sch-test-107")
    assert get_res.status_code == 200
    assert get_res.json()["schedule"]["destination"] == "Barboși"

    # 3. UPDATE (PATCH)
    patch_res = await client.patch("/api/v1/schedules/sch-test-107", json={
        "lineName": "Traseu 107 Express Micro 19 - Barboși Triaj",
        "fareLei": 3.0,
        "status": "DELAYED"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["fareLei"] == 3.0
    assert patch_res.json()["status"] == "DELAYED"

    # Database level check of update
    db_patch = (await db_session.execute(text("SELECT fare_lei FROM schedules WHERE id = 'sch-test-107'"))).scalar()
    assert db_patch == 3.0

    # 4. DELETE
    del_res = await client.delete("/api/v1/schedules/sch-test-107")
    assert del_res.status_code == 200

    # Verify deleted
    get_after = await client.get("/api/v1/schedules/sch-test-107")
    assert get_after.status_code == 404

    db_after = (await db_session.execute(text("SELECT id FROM schedules WHERE id = 'sch-test-107'"))).fetchone()
    assert db_after is None


@pytest.mark.asyncio
async def test_disruption_crud_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test full CRUD lifecycle for Transit Disruption entity."""
    disruption_payload = {
        "id": "disr-test-101",
        "operator": "CFR Călători",
        "severity": "CRITICAL",
        "headline": "Defecțiune semnalizare Magistrala 300",
        "description": "Circulație oprită temporar între stațiile Brașov și Predeal din cauza căderilor de copaci pe linia de contact.",
        "estimatedDelayMinutes": 45,
        "affectedLines": ["IR 1634", "IC 538"]
    }

    # 1. CREATE
    res = await client.post("/api/v1/disruptions", json=disruption_payload)
    assert res.status_code == 201
    assert res.json()["id"] == "disr-test-101"

    # Database level check
    db_dis = (await db_session.execute(text("SELECT id, severity, delay_minutes FROM disruptions WHERE id = 'disr-test-101'"))).fetchone()
    assert db_dis is not None
    assert db_dis[1] == "CRITICAL"
    assert db_dis[2] == 45

    # 2. READ
    get_res = await client.get("/api/v1/disruptions/disr-test-101")
    assert get_res.status_code == 200
    assert get_res.json()["severity"] == "CRITICAL"
    assert get_res.json()["estimatedDelayMinutes"] == 45

    # 3. UPDATE (PATCH)
    patch_res = await client.patch("/api/v1/disruptions/disr-test-101", json={
        "severity": "WARNING",
        "estimatedDelayMinutes": 20,
        "headline": "Intervenție parțial finalizată pe Magistrala 300"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["severity"] == "WARNING"
    assert patch_res.json()["estimatedDelayMinutes"] == 20

    # Database level check of update
    db_patch = (await db_session.execute(text("SELECT severity, delay_minutes FROM disruptions WHERE id = 'disr-test-101'"))).fetchone()
    assert db_patch[0] == "WARNING"
    assert db_patch[1] == 20

    # 4. DELETE
    del_res = await client.delete("/api/v1/disruptions/disr-test-101")
    assert del_res.status_code == 200

    # Verify deleted
    get_after = await client.get("/api/v1/disruptions/disr-test-101")
    assert get_after.status_code == 404

    db_after = (await db_session.execute(text("SELECT id FROM disruptions WHERE id = 'disr-test-101'"))).fetchone()
    assert db_after is None


@pytest.mark.asyncio
async def test_booking_read_and_patch_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test Read and Patch lifecycle for Bookings."""
    # 1. Register test user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "booking.crud.user@beeline.io",
        "password": "SecurePass123!",
        "full_name": "Radu Ionescu"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create booking
    booking_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": "2026-10-21",
                "seatPreferences": {"position": "WINDOW", "quietZone": False},
                "passengers": [{"fullName": "Radu Ionescu", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "booking.crud.user@beeline.io",
        "contactPhone": "+40711111111"
    }
    b_res = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
    assert b_res.status_code == 201
    booking_id = b_res.json()["bookingId"]

    # 3. GET /bookings/{booking_id}
    get_res = await client.get(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["bookingId"] == booking_id
    assert get_res.json()["contactEmail"] == "booking.crud.user@beeline.io"

    # 4. PATCH /bookings/{booking_id}
    patch_res = await client.patch(f"/api/v1/bookings/{booking_id}", json={
        "contactPhone": "+40799999999",
        "status": "REFUNDED"
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["contactPhone"] == "+40799999999"
    assert patch_res.json()["status"] == "REFUNDED"

    # Database level check
    db_bkg = (await db_session.execute(text("SELECT status, contact_phone FROM bookings WHERE id = :id"), {"id": booking_id})).fetchone()
    assert db_bkg is not None
    assert db_bkg[0] == "REFUNDED"
    assert db_bkg[1] == "+40799999999"


@pytest.mark.asyncio
async def test_saved_routes_patch_lifecycle(client: AsyncClient):
    """Test PATCH update on Saved Routes."""
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "routes.crud.user@beeline.io",
        "password": "SecurePass123!",
        "full_name": "Elena Vasilescu"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Plan a route first
    query_payload = {
        "origin": {
            "name": "Micro 19",
            "city": "Galați",
            "coords": {
                "latitude": 45.4125,
                "longitude": 27.9982,
                "city": "Galați"
            }
        },
        "destination": {
            "name": "Piața Unirii",
            "city": "București",
            "coords": {
                "latitude": 44.4276,
                "longitude": 26.1026,
                "city": "București"
            }
        },
        "allowedModes": ["BUS", "TRAIN", "METRO", "WALK"]
    }
    plan_res = await client.post("/api/v1/routes/plan", json=query_payload)
    assert plan_res.status_code == 200
    plans = plan_res.json()["plans"]
    assert len(plans) >= 1
    target_plan = plans[0]

    # Save route
    save_res = await client.post("/api/v1/routes/saved", json={"plan": target_plan}, headers=headers)
    assert save_res.status_code == 201
    route_id = save_res.json()["id"]

    # PATCH saved route
    patch_res = await client.patch(f"/api/v1/routes/saved/{route_id}", json={
        "origin_name": "Galați Centru Acasă",
        "destination_name": "București Birou Unirii"
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["origin_name"] == "Galați Centru Acasă"
    assert patch_res.json()["destination_name"] == "București Birou Unirii"

    # Clean up
    del_res = await client.delete(f"/api/v1/routes/saved/{route_id}", headers=headers)
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_user_self_deletion_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test User DELETE /me (account self-deletion) lifecycle."""
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "user.to.delete@beeline.io",
        "password": "TemporaryPassword123!",
        "full_name": "Utilizator Temporar"
    })
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify user can access profile
    me_res = await client.get("/api/v1/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "user.to.delete@beeline.io"

    # Delete user profile
    del_res = await client.delete("/api/v1/users/me", headers=headers)
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Verify frozen pending deletion in SQL database (30-day lifecycle)
    db_usr = (await db_session.execute(text("SELECT id, account_status, is_active FROM users WHERE email = 'user.to.delete@beeline.io'"))).fetchone()
    assert db_usr is not None
    assert db_usr[1] == "FROZEN_PENDING_DELETION"
    assert not db_usr[2]

    # Attempting to access profile with old token should now fail (User not found)
    me_after = await client.get("/api/v1/users/me", headers=headers)
    assert me_after.status_code in [401, 404]
