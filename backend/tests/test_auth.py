import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_user_signup_and_login(client: AsyncClient):
    signup_payload = {
        "email": "traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Radu Popescu",
        "device_info": "MacBook Pro Chrome"
    }

    # 1. Successful Signup
    res = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "traveler@beeline.io"
    assert data["user"]["full_name"] == "Radu Popescu"
    assert data["user"]["is_guest"] is False

    # 2. Duplicate Signup Rejected
    res_dup = await client.post("/api/v1/auth/signup", json=signup_payload)
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"]

    # 3. Successful Login
    login_payload = {
        "email": "traveler@beeline.io",
        "password": "SecurePassword123!",
        "device_info": "MacBook Pro Chrome"
    }
    res_login = await client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_data

    # 4. Invalid Password Rejected
    res_bad_pw = await client.post("/api/v1/auth/login", json={
        "email": "traveler@beeline.io",
        "password": "WrongPassword999!"
    })
    assert res_bad_pw.status_code == 401


@pytest.mark.asyncio
async def test_guest_account_and_conversion(client: AsyncClient):
    # 1. 1-tap Guest Provisioning
    res_guest = await client.post("/api/v1/auth/guest", json={"device_info": "Safari iOS"})
    assert res_guest.status_code == 201
    guest_data = res_guest.json()
    assert guest_data["user"]["is_guest"] is True
    guest_token = guest_data["access_token"]

    # 2. Inspect /users/me as guest
    res_me = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {guest_token}"}
    )
    assert res_me.status_code == 200
    assert res_me.json()["is_guest"] is True

    # 3. Convert Guest to Permanent Account
    convert_payload = {
        "email": "converted.guest@beeline.io",
        "password": "PermanentSecret2026!",
        "full_name": "Elena Ionescu"
    }
    res_conv = await client.post(
        "/api/v1/auth/guest/convert",
        json=convert_payload,
        headers={"Authorization": f"Bearer {guest_token}"}
    )
    assert res_conv.status_code == 200
    converted_user = res_conv.json()
    assert converted_user["is_guest"] is False
    assert converted_user["email"] == "converted.guest@beeline.io"
    assert converted_user["full_name"] == "Elena Ionescu"

    # 4. Login with newly converted credentials
    res_login = await client.post("/api/v1/auth/login", json={
        "email": "converted.guest@beeline.io",
        "password": "PermanentSecret2026!"
    })
    assert res_login.status_code == 200


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_revocation(client: AsyncClient):
    # 1. Signup
    res = await client.post("/api/v1/auth/signup", json={
        "email": "rotation.user@beeline.io",
        "password": "SecurePassword123!"
    })
    data = res.json()
    refresh_token_1 = data["refresh_token"]

    # 2. Refresh token rotation
    res_refresh = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token_1
    })
    assert res_refresh.status_code == 200
    refresh_data = res_refresh.json()
    refresh_token_2 = refresh_data["refresh_token"]
    assert refresh_token_2 != refresh_token_1

    # 3. Old refresh token cannot be reused (Replay attack defense)
    res_replay = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token_1
    })
    assert res_replay.status_code == 401

    # 4. New refresh token works
    res_refresh_2 = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token_2
    })
    assert res_refresh_2.status_code == 200


@pytest.mark.asyncio
async def test_sessions_management(client: AsyncClient):
    # Signup
    res = await client.post("/api/v1/auth/signup", json={
        "email": "session.tester@beeline.io",
        "password": "SecurePassword123!",
        "device_info": "Desktop Firefox"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List sessions
    res_sess = await client.get("/api/v1/users/me/sessions", headers=headers)
    assert res_sess.status_code == 200
    sessions = res_sess.json()
    assert len(sessions) >= 1
    session_id = sessions[0]["session_id"]

    # Revoke single session
    res_rev = await client.delete(f"/api/v1/users/me/sessions/{session_id}", headers=headers)
    assert res_rev.status_code == 200
    assert "revoked successfully" in res_rev.json()["message"]

    # Revoke all sessions
    res_rev_all = await client.delete("/api/v1/users/me/sessions", headers=headers)
    assert res_rev_all.status_code == 200


@pytest.mark.asyncio
async def test_guest_cannot_setup_mfa(client: AsyncClient):
    res_guest = await client.post("/api/v1/auth/guest", json={})
    token = res_guest.json()["access_token"]
    res = await client.post(
        "/api/v1/auth/mfa/setup",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "Guest accounts cannot enable Multi-Factor Authentication" in res.json()["detail"]


@pytest.mark.asyncio
async def test_unauthorized_endpoints(client: AsyncClient):
    res_me = await client.get("/api/v1/users/me")
    assert res_me.status_code == 401
