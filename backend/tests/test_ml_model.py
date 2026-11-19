import hashlib
import json
import os
from pathlib import Path
import time
import numpy as np
import onnxruntime as ort
import pytest

from app.core.config import settings
from app.services.feature_store_service import FeatureStoreService, corridor_hash
from scripts.train_risk_model import (
    FEATURE_NAMES,
    MODE_ENCODING,
    SINGLE_TRACK_CORRIDORS,
    STATION_NAMES,
    deterministic_corridor_hash,
    generate_synthetic_dataset,
    haversine_distance_km,
)

MODEL_PATH = Path(settings.ML_MODEL_PATH)
METADATA_PATH = Path(settings.ML_METADATA_PATH)


def test_ml_model_artifacts_exist_and_size():
    """Validates compiled ONNX binary artifact exists, is valid, and within size budget (< 1MB)."""
    assert MODEL_PATH.exists(), f"ONNX model missing at: {MODEL_PATH}"
    assert METADATA_PATH.exists(), f"Metadata JSON missing at: {METADATA_PATH}"

    file_size_kb = MODEL_PATH.stat().st_size / 1024.0
    assert file_size_kb < 1024.0, f"ONNX model file size exceeded 1MB: {file_size_kb:.1f} KB"
    assert file_size_kb > 50.0, f"ONNX model unexpectedly small: {file_size_kb:.1f} KB"


def test_ml_model_metadata_schema():
    """Validates model metadata JSON schema, SHA256 integrity, and evaluation metrics."""
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["model_name"] == "RomanianTransitRiskModel"
    assert meta["version"] == "1.0.0"
    assert meta["feature_count"] == 18
    assert meta["feature_names"] == FEATURE_NAMES
    assert len(set(FEATURE_NAMES)) == 18  # No duplicates
    assert "input_tensor" in meta
    assert meta["input_tensor"]["name"] == "float_input"
    assert meta["input_tensor"]["shape"] == [None, 18]

    assert len(meta["output_tensors"]) == 2
    output_map = {o["name"]: o for o in meta["output_tensors"]}
    assert "expected_delay" in output_map
    assert "missed_connection_prob" in output_map

    # Output semantics documentation
    assert output_map["missed_connection_prob"]["positive_class_index"] == 1

    # Check sha256 match
    with open(MODEL_PATH, "rb") as f:
        actual_sha = hashlib.sha256(f.read()).hexdigest()
    assert meta["model_sha256"] == actual_sha

    # Check metrics SLA thresholds
    eval_m = meta["evaluation_metrics"]
    assert eval_m["regressor_expected_delay"]["mae"] < 15.0
    assert eval_m["classifier_missed_connection"]["roc_auc"] > 0.90
    assert eval_m["classifier_missed_connection"]["brier_score"] < 0.10


def test_onnx_inference_session_and_outputs():
    """Tests loading ONNX session, verifying input/output contracts, and executing inference."""
    session_options = ort.SessionOptions()
    session_options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(MODEL_PATH), sess_options=session_options, providers=["CPUExecutionProvider"])

    inputs = session.get_inputs()
    assert len(inputs) == 1
    assert inputs[0].name == "float_input"
    assert inputs[0].shape[-1] == 18

    outputs = session.get_outputs()
    output_names = [o.name for o in outputs]
    assert "expected_delay" in output_names
    assert "missed_connection_prob" in output_names

    # Test single-record and batched inference
    test_batch = np.zeros((5, 18), dtype=np.float32)
    # București-Brașov scenario with 15-min rolling delay
    test_batch[0, 0] = 5.0     # IR
    test_batch[0, 1] = 120.0   # corridor hash
    test_batch[0, 2] = 145.0   # duration
    test_batch[0, 4] = 140.0   # distance
    test_batch[0, 15] = 15.0   # rolling 3h delay
    test_batch[0, 17] = 0.82   # CFR

    res = session.run(None, {"float_input": test_batch})
    expected_delay = res[0]
    missed_conn_prob = res[1]

    assert expected_delay.shape == (5, 1)
    assert missed_conn_prob.shape == (5, 2)

    # Probabilities should sum to 1.0 per row
    prob_sums = np.sum(missed_conn_prob, axis=1)
    assert np.allclose(prob_sums, 1.0, atol=1e-4)
    # Expected delay should be non-negative (within tolerance)
    assert np.all(expected_delay >= -0.5)


def test_onnx_variable_batch_sizes():
    """Validates ONNX model dynamic batching support for 1, 3 (Curated Trifecta), and 25 items."""
    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])

    for batch_size in [1, 3, 25]:
        sample = np.random.randn(batch_size, 18).astype(np.float32)
        res = session.run(None, {"float_input": sample})
        assert res[0].shape == (batch_size, 1)
        assert res[1].shape == (batch_size, 2)
        assert not np.isnan(res[0]).any()
        assert not np.isnan(res[1]).any()


def test_onnx_edge_cases_and_boundaries():
    """Validates realistic predictions and probability calibration under extreme operational conditions."""
    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])

    # Scenario A: Ideal direct trip (no transfer, high punctuality carrier, 0 disruptions, 0 rolling delay)
    ideal_trip = np.zeros((1, 18), dtype=np.float32)
    ideal_trip[0, 0] = 1.0      # METRO
    ideal_trip[0, 2] = 20.0     # 20 min
    ideal_trip[0, 9] = 0.0      # has_transfer = 0
    ideal_trip[0, 10] = 999.0   # buffer
    ideal_trip[0, 17] = 0.98    # Metrorex punctuality

    res_ideal = session.run(None, {"float_input": ideal_trip})
    ideal_delay = res_ideal[0][0, 0]
    ideal_missed_prob = res_ideal[1][0, 1]

    assert ideal_delay < 7.0, f"Expected small delay for ideal Metro trip, got {ideal_delay}"
    assert ideal_missed_prob < 0.01, f"Expected near-zero missed connection prob for direct trip, got {ideal_missed_prob}"

    # Scenario B: Cascading severe disruptions (CRITICAL severity, 45-min rolling delay, single-track corridor)
    disrupted_trip = np.zeros((1, 18), dtype=np.float32)
    disrupted_trip[0, 0] = 5.0     # IR
    disrupted_trip[0, 2] = 215.0   # 215 min
    disrupted_trip[0, 9] = 1.0     # has_transfer = 1
    disrupted_trip[0, 10] = 8.0    # tight 8-min buffer!
    disrupted_trip[0, 12] = 0.85   # congested transfer station
    disrupted_trip[0, 13] = 3.0    # 3 active disruptions
    disrupted_trip[0, 14] = 3.0    # CRITICAL severity
    disrupted_trip[0, 15] = 45.0   # 45-min rolling delay
    disrupted_trip[0, 17] = 0.82   # CFR punctuality

    res_disrupted = session.run(None, {"float_input": disrupted_trip})
    disrupted_delay = res_disrupted[0][0, 0]
    disrupted_missed_prob = res_disrupted[1][0, 1]

    assert disrupted_delay > 18.0, f"Expected high delay for severely disrupted trip, got {disrupted_delay}"
    assert disrupted_missed_prob > 0.90, f"Expected high missed connection probability for tight buffer with critical delay, got {disrupted_missed_prob}"
    assert ideal_delay < disrupted_delay
    assert ideal_missed_prob < disrupted_missed_prob


def test_onnx_batch_latency_benchmark():
    """Asserts standalone ONNX Runtime CPU batch latency meets production SLA (< 1.0ms for batch of 5)."""
    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    test_batch = np.random.randn(5, 18).astype(np.float32)

    # Warm-up
    for _ in range(50):
        _ = session.run(None, {"float_input": test_batch})

    runs = 100
    t0 = time.perf_counter()
    for _ in range(runs):
        _ = session.run(None, {"float_input": test_batch})
    t1 = time.perf_counter()

    avg_ms = ((t1 - t0) / runs) * 1000.0
    assert avg_ms < 1.0, f"ONNX CPU inference too slow: {avg_ms:.4f}ms > 1.0ms SLA"


def test_dataset_generator_contract():
    """Tests synthetic dataset generator yields compliant (N, 18) feature matrix without NaNs."""
    df = generate_synthetic_dataset(n_samples=500, seed=123)
    assert len(df) == 500
    assert all(feat in df.columns for feat in FEATURE_NAMES)
    assert df[FEATURE_NAMES].isna().sum().sum() == 0
    assert np.isinf(df[FEATURE_NAMES].to_numpy()).sum() == 0

    # Test helpers and edge cases
    dist = haversine_distance_km(44.4473, 26.0753, 45.6607, 25.6144)
    assert 130.0 < dist < 150.0

    # Identical coordinates
    assert haversine_distance_km(44.4473, 26.0753, 44.4473, 26.0753) == 0.0
    # None coordinates
    assert haversine_distance_km(None, 26.0, 45.0, 25.0) == 0.0

    # Corridor hash determinism
    c_hash = deterministic_corridor_hash("bucuresti_nord-brasov")
    assert 0 <= c_hash < 1000
    assert c_hash == FeatureStoreService.corridor_hash("bucuresti_nord-brasov")
    assert corridor_hash("") == 0
    assert corridor_hash(None) == 0
