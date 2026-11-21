import pytest
from httpx import AsyncClient
from sqlalchemy import select
import json

from app.models.user import EmailVerificationToken, MFACredential, User
from app.services.email_service import email_service


@pytest.mark.asyncio
async def test_signup_creates_unverified_user_no_cookies_no_codes(client: AsyncClient, db_session):
    email_service.clear_outbox()

    signup_payload = {
        "email": "unverified.tester@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Unverified Tester",
        "username": "unverified_tester",
        "device_info": "Firefox Test"
    }

    # 1. Signup request
    res = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert res.status_code == 201
    data = res.json()

    # ZERO SECURITY COMPROMISE checks:
    # No auth cookies issued
    assert "beeline_auth_token" not in client.cookies
    assert "beeline_device_proof" not in client.cookies
    assert "Set-Cookie" not in res.headers or "beeline_auth_token" not in res.headers.get("Set-Cookie", "")

    # No recovery codes returned
    assert "recovery_codes" not in data
    assert "access_token" not in data
    assert data.get("verification_required") is True
    assert data.get("email") == "unverified.tester@beeline.io"
    assert "expires_in_minutes" in data

    # User in database is unverified
    res_user = await db_session.execute(
        select(User).where(User.email == "unverified.tester@beeline.io")
    )
    user = res_user.scalar_one_or_none()
    assert user is not None
    assert user.email_verified is False
    assert user.email_verified_at is None

    # Verification email arrived with 6-digit OTP code + magic link
    last_email = email_service.get_last_email_for("unverified.tester@beeline.io")
    assert last_email is not None
    assert "Verify your Beeline account" in last_email.subject
    otp_code = last_email.context.get("otp_code")
    assert otp_code is not None
    assert len(otp_code) == 6
    assert otp_code.isdigit()
    assert otp_code in last_email.text_body
    assert "/verify-email?token=" in last_email.text_body
    assert "If you did not" in last_email.text_body


@pytest.mark.asyncio
async def test_login_before_verification_fails_403_email_not_verified(client: AsyncClient):
    email_service.clear_outbox()

    signup_payload = {
        "email": "login.guard@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Login Guard Traveler",
        "username": "login_guard_user"
    }
    res_signup = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert res_signup.status_code == 201

    # Login before verification must fail with 403 Forbidden
    res_login = await client.post("/api/v1/auth/login", json={
        "email": "login.guard@beeline.io",
        "password": "SecurePassword123!"
    })
    assert res_login.status_code == 403
    login_data = res_login.json()
    assert "EMAIL_NOT_VERIFIED" in str(login_data)
    assert "beeline_auth_token" not in client.cookies


@pytest.mark.asyncio
async def test_forgot_password_on_unverified_user_does_not_send_reset_token(client: AsyncClient):
    email_service.clear_outbox()

    signup_payload = {
        "email": "forgot.guard@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Forgot Guard User",
        "username": "forgot_guard_user"
    }
    await client.post("/api/v1/auth/signup", json=signup_payload)
    email_service.clear_outbox()

    # Forgot password on unverified email
    res_forgot = await client.post("/api/v1/auth/forgot-password", json={
        "email": "forgot.guard@beeline.io"
    })
    assert res_forgot.status_code == 200

    # No password reset email dispatched
    last_email = email_service.get_last_email_for("forgot.guard@beeline.io")
    assert last_email is None


@pytest.mark.asyncio
async def test_failed_otp_attempts_lockout_and_invalidate_after_5_failures(client: AsyncClient, db_session):
    email_service.clear_outbox()

    signup_payload = {
        "email": "brute.shield@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Brute Shield Traveler",
        "username": "brute_shield_user"
    }
    await client.post("/api/v1/auth/signup", json=signup_payload)

    # 4 wrong OTP attempts -> 400 Bad Request with remaining attempts
    for i in range(1, 5):
        res_fail = await client.post("/api/v1/auth/verify-email", json={
            "email": "brute.shield@beeline.io",
            "code": "000000"
        })
        assert res_fail.status_code == 400
        assert f"{5 - i} attempt(s) remaining" in res_fail.json().get("detail", "")

    # 5th wrong OTP attempt -> 429 Too Many Requests & invalidation
    res_5th = await client.post("/api/v1/auth/verify-email", json={
        "email": "brute.shield@beeline.io",
        "code": "000000"
    })
    assert res_5th.status_code == 429
    assert "invalidated" in res_5th.json().get("detail", "").lower()

    # Token record in database is marked is_used = True
    res_tok = await db_session.execute(
        select(EmailVerificationToken).where(EmailVerificationToken.email == "brute.shield@beeline.io")
    )
    tokens = res_tok.scalars().all()
    assert all(t.is_used for t in tokens)

    # Even the correct code now fails with 429 / 400 because token is invalidated
    last_email = email_service.get_last_email_for("brute.shield@beeline.io")
    real_code = last_email.context["otp_code"]
    res_after = await client.post("/api/v1/auth/verify-email", json={
        "email": "brute.shield@beeline.io",
        "code": real_code
    })
    assert res_after.status_code in (400, 429)


@pytest.mark.asyncio
async def test_resend_verification_cooldown_and_fresh_otp(client: AsyncClient):
    email_service.clear_outbox()

    signup_payload = {
        "email": "resend.cooldown@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Resend Cooldown User",
        "username": "resend_cooldown_user"
    }
    await client.post("/api/v1/auth/signup", json=signup_payload)
    email_1 = email_service.get_last_email_for("resend.cooldown@beeline.io")
    otp_1 = email_1.context["otp_code"]

    # Calling resend immediately triggers 429 Too Many Requests
    res_fast = await client.post("/api/v1/auth/resend-verification", json={
        "email": "resend.cooldown@beeline.io"
    })
    assert res_fast.status_code == 429
    assert "Retry-After" in res_fast.headers

    # Reset cooldown tracker for test simulation
    from app.services.auth_service import resend_cooldown
    from app.core.redis import get_redis
    try:
        redis = get_redis()
        await redis.delete("auth:resend_cooldown:resend.cooldown@beeline.io")
    except Exception:
        pass
    resend_cooldown._memory_cooldown.pop("resend.cooldown@beeline.io", None)

    # Now resend succeeds
    res_ok = await client.post("/api/v1/auth/resend-verification", json={
        "email": "resend.cooldown@beeline.io"
    })
    assert res_ok.status_code == 200
    email_2 = email_service.get_last_email_for("resend.cooldown@beeline.io")
    otp_2 = email_2.context["otp_code"]

    # Old OTP is invalidated; new fresh OTP works
    res_old = await client.post("/api/v1/auth/verify-email", json={
        "email": "resend.cooldown@beeline.io",
        "code": otp_1
    })
    assert res_old.status_code in (400, 429)

    res_verify = await client.post("/api/v1/auth/verify-email", json={
        "email": "resend.cooldown@beeline.io",
        "code": otp_2
    })
    assert res_verify.status_code == 200
    assert "recovery_codes" in res_verify.json()


@pytest.mark.asyncio
async def test_valid_otp_verifies_sets_cookies_returns_codes_once(client: AsyncClient, db_session):
    email_service.clear_outbox()

    signup_payload = {
        "email": "successful.verify@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Successful Traveler",
        "username": "success_verify_user"
    }
    await client.post("/api/v1/auth/signup", json=signup_payload)
    signup_msg = email_service.get_last_email_for("successful.verify@beeline.io")
    otp_code = signup_msg.context["otp_code"]

    # Verify with valid OTP
    res_verify = await client.post("/api/v1/auth/verify-email", json={
        "email": "successful.verify@beeline.io",
        "code": otp_code,
        "remember_me": True
    })
    assert res_verify.status_code == 200
    verify_data = res_verify.json()

    # Session cookies set
    assert "beeline_auth_token" in client.cookies
    assert "beeline_device_proof" in client.cookies
    assert "access_token" in verify_data
    assert "refresh_token" in verify_data

    # Exactly 3 recovery codes returned ONCE
    recovery_codes = verify_data.get("recovery_codes")
    assert recovery_codes is not None
    assert len(recovery_codes) == 3
    for code in recovery_codes:
        assert code.startswith("BEE-")

    # Recovery codes are obfuscated in DB (salted HMAC hashes, never plaintext)
    res_user = await db_session.execute(
        select(User).where(User.email == "successful.verify@beeline.io")
    )
    user = res_user.scalar_one_or_none()
    assert user.email_verified is True
    assert user.email_verified_at is not None

    res_cred = await db_session.execute(
        select(MFACredential).where(MFACredential.user_id == user.id)
    )
    cred = res_cred.scalar_one_or_none()
    assert cred is not None
    hashes = json.loads(cred.backup_codes_hash)
    assert len(hashes) == 3
    for code in recovery_codes:
        assert code not in cred.backup_codes_hash  # Never plaintext in DB!

    # Safe welcome email sent without plaintext recovery codes
    welcome_msg = email_service.get_last_email_for("successful.verify@beeline.io")
    assert welcome_msg is not None
    assert "Account Verified" in welcome_msg.subject or "Welcome" in welcome_msg.subject
    for code in recovery_codes:
        assert code not in welcome_msg.html_body
        assert code not in welcome_msg.text_body

    # Subsequent login now succeeds
    client.cookies.clear()
    res_login = await client.post("/api/v1/auth/login", json={
        "email": "successful.verify@beeline.io",
        "password": "SecurePassword123!"
    })
    assert res_login.status_code == 200


@pytest.mark.asyncio
async def test_valid_magic_link_token_verifies_successfully(client: AsyncClient):
    email_service.clear_outbox()

    signup_payload = {
        "email": "magic.link@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Magic Link Traveler",
        "username": "magic_link_user"
    }
    await client.post("/api/v1/auth/signup", json=signup_payload)
    signup_msg = email_service.get_last_email_for("magic.link@beeline.io")
    verify_url = signup_msg.context["verify_url"]
    raw_token = verify_url.split("token=")[-1]

    # Verify with magic link token
    res_verify = await client.post("/api/v1/auth/verify-email", json={
        "token": raw_token
    })
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert "access_token" in verify_data
    assert "recovery_codes" in verify_data
    assert len(verify_data["recovery_codes"]) == 3
