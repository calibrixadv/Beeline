import pytest
from httpx import AsyncClient
from tests.conftest import signup_and_verify


@pytest.mark.asyncio
async def test_patch_user_profile(client: AsyncClient):
    # 1. Signup & verify
    signup_data = await signup_and_verify(client, {
        "email": "patch.profile@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Initial Name"
    })
    token = signup_data["access_token"]
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
