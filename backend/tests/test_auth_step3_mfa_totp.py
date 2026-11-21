import asyncio
import json
import time
import pytest
import fakeredis.aioredis
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import set_custom_session_maker
from app.core.redis import set_custom_redis_client
from app.core.security import decrypt_auth_token, decrypt_totp_secret
from app.models.user import MFACredential, User
from app.services.email_service import email_service
from app.services.mfa_service import (
    mfa_challenge_shield,
    mfa_challenge_vault,
    mfa_service,
    totp_replay_shield,
)
from tests.conftest import TestAsyncSessionLocal, signup_and_verify


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Sets up FakeRedis, test session maker, and cleans up email outbox before each test."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)
    set_custom_session_maker(TestAsyncSessionLocal)
    email_service.clear_outbox()
    yield
    email_service.clear_outbox()
    set_custom_session_maker(None)
    set_custom_redis_client(None)


@pytest.mark.asyncio
async def test_mfa_setup_fernet_encryption_and_deep_links(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Test 1: POST /api/v1/auth/mfa/setup
    - Returns RFC 6238 otpauth_uri (Proton Pass / Google Auth compatible)
    - Returns apple_passwords_uri (iPhone Passwords compatible)
    - Returns qr_code_svg (data:image/svg+xml;base64,...)
    - Returns supported_authenticators list
    - Stores mfa_credentials.secret_key Fernet-encrypted at rest in DB
    - Validates legacy plaintext fallback in decrypt_totp_secret
    """
    signup_data = await signup_and_verify(client, {
        "email": "fernet.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Fernet Traveler"
    })
    auth_token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}

    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert setup_res.status_code == 200
    data = setup_res.json()

    # 1. Inspect response fields
    raw_secret = data["secret"]
    assert len(raw_secret) >= 16
    assert data["otpauth_uri"].startswith("otpauth://totp/Beeline:fernet.traveler%40beeline.io")
    assert "secret=" in data["otpauth_uri"]
    assert "issuer=Beeline" in data["otpauth_uri"]
    assert "algorithm=SHA1" in data["otpauth_uri"]
    assert "digits=6" in data["otpauth_uri"]
    assert "period=30" in data["otpauth_uri"]

    assert data["apple_passwords_uri"].startswith("apple-otpauth://totp/Beeline:fernet.traveler%40beeline.io")
    assert "secret=" in data["apple_passwords_uri"]

    assert data["qr_code_svg"].startswith("data:image/svg+xml;base64,")
    assert data["qr_code_base64"].startswith("data:image/png;base64,")
    assert "Proton Pass" in data["supported_authenticators"]
    assert "Apple iPhone Passwords" in data["supported_authenticators"]

    # 2. Assert raw DB secret_key is Fernet-encrypted (not plaintext Base32)
    user_res = await db_session.execute(select(User).where(User.email == "fernet.traveler@beeline.io"))
    user = user_res.scalar_one()

    cred_res = await db_session.execute(select(MFACredential).where(MFACredential.user_id == user.id))
    cred = cred_res.scalar_one()

    assert cred.secret_key != raw_secret
    assert cred.secret_key.startswith("gAAAAA")
    assert mfa_service.decrypt_totp_secret(cred.secret_key) == raw_secret

    # 3. Test legacy plaintext Base32 fallback for seeded data
    legacy_secret = "JBSWY3DPEHPK3PXP"
    assert decrypt_totp_secret(legacy_secret) == legacy_secret


@pytest.mark.asyncio
async def test_mfa_verify_clock_drift_email_alert_and_status(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Test 2: POST /api/v1/auth/mfa/verify
    - Verifies TOTP code with clock-drift tolerance (+/- 30s)
    - Activates mfa_enabled = True on user
    - Dispatches 2FA Enabled email alert via EmailService
    - GET /api/v1/auth/mfa/status reports mfa_enabled=True and remaining_recovery_codes=3
    """
    signup_data = await signup_and_verify(client, {
        "email": "clockdrift.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Clock Traveler"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    raw_secret = setup_res.json()["secret"]

    # Generate code with 30s mobile clock-drift in the past
    drifted_code = mfa_service.generate_totp_code(raw_secret, offset_seconds=-30)

    verify_res = await client.post(
        "/api/v1/auth/mfa/verify",
        json={"code": drifted_code},
        headers=headers
    )
    assert verify_res.status_code == 200
    assert "enabled successfully" in verify_res.json()["message"]

    # Inspect security email alert
    outbox = email_service.get_outbox()
    assert len(outbox) >= 1
    mfa_alert = next((m for m in outbox if "Two-Factor Authentication (2FA) Enabled" in m.subject), None)
    assert mfa_alert is not None
    assert mfa_alert.to_email == "clockdrift.traveler@beeline.io"

    # Inspect MFA status
    status_res = await client.get("/api/v1/auth/mfa/status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["mfa_enabled"] is True
    assert status_data["is_confirmed"] is True
    assert status_data["remaining_recovery_codes"] == 3
    assert "Apple iPhone Passwords" in status_data["supported_authenticators"]


@pytest.mark.asyncio
async def test_2step_login_with_remember_me_30days_session(
    client: AsyncClient
):
    """
    Test 3: 2-Step Login with remember_me=True
    - Step 1: /login returns mfa_required=True and mfa_temp_token (without setting auth cookies)
    - Step 2: /mfa/challenge with TOTP code issues a 30-day session and sets encrypted cookies
    """
    signup_data = await signup_and_verify(client, {
        "email": "remember30.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Remember 30"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_res.json()["secret"]
    valid_code = mfa_service.generate_totp_code(secret)
    await client.post("/api/v1/auth/mfa/verify", json={"code": valid_code}, headers=headers)

    # Step 1: Login with remember_me=True
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "remember30.traveler@beeline.io",
        "password": "SecurePassword123!",
        "remember_me": True
    })
    assert login_res.status_code == 200
    challenge_data = login_res.json()
    assert challenge_data["mfa_required"] is True
    assert "mfa_temp_token" in challenge_data or "mfa_session_token" in challenge_data
    challenge_token = challenge_data.get("mfa_temp_token") or challenge_data["mfa_session_token"]

    # Verify no session cookies issued yet
    assert "beeline_auth_token" not in login_res.cookies

    # Step 2: Submit TOTP to /mfa/challenge
    totp_code = mfa_service.generate_totp_code(secret)
    challenge_res = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_temp_token": challenge_token,
        "totp_code": totp_code
    })
    assert challenge_res.status_code == 200
    res_json = challenge_res.json()
    assert "access_token" in res_json
    assert res_json["expires_in"] == 30 * 86400

    # Verify 30-day cookies set
    assert "beeline_auth_token" in challenge_res.cookies
    assert "beeline_device_proof" in challenge_res.cookies


@pytest.mark.asyncio
async def test_totp_replay_and_single_use_challenge_token_defense(
    client: AsyncClient
):
    """
    Test 4: TOTP Replay & Single-Use mfa_temp_token Defense
    - Replaying the same mfa_temp_token after success is rejected (401)
    - Submitting the same 6-digit TOTP code across two login challenges within 30s is rejected (401)
    """
    signup_data = await signup_and_verify(client, {
        "email": "replay.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Anti Replay"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_res.json()["secret"]
    valid_code = mfa_service.generate_totp_code(secret)
    await client.post("/api/v1/auth/mfa/verify", json={"code": valid_code}, headers=headers)

    # Login #1
    login_1 = await client.post("/api/v1/auth/login", json={
        "email": "replay.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    token_1 = login_1.json()["mfa_session_token"]
    totp_1 = mfa_service.generate_totp_code(secret)

    # First challenge attempt succeeds
    chal_1 = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": token_1,
        "totp_code": totp_1
    })
    assert chal_1.status_code == 200

    # 1. Replay exact same challenge token -> rejected (401)
    chal_replay_token = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": token_1,
        "totp_code": mfa_service.generate_totp_code(secret)
    })
    assert chal_replay_token.status_code == 401

    # 2. Login #2 gets fresh challenge token, but attempts to replay the same totp_1 code
    login_2 = await client.post("/api/v1/auth/login", json={
        "email": "replay.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    token_2 = login_2.json()["mfa_session_token"]

    chal_replay_code = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": token_2,
        "totp_code": totp_1  # Replayed within same 30s window!
    })
    assert chal_replay_code.status_code == 401


@pytest.mark.asyncio
async def test_lost_phone_recovery_code_challenge_and_decrement(
    client: AsyncClient
):
    """
    Test 5: Lost-Phone 2FA Challenge Fallback
    - Completes /mfa/challenge using one of the 3 obfuscated signup recovery codes (BEE-XXXX-XXXX)
    - Session cookies are set
    - remaining_recovery_codes decrements from 3 to 2 in GET /mfa/status
    - Second attempt with the consumed recovery code fails (401)
    """
    signup_data = await signup_and_verify(client, {
        "email": "lostphone.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Lost Phone"
    })
    token = signup_data["access_token"]
    recovery_codes = signup_data["recovery_codes"]
    assert len(recovery_codes) == 3
    headers = {"Authorization": f"Bearer {token}"}

    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_res.json()["secret"]
    valid_code = mfa_service.generate_totp_code(secret)
    await client.post("/api/v1/auth/mfa/verify", json={"code": valid_code}, headers=headers)

    # Initial status has 3 recovery codes
    status_before = await client.get("/api/v1/auth/mfa/status", headers=headers)
    assert status_before.json()["remaining_recovery_codes"] == 3

    # Login to trigger 2FA challenge
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "lostphone.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    challenge_token = login_res.json()["mfa_session_token"]

    # Use first recovery code for challenge login
    first_code = recovery_codes[0]
    challenge_res = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": challenge_token,
        "backup_code": first_code
    })
    assert challenge_res.status_code == 200
    new_token = challenge_res.json()["access_token"]
    assert "beeline_auth_token" in challenge_res.cookies

    # Verify status decremented to 2 remaining codes
    new_headers = {"Authorization": f"Bearer {new_token}"}
    status_after = await client.get("/api/v1/auth/mfa/status", headers=new_headers)
    assert status_after.json()["remaining_recovery_codes"] == 2

    # Attempt to use the same recovery code on a new challenge -> fails (401)
    login_res_2 = await client.post("/api/v1/auth/login", json={
        "email": "lostphone.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    challenge_token_2 = login_res_2.json()["mfa_session_token"]
    reuse_res = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": challenge_token_2,
        "backup_code": first_code
    })
    assert reuse_res.status_code == 401


@pytest.mark.asyncio
async def test_anti_brute_force_shield_locks_out_after_3_failures(
    client: AsyncClient
):
    """
    Test 6: Anti-Brute-Force on 2FA Challenge
    - 3 wrong 6-digit codes locks out with 429 Too Many Requests
    - Challenge token is permanently invalidated (even if 4th attempt has correct TOTP)
    """
    signup_data = await signup_and_verify(client, {
        "email": "bruteforce.mfa@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Brute Force"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_res.json()["secret"]
    valid_code = mfa_service.generate_totp_code(secret)
    await client.post("/api/v1/auth/mfa/verify", json={"code": valid_code}, headers=headers)

    # Trigger login challenge
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "bruteforce.mfa@beeline.io",
        "password": "SecurePassword123!"
    })
    challenge_token = login_res.json()["mfa_session_token"]

    # Attempts 1 & 2 fail with 401
    f1 = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": challenge_token,
        "totp_code": "000000"
    })
    assert f1.status_code == 401

    f2 = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": challenge_token,
        "totp_code": "111111"
    })
    assert f2.status_code == 401

    # Attempt 3 reaches the threshold -> 429 Too Many Requests and invalidates challenge token
    f3 = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": challenge_token,
        "totp_code": "222222"
    })
    assert f3.status_code == 429
    assert "Too many failed 2FA attempts" in f3.json()["detail"]

    # Attempt 4 with CORRECT TOTP code is STILL locked out (429)
    correct_totp = mfa_service.generate_totp_code(secret)
    f4 = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": challenge_token,
        "totp_code": correct_totp
    })
    assert f4.status_code == 429
    assert "Too many failed 2FA attempts" in f4.json()["detail"]
