import copy
from datetime import datetime, timedelta, timezone
import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.route import SavedRoute
from app.models.transit import Station, Train
from app.models.user import User
from app.services.email_service import email_service
from app.services.trip_notification_service import (
    clear_dedup_cache,
    trip_notification_service,
)
from tests.conftest import signup_and_verify


@pytest.mark.asyncio
async def test_saved_route_default_alert_preferences(client: AsyncClient):
    """
    1. Default values on newly saved route:
       alertMuted == False, alertLeadMinutes == 30.
    """
    signup_data = await signup_and_verify(client, {
        "email": "alert.defaults@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    assert plan_res.status_code == 200
    plan = plan_res.json()["plans"][0]

    save_res = await client.post("/api/v1/routes/saved", json={"plan": plan}, headers=headers)
    assert save_res.status_code == 201
    data = save_res.json()

    assert data["alertMuted"] is False
    assert data["alertLeadMinutes"] == 30
    route_id = data["id"]

    list_res = await client.get("/api/v1/routes/saved", headers=headers)
    assert list_res.status_code == 200
    routes = list_res.json()
    assert len(routes) == 1
    assert routes[0]["id"] == route_id
    assert routes[0]["alertMuted"] is False
    assert routes[0]["alertLeadMinutes"] == 30


@pytest.mark.asyncio
async def test_patch_saved_route_valid_alert_preferences(client: AsyncClient):
    """
    2. PATCH /api/v1/routes/saved/{id} updates alertLeadMinutes to 5, 10, 30, 60
       and toggles alertMuted: True / False.
    """
    signup_data = await signup_and_verify(client, {
        "email": "alert.patch.valid@beeline.io",
        "password": "SecurePassword123!"
    })
    headers = {"Authorization": f"Bearer {signup_data['access_token']}"}

    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    save_res = await client.post("/api/v1/routes/saved", json={"plan": plan}, headers=headers)
    route_id = save_res.json()["id"]

    # Test updating alertLeadMinutes to each allowed literal (5, 10, 30, 60)
    for lead in [5, 10, 60, 30]:
        patch_res = await client.patch(
            f"/api/v1/routes/saved/{route_id}",
            json={"alertLeadMinutes": lead},
            headers=headers
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["alertLeadMinutes"] == lead

    # Test toggling alertMuted to True
    patch_muted = await client.patch(
        f"/api/v1/routes/saved/{route_id}",
        json={"alertMuted": True},
        headers=headers
    )
    assert patch_muted.status_code == 200
    assert patch_muted.json()["alertMuted"] is True

    # Test toggling alertMuted back to False and lead to 10 simultaneously
    patch_both = await client.patch(
        f"/api/v1/routes/saved/{route_id}",
        json={"alertMuted": False, "alertLeadMinutes": 10},
        headers=headers
    )
    assert patch_both.status_code == 200
    assert patch_both.json()["alertMuted"] is False
    assert patch_both.json()["alertLeadMinutes"] == 10


@pytest.mark.asyncio
async def test_patch_saved_route_invalid_lead_minutes_returns_422(client: AsyncClient):
    """
    3. Invalid alertLeadMinutes (e.g. 17, 0, 45) returns 422 Unprocessable Entity.
    """
    signup_data = await signup_and_verify(client, {
        "email": "alert.invalid@beeline.io",
        "password": "SecurePassword123!"
    })
    headers = {"Authorization": f"Bearer {signup_data['access_token']}"}

    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    save_res = await client.post("/api/v1/routes/saved", json={"plan": plan}, headers=headers)
    route_id = save_res.json()["id"]

    for invalid_lead in [17, 0, 45, 90, -10]:
        patch_res = await client.patch(
            f"/api/v1/routes/saved/{route_id}",
            json={"alertLeadMinutes": invalid_lead},
            headers=headers
        )
        assert patch_res.status_code == 422, f"Expected 422 for lead={invalid_lead}, got {patch_res.status_code}"


@pytest.mark.asyncio
async def test_patch_saved_route_ownership_enforcement(client: AsyncClient):
    """
    Ownership check: User A cannot update User B's saved route (403 or 404).
    """
    user_a = await signup_and_verify(client, {
        "email": "owner.a@beeline.io",
        "password": "SecurePassword123!"
    })
    user_b = await signup_and_verify(client, {
        "email": "owner.b@beeline.io",
        "password": "SecurePassword123!"
    })

    plan_res = await client.post("/api/v1/routes/plan", json={
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
        "allowedModes": ["BUS", "TRAIN", "METRO"]
    })
    plan = plan_res.json()["plans"][0]

    # User A creates a saved route
    save_res = await client.post(
        "/api/v1/routes/saved",
        json={"plan": plan},
        headers={"Authorization": f"Bearer {user_a['access_token']}"}
    )
    route_id_a = save_res.json()["id"]

    # User B attempts to patch User A's route
    patch_b = await client.patch(
        f"/api/v1/routes/saved/{route_id_a}",
        json={"alertMuted": True},
        headers={"Authorization": f"Bearer {user_b['access_token']}"}
    )
    assert patch_b.status_code in [403, 404]

    # Non-existent route ID
    patch_missing = await client.patch(
        "/api/v1/routes/saved/non-existent-uuid-12345",
        json={"alertMuted": True},
        headers={"Authorization": f"Bearer {user_a['access_token']}"}
    )
    assert patch_missing.status_code == 404


@pytest.mark.asyncio
async def test_scheduler_alert_muted_suppresses_all_emails(db_session: AsyncSession):
    """
    Scheduler behavior:
    When alert_muted=True, 0 emails are dispatched even when departure is within window
    OR train is delayed by +25 min.
    """
    email_service.clear_outbox()
    await clear_dedup_cache()

    now = datetime(2026, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
    departure_time = now + timedelta(minutes=8)

    user = User(
        id="user-muted-test",
        email="muted.traveler@beeline.io",
        full_name="Muted Traveler",
        is_guest=False,
        is_active=True,
        account_status="ACTIVE",
        preferences=json.dumps({"email_notifications": True})
    )
    db_session.add(user)

    plan_data = {
        "summary": "IR 1632 • Brașov → București Nord",
        "departureTime": departure_time.isoformat(),
        "delayMinutes": 25,
        "legs": [
            {
                "trainNumber": "IR 1632",
                "origin": {"name": "Brașov"},
                "destination": {"name": "București Nord"},
                "departureTime": departure_time.isoformat(),
                "delayMinutes": 25
            }
        ]
    }

    # Saved route with alert_muted = True
    saved_route = SavedRoute(
        id="saved-muted-trip-01",
        user_id="user-muted-test",
        origin_name="Brașov",
        destination_name="București Nord",
        plan_data=json.dumps(plan_data),
        alert_muted=True,
        alert_lead_minutes=10,
        created_at=now
    )
    db_session.add(saved_route)
    await db_session.commit()

    stats = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=now)
    assert stats["sent"] == 0
    assert len(email_service.get_outbox()) == 0
    assert stats.get("skipped_muted", 0) >= 1


@pytest.mark.asyncio
async def test_scheduler_lead_time_filtering(db_session: AsyncSession):
    """
    Scheduler behavior:
    When alert_muted=False and alert_lead_minutes=10:
    - Departure reminder does NOT fire at 45 min before departure.
    - Departure reminder DOES fire at 8 min before departure.
    """
    email_service.clear_outbox()
    await clear_dedup_cache()

    base_time = datetime(2026, 7, 20, 8, 0, 0, tzinfo=timezone.utc)
    departure_time = base_time + timedelta(minutes=45)

    user = User(
        id="user-lead-time-test",
        email="lead.traveler@beeline.io",
        full_name="Lead Traveler",
        is_guest=False,
        is_active=True,
        account_status="ACTIVE",
        preferences=json.dumps({"email_notifications": True})
    )
    db_session.add(user)

    plan_data = {
        "summary": "IR 1572 • Galați → București Nord",
        "departureTime": departure_time.isoformat(),
        "legs": [
            {
                "trainNumber": "IR 1572",
                "origin": {"name": "Galați"},
                "destination": {"name": "București Nord"},
                "departureTime": departure_time.isoformat()
            }
        ]
    }

    saved_route = SavedRoute(
        id="saved-lead-trip-01",
        user_id="user-lead-time-test",
        origin_name="Galați",
        destination_name="București Nord",
        plan_data=json.dumps(plan_data),
        alert_muted=False,
        alert_lead_minutes=10,
        created_at=base_time
    )
    db_session.add(saved_route)
    await db_session.commit()

    # Phase 1: Check at 45 min before departure -> 0 emails dispatched
    stats_early = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=base_time)
    assert stats_early["sent"] == 0
    assert len(email_service.get_outbox()) == 0

    # Phase 2: Advance time so departure is now 8 min away (now = departure_time - 8 min)
    now_8min = departure_time - timedelta(minutes=8)
    stats_due = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=now_8min)
    assert stats_due["sent"] == 1
    assert len(email_service.get_outbox()) == 1

    last_email = email_service.get_last_email_for("lead.traveler@beeline.io")
    assert last_email is not None
    assert "IR 1572" in last_email.subject
    assert "pleacă în 8 min" in last_email.subject or "departs in" in last_email.subject


@pytest.mark.asyncio
async def test_scheduler_live_delay_auto_dispatch(db_session: AsyncSession):
    """
    Scheduler behavior:
    When alert_muted=False and train has live delay >= 10 min:
    - Live delay alert email is dispatched automatically.
    - Dedup prevents duplicate dispatches on subsequent runs.
    """
    email_service.clear_outbox()
    await clear_dedup_cache()

    now = datetime(2026, 8, 10, 14, 0, 0, tzinfo=timezone.utc)
    # Departure is 50 min away (so departure reminder with lead=10 will NOT trigger)
    departure_time = now + timedelta(minutes=50)

    user = User(
        id="user-delay-auto-test",
        email="delay.traveler@beeline.io",
        full_name="Delay Traveler",
        is_guest=False,
        is_active=True,
        account_status="ACTIVE",
        preferences=json.dumps({"email_notifications": True})
    )
    db_session.add(user)

    st_bct = Station(code="BCT", name="București Nord", city="București", latitude=44.447, longitude=26.075)
    st_bsv = Station(code="BSV", name="Brașov", city="Brașov", latitude=45.664, longitude=25.617)
    db_session.add(st_bct)
    db_session.add(st_bsv)

    # Train in DB with 20 min live delay
    db_train = Train(
        id="train-delay-test-20m",
        train_number="IR 1635",
        operator_name="CFR Călători",
        operator_code="CFR",
        origin_code="BCT",
        destination_code="BSV",
        departure_time=departure_time,
        arrival_time=departure_time + timedelta(hours=2, minutes=30),
        duration_minutes=150,
        status="DELAYED",
        delay_minutes=20,
        base_price_lei=70.0,
        available_seats=80,
        amenities="[]"
    )
    db_session.add(db_train)

    plan_data = {
        "summary": "IR 1635 • București Nord → Brașov",
        "departureTime": departure_time.isoformat(),
        "legs": [
            {
                "trainNumber": "IR 1635",
                "origin": {"name": "București Nord"},
                "destination": {"name": "Brașov"},
                "departureTime": departure_time.isoformat()
            }
        ]
    }

    saved_route = SavedRoute(
        id="saved-delay-trip-01",
        user_id="user-delay-auto-test",
        origin_name="București Nord",
        destination_name="Brașov",
        plan_data=json.dumps(plan_data),
        alert_muted=False,
        alert_lead_minutes=10,
        created_at=now
    )
    db_session.add(saved_route)
    await db_session.commit()

    # Run 1: Delay >= 10 min triggers delay alert email
    stats_1 = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=now)
    assert stats_1["sent"] == 1
    assert len(email_service.get_outbox()) == 1

    last_email = email_service.get_last_email_for("delay.traveler@beeline.io")
    assert last_email is not None
    assert "IR 1635" in last_email.subject
    assert "20 min" in last_email.subject or "20" in last_email.html_body

    # Run 2: Exact same scan should deduplicate delay email -> 0 sent
    stats_2 = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=now)
    assert stats_2["sent"] == 0
    assert stats_2["skipped_duplicate"] >= 1
