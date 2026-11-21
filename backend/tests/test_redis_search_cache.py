from datetime import datetime
from unittest.mock import patch
import pytest
import redis
from httpx import AsyncClient

from app.core.redis import get_redis
from app.services.routing_service import routing_service
from app.services.search_cache_service import search_cache_service, BUCHAREST_TZ


@pytest.mark.asyncio
async def test_route_plan_cache_hit_and_upstream_invoked_once(client: AsyncClient):
    """
    Test 1: Calling POST /api/v1/routes/plan twice with the same route & date returns
    X-Beeline-Cache: MISS on the 1st call and X-Beeline-Cache: HIT on the 2nd call,
    verifying the underlying routing/upstream function is invoked ONLY ONCE!
    """
    payload = {
        "origin": {"name": "Galați", "city": "Galați"},
        "destination": {"name": "București Nord", "city": "București"},
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
    }

    with patch.object(routing_service, "plan_routes", wraps=routing_service.plan_routes) as spy_plan:
        # Call 1: Expect cache MISS
        res1 = await client.post("/api/v1/routes/plan", json=payload)
        assert res1.status_code == 200
        assert res1.headers.get("X-Beeline-Cache") == "MISS"
        assert res1.headers.get("X-Beeline-Cache-Source") == "origin"
        assert spy_plan.call_count == 1
        data1 = res1.json()

        # Call 2: Expect cache HIT without calling upstream routing_service again
        res2 = await client.post("/api/v1/routes/plan", json=payload)
        assert res2.status_code == 200
        assert res2.headers.get("X-Beeline-Cache") == "HIT"
        assert res2.headers.get("X-Beeline-Cache-Source") in ["redis", "memory"]
        assert spy_plan.call_count == 1  # Still 1: never invoked on hit!
        data2 = res2.json()

        assert len(data1["plans"]) == len(data2["plans"])
        assert data1["totalDayRoutes"] == data2["totalDayRoutes"]


@pytest.mark.asyncio
async def test_diacritic_and_case_normalization_hits_same_key(client: AsyncClient):
    """
    Test 2: Diacritic/case normalization: searching 'galati' -> 'bucuresti nord'
    then 'Galați' -> 'București Nord' on the same date hits the SAME Redis cache key (X-Beeline-Cache: HIT).
    """
    payload_raw = {
        "origin": "galati",
        "destination": "bucuresti nord",
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
    }
    payload_diacritics = {
        "origin": "Galați",
        "destination": "București Nord",
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
    }

    # Call 1 with lowercase without diacritics -> MISS
    res1 = await client.post("/api/v1/routes/plan", json=payload_raw)
    assert res1.status_code == 200
    assert res1.headers.get("X-Beeline-Cache") == "MISS"
    assert res1.headers.get("X-Beeline-Cache-Source") == "origin"

    # Call 2 with proper Romanian diacritics and capitalization -> HIT
    res2 = await client.post("/api/v1/routes/plan", json=payload_diacritics)
    assert res2.status_code == 200
    assert res2.headers.get("X-Beeline-Cache") == "HIT"
    assert res2.headers.get("X-Beeline-Cache-Source") in ["redis", "memory"]


@pytest.mark.asyncio
async def test_trains_search_miss_hit_and_recent_trains_index(client: AsyncClient):
    """
    Test 3: Calling GET /api/v1/trains?searchQuery=r2300&date=... twice returns MISS
    then HIT and records the search in beeline:recent_searches:trains.
    """
    url = "/api/v1/trains?searchQuery=r2300&date=2026-11-21"

    # Call 1 -> MISS
    res1 = await client.get(url)
    assert res1.status_code == 200
    assert res1.headers.get("X-Beeline-Cache") == "MISS"
    assert res1.headers.get("X-Beeline-Cache-Source") == "origin"

    # Call 2 -> HIT
    res2 = await client.get(url)
    assert res2.status_code == 200
    assert res2.headers.get("X-Beeline-Cache") == "HIT"
    assert res2.headers.get("X-Beeline-Cache-Source") in ["redis", "memory"]

    # Verify search is recorded in beeline:recent_searches:trains
    r = get_redis()
    items = await r.zrevrange("beeline:recent_searches:trains", 0, -1)
    assert len(items) >= 1
    assert any("2300" in item for item in items)


@pytest.mark.asyncio
async def test_recent_searches_zset_trims_to_100_and_endpoint_ordering(client: AsyncClient):
    """
    Test 4: Verify beeline:recent_searches:routes ZSET trims strictly at max 100 entries
    (bounded memory for Render Key Value) and GET /api/v1/routes/recent-searches returns
    the most recent searches newest-first.
    """
    # Insert 105 distinct route searches into the ring
    for i in range(105):
        await search_cache_service.record_recent_route_search(
            origin=f"Station_{i}",
            destination="București Nord",
            date="2026-11-21",
            cache_key=f"beeline:cache:route_plan:v1:station_{i}:bucuresti_nord:2026-11-21:hash",
            result_count=i + 1,
        )

    # 1. Verify Redis ZSET card is capped at strictly 100
    r = get_redis()
    total_in_zset = await r.zcard("beeline:recent_searches:routes")
    assert total_in_zset == 100

    # 2. Verify GET /api/v1/routes/recent-searches returns newest-first
    resp = await client.get("/api/v1/routes/recent-searches?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    searches = data["recentSearches"]
    assert len(searches) == 10
    # Last inserted (i=104) must be the first item
    assert searches[0]["origin"] == "Station_104"
    assert searches[1]["origin"] == "Station_103"
    assert searches[9]["origin"] == "Station_95"

    stats = data["stats"]
    assert stats["recentRouteSearchesCount"] == 100
    assert stats["backend"] in ["redis", "memory"]
    assert stats["redisConnected"] is True


@pytest.mark.asyncio
async def test_upstream_error_never_cached_and_memory_fallback(client: AsyncClient):
    """
    Test 5: Verify upstream error/exception is NEVER cached (next request retries upstream cleanly),
    and verify graceful fallback to in-memory LRU when Redis raises ConnectionError.
    """
    payload = {
        "origin": "Galați",
        "destination": "București Nord",
        "departureTime": "2026-11-21T08:00:00+02:00",
        "allowedModes": ["TRAIN"],
    }

    # Part A: Upstream error (5xx or gateway failure) is never cached
    from fastapi import HTTPException
    with patch.object(routing_service, "plan_routes", side_effect=HTTPException(status_code=502, detail="Upstream InfoFer unavailable")):
        err_res = await client.post("/api/v1/routes/plan", json=payload)
        assert err_res.status_code == 502

    # Clean retry without exception succeeds and returns MISS (proving 502 was not cached)
    retry_res = await client.post("/api/v1/routes/plan", json=payload)
    assert retry_res.status_code == 200
    assert retry_res.headers.get("X-Beeline-Cache") == "MISS"
    assert retry_res.headers.get("X-Beeline-Cache-Source") == "origin"

    # Part B: In-memory LRU fallback when Redis drops connection
    payload_mem = {
        "origin": "București Nord",
        "destination": "Brașov",
        "departureTime": "2026-11-21T09:00:00+02:00",
        "allowedModes": ["TRAIN"],
        "minimumBufferMinutes": 25,
    }
    r = get_redis()
    with patch.object(r, "get", side_effect=redis.ConnectionError("Redis connection dropped")):
        with patch.object(r, "set", side_effect=redis.ConnectionError("Redis connection dropped")):
            with patch.object(r, "ping", side_effect=redis.ConnectionError("Redis connection dropped")):
                # 1st call in fallback mode -> MISS, cached to local RAM
                mem1 = await client.post("/api/v1/routes/plan", json=payload_mem)
                assert mem1.status_code == 200
                assert mem1.headers.get("X-Beeline-Cache") == "MISS"

                # 2nd call in fallback mode -> HIT from local RAM!
                mem2 = await client.post("/api/v1/routes/plan", json=payload_mem)
                assert mem2.status_code == 200
                assert mem2.headers.get("X-Beeline-Cache") == "HIT"
                assert mem2.headers.get("X-Beeline-Cache-Source") == "memory"

                # Stats reflect memory backend
                stats = await search_cache_service.get_cache_stats()
                assert stats["backend"] == "memory"
                assert stats["redisConnected"] is False
