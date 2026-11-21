from datetime import datetime, timedelta, timezone
import json
import re
import pytest
import fakeredis.aioredis
from httpx import AsyncClient
import pyotp
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import set_custom_session_maker
from app.core.rate_limit import auth_rate_limiter
from app.core.redis import close_redis_pool, set_custom_redis_client
from app.core.security import decrypt_auth_token
from app.services.account_lifecycle_service import AccountLifecycleService
from app.services.auth_service import AuthService
from app.services.email_service import email_service
import pytest_asyncio
from tests.conftest import TestAsyncSessionLocal, verify_user_for_test


@pytest_asyncio.fixture(autouse=True)
async def setup_test_harness():
    """Sets up FakeRedis, test session maker, rate limiter reset, and clean email outbox for each test."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)
    set_custom_session_maker(TestAsyncSessionLocal)
    email_service.clear_outbox()
    await auth_rate_limiter.reset()

    yield fake_client

    await auth_rate_limiter.reset()
    email_service.clear_outbox()
    set_custom_session_maker(None)
    set_custom_redis_client(None)
    await close_redis_pool()


@pytest.mark.asyncio
async def test_complete_user_security_and_deletion_lifecycle(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Step 5 Unified End-to-End User Lifecycle Integration Test:
    Verifies the complete journey through Steps 1 -> 2 -> 3 -> 4:
    1. POST /signup -> HttpOnly cookies, 1-day session, 3 recovery codes (BEE-XXXX-XXXX).
    2. PATCH /users/me & /users/me/preferences -> profile & travel preferences update.
    3. POST /mfa/setup & /mfa/verify -> RFC 6238 2FA, deep links, Fernet encrypted DB secret.
    4. POST /logout -> Redis session revocation & cookie invalidation.
    5. 2-Step Login with remember_me=True (/login -> /mfa/challenge) -> 30-day session cookies.
    6. Anti-Hijack Defense -> Stolen token from different User-Agent triggers 401 & revokes session.
    7. Lost-Phone Recovery Login -> Consumes 1 recovery code, decrements count to 2.
    8. 30-Day Deletion Freeze & Unfreeze -> DELETE /users/me freezes account, login triggers 403,
       POST /unfreeze restores ACTIVE status.
    9. Final Sweep to Hard Delete -> Day 15 reminder warning, Day 30 final notice & cascade hard delete.
    """
    base_headers = {
        "User-Agent": "VoyagerMac/1.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Test-Rate-Limit-Bypass": "true",
    }
    user_email = "e2e.lifecycle@beeline.io"
    user_password = "SecurePassword123!"

    # =========================================================================
    # PHASE 1: SIGNUP & INITIAL SESSION (Step 1 & Step 2)
    # =========================================================================
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": user_email,
            "username": "e2e_voyager",
            "password": user_password,
            "full_name": "E2E Voyager",
            "remember_me": False,
            "device_info": "MacBook Pro M2",
        },
        headers=base_headers,
    )
    assert signup_res.status_code == 201
    assert signup_res.json().get("verification_required") is True

    # Verify email to activate account and receive recovery codes
    verify_data = await verify_user_for_test(
        client,
        user_email,
        remember_me=False,
        device_info="MacBook Pro M2",
        headers=base_headers,
    )
    user_id = verify_data["user"]["id"]
    token_step1 = verify_data["access_token"]

    # 1.1 Verify encrypted HttpOnly session cookies
    assert "beeline_auth_token" in client.cookies
    assert "beeline_device_proof" in client.cookies
    cookie_token_1 = client.cookies["beeline_auth_token"]
    cookie_proof_1 = client.cookies["beeline_device_proof"]

    # Verify 1-day (24h) token TTL
    payload_step1 = decrypt_auth_token(cookie_token_1)
    session_id_1 = payload_step1["sid"]
    ttl_1day = payload_step1["exp"] - payload_step1["iat"]
    assert 86300 <= ttl_1day <= 86500

    # 1.2 Verify exactly 3 obfuscated recovery codes (BEE-XXXX-XXXX)
    recovery_codes = verify_data.get("recovery_codes")
    assert recovery_codes is not None
    assert len(recovery_codes) == 3
    code_pattern = re.compile(r"^BEE-[A-Z0-9]{4}-[A-Z0-9]{4}$")
    for code in recovery_codes:
        assert code_pattern.match(code), f"Code {code} does not match format BEE-XXXX-XXXX"

    # 1.3 Verify DB stores only salted hashes (never plaintext)
    db_mfa_row = (await db_session.execute(
        text("SELECT backup_codes_hash, backup_codes FROM mfa_credentials WHERE user_id = :uid"),
        {"uid": user_id}
    )).fetchone()
    assert db_mfa_row is not None
    for code in recovery_codes:
        assert code not in db_mfa_row[0], f"Plaintext code {code} leaked in backup_codes_hash!"
        if db_mfa_row[1]:
            assert code not in db_mfa_row[1], f"Plaintext code {code} leaked in backup_codes!"
    assert "$" in db_mfa_row[0]  # Salt delimiter

    auth_headers = dict(base_headers)
    auth_headers["Authorization"] = f"Bearer {token_step1}"

    # =========================================================================
    # PHASE 2: PROFILE & PREFERENCES SELF-SERVICE (Step 4)
    # =========================================================================
    # 2.1 Update profile details
    patch_user_res = await client.patch(
        "/api/v1/users/me",
        json={
            "full_name": "E2E Voyager Updated",
            "phone_number": "+40722334455",
            "avatar_url": "https://beeline.voyagerail.com/avatars/voyager.png",
        },
        headers=auth_headers,
    )
    assert patch_user_res.status_code == 200
    user_profile = patch_user_res.json()
    assert user_profile["full_name"] == "E2E Voyager Updated"
    assert user_profile["phone_number"] == "+40722334455"
    assert user_profile["account_status"] == "ACTIVE"

    # 2.2 Update travel preferences
    patch_pref_res = await client.patch(
        "/api/v1/users/me/preferences",
        json={
            "default_pillar": "safe",
            "home_station_code": "GLT",
            "min_transfer_buffer_minutes": 25,
            "theme": "cozy_hive",
        },
        headers=auth_headers,
    )
    assert patch_pref_res.status_code == 200
    pref_data = patch_pref_res.json()
    assert pref_data["default_pillar"] == "safe"
    assert pref_data["home_station_code"] == "GLT"
    assert pref_data["min_transfer_buffer_minutes"] == 25

    # =========================================================================
    # PHASE 3: TWO-FACTOR AUTHENTICATION ENROLLMENT (Step 3)
    # =========================================================================
    # 3.1 Setup MFA
    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=auth_headers)
    assert setup_res.status_code == 200
    setup_data = setup_res.json()
    totp_secret = setup_data["secret"]
    assert setup_data["otpauth_uri"].startswith("otpauth://totp/Beeline:")
    assert setup_data["apple_passwords_uri"].startswith("apple-otpauth://totp/Beeline:")
    assert setup_data["qr_code_svg"].startswith("data:image/svg+xml;base64,")

    # Verify Fernet encryption of secret in database
    db_secret_row = (await db_session.execute(
        text("SELECT secret_key FROM mfa_credentials WHERE user_id = :uid"),
        {"uid": user_id}
    )).fetchone()
    assert db_secret_row[0] != totp_secret
    assert db_secret_row[0].startswith("gAAAAA")

    # 3.2 Verify MFA setup with valid RFC 6238 TOTP code
    totp_engine = pyotp.TOTP(totp_secret)
    totp_code = totp_engine.now()
    verify_res = await client.post(
        "/api/v1/auth/mfa/verify",
        json={"code": totp_code},
        headers=auth_headers,
    )
    assert verify_res.status_code == 200
    assert "Multi-Factor Authentication enabled successfully" in verify_res.json()["message"]

    # Verify MFA status endpoint confirms active 2FA
    status_res = await client.get("/api/v1/auth/mfa/status", headers=auth_headers)
    assert status_res.status_code == 200
    assert status_res.json()["mfa_enabled"] is True
    assert status_res.json()["is_confirmed"] is True

    # =========================================================================
    # PHASE 4: LOGOUT & INSTANT REDIS REVOCATION (Step 1)
    # =========================================================================
    logout_res = await client.post("/api/v1/auth/logout", headers=auth_headers)
    assert logout_res.status_code == 200

    # Verify session is revoked instantly in Redis (<0.5ms)
    assert await AuthService.is_session_revoked_redis(session_id_1) is True

    # Accessing protected resource with revoked cookie credentials returns 401
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", cookie_token_1)
    client.cookies.set("beeline_device_proof", cookie_proof_1)
    blocked_res = await client.get("/api/v1/users/me", headers=base_headers)
    assert blocked_res.status_code == 401

    # Refresh token associated with revoked session is also rejected
    blocked_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": verify_data["refresh_token"]},
        headers=base_headers,
    )
    assert blocked_refresh.status_code == 401

    # =========================================================================
    # PHASE 5: 2-STEP LOGIN WITH REMEMBER_ME=TRUE (Step 1 & Step 3)
    # =========================================================================
    client.cookies.clear()
    login_step1_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": user_email,
            "password": user_password,
            "remember_me": True,
            "device_info": "MacBook Pro M2",
        },
        headers=base_headers,
    )
    assert login_step1_res.status_code == 200
    login_step1_data = login_step1_res.json()
    assert login_step1_data.get("mfa_required") is True
    mfa_challenge_token = login_step1_data["mfa_session_token"]

    # Complete MFA challenge
    totp_challenge_code = totp_engine.now()
    challenge_res = await client.post(
        "/api/v1/auth/mfa/challenge",
        json={
            "mfa_session_token": mfa_challenge_token,
            "code": totp_challenge_code,
        },
        headers=base_headers,
    )
    assert challenge_res.status_code == 200
    challenge_data = challenge_res.json()
    token_step5 = challenge_data["access_token"]
    assert "beeline_auth_token" in challenge_res.cookies
    assert "beeline_device_proof" in challenge_res.cookies

    cookie_token_30d = challenge_res.cookies["beeline_auth_token"]
    cookie_proof_30d = challenge_res.cookies["beeline_device_proof"]

    # Verify 30-day session TTL (~2,592,000s)
    payload_30d = decrypt_auth_token(cookie_token_30d)
    session_id_30d = payload_30d["sid"]
    ttl_30d = payload_30d["exp"] - payload_30d["iat"]
    assert 2591000 <= ttl_30d <= 2593000

    # =========================================================================
    # PHASE 6: ANTI-HIJACK DEFENSE & SESSION REVOCATION (Step 1)
    # =========================================================================
    # Adversary steals beeline_auth_token cookie and replays from different User-Agent
    adversary_headers = {
        "User-Agent": "AttackerKaliLinux/6.6 (X11; Linux x86_64)",
        "Accept-Language": "ru-RU,ru;q=0.9",
        "X-Test-Rate-Limit-Bypass": "true",
    }
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", cookie_token_30d)
    # Missing or forged proof
    hijack_res = await client.get("/api/v1/users/me", headers=adversary_headers)
    assert hijack_res.status_code == 401
    assert "Device context mismatch" in hijack_res.json()["error"]["message"] or "revoked" in hijack_res.json()["error"]["message"].lower()

    # Verify session was revoked permanently upon tamper attempt
    assert await AuthService.is_session_revoked_redis(session_id_30d) is True

    # Legitimate user is also safely logged out
    client.cookies.set("beeline_device_proof", cookie_proof_30d)
    assert (await client.get("/api/v1/users/me", headers=base_headers)).status_code == 401

    # =========================================================================
    # PHASE 7: LOST-PHONE RECOVERY LOGIN (Step 2)
    # =========================================================================
    code_to_consume = recovery_codes[0]
    client.cookies.clear()
    recovery_res = await client.post(
        "/api/v1/auth/recovery-login",
        json={
            "email": user_email,
            "recovery_code": code_to_consume,
            "device_info": "iPhone 15 Pro Recovery",
        },
        headers={
            "User-Agent": "RecoveryDevice/1.0",
            "Accept-Language": "en-US",
            "X-Test-Rate-Limit-Bypass": "true",
        },
    )
    assert recovery_res.status_code == 200
    rec_data = recovery_res.json()
    recovery_access_token = rec_data["access_token"]
    assert "beeline_auth_token" in recovery_res.cookies

    # Verify remaining recovery codes decremented from 3 to 2 in DB
    db_rem_codes = (await db_session.execute(
        text("SELECT backup_codes_hash FROM mfa_credentials WHERE user_id = :uid"),
        {"uid": user_id}
    )).fetchone()
    remaining_hashes = json.loads(db_rem_codes[0])
    assert len(remaining_hashes) == 2

    # Re-using the same consumed recovery code is rejected
    reuse_res = await client.post(
        "/api/v1/auth/recovery-login",
        json={
            "email": user_email,
            "recovery_code": code_to_consume,
        },
        headers={"X-Test-Rate-Limit-Bypass": "true"},
    )
    assert reuse_res.status_code == 401

    # =========================================================================
    # PHASE 8: 30-DAY DELETION FREEZE & UNFREEZE FLOW (Step 4)
    # =========================================================================
    del_headers = {
        "Authorization": f"Bearer {recovery_access_token}",
        "User-Agent": "RecoveryDevice/1.0",
        "X-Test-Rate-Limit-Bypass": "true",
    }
    email_service.clear_outbox()

    # 8.1 Request account deletion -> freezes account for 30 days
    totp_for_del = totp_engine.now()
    freeze_res = await client.request(
        "DELETE",
        "/api/v1/users/me",
        json={
            "password": user_password,
            "mfa_code": totp_for_del,
            "reason": "Lifecycle evaluation",
        },
        headers=del_headers,
    )
    assert freeze_res.status_code == 200
    freeze_data = freeze_res.json()
    assert freeze_data["status"] == "FROZEN_PENDING_DELETION"
    assert freeze_data["days_remaining"] == 30

    # Verify 30-Day Notice email dispatched
    email_30d = email_service.get_last_email_for(user_email)
    assert email_30d is not None
    assert email_30d.template_name == "account_frozen_30d"

    # 8.2 Attempting login while frozen triggers 403 unfreeze challenge
    email_service.clear_outbox()
    client.cookies.clear()
    frozen_login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": user_password},
        headers={"X-Test-Rate-Limit-Bypass": "true"},
    )
    assert frozen_login_res.status_code == 403
    fl_json = frozen_login_res.json()
    err_code = fl_json.get("code") or fl_json.get("detail", {}).get("code") or fl_json.get("error", {}).get("code")
    assert err_code == "ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT"

    # Verify unfreeze email dispatched with single-use unfreeze token
    unfreeze_email = email_service.get_last_email_for(user_email)
    assert unfreeze_email is not None
    assert unfreeze_email.template_name == "account_unfreeze_challenge"
    unfreeze_token = unfreeze_email.context["unfreeze_token"]
    assert unfreeze_token is not None

    # 8.3 Unfreeze account via single-use token
    unfreeze_res = await client.post(
        "/api/v1/auth/unfreeze",
        json={"token": unfreeze_token, "remember_me": False},
        headers={"X-Test-Rate-Limit-Bypass": "true"},
    )
    assert unfreeze_res.status_code == 200
    unfreeze_data = unfreeze_res.json()
    restored_token = unfreeze_data["access_token"]
    assert unfreeze_data["user"]["account_status"] == "ACTIVE"

    # Accessing profile is restored
    active_check = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {restored_token}"},
    )
    assert active_check.status_code == 200
    assert active_check.json()["account_status"] == "ACTIVE"

    # =========================================================================
    # PHASE 9: AUTOMATED LIFECYCLE SWEEPS & HARD DELETE CASCADE (Step 4)
    # =========================================================================
    # 9.1 Re-freeze account for simulated lifecycle passage
    del2_res = await client.request(
        "DELETE",
        "/api/v1/users/me",
        json={
            "password": user_password,
            "mfa_code": totp_engine.now(),
            "reason": "Final permanent wipe",
        },
        headers={"Authorization": f"Bearer {restored_token}", "X-Test-Rate-Limit-Bypass": "true"},
    )
    assert del2_res.status_code == 200

    # Retrieve freeze timestamps from database
    db_frozen_user = (await db_session.execute(
        text("SELECT id, frozen_at FROM users WHERE email = :email"),
        {"email": user_email}
    )).fetchone()
    f_user_id = db_frozen_user[0]
    frozen_timestamp = db_frozen_user[1]
    if isinstance(frozen_timestamp, str):
        frozen_timestamp = datetime.fromisoformat(frozen_timestamp)
    if frozen_timestamp.tzinfo is None:
        frozen_timestamp = frozen_timestamp.replace(tzinfo=timezone.utc)

    # 9.2 Simulate Day 16 (14 days remaining <= 15d warning threshold)
    email_service.clear_outbox()
    day16_time = frozen_timestamp + timedelta(days=16)
    sweep_day16 = await AccountLifecycleService.run_lifecycle_sweep(db_session, now=day16_time)
    assert sweep_day16["reminders_sent"] == 1
    assert sweep_day16["accounts_deleted"] == 0

    reminder_15d_email = email_service.get_last_email_for(user_email)
    assert reminder_15d_email is not None
    assert reminder_15d_email.template_name == "account_deletion_reminder_15d"

    # 9.3 Simulate Day 31 (0 days remaining -> permanent hard delete)
    email_service.clear_outbox()
    day31_time = frozen_timestamp + timedelta(days=31)
    sweep_day31 = await AccountLifecycleService.run_lifecycle_sweep(db_session, now=day31_time)
    assert sweep_day31["accounts_deleted"] == 1

    # Verify 0-Day Final Notice email dispatched
    final_email = email_service.get_last_email_for(user_email)
    assert final_email is not None
    assert final_email.template_name == "account_permanently_deleted_0d"

    # Verify Cascade Hard Delete in database: user and sessions completely purged
    user_in_db = (await db_session.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": user_email}
    )).fetchone()
    assert user_in_db is None

    sessions_in_db = (await db_session.execute(
        text("SELECT id FROM user_sessions WHERE user_id = :uid"),
        {"uid": f_user_id}
    )).fetchall()
    assert len(sessions_in_db) == 0


@pytest.mark.asyncio
async def test_global_auth_rate_limit_middleware(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch
):
    """
    Step 5 Global Auth Rate-Limit Middleware Enforcement Test:
    - Verifies sliding-window rate limiting on /api/v1/auth/login.
    - Exceeding the burst threshold triggers 429 Too Many Requests with a valid Retry-After header.
    - Demonstrates X-Test-Rate-Limit-Bypass header successfully bypasses the limiter.
    """
    test_ip = "198.51.100.99"
    test_path = "/api/v1/auth/login"

    # Ensure rate limiter is enabled with a small ceiling for fast deterministic verification
    monkeypatch.setattr(settings, "AUTH_RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "AUTH_RATE_LIMIT_MAX_REQUESTS", 5)
    monkeypatch.setattr(settings, "AUTH_RATE_LIMIT_WINDOW_SECONDS", 60)

    # Reset any existing counts for this client IP and path
    await auth_rate_limiter.reset(client_ip=test_ip, path=test_path)

    rate_limit_headers = {
        "X-Forwarded-For": test_ip,
        "User-Agent": "RateLimitTestRunner/1.0",
    }
    dummy_login_payload = {
        "email": "ratelimit.probe@beeline.io",
        "password": "WrongPassword123!",
    }

    # 1. Send 5 requests (within the allowed burst threshold)
    for i in range(5):
        res = await client.post(test_path, json=dummy_login_payload, headers=rate_limit_headers)
        # Should NOT be rate limited (will return 401 Unauthorized for bad login credentials)
        assert res.status_code == 401, f"Request {i+1} unexpectedly returned {res.status_code}"
        assert "Retry-After" not in res.headers

    # 2. Send 6th request: must trigger 429 Too Many Requests
    blocked_res = await client.post(test_path, json=dummy_login_payload, headers=rate_limit_headers)
    assert blocked_res.status_code == 429

    # Verify Retry-After header and error envelope
    assert "Retry-After" in blocked_res.headers
    retry_after = int(blocked_res.headers["Retry-After"])
    assert retry_after >= 1

    error_data = blocked_res.json()
    assert "error" in error_data
    assert error_data["error"]["code"] == "RATE_LIMITED"
    assert "Too many requests" in error_data["error"]["message"]

    # 3. Request with explicit bypass header succeeds through the limiter
    bypass_headers = dict(rate_limit_headers)
    bypass_headers["X-Test-Rate-Limit-Bypass"] = "true"
    bypassed_res = await client.post(test_path, json=dummy_login_payload, headers=bypass_headers)
    assert bypassed_res.status_code == 401  # Passes through rate limiter to auth handler
