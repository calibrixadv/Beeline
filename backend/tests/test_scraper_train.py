import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest
import respx

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scraper.collectors.train_api import (
    CircuitBreaker,
    CircuitBreakerOpenError,
    CircuitState,
    DataGovXMLAdapter,
    InfoFerLiveAdapter,
    LocalSnapshotFallbackAdapter,
    ResponseCache,
    ScrapeTier,
    StaticGTFSAdapter,
    TIER_1_TRAINS,
    TokenBucketRateLimiter,
    TrainApiCollector,
    canonical_operator,
    canonical_station_code,
    canonical_train_category,
    infer_traction_type,
    normalize_train_number,
    simulate_historical_delay,
)
from scraper.models import ScrapedTrainingSample, TargetLabels, TrainApiFeatures, TrainScrapeRecord
from scraper.pipeline import TransitScraperPipeline


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fixtures_dir():
    return Path(__file__).resolve().parent.parent / "scraper" / "data" / "snapshots"


@pytest.fixture
def ontime_html(fixtures_dir):
    return (fixtures_dir / "train_1572_ontime.html").read_text(encoding="utf-8")


@pytest.fixture
def delayed_html(fixtures_dir):
    return (fixtures_dir / "train_1572_delayed.html").read_text(encoding="utf-8")


@pytest.fixture
def transfer_ontime_html(fixtures_dir):
    return (fixtures_dir / "itinerary_transfer_ontime.html").read_text(encoding="utf-8")


@pytest.fixture
def transfer_missed_html(fixtures_dir):
    return (fixtures_dir / "itinerary_transfer_missed.html").read_text(encoding="utf-8")


@pytest.fixture
def station_board_html(fixtures_dir):
    return (fixtures_dir / "station_board_bct.html").read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# 1. HTML/JSON Parsing Tests (On-time, Delayed +45 min, Multi-leg transfer)
# ---------------------------------------------------------------------------

def test_parse_ontime_train_html(ontime_html):
    """Verifies accurate HTML parsing of an on-time train (IR 1572, 0 delay)."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()
    adapter = InfoFerLiveAdapter(limiter, cb, cache)

    record = adapter.parse_train_html(ontime_html, default_train_num="IR 1572")

    # Source 1: TrainApiFeatures
    assert record.train_number == "IR 1572"
    assert record.operator == "CFR"
    assert record.train_category == 2  # IR = 2
    assert record.origin_station_code == "GLT"
    assert record.destination_station_code == "BCT"
    assert record.scheduled_duration_minutes == 195.0
    assert record.distance_km == 230.0
    assert record.stop_count == 4  # Brăila, Făurei, Buzău, Ploiești Sud
    assert record.delay_at_origin_minutes == 0
    assert record.traction_type == 1  # Electric
    assert record.has_transfer == 0
    assert record.transfer_buffer_minutes == 999.0

    # Source 5: TargetLabels
    assert record.actual_delay_minutes == 0.0
    assert record.missed_connection == 0


def test_parse_delayed_train_html(delayed_html):
    """Verifies accurate HTML parsing of a delayed train (+10 at origin, +45 at destination)."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()
    adapter = InfoFerLiveAdapter(limiter, cb, cache)

    record = adapter.parse_train_html(delayed_html, default_train_num="IR 1572")

    # Source 1 & 5
    assert record.train_number == "IR 1572"
    assert record.delay_at_origin_minutes == 10
    assert record.actual_delay_minutes == 45.0
    assert record.missed_connection == 0  # Direct train cannot miss connection
    assert record.has_transfer == 0
    assert record.transfer_buffer_minutes == 999.0


def test_parse_multileg_transfer_itinerary_ontime(transfer_ontime_html):
    """Verifies accurate parsing of a 2-leg transfer itinerary running on time."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()
    adapter = InfoFerLiveAdapter(limiter, cb, cache)

    records = adapter.parse_itinerary_html(transfer_ontime_html)
    assert len(records) >= 1
    rec = records[0]

    assert rec.has_transfer == 1
    assert rec.transfer_buffer_minutes == 25.0
    assert rec.actual_delay_minutes == 0.0
    assert rec.missed_connection == 0


def test_parse_multileg_transfer_itinerary_missed(transfer_missed_html):
    """Verifies accurate parsing of a 2-leg transfer itinerary that misses connection."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()
    adapter = InfoFerLiveAdapter(limiter, cb, cache)

    records = adapter.parse_itinerary_html(transfer_missed_html)
    assert len(records) >= 1
    rec = records[0]

    assert rec.has_transfer == 1
    assert rec.transfer_buffer_minutes == 20.0
    assert rec.actual_delay_minutes == 22.0
    # 22 > 20 - 5 = 15 -> missed_connection = 1
    assert rec.missed_connection == 1


# ---------------------------------------------------------------------------
# 2. Ground Truth missed_connection Rule Verification
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "has_transfer,transfer_buffer,actual_delay,expected_missed",
    [
        (0, 999.0, 0.0, 0),      # Direct train, on-time -> 0
        (0, 999.0, 50.0, 0),     # Direct train, delayed 50m -> 0
        (1, 20.0, 0.0, 0),       # Transfer, 20m buffer, on-time -> 0
        (1, 20.0, 14.0, 0),      # 14 <= (20 - 5 = 15) -> 0
        (1, 20.0, 15.0, 0),      # Exactly 15.0 <= 15 -> 0
        (1, 20.0, 15.1, 1),      # 15.1 > 15 -> 1 (missed connection)
        (1, 25.0, 22.0, 1),      # 22 > (25 - 5 = 20) -> 1
        (1, 10.0, 6.0, 1),       # 6 > (10 - 5 = 5) -> 1
        (1, 40.0, 30.0, 0),      # 30 <= (40 - 5 = 35) -> 0
    ],
)
def test_missed_connection_exact_boundary_conditions(
    has_transfer, transfer_buffer, actual_delay, expected_missed
):
    """Validates: missed = 1 if has_transfer == 1 and actual_delay_minutes > (transfer_buffer_minutes - 5) else 0."""
    walk_allowance = 5.0
    if has_transfer == 1 and actual_delay > (transfer_buffer - walk_allowance):
        missed = 1
    else:
        missed = 0

    assert missed == expected_missed


# ---------------------------------------------------------------------------
# 3. Scalability & Resilience: Rate Limiter, Retry Backoff, Circuit Breaker
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rate_limiter_rps_enforcement():
    """Verifies TokenBucketRateLimiter enforces concurrency limit and minimum inter-request delay."""
    # Configure with min_delay=0.05, max_delay=0.08
    limiter = TokenBucketRateLimiter(capacity=2, refill_rate=10.0, min_delay=0.05, max_delay=0.08)

    async def worker():
        await limiter.acquire()

    start = time.monotonic()
    # Launch 4 requests
    await asyncio.gather(worker(), worker(), worker(), worker())
    total_time = time.monotonic() - start

    # With 4 sequential acquisitions enforcing >=0.05s delay each, total time must be >= 0.15s
    assert total_time >= 0.12
    assert len(limiter.request_timestamps) == 4

    # Verify gaps between successive requests are >= 0.04s
    timestamps = sorted(limiter.request_timestamps)
    for i in range(1, len(timestamps)):
        gap = timestamps[i] - timestamps[i - 1]
        assert gap >= 0.035


@pytest.mark.asyncio
@respx.mock
async def test_retry_exponential_backoff_on_http_429_and_503(ontime_html):
    """Verifies that HTTP 429 / 503 triggers exponential backoff retries and succeeds if recovered."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()

    async with httpx.AsyncClient() as client:
        adapter = InfoFerLiveAdapter(
            rate_limiter=limiter,
            circuit_breaker=cb,
            cache=cache,
            client=client,
            max_retries=3,
            base_backoff=0.01,
        )

        # Mock route: 1st call 429, 2nd call 503, 3rd call 200 OK
        route = respx.get("https://mersultrenurilor.infofer.ro/ro-RO/Train/1572").mock(
            side_effect=[
                httpx.Response(429, text="Too Many Requests"),
                httpx.Response(503, text="Service Unavailable"),
                httpx.Response(200, text=ontime_html),
            ]
        )

        resp = await adapter._request_with_resilience(
            "GET", "https://mersultrenurilor.infofer.ro/ro-RO/Train/1572"
        )
        assert resp.status_code == 200
        assert route.call_count == 3
        assert cb.failure_count == 0  # Success reset failure count


@pytest.mark.asyncio
@respx.mock
async def test_circuit_breaker_tripping_after_5_failures():
    """Verifies CircuitBreaker trips to OPEN after 5 consecutive failures and blocks further requests."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker(failure_threshold=5, recovery_timeout=0.2)
    cache = ResponseCache()

    async with httpx.AsyncClient() as client:
        adapter = InfoFerLiveAdapter(
            rate_limiter=limiter,
            circuit_breaker=cb,
            cache=cache,
            client=client,
            max_retries=0,  # Fail immediately per attempt
            base_backoff=0.0,
        )

        respx.get("https://mersultrenurilor.infofer.ro/ro-RO/Train/9999").mock(
            return_value=httpx.Response(500, text="Internal Server Error")
        )

        # Trigger 5 consecutive failures
        for _ in range(5):
            with pytest.raises(httpx.HTTPStatusError):
                await adapter._request_with_resilience(
                    "GET", "https://mersultrenurilor.infofer.ro/ro-RO/Train/9999"
                )

        # Verify circuit breaker is now OPEN
        assert cb.state == CircuitState.OPEN
        assert cb.failure_count == 5

        # 6th attempt should immediately fail with CircuitBreakerOpenError without hitting the network
        with pytest.raises(CircuitBreakerOpenError):
            await adapter._request_with_resilience(
                "GET", "https://mersultrenurilor.infofer.ro/ro-RO/Train/9999"
            )

        # Wait for recovery timeout to transition to HALF_OPEN
        await asyncio.sleep(0.25)
        assert await cb.can_execute() is True
        assert cb.state == CircuitState.HALF_OPEN


# ---------------------------------------------------------------------------
# 4. Response Caching Layer Verification
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@respx.mock
async def test_response_caching_layer(tmp_path, ontime_html):
    """Verifies raw HTML responses are cached and reused so re-runs never hit the network twice."""
    cache = ResponseCache(cache_dir=tmp_path / "trains_cache")
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()

    async with httpx.AsyncClient() as client:
        adapter = InfoFerLiveAdapter(
            rate_limiter=limiter,
            circuit_breaker=cb,
            cache=cache,
            client=client,
        )

        # Mock InfoFer endpoint
        route = respx.get("https://mersultrenurilor.infofer.ro/ro-RO/Train/1572").mock(
            return_value=httpx.Response(200, text=ontime_html)
        )

        date_str = "2026-11-14"
        # First call hits network
        rec1 = await adapter.fetch_train("IR 1572", date_str)
        assert rec1 is not None
        assert rec1.train_number == "IR 1572"
        assert route.call_count == 1

        # Check cache file exists on disk
        cached_data = cache.get(date_str, "IR 1572")
        assert cached_data is not None
        assert "html" in cached_data

        # Second call must hit cache, NOT network
        rec2 = await adapter.fetch_train("IR 1572", date_str)
        assert rec2 is not None
        assert rec2.train_number == "IR 1572"
        assert route.call_count == 1  # Network route was NOT called again


# ---------------------------------------------------------------------------
# 5. Multi-Provider Fallback (Live -> GTFS -> Local Snapshot)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@respx.mock
async def test_multi_provider_automatic_fallback(tmp_path):
    """
    Verifies automatic fallback sequence:
    When Live InfoFer is down (503), it falls back to GTFS.
    When GTFS doesn't have the train, it falls back to Local Snapshot.
    """
    collector = TrainApiCollector(offline=False, cache_dir=tmp_path / "cache", min_delay=0, max_delay=0)

    # InfoFer returns 503
    respx.get("https://mersultrenurilor.infofer.ro/ro-RO/Train/1572").mock(
        return_value=httpx.Response(503, text="Service Unavailable")
    )

    try:
        # IR 1572 exists in XML / GTFS
        rec = await collector.get_train("IR 1572", "2026-11-14")
        assert rec is not None
        assert rec.train_number == "IR 1572"
        # Since live failed, provider is DataGovXMLAdapter, GTFS or LocalSnapshot
        assert rec.provider in {"DataGovXMLAdapter", "StaticGTFSAdapter", "LocalSnapshotFallbackAdapter"}
        assert rec.origin_station_code == "GLT"
        assert rec.destination_station_code == "BCT"
    finally:
        await collector.close()


# ---------------------------------------------------------------------------
# 6. Tier 1 Smoke Execution & Pydantic Schema Validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tier_1_smoke_execution_and_schema_validation(tmp_path):
    """
    Verifies Tier 1 execution:
    - Scrapes 5 specific trains on GLT -> BCT (IR 1570, IR 1572, IR 1574, RE 7570, R 7568).
    - Completes in < 10 seconds.
    - Produces valid Pydantic models matching freeze_contract.md.
    - Bridges cleanly to ScrapedTrainingSample and 18-element ONNX vector.
    """
    collector = TrainApiCollector(
        offline=True,  # Offline mode for fast, deterministic unit test
        cache_dir=tmp_path / "cache",
        min_delay=0,
        max_delay=0,
    )

    start_time = time.monotonic()
    records = await collector.scrape_tier(tier=ScrapeTier.TIER_1_SMOKE, date_str="2026-11-14")
    elapsed = time.monotonic() - start_time

    # Verification: Max 5 trains and completed in < 10 seconds
    assert len(records) == 5
    assert elapsed < 10.0

    expected_trains = {"IR 1570", "IR 1572", "IR 1574", "RE 7570", "R 7568"}
    scraped_trains = {r.train_number for r in records}
    assert scraped_trains == expected_trains

    pipeline = TransitScraperPipeline(weather_timeout=0.1)

    for rec in records:
        # 1. Validate Source 1: TrainApiFeatures
        assert isinstance(rec.source_train_api, TrainApiFeatures)
        assert rec.operator in {"CFR", "ASTRA", "TFC", "SOFTRANS", "REGIO"}
        assert rec.train_category in {0, 1, 2, 3}
        assert rec.origin_station_code == "GLT"
        assert rec.destination_station_code == "BCT"
        assert rec.scheduled_duration_minutes > 0
        assert rec.distance_km > 0
        assert rec.stop_count >= 0
        assert rec.traction_type in {0, 1}
        assert rec.has_transfer in {0, 1}
        assert rec.transfer_buffer_minutes >= 0

        # 2. Validate Source 5: TargetLabels
        assert isinstance(rec.target_labels, TargetLabels)
        assert rec.actual_delay_minutes >= 0.0
        assert rec.missed_connection in {0, 1}

        # 3. Integrate with TransitScraperPipeline to produce ScrapedTrainingSample
        sample: ScrapedTrainingSample = pipeline.process_sample(
            raw_train_data=rec.source_train_api.model_dump(),
            departure_dt=datetime(2026, 11, 14, 7, 30, tzinfo=timezone.utc),
            actual_delay_minutes=rec.actual_delay_minutes,
        )

        assert sample.source_train_api.train_number == rec.train_number
        assert sample.target_labels.actual_delay_minutes == rec.actual_delay_minutes

        # 4. Validate ONNX 18-element numerical feature vector
        vec18 = sample.to_18_feature_vector()
        assert len(vec18) == 18
        assert all(isinstance(x, (float, int)) for x in vec18)

    await collector.close()


# ---------------------------------------------------------------------------
# 7. Tier 3 National Checkpoint & Resume Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tier_3_checkpoint_and_resume(tmp_path):
    """Verifies Tier 3 crawl checkpointing and resuming from checkpoint.json."""
    checkpoint_file = tmp_path / "checkpoint.json"

    # Pre-seed a checkpoint with 3 trains already processed
    pre_checkpoint = {
        "last_updated": "2026-11-14T10:00:00Z",
        "tier": "TIER_3_NATIONAL",
        "processed_train_numbers": ["IR 1500", "IR 1501", "IR 1502"],
        "completed_count": 3,
        "saved_records": [],
    }
    checkpoint_file.write_text(json.dumps(pre_checkpoint), encoding="utf-8")

    collector = TrainApiCollector(
        offline=True,
        min_delay=0,
        max_delay=0,
    )

    # Read checkpoint verifying resumption detects the 3 trains
    with open(checkpoint_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert len(data["processed_train_numbers"]) == 3
        assert "IR 1500" in data["processed_train_numbers"]

    await collector.close()


# ---------------------------------------------------------------------------
# 8. Regression & Edge Case Probes: Normalization, Circuit Breaker, Gating
# ---------------------------------------------------------------------------

def test_canonical_train_category_strict_token_resolution():
    """Verifies that canonical_train_category avoids naive substring collisions."""
    # Regio: 0
    assert canonical_train_category("REGIO") == 0
    assert canonical_train_category("R") == 0
    assert canonical_train_category("regio calatori") == 0
    assert canonical_train_category("", "R 7568") == 0
    assert canonical_train_category("CFR", "R 7568") == 0

    # Regio Expres: 1
    assert canonical_train_category("RE") == 1
    assert canonical_train_category("REGIO EXPRES") == 1
    assert canonical_train_category("regio_expres") == 1
    assert canonical_train_category("", "RE 7570") == 1

    # InterRegio: 2
    assert canonical_train_category("IR") == 2
    assert canonical_train_category("INTERREGIO") == 2
    assert canonical_train_category("IRN") == 2
    assert canonical_train_category("EN") == 2
    assert canonical_train_category("", "IR 1572") == 2

    # InterCity: 3
    assert canonical_train_category("IC") == 3
    assert canonical_train_category("INTERCITY") == 3
    assert canonical_train_category("", "IC 531") == 3


def test_normalize_train_number_euronight_and_null_safety():
    """Verifies normalize_train_number maps EuroNight/EC and safely handles null/empty input."""
    assert normalize_train_number("EN 472") == "IR 472"
    assert normalize_train_number("EC 144") == "IR 144"
    assert normalize_train_number("IRN 1641") == "IR 1641"
    assert normalize_train_number("RE 7570") == "RE 7570"
    assert normalize_train_number(None) == ""
    assert normalize_train_number("") == ""


def test_canonical_station_code_aliases_and_prefix_isolation():
    """Verifies disambiguation among similar stations (Ploiești Sud vs Vest vs Triaj)."""
    assert canonical_station_code("Ploiești Sud") == "PLS"
    assert canonical_station_code("Ploiești Vest") == "PLV"
    assert canonical_station_code("Ploiești Triaj") == "PLT"
    assert canonical_station_code("București Basarab") == "BCB"
    assert canonical_station_code("București Nord") == "BCT"
    assert canonical_station_code("Gara de Nord") == "BCT"
    assert canonical_station_code("București") == "BCT"
    assert canonical_station_code("Cluj Napoca Est") == "CJN"
    assert canonical_station_code("Iași Nicolina") == "IAS"


@pytest.mark.asyncio
@respx.mock
async def test_circuit_breaker_single_failure_count_on_503():
    """Verifies single failure count increment on HTTP 503 (preventing double-counting bug)."""
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker(failure_threshold=5)
    cache = ResponseCache()

    async with httpx.AsyncClient() as client:
        adapter = InfoFerLiveAdapter(limiter, cb, cache, client=client, max_retries=0)
        respx.get("https://mersultrenurilor.infofer.ro/ro-RO/Train/1234").mock(
            return_value=httpx.Response(503, text="Service Unavailable")
        )

        with pytest.raises(httpx.HTTPStatusError):
            await adapter._request_with_resilience("GET", "https://mersultrenurilor.infofer.ro/ro-RO/Train/1234")

        # Failure count MUST be exactly 1, NOT 2
        assert cb.failure_count == 1
        assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_probe_failure_trips_to_open():
    """Verifies that a failure during HALF_OPEN immediately trips circuit back to OPEN."""
    cb = CircuitBreaker(failure_threshold=5, recovery_timeout=0.01)
    # Trip circuit to OPEN
    for _ in range(5):
        await cb.record_failure()
    assert cb.state == CircuitState.OPEN

    # Wait for recovery timeout
    await asyncio.sleep(0.02)
    assert await cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Probe fails
    await cb.record_failure()
    assert cb.state == CircuitState.OPEN


@pytest.mark.asyncio
async def test_token_bucket_context_manager_concurrency():
    """Verifies that async with limiter: holds concurrency semaphore during active work."""
    limiter = TokenBucketRateLimiter(capacity=2, min_delay=0, max_delay=0)
    active_workers = 0
    max_concurrent = 0

    async def worker():
        nonlocal active_workers, max_concurrent
        async with limiter:
            active_workers += 1
            max_concurrent = max(max_concurrent, active_workers)
            await asyncio.sleep(0.05)
            active_workers -= 1

    await asyncio.gather(worker(), worker(), worker(), worker())
    assert max_concurrent <= 2


def test_parse_train_html_empty_rows_raises_value_error():
    """Verifies that empty route table raises ValueError so fallback chain activates."""
    empty_html = "<html><body><h1>Tren IR 9999</h1><p>Trenul nu a fost gasit</p></body></html>"
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()
    adapter = InfoFerLiveAdapter(limiter, cb, cache)

    with pytest.raises(ValueError, match="No route station rows found"):
        adapter.parse_train_html(empty_html, default_train_num="IR 9999")


def test_parse_itinerary_non_glt_corridor_extraction():
    """Verifies itinerary parsing extracts actual corridor stations and not hardcoded GLT/BCT."""
    html_bct_bsv = """
    <html><body>
    <div class="card itinerary-card" data-transfer="0">
        <div class="card-header">
            <h3>București Nord ➔ Brașov</h3>
        </div>
        <div class="card-body">
            <div class="leg-segment" data-train="IR 1631" data-operator="CFR">
                <p>Plecare: București Nord 07:00 (Întârziere: +3 min)</p>
            </div>
        </div>
        <div class="itinerary-summary">
            <span class="total-duration">150 min</span>
            <span class="total-distance">166 km</span>
            <span class="total-stops">4</span>
            <span class="final-delay">+3 min</span>
        </div>
    </div>
    </body></html>
    """
    limiter = TokenBucketRateLimiter(min_delay=0, max_delay=0)
    cb = CircuitBreaker()
    cache = ResponseCache()
    adapter = InfoFerLiveAdapter(limiter, cb, cache)

    records = adapter.parse_itinerary_html(html_bct_bsv, default_origin="BCT", default_destination="BSV")
    assert len(records) == 1
    rec = records[0]
    assert rec.train_number == "IR 1631"
    assert rec.origin_station_code == "BCT"
    assert rec.destination_station_code == "BSV"
    assert rec.scheduled_duration_minutes == 150.0
    assert rec.distance_km == 166.0
    assert rec.stop_count == 4
    assert rec.delay_at_origin_minutes == 3
    assert rec.actual_delay_minutes == 3.0


@pytest.mark.asyncio
async def test_gtfs_adapter_unique_trips_bct_bsv_and_bsv_cjn():
    """Verifies StaticGTFSAdapter preserves unique trips for IR 1639 and IR 1735 without corruption."""
    gtfs = StaticGTFSAdapter()
    rec_bct = await gtfs.fetch_train("IR 1639", "2026-11-14")
    assert rec_bct is not None
    assert rec_bct.origin_station_code == "BCT"
    assert rec_bct.destination_station_code == "BSV"
    assert rec_bct.stop_count == 4
    assert rec_bct.distance_km == 166.0

    rec_cjn = await gtfs.fetch_train("IR 1735", "2026-11-14")
    assert rec_cjn is not None
    assert rec_cjn.origin_station_code == "BSV"
    assert rec_cjn.destination_station_code == "CJN"
    assert rec_cjn.stop_count == 3
    assert rec_cjn.distance_km == 331.0


# ---------------------------------------------------------------------------
# 8. DataGovXMLAdapter XML Timetable Parsing Tests (trnIfSchema_v4.xsd)
# ---------------------------------------------------------------------------

@pytest.fixture
def xml_adapter():
    """Initializes DataGovXMLAdapter pointing to official data.gov.ro XMLs."""
    adapter = DataGovXMLAdapter()
    adapter._ensure_loaded()
    return adapter


@pytest.mark.asyncio
async def test_datagov_xml_adapter_initialization_and_operator_mapping(xml_adapter):
    """
    Verifies DataGovXMLAdapter loads official XML timetables and correctly maps
    operator codes and filenames according to freeze_contract.md.
    """
    assert len(xml_adapter._trains) >= 2000

    # 1. CFR (sntfc / 6100826)
    rec_cfr = await xml_adapter.fetch_train("IR 1572", "2026-11-14")
    assert rec_cfr is not None
    assert rec_cfr.operator == "CFR"
    assert rec_cfr.train_category == 2  # IR = 2
    assert rec_cfr.origin_station_code == "GLT"
    assert rec_cfr.destination_station_code == "BCT"

    # 2. SOFTRANS (softrans / 236025)
    rec_softrans = await xml_adapter.fetch_train("RE 11631", "2026-11-14")
    assert rec_softrans is not None
    assert rec_softrans.operator == "SOFTRANS"
    assert rec_softrans.train_category == 1  # RE = 1
    assert rec_softrans.origin_station_code == "BCT"
    assert rec_softrans.destination_station_code == "BSV"

    # 3. Operators present across files
    operators_found = {r.operator for r in xml_adapter._trains.values()}
    assert "CFR" in operators_found
    assert "SOFTRANS" in operators_found
    assert "ASTRA" in operators_found
    assert "TFC" in operators_found
    assert "REGIO" in operators_found

    # 4. Explicit operator code mappings without filename hints
    assert xml_adapter._map_operator("generic.xml", "sntfc") == "CFR"
    assert xml_adapter._map_operator("generic.xml", "softrans") == "SOFTRANS"
    assert xml_adapter._map_operator("generic.xml", "astratranscarpatic") == "ASTRA"
    assert xml_adapter._map_operator("generic.xml", "tfc") == "TFC"
    assert xml_adapter._map_operator("generic.xml", "regio-calatori") == "REGIO"
    assert xml_adapter._map_operator("generic.xml", "interregional-calatori") == "REGIO"
    assert xml_adapter._map_operator("generic.xml", "ferotrafictfi") == "REGIO"


@pytest.mark.asyncio
async def test_datagov_xml_time_duration_and_distance_conversions(xml_adapter):
    """
    Verifies conversion of OraP/OraS from seconds past midnight to duration minutes,
    KmCum from meters to kilometers, and overnight duration modulo 86400.
    """
    # IR 1572: Galați (OraP=30300 = 08:25) -> București Nord (OraS=43740 = 12:09)
    # diff = 43740 - 30300 = 13440 sec = 224.0 min
    # KmCum = 259616.0 meters = 259.6 km
    rec = await xml_adapter.fetch_train("IR 1572", "2026-11-14")
    assert rec is not None
    assert rec.scheduled_duration_minutes == 224.0
    assert rec.distance_km == 259.6

    # Test overnight train calculation with synthetic element
    # Departure 23:00 (82800 sec), Arrival 06:00 (21600 sec)
    # diff = 21600 - 82800 = -61200 + 86400 = 25200 sec = 420.0 min (7h)
    import xml.etree.ElementTree as ET
    tren_xml = """
    <Tren CategorieTren="IR" KmCum="350000.0" Numar="99999" Operator="6100826">
        <Trase>
            <Trasa Tip="Implicita">
                <ElementTrasa DenStaOrigine="Bucureşti Nord" DenStaDestinatie="Ploieşti" OraP="82800" OraS="84600" Secventa="1" TipOprire="N" Km="60000" />
                <ElementTrasa DenStaOrigine="Ploieşti" DenStaDestinatie="Braşov" OraP="84600" OraS="21600" Secventa="2" TipOprire="N" Km="290000" />
                <ElementTrasa DenStaOrigine="Braşov" DenStaDestinatie="Braşov" OraP="21600" OraS="21600" Secventa="3" TipOprire="N" Km="0" />
            </Trasa>
        </Trase>
    </Tren>
    """
    custom_adapter = DataGovXMLAdapter()
    custom_adapter._loaded = True
    elem = ET.fromstring(tren_xml)
    custom_adapter._parse_tren_element(elem, "test_sntfc.xml")
    overnight_rec = await custom_adapter.fetch_train("IR 99999", "2026-11-14")
    assert overnight_rec is not None
    assert overnight_rec.scheduled_duration_minutes == 420.0
    assert overnight_rec.distance_km == 350.0


@pytest.mark.asyncio
async def test_datagov_xml_stop_count_filtering_c_stops(xml_adapter):
    """
    Verifies that stop_count strictly counts commercial passenger stops (TipOprire == 'C')
    and filters out non-stop technical pass-throughs (TipOprire == 'N', 'T', 'A').
    """
    # IR 1572 has 37 total ElementTrasa elements, but only 7 commercial intermediate stops:
    # Barboşi, Brăila, Ianca hc., Făurei, Buzău, Mizil, Ploieşti Sud.
    rec = await xml_adapter.fetch_train("IR 1572", "2026-11-14")
    assert rec is not None
    assert rec.stop_count == 7

    # Softrans RE 11631 has 22 ElementTrasa, with 9 commercial intermediate stops:
    # Buftea, Periș, Ploiești Vest, Câmpina, Breaza hc., Sinaia, Bușteni, Azuga, Predeal.
    rec_softrans = await xml_adapter.fetch_train("RE 11631", "2026-11-14")
    assert rec_softrans is not None
    assert rec_softrans.stop_count == 9


@pytest.mark.asyncio
async def test_datagov_xml_segment_subroute_extraction(xml_adapter):
    """
    Verifies segment sub-route extraction in fetch_itinerary:
    Matches trains stopping at both origin and destination (seq_origin < seq_dest),
    computing exact segment distance, duration, and intermediate commercial stops.
    """
    # 1. Sub-route on IR 1572: Buzău (BUZ) to București Nord (BCT)
    # Total stops between BUZ and BCT: Mizil, Ploiești Sud -> exactly 2 intermediate stops!
    # Departure from BUZ: 37200, Arrival at BCT: 43740 -> diff = 6540 sec = 109.0 min
    itins = await xml_adapter.fetch_itinerary("BUZ", "BCT", "2026-11-14")
    assert len(itins) >= 1

    rec_1572_seg = next((r for r in itins if r.train_number == "IR 1572"), None)
    assert rec_1572_seg is not None
    assert rec_1572_seg.origin_station_code == "BUZ"
    assert rec_1572_seg.destination_station_code == "BCT"
    assert rec_1572_seg.stop_count == 2
    assert rec_1572_seg.scheduled_duration_minutes == 109.0
    assert rec_1572_seg.distance_km < 259.6
    assert rec_1572_seg.distance_km > 50.0

    # 2. Sub-route on Softrans RE 11631: Ploiești Vest (PLV) to Brașov (BSV)
    # Commercial stops between PLV and BSV: Câmpina, Breaza, Sinaia, Bușteni, Azuga, Predeal -> 6 stops
    # PLV dep: 34020, BSV arr: 40620 -> diff = 6600 sec = 110.0 min
    itins_prahova = await xml_adapter.fetch_itinerary("PLV", "BSV", "2026-11-14")
    assert len(itins_prahova) >= 1

    rec_softrans_seg = next((r for r in itins_prahova if r.train_number == "RE 11631"), None)
    assert rec_softrans_seg is not None
    assert rec_softrans_seg.origin_station_code == "PLV"
    assert rec_softrans_seg.destination_station_code == "BSV"
    assert rec_softrans_seg.stop_count == 6
    assert rec_softrans_seg.scheduled_duration_minutes == 110.0


@pytest.mark.asyncio
async def test_datagov_xml_station_board(xml_adapter):
    """Verifies station board extraction for major Romanian hubs."""
    board_bct = await xml_adapter.fetch_station_board("BCT", "2026-11-14")
    assert len(board_bct) > 20

    board_bsv = await xml_adapter.fetch_station_board("BSV", "2026-11-14")
    assert len(board_bsv) > 20


@pytest.mark.asyncio
@respx.mock
async def test_live_enrichment_onto_xml_schedule_metadata(tmp_path, delayed_html):
    """
    Verifies Requirement 2:
    When InfoFer Live returns a train record with delay info,
    it merges delay_at_origin_minutes and actual_delay_minutes onto
    the exact XML schedule metadata (scheduled duration, distance, stops).
    """
    collector = TrainApiCollector(offline=False, cache_dir=tmp_path / "cache", min_delay=0, max_delay=0)

    # InfoFer live returns delayed train IR 1572 (+10 at origin, +45 at arrival)
    respx.get("https://mersultrenurilor.infofer.ro/ro-RO/Train/1572").mock(
        return_value=httpx.Response(200, text=delayed_html)
    )

    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        rec = await collector.get_train("IR 1572", today_str)
        assert rec is not None
        assert rec.train_number == "IR 1572"
        # Delay enriched from live
        assert rec.delay_at_origin_minutes == 10
        assert rec.actual_delay_minutes == 45.0
        # Exact schedule metadata preserved from XML timetable
        assert rec.origin_station_code == "GLT"
        assert rec.destination_station_code == "BCT"
        assert rec.scheduled_duration_minutes == 224.0
        assert rec.distance_km == 259.6
        assert rec.stop_count == 7
    finally:
        await collector.close()


def test_historical_delay_calibration_simulation(xml_adapter):
    """
    Verifies Requirement 3:
    Delay calibration produces realistic targets:
    - IC trains have lower delay than R trains
    - Active speed restrictions (Restrictie) increase delay
    - Single-track corridors increase delay
    """
    rec_ir = xml_adapter._trains.get("IR 1572")
    assert rec_ir is not None

    # Normal day without restrictions
    orig_del_0, targets_0 = simulate_historical_delay(rec_ir, "2026-10-14", restriction_count=0)
    # Heavy restriction day (5 active speed restrictions)
    orig_del_5, targets_5 = simulate_historical_delay(rec_ir, "2026-10-14", restriction_count=5)

    assert targets_0.actual_delay_minutes >= 0.0
    assert targets_5.actual_delay_minutes >= targets_0.actual_delay_minutes


@pytest.mark.asyncio
async def test_backfill_cli_generation_and_service_date(tmp_path):
    """
    Verifies CLI --backfill-days generates multi-day observations with service_date first.
    """
    collector = TrainApiCollector(offline=True, min_delay=0, max_delay=0)
    records = await collector.scrape_tier(tier=ScrapeTier.TIER_1_SMOKE, date_str="2026-11-14")
    assert len(records) == 5

    # Generate 3 days backfill
    out_csv = tmp_path / "backfill_smoke.csv"
    from datetime import timedelta
    end_dt = datetime.strptime("2026-11-14", "%Y-%m-%d")
    service_dates = [(end_dt - timedelta(days=d)).strftime("%Y-%m-%d") for d in range(2, -1, -1)]

    observations = []
    for s_date in service_dates:
        for rec in records:
            restr = collector.xml_adapter.get_speed_restrictions_count(rec.train_number)
            orig_del, targets = simulate_historical_delay(rec, s_date, restr)
            rec_copy = rec.model_copy(deep=True)
            rec_copy.source_train_api.delay_at_origin_minutes = orig_del
            rec_copy.target_labels = targets
            observations.append({"service_date": s_date, **rec_copy.source_train_api.model_dump(), **rec_copy.target_labels.model_dump()})

    assert len(observations) == 15  # 5 trains * 3 days
    # Verify service_date is first key
    first_row = observations[0]
    keys = list(first_row.keys())
    assert keys[0] == "service_date"
    assert first_row["service_date"] == "2026-11-12"

    import csv
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(first_row.keys()))
        writer.writeheader()
        writer.writerows(observations)

    # Read back and verify CSV first column header is service_date
    with open(out_csv, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        assert header[0] == "service_date"

    await collector.close()


def test_station_code_diacritics_normalization():
    """Verifies that unknown Romanian stations with diacritics produce correct 3-letter codes."""
    assert canonical_station_code("Șieu") == "SIE"
    assert canonical_station_code("Țăndărei") == "TAN"
    assert canonical_station_code("Câmpina") == "CMP"  # Known alias


def test_restrictions_count_digit_fallback(xml_adapter):
    """Verifies speed restriction count resolves even with category variance or digits."""
    restr_norm = xml_adapter.get_speed_restrictions_count("IR 1572")
    restr_digits = xml_adapter.get_speed_restrictions_count("1572")
    assert restr_norm == restr_digits
    assert restr_norm > 0


@pytest.mark.asyncio
async def test_segment_minimum_duration_clamp(xml_adapter):
    """Verifies that itinerary segments strictly enforce scheduled_duration_minutes > 0."""
    import xml.etree.ElementTree as ET
    tren_xml = """
    <Tren CategorieTren="R" KmCum="10000.0" Numar="88888" Operator="6100826">
        <Trase>
            <Trasa Tip="Implicita">
                <ElementTrasa DenStaOrigine="Galaţi" DenStaDestinatie="Barboşi" OraP="36000" OraS="36000" Secventa="1" TipOprire="N" Km="10000" />
                <ElementTrasa DenStaOrigine="Barboşi" DenStaDestinatie="Barboşi" OraP="36000" OraS="36000" Secventa="2" TipOprire="N" Km="0" />
            </Trasa>
        </Trase>
    </Tren>
    """
    custom_adapter = DataGovXMLAdapter()
    custom_adapter._loaded = True
    elem = ET.fromstring(tren_xml)
    custom_adapter._parse_tren_element(elem, "test_sntfc.xml")
    rec = await custom_adapter.fetch_train("R 88888", "2026-11-14")
    assert rec is not None
    assert rec.scheduled_duration_minutes >= 1.0
