import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_patch_user_profile(client: AsyncClient):
    # 1. Signup
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "patch.profile@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Initial Name"
    })
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update profile
    patch_res = await client.patch(
        "/api/v1/users/me",
        json={"full_name": "Alexandru Popa", "preferences": '{"currency": "RON", "notifications": true}'},
        headers=headers
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["full_name"] == "Alexandru Popa"
    assert 'notifications' in patched_data["preferences"]

    # 3. Verify via GET /users/me
    me_res = await client.get("/api/v1/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["full_name"] == "Alexandru Popa"


@pytest.mark.asyncio
async def test_patch_user_profile_unauthorized(client: AsyncClient):
    resp = await client.patch("/api/v1/users/me", json={"full_name": "Intruder"})
    assert resp.status_code == 401
