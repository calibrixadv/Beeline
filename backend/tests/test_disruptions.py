import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_all_disruptions(client: AsyncClient):
    resp = await client.get("/api/v1/disruptions")
    assert resp.status_code == 200
    data = resp.json()
    assert "disruptions" in data
    assert len(data["disruptions"]) >= 3

    first = data["disruptions"][0]
    assert "id" in first
    assert "operator" in first
    assert "severity" in first
    assert "headline" in first
    assert "description" in first
    assert "affectedLines" in first
    assert len(first["affectedLines"]) >= 1
    assert "startsAt" in first


@pytest.mark.asyncio
async def test_filter_disruptions_by_severity(client: AsyncClient):
    resp = await client.get("/api/v1/disruptions?severity=WARNING")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["disruptions"]) >= 1
    for d in data["disruptions"]:
        assert d["severity"] == "WARNING"


@pytest.mark.asyncio
async def test_filter_disruptions_by_operator(client: AsyncClient):
    resp = await client.get("/api/v1/disruptions?operator=Metrorex")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["disruptions"]) >= 1
    for d in data["disruptions"]:
        assert "Metrorex" in d["operator"]


@pytest.mark.asyncio
async def test_filter_disruptions_by_line(client: AsyncClient):
    resp = await client.get("/api/v1/disruptions?line=M2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["disruptions"]) >= 1
    assert any("M2" in d["affectedLines"] for d in data["disruptions"])
