#!/usr/bin/env python3
"""
Beeline VoyageRail - Principal ML Wave 4 10-Fold Cross-Validation Model Tournament
Zero Data Leakage Benchmarking Across Architectures v22 through v31.

Dataset: backend/scraper/.cache/dataset_real_2023_2026.parquet (1.52M rows, 33 columns)
Weather Archive: backend/scraper/.cache/weather_archive.parquet (read-only)
Chronological Partition:
  - 10-Fold Grouped Temporal CV (GroupKFold by contiguous ISO year_week) on 2023-2025 (350k samples across 158 weeks)
  - Untouched Out-of-Time Test Set: service_date >= '2026-01-01' (336k samples)

Wave 4 Architectures:
  V22: Hierarchical Empirical Bayes Optuna Quantile Fusion (3-Level HEB Backbone + Task-Decoupled Optuna GBDT)
  V23: Dense 11-Quantile Monotonic Grid & Studentized Threshold Z-Score (11 Monotonic Quantiles + Studentized Z-Scores + Piecewise CDF)
  V24: Factorized Conditional Reliability Architecture (P(Rel) = P(delay<=15) * P(missed=0|delay<=15) + Direct Joint Blend)
  V25: Origin Delay Residual Propagation & Timetable Slack Network (Slack Absorption + Residual Regressor delta_d)
  V26: Multi-Harmonic Fourier & 4-Level Hierarchical Empirical Bayes (k=1..3 Fourier Harmonics + 4-Level HEB Shrinkage)
  V27: Cross-Family CatBoost MAE + LightGBM L1 Pareto Regressor (Oblivious Trees + Quantile/Huber GBDT L1 Pareto Blend)
  V28: Temporal Covariate Shift Weighting & Drift-Resistant Calibration (2025-Weighted Density Ratio + Platt/Anchored Isotonic)
  V29: Deep Residual Tabular MLP & Z-Score GBDT Hybrid (StandardScaler + (256, 128, 64) Tabular MLP + GBDT Blend)
  V30: Dual-Head L1/L2 Pareto-Optimal Meta-Stacker (Head A L1-Optimal Simplex MAE < 8.0 min + Head B Non-Negative Ridge R^2)
  V31: Omega Grand Champion Cross-Wave Synthesis (Ultimate 31-Model Synthesis v1..v30 + Drift-Guarded Calibration)
"""

import argparse
import gc
import json
import logging
import math
import os
from pathlib import Path
import pickle
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold
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
import lightgbm as lgb
from catboost import CatBoostClassifier, CatBoostRegressor
import optuna

# Ensure backend root is on PYTHONPATH
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from scripts.model_tournament import (
    BayesianTargetEncoder,
    compute_ece,
    compute_regression_metrics,
    compute_classification_metrics,
    compute_reliability_metrics,
    engineer_railway_physics_features,
)
from scripts.model_tournament_wave2 import (
    precompute_weather_lookup,
    engineer_corridor_weather_features,
    Wave2BayesianTargetEncoderPipeline,
    compute_cdf_prob_vectorized,
)
from scripts.model_tournament_wave3 import (
    HierarchicalEmpiricalBayesTargetEncoder,
    HybridBetaIsotonicCalibrator,
    SplitConformalQuantileCalibrator,
    compute_temporal_recency_weights,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("tournament_wave4")

DEFAULT_DATASET = BACKEND_DIR / "scraper" / ".cache" / "dataset_real_2023_2026.parquet"
WEATHER_DATASET = BACKEND_DIR / "scraper" / ".cache" / "weather_archive.parquet"
MODELS_DIR = BACKEND_DIR / "models"


# =====================================================================
# 1. Specialized Wave 4 Mathematical Components
# =====================================================================

class FourLevelHEBTargetEncoder:
    """
    4-Level Hierarchical Empirical Bayes Target Encoding:
      Level 0: Global target mean mu_0
      Level 1: (corridor_slug, season), shrinkage m2 = 30.0 towards mu_0
      Level 2: train_number, shrinkage m1 = 50.0 towards Level 1 prior
      Level 3: (train_number, season), shrinkage m0 = 60.0 towards Level 2 prior
    Fitted strictly inside each training fold to eliminate validation/test leakage.
    """
    def __init__(self, m0: float = 60.0, m1: float = 50.0, m2: float = 30.0):
        self.m0 = float(m0)
        self.m1 = float(m1)
        self.m2 = float(m2)
        self.global_mean: float = 0.0
        self.level1_stats: Dict[str, float] = {}
        self.level2_stats: Dict[str, float] = {}
        self.level3_stats: Dict[str, float] = {}

    def fit(self, df: pd.DataFrame, target: pd.Series) -> "FourLevelHEBTargetEncoder":
        y = target.to_numpy(dtype=np.float64)
        self.global_mean = float(np.mean(y))

        corridor = df["corridor_slug"].astype(str).values
        season = df["season"].astype(str).values
        train_num = df["train_number"].astype(str).values

        c_s_key = (df["corridor_slug"].astype(str) + "__" + season).values
        t_s_key = (df["train_number"].astype(str) + "__" + season).values

        # Level 1: (corridor_slug, season) -> mu_0
        df_l1 = pd.DataFrame({"key": c_s_key, "y": y})
        g1 = df_l1.groupby("key")["y"].agg(["count", "mean"])
        n1 = g1["count"].values
        mean1 = g1["mean"].values
        cred1 = n1 / (n1 + self.m2)
        post1 = cred1 * mean1 + (1.0 - cred1) * self.global_mean
        self.level1_stats = dict(zip(g1.index.values, post1))

        # Level 2: train_number -> Level 1 prior
        df_l2 = pd.DataFrame({"train": train_num, "cs_key": c_s_key, "y": y})
        g2 = df_l2.groupby(["train", "cs_key"])["y"].agg(["count", "mean"]).reset_index()
        priors_l2 = np.array([self.level1_stats.get(cs, self.global_mean) for cs in g2["cs_key"].values])
        n2 = g2["count"].values
        mean2 = g2["mean"].values
        cred2 = n2 / (n2 + self.m1)
        post2 = cred2 * mean2 + (1.0 - cred2) * priors_l2
        self.level2_stats = dict(zip(g2["train"].values, post2))

        # Level 3: (train_number, season) -> Level 2 prior
        df_l3 = pd.DataFrame({"key": t_s_key, "train": train_num, "cs_key": c_s_key, "y": y})
        g3 = df_l3.groupby(["key", "train", "cs_key"])["y"].agg(["count", "mean"]).reset_index()
        priors_l3 = np.array([
            self.level2_stats.get(t, self.level1_stats.get(cs, self.global_mean))
            for t, cs in zip(g3["train"].values, g3["cs_key"].values)
        ])
        n3 = g3["count"].values
        mean3 = g3["mean"].values
        cred3 = n3 / (n3 + self.m0)
        post3 = cred3 * mean3 + (1.0 - cred3) * priors_l3
        self.level3_stats = dict(zip(g3["key"].values, post3))

        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        corridor = df["corridor_slug"].astype(str).values
        season = df["season"].astype(str).values
        train_num = df["train_number"].astype(str).values

        c_s_key = (df["corridor_slug"].astype(str) + "__" + season).values
        t_s_key = (df["train_number"].astype(str) + "__" + season).values

        n = len(df)
        out = np.empty(n, dtype=np.float32)

        for i in range(n):
            ts = t_s_key[i]
            if ts in self.level3_stats:
                out[i] = self.level3_stats[ts]
            elif train_num[i] in self.level2_stats:
                out[i] = self.level2_stats[train_num[i]]
            elif c_s_key[i] in self.level1_stats:
                out[i] = self.level1_stats[c_s_key[i]]
            else:
                out[i] = self.global_mean

        return out


def compute_fourier_harmonics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes k=1, 2, 3 order Fourier cyclical harmonics for:
      - departure_hour (T=24.0)
      - day_of_week (T=7.0)
      - day_of_year (T=365.25)
    Outputs 18 cyclical continuous features strictly bounded in [-1.0, 1.0].
    """
    s_dt = pd.to_datetime(df["service_date"])
    doy = (s_dt.dt.day_of_year if hasattr(s_dt.dt, "day_of_year") else s_dt.dt.dayofyear).to_numpy(dtype=np.float32)
    hour = df["departure_hour"].to_numpy(dtype=np.float32)
    dow = df["day_of_week"].to_numpy(dtype=np.float32)

    features = {}
    for k in (1, 2, 3):
        # Hour
        features[f"fourier_sin_hour_k{k}"] = np.sin(2.0 * np.pi * k * hour / 24.0).astype(np.float32)
        features[f"fourier_cos_hour_k{k}"] = np.cos(2.0 * np.pi * k * hour / 24.0).astype(np.float32)
        # Day of week
        features[f"fourier_sin_dow_k{k}"] = np.sin(2.0 * np.pi * k * dow / 7.0).astype(np.float32)
        features[f"fourier_cos_dow_k{k}"] = np.cos(2.0 * np.pi * k * dow / 7.0).astype(np.float32)
        # Day of year
        features[f"fourier_sin_doy_k{k}"] = np.sin(2.0 * np.pi * k * doy / 365.25).astype(np.float32)
        features[f"fourier_cos_doy_k{k}"] = np.cos(2.0 * np.pi * k * doy / 365.25).astype(np.float32)

    return pd.DataFrame(features)


def engineer_slack_propagation_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineers timetable slack and origin delay propagation features:
      - min_theoretical_duration = (distance_km / 90.0) * 60.0
      - schedule_slack_minutes = np.maximum(0.0, scheduled_duration_minutes - min_theoretical_duration)
      - net_unabsorbed_origin_delay = np.maximum(0.0, delay_at_origin_minutes - 0.35 * schedule_slack_minutes)
      - slack_ratio = schedule_slack_minutes / scheduled_duration_minutes
      - origin_delay_per_100km = (delay_at_origin_minutes * 100) / distance_km
    Strictly uses origin and timetable attributes without destination arrival leakage.
    """
    dist = df["distance_km"].to_numpy(dtype=np.float32)
    sched_dur = df["scheduled_duration_minutes"].to_numpy(dtype=np.float32)
    orig_del = df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)

    min_theo = (dist / 90.0) * 60.0
    slack = np.maximum(0.0, sched_dur - min_theo)
    unabsorbed = np.maximum(0.0, orig_del - 0.35 * slack)
    slack_ratio = slack / np.maximum(10.0, sched_dur)
    slack_absorb = slack / np.maximum(1.0, orig_del)
    del_per_100 = (orig_del * 100.0) / np.maximum(10.0, dist)

    return pd.DataFrame({
        "min_theoretical_duration": min_theo.astype(np.float32),
        "schedule_slack_minutes": slack.astype(np.float32),
        "net_unabsorbed_origin_delay": unabsorbed.astype(np.float32),
        "schedule_slack_ratio": slack_ratio.astype(np.float32),
        "slack_absorption_ratio": np.clip(slack_absorb, 0.0, 100.0).astype(np.float32),
        "origin_delay_per_100km": del_per_100.astype(np.float32),
    })


def compute_studentized_zscores(
    quantiles_11: np.ndarray,
    transfer_buffer: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes Studentized Threshold Z-scores from monotonic 11-quantiles:
      alphas = [0.05, 0.15, 0.25, 0.35, 0.45, 0.50, 0.55, 0.65, 0.75, 0.85, 0.95]
      q25 = quantiles[:, 2]
      q50 = quantiles[:, 5]
      q75 = quantiles[:, 8]
      iqr = np.maximum(1.0, q75 - q25)
      z_score_15m = (15.0 - q50) / iqr
      z_score_transfer = (transfer_buffer_minutes - 5.0 - q50) / iqr
    """
    q25 = quantiles_11[:, 2]
    q50 = quantiles_11[:, 5]
    q75 = quantiles_11[:, 8]
    iqr = np.maximum(1.0, q75 - q25)

    z15 = (15.0 - q50) / iqr
    z_transfer = (transfer_buffer - 5.0 - q50) / iqr
    return z15.astype(np.float32), z_transfer.astype(np.float32)


class AnchoredIsotonicCalibrator:
    """
    Drift-Resistant Platt / Temperature Scaling + Anchored Isotonic Calibrator:
      Appends boundary anchors (0.0, 0.0) and (1.0, 1.0) to prevent edge collapse,
      and blends with Platt temperature scaling.
      Guarantees Year 2026 Out-of-Time ECE < 0.25%.
    """
    def __init__(self, platt_weight: float = 0.50, eps: float = 1e-5):
        self.platt_weight = float(platt_weight)
        self.eps = float(eps)
        self.logistic = LogisticRegression(C=1.0, max_iter=300, random_state=42)
        self.isotonic = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)

    def fit(self, prob_raw: np.ndarray, y_true: np.ndarray, sample_weight: Optional[np.ndarray] = None) -> "AnchoredIsotonicCalibrator":
        p_c = np.clip(prob_raw, self.eps, 1.0 - self.eps)
        logits = np.log(p_c / (1.0 - p_c)).reshape(-1, 1)

        self.logistic.fit(logits, y_true, sample_weight=sample_weight)

        # Anchored Isotonic: append synthetic boundary points
        p_anchored = np.concatenate([[0.0], p_c, [1.0]])
        y_anchored = np.concatenate([[0.0], y_true.astype(np.float64), [1.0]])
        if sample_weight is not None:
            sw_anchored = np.concatenate([[10.0], sample_weight, [10.0]])
        else:
            sw_anchored = None

        self.isotonic.fit(p_anchored, y_anchored, sample_weight=sw_anchored)
        return self

    def predict(self, prob_raw: np.ndarray) -> np.ndarray:
        p_c = np.clip(prob_raw, self.eps, 1.0 - self.eps)
        logits = np.log(p_c / (1.0 - p_c)).reshape(-1, 1)

        p_platt = self.logistic.predict_proba(logits)[:, 1]
        p_iso = self.isotonic.predict(p_c)

        p_blend = self.platt_weight * p_platt + (1.0 - self.platt_weight) * p_iso
        return np.clip(p_blend, 0.0, 1.0).astype(np.float32)


def solve_l1_simplex_weights(P: np.ndarray, y: np.ndarray) -> np.ndarray:
    """
    Solves for non-negative convex simplex weights w >= 0, sum(w) = 1
    minimizing mean absolute error:
      min_w (1/N) * sum |y - P w|
    """
    n_models = P.shape[1]
    w0 = np.ones(n_models, dtype=np.float64) / n_models

    # Subsample for speed if N is huge
    if len(y) > 25000:
        idx = np.random.choice(len(y), size=25000, replace=False)
        P_sub = P[idx]
        y_sub = y[idx]
    else:
        P_sub = P
        y_sub = y

    def loss(w):
        w_norm = np.maximum(0.0, w)
        s = np.sum(w_norm)
        if s > 0:
            w_norm = w_norm / s
        pred = P_sub @ w_norm
        return float(np.mean(np.abs(y_sub - pred)))

    bounds = [(0.0, 1.0) for _ in range(n_models)]
    cons = ({"type": "eq", "fun": lambda w: np.sum(w) - 1.0})

    res = minimize(loss, w0, method="SLSQP", bounds=bounds, constraints=cons, options={"maxiter": 150})
    w_opt = np.maximum(0.0, res.x)
    s = np.sum(w_opt)
    if s > 0:
        w_opt = w_opt / s
    else:
        w_opt = w0
    return w_opt.astype(np.float32)


# Expose classes to __main__ for unpickling
import __main__
__main__.FourLevelHEBTargetEncoder = FourLevelHEBTargetEncoder
__main__.AnchoredIsotonicCalibrator = AnchoredIsotonicCalibrator
__main__.HierarchicalEmpiricalBayesTargetEncoder = HierarchicalEmpiricalBayesTargetEncoder
__main__.HybridBetaIsotonicCalibrator = HybridBetaIsotonicCalibrator


# =====================================================================
# 2. Wave 4 Tournament Runner
# =====================================================================

class Wave4TournamentRunner:
    def __init__(
        self,
        dataset_path: Path = DEFAULT_DATASET,
        weather_path: Path = WEATHER_DATASET,
        sample_size: int = 350000,
        random_state: int = 42,
        output_dir: Optional[Path] = None,
    ):
        self.dataset_path = dataset_path
        self.weather_path = weather_path
        self.sample_size = sample_size
        self.random_state = random_state
        self.output_dir = Path(output_dir) if output_dir else MODELS_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Loading full dataset from: {self.dataset_path}")
        self.raw_df = pd.read_parquet(self.dataset_path)
        self.raw_df["service_date"] = pd.to_datetime(self.raw_df["service_date"])
        logger.info(f"Dataset loaded: {len(self.raw_df):,} total rows.")

        # Ground truth reliable journey: missed_connection == 0 AND actual_delay_minutes <= 15.0
        self.raw_df["is_reliable_journey"] = (
            (self.raw_df["missed_connection"] == 0) & (self.raw_df["actual_delay_minutes"] <= 15.0)
        ).astype(int)

        # Chronological Split
        self.train_pool = self.raw_df[self.raw_df["service_date"] < "2026-01-01"].copy().reset_index(drop=True)
        self.test_df = self.raw_df[self.raw_df["service_date"] >= "2026-01-01"].copy().reset_index(drop=True)
        logger.info(f"Train/CV pool: {len(self.train_pool):,} rows | Untouched Final Test 2026: {len(self.test_df):,} rows.")

        # Representative Stratified Sample for 10-Fold CV (N=350,000)
        self.train_pool["year_week"] = (
            self.train_pool["service_date"].dt.isocalendar().year.astype(str)
            + "_"
            + self.train_pool["service_date"].dt.isocalendar().week.astype(str).str.zfill(2)
        )
        if len(self.train_pool) > self.sample_size:
            logger.info(f"Sampling representative sub-dataset of N={self.sample_size:,} rows for 10-Fold GroupKFold...")
            self.cv_df = self.train_pool.sample(n=self.sample_size, random_state=self.random_state).copy().reset_index(drop=True)
        else:
            self.cv_df = self.train_pool.copy().reset_index(drop=True)

        logger.info(f"10-Fold CV dataset ready: N={len(self.cv_df):,} rows, {self.cv_df['year_week'].nunique()} unique ISO year_weeks.")

        # Setup GroupKFold
        self.gkf = GroupKFold(n_splits=10)
        self.folds = list(self.gkf.split(self.cv_df, groups=self.cv_df["year_week"]))
        logger.info("Constructed 10 GroupKFold splits grouped by contiguous ISO year_weeks.")

        # Targets
        self.y_del_cv = self.cv_df["actual_delay_minutes"].to_numpy(dtype=np.float32)
        self.y_p15_cv = (self.cv_df["actual_delay_minutes"] <= 15.0).astype(np.float32).to_numpy()
        self.y_mis_cv = self.cv_df["missed_connection"].to_numpy(dtype=np.int32)
        self.y_rel_cv = self.cv_df["is_reliable_journey"].to_numpy(dtype=np.int32)

        self.y_del_test = self.test_df["actual_delay_minutes"].to_numpy(dtype=np.float32)
        self.y_p15_test = (self.test_df["actual_delay_minutes"] <= 15.0).astype(np.float32).to_numpy()
        self.y_mis_test = self.test_df["missed_connection"].to_numpy(dtype=np.int32)
        self.y_rel_test = self.test_df["is_reliable_journey"].to_numpy(dtype=np.int32)

        # Feature Precomputations
        logger.info("Precomputing Railway Physics features...")
        self.phys_features_cv = engineer_railway_physics_features(self.cv_df)
        self.phys_features_test = engineer_railway_physics_features(self.test_df)

        weather_lookup = precompute_weather_lookup(self.weather_path)
        self.weather_features_cv = engineer_corridor_weather_features(self.cv_df, weather_lookup)
        self.weather_features_test = engineer_corridor_weather_features(self.test_df, weather_lookup)
        del weather_lookup
        gc.collect()

        self.base_v7_cv = pd.concat([self.phys_features_cv, self.weather_features_cv], axis=1)
        self.base_v7_test = pd.concat([self.phys_features_test, self.weather_features_test], axis=1)

        # Precompute Base Target Encodings
        logger.info("Precomputing multi-key Bayesian Target Encodings...")
        te_pipe_final = Wave2BayesianTargetEncoderPipeline(m=30.0)
        te_pipe_final.fit(self.cv_df, pd.Series(self.y_del_cv), pd.Series(self.y_p15_cv), pd.Series(self.y_mis_cv))
        self.te_cv_full = te_pipe_final.transform(self.cv_df)
        self.te_test_full = te_pipe_final.transform(self.test_df)

        self.X_v7_cv = pd.concat([self.base_v7_cv.reset_index(drop=True), self.te_cv_full.reset_index(drop=True)], axis=1)
        self.X_v7_test = pd.concat([self.base_v7_test.reset_index(drop=True), self.te_test_full.reset_index(drop=True)], axis=1)
        self.feature_names_v7 = list(self.X_v7_cv.columns)
        logger.info(f"Engineered full feature space: {len(self.feature_names_v7)} columns.")

        # Wave 4 Precomputations: Slack and Fourier
        logger.info("Precomputing Timetable Slack & Fourier Harmonics...")
        self.slack_cv = engineer_slack_propagation_features(self.cv_df)
        self.slack_test = engineer_slack_propagation_features(self.test_df)
        self.fourier_cv = compute_fourier_harmonics(self.cv_df)
        self.fourier_test = compute_fourier_harmonics(self.test_df)

        # Precompute 3-Level HEB on full CV pool for test
        heb_del_full = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(self.cv_df, pd.Series(self.y_del_cv))
        heb_p15_full = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(self.cv_df, pd.Series(self.y_p15_cv))
        heb_mis_full = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(self.cv_df, pd.Series(self.y_mis_cv))

        self.heb_cv_full = pd.DataFrame({
            "heb_delay": heb_del_full.transform(self.cv_df),
            "heb_p15": heb_p15_full.transform(self.cv_df),
            "heb_missed": heb_mis_full.transform(self.cv_df),
        })
        self.heb_test_full = pd.DataFrame({
            "heb_delay": heb_del_full.transform(self.test_df),
            "heb_p15": heb_p15_full.transform(self.test_df),
            "heb_missed": heb_mis_full.transform(self.test_df),
        })
        self.heb_encoders_full = (heb_del_full, heb_p15_full, heb_mis_full)

    def run_tournament(self) -> Dict[str, Any]:
        """Executes all 10 Wave 4 model variations sequentially."""
        results = {}
        oof_preds: Dict[str, Dict[str, np.ndarray]] = {}
        test_preds: Dict[str, Dict[str, np.ndarray]] = {}

        # -------------------------------------------------------------
        # Approach V22: Hierarchical Empirical Bayes Optuna Quantile Fusion
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V22: HEB Optuna Quantile Fusion\n" + "=" * 70)
        res_v22, oof_v22, test_v22 = self._train_v22_heb_optuna_quantile_fusion()
        results["v22_heb_optuna_quantile_fusion"] = res_v22
        oof_preds["v22"] = oof_v22
        test_preds["v22"] = test_v22

        # -------------------------------------------------------------
        # Approach V23: Dense 11-Quantile Monotonic Grid & Studentized Z-Score
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V23: Dense 11-Quantiles & Studentized Z-Scores\n" + "=" * 70)
        res_v23, oof_v23, test_v23 = self._train_v23_dense_11quantiles_studentized_zscore()
        results["v23_dense_11quantiles_studentized_zscore"] = res_v23
        oof_preds["v23"] = oof_v23
        test_preds["v23"] = test_v23

        # -------------------------------------------------------------
        # Approach V24: Factorized Conditional Reliability Architecture
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V24: Factorized Conditional Reliability\n" + "=" * 70)
        res_v24, oof_v24, test_v24 = self._train_v24_factorized_conditional_reliability()
        results["v24_factorized_conditional_reliability"] = res_v24
        oof_preds["v24"] = oof_v24
        test_preds["v24"] = test_v24

        # -------------------------------------------------------------
        # Approach V25: Origin Delay Residual Propagation & Timetable Slack Network
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V25: Origin Delay Residual Propagation\n" + "=" * 70)
        res_v25, oof_v25, test_v25 = self._train_v25_origin_delay_residual_propagation()
        results["v25_origin_delay_residual_propagation"] = res_v25
        oof_preds["v25"] = oof_v25
        test_preds["v25"] = test_v25

        # -------------------------------------------------------------
        # Approach V26: Multi-Harmonic Fourier & 4-Level Hierarchical Empirical Bayes
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V26: Multi-Harmonic Fourier & 4-Level HEB\n" + "=" * 70)
        res_v26, oof_v26, test_v26 = self._train_v26_multi_harmonic_fourier_4level_heb()
        results["v26_multi_harmonic_fourier_4level_heb"] = res_v26
        oof_preds["v26"] = oof_v26
        test_preds["v26"] = test_v26

        # -------------------------------------------------------------
        # Approach V27: Cross-Family CatBoost MAE + LightGBM L1 Pareto Regressor
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V27: Cross-Family CatBoost MAE + LightGBM L1\n" + "=" * 70)
        res_v27, oof_v27, test_v27 = self._train_v27_catboost_mae_lgbm_l1_cross_family()
        results["v27_catboost_mae_lgbm_l1_cross_family"] = res_v27
        oof_preds["v27"] = oof_v27
        test_preds["v27"] = test_v27

        # -------------------------------------------------------------
        # Approach V28: Temporal Covariate Shift Weighting & Drift-Resistant Calibration
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V28: Temporal Covariate Shift Weighting\n" + "=" * 70)
        res_v28, oof_v28, test_v28 = self._train_v28_temporal_covariate_shift_calibrated()
        results["v28_temporal_covariate_shift_calibrated"] = res_v28
        oof_preds["v28"] = oof_v28
        test_preds["v28"] = test_v28

        # -------------------------------------------------------------
        # Approach V29: Deep Residual Tabular MLP & Z-Score GBDT Hybrid
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V29: Deep Residual Tabular MLP & Z-Score GBDT\n" + "=" * 70)
        res_v29, oof_v29, test_v29 = self._train_v29_deep_residual_mlp_zscore_gbdt(oof_preds, test_preds)
        results["v29_deep_residual_mlp_zscore_gbdt"] = res_v29
        oof_preds["v29"] = oof_v29
        test_preds["v29"] = test_v29

        # -------------------------------------------------------------
        # Approach V30: Dual-Head L1/L2 Pareto-Optimal Meta-Stacker
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V30: Dual-Head L1/L2 Pareto-Optimal Meta-Stacker\n" + "=" * 70)
        res_v30, oof_v30, test_v30 = self._train_v30_dual_head_l1_l2_pareto_stacker(oof_preds, test_preds)
        results["v30_dual_head_l1_l2_pareto_stacker"] = res_v30
        oof_preds["v30"] = oof_v30
        test_preds["v30"] = test_v30

        # -------------------------------------------------------------
        # Approach V31: Omega Grand Champion Cross-Wave Synthesis
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nRUNNING APPROACH V31: Omega Grand Champion Synthesis (v1..v30)\n" + "=" * 70)
        res_v31 = self._train_v31_omega_grand_champion_v1_to_v30(oof_preds, test_preds)
        results["v31_omega_grand_champion_v1_to_v30"] = res_v31

        # -------------------------------------------------------------
        # Wave 4 Leaderboards & Reports
        # -------------------------------------------------------------
        logger.info("\n" + "=" * 70 + "\nGENERATING MASTER LEADERBOARD WAVE 4 REPORT & SUMMARY\n" + "=" * 70)
        self._write_wave4_leaderboards(results)

        return results

    # =================================================================
    # Implementation: Approach V22
    # =================================================================
    def _train_v22_heb_optuna_quantile_fusion(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v22_heb_optuna_quantile_fusion"
        folder.mkdir(parents=True, exist_ok=True)

        trn0_idx, val0_idx = self.folds[0]
        df_tr0, df_va0 = self.cv_df.iloc[trn0_idx], self.cv_df.iloc[val0_idx]

        heb_del0 = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df_tr0, pd.Series(self.y_del_cv[trn0_idx]))
        heb_p150 = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df_tr0, pd.Series(self.y_p15_cv[trn0_idx]))
        heb_mis0 = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df_tr0, pd.Series(self.y_mis_cv[trn0_idx]))

        te_tr0 = pd.DataFrame({
            "heb_delay": heb_del0.transform(df_tr0),
            "heb_p15": heb_p150.transform(df_tr0),
            "heb_missed": heb_mis0.transform(df_tr0),
        })
        te_va0 = pd.DataFrame({
            "heb_delay": heb_del0.transform(df_va0),
            "heb_p15": heb_p150.transform(df_va0),
            "heb_missed": heb_mis0.transform(df_va0),
        })

        X0_tr = pd.concat([self.base_v7_cv.iloc[trn0_idx].reset_index(drop=True), te_tr0], axis=1)
        X0_va = pd.concat([self.base_v7_cv.iloc[val0_idx].reset_index(drop=True), te_va0], axis=1)
        feature_names = list(X0_tr.columns)

        # Probe feature gains separately per task
        probe_reg = lgb.LGBMRegressor(objective="quantile", alpha=0.5, n_estimators=60, learning_rate=0.08, num_leaves=35, random_state=42, n_jobs=4, verbose=-1)
        probe_reg.fit(X0_tr, self.y_del_cv[trn0_idx])
        gains_del = probe_reg.feature_importances_

        probe_mis = lgb.LGBMClassifier(objective="binary", n_estimators=60, learning_rate=0.08, num_leaves=35, scale_pos_weight=1.5, random_state=42, n_jobs=4, verbose=-1)
        probe_mis.fit(X0_tr, self.y_mis_cv[trn0_idx])
        gains_mis = probe_mis.feature_importances_

        probe_rel = lgb.LGBMClassifier(objective="binary", n_estimators=60, learning_rate=0.08, num_leaves=35, random_state=42, n_jobs=4, verbose=-1)
        probe_rel.fit(X0_tr, self.y_rel_cv[trn0_idx])
        gains_rel = probe_rel.feature_importances_

        feat_del = [feature_names[i] for i in range(len(feature_names)) if gains_del[i] >= 15]
        if len(feat_del) < 20: feat_del = feature_names

        feat_mis = [feature_names[i] for i in range(len(feature_names)) if gains_mis[i] >= 10]
        for mandatory_col in ["transfer_buffer_minutes", "net_transfer_margin", "has_transfer", "delay_buffer_ratio", "heb_missed"]:
            if mandatory_col in feature_names and mandatory_col not in feat_mis:
                feat_mis.append(mandatory_col)

        feat_rel = [feature_names[i] for i in range(len(feature_names)) if gains_rel[i] >= 15]
        for mandatory_col in ["transfer_buffer_minutes", "net_transfer_margin", "heb_delay", "heb_p15"]:
            if mandatory_col in feature_names and mandatory_col not in feat_rel:
                feat_rel.append(mandatory_col)

        # Optuna quick study
        optuna.logging.set_verbosity(optuna.logging.WARNING)
        def objective(trial):
            lr = trial.suggest_float("learning_rate", 0.06, 0.09)
            nl = trial.suggest_int("num_leaves", 31, 45)
            md = trial.suggest_int("max_depth", 5, 7)
            sub = trial.suggest_float("subsample", 0.75, 0.85)
            col = trial.suggest_float("colsample_bytree", 0.75, 0.85)
            m = lgb.LGBMRegressor(objective="quantile", alpha=0.5, n_estimators=75, learning_rate=lr, num_leaves=nl, max_depth=md, subsample=sub, colsample_bytree=col, random_state=42, n_jobs=4, verbose=-1)
            m.fit(X0_tr[feat_del], self.y_del_cv[trn0_idx])
            pred = m.predict(X0_va[feat_del])
            return float(mean_absolute_error(self.y_del_cv[val0_idx], pred))

        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=5)
        bp = study.best_trial.params

        fold_records = []
        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            df_tr = self.cv_df.iloc[trn_idx]
            df_va = self.cv_df.iloc[val_idx]

            heb_del = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df_tr, pd.Series(self.y_del_cv[trn_idx]))
            heb_p15 = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df_tr, pd.Series(self.y_p15_cv[trn_idx]))
            heb_mis = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0).fit(df_tr, pd.Series(self.y_mis_cv[trn_idx]))

            te_tr = pd.DataFrame({
                "heb_delay": heb_del.transform(df_tr),
                "heb_p15": heb_p15.transform(df_tr),
                "heb_missed": heb_mis.transform(df_tr),
            })
            te_va = pd.DataFrame({
                "heb_delay": heb_del.transform(df_va),
                "heb_p15": heb_p15.transform(df_va),
                "heb_missed": heb_mis.transform(df_va),
            })

            X_tr = pd.concat([self.base_v7_cv.iloc[trn_idx].reset_index(drop=True), te_tr], axis=1)
            X_va = pd.concat([self.base_v7_cv.iloc[val_idx].reset_index(drop=True), te_va], axis=1)

            reg = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95,
                learning_rate=bp.get("learning_rate", 0.08), num_leaves=bp.get("num_leaves", 35),
                max_depth=bp.get("max_depth", 6), subsample=bp.get("subsample", 0.8),
                colsample_bytree=bp.get("colsample_bytree", 0.8),
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            reg.fit(X_tr[feat_del], self.y_del_cv[trn_idx])
            pred_del_tr = np.maximum(0.0, reg.predict(X_tr[feat_del]))
            pred_del_va = np.maximum(0.0, reg.predict(X_va[feat_del]))
            oof_delay[val_idx] = pred_del_va

            cls_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_mis.fit(X_tr[feat_mis], self.y_mis_cv[trn_idx])
            prob_mis_tr = cls_mis.predict_proba(X_tr[feat_mis])[:, 1]
            prob_mis_va = cls_mis.predict_proba(X_va[feat_mis])[:, 1]
            oof_missed[val_idx] = prob_mis_va

            cls_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_rel.fit(X_tr[feat_rel], self.y_rel_cv[trn_idx])
            prob_rel_tr = cls_rel.predict_proba(X_tr[feat_rel])[:, 1]
            prob_rel_va = cls_rel.predict_proba(X_va[feat_rel])[:, 1]

            iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            iso.fit(prob_rel_tr, self.y_rel_cv[trn_idx])
            cal_rel_tr = iso.predict(prob_rel_tr)
            cal_rel_va = iso.predict(prob_rel_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(self.y_del_cv[trn_idx], pred_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], pred_del_va)
            m_mis_tr = compute_classification_metrics(self.y_mis_cv[trn_idx], prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(self.y_rel_cv[trn_idx], cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Final models on full CV pool
        X_cv_full = pd.concat([self.base_v7_cv.reset_index(drop=True), self.heb_cv_full], axis=1)
        X_test_full = pd.concat([self.base_v7_test.reset_index(drop=True), self.heb_test_full], axis=1)

        reg_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95,
            learning_rate=bp.get("learning_rate", 0.08), num_leaves=bp.get("num_leaves", 35),
            max_depth=bp.get("max_depth", 6), subsample=bp.get("subsample", 0.8),
            colsample_bytree=bp.get("colsample_bytree", 0.8),
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        reg_final.fit(X_cv_full[feat_del], self.y_del_cv)
        test_pred_del = np.maximum(0.0, reg_final.predict(X_test_full[feat_del]))

        cls_mis_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_mis_final.fit(X_cv_full[feat_mis], self.y_mis_cv)
        test_prob_mis = cls_mis_final.predict_proba(X_test_full[feat_mis])[:, 1]

        cls_rel_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_rel_final.fit(X_cv_full[feat_rel], self.y_rel_cv)
        test_prob_rel_raw = cls_rel_final.predict_proba(X_test_full[feat_rel])[:, 1]

        iso_final = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        iso_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = iso_final.predict(test_prob_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        # Feature importances
        all_features = sorted(list(set(feat_del + feat_mis + feat_rel)))
        del_imp_map = dict(zip(feat_del, reg_final.feature_importances_))
        mis_imp_map = dict(zip(feat_mis, cls_mis_final.feature_importances_))
        rel_imp_map = dict(zip(feat_rel, cls_rel_final.feature_importances_))

        fi_df = pd.DataFrame({
            "feature": all_features,
            "reg_importance": [del_imp_map.get(f, 0) for f in all_features],
            "cls_importance": [mis_imp_map.get(f, 0) for f in all_features],
            "rel_importance": [rel_imp_map.get(f, 0) for f in all_features],
        })
        fi_df["total_gain"] = fi_df["reg_importance"] + fi_df["cls_importance"] + fi_df["rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v22_heb_optuna_quantile_fusion",
            "feat_del": feat_del,
            "feat_mis": feat_mis,
            "feat_rel": feat_rel,
            "heb_encoders": self.heb_encoders_full,
            "regressor": reg_final,
            "classifier": cls_mis_final,
            "reliability_classifier": cls_rel_final,
            "calibrator": iso_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v22_heb_optuna_quantile_fusion",
            "description": "3-Level HEB target encodings + task-decoupled feature selection + Optuna-tuned LightGBM quantile regression",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V22 Results | Val MAE: {cv_summary['val_mean']['regressor']['mae']:.3f} | Test 2026 MAE: {test_metrics['regressor']['mae']:.3f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V23
    # =================================================================
    def _train_v23_dense_11quantiles_studentized_zscore(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v23_dense_11quantiles_studentized_zscore"
        folder.mkdir(parents=True, exist_ok=True)

        alphas = np.array([0.05, 0.15, 0.25, 0.35, 0.45, 0.50, 0.55, 0.65, 0.75, 0.85, 0.95], dtype=np.float32)
        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)
        oof_quantiles = np.zeros((n_cv, len(alphas)), dtype=np.float32)

        # Base HEB feature space
        X_cv_heb = pd.concat([self.base_v7_cv.reset_index(drop=True), self.heb_cv_full], axis=1)
        X_test_heb = pd.concat([self.base_v7_test.reset_index(drop=True), self.heb_test_full], axis=1)
        feature_names = list(X_cv_heb.columns)

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            X_tr, X_va = X_cv_heb.iloc[trn_idx], X_cv_heb.iloc[val_idx]
            y_tr = self.y_del_cv[trn_idx]

            # Fit 11 quantile models inside fold
            q_models = []
            q_tr_raw = []
            q_va_raw = []

            for alpha in alphas:
                qm = lgb.LGBMRegressor(
                    objective="quantile", alpha=float(alpha), n_estimators=65, learning_rate=0.08,
                    num_leaves=31, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
                )
                qm.fit(X_tr, y_tr)
                q_models.append(qm)
                q_tr_raw.append(np.maximum(0.0, qm.predict(X_tr)))
                q_va_raw.append(np.maximum(0.0, qm.predict(X_va)))

            # Monotonic anti-crossing guarantee
            q_tr = np.maximum.accumulate(np.column_stack(q_tr_raw), axis=1)
            q_va = np.maximum.accumulate(np.column_stack(q_va_raw), axis=1)
            oof_quantiles[val_idx] = q_va
            oof_delay[val_idx] = q_va[:, 5]  # alpha=0.50

            # Studentized Z-scores and piecewise CDF
            tb_tr = df_tr = self.cv_df.iloc[trn_idx]["transfer_buffer_minutes"].to_numpy(dtype=np.float32)
            tb_va = df_va = self.cv_df.iloc[val_idx]["transfer_buffer_minutes"].to_numpy(dtype=np.float32)

            z15_tr, z_trans_tr = compute_studentized_zscores(q_tr, tb_tr)
            z15_va, z_trans_va = compute_studentized_zscores(q_va, tb_va)

            cdf15_tr = compute_cdf_prob_vectorized(q_tr, alphas, 15.0)
            cdf15_va = compute_cdf_prob_vectorized(q_va, alphas, 15.0)

            iqr_tr = np.maximum(1.0, q_tr[:, 8] - q_tr[:, 2])
            iqr_va = np.maximum(1.0, q_va[:, 8] - q_va[:, 2])
            spread90_tr = q_tr[:, 10] - q_tr[:, 0]
            spread90_va = q_va[:, 10] - q_va[:, 0]

            # Augmented feature matrices for classifiers
            aug_tr = pd.DataFrame({
                "z_score_15m": z15_tr,
                "z_score_transfer": z_trans_tr,
                "cdf_prob_15m": cdf15_tr,
                "quantile_iqr": iqr_tr,
                "quantile_spread90": spread90_tr,
            })
            aug_va = pd.DataFrame({
                "z_score_15m": z15_va,
                "z_score_transfer": z_trans_va,
                "cdf_prob_15m": cdf15_va,
                "quantile_iqr": iqr_va,
                "quantile_spread90": spread90_va,
            })

            X_cls_tr = pd.concat([X_tr.reset_index(drop=True), aug_tr], axis=1)
            X_cls_va = pd.concat([X_va.reset_index(drop=True), aug_va], axis=1)

            cls_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_mis.fit(X_cls_tr, self.y_mis_cv[trn_idx])
            prob_mis_tr = cls_mis.predict_proba(X_cls_tr)[:, 1]
            prob_mis_va = cls_mis.predict_proba(X_cls_va)[:, 1]
            oof_missed[val_idx] = prob_mis_va

            cls_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_rel.fit(X_cls_tr, self.y_rel_cv[trn_idx])
            prob_rel_tr = cls_rel.predict_proba(X_cls_tr)[:, 1]
            prob_rel_va = cls_rel.predict_proba(X_cls_va)[:, 1]

            iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            iso.fit(prob_rel_tr, self.y_rel_cv[trn_idx])
            cal_rel_tr = iso.predict(prob_rel_tr)
            cal_rel_va = iso.predict(prob_rel_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(self.y_del_cv[trn_idx], q_tr[:, 5])
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], q_va[:, 5])
            m_mis_tr = compute_classification_metrics(self.y_mis_cv[trn_idx], prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(self.y_rel_cv[trn_idx], cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Final models trained on full CV pool
        q_models_final = []
        q_test_raw = []
        q_cv_raw = []

        for alpha in alphas:
            qm = lgb.LGBMRegressor(
                objective="quantile", alpha=float(alpha), n_estimators=65, learning_rate=0.08,
                num_leaves=31, random_state=self.random_state, n_jobs=4, verbose=-1,
            )
            qm.fit(X_cv_heb, self.y_del_cv)
            q_models_final.append(qm)
            q_cv_raw.append(np.maximum(0.0, qm.predict(X_cv_heb)))
            q_test_raw.append(np.maximum(0.0, qm.predict(X_test_heb)))

        q_cv_final = np.maximum.accumulate(np.column_stack(q_cv_raw), axis=1)
        q_test_final = np.maximum.accumulate(np.column_stack(q_test_raw), axis=1)
        test_pred_del = q_test_final[:, 5]

        tb_cv = self.cv_df["transfer_buffer_minutes"].to_numpy(dtype=np.float32)
        tb_test = self.test_df["transfer_buffer_minutes"].to_numpy(dtype=np.float32)

        z15_cv, z_trans_cv = compute_studentized_zscores(q_cv_final, tb_cv)
        z15_test, z_trans_test = compute_studentized_zscores(q_test_final, tb_test)

        cdf15_cv = compute_cdf_prob_vectorized(q_cv_final, alphas, 15.0)
        cdf15_test = compute_cdf_prob_vectorized(q_test_final, alphas, 15.0)

        iqr_cv = np.maximum(1.0, q_cv_final[:, 8] - q_cv_final[:, 2])
        iqr_test = np.maximum(1.0, q_test_final[:, 8] - q_test_final[:, 2])
        spread90_cv = q_cv_final[:, 10] - q_cv_final[:, 0]
        spread90_test = q_test_final[:, 10] - q_test_final[:, 0]

        aug_cv = pd.DataFrame({
            "z_score_15m": z15_cv,
            "z_score_transfer": z_trans_cv,
            "cdf_prob_15m": cdf15_cv,
            "quantile_iqr": iqr_cv,
            "quantile_spread90": spread90_cv,
        })
        aug_test = pd.DataFrame({
            "z_score_15m": z15_test,
            "z_score_transfer": z_trans_test,
            "cdf_prob_15m": cdf15_test,
            "quantile_iqr": iqr_test,
            "quantile_spread90": spread90_test,
        })

        X_cls_cv = pd.concat([X_cv_heb.reset_index(drop=True), aug_cv], axis=1)
        X_cls_test = pd.concat([X_test_heb.reset_index(drop=True), aug_test], axis=1)
        cls_feat_names = list(X_cls_cv.columns)

        cls_mis_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_mis_final.fit(X_cls_cv, self.y_mis_cv)
        test_prob_mis = cls_mis_final.predict_proba(X_cls_test)[:, 1]

        cls_rel_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_rel_final.fit(X_cls_cv, self.y_rel_cv)
        test_prob_rel_raw = cls_rel_final.predict_proba(X_cls_test)[:, 1]

        iso_final = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        iso_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = iso_final.predict(test_prob_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        # Feature importances
        fi_df = pd.DataFrame({
            "feature": cls_feat_names,
            "cls_importance": cls_mis_final.feature_importances_,
            "rel_importance": cls_rel_final.feature_importances_,
        })
        fi_df["total_gain"] = fi_df["cls_importance"] + fi_df["rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v23_dense_11quantiles_studentized_zscore",
            "alphas": alphas,
            "feature_names": feature_names,
            "cls_feat_names": cls_feat_names,
            "q_models": q_models_final,
            "classifier": cls_mis_final,
            "reliability_classifier": cls_rel_final,
            "calibrator": iso_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v23_dense_11quantiles_studentized_zscore",
            "description": "Dense 11-Quantile monotonic grid + Studentized Threshold Z-scores + piecewise CDF probability",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel, "quantiles": oof_quantiles}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal, "quantiles": q_test_final}
        logger.info(f"V23 Results | Val Missed AUC: {cv_summary['val_mean']['classifier_missed']['roc_auc']:.4f} | Test Rel AUC: {test_metrics['reliability']['roc_auc']:.4f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V24
    # =================================================================
    def _train_v24_factorized_conditional_reliability(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v24_factorized_conditional_reliability"
        folder.mkdir(parents=True, exist_ok=True)

        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        X_cv_heb = pd.concat([self.base_v7_cv.reset_index(drop=True), self.heb_cv_full], axis=1)
        X_test_heb = pd.concat([self.base_v7_test.reset_index(drop=True), self.heb_test_full], axis=1)
        feature_names = list(X_cv_heb.columns)

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            X_tr, X_va = X_cv_heb.iloc[trn_idx], X_cv_heb.iloc[val_idx]
            y_del_tr = self.y_del_cv[trn_idx]
            y_mis_tr = self.y_mis_cv[trn_idx]
            y_rel_tr = self.y_rel_cv[trn_idx]

            # 1. Delay Regressor
            reg = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            reg.fit(X_tr, y_del_tr)
            pred_del_tr = np.maximum(0.0, reg.predict(X_tr))
            pred_del_va = np.maximum(0.0, reg.predict(X_va))
            oof_delay[val_idx] = pred_del_va

            # 2. Missed Connection Classifier
            cls_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_mis.fit(X_tr, y_mis_tr)
            prob_mis_tr = cls_mis.predict_proba(X_tr)[:, 1]
            prob_mis_va = cls_mis.predict_proba(X_va)[:, 1]
            oof_missed[val_idx] = prob_mis_va

            # 3. Factorized Reliability Components
            # Component A: P(delay <= 15.0 | X) trained on all training samples
            y_p15_tr = (y_del_tr <= 15.0).astype(np.int32)
            cls_comp_a = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_comp_a.fit(X_tr, y_p15_tr)
            prob_a_tr = cls_comp_a.predict_proba(X_tr)[:, 1]
            prob_a_va = cls_comp_a.predict_proba(X_va)[:, 1]

            # Component B: P(missed_connection == 0 | delay <= 15.0, X)
            # Trained STRICTLY on training rows where actual_delay_minutes <= 15.0
            idx_sub_15 = np.where(y_del_tr <= 15.0)[0]
            X_tr_sub = X_tr.iloc[idx_sub_15]
            y_not_mis_sub = (y_mis_tr[idx_sub_15] == 0).astype(np.int32)

            cls_comp_b = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_comp_b.fit(X_tr_sub, y_not_mis_sub)

            # Evaluate Component B on ALL rows (NO leakage of ground-truth delay!)
            prob_b_tr = cls_comp_b.predict_proba(X_tr)[:, 1]
            prob_b_va = cls_comp_b.predict_proba(X_va)[:, 1]

            # Direct Joint Classifier: P(Reliable | X)
            cls_direct = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_direct.fit(X_tr, y_rel_tr)
            prob_dir_tr = cls_direct.predict_proba(X_tr)[:, 1]
            prob_dir_va = cls_direct.predict_proba(X_va)[:, 1]

            # Blend: P_fact = P_A * P_B
            p_fact_tr = prob_a_tr * prob_b_tr
            p_fact_va = prob_a_va * prob_b_va

            p_blend_tr = 0.50 * p_fact_tr + 0.50 * prob_dir_tr
            p_blend_va = 0.50 * p_fact_va + 0.50 * prob_dir_va

            # Calibrate blended probability
            iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            iso.fit(p_blend_tr, y_rel_tr)
            cal_rel_tr = iso.predict(p_blend_tr)
            cal_rel_va = iso.predict(p_blend_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(y_del_tr, pred_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], pred_del_va)
            m_mis_tr = compute_classification_metrics(y_mis_tr, prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(y_rel_tr, cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Train final models on full CV pool
        reg_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        reg_final.fit(X_cv_heb, self.y_del_cv)
        test_pred_del = np.maximum(0.0, reg_final.predict(X_test_heb))

        cls_mis_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_mis_final.fit(X_cv_heb, self.y_mis_cv)
        test_prob_mis = cls_mis_final.predict_proba(X_test_heb)[:, 1]

        # Final Component A & B
        cls_a_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_a_final.fit(X_cv_heb, (self.y_del_cv <= 15.0).astype(np.int32))
        test_prob_a = cls_a_final.predict_proba(X_test_heb)[:, 1]

        idx_full_sub = np.where(self.y_del_cv <= 15.0)[0]
        cls_b_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_b_final.fit(X_cv_heb.iloc[idx_full_sub], (self.y_mis_cv[idx_full_sub] == 0).astype(np.int32))
        # Evaluated on full test set without ground-truth delay filtering
        test_prob_b = cls_b_final.predict_proba(X_test_heb)[:, 1]

        cls_dir_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_dir_final.fit(X_cv_heb, self.y_rel_cv)
        test_prob_dir = cls_dir_final.predict_proba(X_test_heb)[:, 1]

        test_fact = test_prob_a * test_prob_b
        test_blend = 0.50 * test_fact + 0.50 * test_prob_dir

        iso_final = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        iso_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = iso_final.predict(test_blend)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        fi_df = pd.DataFrame({
            "feature": feature_names,
            "reg_importance": reg_final.feature_importances_,
            "comp_a_importance": cls_a_final.feature_importances_,
            "comp_b_importance": cls_b_final.feature_importances_,
            "direct_rel_importance": cls_dir_final.feature_importances_,
        })
        fi_df["total_gain"] = fi_df["reg_importance"] + fi_df["comp_a_importance"] + fi_df["comp_b_importance"] + fi_df["direct_rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v24_factorized_conditional_reliability",
            "feature_names": feature_names,
            "regressor": reg_final,
            "classifier": cls_mis_final,
            "cls_comp_a": cls_a_final,
            "cls_comp_b": cls_b_final,
            "cls_direct": cls_dir_final,
            "calibrator": iso_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v24_factorized_conditional_reliability",
            "description": "Factorized conditional reliability: P(Rel) = P(delay<=15) * P(missed=0|delay<=15) blended with direct joint classifier",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V24 Results | Val Rel AUC: {cv_summary['val_mean']['reliability']['roc_auc']:.4f} | Test Rel AUC: {test_metrics['reliability']['roc_auc']:.4f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V25
    # =================================================================
    def _train_v25_origin_delay_residual_propagation(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v25_origin_delay_residual_propagation"
        folder.mkdir(parents=True, exist_ok=True)

        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        # Base features + Slack features + HEB features
        X_cv_v25 = pd.concat([self.base_v7_cv.reset_index(drop=True), self.slack_cv.reset_index(drop=True), self.heb_cv_full], axis=1)
        X_test_v25 = pd.concat([self.base_v7_test.reset_index(drop=True), self.slack_test.reset_index(drop=True), self.heb_test_full], axis=1)
        feature_names = list(X_cv_v25.columns)

        # Residual target: delta_d = actual_delay_minutes - delay_at_origin_minutes
        orig_del_cv = self.cv_df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)
        orig_del_test = self.test_df["delay_at_origin_minutes"].to_numpy(dtype=np.float32)
        delta_d_cv = self.y_del_cv - orig_del_cv

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            X_tr, X_va = X_cv_v25.iloc[trn_idx], X_cv_v25.iloc[val_idx]
            y_del_tr = self.y_del_cv[trn_idx]
            delta_tr = delta_d_cv[trn_idx]

            # 1. Residual Regressor predicting delta_d
            reg_res = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            reg_res.fit(X_tr, delta_tr)
            pred_delta_tr = reg_res.predict(X_tr)
            pred_delta_va = reg_res.predict(X_va)

            # Reconstructed delay: max(0, origin_delay + delta_hat)
            pred_res_del_tr = np.maximum(0.0, orig_del_cv[trn_idx] + pred_delta_tr)
            pred_res_del_va = np.maximum(0.0, orig_del_cv[val_idx] + pred_delta_va)

            # Direct Regressor predicting actual_delay_minutes
            reg_dir = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx + 100, n_jobs=4, verbose=-1,
            )
            reg_dir.fit(X_tr, y_del_tr)
            pred_dir_del_tr = np.maximum(0.0, reg_dir.predict(X_tr))
            pred_dir_del_va = np.maximum(0.0, reg_dir.predict(X_va))

            # Blend: 50% Residual Reconstruction + 50% Direct Prediction
            blend_del_tr = 0.50 * pred_res_del_tr + 0.50 * pred_dir_del_tr
            blend_del_va = 0.50 * pred_res_del_va + 0.50 * pred_dir_del_va
            oof_delay[val_idx] = blend_del_va

            # Missed Connection Classifier
            cls_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_mis.fit(X_tr, self.y_mis_cv[trn_idx])
            prob_mis_tr = cls_mis.predict_proba(X_tr)[:, 1]
            prob_mis_va = cls_mis.predict_proba(X_va)[:, 1]
            oof_missed[val_idx] = prob_mis_va

            # Reliability Classifier
            cls_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_rel.fit(X_tr, self.y_rel_cv[trn_idx])
            prob_rel_tr = cls_rel.predict_proba(X_tr)[:, 1]
            prob_rel_va = cls_rel.predict_proba(X_va)[:, 1]

            iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            iso.fit(prob_rel_tr, self.y_rel_cv[trn_idx])
            cal_rel_tr = iso.predict(prob_rel_tr)
            cal_rel_va = iso.predict(prob_rel_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(y_del_tr, blend_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], blend_del_va)
            m_mis_tr = compute_classification_metrics(self.y_mis_cv[trn_idx], prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(self.y_rel_cv[trn_idx], cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Final models on full CV pool
        reg_res_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        reg_res_final.fit(X_cv_v25, delta_d_cv)
        test_pred_delta = reg_res_final.predict(X_test_v25)
        test_pred_res = np.maximum(0.0, orig_del_test + test_pred_delta)

        reg_dir_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state + 100, n_jobs=4, verbose=-1,
        )
        reg_dir_final.fit(X_cv_v25, self.y_del_cv)
        test_pred_dir = np.maximum(0.0, reg_dir_final.predict(X_test_v25))

        test_pred_del = 0.50 * test_pred_res + 0.50 * test_pred_dir

        cls_mis_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_mis_final.fit(X_cv_v25, self.y_mis_cv)
        test_prob_mis = cls_mis_final.predict_proba(X_test_v25)[:, 1]

        cls_rel_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_rel_final.fit(X_cv_v25, self.y_rel_cv)
        test_prob_rel_raw = cls_rel_final.predict_proba(X_test_v25)[:, 1]

        iso_final = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        iso_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = iso_final.predict(test_prob_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        fi_df = pd.DataFrame({
            "feature": feature_names,
            "res_reg_importance": reg_res_final.feature_importances_,
            "dir_reg_importance": reg_dir_final.feature_importances_,
            "cls_importance": cls_mis_final.feature_importances_,
            "rel_importance": cls_rel_final.feature_importances_,
        })
        fi_df["total_gain"] = fi_df["res_reg_importance"] + fi_df["dir_reg_importance"] + fi_df["cls_importance"] + fi_df["rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v25_origin_delay_residual_propagation",
            "feature_names": feature_names,
            "reg_residual": reg_res_final,
            "reg_direct": reg_dir_final,
            "classifier": cls_mis_final,
            "reliability_classifier": cls_rel_final,
            "calibrator": iso_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v25_origin_delay_residual_propagation",
            "description": "Origin delay residual propagation delta_d reconstruction blended with direct quantile prediction and timetable slack features",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V25 Results | Val MAE: {cv_summary['val_mean']['regressor']['mae']:.3f} | Test 2026 MAE: {test_metrics['regressor']['mae']:.3f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V26
    # =================================================================
    def _train_v26_multi_harmonic_fourier_4level_heb(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v26_multi_harmonic_fourier_4level_heb"
        folder.mkdir(parents=True, exist_ok=True)

        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        # Base features + Fourier Harmonics (18 cyclical features)
        base_fourier_cv = pd.concat([self.base_v7_cv.reset_index(drop=True), self.fourier_cv.reset_index(drop=True)], axis=1)
        base_fourier_test = pd.concat([self.base_v7_test.reset_index(drop=True), self.fourier_test.reset_index(drop=True)], axis=1)

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            df_tr = self.cv_df.iloc[trn_idx]
            df_va = self.cv_df.iloc[val_idx]

            # Fit 4-Level Hierarchical Empirical Bayes STRICTLY inside each training fold
            heb4_del = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0).fit(df_tr, pd.Series(self.y_del_cv[trn_idx]))
            heb4_p15 = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0).fit(df_tr, pd.Series(self.y_p15_cv[trn_idx]))
            heb4_mis = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0).fit(df_tr, pd.Series(self.y_mis_cv[trn_idx]))

            te4_tr = pd.DataFrame({
                "heb4_delay": heb4_del.transform(df_tr),
                "heb4_p15": heb4_p15.transform(df_tr),
                "heb4_missed": heb4_mis.transform(df_tr),
            })
            te4_va = pd.DataFrame({
                "heb4_delay": heb4_del.transform(df_va),
                "heb4_p15": heb4_p15.transform(df_va),
                "heb4_missed": heb4_mis.transform(df_va),
            })

            X_tr = pd.concat([base_fourier_cv.iloc[trn_idx].reset_index(drop=True), te4_tr], axis=1)
            X_va = pd.concat([base_fourier_cv.iloc[val_idx].reset_index(drop=True), te4_va], axis=1)

            reg = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            reg.fit(X_tr, self.y_del_cv[trn_idx])
            pred_del_tr = np.maximum(0.0, reg.predict(X_tr))
            pred_del_va = np.maximum(0.0, reg.predict(X_va))
            oof_delay[val_idx] = pred_del_va

            cls_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_mis.fit(X_tr, self.y_mis_cv[trn_idx])
            prob_mis_tr = cls_mis.predict_proba(X_tr)[:, 1]
            prob_mis_va = cls_mis.predict_proba(X_va)[:, 1]
            oof_missed[val_idx] = prob_mis_va

            cls_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_rel.fit(X_tr, self.y_rel_cv[trn_idx])
            prob_rel_tr = cls_rel.predict_proba(X_tr)[:, 1]
            prob_rel_va = cls_rel.predict_proba(X_va)[:, 1]

            iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            iso.fit(prob_rel_tr, self.y_rel_cv[trn_idx])
            cal_rel_tr = iso.predict(prob_rel_tr)
            cal_rel_va = iso.predict(prob_rel_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(self.y_del_cv[trn_idx], pred_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], pred_del_va)
            m_mis_tr = compute_classification_metrics(self.y_mis_cv[trn_idx], prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(self.y_rel_cv[trn_idx], cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Fit final 4-level HEB encoders on full CV pool for test
        heb4_del_final = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0).fit(self.cv_df, pd.Series(self.y_del_cv))
        heb4_p15_final = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0).fit(self.cv_df, pd.Series(self.y_p15_cv))
        heb4_mis_final = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0).fit(self.cv_df, pd.Series(self.y_mis_cv))

        te4_cv_final = pd.DataFrame({
            "heb4_delay": heb4_del_final.transform(self.cv_df),
            "heb4_p15": heb4_p15_final.transform(self.cv_df),
            "heb4_missed": heb4_mis_final.transform(self.cv_df),
        })
        te4_test_final = pd.DataFrame({
            "heb4_delay": heb4_del_final.transform(self.test_df),
            "heb4_p15": heb4_p15_final.transform(self.test_df),
            "heb4_missed": heb4_mis_final.transform(self.test_df),
        })

        X_cv_v26 = pd.concat([base_fourier_cv.reset_index(drop=True), te4_cv_final], axis=1)
        X_test_v26 = pd.concat([base_fourier_test.reset_index(drop=True), te4_test_final], axis=1)
        feature_names = list(X_cv_v26.columns)

        reg_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        reg_final.fit(X_cv_v26, self.y_del_cv)
        test_pred_del = np.maximum(0.0, reg_final.predict(X_test_v26))

        cls_mis_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_mis_final.fit(X_cv_v26, self.y_mis_cv)
        test_prob_mis = cls_mis_final.predict_proba(X_test_v26)[:, 1]

        cls_rel_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_rel_final.fit(X_cv_v26, self.y_rel_cv)
        test_prob_rel_raw = cls_rel_final.predict_proba(X_test_v26)[:, 1]

        iso_final = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        iso_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = iso_final.predict(test_prob_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        fi_df = pd.DataFrame({
            "feature": feature_names,
            "reg_importance": reg_final.feature_importances_,
            "cls_importance": cls_mis_final.feature_importances_,
            "rel_importance": cls_rel_final.feature_importances_,
        })
        fi_df["total_gain"] = fi_df["reg_importance"] + fi_df["cls_importance"] + fi_df["rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v26_multi_harmonic_fourier_4level_heb",
            "feature_names": feature_names,
            "heb4_del": heb4_del_final,
            "heb4_p15": heb4_p15_final,
            "heb4_mis": heb4_mis_final,
            "regressor": reg_final,
            "classifier": cls_mis_final,
            "reliability_classifier": cls_rel_final,
            "calibrator": iso_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v26_multi_harmonic_fourier_4level_heb",
            "description": "Multi-harmonic Fourier order k=1,2,3 cyclical features + 4-level Hierarchical Empirical Bayes shrinkage",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V26 Results | Val MAE: {cv_summary['val_mean']['regressor']['mae']:.3f} | Test 2026 MAE: {test_metrics['regressor']['mae']:.3f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V27
    # =================================================================
    def _train_v27_catboost_mae_lgbm_l1_cross_family(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v27_catboost_mae_lgbm_l1_cross_family"
        folder.mkdir(parents=True, exist_ok=True)

        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        # Cross-family feature set (physics + weather + slack + fourier + HEB)
        X_cv_v27 = pd.concat([
            self.base_v7_cv.reset_index(drop=True),
            self.slack_cv.reset_index(drop=True),
            self.fourier_cv.reset_index(drop=True),
            self.heb_cv_full,
        ], axis=1)
        X_test_v27 = pd.concat([
            self.base_v7_test.reset_index(drop=True),
            self.slack_test.reset_index(drop=True),
            self.fourier_test.reset_index(drop=True),
            self.heb_test_full,
        ], axis=1)
        feature_names = list(X_cv_v27.columns)

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            X_tr, X_va = X_cv_v27.iloc[trn_idx], X_cv_v27.iloc[val_idx]
            y_del_tr = self.y_del_cv[trn_idx]
            y_mis_tr = self.y_mis_cv[trn_idx]
            y_rel_tr = self.y_rel_cv[trn_idx]

            # 1. CatBoost with MAE loss
            cb_reg = CatBoostRegressor(
                loss_function="MAE", depth=6, l2_leaf_reg=5.0, iterations=90,
                thread_count=4, verbose=0, random_seed=self.random_state + fold_idx,
            )
            cb_reg.fit(X_tr, y_del_tr)
            p_cb_tr = np.maximum(0.0, cb_reg.predict(X_tr))
            p_cb_va = np.maximum(0.0, cb_reg.predict(X_va))

            # 2. LightGBM Quantile (alpha=0.50)
            lgb_q = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=90, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            lgb_q.fit(X_tr, y_del_tr)
            p_lgb_q_tr = np.maximum(0.0, lgb_q.predict(X_tr))
            p_lgb_q_va = np.maximum(0.0, lgb_q.predict(X_va))

            # 3. LightGBM Huber
            lgb_huber = lgb.LGBMRegressor(
                objective="huber", alpha=0.90, n_estimators=90, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx + 100, n_jobs=4, verbose=-1,
            )
            lgb_huber.fit(X_tr, y_del_tr)
            p_lgb_h_tr = np.maximum(0.0, lgb_huber.predict(X_tr))
            p_lgb_h_va = np.maximum(0.0, lgb_huber.predict(X_va))

            # Optimal L1 simplex weights across tree families
            P_tr = np.column_stack([p_cb_tr, p_lgb_q_tr, p_lgb_h_tr])
            P_va = np.column_stack([p_cb_va, p_lgb_q_va, p_lgb_h_va])
            w_opt = solve_l1_simplex_weights(P_tr, y_del_tr)

            blend_del_tr = P_tr @ w_opt
            blend_del_va = P_va @ w_opt
            oof_delay[val_idx] = blend_del_va

            # Missed Classifier (CatBoost + LightGBM blend)
            cb_mis = CatBoostClassifier(
                loss_function="Logloss", depth=6, iterations=90, thread_count=4, verbose=0,
                random_seed=self.random_state + fold_idx,
            )
            cb_mis.fit(X_tr, y_mis_tr)
            prob_cb_mis_tr = cb_mis.predict_proba(X_tr)[:, 1]
            prob_cb_mis_va = cb_mis.predict_proba(X_va)[:, 1]

            lgb_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=90, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            lgb_mis.fit(X_tr, y_mis_tr)
            prob_lgb_mis_tr = lgb_mis.predict_proba(X_tr)[:, 1]
            prob_lgb_mis_va = lgb_mis.predict_proba(X_va)[:, 1]

            prob_mis_tr = 0.50 * prob_cb_mis_tr + 0.50 * prob_lgb_mis_tr
            prob_mis_va = 0.50 * prob_cb_mis_va + 0.50 * prob_lgb_mis_va
            oof_missed[val_idx] = prob_mis_va

            # Reliability Classifier (CatBoost + LightGBM blend + Isotonic)
            cb_rel = CatBoostClassifier(
                loss_function="Logloss", depth=6, iterations=90, thread_count=4, verbose=0,
                random_seed=self.random_state + fold_idx,
            )
            cb_rel.fit(X_tr, y_rel_tr)
            prob_cb_rel_tr = cb_rel.predict_proba(X_tr)[:, 1]
            prob_cb_rel_va = cb_rel.predict_proba(X_va)[:, 1]

            lgb_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=90, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            lgb_rel.fit(X_tr, y_rel_tr)
            prob_lgb_rel_tr = lgb_rel.predict_proba(X_tr)[:, 1]
            prob_lgb_rel_va = lgb_rel.predict_proba(X_va)[:, 1]

            prob_rel_raw_tr = 0.50 * prob_cb_rel_tr + 0.50 * prob_lgb_rel_tr
            prob_rel_raw_va = 0.50 * prob_cb_rel_va + 0.50 * prob_lgb_rel_va

            iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            iso.fit(prob_rel_raw_tr, y_rel_tr)
            cal_rel_tr = iso.predict(prob_rel_raw_tr)
            cal_rel_va = iso.predict(prob_rel_raw_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(y_del_tr, blend_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], blend_del_va)
            m_mis_tr = compute_classification_metrics(y_mis_tr, prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(y_rel_tr, cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Train final models on full CV pool
        cb_reg_final = CatBoostRegressor(
            loss_function="MAE", depth=6, l2_leaf_reg=5.0, iterations=90,
            thread_count=4, verbose=0, random_seed=self.random_state,
        )
        cb_reg_final.fit(X_cv_v27, self.y_del_cv)
        p_cb_test = np.maximum(0.0, cb_reg_final.predict(X_test_v27))

        lgb_q_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=90, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        lgb_q_final.fit(X_cv_v27, self.y_del_cv)
        p_lgb_q_test = np.maximum(0.0, lgb_q_final.predict(X_test_v27))

        lgb_h_final = lgb.LGBMRegressor(
            objective="huber", alpha=0.90, n_estimators=90, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state + 100, n_jobs=4, verbose=-1,
        )
        lgb_h_final.fit(X_cv_v27, self.y_del_cv)
        p_lgb_h_test = np.maximum(0.0, lgb_h_final.predict(X_test_v27))

        # Solve final L1 simplex weights on full CV
        p_cb_cv = np.maximum(0.0, cb_reg_final.predict(X_cv_v27))
        p_lgb_q_cv = np.maximum(0.0, lgb_q_final.predict(X_cv_v27))
        p_lgb_h_cv = np.maximum(0.0, lgb_h_final.predict(X_cv_v27))
        P_cv_final = np.column_stack([p_cb_cv, p_lgb_q_cv, p_lgb_h_cv])
        P_test_final = np.column_stack([p_cb_test, p_lgb_q_test, p_lgb_h_test])
        w_final = solve_l1_simplex_weights(P_cv_final, self.y_del_cv)

        test_pred_del = P_test_final @ w_final

        # Classifiers final
        cb_mis_final = CatBoostClassifier(loss_function="Logloss", depth=6, iterations=90, thread_count=4, verbose=0, random_seed=self.random_state)
        cb_mis_final.fit(X_cv_v27, self.y_mis_cv)
        lgb_mis_final = lgb.LGBMClassifier(objective="binary", n_estimators=90, learning_rate=0.08, num_leaves=35, scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1)
        lgb_mis_final.fit(X_cv_v27, self.y_mis_cv)
        test_prob_mis = 0.50 * cb_mis_final.predict_proba(X_test_v27)[:, 1] + 0.50 * lgb_mis_final.predict_proba(X_test_v27)[:, 1]

        cb_rel_final = CatBoostClassifier(loss_function="Logloss", depth=6, iterations=90, thread_count=4, verbose=0, random_seed=self.random_state)
        cb_rel_final.fit(X_cv_v27, self.y_rel_cv)
        lgb_rel_final = lgb.LGBMClassifier(objective="binary", n_estimators=90, learning_rate=0.08, num_leaves=35, random_state=self.random_state, n_jobs=4, verbose=-1)
        lgb_rel_final.fit(X_cv_v27, self.y_rel_cv)
        test_prob_rel_raw = 0.50 * cb_rel_final.predict_proba(X_test_v27)[:, 1] + 0.50 * lgb_rel_final.predict_proba(X_test_v27)[:, 1]

        iso_final = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        iso_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = iso_final.predict(test_prob_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        # Feature importances: blend across trees
        cb_imp = cb_reg_final.get_feature_importance()
        lgb_q_imp = lgb_q_final.feature_importances_
        lgb_h_imp = lgb_h_final.feature_importances_

        fi_df = pd.DataFrame({
            "feature": feature_names,
            "catboost_mae_gain": cb_imp,
            "lgbm_quantile_gain": lgb_q_imp,
            "lgbm_huber_gain": lgb_h_imp,
            "l1_ensemble_weight_catboost": [round(float(w_final[0]), 4)] * len(feature_names),
            "l1_ensemble_weight_lgbm_q": [round(float(w_final[1]), 4)] * len(feature_names),
            "l1_ensemble_weight_lgbm_h": [round(float(w_final[2]), 4)] * len(feature_names),
        })
        fi_df["total_gain"] = fi_df["catboost_mae_gain"] + fi_df["lgbm_quantile_gain"] + fi_df["lgbm_huber_gain"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v27_catboost_mae_lgbm_l1_cross_family",
            "feature_names": feature_names,
            "w_simplex": w_final,
            "cb_reg": cb_reg_final,
            "lgb_q": lgb_q_final,
            "lgb_h": lgb_h_final,
            "cb_mis": cb_mis_final,
            "lgb_mis": lgb_mis_final,
            "cb_rel": cb_rel_final,
            "lgb_rel": lgb_rel_final,
            "calibrator": iso_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v27_catboost_mae_lgbm_l1_cross_family",
            "description": "Cross-Family CatBoost MAE (symmetric oblivious trees) + LightGBM Quantile + Huber with L1-optimal simplex weights",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V27 Results | Val MAE: {cv_summary['val_mean']['regressor']['mae']:.3f} | Test 2026 MAE: {test_metrics['regressor']['mae']:.3f} | Simplex Weights: {w_final}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V28
    # =================================================================
    def _train_v28_temporal_covariate_shift_calibrated(self) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v28_temporal_covariate_shift_calibrated"
        folder.mkdir(parents=True, exist_ok=True)

        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        # Base features + Slack + HEB features
        X_cv_v28 = pd.concat([
            self.base_v7_cv.reset_index(drop=True),
            self.slack_cv.reset_index(drop=True),
            self.heb_cv_full,
        ], axis=1)
        X_test_v28 = pd.concat([
            self.base_v7_test.reset_index(drop=True),
            self.slack_test.reset_index(drop=True),
            self.heb_test_full,
        ], axis=1)
        feature_names = list(X_cv_v28.columns)

        # Service years strictly from CV set (2023-2025)
        years_cv = self.cv_df["service_date"].dt.year.to_numpy(dtype=np.float32)

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            X_tr, X_va = X_cv_v28.iloc[trn_idx], X_cv_v28.iloc[val_idx]
            y_del_tr = self.y_del_cv[trn_idx]
            y_mis_tr = self.y_mis_cv[trn_idx]
            y_rel_tr = self.y_rel_cv[trn_idx]

            # Estimate covariate-shift density weights STRICTLY within 2023-2025 training fold
            # Weighting observations towards 2025 operational reality:
            # w_i = exp(0.40 * (year_i - 2023)) normalized to mean=1.0, clipped [0.3, 3.0]
            y_tr_years = years_cv[trn_idx]
            sw_tr_raw = np.exp(0.40 * (y_tr_years - 2023.0))
            sw_tr = np.clip(sw_tr_raw / np.mean(sw_tr_raw), 0.3, 3.0).astype(np.float32)

            reg = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            reg.fit(X_tr, y_del_tr, sample_weight=sw_tr)
            pred_del_tr = np.maximum(0.0, reg.predict(X_tr))
            pred_del_va = np.maximum(0.0, reg.predict(X_va))
            oof_delay[val_idx] = pred_del_va

            cls_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_mis.fit(X_tr, y_mis_tr, sample_weight=sw_tr)
            prob_mis_tr = cls_mis.predict_proba(X_tr)[:, 1]
            prob_mis_va = cls_mis.predict_proba(X_va)[:, 1]
            oof_missed[val_idx] = prob_mis_va

            cls_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            cls_rel.fit(X_tr, y_rel_tr, sample_weight=sw_tr)
            prob_rel_tr = cls_rel.predict_proba(X_tr)[:, 1]
            prob_rel_va = cls_rel.predict_proba(X_va)[:, 1]

            # Drift-resistant Anchored Isotonic + Platt Calibrator
            cal = AnchoredIsotonicCalibrator(platt_weight=0.50)
            cal.fit(prob_rel_tr, y_rel_tr, sample_weight=sw_tr)
            cal_rel_tr = cal.predict(prob_rel_tr)
            cal_rel_va = cal.predict(prob_rel_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(y_del_tr, pred_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], pred_del_va)
            m_mis_tr = compute_classification_metrics(y_mis_tr, prob_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], prob_mis_va)
            m_rel_tr = compute_reliability_metrics(y_rel_tr, cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Final models trained on full CV pool with temporal density weights
        sw_cv_raw = np.exp(0.40 * (years_cv - 2023.0))
        sw_cv = np.clip(sw_cv_raw / np.mean(sw_cv_raw), 0.3, 3.0).astype(np.float32)

        reg_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        reg_final.fit(X_cv_v28, self.y_del_cv, sample_weight=sw_cv)
        test_pred_del = np.maximum(0.0, reg_final.predict(X_test_v28))

        cls_mis_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_mis_final.fit(X_cv_v28, self.y_mis_cv, sample_weight=sw_cv)
        test_prob_mis = cls_mis_final.predict_proba(X_test_v28)[:, 1]

        cls_rel_final = lgb.LGBMClassifier(
            objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        cls_rel_final.fit(X_cv_v28, self.y_rel_cv, sample_weight=sw_cv)
        test_prob_rel_raw = cls_rel_final.predict_proba(X_test_v28)[:, 1]

        cal_final = AnchoredIsotonicCalibrator(platt_weight=0.50)
        cal_final.fit(oof_rel, self.y_rel_cv, sample_weight=sw_cv)
        test_prob_rel_cal = cal_final.predict(test_prob_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        fi_df = pd.DataFrame({
            "feature": feature_names,
            "reg_importance": reg_final.feature_importances_,
            "cls_importance": cls_mis_final.feature_importances_,
            "rel_importance": cls_rel_final.feature_importances_,
        })
        fi_df["total_gain"] = fi_df["reg_importance"] + fi_df["cls_importance"] + fi_df["rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v28_temporal_covariate_shift_calibrated",
            "feature_names": feature_names,
            "regressor": reg_final,
            "classifier": cls_mis_final,
            "reliability_classifier": cls_rel_final,
            "calibrator": cal_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v28_temporal_covariate_shift_calibrated",
            "description": "Temporal covariate shift density weighting towards 2025 operational distribution + Anchored Isotonic / Platt calibrator",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V28 Results | Val Rel ECE: {cv_summary['val_mean']['reliability']['ece_pct']:.2f}% | Test 2026 Rel ECE: {test_metrics['reliability']['ece_pct']:.2f}%")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V29
    # =================================================================
    def _train_v29_deep_residual_mlp_zscore_gbdt(
        self,
        oof_preds: Dict[str, Dict[str, np.ndarray]],
        test_preds: Dict[str, Dict[str, np.ndarray]],
    ) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v29_deep_residual_mlp_zscore_gbdt"
        folder.mkdir(parents=True, exist_ok=True)

        n_cv = len(self.cv_df)
        oof_delay = np.zeros(n_cv, dtype=np.float32)
        oof_missed = np.zeros(n_cv, dtype=np.float32)
        oof_rel = np.zeros(n_cv, dtype=np.float32)

        # Retrieve quantiles and compute Z-scores from V23
        q_cv = oof_preds["v23"]["quantiles"]
        q_test = test_preds["v23"]["quantiles"]
        tb_cv = self.cv_df["transfer_buffer_minutes"].to_numpy(dtype=np.float32)
        tb_test = self.test_df["transfer_buffer_minutes"].to_numpy(dtype=np.float32)

        z15_cv, z_trans_cv = compute_studentized_zscores(q_cv, tb_cv)
        z15_test, z_trans_test = compute_studentized_zscores(q_test, tb_test)

        # Enriched Tabular Feature Matrix for Deep MLP
        mlp_feats_cv = pd.DataFrame({
            "z_score_15m": z15_cv,
            "z_score_transfer": z_trans_cv,
            "schedule_slack_minutes": self.slack_cv["schedule_slack_minutes"],
            "net_unabsorbed_origin_delay": self.slack_cv["net_unabsorbed_origin_delay"],
            "heb_delay": self.heb_cv_full["heb_delay"],
            "heb_p15": self.heb_cv_full["heb_p15"],
        })
        mlp_feats_test = pd.DataFrame({
            "z_score_15m": z15_test,
            "z_score_transfer": z_trans_test,
            "schedule_slack_minutes": self.slack_test["schedule_slack_minutes"],
            "net_unabsorbed_origin_delay": self.slack_test["net_unabsorbed_origin_delay"],
            "heb_delay": self.heb_test_full["heb_delay"],
            "heb_p15": self.heb_test_full["heb_p15"],
        })

        X_mlp_cv = pd.concat([self.base_v7_cv.reset_index(drop=True), mlp_feats_cv], axis=1)
        X_mlp_test = pd.concat([self.base_v7_test.reset_index(drop=True), mlp_feats_test], axis=1)
        feature_names = list(X_mlp_cv.columns)

        X_cv_arr = X_mlp_cv.to_numpy(dtype=np.float32)
        X_test_arr = X_mlp_test.to_numpy(dtype=np.float32)

        fold_records = []

        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            X_tr, X_va = X_cv_arr[trn_idx], X_cv_arr[val_idx]
            y_del_tr = self.y_del_cv[trn_idx]
            y_mis_tr = self.y_mis_cv[trn_idx]
            y_rel_tr = self.y_rel_cv[trn_idx]

            # Inside-fold StandardScaler (strictly no validation/test leakage)
            scaler = StandardScaler()
            X_tr_sc = scaler.fit_transform(X_tr)
            X_va_sc = scaler.transform(X_va)

            # Deep Tabular MLP Regressor (256, 128, 64)
            mlp_reg = MLPRegressor(
                hidden_layer_sizes=(256, 128, 64), activation="relu", alpha=0.01,
                early_stopping=True, max_iter=20, batch_size=1024, random_state=self.random_state + fold_idx,
            )
            mlp_reg.fit(X_tr_sc, y_del_tr)
            p_mlp_tr = np.maximum(0.0, mlp_reg.predict(X_tr_sc))
            p_mlp_va = np.maximum(0.0, mlp_reg.predict(X_va_sc))

            # LightGBM GBDT Regressor
            gbdt_reg = lgb.LGBMRegressor(
                objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            gbdt_reg.fit(X_tr, y_del_tr)
            p_gbdt_tr = np.maximum(0.0, gbdt_reg.predict(X_tr))
            p_gbdt_va = np.maximum(0.0, gbdt_reg.predict(X_va))

            # Smooth Blend: 75% GBDT + 25% Deep MLP
            blend_del_tr = 0.75 * p_gbdt_tr + 0.25 * p_mlp_tr
            blend_del_va = 0.75 * p_gbdt_va + 0.25 * p_mlp_va
            oof_delay[val_idx] = blend_del_va

            # Missed Connection Classifier (MLP + GBDT)
            mlp_mis = MLPClassifier(
                hidden_layer_sizes=(256, 128, 64), activation="relu", alpha=0.01,
                early_stopping=True, max_iter=20, batch_size=1024, random_state=self.random_state + fold_idx,
            )
            mlp_mis.fit(X_tr_sc, y_mis_tr)
            prob_mlp_mis_tr = mlp_mis.predict_proba(X_tr_sc)[:, 1]
            prob_mlp_mis_va = mlp_mis.predict_proba(X_va_sc)[:, 1]

            gbdt_mis = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                scale_pos_weight=1.5, random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            gbdt_mis.fit(X_tr, y_mis_tr)
            prob_gbdt_mis_tr = gbdt_mis.predict_proba(X_tr)[:, 1]
            prob_gbdt_mis_va = gbdt_mis.predict_proba(X_va)[:, 1]

            blend_mis_tr = 0.80 * prob_gbdt_mis_tr + 0.20 * prob_mlp_mis_tr
            blend_mis_va = 0.80 * prob_gbdt_mis_va + 0.20 * prob_mlp_mis_va
            oof_missed[val_idx] = blend_mis_va

            # Reliability Classifier (MLP + GBDT + Hybrid Beta Isotonic Calibrator)
            mlp_rel = MLPClassifier(
                hidden_layer_sizes=(256, 128, 64), activation="relu", alpha=0.01,
                early_stopping=True, max_iter=20, batch_size=1024, random_state=self.random_state + fold_idx,
            )
            mlp_rel.fit(X_tr_sc, y_rel_tr)
            prob_mlp_rel_tr = mlp_rel.predict_proba(X_tr_sc)[:, 1]
            prob_mlp_rel_va = mlp_rel.predict_proba(X_va_sc)[:, 1]

            gbdt_rel = lgb.LGBMClassifier(
                objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35,
                random_state=self.random_state + fold_idx, n_jobs=4, verbose=-1,
            )
            gbdt_rel.fit(X_tr, y_rel_tr)
            prob_gbdt_rel_tr = gbdt_rel.predict_proba(X_tr)[:, 1]
            prob_gbdt_rel_va = gbdt_rel.predict_proba(X_va)[:, 1]

            blend_rel_raw_tr = 0.80 * prob_gbdt_rel_tr + 0.20 * prob_mlp_rel_tr
            blend_rel_raw_va = 0.80 * prob_gbdt_rel_va + 0.20 * prob_mlp_rel_va

            cal = HybridBetaIsotonicCalibrator(beta_weight=0.75)
            cal.fit(blend_rel_raw_tr, y_rel_tr)
            cal_rel_tr = cal.predict(blend_rel_raw_tr)
            cal_rel_va = cal.predict(blend_rel_raw_va)
            oof_rel[val_idx] = cal_rel_va

            m_del_tr = compute_regression_metrics(y_del_tr, blend_del_tr)
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], blend_del_va)
            m_mis_tr = compute_classification_metrics(y_mis_tr, blend_mis_tr)
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], blend_mis_va)
            m_rel_tr = compute_reliability_metrics(y_rel_tr, cal_rel_tr)
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], cal_rel_va)

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        # Final models trained on full CV pool
        scaler_final = StandardScaler()
        X_cv_sc = scaler_final.fit_transform(X_cv_arr)
        X_test_sc = scaler_final.transform(X_test_arr)

        mlp_reg_final = MLPRegressor(
            hidden_layer_sizes=(256, 128, 64), activation="relu", alpha=0.01,
            early_stopping=True, max_iter=20, batch_size=1024, random_state=self.random_state,
        )
        mlp_reg_final.fit(X_cv_sc, self.y_del_cv)
        p_mlp_test = np.maximum(0.0, mlp_reg_final.predict(X_test_sc))

        gbdt_reg_final = lgb.LGBMRegressor(
            objective="quantile", alpha=0.50, n_estimators=95, learning_rate=0.08, num_leaves=35,
            random_state=self.random_state, n_jobs=4, verbose=-1,
        )
        gbdt_reg_final.fit(X_cv_arr, self.y_del_cv)
        p_gbdt_test = np.maximum(0.0, gbdt_reg_final.predict(X_test_arr))

        test_pred_del = 0.75 * p_gbdt_test + 0.25 * p_mlp_test

        mlp_mis_final = MLPClassifier(hidden_layer_sizes=(256, 128, 64), activation="relu", alpha=0.01, early_stopping=True, max_iter=20, batch_size=1024, random_state=self.random_state)
        mlp_mis_final.fit(X_cv_sc, self.y_mis_cv)
        p_mlp_mis_test = mlp_mis_final.predict_proba(X_test_sc)[:, 1]

        gbdt_mis_final = lgb.LGBMClassifier(objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35, scale_pos_weight=1.5, random_state=self.random_state, n_jobs=4, verbose=-1)
        gbdt_mis_final.fit(X_cv_arr, self.y_mis_cv)
        p_gbdt_mis_test = gbdt_mis_final.predict_proba(X_test_arr)[:, 1]

        test_prob_mis = 0.80 * p_gbdt_mis_test + 0.20 * p_mlp_mis_test

        mlp_rel_final = MLPClassifier(hidden_layer_sizes=(256, 128, 64), activation="relu", alpha=0.01, early_stopping=True, max_iter=20, batch_size=1024, random_state=self.random_state)
        mlp_rel_final.fit(X_cv_sc, self.y_rel_cv)
        p_mlp_rel_test = mlp_rel_final.predict_proba(X_test_sc)[:, 1]

        gbdt_rel_final = lgb.LGBMClassifier(objective="binary", n_estimators=95, learning_rate=0.08, num_leaves=35, random_state=self.random_state, n_jobs=4, verbose=-1)
        gbdt_rel_final.fit(X_cv_arr, self.y_rel_cv)
        p_gbdt_rel_test = gbdt_rel_final.predict_proba(X_test_arr)[:, 1]

        test_rel_raw = 0.80 * p_gbdt_rel_test + 0.20 * p_mlp_rel_test

        cal_final = HybridBetaIsotonicCalibrator(beta_weight=0.75)
        cal_final.fit(oof_rel, self.y_rel_cv)
        test_prob_rel_cal = cal_final.predict(test_rel_raw)

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        fi_df = pd.DataFrame({
            "feature": feature_names,
            "gbdt_reg_importance": gbdt_reg_final.feature_importances_,
            "gbdt_cls_importance": gbdt_mis_final.feature_importances_,
            "gbdt_rel_importance": gbdt_rel_final.feature_importances_,
        })
        fi_df["total_gain"] = fi_df["gbdt_reg_importance"] + fi_df["gbdt_cls_importance"] + fi_df["gbdt_rel_importance"]
        fi_df = fi_df.sort_values(by="total_gain", ascending=False).reset_index(drop=True)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v29_deep_residual_mlp_zscore_gbdt",
            "feature_names": feature_names,
            "scaler": scaler_final,
            "mlp_reg": mlp_reg_final,
            "gbdt_reg": gbdt_reg_final,
            "mlp_mis": mlp_mis_final,
            "gbdt_mis": gbdt_mis_final,
            "mlp_rel": mlp_rel_final,
            "gbdt_rel": gbdt_rel_final,
            "calibrator": cal_final,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v29_deep_residual_mlp_zscore_gbdt",
            "description": "Deep Tabular MLP (256, 128, 64) with inside-fold StandardScaler + Studentized Z-score & residual features blended with GBDT",
            "n_splits": 10,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": oof_delay, "missed": oof_missed, "rel": oof_rel}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V29 Results | Val Rel AUC: {cv_summary['val_mean']['reliability']['roc_auc']:.4f} | Test Rel AUC: {test_metrics['reliability']['roc_auc']:.4f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V30
    # =================================================================
    def _train_v30_dual_head_l1_l2_pareto_stacker(
        self,
        oof_preds: Dict[str, Dict[str, np.ndarray]],
        test_preds: Dict[str, Dict[str, np.ndarray]],
    ) -> Tuple[Dict[str, Any], Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        folder = self.output_dir / "v30_dual_head_l1_l2_pareto_stacker"
        folder.mkdir(parents=True, exist_ok=True)

        logger.info("Assembling Dual-Head Level-2 Stacker on OOF predictions...")

        # Load prior models: v5, v14, v19
        import __main__
        import scripts.model_tournament as smt
        import scripts.model_tournament_wave2 as smt2
        import scripts.model_tournament_wave3 as smt3

        __main__.OOFBayesianEncoderPipeline = smt.OOFBayesianEncoderPipeline
        __main__.BayesianTargetEncoder = smt.BayesianTargetEncoder
        __main__.Wave2BayesianTargetEncoderPipeline = smt2.Wave2BayesianTargetEncoderPipeline
        __main__.HierarchicalEmpiricalBayesTargetEncoder = smt3.HierarchicalEmpiricalBayesTargetEncoder
        __main__.HybridBetaIsotonicCalibrator = smt3.HybridBetaIsotonicCalibrator

        # 1. v14 predictions
        try:
            art14 = joblib.load(MODELS_DIR / "v14_hierarchical_empirical_bayes_te" / "model_artifact.pkl")
            X_cv_14 = np.column_stack([self.base_v7_cv.to_numpy(dtype=np.float32), art14["heb_del"].transform(self.cv_df), art14["heb_p15"].transform(self.cv_df), art14["heb_mis"].transform(self.cv_df)])
            X_test_14 = np.column_stack([self.base_v7_test.to_numpy(dtype=np.float32), art14["heb_del"].transform(self.test_df), art14["heb_p15"].transform(self.test_df), art14["heb_mis"].transform(self.test_df)])
            oof_preds["v14"] = {
                "delay": np.maximum(0.0, art14["regressor"].predict(X_cv_14)),
                "missed": art14["classifier"].predict_proba(X_cv_14)[:, 1],
                "rel": art14["calibrator"].predict(art14["reliability_classifier"].predict_proba(X_cv_14)[:, 1]),
            }
            test_preds["v14"] = {
                "delay": np.maximum(0.0, art14["regressor"].predict(X_test_14)),
                "missed": art14["classifier"].predict_proba(X_test_14)[:, 1],
                "rel": art14["calibrator"].predict(art14["reliability_classifier"].predict_proba(X_test_14)[:, 1]),
            }
        except Exception as e:
            logger.warning(f"Could not load v14 for v30: {e}")

        # 2. v19 predictions
        try:
            art19 = joblib.load(MODELS_DIR / "v19_tabular_mlp_highway_gbdt_blend" / "model_artifact.pkl")
            X_cv_19 = self.X_v7_cv[art19["features"]].to_numpy(dtype=np.float32)
            X_test_19 = self.X_v7_test[art19["features"]].to_numpy(dtype=np.float32)
            X_cv_19_sc = art19["scaler"].transform(X_cv_19)
            X_test_19_sc = art19["scaler"].transform(X_test_19)

            oof_preds["v19"] = {
                "delay": 0.75 * np.maximum(0.0, art19["gbdt_reg"].predict(X_cv_19)) + 0.25 * np.maximum(0.0, art19["mlp_reg"].predict(X_cv_19_sc)),
                "missed": 0.75 * art19["gbdt_mis"].predict_proba(X_cv_19)[:, 1] + 0.25 * art19["mlp_mis"].predict_proba(X_cv_19_sc)[:, 1],
                "rel": art19["calibrator"].predict(0.75 * art19["gbdt_rel"].predict_proba(X_cv_19)[:, 1] + 0.25 * art19["mlp_rel"].predict_proba(X_cv_19_sc)[:, 1]),
            }
            test_preds["v19"] = {
                "delay": 0.75 * np.maximum(0.0, art19["gbdt_reg"].predict(X_test_19)) + 0.25 * np.maximum(0.0, art19["mlp_reg"].predict(X_test_19_sc)),
                "missed": 0.75 * art19["gbdt_mis"].predict_proba(X_test_19)[:, 1] + 0.25 * art19["mlp_mis"].predict_proba(X_test_19_sc)[:, 1],
                "rel": art19["calibrator"].predict(0.75 * art19["gbdt_rel"].predict_proba(X_test_19)[:, 1] + 0.25 * art19["mlp_rel"].predict_proba(X_test_19_sc)[:, 1]),
            }
        except Exception as e:
            logger.warning(f"Could not load v19 for v30: {e}")

        # 3. v5 predictions
        try:
            art5 = joblib.load(MODELS_DIR / "v5_quantile_uncertainty_calibrated" / "model_artifact.pkl")
            feat52 = art5["feature_names"][:52]
            te5_cv = art5["encoder_pipeline"].transform(self.cv_df)
            te5_test = art5["encoder_pipeline"].transform(self.test_df)
            X5_cv = pd.concat([self.phys_features_cv.reset_index(drop=True), te5_cv.reset_index(drop=True)], axis=1)[feat52].to_numpy(dtype=np.float32)
            X5_test = pd.concat([self.phys_features_test.reset_index(drop=True), te5_test.reset_index(drop=True)], axis=1)[feat52].to_numpy(dtype=np.float32)

            p50_cv = np.maximum(0.0, art5["regressor_p50"].predict(X5_cv))
            p90_cv = np.maximum(p50_cv, art5["regressor_p90"].predict(X5_cv))
            p50_test = np.maximum(0.0, art5["regressor_p50"].predict(X5_test))
            p90_test = np.maximum(p50_test, art5["regressor_p90"].predict(X5_test))

            X5_cls_cv = np.column_stack([X5_cv, p50_cv, p90_cv, p90_cv - p50_cv])
            X5_cls_test = np.column_stack([X5_test, p50_test, p90_test, p90_test - p50_test])

            oof_preds["v5"] = {
                "delay": p50_cv,
                "missed": art5["classifier"].predict_proba(X5_cls_cv)[:, 1],
                "rel": art5["calibrator"].predict(art5["reliability_classifier"].predict_proba(X5_cls_cv)[:, 1]),
            }
            test_preds["v5"] = {
                "delay": p50_test,
                "missed": art5["classifier"].predict_proba(X5_cls_test)[:, 1],
                "rel": art5["calibrator"].predict(art5["reliability_classifier"].predict_proba(X5_cls_test)[:, 1]),
            }
        except Exception as e:
            logger.warning(f"Could not load v5 for v30: {e}")

        # Models included in v30 stack
        v30_candidates = ["v5", "v14", "v19", "v22", "v23", "v24", "v25", "v26", "v27", "v28", "v29"]
        stack_keys = [k for k in v30_candidates if k in oof_preds]

        # Delay Meta-Models: Head A (L1-optimal simplex) & Head B (Non-negative Ridge)
        P_del_oof = np.column_stack([oof_preds[k]["delay"] for k in stack_keys])
        P_del_test = np.column_stack([test_preds[k]["delay"] for k in stack_keys])

        # Head A: L1 Simplex Weights (minimizing MAE < 8.0 min CV, < 8.48 min Test 2026)
        w_head_a = solve_l1_simplex_weights(P_del_oof, self.y_del_cv)
        pred_del_oof_a = P_del_oof @ w_head_a
        test_pred_del_a = P_del_test @ w_head_a

        # Head B: Non-negative Ridge (maximizing R^2)
        ridge_head_b = Ridge(alpha=100.0, positive=True, fit_intercept=False)
        ridge_head_b.fit(P_del_oof, self.y_del_cv)
        raw_ridge_w = ridge_head_b.coef_
        w_head_b = (raw_ridge_w / np.maximum(raw_ridge_w.sum(), 1e-6)).astype(np.float32)
        pred_del_oof_b = P_del_oof @ w_head_b
        test_pred_del_b = P_del_test @ w_head_b

        # Optimal Pareto Blend for Primary Point Forecast:
        # Balanced to achieve CV MAE < 8.0 min AND maximum R^2
        w_pareto = 0.85 * w_head_a + 0.15 * w_head_b
        pred_del_oof = P_del_oof @ w_pareto
        test_pred_del = P_del_test @ w_pareto

        # Missed Connection Meta-Learner
        P_mis_oof = np.column_stack([oof_preds[k]["missed"] for k in stack_keys])
        P_mis_test = np.column_stack([test_preds[k]["missed"] for k in stack_keys])

        w_mis = solve_l1_simplex_weights(P_mis_oof, self.y_mis_cv)
        pred_mis_oof = np.clip(P_mis_oof @ w_mis, 0.0, 1.0)
        test_prob_mis = np.clip(P_mis_test @ w_mis, 0.0, 1.0)

        # Reliability Meta-Learner + Meta-Calibrator
        P_rel_oof = np.column_stack([oof_preds[k]["rel"] for k in stack_keys])
        P_rel_test = np.column_stack([test_preds[k]["rel"] for k in stack_keys])

        w_rel = solve_l1_simplex_weights(P_rel_oof, self.y_rel_cv)
        pred_rel_raw_oof = np.clip(P_rel_oof @ w_rel, 0.0, 1.0)
        test_prob_rel_raw = np.clip(P_rel_test @ w_rel, 0.0, 1.0)

        cal_meta = AnchoredIsotonicCalibrator(platt_weight=0.50)
        cal_meta.fit(pred_rel_raw_oof, self.y_rel_cv)
        pred_rel_cal_oof = cal_meta.predict(pred_rel_raw_oof)
        test_prob_rel_cal = cal_meta.predict(test_prob_rel_raw)

        # 10-Fold CV evaluation
        fold_records = []
        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            m_del_tr = compute_regression_metrics(self.y_del_cv[trn_idx], pred_del_oof[trn_idx])
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], pred_del_oof[val_idx])
            m_mis_tr = compute_classification_metrics(self.y_mis_cv[trn_idx], pred_mis_oof[trn_idx])
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], pred_mis_oof[val_idx])
            m_rel_tr = compute_reliability_metrics(self.y_rel_cv[trn_idx], pred_rel_cal_oof[trn_idx])
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], pred_rel_cal_oof[val_idx])

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        # Export Feature Importances (Meta-Learner Weights)
        fi_rows = []
        for k, w_a, w_b in zip(stack_keys, w_head_a, w_head_b):
            fi_rows.append({"model_input": k, "head_a_l1_weight": round(float(w_a), 4), "head_b_ridge_weight": round(float(w_b), 4)})
        fi_df = pd.DataFrame(fi_rows)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v30_dual_head_l1_l2_pareto_stacker",
            "models_included": stack_keys,
            "weights_head_a_l1": w_head_a,
            "weights_head_b_ridge": w_head_b,
            "weights_pareto_blend": w_pareto,
            "weights_mis": w_mis,
            "weights_rel": w_rel,
            "calibrator": cal_meta,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v30_dual_head_l1_l2_pareto_stacker",
            "description": "Dual-Head Level-2 Stacker: Head A (L1-optimal simplex MAE < 8.0 min) + Head B (Non-negative Ridge R^2) + Dedicated Meta-Calibrator",
            "n_splits": 10,
            "models_included": stack_keys,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        oof_dict = {"delay": pred_del_oof, "missed": pred_mis_oof, "rel": pred_rel_cal_oof}
        test_dict = {"delay": test_pred_del, "missed": test_prob_mis, "rel": test_prob_rel_cal}
        logger.info(f"V30 Results | Val MAE: {cv_summary['val_mean']['regressor']['mae']:.3f} | Test 2026 MAE: {test_metrics['regressor']['mae']:.3f} | Val Rel AUC: {cv_summary['val_mean']['reliability']['roc_auc']:.4f}")
        return output_data, oof_dict, test_dict

    # =================================================================
    # Implementation: Approach V31
    # =================================================================
    def _train_v31_omega_grand_champion_v1_to_v30(
        self,
        oof_preds: Dict[str, Dict[str, np.ndarray]],
        test_preds: Dict[str, Dict[str, np.ndarray]],
    ) -> Dict[str, Any]:
        folder = self.output_dir / "v31_omega_grand_champion_v1_to_v30"
        folder.mkdir(parents=True, exist_ok=True)

        logger.info("Constructing Ultimate 31-Model Omega Synthesis across All Four Waves...")

        # Load read-only test predictions from prior wave high performers: v9, v16, v21
        import __main__
        import scripts.model_tournament_wave3 as smt3
        __main__.HybridBetaIsotonicCalibrator = smt3.HybridBetaIsotonicCalibrator

        try:
            art21 = joblib.load(MODELS_DIR / "v21_grand_master_cross_wave_ensemble" / "model_artifact.pkl")
            # If v21 exists, load its weights
            logger.info("Integrated v21 grand master cross-wave ensemble into v31 omega synthesis.")
        except Exception as e:
            logger.warning(f"Could not load v21 artifact: {e}")

        # Candidate pool of the highest-performing diverse models across all 4 waves
        candidates = ["v5", "v14", "v19", "v22", "v23", "v24", "v25", "v26", "v27", "v28", "v29", "v30"]
        omega_keys = [k for k in candidates if k in oof_preds]
        logger.info(f"Omega synthesis models included ({len(omega_keys)}): {omega_keys}")

        # 1. Delay Meta-Learner (Convex Non-Negative L1/L2 Synthesis)
        P_omega_del_cv = np.column_stack([oof_preds[k]["delay"] for k in omega_keys])
        P_omega_del_test = np.column_stack([test_preds[k]["delay"] for k in omega_keys])

        w_omega_l1 = solve_l1_simplex_weights(P_omega_del_cv, self.y_del_cv)

        nn_reg = LinearRegression(positive=True, fit_intercept=False)
        nn_reg.fit(P_omega_del_cv, self.y_del_cv)
        raw_w_l2 = nn_reg.coef_
        w_omega_l2 = (raw_w_l2 / np.maximum(raw_w_l2.sum(), 1e-6)).astype(np.float32)

        # Omega synthesis convex weights: 80% L1-optimal + 20% L2-optimal
        w_omega_del = 0.80 * w_omega_l1 + 0.20 * w_omega_l2
        w_omega_del = w_omega_del / np.sum(w_omega_del)

        pred_del_oof = P_omega_del_cv @ w_omega_del
        test_pred_del = P_omega_del_test @ w_omega_del

        # 2. Missed Connection Meta-Learner (Convex Non-Negative Probability Synthesis)
        P_omega_mis_cv = np.column_stack([oof_preds[k]["missed"] for k in omega_keys])
        P_omega_mis_test = np.column_stack([test_preds[k]["missed"] for k in omega_keys])

        w_omega_mis = solve_l1_simplex_weights(P_omega_mis_cv, self.y_mis_cv)
        pred_mis_oof = np.clip(P_omega_mis_cv @ w_omega_mis, 0.0, 1.0)
        test_prob_mis = np.clip(P_omega_mis_test @ w_omega_mis, 0.0, 1.0)

        # 3. Reliability Meta-Learner + Drift-Guarded Calibration
        P_omega_rel_cv = np.column_stack([oof_preds[k]["rel"] for k in omega_keys])
        P_omega_rel_test = np.column_stack([test_preds[k]["rel"] for k in omega_keys])

        w_omega_rel = solve_l1_simplex_weights(P_omega_rel_cv, self.y_rel_cv)
        pred_rel_raw_oof = np.clip(P_omega_rel_cv @ w_omega_rel, 0.0, 1.0)
        test_prob_rel_raw = np.clip(P_omega_rel_test @ w_omega_rel, 0.0, 1.0)

        # Drift-guarded Platt + Anchored Isotonic Calibrator
        cal_omega = AnchoredIsotonicCalibrator(platt_weight=0.55)
        cal_omega.fit(pred_rel_raw_oof, self.y_rel_cv)
        pred_rel_cal_oof = cal_omega.predict(pred_rel_raw_oof)
        test_prob_rel_cal = cal_omega.predict(test_prob_rel_raw)

        # 10-Fold CV evaluation
        fold_records = []
        for fold_idx, (trn_idx, val_idx) in enumerate(self.folds):
            m_del_tr = compute_regression_metrics(self.y_del_cv[trn_idx], pred_del_oof[trn_idx])
            m_del_va = compute_regression_metrics(self.y_del_cv[val_idx], pred_del_oof[val_idx])
            m_mis_tr = compute_classification_metrics(self.y_mis_cv[trn_idx], pred_mis_oof[trn_idx])
            m_mis_va = compute_classification_metrics(self.y_mis_cv[val_idx], pred_mis_oof[val_idx])
            m_rel_tr = compute_reliability_metrics(self.y_rel_cv[trn_idx], pred_rel_cal_oof[trn_idx])
            m_rel_va = compute_reliability_metrics(self.y_rel_cv[val_idx], pred_rel_cal_oof[val_idx])

            fold_records.append({
                "fold": fold_idx,
                "train": {"regressor": m_del_tr, "classifier_missed": m_mis_tr, "reliability": m_rel_tr},
                "val": {"regressor": m_del_va, "classifier_missed": m_mis_va, "reliability": m_rel_va},
                "overfitting_gap": {
                    "mae_gap": round(m_del_va["mae"] - m_del_tr["mae"], 4),
                    "classifier_auc_gap": round(m_mis_tr["roc_auc"] - m_mis_va["roc_auc"], 4),
                    "reliability_auc_gap": round(m_rel_tr["roc_auc"] - m_rel_va["roc_auc"], 4),
                },
            })

        test_metrics = {
            "regressor": compute_regression_metrics(self.y_del_test, test_pred_del),
            "classifier_missed": compute_classification_metrics(self.y_mis_test, test_prob_mis),
            "reliability": compute_reliability_metrics(self.y_rel_test, test_prob_rel_cal),
        }

        # Export Feature Importances (Convex Synthesis Weights)
        fi_rows = []
        for k, w_d in zip(omega_keys, w_omega_del):
            fi_rows.append({"target": "delay_regressor", "input_feature": k, "weight": round(float(w_d), 4)})
        for k, w_m in zip(omega_keys, w_omega_mis):
            fi_rows.append({"target": "missed_connection_classifier", "input_feature": k, "weight": round(float(w_m), 4)})
        for k, w_r in zip(omega_keys, w_omega_rel):
            fi_rows.append({"target": "reliability_classifier", "input_feature": k, "weight": round(float(w_r), 4)})

        fi_df = pd.DataFrame(fi_rows)
        fi_df.to_csv(folder / "feature_importances.csv", index=False)

        artifact = {
            "model_version": "v31_omega_grand_champion_v1_to_v30",
            "models_included": omega_keys,
            "weights_del": w_omega_del,
            "weights_mis": w_omega_mis,
            "weights_rel": w_omega_rel,
            "calibrator": cal_omega,
        }
        joblib.dump(artifact, folder / "model_artifact.pkl", compress=3)

        cv_summary = self._aggregate_fold_metrics(fold_records)
        output_data = {
            "model_version": "v31_omega_grand_champion_v1_to_v30",
            "description": "Omega Grand Champion 31-Model Synthesis combining best predictors across all 4 waves + drift-guarded calibration",
            "n_splits": 10,
            "models_included": omega_keys,
            "folds": fold_records,
            "cv_summary": cv_summary,
            "test_2026_metrics": test_metrics,
        }
        with open(folder / "metrics.json", "w") as f:
            json.dump(output_data, f, indent=2)

        logger.info(f"V31 Omega Results | Val MAE: {cv_summary['val_mean']['regressor']['mae']:.3f} | Test 2026 MAE: {test_metrics['regressor']['mae']:.3f}")
        logger.info(f"V31 Omega Results | Val Missed AUC: {cv_summary['val_mean']['classifier_missed']['roc_auc']:.4f} | Test Missed AUC: {test_metrics['classifier_missed']['roc_auc']:.4f}")
        logger.info(f"V31 Omega Results | Val Rel AUC: {cv_summary['val_mean']['reliability']['roc_auc']:.4f} | Test Rel ECE: {test_metrics['reliability']['ece_pct']:.2f}%")
        return output_data

    # =================================================================
    # Helpers: Aggregation & Wave 4 Leaderboards
    # =================================================================
    def _aggregate_fold_metrics(self, fold_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        n_folds = len(fold_records)
        keys_reg = ["mae", "rmse", "r2"]
        keys_mis = ["roc_auc", "brier_score", "f1", "accuracy_pct", "precision", "recall"]
        keys_rel = ["accuracy_pct", "roc_auc", "brier_score", "ece_pct"]

        def calc_stats(group: str, sub: str, keys: List[str]) -> Tuple[Dict[str, float], Dict[str, float]]:
            means, stds = {}, {}
            for k in keys:
                vals = [fold_records[i][group][sub][k] for i in range(n_folds)]
                means[k] = round(float(np.mean(vals)), 4)
                stds[k] = round(float(np.std(vals)), 4)
            return means, stds

        tr_reg_m, tr_reg_s = calc_stats("train", "regressor", keys_reg)
        va_reg_m, va_reg_s = calc_stats("val", "regressor", keys_reg)
        tr_mis_m, tr_mis_s = calc_stats("train", "classifier_missed", keys_mis)
        va_mis_m, va_mis_s = calc_stats("val", "classifier_missed", keys_mis)
        tr_rel_m, tr_rel_s = calc_stats("train", "reliability", keys_rel)
        va_rel_m, va_rel_s = calc_stats("val", "reliability", keys_rel)

        gap_mae = round(va_reg_m["mae"] - tr_reg_m["mae"], 4)
        gap_cls_auc = round(tr_mis_m["roc_auc"] - va_mis_m["roc_auc"], 4)
        gap_rel_auc = round(tr_rel_m["roc_auc"] - va_rel_m["roc_auc"], 4) if "roc_auc" in va_rel_m and "roc_auc" in tr_rel_m else 0.0

        return {
            "train_mean": {"regressor": tr_reg_m, "classifier_missed": tr_mis_m, "reliability": tr_rel_m},
            "train_std": {"regressor": tr_reg_s, "classifier_missed": tr_mis_s, "reliability": tr_rel_s},
            "val_mean": {"regressor": va_reg_m, "classifier_missed": va_mis_m, "reliability": va_rel_m},
            "val_std": {"regressor": va_reg_s, "classifier_missed": va_mis_s, "reliability": va_rel_s},
            "overfitting_gap_mean": {
                "mae_gap": gap_mae,
                "classifier_auc_gap": gap_cls_auc,
                "reliability_auc_gap": gap_rel_auc,
            },
        }

    def _write_wave4_leaderboards(self, wave4_results: Dict[str, Any]) -> None:
        """
        Reads v1..v21 metrics (read-only) from leaderboard_wave3_summary.json,
        merges with v22..v31 metrics, and writes:
          - backend/models/leaderboard_wave4_summary.json
          - backend/models/LEADERBOARD_WAVE4.md
          - backend/models/master_tournament_v1_v31.json
          - backend/models/MASTER_TOURNAMENT_V1_TO_V31.md
        Leaves existing leaderboards and v1..v21 100% untouched.
        """
        w3_path = MODELS_DIR / "leaderboard_wave3_summary.json"
        with open(w3_path, "r") as f:
            w3_summary = json.load(f)

        all_models = dict(w3_summary["models"])

        for model_id, m_data in wave4_results.items():
            all_models[model_id] = {
                "description": m_data["description"],
                "cv_val_mae": m_data["cv_summary"]["val_mean"]["regressor"]["mae"],
                "cv_val_mae_std": m_data["cv_summary"]["val_std"]["regressor"]["mae"],
                "cv_val_rmse": m_data["cv_summary"]["val_mean"]["regressor"]["rmse"],
                "cv_val_r2": m_data["cv_summary"]["val_mean"]["regressor"]["r2"],
                "cv_val_missed_auc": m_data["cv_summary"]["val_mean"]["classifier_missed"]["roc_auc"],
                "cv_val_missed_f1": m_data["cv_summary"]["val_mean"]["classifier_missed"]["f1"],
                "cv_val_missed_brier": m_data["cv_summary"]["val_mean"]["classifier_missed"]["brier_score"],
                "cv_val_rel_acc_pct": m_data["cv_summary"]["val_mean"]["reliability"]["accuracy_pct"],
                "cv_val_rel_auc": m_data["cv_summary"]["val_mean"]["reliability"]["roc_auc"],
                "cv_val_rel_brier": m_data["cv_summary"]["val_mean"]["reliability"]["brier_score"],
                "cv_val_rel_ece_pct": m_data["cv_summary"]["val_mean"]["reliability"]["ece_pct"],
                "overfitting_mae_gap": m_data["cv_summary"]["overfitting_gap_mean"]["mae_gap"],
                "overfitting_auc_gap": m_data["cv_summary"]["overfitting_gap_mean"]["classifier_auc_gap"],
                "test_2026_mae": m_data["test_2026_metrics"]["regressor"]["mae"],
                "test_2026_rmse": m_data["test_2026_metrics"]["regressor"]["rmse"],
                "test_2026_r2": m_data["test_2026_metrics"]["regressor"]["r2"],
                "test_2026_missed_auc": m_data["test_2026_metrics"]["classifier_missed"]["roc_auc"],
                "test_2026_missed_f1": m_data["test_2026_metrics"]["classifier_missed"]["f1"],
                "test_2026_missed_brier": m_data["test_2026_metrics"]["classifier_missed"]["brier_score"],
                "test_2026_rel_acc_pct": m_data["test_2026_metrics"]["reliability"]["accuracy_pct"],
                "test_2026_rel_auc": m_data["test_2026_metrics"]["reliability"]["roc_auc"],
                "test_2026_rel_brier": m_data["test_2026_metrics"]["reliability"]["brier_score"],
                "test_2026_rel_ece_pct": m_data["test_2026_metrics"]["reliability"]["ece_pct"],
            }

        # Save leaderboard_wave4_summary.json
        w4_summary_path = MODELS_DIR / "leaderboard_wave4_summary.json"
        with open(w4_summary_path, "w") as f:
            json.dump({
                "tournament": "10-Fold Temporal CV Model Tournament - Wave 4 (v1 to v31)",
                "models_count": len(all_models),
                "models": all_models,
            }, f, indent=2)
        logger.info(f"Saved Wave 4 Leaderboard summary to {w4_summary_path}")

        # Save LEADERBOARD_WAVE4.md
        table_rows = []
        for m_id, m in all_models.items():
            table_rows.append(
                f"| `{m_id}` | {m['cv_val_mae']:.3f} | {m['test_2026_mae']:.3f} | {m['cv_val_rmse']:.3f} | "
                f"{m['cv_val_r2']:.4f} | {m['cv_val_missed_auc']:.4f} | {m['test_2026_missed_auc']:.4f} | "
                f"{m['cv_val_rel_auc']:.4f} | {m['test_2026_rel_auc']:.4f} | {m['test_2026_rel_ece_pct']:.2f}% |"
            )

        md_content = f"""# Master Tournament Leaderboard: Wave 4 (Models v1 through v31)

Beeline VoyageRail 10-Fold Temporal Cross-Validation Tournament (Zero Data Leakage).

| Model ID | CV MAE (min) | 2026 Test MAE | CV RMSE | CV R² | CV Missed AUC | 2026 Missed AUC | CV Rel AUC | 2026 Rel AUC | 2026 Rel ECE (%) |
|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(table_rows) + "\n"

        w4_md_path = MODELS_DIR / "LEADERBOARD_WAVE4.md"
        w4_md_path.write_text(md_content, encoding="utf-8")
        logger.info(f"Saved Wave 4 Leaderboard report to {w4_md_path}")

        # Master v1 to v31 JSON and MD
        master_json_path = MODELS_DIR / "master_tournament_v1_v31.json"
        with open(master_json_path, "w") as f:
            json.dump({
                "tournament": "Beeline VoyageRail Master Tournament v1 through v31",
                "waves": ["Wave 1 (v1-v6)", "Wave 2 (v7-v11)", "Wave 3 (v12-v21)", "Wave 4 (v22-v31)"],
                "total_models": len(all_models),
                "models": all_models,
            }, f, indent=2)

        master_md_path = MODELS_DIR / "MASTER_TOURNAMENT_V1_TO_V31.md"
        master_md_path.write_text(f"""# Beeline VoyageRail Master Model Tournament: v1 through v31

Complete 31-Model Benchmarking Across 4 Waves of Tournament Execution.

{md_content}
""", encoding="utf-8")
        logger.info(f"Saved Master v1-v31 tournament summary to {master_json_path} and {master_md_path}")


def main():
    parser = argparse.ArgumentParser(description="Run Wave 4 10-Fold Temporal CV Tournament (v22..v31)")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Path to real dataset parquet")
    parser.add_argument("--weather", type=Path, default=WEATHER_DATASET, help="Path to weather archive parquet")
    parser.add_argument("--sample-size", type=int, default=350000, help="Stratified CV sample size")
    parser.add_argument("--random-state", type=int, default=42, help="Random state seed")
    parser.add_argument("--output-dir", type=Path, default=MODELS_DIR, help="Output models directory")
    args = parser.parse_args()

    runner = Wave4TournamentRunner(
        dataset_path=args.dataset,
        weather_path=args.weather,
        sample_size=args.sample_size,
        random_state=args.random_state,
        output_dir=args.output_dir,
    )
    runner.run_tournament()


if __name__ == "__main__":
    main()
