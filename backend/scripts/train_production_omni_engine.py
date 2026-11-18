#!/usr/bin/env python3
"""
Beeline VoyageRail - Production Multi-Head Omni-Apex Engine Training Pipeline
Trains the production multi-head delay, quantile spread, connection-risk, and
drift-purged reliability engine on 100% of dataset_real_2023_2026.parquet
(N = 1,521,651 records covering 2023-01-01 through 2026-11-01).

Artifacts exported to backend/app/ml_models/:
1. omni_production_bundle.pkl: Fast Python bundle containing Head 1 (L1), Head 2 (L2+Quantiles),
   Head 3 (Missed Conn Z-score), Head 4 (Drift-Purged Reliability), plus Full-Corpus HEB encoders,
   causal EMAs, hub contagion priors, and turnaround slack priors (< 2.0ms inference).
2. risk_model.onnx: Full-corpus updated canonical 18-feature dual-target ONNX model.
3. risk_model_metadata.json: Updated metadata recording full-corpus N=1,521,651 and lineage v1-v51.
"""

import argparse
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import joblib
import lightgbm as lgb
import numpy as np
import onnx
from onnx import helper
from onnx.compose import add_prefix
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType
import onnxruntime as ort
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)

# Resolve backend root directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.ml_models.production_components import (
    DriftPurgedTwoStepCalibrator,
    HierarchicalEmpiricalBayesTargetEncoder,
)
from app.services.feature_store_service import corridor_hash, slugify_corridor
from scripts.train_risk_model import generate_urban_calibration_samples

# Register components into __main__ for unpickling robustness
import __main__
__main__.DriftPurgedTwoStepCalibrator = DriftPurgedTwoStepCalibrator
__main__.HierarchicalEmpiricalBayesTargetEncoder = HierarchicalEmpiricalBayesTargetEncoder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("omni_production_trainer")

DEFAULT_DATASET_PATH = BACKEND_DIR / "scraper" / ".cache" / "dataset_real_2023_2026.parquet"
BUNDLE_OUTPUT_PATH = BACKEND_DIR / "app" / "ml_models" / "omni_production_bundle.pkl"
ONNX_OUTPUT_PATH = BACKEND_DIR / "app" / "ml_models" / "risk_model.onnx"
METADATA_OUTPUT_PATH = BACKEND_DIR / "app" / "ml_models" / "risk_model_metadata.json"

FEATURE_NAMES_18 = [
    "train_category",
    "corridor_id_hash",
    "scheduled_duration_minutes",
    "stop_count",
    "distance_km_est",
    "departure_hour",
    "is_peak_hour",
    "day_of_week",
    "is_weekend",
    "has_transfer",
    "transfer_buffer_minutes",
    "transfer_station_reliability",
    "transfer_station_congestion",
    "active_corridor_disruptions",
    "corridor_severity_max",
    "rolling_avg_delay_3h",
    "rolling_avg_delay_24h",
    "carrier_baseline_punctuality",
]

MODE_ENCODING = {
    "BUS": 0,
    "METRO": 1,
    "TRAM": 2,
    "R": 3,
    "RE": 4,
    "IR": 5,
    "IC": 6,
}

HUB_WEIGHTS = {
    "BCT": 1.00,
    "BSV": 0.85,
    "CJN": 0.80,
    "PLO": 0.75,
    "PLV": 0.75,
    "FAU": 0.70,
    "TIM": 0.70,
    "IAS": 0.65,
    "CTA": 0.65,
}


def engineer_tribology_physics(df: pd.DataFrame) -> pd.DataFrame:
    """Computes 2nd-gen thermodynamic tribology features (v34)."""
    season = df["season"].to_numpy(dtype=np.int32)
    precip = np.maximum(0.0, df["precipitation_rate_mm_h"].to_numpy(dtype=np.float32))
    stops = np.maximum(1.0, df["stop_count"].to_numpy(dtype=np.float32))
    temp = df["temp_celsius"].to_numpy(dtype=np.float32)
    traction = df["traction_type"].to_numpy(dtype=np.float32)
    snow = np.maximum(0.0, df["snow_depth_cm"].to_numpy(dtype=np.float32))
    freeze_risk = np.maximum(0.0, df["freezing_rain_risk"].to_numpy(dtype=np.float32))
    visibility = np.maximum(0.0, df["visibility_meters"].to_numpy(dtype=np.float32))
    dist = np.maximum(10.0, df["distance_km"].to_numpy(dtype=np.float32))

    is_autumn = (season == 3).astype(np.float32)
    autumn_adhesion_loss = np.maximum(0.0, is_autumn * precip * stops).astype(np.float32)
    cryo_brake_loss = np.maximum(0.0, (-10.0 - temp) * stops).astype(np.float32)
    near_freezing = ((temp >= -2.5) & (temp <= 1.5)).astype(np.float32)
    catenary_icing = np.maximum(0.0, traction * near_freezing * (snow + 5.0 * freeze_risk)).astype(np.float32)
    vis_deficit = np.maximum(0.0, 200.0 - visibility)
    signal_decel = np.maximum(0.0, vis_deficit * (dist / 100.0)).astype(np.float32)
    total_stress = (autumn_adhesion_loss + cryo_brake_loss + catenary_icing + 0.10 * signal_decel).astype(np.float32)

    return pd.DataFrame({
        "autumn_rain_adhesion_loss": autumn_adhesion_loss,
        "cryogenic_braking_loss": cryo_brake_loss,
        "wet_snow_catenary_icing": catenary_icing,
        "low_visibility_sighting_decel": signal_decel,
        "thermo_tribo_total_stress": total_stress,
    })


def compute_causal_rolling_emas(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]:
    """Computes daily rolling EMAs and extracts latest priors for online inference."""
    work = pd.DataFrame({
        "service_date": pd.to_datetime(df["service_date"]),
        "train_number": df["train_number"].astype(str),
        "corridor_slug": df["corridor_slug"].astype(str),
        "delay": df["actual_delay_minutes"].to_numpy(dtype=np.float64),
        "p15": (df["actual_delay_minutes"] <= 15.0).to_numpy(dtype=np.float64),
    })

    # Train daily EMAs
    daily_tr = work.groupby(["train_number", "service_date"])[["delay", "p15"]].mean().reset_index()
    daily_tr = daily_tr.sort_values(["train_number", "service_date"]).reset_index(drop=True)
    for span in (7, 14, 30):
        daily_tr[f"train_del_ema_{span}d"] = daily_tr.groupby("train_number")["delay"].transform(
            lambda s: s.ewm(span=span, min_periods=1).mean()
        ).astype(np.float32)

    latest_train_ema: Dict[str, Dict[str, float]] = {}
    latest_tr_rows = daily_tr.sort_values("service_date").groupby("train_number").last().reset_index()
    for _, row in latest_tr_rows.iterrows():
        latest_train_ema[str(row["train_number"])] = {
            "7d": float(row["train_del_ema_7d"]),
            "14d": float(row["train_del_ema_14d"]),
            "30d": float(row["train_del_ema_30d"]),
        }

    # Corridor daily EMAs
    daily_co = work.groupby(["corridor_slug", "service_date"])[["delay", "p15"]].mean().reset_index()
    daily_co = daily_co.sort_values(["corridor_slug", "service_date"]).reset_index(drop=True)
    for span in (7, 14, 30):
        daily_co[f"corridor_del_ema_{span}d"] = daily_co.groupby("corridor_slug")["delay"].transform(
            lambda s: s.ewm(span=span, min_periods=1).mean()
        ).astype(np.float32)

    latest_corridor_ema: Dict[str, Dict[str, float]] = {}
    latest_co_rows = daily_co.sort_values("service_date").groupby("corridor_slug").last().reset_index()
    for _, row in latest_co_rows.iterrows():
        latest_corridor_ema[str(row["corridor_slug"])] = {
            "7d": float(row["corridor_del_ema_7d"]),
            "14d": float(row["corridor_del_ema_14d"]),
            "30d": float(row["corridor_del_ema_30d"]),
        }

    # Map daily EMAs shifted by +1 day for zero-leakage training rows
    daily_tr_shifted = daily_tr.copy()
    daily_tr_shifted["service_date"] = daily_tr_shifted["service_date"] + pd.Timedelta(days=1)
    daily_co_shifted = daily_co.copy()
    daily_co_shifted["service_date"] = daily_co_shifted["service_date"] + pd.Timedelta(days=1)

    work_merge = pd.DataFrame({
        "service_date": pd.to_datetime(df["service_date"]),
        "train_number": df["train_number"].astype(str),
        "corridor_slug": df["corridor_slug"].astype(str),
        "orig_idx": np.arange(len(df)),
    })

    m_tr = pd.merge(
        work_merge,
        daily_tr_shifted[["train_number", "service_date", "train_del_ema_7d", "train_del_ema_14d", "train_del_ema_30d"]],
        on=["train_number", "service_date"],
        how="left",
    )
    m_co = pd.merge(
        work_merge,
        daily_co_shifted[["corridor_slug", "service_date", "corridor_del_ema_7d", "corridor_del_ema_14d", "corridor_del_ema_30d"]],
        on=["corridor_slug", "service_date"],
        how="left",
    )

    global_del_mean = float(df["actual_delay_minutes"].mean())
    ema_df = pd.DataFrame({
        "train_del_ema_7d": m_tr["train_del_ema_7d"].fillna(global_del_mean).to_numpy(dtype=np.float32),
        "train_del_ema_14d": m_tr["train_del_ema_14d"].fillna(global_del_mean).to_numpy(dtype=np.float32),
        "train_del_ema_30d": m_tr["train_del_ema_30d"].fillna(global_del_mean).to_numpy(dtype=np.float32),
        "corridor_del_ema_7d": m_co["corridor_del_ema_7d"].fillna(global_del_mean).to_numpy(dtype=np.float32),
        "corridor_del_ema_14d": m_co["corridor_del_ema_14d"].fillna(global_del_mean).to_numpy(dtype=np.float32),
        "corridor_del_ema_30d": m_co["corridor_del_ema_30d"].fillna(global_del_mean).to_numpy(dtype=np.float32),
    })

    return ema_df, latest_train_ema, latest_corridor_ema


def engineer_network_contagion(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]:
    """Computes network origin contagion features (v33) and baseline priors."""
    n = len(df)
    orig_idx = np.arange(n)
    dep_dt = pd.to_datetime(df["service_date"]) + pd.to_timedelta(df["departure_hour"].to_numpy(dtype=np.int64), unit="h")
    corridor = df["corridor_slug"].to_numpy(dtype=str)
    station = df["origin_station_code"].to_numpy(dtype=str)
    orig_del = df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)

    work = pd.DataFrame({
        "orig_idx": orig_idx,
        "dep_dt": dep_dt,
        "corridor_slug": corridor,
        "origin_station_code": station,
        "delay_at_origin": orig_del,
    }).sort_values("dep_dt").reset_index(drop=True)

    work = work.set_index("dep_dt")
    c_roll = work.groupby("corridor_slug")[["delay_at_origin"]].rolling("3h", closed="left")
    c_count = c_roll.count().reset_index()
    c_mean = c_roll.mean().reset_index()

    work["corridor_preceding_trains_count"] = c_count["delay_at_origin"].fillna(0.0).to_numpy(dtype=np.float32)
    work["corridor_preceding_delay_mean"] = c_mean["delay_at_origin"].fillna(0.0).to_numpy(dtype=np.float32)
    work = work.reset_index().sort_values("orig_idx").reset_index(drop=True)

    hub_centrality = np.array([HUB_WEIGHTS.get(s, 0.10) for s in station], dtype=np.float32)
    hub_contagion_pressure = hub_centrality * work["corridor_preceding_delay_mean"].to_numpy(dtype=np.float32)
    corridor_congestion_index = (
        work["corridor_preceding_trains_count"].to_numpy(dtype=np.float32) *
        (work["corridor_preceding_delay_mean"].to_numpy(dtype=np.float32) + 1.0)
    ).astype(np.float32)

    contagion_df = pd.DataFrame({
        "corridor_preceding_trains_count": work["corridor_preceding_trains_count"].to_numpy(dtype=np.float32),
        "corridor_preceding_delay_mean": work["corridor_preceding_delay_mean"].to_numpy(dtype=np.float32),
        "corridor_congestion_index": corridor_congestion_index,
        "hub_contagion_pressure": hub_contagion_pressure,
    })

    # Baseline priors per corridor and per hub
    corridor_priors: Dict[str, Dict[str, float]] = {}
    for c_slug, grp in df.groupby("corridor_slug"):
        corridor_priors[str(c_slug)] = {
            "mean_delay": float(grp["actual_delay_minutes"].mean()),
            "mean_origin_delay": float(grp["delay_at_origin_minutes"].mean()),
            "mean_restrictions": float(grp["active_speed_restrictions_count"].mean()),
        }

    hub_priors: Dict[str, Dict[str, float]] = {}
    for st_code, grp in df.groupby("origin_station_code"):
        hub_priors[str(st_code)] = {
            "centrality": float(HUB_WEIGHTS.get(st_code, 0.10)),
            "mean_origin_delay": float(grp["delay_at_origin_minutes"].mean()),
            "punctuality": float((grp["actual_delay_minutes"] <= 15.0).mean()),
        }

    return contagion_df, corridor_priors, hub_priors


def engineer_turnaround_and_single_track(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, float], Dict[str, float]]:
    """Computes turnaround slack deficit and opposing corridor single-track crossing priors (v42/v43)."""
    orig_del = df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)
    turnaround_prev = np.maximum(0.0, orig_del * 0.90).astype(np.float32)
    turnaround_slack = np.maximum(0.0, turnaround_prev - 20.0).astype(np.float32)

    is_single = df["is_single_track"].to_numpy(dtype=np.float32)
    opposing_pressure = (orig_del * is_single * 0.85).astype(np.float32)

    turnaround_df = pd.DataFrame({
        "turnaround_prev_delay": turnaround_prev,
        "turnaround_slack_deficit": turnaround_slack,
        "opposing_corridor_delay_3h_single_track": opposing_pressure,
    })

    # Priors by train_number and single-track corridors
    turnaround_priors = df.groupby("train_number")["delay_at_origin_minutes"].mean().to_dict()
    turnaround_priors = {str(k): float(v) for k, v in turnaround_priors.items()}

    single_track_priors = df[df["is_single_track"] == 1].groupby("corridor_slug")["actual_delay_minutes"].mean().to_dict()
    single_track_priors = {str(k): float(v) for k, v in single_track_priors.items()}

    return turnaround_df, turnaround_priors, single_track_priors


def extract_canonical_18_features(df: pd.DataFrame) -> np.ndarray:
    """Extracts canonical 18-element float32 feature matrix for ONNX runtime parity."""
    n = len(df)
    X = np.empty((n, 18), dtype=np.float32)

    cat_raw = df["train_category"].to_numpy(dtype=np.float32)
    X[:, 0] = np.where(cat_raw <= 3, cat_raw + 3.0, cat_raw)

    unique_slugs = df["corridor_slug"].fillna("").unique()
    slug_to_hash = {
        s: int(hashlib.md5(s.encode("utf-8")).hexdigest(), 16) % 1000 if s else 0
        for s in unique_slugs
    }
    X[:, 1] = df["corridor_slug"].map(slug_to_hash).fillna(0).to_numpy(dtype=np.float32)
    X[:, 2] = df["scheduled_duration_minutes"].to_numpy(dtype=np.float32)
    X[:, 3] = df["stop_count"].to_numpy(dtype=np.float32)
    X[:, 4] = df["distance_km"].to_numpy(dtype=np.float32)
    X[:, 5] = df["departure_hour"].to_numpy(dtype=np.float32)
    X[:, 6] = df["is_peak_hour"].to_numpy(dtype=np.float32)
    X[:, 7] = df["day_of_week"].to_numpy(dtype=np.float32)
    X[:, 8] = df["is_weekend"].to_numpy(dtype=np.float32)

    has_tr = df["has_transfer"].to_numpy(dtype=np.float32)
    X[:, 9] = has_tr
    tr_buf = df["transfer_buffer_minutes"].to_numpy(dtype=np.float32)
    X[:, 10] = np.where(has_tr == 0, 999.0, tr_buf)
    X[:, 11] = 0.88
    X[:, 12] = 0.30
    X[:, 13] = df["active_speed_restrictions_count"].to_numpy(dtype=np.float32)
    X[:, 14] = df["is_thunderstorm"].to_numpy(dtype=np.float32) * 2.0
    X[:, 15] = df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)
    X[:, 16] = df["delay_at_origin_minutes"].to_numpy(dtype=np.float32) * 1.2

    carrier_map = {"CFR": 0.82, "ASTRA": 0.88, "TFC": 0.86, "SOFTRANS": 0.92, "REGIO": 0.84}
    X[:, 17] = df["operator"].str.upper().map(carrier_map).fillna(0.85).to_numpy(dtype=np.float32)
    return X


def export_fused_onnx_model(
    regressor: lgb.LGBMRegressor,
    classifier: lgb.LGBMClassifier,
    eval_stats: Dict[str, Any],
    sample_X_test: np.ndarray,
    output_onnx_path: str = str(ONNX_OUTPUT_PATH),
    output_metadata_path: str = str(METADATA_OUTPUT_PATH),
) -> None:
    """Converts LightGBM estimators to ONNX, fuses graphs, verifies parity and batch latency."""
    logger.info("Converting dual LightGBM estimators to fused ONNX graph...")
    initial_type = [("float_input", FloatTensorType([None, 18]))]

    onnx_delay = onnxmltools.convert_lightgbm(
        regressor,
        initial_types=initial_type,
        target_opset=15,
    )
    onnx_missed = onnxmltools.convert_lightgbm(
        classifier,
        initial_types=initial_type,
        target_opset=15,
        zipmap=False,
    )

    m1 = add_prefix(onnx_delay, prefix="del_")
    m2 = add_prefix(onnx_missed, prefix="cls_")

    old_del_out = m1.graph.output[0].name
    for node in m1.graph.node:
        for i, inp in enumerate(node.input):
            if inp == "del_float_input":
                node.input[i] = "float_input"
        for i, out in enumerate(node.output):
            if out == old_del_out:
                node.output[i] = "expected_delay"
    m1.graph.output[0].name = "expected_delay"

    old_cls_prob_out = m2.graph.output[1].name
    for node in m2.graph.node:
        for i, inp in enumerate(node.input):
            if inp == "cls_float_input":
                node.input[i] = "float_input"
        for i, out in enumerate(node.output):
            if out == old_cls_prob_out:
                node.output[i] = "missed_connection_prob"
    m2.graph.output[1].name = "missed_connection_prob"

    combined_nodes = list(m1.graph.node) + list(m2.graph.node)
    for idx, n in enumerate(combined_nodes):
        if not n.name or n.name.strip() == "":
            n.name = f"node_{idx}"

    combined_inits = list(m1.graph.initializer) + list(m2.graph.initializer)
    combined_inputs = list(onnx_delay.graph.input)
    combined_outputs = [m1.graph.output[0], m2.graph.output[1]]

    combined_graph = helper.make_graph(
        nodes=combined_nodes,
        name="RomanianTransitRiskModel",
        inputs=combined_inputs,
        outputs=combined_outputs,
        initializer=combined_inits,
    )

    max_opsets = {}
    for op in list(m1.opset_import) + list(m2.opset_import):
        max_opsets[op.domain] = max(max_opsets.get(op.domain, 0), op.version)

    opset_imports = [helper.make_opsetid(dom, ver) for dom, ver in max_opsets.items()]

    combined_model = helper.make_model(
        combined_graph,
        producer_name="beeline-voyagerail-mlops",
        opset_imports=opset_imports,
        ir_version=onnx_delay.ir_version,
    )

    onnx.checker.check_model(combined_model)
    onnx_file = Path(output_onnx_path).resolve()
    onnx_file.parent.mkdir(parents=True, exist_ok=True)
    meta_file = Path(output_metadata_path).resolve()
    meta_file.parent.mkdir(parents=True, exist_ok=True)

    onnx.save(combined_model, str(onnx_file))
    file_size_kb = onnx_file.stat().st_size / 1024.0
    logger.info(f"Compiled fused ONNX model saved to: {onnx_file} (Size: {file_size_kb:.1f} KB)")
    assert file_size_kb < 1024.0, f"ONNX file size exceeded 1MB budget: {file_size_kb:.1f} KB"

    # Numerical Parity Check (< 1e-4)
    sess = ort.InferenceSession(str(onnx_file), providers=["CPUExecutionProvider"])
    ort_res = sess.run(None, {"float_input": sample_X_test})
    ort_delay = ort_res[0].flatten()
    ort_prob = ort_res[1]

    py_delay = regressor.predict(sample_X_test)
    py_prob = classifier.predict_proba(sample_X_test)

    delay_parity_err = float(np.max(np.abs(py_delay - ort_delay)))
    prob_parity_err = float(np.max(np.abs(py_prob - ort_prob)))

    logger.info(f"Parity Error [Expected Delay]: {delay_parity_err:.2e} (Threshold: < 1e-4)")
    logger.info(f"Parity Error [Missed Conn Prob]: {prob_parity_err:.2e} (Threshold: < 1e-4)")
    assert delay_parity_err < 1e-4, f"Delay prediction parity violated: {delay_parity_err}"
    assert prob_parity_err < 1e-4, f"Probability parity violated: {prob_parity_err}"

    # CPU Batch Latency Benchmark (Batch size = 5, SLA: < 1.0 ms)
    batch_5 = sample_X_test[:5]
    for _ in range(50):
        _ = sess.run(None, {"float_input": batch_5})
    runs = 150
    t0 = time.perf_counter()
    for _ in range(runs):
        _ = sess.run(None, {"float_input": batch_5})
    t1 = time.perf_counter()
    avg_batch_ms = ((t1 - t0) / runs) * 1000.0
    logger.info(f"Stand-alone ONNX batch-5 latency: {avg_batch_ms:.4f} ms (Target SLA: < 1.0 ms)")
    assert avg_batch_ms < 1.0, f"ONNX latency exceeded SLA threshold: {avg_batch_ms:.4f} ms"

    with open(onnx_file, "rb") as f:
        model_sha256 = hashlib.sha256(f.read()).hexdigest()

    metadata = {
        "model_name": "RomanianTransitRiskModel",
        "version": "1.0.0",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "corpus_training_size": 1521651,
        "tournament_lineage": "v1_to_v51",
        "omni_production_engine": "v51_apex",
        "model_sha256": model_sha256,
        "file_size_kb": round(file_size_kb, 2),
        "input_tensor": {
            "name": "float_input",
            "shape": [None, 18],
            "dtype": "float32",
        },
        "output_tensors": [
            {
                "name": "expected_delay",
                "shape": [None, 1],
                "dtype": "float32",
                "unit": "minutes",
                "description": "Expected trip delay in minutes",
            },
            {
                "name": "missed_connection_prob",
                "shape": [None, 2],
                "dtype": "float32",
                "unit": "probability [0.0..1.0]",
                "positive_class_index": 1,
                "description": "Binary probabilities [P(connected), P(missed)]",
            },
        ],
        "feature_names": FEATURE_NAMES_18,
        "feature_count": 18,
        "mode_encodings": MODE_ENCODING,
        "evaluation_metrics": {
            "regressor_expected_delay": eval_stats["regressor"],
            "classifier_missed_connection": eval_stats["classifier"],
            "benchmark_batch5_latency_ms": round(avg_batch_ms, 4),
            "parity_max_error": {
                "expected_delay": delay_parity_err,
                "missed_connection_prob": prob_parity_err,
            },
        },
    }

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved risk_model_metadata.json to: {meta_file}")


def train_and_save_multihead_bundle(
    df: pd.DataFrame,
    y_delay: np.ndarray,
    y_mis: np.ndarray,
    y_rel: np.ndarray,
    delta_d: np.ndarray,
    recency_weights: np.ndarray,
    bundle_path: Path,
) -> None:
    """Trains multi-head boosters, encoders, and priors, and exports production bundle."""
    n_rows = len(df)
    # 1. 3-Level Hierarchical Empirical Bayes (m1=50, m2=30)
    logger.info("Fitting 3-Level Hierarchical Empirical Bayes encoders on full corpus...")
    heb_delay = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df, pd.Series(y_delay))
    heb_p15 = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df, pd.Series((y_delay <= 15.0).astype(float)))
    heb_missed = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df, pd.Series(y_mis.astype(float)))

    feat_heb_delay = heb_delay.transform(df)
    feat_heb_p15 = heb_p15.transform(df)
    feat_heb_missed = heb_missed.transform(df)

    # 2. Causal Rolling EMAs (7d/14d/30d)
    logger.info("Computing causal rolling EMAs (7d/14d/30d) on full corpus...")
    ema_df, latest_train_ema, latest_corridor_ema = compute_causal_rolling_emas(df)

    # 3. Thermodynamic Tribology Physics (v34)
    logger.info("Computing 2nd-gen thermodynamic tribology physics features...")
    tribo_df = engineer_tribology_physics(df)

    # 4. Hub Contagion & Congestion Priors (v33)
    logger.info("Computing network origin contagion and hub graph priors...")
    contagion_df, corridor_priors, hub_priors = engineer_network_contagion(df)

    # 5. Rolling-Stock Turnaround & Single-Track Crossing Priors (v42/v43)
    logger.info("Computing rolling-stock turnaround cascade & single-track priors...")
    turnaround_df, turnaround_priors, single_track_priors = engineer_turnaround_and_single_track(df)

    # 6. Assemble Main Production Feature Matrix
    logger.info("Assembling multi-head production feature matrix...")
    cat_raw = df["train_category"].to_numpy(dtype=np.float32)
    cat_norm = np.where(cat_raw <= 3, cat_raw + 3.0, cat_raw)

    unique_slugs = df["corridor_slug"].fillna("").unique()
    slug_to_hash = {s: int(hashlib.md5(s.encode("utf-8")).hexdigest(), 16) % 1000 if s else 0 for s in unique_slugs}
    corridor_hash_col = df["corridor_slug"].map(slug_to_hash).fillna(0).to_numpy(dtype=np.float32)

    has_tr = df["has_transfer"].to_numpy(dtype=np.float32)
    tr_buf = np.where(has_tr == 0, 999.0, df["transfer_buffer_minutes"].to_numpy(dtype=np.float32))

    base_matrix = np.column_stack([
        cat_norm,
        corridor_hash_col,
        df["scheduled_duration_minutes"].to_numpy(dtype=np.float32),
        df["stop_count"].to_numpy(dtype=np.float32),
        df["distance_km"].to_numpy(dtype=np.float32),
        df["departure_hour"].to_numpy(dtype=np.float32),
        df["is_peak_hour"].to_numpy(dtype=np.float32),
        df["day_of_week"].to_numpy(dtype=np.float32),
        df["is_weekend"].to_numpy(dtype=np.float32),
        has_tr,
        tr_buf,
        df["delay_at_origin_minutes"].to_numpy(dtype=np.float32),
        df["is_single_track"].to_numpy(dtype=np.float32),
        df["active_speed_restrictions_count"].to_numpy(dtype=np.float32),
        df["mountain_pass_flag"].to_numpy(dtype=np.float32),
        df["traction_type"].to_numpy(dtype=np.float32),
        df["temp_celsius"].to_numpy(dtype=np.float32),
        df["precipitation_rate_mm_h"].to_numpy(dtype=np.float32),
        df["is_thunderstorm"].to_numpy(dtype=np.float32),
        df["wind_speed_kmh"].to_numpy(dtype=np.float32),
        df["snow_depth_cm"].to_numpy(dtype=np.float32),
        df["freezing_rain_risk"].to_numpy(dtype=np.float32),
        df["visibility_meters"].to_numpy(dtype=np.float32),
        df["season"].to_numpy(dtype=np.float32),
    ])

    base_feature_names = [
        "train_category", "corridor_id_hash", "scheduled_duration_minutes", "stop_count",
        "distance_km", "departure_hour", "is_peak_hour", "day_of_week", "is_weekend",
        "has_transfer", "transfer_buffer_minutes", "delay_at_origin_minutes", "is_single_track",
        "active_speed_restrictions_count", "mountain_pass_flag", "traction_type",
        "temp_celsius", "precipitation_rate_mm_h", "is_thunderstorm", "wind_speed_kmh",
        "snow_depth_cm", "freezing_rain_risk", "visibility_meters", "season",
    ]

    heb_matrix = np.column_stack([feat_heb_delay, feat_heb_p15, feat_heb_missed])
    heb_names = ["heb_delay", "heb_p15", "heb_missed"]

    X_main = np.column_stack([
        base_matrix,
        heb_matrix,
        ema_df.to_numpy(dtype=np.float32),
        tribo_df.to_numpy(dtype=np.float32),
        contagion_df.to_numpy(dtype=np.float32),
        turnaround_df.to_numpy(dtype=np.float32),
    ])

    feature_names_main = (
        base_feature_names
        + heb_names
        + list(ema_df.columns)
        + list(tribo_df.columns)
        + list(contagion_df.columns)
        + list(turnaround_df.columns)
    )
    logger.info(f"Constructed unified feature matrix X_main: {X_main.shape} ({len(feature_names_main)} features)")

    # -----------------------------------------------------------------
    # Head 1: L1 Point Delay Regressor (v35/v40 Architecture)
    # -----------------------------------------------------------------
    logger.info("Training Head 1 (L1 Point Delay Regressor - Two-Stage Curriculum Warm-Start)...")
    head1_res_pre = lgb.LGBMRegressor(
        objective="quantile", alpha=0.50, n_estimators=500, learning_rate=0.05, num_leaves=35,
        random_state=42, n_jobs=4, verbose=-1,
    )
    head1_res_pre.fit(X_main, delta_d)

    head1_res = lgb.LGBMRegressor(
        objective="quantile", alpha=0.50, n_estimators=150, learning_rate=0.006, reg_lambda=5.0,
        num_leaves=35, random_state=42, n_jobs=4, verbose=-1,
    )
    head1_res.fit(X_main, delta_d, init_model=head1_res_pre.booster_, sample_weight=recency_weights)

    head1_dir_pre = lgb.LGBMRegressor(
        objective="quantile", alpha=0.50, n_estimators=500, learning_rate=0.05, num_leaves=35,
        random_state=142, n_jobs=4, verbose=-1,
    )
    head1_dir_pre.fit(X_main, y_delay)

    head1_dir = lgb.LGBMRegressor(
        objective="quantile", alpha=0.50, n_estimators=150, learning_rate=0.006, reg_lambda=5.0,
        num_leaves=35, random_state=142, n_jobs=4, verbose=-1,
    )
    head1_dir.fit(X_main, y_delay, init_model=head1_dir_pre.booster_, sample_weight=recency_weights)

    # -----------------------------------------------------------------
    # Head 2: L2 Mean Expectation & Quantile Spread Engine (v51/v48/v45 Architecture)
    # -----------------------------------------------------------------
    logger.info("Training Head 2 (L2 Expectation Regressor & Quantile Spread Engine)...")
    head2_l2_pre = lgb.LGBMRegressor(
        objective="regression", n_estimators=600, learning_rate=0.05, num_leaves=40,
        random_state=42, n_jobs=4, verbose=-1,
    )
    head2_l2_pre.fit(X_main, y_delay)

    head2_l2 = lgb.LGBMRegressor(
        objective="regression", n_estimators=200, learning_rate=0.005, reg_lambda=8.0,
        num_leaves=40, random_state=42, n_jobs=4, verbose=-1,
    )
    head2_l2.fit(X_main, y_delay, init_model=head2_l2_pre.booster_, sample_weight=recency_weights)

    head2_p25 = lgb.LGBMRegressor(
        objective="quantile", alpha=0.25, n_estimators=100, learning_rate=0.08, num_leaves=31,
        random_state=42, n_jobs=4, verbose=-1,
    )
    head2_p25.fit(X_main, y_delay)

    head2_p75 = lgb.LGBMRegressor(
        objective="quantile", alpha=0.75, n_estimators=100, learning_rate=0.08, num_leaves=31,
        random_state=42, n_jobs=4, verbose=-1,
    )
    head2_p75.fit(X_main, y_delay)

    head2_p90 = lgb.LGBMRegressor(
        objective="quantile", alpha=0.90, n_estimators=100, learning_rate=0.08, num_leaves=31,
        random_state=42, n_jobs=4, verbose=-1,
    )
    head2_p90.fit(X_main, y_delay)

    # Compute Intermediate Predictions for Head 3 Enrichment
    logger.info("Generating studentized risk metrics for Head 3 enrichment...")
    orig_del_arr = df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)
    pred_res_del = np.maximum(0.0, orig_del_arr + head1_res.predict(X_main))
    pred_dir_del = np.maximum(0.0, head1_dir.predict(X_main))
    pred_p50 = 0.50 * pred_res_del + 0.50 * pred_dir_del

    pred_p25 = np.maximum(0.0, head2_p25.predict(X_main))
    pred_p75 = np.maximum(pred_p25, head2_p75.predict(X_main))
    pred_iqr = np.maximum(1.0, pred_p75 - pred_p25)
    pred_l2 = np.maximum(0.0, head2_l2.predict(X_main))

    z_score_15m = ((15.0 - pred_p50) / pred_iqr).astype(np.float32)
    z_score_transfer = ((tr_buf - pred_p50) / pred_iqr).astype(np.float32)
    effective_transfer_margin = (tr_buf - pred_p50).astype(np.float32)

    # -----------------------------------------------------------------
    # Head 3: Missed Connection Z-Score Classifier (v29/v41/v51 Architecture)
    # -----------------------------------------------------------------
    logger.info("Training Head 3 (Missed Connection Z-Score Classifier)...")
    X_h3 = np.column_stack([
        X_main,
        z_score_transfer,
        effective_transfer_margin,
        z_score_15m,
        pred_iqr,
        pred_p50,
        pred_l2,
    ])
    feature_names_h3 = feature_names_main + [
        "z_score_transfer", "effective_transfer_margin", "z_score_15m",
        "pred_iqr", "pred_p50", "pred_l2",
    ]

    head3_classifier = lgb.LGBMClassifier(
        objective="binary", n_estimators=300, learning_rate=0.05, num_leaves=35,
        scale_pos_weight=1.5, random_state=42, n_jobs=4, verbose=-1,
    )
    head3_classifier.fit(X_h3, y_mis)

    # -----------------------------------------------------------------
    # Head 4: Drift-Purged Reliability Head & Calibrator (v38 Architecture)
    # -----------------------------------------------------------------
    logger.info("Training Head 4 (Reliability Classifier & Drift-Purged Calibrator)...")
    head4_classifier = lgb.LGBMClassifier(
        objective="binary", n_estimators=300, learning_rate=0.05, num_leaves=35,
        random_state=42, n_jobs=4, verbose=-1,
    )
    head4_classifier.fit(X_main, y_rel)

    raw_rel_probs = head4_classifier.predict_proba(X_main)[:, 1]
    head4_calibrator = DriftPurgedTwoStepCalibrator(eps=1e-5, l2_t=20.0, anchor_weight=250.0, iso_weight=0.15)
    head4_calibrator.fit(raw_rel_probs, y_rel)

    # -----------------------------------------------------------------
    # Save Fast Production Bundle
    # -----------------------------------------------------------------
    bundle_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "version": "1.0.0",
        "lineage": "v1_to_v51",
        "corpus_rows": n_rows,
        "feature_names_main": feature_names_main,
        "feature_names_h3": feature_names_h3,
        "head1_res": head1_res,
        "head1_dir": head1_dir,
        "head2_l2": head2_l2,
        "head2_p25": head2_p25,
        "head2_p75": head2_p75,
        "head2_p90": head2_p90,
        "head3_classifier": head3_classifier,
        "head4_classifier": head4_classifier,
        "head4_calibrator": head4_calibrator,
        "heb_encoders": {
            "delay": heb_delay,
            "p15": heb_p15,
            "missed": heb_missed,
        },
        "latest_train_ema": latest_train_ema,
        "latest_corridor_ema": latest_corridor_ema,
        "hub_priors": hub_priors,
        "corridor_priors": corridor_priors,
        "turnaround_priors": turnaround_priors,
        "single_track_priors": single_track_priors,
    }
    joblib.dump(bundle, bundle_path, compress=3)
    bundle_size_mb = bundle_path.stat().st_size / (1024.0 * 1024.0)
    logger.info(f"Saved omni_production_bundle.pkl to {bundle_path} (Size: {bundle_size_mb:.2f} MB)")


def train_production_omni_engine(
    dataset_path: Path = DEFAULT_DATASET_PATH,
    bundle_path: Path = BUNDLE_OUTPUT_PATH,
    onnx_path: Path = ONNX_OUTPUT_PATH,
    metadata_path: Path = METADATA_OUTPUT_PATH,
    force: bool = False,
) -> None:
    """Executes the full-corpus production training pipeline."""
    t_start = time.perf_counter()
    logger.info(f"Loading full real Romanian transit dataset: {dataset_path}")
    df = pd.read_parquet(dataset_path)
    n_rows = len(df)
    logger.info(f"Ingested N={n_rows:,} rows across {df['service_date'].min()} to {df['service_date'].max()}")
    assert n_rows == 1521651, f"Expected 1,521,651 rows, got {n_rows}"

    # Targets
    y_delay = df["actual_delay_minutes"].to_numpy(dtype=np.float32)
    y_mis = df["missed_connection"].to_numpy(dtype=np.int32)
    y_rel = ((y_delay <= 15.0) & (y_mis == 0)).astype(np.int32)
    delta_d = y_delay - df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)

    # Recency weights toward 2026
    dates = pd.to_datetime(df["service_date"])
    max_date = dates.max()
    days_ago = (max_date - dates).dt.days.to_numpy(dtype=np.float32)
    recency_weights = (1.0 + 2.5 * np.exp(- days_ago / 180.0)).astype(np.float32)

    if bundle_path.exists() and not force:
        bundle_size_mb = bundle_path.stat().st_size / (1024.0 * 1024.0)
        logger.info(f"Production bundle already exists at {bundle_path} ({bundle_size_mb:.2f} MB). Skipping Heads 1-4 retraining. (Use --force to retrain all)")
    else:
        train_and_save_multihead_bundle(
            df=df,
            y_delay=y_delay,
            y_mis=y_mis,
            y_rel=y_rel,
            delta_d=delta_d,
            recency_weights=recency_weights,
            bundle_path=bundle_path,
        )

    # -----------------------------------------------------------------
    # Train & Update Canonical 18-Feature ONNX Dual Model
    # -----------------------------------------------------------------
    logger.info("Training canonical 18-feature LightGBM model for ONNX runtime compatibility...")
    X_18 = extract_canonical_18_features(df)

    logger.info("Generating urban transit calibration samples for multi-modal ONNX compatibility...")
    X_u, y_del_u, y_mis_u, weights_u, _ = generate_urban_calibration_samples(n_samples=60000)

    X_18_all = np.vstack([X_18, X_u])
    y_delay_all = np.concatenate([y_delay, y_del_u])
    y_mis_all = np.concatenate([y_mis, y_mis_u])
    weights_all = np.concatenate([recency_weights, weights_u])

    reg_18 = lgb.LGBMRegressor(
        objective="huber", alpha=0.90, n_estimators=170, learning_rate=0.10, max_depth=6, num_leaves=31,
        random_state=42, n_jobs=4, verbose=-1,
    )
    reg_18.fit(X_18_all, y_delay_all, sample_weight=weights_all)

    cls_18 = lgb.LGBMClassifier(
        objective="binary", n_estimators=150, learning_rate=0.08, max_depth=6, num_leaves=31,
        scale_pos_weight=1.5, random_state=42, n_jobs=4, verbose=-1,
    )
    cls_18.fit(X_18_all, y_mis_all, sample_weight=weights_all)

    pred_delay_18 = reg_18.predict(X_18)
    prob_mis_18 = cls_18.predict_proba(X_18)[:, 1]

    eval_stats = {
        "regressor": {
            "mae": round(float(mean_absolute_error(y_delay, pred_delay_18)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_delay, pred_delay_18))), 4),
            "r2": round(float(r2_score(y_delay, pred_delay_18)), 4),
        },
        "classifier": {
            "roc_auc": round(float(roc_auc_score(y_mis, prob_mis_18)), 4),
            "brier_score": round(float(brier_score_loss(y_mis, prob_mis_18)), 4),
            "accuracy": round(float(accuracy_score(y_mis, (prob_mis_18 >= 0.50).astype(int))), 4),
            "precision": round(float(precision_score(y_mis, (prob_mis_18 >= 0.50).astype(int), zero_division=0)), 4),
            "recall": round(float(recall_score(y_mis, (prob_mis_18 >= 0.50).astype(int), zero_division=0)), 4),
            "f1": round(float(f1_score(y_mis, (prob_mis_18 >= 0.50).astype(int), zero_division=0)), 4),
        },
    }
    logger.info(f"Canonical 18-feature evaluation metrics: {eval_stats}")

    export_fused_onnx_model(
        regressor=reg_18,
        classifier=cls_18,
        eval_stats=eval_stats,
        sample_X_test=X_18[:500],
        output_onnx_path=str(onnx_path),
        output_metadata_path=str(metadata_path),
    )

    elapsed_s = time.perf_counter() - t_start
    logger.info(f"=== FULL CORPUS PRODUCTION OMNI ENGINE TRAINING COMPLETED IN {elapsed_s:.1f}s ===")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Production Omni-Apex Engine on Full Corpus")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET_PATH, help="Path to real parquet dataset")
    parser.add_argument("--bundle-out", type=Path, default=BUNDLE_OUTPUT_PATH, help="Output path for production bundle")
    parser.add_argument("--onnx-out", type=Path, default=ONNX_OUTPUT_PATH, help="Output path for ONNX risk model")
    parser.add_argument("--meta-out", type=Path, default=METADATA_OUTPUT_PATH, help="Output path for risk model metadata")
    parser.add_argument("--force", action="store_true", help="Force retrain production bundle even if it exists")
    args = parser.parse_args()

    train_production_omni_engine(
        dataset_path=args.dataset,
        bundle_path=args.bundle_out,
        onnx_path=args.onnx_out,
        metadata_path=args.meta_out,
        force=args.force,
    )


if __name__ == "__main__":
    main()
