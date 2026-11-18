import asyncio
from pathlib import Path
import time
import joblib
import numpy as np
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.schemas.route_plan import (
    RiskLevel,
    RouteRiskAnalysis,
    TransitRoutePlan,
    TransitRouteQuery,
)
from app.services.risk_service import risk_service
from app.services.routing_service import routing_service

BUNDLE_PATH = Path(settings.ML_MODEL_PATH).parent / "omni_production_bundle.pkl"
ONNX_PATH = Path(settings.ML_MODEL_PATH)
METADATA_PATH = Path(settings.ML_METADATA_PATH)


def test_production_bundle_artifacts_and_lineage():
    """Validates existence, integrity, and tournament lineage of omni_production_bundle.pkl."""
    assert BUNDLE_PATH.exists(), f"Production bundle missing at: {BUNDLE_PATH}"
    bundle = joblib.load(str(BUNDLE_PATH))

    assert bundle["version"] == "1.0.0"
    assert bundle["lineage"] == "v1_to_v51"
    assert bundle["corpus_rows"] == 1521651

    # Multi-head components
    for head_key in [
        "head1_res",
        "head1_dir",
        "head2_l2",
        "head2_p25",
        "head2_p75",
        "head2_p90",
        "head3_classifier",
        "head4_classifier",
        "head4_calibrator",
    ]:
        assert head_key in bundle, f"Missing multi-head component: {head_key}"

    # Causal and empirical Bayes priors
    assert "heb_encoders" in bundle
    assert "delay" in bundle["heb_encoders"]
    assert "p15" in bundle["heb_encoders"]
    assert "missed" in bundle["heb_encoders"]

    assert "latest_train_ema" in bundle and len(bundle["latest_train_ema"]) > 100
    assert "latest_corridor_ema" in bundle and len(bundle["latest_corridor_ema"]) > 50
    assert "hub_priors" in bundle and len(bundle["hub_priors"]) > 10
    assert "corridor_priors" in bundle and len(bundle["corridor_priors"]) > 50
    assert "turnaround_priors" in bundle and len(bundle["turnaround_priors"]) > 50
    assert "single_track_priors" in bundle and len(bundle["single_track_priors"]) > 10


def test_multihead_feature_schema_contracts():
    """Validates feature count and column naming contracts across 45 main and 51 Head-3 features."""
    bundle = joblib.load(str(BUNDLE_PATH))
    f_main = bundle["feature_names_main"]
    f_h3 = bundle["feature_names_h3"]

    assert len(f_main) == 45, f"Expected 45 main features, got {len(f_main)}"
    assert len(f_h3) == 51, f"Expected 51 Head 3 features, got {len(f_h3)}"
    assert f_h3[:45] == f_main

    # Verify key physics and Bayesian features are present
    expected_physics_features = [
        "train_category",
        "corridor_id_hash",
        "heb_delay",
        "heb_p15",
        "heb_missed",
        "train_del_ema_7d",
        "corridor_del_ema_7d",
        "autumn_rain_adhesion_loss",
        "cryogenic_braking_loss",
        "wet_snow_catenary_icing",
        "thermo_tribo_total_stress",
        "corridor_congestion_index",
        "hub_contagion_pressure",
        "turnaround_slack_deficit",
        "opposing_corridor_delay_3h_single_track",
    ]
    for feat in expected_physics_features:
        assert feat in f_main, f"Missing physics/Bayesian feature in schema: {feat}"


@pytest.mark.asyncio
async def test_end_to_end_route_enrichment_exposes_production_fields():
    """Validates that enrich_route_plans exposes all production multi-head fields on route and legs."""
    risk_service.init_session()
    assert risk_service._omni_bundle is not None, "Omni-Apex bundle not loaded in risk_service"

    q_connecting = TransitRouteQuery(
        origin={"name": "Micro 19", "city": "Galați"},
        destination={"name": "Piața Unirii", "city": "București"},
    )
    p_conn = routing_service.generate_micro19_to_unirii_plan(q_connecting)

    q_direct = TransitRouteQuery(
        origin={"name": "București Nord", "city": "București"},
        destination={"name": "Brașov", "city": "Brașov"},
    )
    p_direct = routing_service.generate_bucharest_to_brasov_plan(q_direct)

    enriched = await risk_service.enrich_route_plans([p_conn, p_direct])
    assert len(enriched) == 2

    # Check connecting plan
    r_conn = enriched[0].riskAnalysis
    assert r_conn.isMlComputed is True
    assert isinstance(r_conn.expectedDelayMinutes, int) and r_conn.expectedDelayMinutes >= 0
    assert isinstance(r_conn.expectedMeanDelayMinutes, float) and r_conn.expectedMeanDelayMinutes >= 0.0
    assert isinstance(r_conn.p90DelayMinutes, int) and r_conn.p90DelayMinutes >= r_conn.expectedDelayMinutes
    assert isinstance(r_conn.missedConnectionProbability, float) and 0.0 <= r_conn.missedConnectionProbability <= 1.0
    assert isinstance(r_conn.reliabilityScorePct, float) and 0.0 <= r_conn.reliabilityScorePct <= 100.0
    assert 0.0 <= r_conn.risk_score <= 100.0
    assert r_conn.risk_level in [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert len(r_conn.riskFactors) > 0

    # Check legs of connecting plan
    for leg in enriched[0].legs:
        assert leg.risk.expectedDelayMinutes is not None
        assert leg.risk.expectedMeanDelayMinutes is not None
        assert leg.risk.p90DelayMinutes is not None
        assert leg.risk.missedConnectionProbability is not None
        assert leg.risk.reliabilityScorePct is not None
        assert leg.risk.riskScore is not None
        assert leg.risk.riskLevel is not None
        assert len(leg.risk.riskFactors) > 0

    # Check direct plan (missedConnectionProbability should be 0.0)
    r_dir = enriched[1].riskAnalysis
    assert r_dir.isMlComputed is True
    assert r_dir.missedConnectionProbability == 0.0
    assert r_dir.expectedDelayMinutes >= 0
    assert r_dir.expectedMeanDelayMinutes >= 0.0
    assert r_dir.p90DelayMinutes >= r_dir.expectedDelayMinutes
    assert 0.0 <= r_dir.reliabilityScorePct <= 100.0


def test_multihead_inference_sub_2ms_latency_benchmark():
    """
    Validates that vectorized multi-head booster inference for a batch of 5 candidate
    routes executes strictly under the < 2.0 ms SLA budget.
    """
    risk_service.init_session()
    raw = risk_service._raw_boosters
    assert raw is not None, "Raw boosters not initialized"
    bundle = risk_service._omni_bundle

    # Batch of 5 candidate journeys
    X_dummy = np.zeros((5, 45), dtype=np.float32)
    X_dummy[:, 0] = 5.0    # IR
    X_dummy[:, 10] = 20.0  # 20-min buffer
    X_dummy[:, 9] = 1.0    # connecting

    # Warmup
    for _ in range(15):
        _ = raw["h1_res"].predict(X_dummy)

    runs = 100
    t0 = time.perf_counter()
    for _ in range(runs):
        p_res = np.maximum(0.0, raw["h1_res"].predict(X_dummy))
        p_dir = np.maximum(0.0, raw["h1_dir"].predict(X_dummy))
        p50 = 0.50 * p_res + 0.50 * p_dir

        p_l2 = np.maximum(0.0, raw["h2_l2"].predict(X_dummy))
        p25 = np.maximum(0.0, raw["h2_p25"].predict(X_dummy))
        p75 = np.maximum(p25, raw["h2_p75"].predict(X_dummy))
        p90 = np.maximum(p75, raw["h2_p90"].predict(X_dummy))
        iqr = np.maximum(1.0, p75 - p25)

        z15 = (15.0 - p50) / iqr
        z_tr = (20.0 - p50) / iqr
        eff_tr = 20.0 - p50

        X_h3 = np.column_stack([X_dummy, z_tr, eff_tr, z15, iqr, p50, p_l2])
        p_mis = raw["h3"].predict(X_h3)

        raw_rel = raw["h4"].predict(X_dummy)
        cal_rel = bundle["head4_calibrator"].transform(raw_rel) * 100.0
    t1 = time.perf_counter()

    avg_ms = ((t1 - t0) / runs) * 1000.0
    assert avg_ms < 2.0, f"Multi-head inference latency exceeded 2.0ms SLA: {avg_ms:.4f} ms"


@pytest.mark.asyncio
async def test_fastapi_route_plan_endpoint_exposes_omni_fields(client: AsyncClient):
    """
    Validates that the live FastAPI route planning endpoint (/api/v1/routes/plan)
    exposes all 5 Omni-Apex production risk metrics in the JSON payload.
    """
    payload = {
        "origin": {"name": "Micro 19", "city": "Galați"},
        "destination": {"name": "Piața Unirii", "city": "București"},
    }
    res = await client.post("/api/v1/routes/plan", json=payload)
    assert res.status_code == 200, f"HTTP error {res.status_code}: {res.text}"

    data = res.json()
    assert "plans" in data and len(data["plans"]) >= 1

    plan = data["plans"][0]
    risk = plan["riskAnalysis"]

    # Verify all production multi-head aliases are present and valid
    assert "expectedDelayMinutes" in risk
    assert "expectedMeanDelayMinutes" in risk
    assert "p90DelayMinutes" in risk
    assert "missedConnectionProbability" in risk
    assert "reliabilityScorePct" in risk
    assert "overallRiskScore" in risk
    assert "riskLevel" in risk
    assert "riskFactors" in risk

    assert isinstance(risk["expectedDelayMinutes"], int)
    assert isinstance(risk["expectedMeanDelayMinutes"], float)
    assert isinstance(risk["p90DelayMinutes"], int)
    assert 0.0 <= risk["missedConnectionProbability"] <= 1.0
    assert 0.0 <= risk["reliabilityScorePct"] <= 100.0

    # Verify leg-level risk profiles expose omni fields
    assert len(plan["legs"]) > 0
    for leg in plan["legs"]:
        l_risk = leg["risk"]
        assert "expectedDelayMinutes" in l_risk
        assert "expectedMeanDelayMinutes" in l_risk
        assert "p90DelayMinutes" in l_risk
        assert "missedConnectionProbability" in l_risk
        assert "reliabilityScorePct" in l_risk


def test_production_heb_lookups_and_priors():
    """Validates 3-level Hierarchical Empirical Bayes lookups for known and cold-start entities."""
    bundle = joblib.load(str(BUNDLE_PATH))
    heb_delay = bundle["heb_encoders"]["delay"]
    heb_p15 = bundle["heb_encoders"]["p15"]
    heb_missed = bundle["heb_encoders"]["missed"]

    # Known CFR intercity train
    known_del = heb_delay.lookup("IR 1572", 5.0, "glt-bct")
    known_p15 = heb_p15.lookup("IR 1572", 5.0, "glt-bct")
    known_mis = heb_missed.lookup("IR 1572", 5.0, "glt-bct")

    assert 10.0 <= known_del <= 60.0
    assert 0.0 <= known_p15 <= 1.0
    assert 0.0 <= known_mis <= 1.0

    # Cold-start unknown train and corridor
    cold_del = heb_delay.lookup("UNKNOWN_9999", 5.0, "unknown-unknown")
    cold_p15 = heb_p15.lookup("UNKNOWN_9999", 5.0, "unknown-unknown")
    cold_mis = heb_missed.lookup("UNKNOWN_9999", 5.0, "unknown-unknown")

    # Cold start should fall back smoothly to global empirical priors without crashing
    assert 15.0 <= cold_del <= 40.0
    assert 0.0 <= cold_p15 <= 1.0
    assert 0.0 <= cold_mis <= 1.0
