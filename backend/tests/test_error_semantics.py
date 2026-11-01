import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_error_envelope_on_404(client: AsyncClient):
    resp = await client.get("/api/v1/trains/nonexistent-train-999")
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "not found" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_error_envelope_on_401(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "authentication credentials" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_error_envelope_on_400(client: AsyncClient):
    resp = await client.get("/api/v1/stations/search?query=X")
    assert resp.status_code == 400
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "BAD_REQUEST"
    assert "at least 2 characters" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_error_envelope_on_422_validation(client: AsyncClient):
    # Missing required fields
    resp = await client.post("/api/v1/auth/signup", json={"email": "not-an-email"})
    assert resp.status_code == 422
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data["error"]
    assert len(data["error"]["details"]) >= 1
