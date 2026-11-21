import asyncio
import re
from typing import List
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.auth_service import recovery_shield
from app.services.email_service import EmailCircuitBreaker, TokenBucketRateLimiter, email_service
from tests.conftest import signup_and_verify, verify_user_for_test


@pytest.fixture(autouse=True)
def cleanup_email_sink():
    """Clear dev sink outbox before each test."""
    email_service.clear_outbox()
    yield
    email_service.clear_outbox()


@pytest.mark.asyncio
async def test_signup_generates_3_recovery_codes_and_stores_only_hashes(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Test 1: Signup requires email verification; after verification, exactly 3 recovery
    codes are returned in the verify response, safe welcome email is dispatched to dev sink,
    and stores only obfuscated hashes in mfa_credentials.backup_codes (assert plaintext
    codes do NOT appear in the raw DB column or email).
    """
    user_email = "honeybee.traveler@beeline.io"
    user_pw = "GoldenHoneyComb#2026!"

    res = await client.post("/api/v1/auth/signup", json={
        "email": user_email,
        "password": user_pw,
        "full_name": "Maya Honeybee"
    })
    assert res.status_code == 201
    assert res.json().get("verification_required") is True
    assert "recovery_codes" not in res.json()

    # Verify email to activate account and receive recovery codes
    verify_data = await verify_user_for_test(client, user_email)

    # 1. Exactly 3 recovery codes returned
    recovery_codes: List[str] = verify_data.get("recovery_codes")
    assert recovery_codes is not None
    assert len(recovery_codes) == 3

    # Pattern check: BEE-XXXX-XXXX
    code_pattern = re.compile(r"^BEE-[A-Z0-9]{4}-[A-Z0-9]{4}$")
    for code in recovery_codes:
        assert code_pattern.match(code), f"Code {code} does not match BEE-XXXX-XXXX"

    # 2. Email dispatched to EmailService dev sink - safe welcome without plaintext codes
    last_email = email_service.get_last_email_for(user_email)
    assert last_email is not None
    assert "Welcome" in last_email.subject
    assert "Maya Honeybee" in last_email.html_body
    for code in recovery_codes:
        assert code not in last_email.html_body
        assert code not in last_email.text_body

    # 3. Raw database inspection: assert plaintext codes NEVER appear in raw database column
    db_result = await db_session.execute(
        text("SELECT backup_codes_hash, backup_codes FROM mfa_credentials WHERE user_id = :uid"),
        {"uid": verify_data["user"]["id"]}
    )
    row = db_result.fetchone()
    assert row is not None
    raw_hash_col = row[0]
    raw_codes_col = row[1]

    for code in recovery_codes:
        # Plaintext code must NEVER appear in raw database records
        assert code not in raw_hash_col, f"Plaintext code {code} leaked in backup_codes_hash column!"
        if raw_codes_col:
            assert code not in raw_codes_col, f"Plaintext code {code} leaked in backup_codes column!"

    # Must contain salt separator "$"
    assert "$" in raw_hash_col


@pytest.mark.asyncio
async def test_recovery_login_consumption_and_session_cookies(client: AsyncClient):
    """
    Test 2: Using 1 of the 3 recovery codes at POST /api/v1/auth/recovery-login succeeds,
    sets beeline_auth_token + beeline_device_proof cookies, and consumes that code
    so re-using the same code fails with 401.
    """
    user_email = "lostphone.traveler@beeline.io"
    user_pw = "VoyageExplorer#2026!"

    # Signup & verify
    verify_data = await signup_and_verify(client, {
        "email": user_email,
        "password": user_pw,
        "full_name": "Lost Phone Traveler"
    })
    codes = verify_data["recovery_codes"]
    code_1, code_2, code_3 = codes[0], codes[1], codes[2]

    # Use Code 1 to log in
    recov_res_1 = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": code_1,
        "device_info": "Backup Safari Laptop"
    })
    assert recov_res_1.status_code == 200
    recov_data = recov_res_1.json()
    assert "access_token" in recov_data
    assert "refresh_token" in recov_data

    # Check cookies
    cookies = recov_res_1.cookies
    assert "beeline_auth_token" in cookies
    assert "beeline_device_proof" in cookies

    # Attempt to RE-USE Code 1 -> MUST FAIL with 401 Unauthorized
    reuse_res = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": code_1
    })
    assert reuse_res.status_code == 401
    assert "Invalid email or recovery code" in reuse_res.json()["detail"]

    # Code 2 remains valid and succeeds
    recov_res_2 = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": code_2
    })
    assert recov_res_2.status_code == 200


@pytest.mark.asyncio
async def test_anti_brute_force_shield_locks_out_after_3_failures(client: AsyncClient):
    """
    Test 3: Anti-Brute-Force Test: Making 3 wrong attempts at POST /api/v1/auth/recovery-login
    triggers a 429 Too Many Requests lockout on the 4th attempt (even if a valid code is supplied during lockout).
    """
    user_email = "bruteforce.target@beeline.io"
    user_pw = "StrongVaultKey#2026!"

    # Clear shield memory state for this test
    await recovery_shield.clear_failures(user_email)

    verify_data = await signup_and_verify(client, {
        "email": user_email,
        "password": user_pw,
        "full_name": "Target Account"
    })
    valid_code = verify_data["recovery_codes"][0]

    # Attempt 1: WRONG CODE -> 401
    att1 = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": "BEE-BAD1-0001"
    })
    assert att1.status_code == 401

    # Attempt 2: WRONG CODE -> 401
    att2 = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": "BEE-BAD2-0002"
    })
    assert att2.status_code == 401

    # Attempt 3: WRONG CODE -> 401
    att3 = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": "BEE-BAD3-0003"
    })
    assert att3.status_code == 401

    # Attempt 4: VALID CODE SUPPLIED -> MUST BE LOCKED OUT with 429 Too Many Requests
    att4 = await client.post("/api/v1/auth/recovery-login", json={
        "email": user_email,
        "recovery_code": valid_code
    })
    assert att4.status_code == 429
    assert "Too many failed recovery code attempts. Account recovery is temporarily locked." in att4.json()["detail"]


@pytest.mark.asyncio
async def test_unified_password_verifier_rejects_breached_and_weak_passwords(client: AsyncClient):
    """
    Test 4: Unified Password Verifier rejects breached/weak passwords on both
    /signup and /reset-password:
    - Known breached password ("Password123") -> 400
    - All numeric password ("12345678") -> 400
    - Password containing email local part -> 400
    - Predictable sequential password -> 400
    """
    target_email = "verifier.traveler@beeline.io"

    # 1. /signup rejects breached password "Password123"
    res_breached = await client.post("/api/v1/auth/signup", json={
        "email": target_email,
        "password": "Password123"
    })
    assert res_breached.status_code == 400
    assert "public data breaches" in res_breached.json()["detail"]

    # 2. /signup rejects all-numeric password "12345678"
    res_numeric = await client.post("/api/v1/auth/signup", json={
        "email": target_email,
        "password": "12345678"
    })
    assert res_numeric.status_code == 400
    assert "numbers" in res_numeric.json()["detail"] or "sequence" in res_numeric.json()["detail"]

    # 3. /signup rejects password containing email local-part
    res_local = await client.post("/api/v1/auth/signup", json={
        "email": "dan_conductor@beeline.io",
        "password": "dan_conductor_Secret#2026!"
    })
    assert res_local.status_code == 400
    assert "email username" in res_local.json()["detail"]

    # 4. Successful signup with valid high-entropy password
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": target_email,
        "password": "SafePass#2026!"
    })
    assert signup_res.status_code == 201
    await verify_user_for_test(client, target_email)

    # Request reset token
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={
        "email": target_email
    })
    assert forgot_res.status_code == 200
    token = forgot_res.json()["reset_token"]

    # 5. /reset-password rejects breached password "Password123"
    reset_breached = await client.post("/api/v1/auth/reset-password", json={
        "reset_token": token,
        "new_password": "Password123"
    })
    assert reset_breached.status_code == 400
    assert "public data breaches" in reset_breached.json()["detail"]

    # 6. /reset-password rejects weak sequence "qwertyui"
    reset_seq = await client.post("/api/v1/auth/reset-password", json={
        "reset_token": token,
        "new_password": "qwertyui"
    })
    assert reset_seq.status_code == 400
    assert "sequence" in reset_seq.json()["detail"]


@pytest.mark.asyncio
async def test_full_forgot_password_reset_flow_with_email_and_session_revocation(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Test 5: Full /forgot-password -> inspect email in EmailService dev sink ->
    extract reset token -> /reset-password updates password, sends confirmation email,
    and revokes all existing active sessions in Redis/PostgreSQL.
    """
    email_service.clear_outbox()
    user_email = "lifecycle.traveler@beeline.io"
    old_pw = "OriginalP@ssword2026!"
    new_pw = "BrandNewSecureKey#9999!"

    # 1. Signup and establish initial session with cookies
    verify_data = await signup_and_verify(client, {
        "email": user_email,
        "password": old_pw,
        "full_name": "Lifecycle Traveler"
    })
    user_id = verify_data["user"]["id"]
    auth_token = client.cookies["beeline_auth_token"]
    proof = client.cookies.get("beeline_device_proof", "")

    # Verify session is currently active
    sess_res = await client.get("/api/v1/users/me/sessions")
    assert sess_res.status_code == 200
    assert len(sess_res.json()) >= 1

    # 2. Trigger forgot-password
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={
        "email": user_email
    })
    assert forgot_res.status_code == 200

    # 3. Inspect EmailService dev sink
    reset_email = email_service.get_last_email_for(user_email)
    assert reset_email is not None
    assert "Beeline Password Reset Request" in reset_email.subject
    assert "15 minutes" in reset_email.html_body

    extracted_token = reset_email.context.get("reset_token")
    assert extracted_token is not None

    # 4. Reset password using extracted token
    reset_res = await client.post("/api/v1/auth/reset-password", json={
        "reset_token": extracted_token,
        "new_password": new_pw
    })
    assert reset_res.status_code == 200
    assert "Password reset successfully" in reset_res.json()["message"]

    # 5. Verify security alert confirmation email was dispatched to dev sink
    alert_email = email_service.get_last_email_for(user_email)
    assert alert_email is not None
    assert "Beeline Security Alert: Your Password Was Changed" in alert_email.subject
    assert "immediately revoked" in alert_email.html_body

    # 6. Verify that ALL prior sessions were REVOKED in Redis and DB
    # Re-apply the old session cookies to verify they are rejected with 401
    client.cookies.clear()
    client.cookies.set("beeline_auth_token", auth_token)
    if proof:
        client.cookies.set("beeline_device_proof", proof)

    revoked_check = await client.get("/api/v1/users/me/sessions")
    assert revoked_check.status_code == 401
    assert "Revoked" in revoked_check.json()["detail"]

    # 7. Old password no longer works
    client.cookies.clear()
    old_login = await client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": old_pw
    })
    assert old_login.status_code == 401

    # 8. New password works
    new_login = await client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": new_pw
    })
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_high_throughput_email_service_rate_limiter_and_circuit_breaker():
    """
    Test 6: High-throughput EmailService rate limiter and circuit breaker
    handle burst dispatches cleanly in dev_sink mode.
    """
    email_service.clear_outbox()

    # 1. Burst dispatch of 25 emails in dev_sink mode
    tasks = []
    for i in range(25):
        tasks.append(
            email_service.send_email(
                to_email=f"burst.test{i}@beeline.io",
                subject=f"High Throughput Notification #{i}",
                html_body=f"<p>Burst test {i}</p>",
                text_body=f"Burst test {i}",
                template_name="burst_test"
            )
        )

    results = await asyncio.gather(*tasks)
    assert len(results) == 25
    for r in results:
        assert r.status == "sent"

    outbox = email_service.get_outbox()
    assert len(outbox) == 25

    # 2. TokenBucketRateLimiter capacity and acquisition
    limiter = TokenBucketRateLimiter(rate=500.0, capacity=1000.0)
    assert limiter.has_capacity(100)
    acquired = await limiter.acquire(count=50)
    assert acquired is True

    # 3. EmailCircuitBreaker failure tracking and tripping to OPEN
    cb = EmailCircuitBreaker(failure_threshold=3, recovery_timeout=0.1)
    assert cb.state == "CLOSED"
    assert await cb.can_execute() is True

    await cb.record_failure()
    assert cb.state == "CLOSED"
    await cb.record_failure()
    assert cb.state == "CLOSED"
    await cb.record_failure()
    assert cb.state == "OPEN"
    assert await cb.can_execute() is False

    # Wait for recovery timeout to transition to HALF_OPEN
    await asyncio.sleep(0.15)
    assert await cb.can_execute() is True
    assert cb.state == "HALF_OPEN"

    await cb.record_success()
    assert cb.state == "CLOSED"

    # 4. Outbox inspection helpers
    test_email = "inspect.target@beeline.io"
    await email_service.send_email(
        to_email=test_email,
        subject="Inspectable Subject",
        html_body="<p>Inspection</p>",
        text_body="Inspection"
    )
    last_msg = email_service.get_last_email_for(test_email)
    assert last_msg is not None
    assert last_msg.subject == "Inspectable Subject"

    email_service.clear_outbox()
    assert len(email_service.get_outbox()) == 0
