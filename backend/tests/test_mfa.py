import pyotp
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_mfa_flow(client: AsyncClient):
    # 1. Sign up user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "mfa.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Andrei MFA"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Initiate MFA Setup
    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert setup_res.status_code == 200
    mfa_setup = setup_res.json()
    assert "secret" in mfa_setup
    assert "otpauth_url" in mfa_setup
    assert mfa_setup["qr_code_base64"].startswith("data:image/png;base64,")
    assert len(mfa_setup["backup_codes"]) == 8

    secret = mfa_setup["secret"]
    backup_codes = mfa_setup["backup_codes"]

    # 3. Confirm MFA with valid TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    confirm_res = await client.post(
        "/api/v1/auth/mfa/verify",
        json={"code": valid_code},
        headers=headers
    )
    assert confirm_res.status_code == 200
    assert "enabled successfully" in confirm_res.json()["message"]

    # 4. Attempt standard login -> receives MFA Challenge
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "mfa.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    login_challenge = login_res.json()
    assert login_challenge.get("mfa_required") is True
    assert "mfa_session_token" in login_challenge
    mfa_session_token = login_challenge["mfa_session_token"]

    # 5. Complete challenge via TOTP code
    challenge_res = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": mfa_session_token,
        "totp_code": totp.now()
    })
    assert challenge_res.status_code == 200
    assert "access_token" in challenge_res.json()

    # 6. Test backup emergency recovery code
    login_res_2 = await client.post("/api/v1/auth/login", json={
        "email": "mfa.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    mfa_session_token_2 = login_res_2.json()["mfa_session_token"]

    first_backup_code = backup_codes[0]
    backup_res = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": mfa_session_token_2,
        "backup_code": first_backup_code
    })
    assert backup_res.status_code == 200
    assert "access_token" in backup_res.json()

    # 7. Same backup code cannot be used twice (Single-use burn guarantee)
    login_res_3 = await client.post("/api/v1/auth/login", json={
        "email": "mfa.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    mfa_session_token_3 = login_res_3.json()["mfa_session_token"]
    backup_res_reuse = await client.post("/api/v1/auth/mfa/challenge", json={
        "mfa_session_token": mfa_session_token_3,
        "backup_code": first_backup_code
    })
    assert backup_res_reuse.status_code == 401


@pytest.mark.asyncio
async def test_disable_mfa_flow(client: AsyncClient):
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "disable.mfa@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup
    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_res.json()["secret"]

    # Verify
    totp = pyotp.TOTP(secret)
    await client.post("/api/v1/auth/mfa/verify", json={"code": totp.now()}, headers=headers)

    # Disable with wrong password -> fails
    dis_fail = await client.post("/api/v1/auth/mfa/disable", json={"password": "WrongPassword!"}, headers=headers)
    assert dis_fail.status_code == 401

    # Disable with correct password -> succeeds
    dis_ok = await client.post("/api/v1/auth/mfa/disable", json={"password": "SecurePassword123!"}, headers=headers)
    assert dis_ok.status_code == 200

    # Next login does not require MFA
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "disable.mfa@beeline.io",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
