import asyncio
import time
from unittest.mock import patch
import pytest
import fakeredis.aioredis
import pytest_asyncio
from app.core.config import settings
from app.core.redis import (
    close_redis_pool,
    get_redis,
    get_redis_client,
    get_redis_pool,
    redis_health_check,
    set_custom_redis_client,
    set_redis_pool,
)
from app.main import app, lifespan
from app.services.feature_store_service import (
    DEFAULT_CARRIER_FEATURES,
    DEFAULT_CORRIDOR_FEATURES,
    DEFAULT_STATION_FEATURES,
    FeatureStoreService,
    corridor_feature_sync_worker,
    corridor_hash,
    slugify_carrier,
    slugify_corridor,
    slugify_station,
)
from app.services.idempotency_service import IdempotencyService
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession


@pytest_asyncio.fixture(autouse=True)
async def cleanup_redis():
    """Ensures Redis state and overrides are clean between tests."""
    yield
    set_custom_redis_client(None)
    set_redis_pool(None)
    await close_redis_pool()


@pytest.mark.asyncio
async def test_redis_connection_pool():
    """Validates Redis connection pool lifecycle, client retrieval, dependency, and health check."""
    # 1. Connection pool initialization
    pool = get_redis_pool()
    assert pool is not None
    client = get_redis()
    assert client is not None

    # Singleton client verification
    client2 = get_redis()
    assert client is client2

    # 2. Dependency test: get_redis_client yields client without destroying pool
    dep_gen = get_redis_client()
    yielded_client = await anext(dep_gen)
    assert yielded_client is client
    # Clean termination of generator
    try:
        await anext(dep_gen)
    except StopAsyncIteration:
        pass

    # 3. Offline health check should return False without raising exceptions
    class FailingPingRedis:
        async def ping(self):
            raise ConnectionError("Redis unreachable")

    set_custom_redis_client(FailingPingRedis())
    is_healthy = await redis_health_check()
    assert is_healthy is False
    set_custom_redis_client(None)

    # 4. Clean pool closure
    await close_redis_pool()

    # 5. Active health check with FakeRedis
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)
    is_healthy = await redis_health_check()
    assert is_healthy is True
    await fake_client.aclose()


@pytest.mark.asyncio
async def test_feature_store_corridor_slugification_and_edge_cases():
    """Validates comprehensive corridor and station slugification across Romanian network edge cases."""
    # 1. Standard city pairs
    assert slugify_corridor("Galați", "București Nord") == "galati-bucuresti_nord"
    assert slugify_corridor("București Nord", "Brașov") == "bucuresti_nord-brasov"
    assert slugify_corridor("Cluj-Napoca", "Oradea") == "cluj_napoca-oradea"
    assert slugify_corridor("Timișoara Nord", "Arad") == "timisoara_nord-arad"

    # 2. Romanian multi-segment hyphenated cities (preserving city boundaries)
    assert slugify_corridor("Drobeta-Turnu Severin", "Craiova") == "drobeta_turnu_severin-craiova"
    assert slugify_corridor("Târgu-Mureș", "Brașov") == "targu_mures-brasov"
    assert slugify_corridor("Piatra-Neamț", "Bacău") == "piatra_neamt-bacau"

    # 3. Single string corridor with various directional delimiters
    assert slugify_corridor("Cluj-Napoca - Oradea") == "cluj_napoca-oradea"
    assert slugify_corridor("Drobeta-Turnu Severin - Craiova") == "drobeta_turnu_severin-craiova"
    assert slugify_corridor("București Nord - Brașov") == "bucuresti_nord-brasov"
    assert slugify_corridor("Galați ⇄ București Nord") == "galati-bucuresti_nord"
    assert slugify_corridor("Galați -> București Nord") == "galati-bucuresti_nord"
    assert slugify_corridor("Galați to București Nord") == "galati-bucuresti_nord"
    assert slugify_corridor("galati-bucuresti_nord") == "galati-bucuresti_nord"
    assert slugify_corridor("cluj_napoca-oradea") == "cluj_napoca-oradea"

    # 4. Single-city inputs without destinations (must not append trailing dash)
    assert slugify_corridor("galati") == "galati"
    assert slugify_corridor("bucuresti_nord") == "bucuresti_nord"
    assert slugify_corridor("") == ""

    # 5. Station slugification
    assert slugify_station("BCT") == "bct"
    assert slugify_station("Gara de Nord") == "gara_de_nord"
    assert slugify_station("RO:BCT") == "ro_bct"
    assert slugify_station("") == ""

    # 6. Carrier slugification
    assert slugify_carrier("CFR Călători") == "cfr-calatori"
    assert slugify_carrier("Astra Trans Carpatic") == "astra-trans-carpatic"
    assert slugify_carrier("Transferoviar Călători") == "transferoviar-calatori"
    assert slugify_carrier("Metrorex") == "metrorex"
    assert slugify_carrier("Transurb") == "transurb"
    assert slugify_carrier("") == ""

    # 7. Stable Corridor Hashing (% 1000)
    ch1 = corridor_hash("galati-bucuresti_nord")
    ch2 = FeatureStoreService.corridor_hash("galati-bucuresti_nord")
    assert 0 <= ch1 < 1000
    assert ch1 == ch2
    assert corridor_hash("") == 0
    assert corridor_hash(None) == 0


@pytest.mark.asyncio
async def test_feature_store_batch_reads_and_carriers():
    """Validates corridor, station, and carrier fallback defaults and pipelined batch reads."""
    # 1. Fallbacks when Redis is offline or keys missing
    corridor_defaults = await FeatureStoreService.get_corridor_features("missing-corridor")
    assert corridor_defaults["active_disruptions_count"] == 0
    assert corridor_defaults["corridor_punctuality_rate"] == 0.88
    assert corridor_defaults["weather_condition"] == "CLEAR"
    assert corridor_defaults["rolling_delay_3h"] == 0.0

    station_defaults = await FeatureStoreService.get_station_features("nonexistent")
    assert station_defaults["congestion_index"] == 0.30
    assert station_defaults["platform_reassignment_risk"] == 0
    assert station_defaults["punctuality_rate"] == 0.88

    carrier_defaults = await FeatureStoreService.get_carrier_features("nonexistent-carrier")
    assert carrier_defaults["baseline_punctuality"] == 0.88
    assert carrier_defaults["chronic_delay_minutes"] == 5.0
    assert carrier_defaults["active_incident_count"] == 0

    # 2. Pipelined batch reads with active Redis
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    # Populate sample data
    await FeatureStoreService.set_corridor_features("galati-bucuresti_nord", {
        "active_disruptions_count": 2,
        "max_disruption_severity": 2,
        "rolling_delay_3h": 12.5,
        "rolling_delay_24h": 8.0,
        "corridor_punctuality_rate": 0.86,
        "weather_condition": "RAIN",
        "weather_alert_severity": 1,
        "external_factors_score": 0.35,
        "updated_at": "2026-11-02T12:00:00Z"
    })

    await FeatureStoreService.set_station_features("bct", {
        "congestion_index": 0.65,
        "avg_transfer_delay": 4.2,
        "transfer_delay_buffer_variance": 4.2,
        "platform_reassignment_risk": 1,
        "active_disruptions_count": 1,
        "weather_alert_severity": 0,
        "punctuality_rate": 0.85,
        "updated_at": "2026-11-02T12:00:00Z"
    })

    await FeatureStoreService.set_carrier_features("cfr-calatori", {
        "baseline_punctuality": 0.82,
        "chronic_delay_minutes": 14.5,
        "active_incident_count": 2,
        "updated_at": "2026-11-02T12:00:00Z"
    })

    # Single reads
    c_res = await FeatureStoreService.get_corridor_features("galati-bucuresti_nord")
    assert c_res["active_disruptions_count"] == 2
    assert c_res["weather_condition"] == "RAIN"

    s_res = await FeatureStoreService.get_station_features("bct")
    assert s_res["congestion_index"] == 0.65
    assert s_res["punctuality_rate"] == 0.85

    car_res = await FeatureStoreService.get_carrier_features("cfr-calatori")
    assert car_res["baseline_punctuality"] == 0.82
    assert car_res["chronic_delay_minutes"] == 14.5

    # Benchmark batched read latency
    t0 = time.perf_counter()
    batch_res = await FeatureStoreService.batch_get_corridor_features([
        "galati-bucuresti_nord",
        "bucuresti_nord-brasov",
        "missing-corridor-id"
    ])
    duration_ms = (time.perf_counter() - t0) * 1000.0

    assert duration_ms < 20.0
    assert len(batch_res) == 3
    assert batch_res["galati-bucuresti_nord"]["active_disruptions_count"] == 2
    assert batch_res["missing-corridor-id"]["active_disruptions_count"] == 0

    # Batch station reads
    st_batch = await FeatureStoreService.batch_get_station_features(["bct", "unknown-station"])
    assert len(st_batch) == 2
    assert st_batch["bct"]["congestion_index"] == 0.65
    assert st_batch["unknown-station"]["congestion_index"] == 0.30

    # Batch carrier reads
    car_batch = await FeatureStoreService.batch_get_carrier_features(["cfr-calatori", "metrorex"])
    assert len(car_batch) == 2
    assert car_batch["cfr-calatori"]["baseline_punctuality"] == 0.82
    assert car_batch["metrorex"]["baseline_punctuality"] == 0.88  # fallback

    await fake_client.aclose()


@pytest.mark.asyncio
async def test_sync_worker_execution():
    """Validates feature aggregation and background sync worker lifecycle."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    # 1. Execute sync_all_features directly
    result = await FeatureStoreService.sync_all_features()
    assert "corridors" in result
    assert "stations" in result
    assert "carriers" in result
    assert len(result["corridors"]) > 0
    assert len(result["stations"]) > 0
    assert len(result["carriers"]) > 0

    # 2. Check that Redis was populated with corridor, station, and carrier hashes
    brasov_features = await FeatureStoreService.get_corridor_features("bucuresti_nord-brasov")
    assert brasov_features["active_disruptions_count"] >= 1
    assert brasov_features["weather_condition"] == "RAIN"
    assert brasov_features["rolling_delay_3h"] >= 10.0

    brasov_short = await FeatureStoreService.get_corridor_features("bucuresti-brasov")
    assert brasov_short["weather_condition"] == "RAIN"

    bct_features = await FeatureStoreService.get_station_features("bct")
    assert bct_features["congestion_index"] == 0.65
    assert bct_features["platform_reassignment_risk"] == 1
    assert bct_features["punctuality_rate"] == 0.85

    cfr_features = await FeatureStoreService.get_carrier_features("cfr-calatori")
    assert cfr_features["baseline_punctuality"] == 0.82
    assert cfr_features["chronic_delay_minutes"] == 14.5

    metrorex_features = await FeatureStoreService.get_carrier_features("metrorex")
    assert metrorex_features["baseline_punctuality"] == 0.98

    # 3. Test background worker lifecycle
    task = asyncio.create_task(corridor_feature_sync_worker())
    await asyncio.sleep(0.05)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    assert task.cancelled() or task.done()
    await fake_client.aclose()


@pytest.mark.asyncio
async def test_fastapi_lifespan_integration():
    """Validates FastAPI lifespan startup worker initialization and graceful termination."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    async with lifespan(app):
        assert hasattr(app.state, "corridor_feature_sync_task")
        sync_task = app.state.corridor_feature_sync_task
        assert not sync_task.done()

    # After lifespan exit, worker should be cancelled and finished
    assert sync_task.done() or sync_task.cancelled()
    await fake_client.aclose()


@pytest.mark.asyncio
async def test_idempotency_service_with_active_redis(db_session: AsyncSession):
    """Validates Redis atomic lock (SET NX EX) and seamless concurrency protection in IdempotencyService."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    user_id = "usr-test-redis-idem"
    key = "idem:key:001"
    payload_hash = "abc123hash"

    # 1. First worker claims the key: succeeds
    res1 = await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)
    assert res1 is None

    # Verify lock exists in Redis
    redis_lock_key = f"idemp:{user_id}:{key}"
    val = await fake_client.get(redis_lock_key)
    assert val == payload_hash

    # 2. Second concurrent worker arrives with matching hash: raises 409 Conflict
    with pytest.raises(HTTPException) as exc_info:
        await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)
    assert exc_info.value.status_code == 409
    assert "in-flight" in exc_info.value.detail.lower()

    # 3. Second concurrent worker arrives with different hash: raises 422
    with pytest.raises(HTTPException) as exc_info_mismatch:
        await IdempotencyService.claim_key(db_session, user_id, key, "different_hash")
    assert exc_info_mismatch.value.status_code == 422

    # 4. Error release cleans up Redis lock
    await IdempotencyService.release_key_on_error(db_session, user_id, key)
    val_after_err = await fake_client.get(redis_lock_key)
    assert val_after_err is None

    # 5. After error release, can claim again
    res3 = await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)
    assert res3 is None

    # 6. Complete key clears Redis lock and sets SQL COMPLETED
    await IdempotencyService.complete_key(
        db_session, user_id, key, payload_hash, 200, {"success": True}
    )
    val_after_complete = await fake_client.get(redis_lock_key)
    assert val_after_complete is None

    # 7. Next request replay returns cached response
    code, cached = await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)
    assert code == 200
    assert cached == {"success": True}

    await fake_client.aclose()


@pytest.mark.asyncio
async def test_idempotency_concurrency_race_condition(db_session: AsyncSession):
    """Simulates 10 concurrent async workers attempting to claim the same idempotency key simultaneously."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    user_id = "usr-concurrent-worker"
    key = "idem:concurrent:999"
    payload_hash = "concurrenthash999"

    success_count = 0
    conflict_count = 0

    async def worker_attempt():
        nonlocal success_count, conflict_count
        try:
            res = await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)
            if res is None:
                success_count += 1
        except HTTPException as exc:
            if exc.status_code == 409:
                conflict_count += 1

    # Launch 10 workers in parallel
    await asyncio.gather(*(worker_attempt() for _ in range(10)))

    # Exactly 1 worker should claim the key; 9 workers should encounter 409 Conflict
    assert success_count == 1
    assert conflict_count == 9

    await fake_client.aclose()


@pytest.mark.asyncio
async def test_idempotency_database_error_cleans_redis_lock(db_session: AsyncSession):
    """Asserts that unexpected database failures during claim_key release the acquired Redis lock."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    user_id = "usr-db-fail"
    key = "idem:db:fail"
    payload_hash = "failhash"
    redis_lock_key = f"idemp:{user_id}:{key}"

    # Mock db.commit to simulate an OperationalError
    with patch.object(db_session, "commit", side_effect=RuntimeError("Simulated DB Disk Failure")):
        with pytest.raises(RuntimeError):
            await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)

    # Redis lock must NOT remain held!
    val = await fake_client.get(redis_lock_key)
    assert val is None

    await fake_client.aclose()


@pytest.mark.asyncio
async def test_idempotency_db_execute_error_cleans_redis_lock(db_session: AsyncSession):
    """Asserts that database disconnects / errors during query execution in claim_key clean up Redis lock."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    user_id = "usr-db-exec-fail"
    key = "idem:db:exec:fail"
    payload_hash = "execfailhash"
    redis_lock_key = f"idemp:{user_id}:{key}"

    # Mock db.execute to simulate a database query error / connection drop
    with patch.object(db_session, "execute", side_effect=ConnectionError("Simulated DB Connection Timeout")):
        with pytest.raises(ConnectionError):
            await IdempotencyService.claim_key(db_session, user_id, key, payload_hash)

    # Redis lock must NOT remain held!
    val = await fake_client.get(redis_lock_key)
    assert val is None

    await fake_client.aclose()


@pytest.mark.asyncio
async def test_offline_graceful_degradation():
    """Asserts that all FeatureStore operations degrade gracefully when Redis is offline."""
    class OfflineRedis:
        async def hgetall(self, *args, **kwargs):
            raise ConnectionError("Redis offline")
        def pipeline(self, *args, **kwargs):
            raise ConnectionError("Redis offline")

    set_custom_redis_client(OfflineRedis())

    # Corridor features fallback
    c = await FeatureStoreService.get_corridor_features("bucuresti-brasov")
    assert c["corridor_punctuality_rate"] == 0.88

    # Station features fallback
    s = await FeatureStoreService.get_station_features("bct")
    assert s["congestion_index"] == 0.30
    assert s["punctuality_rate"] == 0.88

    # Carrier features fallback
    car = await FeatureStoreService.get_carrier_features("cfr-calatori")
    assert car["baseline_punctuality"] == 0.88

    # Batch read fallback
    b = await FeatureStoreService.batch_get_corridor_features(["c1", "c2"])
    assert len(b) == 2
    assert b["c1"]["weather_condition"] == "CLEAR"

    car_b = await FeatureStoreService.batch_get_carrier_features(["cfr-calatori"])
    assert len(car_b) == 1
    assert car_b["cfr-calatori"]["baseline_punctuality"] == 0.88

    # Sync features does not crash
    sync_res = await FeatureStoreService.sync_all_features()
    assert "corridors" in sync_res
    assert "carriers" in sync_res


@pytest.mark.asyncio
async def test_feature_store_ttl_expiration():
    """Validates that feature store writes set proper TTL expiration on Redis keys."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_custom_redis_client(fake_client)

    corridor_key = f"{settings.REDIS_FEATURE_PREFIX}corridor:galati-bucuresti_nord"
    await FeatureStoreService.set_corridor_features("galati-bucuresti_nord", {
        "active_disruptions_count": 1,
        "rolling_delay_3h": 4.5,
    })

    # Verify TTL is set and <= settings.REDIS_FEATURE_TTL_SECONDS
    ttl = await fake_client.ttl(corridor_key)
    assert ttl > 0
    assert ttl <= settings.REDIS_FEATURE_TTL_SECONDS

    # Verify station key TTL
    station_key = f"{settings.REDIS_FEATURE_PREFIX}station:bct"
    await FeatureStoreService.set_station_features("bct", {
        "congestion_index": 0.5,
    })
    st_ttl = await fake_client.ttl(station_key)
    assert st_ttl > 0
    assert st_ttl <= settings.REDIS_FEATURE_TTL_SECONDS

    await fake_client.aclose()

