from datetime import datetime, timedelta, timezone
import json
import pytest
import fakeredis.aioredis
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis, set_custom_redis_client, close_redis_pool
from app.core.security import (
    compute_device_fingerprint,
    compute_device_proof,
    decrypt_auth_token,
    encrypt_auth_token,
)
from app.models.user import User, UserSession


import pytest_asyncio
from tests.conftest import TestAsyncSessionLocal, verify_user_for_test
from app.core.database import set_custom_session_maker

@pytest_asyncio.fixture(autouse=True)
async def setup_fakeredis():
    """Sets up an isolated FakeRedis client and test session maker for each test."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)
    set_custom_session_maker(TestAsyncSessionLocal)
    yield fake_client
    set_custom_session_maker(None)
    set_custom_redis_client(None)
    await close_redis_pool()


@pytest.mark.asyncio
async def test_login_standard_1day_session_and_cookies(client: AsyncClient, db_session: AsyncSession):
    """
    Test 1: Login with remember_me=False creates a 1-day (24h) session
    and sets encrypted HttpOnly cookies (beeline_auth_token, beeline_device_proof).
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
    }

    # 1. Signup
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "traveler.1day@beeline.io",
            "password": "SecurePassword123!",
            "full_name": "Traveler OneDay",
            "device_info": "MacBook Chrome",
            "remember_me": False,
        },
        headers=headers,
    )
    assert signup_res.status_code == 201
    await verify_user_for_test(client, "traveler.1day@beeline.io")

    # 2. Login with remember_me=False
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "traveler.1day@beeline.io",
            "password": "SecurePassword123!",
            "remember_me": False,
            "device_info": "MacBook Chrome",
        },
        headers=headers,
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_data

    # 3. Verify HttpOnly cookies
    assert "beeline_auth_token" in login_res.cookies
    assert "beeline_device_proof" in login_res.cookies

    auth_token = login_res.cookies["beeline_auth_token"]
    device_proof = login_res.cookies["beeline_device_proof"]
    assert auth_token is not None
    assert device_proof is not None

    # Verify Set-Cookie header contains HttpOnly and SameSite=lax
    set_cookie_header = login_res.headers.get("set-cookie", "")
    assert "beeline_auth_token" in set_cookie_header
    assert "HttpOnly" in set_cookie_header or "httponly" in set_cookie_header.lower()

    # 4. Decrypt token and inspect 1-day (24h) expiration
    payload = decrypt_auth_token(auth_token)
    session_id = payload["sid"]
    iat = payload["iat"]
    exp = payload["exp"]
    rot_exp = payload["rot_exp"]

    duration = exp - iat
    # Approximately 24 hours (86,400 seconds +/- 10s)
    assert 86390 <= duration <= 86410
    # 15-minute internal rotation window
    assert rot_exp - iat == 15 * 60

    # 5. Verify database session record
    res = await db_session.execute(select(UserSession).where(UserSession.id == session_id))
    session = res.scalar_one_or_none()
    assert session is not None
    assert session.remember_me is False
    assert session.device_fingerprint is not None


@pytest.mark.asyncio
async def test_login_remember_me_30days_session(client: AsyncClient, db_session: AsyncSession):
    """
    Test 2: Login with remember_me=True creates a 30-day (720h) session.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        "Accept-Language": "ro-RO,ro;q=0.9",
    }

    # 1. Signup
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "traveler.30days@beeline.io",
            "password": "SecurePassword123!",
            "full_name": "Traveler ThirtyDays",
            "device_info": "iPhone Safari",
        },
        headers=headers,
    )
    assert signup_res.status_code == 201
    await verify_user_for_test(client, "traveler.30days@beeline.io")

    # 2. Login with remember_me=True
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "traveler.30days@beeline.io",
            "password": "SecurePassword123!",
            "remember_me": True,
            "device_info": "iPhone Safari",
        },
        headers=headers,
    )
    assert login_res.status_code == 200
    assert "beeline_auth_token" in login_res.cookies

    auth_token = login_res.cookies["beeline_auth_token"]
    payload = decrypt_auth_token(auth_token)
    session_id = payload["sid"]
    iat = payload["iat"]
    exp = payload["exp"]

    duration = exp - iat
    # Exactly 30 days (2,592,000 seconds +/- 10s)
    assert 2591990 <= duration <= 2592010

    # Verify database session record
    res = await db_session.execute(select(UserSession).where(UserSession.id == session_id))
    session = res.scalar_one_or_none()
    assert session is not None
    assert session.remember_me is True


@pytest.mark.asyncio
async def test_beeline_auth_token_fernet_encryption(client: AsyncClient):
    """
    Test 3: Verify beeline_auth_token cookie value is Fernet-encrypted
    (not plaintext/base64-readable JSON, cannot be decoded on jwt.io).
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Accept-Language": "en-US",
    }
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "fernet.tester@beeline.io",
            "password": "SecurePassword123!",
            "full_name": "Fernet Tester",
        },
        headers=headers,
    )
    assert signup_res.status_code == 201
    await verify_user_for_test(client, "fernet.tester@beeline.io")
    auth_token = client.cookies.get("beeline_auth_token")
    assert auth_token is not None
    clean_token = auth_token.strip('"')

    # Fernet tokens start with gAAAAA
    assert clean_token.startswith("gAAAAA")
    # Not a standard JWT with 3 dot-separated base64 parts
    assert clean_token.count(".") != 2

    # Attempting raw JSON parse or naive split must fail
    with pytest.raises(json.JSONDecodeError):
        json.loads(clean_token)

    # Decrypting with security engine reveals verified payload
    payload = decrypt_auth_token(auth_token)
    assert "sub" in payload
    assert "sid" in payload
    assert "dfp" in payload
    assert "rot_exp" in payload
    assert "exp" in payload


@pytest.mark.asyncio
async def test_anti_hijack_device_binding_enforcement(client: AsyncClient, db_session: AsyncSession):
    """
    Test 4: Anti-Hijack Test:
    Attempting to use a stolen beeline_auth_token cookie with a different User-Agent
    or missing beeline_device_proof returns 401 Unauthorized and revokes the session in the backend.
    """
    legit_headers = {
        "User-Agent": "LegitimateBrowser/1.0 (Macintosh; Apple Silicon)",
        "Accept-Language": "en-US",
        "sec-ch-ua": '"LegitBrowser";v="1"',
    }

    # 1. Legit user signup and login
    await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "victim.hijack@beeline.io",
            "password": "SecurePassword123!",
            "full_name": "Victim User",
        },
        headers=legit_headers,
    )
    await verify_user_for_test(client, "victim.hijack@beeline.io")
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "victim.hijack@beeline.io",
            "password": "SecurePassword123!",
        },
        headers=legit_headers,
    )
    assert login_res.status_code == 200
    stolen_auth_token = login_res.cookies["beeline_auth_token"]
    stolen_proof = login_res.cookies["beeline_device_proof"]
    payload = decrypt_auth_token(stolen_auth_token)
    session_id = payload["sid"]

    # 2. Legitimate request with proper cookies and headers succeeds
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", stolen_auth_token)
    client.cookies.set("beeline_device_proof", stolen_proof)
    legit_res = await client.get("/api/v1/users/me", headers=legit_headers)
    assert legit_res.status_code == 200
    assert legit_res.json()["email"] == "victim.hijack@beeline.io"

    # 3. HIJACK ATTEMPT A: Attacker copies beeline_auth_token without beeline_device_proof
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", stolen_auth_token)
    # No beeline_device_proof
    attacker_res_a = await client.get("/api/v1/users/me", headers=legit_headers)
    assert attacker_res_a.status_code == 401

    # Verify session was instantly revoked in database
    await db_session.rollback()
    res = await db_session.execute(select(UserSession).where(UserSession.id == session_id))
    revoked_session = res.scalar_one_or_none()
    assert revoked_session is not None
    assert revoked_session.is_revoked is True

    # Even legitimate user cannot use this revoked session anymore
    client.cookies.set("beeline_device_proof", stolen_proof)
    retry_legit = await client.get("/api/v1/users/me", headers=legit_headers)
    assert retry_legit.status_code == 401

    # 4. HIJACK ATTEMPT B: Attacker copies BOTH cookies into a different machine/browser (different User-Agent)
    client.cookies.clear()
    login_res_2 = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "victim.hijack@beeline.io",
            "password": "SecurePassword123!",
        },
        headers=legit_headers,
    )
    assert login_res_2.status_code == 200
    auth_token_2 = login_res_2.cookies["beeline_auth_token"]
    proof_2 = login_res_2.cookies["beeline_device_proof"]
    session_id_2 = decrypt_auth_token(auth_token_2)["sid"]

    attacker_headers = {
        "User-Agent": "AttackerKaliLinux/9.9 (X11; Python/3.11 requests)",
        "Accept-Language": "ru-RU",
    }
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", auth_token_2)
    client.cookies.set("beeline_device_proof", proof_2)

    attacker_res_b = await client.get("/api/v1/users/me", headers=attacker_headers)
    assert attacker_res_b.status_code == 401

    # Verify session_2 was revoked in database
    await db_session.rollback()
    res_2 = await db_session.execute(select(UserSession).where(UserSession.id == session_id_2))
    session_2 = res_2.scalar_one_or_none()
    assert session_2.is_revoked is True


@pytest.mark.asyncio
async def test_transparent_token_rotation_when_rot_exp_elapses(client: AsyncClient, db_session: AsyncSession):
    """
    Test 5: Transparent token rotation when rot_exp passes using the backend-only refresh vault.
    """
    headers = {
        "User-Agent": "RotationBrowser/1.0",
        "Accept-Language": "en-US",
    }
    await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "rotation.auto@beeline.io",
            "password": "SecurePassword123!",
            "full_name": "Rotation Auto",
        },
        headers=headers,
    )
    await verify_user_for_test(client, "rotation.auto@beeline.io")
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "rotation.auto@beeline.io",
            "password": "SecurePassword123!",
        },
        headers=headers,
    )
    auth_token = login_res.cookies["beeline_auth_token"]
    device_proof = login_res.cookies["beeline_device_proof"]
    payload = decrypt_auth_token(auth_token)
    session_id = payload["sid"]

    # Simulate that 15 minutes have passed (rot_exp is in the past, but session exp is in the future)
    now_ts = int(datetime.now(timezone.utc).timestamp())
    stale_payload = dict(payload)
    stale_payload["iat"] = now_ts - 1000
    stale_payload["rot_exp"] = now_ts - 100  # Elapsed!
    stale_payload["exp"] = now_ts + 86400    # Session vault still valid for ~1 day

    stale_auth_token = encrypt_auth_token(stale_payload)

    client.cookies.clear()
    client.cookies.set("beeline_auth_token", stale_auth_token)
    client.cookies.set("beeline_device_proof", device_proof)

    # Request to protected endpoint
    req_res = await client.get("/api/v1/users/me", headers=headers)
    assert req_res.status_code == 200

    # Verify middleware attached transparently rotated beeline_auth_token in Set-Cookie
    assert "beeline_auth_token" in req_res.cookies
    new_auth_token = req_res.cookies["beeline_auth_token"]
    assert new_auth_token != stale_auth_token

    new_payload = decrypt_auth_token(new_auth_token)
    assert new_payload["sid"] == session_id
    assert new_payload["rot_exp"] > now_ts  # Reset to fresh 15-minute window


@pytest.mark.asyncio
async def test_sessions_management_listing_and_revocation(client: AsyncClient):
    """
    Test 6: Listing active sessions (GET /users/me/sessions) and revoking
    a specific session or all other sessions (DELETE /users/me/sessions).
    """
    headers_1 = {
        "User-Agent": "Device1-DesktopChrome",
        "Accept-Language": "en-US",
    }
    headers_2 = {
        "User-Agent": "Device2-MobileSafari",
        "Accept-Language": "en-US",
    }

    # 1. Signup and verify on Device 1
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "session.manager@beeline.io",
            "password": "SecurePassword123!",
            "device_info": "Device1 Desktop Chrome",
        },
        headers=headers_1,
    )
    assert signup_res.status_code == 201
    await verify_user_for_test(client, "session.manager@beeline.io", device_info="Device1 Desktop Chrome", headers=headers_1)
    auth_1 = client.cookies["beeline_auth_token"]
    proof_1 = client.cookies["beeline_device_proof"]
    sid_1 = decrypt_auth_token(auth_1)["sid"]

    # 2. Login on Device 2
    login_res_2 = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "session.manager@beeline.io",
            "password": "SecurePassword123!",
            "device_info": "Device2 Mobile Safari",
        },
        headers=headers_2,
    )
    auth_2 = login_res_2.cookies["beeline_auth_token"]
    proof_2 = login_res_2.cookies["beeline_device_proof"]
    sid_2 = decrypt_auth_token(auth_2)["sid"]
    assert sid_1 != sid_2

    # 3. List active sessions from Device 1
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", auth_1)
    client.cookies.set("beeline_device_proof", proof_1)

    sess_res = await client.get("/api/v1/users/me/sessions", headers=headers_1)
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) == 2

    # Verify session attributes
    for s in sessions:
        assert "session_id" in s
        assert "device_name" in s
        assert "ip_address" in s
        assert "remember_me" in s
        assert "created_at" in s
        assert "last_active_at" in s
        assert "expires_at" in s
        assert "is_current" in s

    current_sessions = [s for s in sessions if s["is_current"]]
    assert len(current_sessions) == 1
    assert current_sessions[0]["session_id"] == sid_1

    # 4. Revoke Device 2 session specifically
    del_res = await client.delete(f"/api/v1/users/me/sessions/{sid_2}", headers=headers_1)
    assert del_res.status_code == 200
    assert "revoked successfully" in del_res.json()["message"]

    # Device 2 request is now rejected
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", auth_2)
    client.cookies.set("beeline_device_proof", proof_2)
    dev2_res = await client.get("/api/v1/users/me", headers=headers_2)
    assert dev2_res.status_code == 401

    # 5. Revoke all other sessions from Device 1
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", auth_1)
    client.cookies.set("beeline_device_proof", proof_1)

    del_all_res = await client.delete("/api/v1/users/me/sessions", headers=headers_1)
    assert del_all_res.status_code == 200

    # Device 1 remains logged in and valid
    me_res = await client.get("/api/v1/users/me", headers=headers_1)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "session.manager@beeline.io"


@pytest.mark.asyncio
async def test_backend_only_refresh_vault_and_instant_redis_revocation(client: AsyncClient):
    """
    Test 7: Direct verification of Redis Backend-Only Vault caching and instant revocation tombstone.
    """
    headers = {
        "User-Agent": "VaultClient/1.0",
        "Accept-Language": "en-US",
    }
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "redis.vault@beeline.io",
            "password": "SecurePassword123!",
            "remember_me": True,
        },
        headers=headers,
    )
    assert signup_res.status_code == 201
    await verify_user_for_test(client, "redis.vault@beeline.io", remember_me=True, headers=headers)
    auth_token = client.cookies["beeline_auth_token"]
    payload = decrypt_auth_token(auth_token)
    session_id = payload["sid"]

    # 1. Verify Redis session vault exists
    redis = get_redis()
    vault_key = f"session:vault:{session_id}"
    vault_raw = await redis.get(vault_key)
    assert vault_raw is not None
    vault_data = json.loads(vault_raw)
    assert vault_data["session_id"] == session_id
    assert vault_data["remember_me"] is True
    assert "refresh_token_hash" in vault_data
    assert len(vault_data["refresh_token_hash"]) == 64

    # TTL is approximately 30 days (2,592,000s)
    ttl = await redis.ttl(vault_key)
    assert 2500000 < ttl <= 2592000

    # 2. Logout revokes session and writes instant tombstone in Redis
    logout_res = await client.post(
        "/api/v1/auth/logout",
        headers=headers,
    )
    assert logout_res.status_code == 200

    # Revocation tombstone key exists with value "1"
    revoked_val = await redis.get(f"session:revoked:{session_id}")
    assert revoked_val == "1"
    # Vault key was deleted
    vault_after_logout = await redis.get(vault_key)
    assert vault_after_logout is None


@pytest.mark.asyncio
async def test_throttled_session_activity_tracking(client: AsyncClient):
    """
    Test 8: Throttled activity tracking writes session:active_touch:{session_id} with 300s TTL.
    """
    headers = {
        "User-Agent": "ActivityThrottler/1.0",
        "Accept-Language": "en-US",
    }
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "activity.touch@beeline.io",
            "password": "SecurePassword123!",
        },
        headers=headers,
    )
    assert signup_res.status_code == 201
    await verify_user_for_test(client, "activity.touch@beeline.io", headers=headers)
    auth_token = client.cookies["beeline_auth_token"]
    proof = client.cookies["beeline_device_proof"]
    session_id = decrypt_auth_token(auth_token)["sid"]

    # Make request
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", auth_token)
    client.cookies.set("beeline_device_proof", proof)

    res = await client.get("/api/v1/users/me", headers=headers)
    assert res.status_code == 200

    redis = get_redis()
    touch_key = f"session:active_touch:{session_id}"
    touch_val = await redis.get(touch_key)
    assert touch_val == "1"
    touch_ttl = await redis.ttl(touch_key)
    assert 280 <= touch_ttl <= 300
