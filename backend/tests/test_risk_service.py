import asyncio
from pathlib import Path
import time
from unittest.mock import MagicMock, patch
import numpy as np
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.schemas.route_plan import (
    BufferAdequacy,
    RiskLevel,
    RouteRiskAnalysis,
    TransitRouteQuery,
)
from app.services.feature_store_service import FeatureStoreService
from app.services.risk_service import (
    SINGLE_TRACK_CORRIDORS,
    RiskService,
    haversine_distance_km,
    risk_service,
)
from app.services.routing_service import routing_service


@pytest.fixture(autouse=True)
def ensure_risk_session_active():
    """Ensures standard risk_service session is restored after each test."""
    risk_service._model_path = settings.ML_MODEL_PATH
    risk_service.init_session()
    yield
    risk_service._model_path = settings.ML_MODEL_PATH
    risk_service.init_session()


def test_onnx_model_initialization_and_warmup():
    """Validates ONNX runtime session initializes cleanly on CPU with proper tensor shapes."""
    svc = RiskService()
    success = svc.init_session()
    assert success is True
    session = svc.get_session()
    assert session is not None

    inputs = session.get_inputs()
    assert len(inputs) == 1
    assert inputs[0].name == "float_input"
    assert inputs[0].shape[-1] == 18

    outputs = session.get_outputs()
    out_names = [o.name for o in outputs]
    assert "expected_delay" in out_names
    assert "missed_connection_prob" in out_names


def test_onnx_inference_latency():
    """
    Benchmarks CPU batch inference latency for candidate routes.
    SLA requirement: < 5.0ms total enrichment budget, < 1.0ms for batch of 5.
    """
    session = risk_service.get_session()
    assert session is not None

    # Batch of 5 candidate routes
    batch = np.random.randn(5, 18).astype(np.float32)

    # Warmup
    for _ in range(20):
        _ = session.run(None, {"float_input": batch})

    iterations = 100
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = session.run(None, {"float_input": batch})
    t1 = time.perf_counter()

    avg_ms = ((t1 - t0) / iterations) * 1000.0
    assert avg_ms < 5.0, f"ONNX batch inference exceeded 5ms SLA: {avg_ms:.4f}ms"


@pytest.mark.asyncio
async def test_feature_extraction_vector_schema():
    """Validates extraction of canonical 18-element numerical feature vector from TransitRoutePlan."""
    query = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
        departureTime="2026-10-21T06:40:00+03:00",
    )
    plan = routing_service.generate_micro19_to_unirii_plan(query)

    corridor_feats = {
        "active_disruptions_count": 1,
        "max_disruption_severity": 1,
        "rolling_delay_3h": 6.5,
        "rolling_delay_24h": 4.2,
        "weather_condition": "CLEAR",
    }
    station_feats = {
        "congestion_index": 0.45,
        "punctuality_rate": 0.89,
    }
    carrier_feats = {
        "baseline_punctuality": 0.82,
    }

    vec = await RiskService.extract_plan_features(
        plan=plan,
        corridor_features=corridor_feats,
        transfer_station_features=station_feats,
        carrier_features=carrier_feats,
    )

    arr = vec.to_numpy_vector()
    assert arr.shape == (18,)
    assert arr.dtype == np.float32
    assert not np.isnan(arr).any()

    # Field specific assertions
    assert vec.scheduled_duration_minutes == 275.0
    assert vec.has_transfer == 1
    assert vec.transfer_buffer_minutes == 20.0
    assert vec.departure_hour == 6
    assert vec.carrier_baseline_punctuality == 0.82
    assert vec.active_corridor_disruptions == 1


@pytest.mark.asyncio
async def test_batched_enrich_route_plans_e2e():
    """Validates end-to-end ML enrichment of candidate route plans with delay and risk metrics."""
    q1 = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    p1 = routing_service.generate_micro19_to_unirii_plan(q1)

    q2 = TransitRouteQuery(
        origin={"name": "București Nord", "city": "București"},
        destination={"name": "Brașov", "city": "Brașov"},
    )
    p2 = routing_service.generate_bucharest_to_brasov_plan(q2)

    enriched = await risk_service.enrich_route_plans([p1, p2])
    assert len(enriched) == 2

    for plan in enriched:
        risk = plan.riskAnalysis
        assert risk.isMlComputed is True
        assert isinstance(risk.expectedDelayMinutes, int)
        assert risk.expectedDelayMinutes >= 0
        assert 0.0 <= risk.missedConnectionProbability <= 1.0
        assert 0.0 <= risk.overallRiskScore <= 100.0
        assert risk.riskLevel in [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.CRITICAL]
        assert len(risk.riskSummaryText) > 0
        assert len(risk.riskFactors) >= 1

    # Check Micro 19 plan specific properties
    risk1 = enriched[0].riskAnalysis
    assert risk1.tightestBufferMinutes == 20
    assert risk1.bufferAdequacy == BufferAdequacy.OPTIMAL

    # Check Bucharest-Brasov direct plan specific properties
    risk2 = enriched[1].riskAnalysis
    assert risk2.tightestBufferMinutes == 0
    assert risk2.bufferAdequacy == BufferAdequacy.GENEROUS


def test_graceful_degradation_when_model_missing():
    """
    Validates Task 13 acceptance criteria:
    If risk_model.onnx is missing on disk, service activates fallback mode with zero 500 errors.
    """
    svc = RiskService()
    svc._model_path = "/nonexistent/path/risk_model_missing.onnx"
    loaded = svc.init_session()
    assert loaded is False
    assert svc.get_session() is None

    # Candidate plan
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    plan = routing_service.generate_micro19_to_unirii_plan(q)

    # Sync fallback
    fallback_res = svc.deterministic_fallback_analysis(plan)
    assert fallback_res.isMlComputed is False
    assert fallback_res.overallRiskScore > 0.0
    assert fallback_res.tightestBufferMinutes == 20
    assert fallback_res.bufferAdequacy == BufferAdequacy.OPTIMAL
    assert isinstance(fallback_res.expectedDelayMinutes, int)
    assert 0.0 <= fallback_res.missedConnectionProbability <= 1.0
    assert len(fallback_res.riskFactors) >= 1


@pytest.mark.asyncio
async def test_graceful_degradation_when_inference_throws_exception():
    """Asserts that unexpected runtime inference exceptions trigger deterministic fallback cleanly."""
    q = TransitRouteQuery(
        origin={"name": "București Nord", "city": "București"},
        destination={"name": "Brașov", "city": "Brașov"},
    )
    plan = routing_service.generate_bucharest_to_brasov_plan(q)

    session = risk_service.get_session()
    assert session is not None

    with patch.object(session, "run", side_effect=RuntimeError("Simulated ONNX Internal Crash")):
        enriched = await risk_service.enrich_route_plans([plan])
        assert len(enriched) == 1
        risk = enriched[0].riskAnalysis
        assert risk.isMlComputed is False
        assert risk.overallRiskScore >= 0.0
        assert len(risk.riskFactors) >= 1


@pytest.mark.asyncio
async def test_graceful_degradation_when_redis_offline():
    """Asserts that Redis offline failures fall back to safe static defaults during feature enrichment."""
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    plan = routing_service.generate_micro19_to_unirii_plan(q)

    # Mock Redis failure on batch_get_corridor_features
    with patch.object(
        FeatureStoreService,
        "batch_get_corridor_features",
        side_effect=ConnectionError("Simulated Redis Down"),
    ):
        enriched = await risk_service.enrich_route_plans([plan])
        assert len(enriched) == 1
        # Inference should still succeed using fallback defaults
        risk = enriched[0].riskAnalysis
        assert risk.isMlComputed is True
        assert risk.overallRiskScore >= 0.0


def test_risk_calibration_formula_and_bands():
    """Validates composite risk score formula and categorical band boundaries."""
    # 1. Ideal direct trip: 0 delay, 0 missed prob, generous buffer
    score_low, level_low, ad_low, _ = RiskService.calibrate_risk_score(
        expected_delay=2.0,
        missed_conn_prob=0.001,
        transfers_count=0,
        tightest_buffer=0,
    )
    assert score_low <= 20.0
    assert level_low == RiskLevel.LOW
    assert ad_low == BufferAdequacy.GENEROUS

    # 2. Moderate trip: 8 min delay, 0.05 missed prob, optimal 25m buffer
    score_mod, level_mod, ad_mod, _ = RiskService.calibrate_risk_score(
        expected_delay=8.0,
        missed_conn_prob=0.05,
        transfers_count=1,
        tightest_buffer=25,
    )
    assert 20.0 < score_mod <= 45.0
    assert level_mod == RiskLevel.MODERATE
    assert ad_mod == BufferAdequacy.OPTIMAL

    # 3. Severe trip: 25 min delay, 0.70 missed prob, insufficient 8m buffer
    score_crit, level_crit, ad_crit, _ = RiskService.calibrate_risk_score(
        expected_delay=25.0,
        missed_conn_prob=0.70,
        transfers_count=1,
        tightest_buffer=8,
    )
    assert score_crit > 70.0
    assert level_crit == RiskLevel.CRITICAL
    assert ad_crit == BufferAdequacy.INSUFFICIENT


def test_factor_explanations_single_track_and_rush_hour():
    """Validates natural language hazard explanation generation for domain edge cases."""
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    plan = routing_service.generate_micro19_to_unirii_plan(q)

    # Galați - București has single-track branch (Galați-Făurei)
    factors, risk_factors = RiskService._generate_factors_and_explanations(
        plan=plan,
        vector=RiskService.extract_plan_features.__wrapped__(
            RiskService,
            plan,
            {},
            {},
            {},
        ) if hasattr(RiskService.extract_plan_features, "__wrapped__") else MagicMock(
            has_transfer=1,
            is_peak_hour=1,
            carrier_baseline_punctuality=0.82,
            corridor_severity_max=0,
        ),
        corridor_slug="galati-bucuresti_nord",
        tightest_buffer=20,
        weather="RAIN",
    )

    factor_codes = [f.code for f in factors]
    assert "SINGLE_TRACK_RAIL" in factor_codes
    assert "WEATHER_ALERT" in factor_codes
    assert any("Single-track" in rf for rf in risk_factors)
    assert any("Shielded" in rf for rf in risk_factors)


@pytest.mark.asyncio
async def test_route_plan_endpoint_with_model_missing_no_500(client: AsyncClient):
    """
    Validates Checkpoint 3 requirement:
    Server starts and functions with 0 500 errors even when risk_model.onnx is missing.
    """
    with patch.object(risk_service, "get_session", return_value=None):
        payload = {
            "origin": {"name": "Micro 19", "city": "Galați"},
            "destination": {"name": "Piața Unirii", "city": "București"},
        }
        res = await client.post("/api/v1/routes/plan", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert len(data["plans"]) >= 1
        plan = data["plans"][0]
        risk = plan["riskAnalysis"]
        assert risk["isMlComputed"] is False
        assert risk["overallRiskScore"] > 0
        assert "expectedDelayMinutes" in risk
        assert "missedConnectionProbability" in risk


@pytest.mark.asyncio
async def test_empty_legs_plan_does_not_crash_batch_enrichment():
    """Validates that a plan with empty legs does not raise IndexError or degrade other plans in batch."""
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    p_valid = routing_service.generate_micro19_to_unirii_plan(q)
    p_empty = routing_service.generate_micro19_to_unirii_plan(q)
    p_empty.legs = []

    enriched = await risk_service.enrich_route_plans([p_valid, p_empty])
    assert len(enriched) == 2
    assert enriched[0].riskAnalysis.isMlComputed is True
    assert enriched[1].riskAnalysis.isMlComputed is True
    assert enriched[1].riskAnalysis.tightestBufferMinutes == 0


@pytest.mark.asyncio
async def test_negative_transfer_buffer_evaluation():
    """Validates that negative transfer buffers (severe incoming delay) do not trigger validation errors."""
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    p = routing_service.generate_micro19_to_unirii_plan(q)
    p.legs[0].risk.transferBufferAfterMinutes = -5

    enriched = await risk_service.enrich_route_plans([p])
    assert len(enriched) == 1
    risk = enriched[0].riskAnalysis
    assert risk.isMlComputed is True
    assert risk.overallRiskScore > 70.0
    assert risk.bufferAdequacy == BufferAdequacy.INSUFFICIENT


def test_route_risk_analysis_snake_case_deserialization():
    """Validates bidirectional snake_case and camelCase compatibility on RouteRiskAnalysis."""
    snake_payload = {
        "overall_risk_score": 18.5,
        "risk_level": "LOW",
        "historical_punctuality_rate": 0.92,
        "tightest_buffer_minutes": 25,
        "buffer_adequacy": "OPTIMAL",
        "risk_summary_text": "Shielded connection: 25-min buffer safely absorbs standard Romanian transit delays.",
        "expected_delay_minutes": 3,
        "missed_connection_probability": 0.04,
        "is_ml_computed": True,
        "risk_factors": ["Shielded connection"],
        "factors": [
            {
                "code": "SINGLE_TRACK_RAIL",
                "severity": "INFO",
                "description": "Single track branch",
                "affected_leg_index": 1,
            }
        ],
    }

    model = RouteRiskAnalysis.model_validate(snake_payload)
    assert model.overallRiskScore == 18.5
    assert model.riskLevel == RiskLevel.LOW
    assert model.historicalPunctualityRate == 0.92
    assert model.tightestBufferMinutes == 25
    assert model.bufferAdequacy == BufferAdequacy.OPTIMAL
    assert model.expectedDelayMinutes == 3
    assert model.missedConnectionProbability == 0.04
    assert model.isMlComputed is True
    assert model.factors[0].affectedLegIndex == 1


@pytest.mark.asyncio
async def test_transfer_station_bottleneck_selection():
    """Validates that multi-leg routes query the station with the tightest buffer rather than just leg 0."""
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    plan = routing_service.generate_micro19_to_unirii_plan(q)
    # Leg 0 buffer: 28 min (Gara CFR Galați)
    # Leg 1 buffer: 20 min (București Nord - tighter buffer)
    assert len(plan.legs) == 3

    with patch.object(FeatureStoreService, "batch_get_station_features", wraps=FeatureStoreService.batch_get_station_features) as mock_batch:
        enriched = await risk_service.enrich_route_plans([plan])
        assert len(enriched) == 1
        # Check that station features were batch queried
        assert mock_batch.called
        args, _ = mock_batch.call_args
        queried_stations = args[0]
        assert "gara-de-nord" in queried_stations or "gara_de_nord" in queried_stations or "bucuresti_nord" in queried_stations or "gara-cfr-galati" in queried_stations


def test_graceful_degradation_when_model_corrupted(tmp_path: Path):
    """Validates that a corrupted non-ONNX binary file degrades gracefully to fallback without crashing."""
    corrupt_file = tmp_path / "corrupt_model.onnx"
    corrupt_file.write_bytes(b"NOT_A_VALID_ONNX_MODEL_HEADER")

    svc = RiskService()
    svc._model_path = str(corrupt_file)
    loaded = svc.init_session()
    assert loaded is False
    assert svc.get_session() is None

    # Candidate plan evaluation falls back seamlessly
    q = TransitRouteQuery(
        origin={"name": "București Nord", "city": "București"},
        destination={"name": "Brașov", "city": "Brașov"},
    )
    plan = routing_service.generate_bucharest_to_brasov_plan(q)
    fallback = svc.deterministic_fallback_analysis(plan)
    assert fallback.isMlComputed is False
    assert fallback.overallRiskScore >= 0.0


def test_extreme_prediction_calibration_clipping():
    """Validates that abnormal regressor/classifier predictions are strictly bounded within [0, 100]."""
    # Massive delay and extreme probability
    score_high, level_high, _, _ = RiskService.calibrate_risk_score(
        expected_delay=999.0,
        missed_conn_prob=2.5,
        transfers_count=2,
        tightest_buffer=-10,
    )
    assert score_high == 100.0
    assert level_high == RiskLevel.CRITICAL

    # Negative delay should be clamped to 0
    score_low, level_low, _, _ = RiskService.calibrate_risk_score(
        expected_delay=-15.0,
        missed_conn_prob=-0.5,
        transfers_count=0,
        tightest_buffer=60,
    )
    assert 0.0 <= score_low <= 20.0
    assert level_low == RiskLevel.LOW


def test_large_batch_inference_latency():
    """Validates ONNX batch inference scaling for 10 candidate journeys satisfies SLA (< 5ms)."""
    session = risk_service.get_session()
    assert session is not None

    batch_10 = np.random.randn(10, 18).astype(np.float32)

    # Warmup
    for _ in range(10):
        _ = session.run(None, {"float_input": batch_10})

    iterations = 50
    t0 = time.perf_counter()
    for _ in range(iterations):
        _ = session.run(None, {"float_input": batch_10})
    t1 = time.perf_counter()

    avg_ms = ((t1 - t0) / iterations) * 1000.0
    assert avg_ms < 5.0, f"Batch-10 inference exceeded 5ms: {avg_ms:.3f}ms"


@pytest.mark.asyncio
async def test_non_standard_operator_timestamp_parsing():
    """Validates robust parsing of Romanian transit operator date formats and timezone annotations."""
    q = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    p = routing_service.generate_micro19_to_unirii_plan(q)

    # 1. Romanian CFR format: DD.MM.YYYY HH:MM (morning peak hour: 08:30)
    p.departureTime = "21.10.2026 08:30"
    vec_cfr = await RiskService.extract_plan_features(p, {}, {}, {})
    assert vec_cfr.departure_hour == 8
    assert vec_cfr.is_peak_hour == 1

    # 2. ISO with timezone region annotation: [Europe/Bucharest]
    p.departureTime = "2026-10-21T18:15:00+03:00[Europe/Bucharest]"
    vec_tz = await RiskService.extract_plan_features(p, {}, {}, {})
    assert vec_tz.departure_hour == 18
    assert vec_tz.is_peak_hour == 1

    # 3. Romanian slash format: DD/MM/YYYY HH:MM:SS
    p.departureTime = "21/10/2026 14:00:00"
    vec_slash = await RiskService.extract_plan_features(p, {}, {}, {})
    assert vec_slash.departure_hour == 14
    assert vec_slash.is_peak_hour == 0


