import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_session_current_flag_and_scoped_revocation(client: AsyncClient):
    # 1. Signup user on Device 1
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "multi.device@beeline.io",
        "password": "SecurePassword123!",
        "device_info": "MacBook Chrome"
    })
    token_1 = signup_res.json()["access_token"]
    refresh_1 = signup_res.json()["refresh_token"]
    headers_1 = {"Authorization": f"Bearer {token_1}"}

    # 2. Login user on Device 2
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "multi.device@beeline.io",
        "password": "SecurePassword123!",
        "device_info": "iPhone Safari"
    })
    token_2 = login_res.json()["access_token"]
    refresh_2 = login_res.json()["refresh_token"]
    headers_2 = {"Authorization": f"Bearer {token_2}"}

    # 3. Inspect sessions from Device 1
    sess_res_1 = await client.get("/api/v1/users/me/sessions", headers=headers_1)
    assert sess_res_1.status_code == 200
    sessions_1 = sess_res_1.json()
    assert len(sessions_1) == 2

    # Exactly one session must have is_current = True
    current_count_1 = sum(1 for s in sessions_1 if s["is_current"])
    assert current_count_1 == 1
    current_sess_1 = next(s for s in sessions_1 if s["is_current"])
    assert current_sess_1["device_info"] == "MacBook Chrome"

    # 4. Inspect sessions from Device 2
    sess_res_2 = await client.get("/api/v1/users/me/sessions", headers=headers_2)
    assert sess_res_2.status_code == 200
    sessions_2 = sess_res_2.json()
    assert len(sessions_2) == 2
    current_count_2 = sum(1 for s in sessions_2 if s["is_current"])
    assert current_count_2 == 1
    current_sess_2 = next(s for s in sessions_2 if s["is_current"])
    assert current_sess_2["device_info"] == "iPhone Safari"

    # 5. Device 1 revokes all OTHER sessions (DELETE /api/v1/users/me/sessions)
    rev_all_res = await client.delete("/api/v1/users/me/sessions", headers=headers_1)
    assert rev_all_res.status_code == 200

    # Device 1 remains logged in and active
    me_res_1 = await client.get("/api/v1/users/me", headers=headers_1)
    assert me_res_1.status_code == 200
    assert me_res_1.json()["email"] == "multi.device@beeline.io"

    # Only 1 session remains active in list
    active_sessions = (await client.get("/api/v1/users/me/sessions", headers=headers_1)).json()
    assert len(active_sessions) == 1
    assert active_sessions[0]["is_current"] is True

    # Device 2's refresh token is now revoked
    rev_refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_2})
    assert rev_refresh.status_code == 401

    # 6. Device 1 logs out
    logout_res = await client.post("/api/v1/auth/logout", headers=headers_1)
    assert logout_res.status_code == 200
    # Refresh token 1 is now revoked
    rev_refresh_1 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_1})
    assert rev_refresh_1.status_code == 401
