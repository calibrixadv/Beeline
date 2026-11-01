import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_popular_corridors(client: AsyncClient):
    resp = await client.get("/api/v1/routes/corridors/popular")
    assert resp.status_code == 200
    data = resp.json()
    assert "corridors" in data
    assert len(data["corridors"]) >= 4

    # Verify first corridor (Galați ⇄ București)
    corridor = data["corridors"][0]
    assert corridor["origin"] == "Galați"
    assert corridor["destination"] == "București Nord"
    assert corridor["label"] == "Galați ⇄ București"
    assert "frequency" in corridor
    assert "fastestDurationFormatted" in corridor
    assert corridor["minFareLei"] > 0
    assert len(corridor["primaryOperators"]) >= 1
