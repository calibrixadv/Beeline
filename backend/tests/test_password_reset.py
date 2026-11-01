import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_password_reset_flow(client: AsyncClient):
    # 1. Signup user
    await client.post("/api/v1/auth/signup", json={
        "email": "reset.tester@beeline.io",
        "password": "OldPassword123!"
    })

    # 2. Request password reset token
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={
        "email": "reset.tester@beeline.io"
    })
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json().get("reset_token")
    assert reset_token is not None

    # 3. Reset password with token
    reset_res = await client.post("/api/v1/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "NewSecretPassword2026!"
    })
    assert reset_res.status_code == 200
    assert "successfully" in reset_res.json()["message"]

    # 4. Old password no longer works
    old_login = await client.post("/api/v1/auth/login", json={
        "email": "reset.tester@beeline.io",
        "password": "OldPassword123!"
    })
    assert old_login.status_code == 401

    # 5. New password works
    new_login = await client.post("/api/v1/auth/login", json={
        "email": "reset.tester@beeline.io",
        "password": "NewSecretPassword2026!"
    })
    assert new_login.status_code == 200

    # 6. Used token cannot be reused
    reuse_res = await client.post("/api/v1/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "AnotherPassword123!"
    })
    assert reuse_res.status_code == 400
