from datetime import datetime, timedelta, timezone
import json
import pytest
import fakeredis.aioredis
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import set_custom_session_maker
from app.core.redis import close_redis_pool, set_custom_redis_client
from app.models.user import User, UserSession, utcnow
from app.services.account_lifecycle_service import AccountLifecycleService
from app.services.email_service import email_service
import pytest_asyncio
from tests.conftest import TestAsyncSessionLocal, signup_and_verify


@pytest_asyncio.fixture(autouse=True)
async def setup_fakeredis():
    """Sets up an isolated FakeRedis client and test session maker for each test."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)
    set_custom_session_maker(TestAsyncSessionLocal)
    email_service.clear_outbox()
    yield fake_client
    set_custom_session_maker(None)
    set_custom_redis_client(None)
    await close_redis_pool()


@pytest.mark.asyncio
async def test_profile_self_service_and_password_change(client: AsyncClient, db_session: AsyncSession):
    """
    Test 1:
    - GET /users/me returns full profile attributes.
    - PATCH /users/me updates full_name, phone_number, avatar_url, preferences.
    - Enforces case-insensitive username and email uniqueness (409 Conflict).
    - POST /users/me/password verifies current password (401), validates new password policy
      and breach detection (400), updates hash, and revokes other active sessions while
      keeping current session active.
    """
    # 1. Register main test user (Device 1)
    headers1 = {
        "User-Agent": "Device1-DesktopChrome",
        "Accept-Language": "en-US",
    }
    signup_data = await signup_and_verify(client, {
        "email": "step4.profile@beeline.io",
        "username": "step4_traveler",
        "password": "SecurePassword123!",
        "full_name": "Initial Profile Name"
    }, headers=headers1)
    token1 = signup_data["access_token"]
    auth_1 = client.cookies.get("beeline_auth_token")
    proof_1 = client.cookies.get("beeline_device_proof")
    headers1["Authorization"] = f"Bearer {token1}"

    # 2. GET /users/me returns full profile details
    me_res = await client.get("/api/v1/users/me", headers=headers1)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["email"] == "step4.profile@beeline.io"
    assert profile["username"] == "step4_traveler"
    assert profile["full_name"] == "Initial Profile Name"
    assert profile["role"] == "TRAVELER"
    assert profile["is_guest"] is False
    assert profile["is_active"] is True
    assert profile["account_status"] == "ACTIVE"
    assert "id" in profile
    assert "created_at" in profile

    # 3. PATCH /users/me updates profile details
    patch_res = await client.patch("/api/v1/users/me", json={
        "full_name": "Updated Bee Traveler",
        "phone_number": "+40712345678",
        "avatar_url": "https://beeline.voyagerail.com/avatars/bee.png"
    }, headers=headers1)
    assert patch_res.status_code == 200
    patched = patch_res.json()
    assert patched["full_name"] == "Updated Bee Traveler"
    assert patched["phone_number"] == "+40712345678"
    assert patched["avatar_url"] == "https://beeline.voyagerail.com/avatars/bee.png"

    # 4. Register second user to test conflict guards
    client.cookies.clear()
    signup2 = await client.post("/api/v1/auth/signup", json={
        "email": "step4.other@beeline.io",
        "username": "other_traveler",
        "password": "SecurePassword123!",
        "full_name": "Other Traveler"
    })
    assert signup2.status_code == 201

    # Restore Device 1 session cookies
    client.cookies.clear()
    if auth_1:
        client.cookies.set("beeline_auth_token", auth_1)
    if proof_1:
        client.cookies.set("beeline_device_proof", proof_1)

    # 5. Attempt duplicate username (case-insensitive) -> 409 Conflict
    dup_user_res = await client.patch("/api/v1/users/me", json={
        "username": "OTHER_TRAVELER"
    }, headers=headers1)
    assert dup_user_res.status_code == 409
    assert "Username is already taken" in str(dup_user_res.json())

    # 6. Attempt duplicate email (case-insensitive) -> 409 Conflict
    dup_email_res = await client.patch("/api/v1/users/me", json={
        "email": "STEP4.OTHER@beeline.io"
    }, headers=headers1)
    assert dup_email_res.status_code == 409
    assert "Email is already in use" in str(dup_email_res.json())

    # 7. Establish a second session for the first user (simulate phone device / Device 2)
    headers2 = {
        "User-Agent": "Device2-MobileSafari",
        "Accept-Language": "en-US",
    }
    client.cookies.clear()
    login2_res = await client.post("/api/v1/auth/login", json={
        "email": "step4.profile@beeline.io",
        "password": "SecurePassword123!",
        "device_info": "Mobile iOS Client"
    }, headers=headers2)
    assert login2_res.status_code == 200
    auth_2 = login2_res.cookies.get("beeline_auth_token")
    proof_2 = login2_res.cookies.get("beeline_device_proof")
    token2 = login2_res.json()["access_token"]
    headers2["Authorization"] = f"Bearer {token2}"

    # Switch back to Device 1
    client.cookies.clear()
    if auth_1:
        client.cookies.set("beeline_auth_token", auth_1)
    if proof_1:
        client.cookies.set("beeline_device_proof", proof_1)

    # Verify both sessions are currently active
    sess_res = await client.get("/api/v1/users/me/sessions", headers=headers1)
    assert sess_res.status_code == 200
    sessions_list = sess_res.json()
    assert len(sessions_list) >= 2

    # 8. Password change security guards:
    # 8a. Wrong current password -> 401
    pw_wrong = await client.post("/api/v1/users/me/password", json={
        "current_password": "WrongPassword123!",
        "new_password": "NewSecretPassword2026!"
    }, headers=headers1)
    assert pw_wrong.status_code == 401
    assert "Incorrect current password" in str(pw_wrong.json())

    # 8b. Weak password -> 400
    pw_weak = await client.post("/api/v1/users/me/password", json={
        "current_password": "SecurePassword123!",
        "new_password": "12345678"
    }, headers=headers1)
    assert pw_weak.status_code == 400

    # 8c. Breached password -> 400
    pw_breached = await client.post("/api/v1/users/me/password", json={
        "current_password": "SecurePassword123!",
        "new_password": "password123"
    }, headers=headers1)
    assert pw_breached.status_code == 400
    assert "breach" in str(pw_breached.json()).lower()

    # 8d. Successful password change from Device 1
    email_service.clear_outbox()
    pw_success = await client.post("/api/v1/users/me/password", json={
        "current_password": "SecurePassword123!",
        "new_password": "NewSecretPassword2026!"
    }, headers=headers1)
    assert pw_success.status_code == 200
    assert "Password changed successfully" in pw_success.json()["message"]

    # Verify security alert email was dispatched
    last_email = email_service.get_last_email_for("step4.profile@beeline.io")
    assert last_email is not None
    assert last_email.template_name == "password_changed"

    # Current session (Device 1) remains active
    check_curr = await client.get("/api/v1/users/me", headers=headers1)
    assert check_curr.status_code == 200

    # The other session (Device 2) was revoked
    client.cookies.clear()
    if auth_2:
        client.cookies.set("beeline_auth_token", auth_2)
    if proof_2:
        client.cookies.set("beeline_device_proof", proof_2)
    check_other = await client.get("/api/v1/users/me", headers=headers2)
    assert check_other.status_code == 401


@pytest.mark.asyncio
async def test_travel_preferences_schema_and_partial_updates(client: AsyncClient):
    """
    Test 2:
    - GET /users/me/preferences returns defaults:
      default_pillar='safe', home_station_code='GLT', min_transfer_buffer_minutes=15, theme='cozy_hive'.
    - PATCH /users/me/preferences validates domain constraints:
      min_transfer_buffer_minutes between 5 and 120, allowed pillar values.
    - Partial updates merge cleanly onto existing preferences.
    """
    signup_data = await signup_and_verify(client, {
        "email": "step4.prefs@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Preferences Traveler"
    })
    headers = {"Authorization": f"Bearer {signup_data['access_token']}"}

    # 1. GET default preferences
    pref_res = await client.get("/api/v1/users/me/preferences", headers=headers)
    assert pref_res.status_code == 200
    prefs = pref_res.json()
    assert prefs["default_pillar"] == "safe"
    assert prefs["home_station_code"] == "GLT"
    assert prefs["min_transfer_buffer_minutes"] == 15
    assert prefs["preferred_operators"] == []
    assert prefs["email_security_alerts"] is True
    assert prefs["email_delay_alerts"] is True
    assert prefs["theme"] == "cozy_hive"

    # 2. Validation failures: buffer out of bounds (> 120)
    invalid_buffer = await client.patch("/api/v1/users/me/preferences", json={
        "min_transfer_buffer_minutes": 250
    }, headers=headers)
    assert invalid_buffer.status_code == 422

    # Validation failures: buffer out of bounds (< 5)
    invalid_low_buffer = await client.patch("/api/v1/users/me/preferences", json={
        "min_transfer_buffer_minutes": 2
    }, headers=headers)
    assert invalid_low_buffer.status_code == 422

    # Validation failures: unknown pillar
    invalid_pillar = await client.patch("/api/v1/users/me/preferences", json={
        "default_pillar": "ultra_speed"
    }, headers=headers)
    assert invalid_pillar.status_code == 422

    # 3. Partial update: change default_pillar and operators
    patch1 = await client.patch("/api/v1/users/me/preferences", json={
        "default_pillar": "fast",
        "preferred_operators": ["CFR Călători", "Transferoviar Călători"]
    }, headers=headers)
    assert patch1.status_code == 200
    p1 = patch1.json()
    assert p1["default_pillar"] == "fast"
    assert p1["preferred_operators"] == ["CFR Călători", "Transferoviar Călători"]
    assert p1["home_station_code"] == "GLT"
    assert p1["min_transfer_buffer_minutes"] == 15

    # 4. Second partial update: update buffer and theme
    patch2 = await client.patch("/api/v1/users/me/preferences", json={
        "min_transfer_buffer_minutes": 30,
        "theme": "high_contrast"
    }, headers=headers)
    assert patch2.status_code == 200
    p2 = patch2.json()
    assert p2["default_pillar"] == "fast"
    assert p2["min_transfer_buffer_minutes"] == 30
    assert p2["theme"] == "high_contrast"
    assert p2["preferred_operators"] == ["CFR Călători", "Transferoviar Călători"]

    # 5. Persisted state confirmed via GET
    get_again = await client.get("/api/v1/users/me/preferences", headers=headers)
    assert get_again.status_code == 200
    assert get_again.json() == p2


@pytest.mark.asyncio
async def test_account_deletion_freeze_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """
    Test 3:
    - DELETE /users/me freezes account: account_status='FROZEN_PENDING_DELETION', is_active=False,
      frozen_at=now, deletion_scheduled_at=+30 days.
    - Revokes active sessions in Redis & PostgreSQL and clears auth cookies.
    - Dispatches 30-Day Notice email.
    - Protected endpoints reject frozen user with 401.
    """
    signup_data = await signup_and_verify(client, {
        "email": "step4.freeze@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Freeze Traveler"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong password reject when provided
    wrong_pw = await client.request(
        "DELETE", "/api/v1/users/me",
        json={"password": "WrongPassword123!"},
        headers=headers
    )
    assert wrong_pw.status_code == 401

    email_service.clear_outbox()

    # Freeze account
    freeze_res = await client.request(
        "DELETE", "/api/v1/users/me",
        json={"password": "SecurePassword123!", "reason": "Testing freeze lifecycle"},
        headers=headers
    )
    assert freeze_res.status_code == 200
    data = freeze_res.json()
    assert data["status"] == "FROZEN_PENDING_DELETION"
    assert data["days_remaining"] == 30
    assert data["deletion_scheduled_at"] is not None
    assert "deleted successfully" in data["message"]

    # Verify SQL database state
    db_usr = (await db_session.execute(
        text("SELECT account_status, is_active, frozen_at, deletion_scheduled_at, deletion_reminder_15d_sent "
             "FROM users WHERE email = 'step4.freeze@beeline.io'")
    )).fetchone()
    assert db_usr is not None
    assert db_usr[0] == "FROZEN_PENDING_DELETION"
    assert db_usr[1] is False or db_usr[1] == 0
    assert db_usr[2] is not None
    assert db_usr[3] is not None
    assert bool(db_usr[4]) is False

    # Verify session revoked in database
    db_sess = (await db_session.execute(
        text("SELECT is_revoked FROM user_sessions WHERE user_id = "
             "(SELECT id FROM users WHERE email = 'step4.freeze@beeline.io')")
    )).fetchall()
    for s in db_sess:
        assert s[0] is True or s[0] == 1

    # Verify 30-Day notice email was dispatched
    last_email = email_service.get_last_email_for("step4.freeze@beeline.io")
    assert last_email is not None
    assert last_email.template_name == "account_frozen_30d"
    assert "30 Days Remaining" in last_email.subject

    # Accessing authenticated endpoint now rejected
    blocked = await client.get("/api/v1/users/me", headers=headers)
    assert blocked.status_code == 401


@pytest.mark.asyncio
async def test_frozen_login_challenge_and_unfreeze_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test 4:
    - Attempting login while frozen rejects with 403 (ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT).
    - Dispatches Unfreeze Confirmation Email containing single-use unfreeze_token.
    - POST /auth/unfreeze restores account to ACTIVE, dispatches Account Restored email,
      and returns valid session token and cookies.
    """
    # 1. Register and freeze account
    signup_data = await signup_and_verify(client, {
        "email": "step4.unfreeze@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Unfreeze Traveler"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.request("DELETE", "/api/v1/users/me", json={"password": "SecurePassword123!"}, headers=headers)

    email_service.clear_outbox()

    # 2. Login with wrong password while frozen -> 401 Unauthorized (no unfreeze email)
    bad_login = await client.post("/api/v1/auth/login", json={
        "email": "step4.unfreeze@beeline.io",
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401
    assert email_service.get_last_email_for("step4.unfreeze@beeline.io") is None

    # 3. Login with correct password while frozen -> 403 Forbidden with unfreeze challenge
    frozen_login = await client.post("/api/v1/auth/login", json={
        "email": "step4.unfreeze@beeline.io",
        "password": "SecurePassword123!"
    })
    assert frozen_login.status_code == 403
    f_data = frozen_login.json()
    err_code = f_data.get("code") or f_data.get("detail", {}).get("code") or f_data.get("error", {}).get("code")
    assert err_code == "ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT"

    # 4. Verify unfreeze challenge email was dispatched
    unfreeze_email = email_service.get_last_email_for("step4.unfreeze@beeline.io")
    assert unfreeze_email is not None
    assert unfreeze_email.template_name == "account_unfreeze_challenge"
    unfreeze_token = unfreeze_email.context["unfreeze_token"]
    assert unfreeze_token is not None

    # 5. Invalid token rejected
    bad_unfreeze = await client.post("/api/v1/auth/unfreeze", json={"token": "completely_fake_token"})
    assert bad_unfreeze.status_code == 400

    # 6. Valid token restores account
    unfreeze_res = await client.post("/api/v1/auth/unfreeze", json={
        "token": unfreeze_token,
        "remember_me": True
    })
    assert unfreeze_res.status_code == 200
    token_resp = unfreeze_res.json()
    assert "access_token" in token_resp
    new_token = token_resp["access_token"]
    assert token_resp["user"]["account_status"] == "ACTIVE"

    # Verify SQL state is restored
    db_usr = (await db_session.execute(
        text("SELECT account_status, is_active, frozen_at, deletion_scheduled_at "
             "FROM users WHERE email = 'step4.unfreeze@beeline.io'")
    )).fetchone()
    assert db_usr[0] == "ACTIVE"
    assert db_usr[1] is True or db_usr[1] == 1
    assert db_usr[2] is None
    assert db_usr[3] is None

    # Verify account restored email was sent
    restored_email = email_service.get_last_email_for("step4.unfreeze@beeline.io")
    assert restored_email is not None
    assert restored_email.template_name == "account_unfrozen_confirmed"

    # User can now access protected profile
    me_check = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me_check.status_code == 200
    assert me_check.json()["account_status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_automated_lifecycle_sweep_30_15_0_days(client: AsyncClient, db_session: AsyncSession):
    """
    Test 5:
    - 30 -> 15 -> 0 Days Automated Lifecycle Sweep:
      - Day 0 to 14: no reminder sent.
      - Day 15 (+15 days advanced, <= 15 days remaining): dispatches 15-Day Reminder Warning once.
      - Repeated sweep before expiration: does not re-send 15-day reminder.
      - Day 30 (+30 days advanced, 0 days remaining): dispatches 0-Day Final Notice and executes
        CASCADE HARD DELETE removing user and all related records from PostgreSQL!
    """
    # 1. Register and freeze user
    signup_data = await signup_and_verify(client, {
        "email": "step4.lifecycle@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Lifecycle Traveler"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.request("DELETE", "/api/v1/users/me", json={"password": "SecurePassword123!"}, headers=headers)

    email_service.clear_outbox()

    # Read freeze dates from DB
    db_res = (await db_session.execute(
        text("SELECT id, frozen_at, deletion_scheduled_at FROM users WHERE email = 'step4.lifecycle@beeline.io'")
    )).fetchone()
    user_id = db_res[0]
    frozen_at = db_res[1]
    if isinstance(frozen_at, str):
        frozen_at = datetime.fromisoformat(frozen_at)
    if frozen_at.tzinfo is None:
        frozen_at = frozen_at.replace(tzinfo=timezone.utc)

    # 2. Simulate Day 10 (20 days remaining)
    now_day10 = frozen_at + timedelta(days=10)
    sweep_day10 = await AccountLifecycleService.run_lifecycle_sweep(db_session, now=now_day10)
    assert sweep_day10["reminders_sent"] == 0
    assert sweep_day10["accounts_deleted"] == 0
    assert email_service.get_last_email_for("step4.lifecycle@beeline.io") is None

    # 3. Simulate Day 16 (14 days remaining, <= 15 days threshold)
    now_day16 = frozen_at + timedelta(days=16)
    sweep_day16 = await AccountLifecycleService.run_lifecycle_sweep(db_session, now=now_day16)
    assert sweep_day16["reminders_sent"] == 1
    assert sweep_day16["accounts_deleted"] == 0

    reminder_email = email_service.get_last_email_for("step4.lifecycle@beeline.io")
    assert reminder_email is not None
    assert reminder_email.template_name == "account_deletion_reminder_15d"
    assert "14 Days Remaining" in reminder_email.subject or "Days Remaining" in reminder_email.subject

    # 4. Repeated sweep on Day 20 does NOT duplicate 15-day reminder
    now_day20 = frozen_at + timedelta(days=20)
    email_service.clear_outbox()
    sweep_day20 = await AccountLifecycleService.run_lifecycle_sweep(db_session, now=now_day20)
    assert sweep_day20["reminders_sent"] == 0
    assert sweep_day20["accounts_deleted"] == 0
    assert email_service.get_last_email_for("step4.lifecycle@beeline.io") is None

    # 5. Simulate Day 31 (+31 days, scheduled deletion elapsed)
    now_day31 = frozen_at + timedelta(days=31)
    sweep_day31 = await AccountLifecycleService.run_lifecycle_sweep(db_session, now=now_day31)
    assert sweep_day31["accounts_deleted"] == 1

    # Verify 0-Day Final Notice email was dispatched
    final_email = email_service.get_last_email_for("step4.lifecycle@beeline.io")
    assert final_email is not None
    assert final_email.template_name == "account_permanently_deleted_0d"
    assert "Account Permanently Deleted" in final_email.subject

    # 6. Verify Cascade Hard Delete in database
    db_check = (await db_session.execute(
        text("SELECT id FROM users WHERE email = 'step4.lifecycle@beeline.io'")
    )).fetchone()
    assert db_check is None

    # Verify sessions are purged
    sess_check = (await db_session.execute(
        text("SELECT id FROM user_sessions WHERE user_id = :uid"), {"uid": user_id}
    )).fetchall()
    assert len(sess_check) == 0
