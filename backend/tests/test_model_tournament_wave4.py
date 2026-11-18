"""
Unit tests for Wave 4 Model Tournament components:
- 4-Level Hierarchical Empirical Bayes Target Encoding
- Cyclical Multi-Harmonic Fourier Features
- Origin Delay Residual Propagation & Timetable Slack Network
- Dense 11-Quantile Monotonicity & Studentized Z-Scores
- Drift-Resistant Anchored Isotonic Calibration
"""

import numpy as np
import pandas as pd
import pytest

from scripts.model_tournament_wave4 import (
    FourLevelHEBTargetEncoder,
    compute_fourier_harmonics,
    engineer_slack_propagation_features,
    compute_studentized_zscores,
    AnchoredIsotonicCalibrator,
    solve_l1_simplex_weights,
)


def test_four_level_heb_target_encoder_shrinkage():
    """Validates 4-level Hierarchical Empirical Bayes target shrinkage:
    (train, season) -> train -> (corridor, season) -> global_mean."""
    df = pd.DataFrame({
        "train_number": ["IR 100", "IR 100", "IR 100", "IC 200", "IR 300"],
        "season": [0, 0, 1, 0, 2],
        "corridor_slug": ["c1", "c1", "c1", "c2", "c3"],
    })
    y = pd.Series([10.0, 20.0, 30.0, 100.0, 40.0])  # global mean = 40.0

    encoder = FourLevelHEBTargetEncoder(m0=60.0, m1=50.0, m2=30.0)
    encoder.fit(df, y)
    preds = encoder.transform(df)

    assert len(preds) == 5
    assert not np.isnan(preds).any()

    # Unseen train on known corridor/season falls back to Level 1
    unseen_df = pd.DataFrame({
        "train_number": ["NEW_TRAIN", "ANOTHER_NEW"],
        "season": [0, 99],
        "corridor_slug": ["c1", "unknown_corridor"],
    })
    unseen_preds = encoder.transform(unseen_df)
    assert len(unseen_preds) == 2
    assert not np.isnan(unseen_preds).any()
    # Fully unknown corridor falls back to global mean
    assert np.isclose(unseen_preds[1], 40.0)


def test_compute_fourier_harmonics_shapes_and_bounds():
    """Validates order k=1, 2, 3 Fourier cyclical harmonics for hour, dow, and doy."""
    df = pd.DataFrame({
        "service_date": ["2024-01-15", "2024-06-21", "2024-12-31"],
        "departure_hour": [8, 14, 23],
        "day_of_week": [0, 4, 1],
    })
    fourier_df = compute_fourier_harmonics(df)
    # 3 variables * 2 (sin, cos) * 3 orders (k=1,2,3) = 18 features
    assert fourier_df.shape == (3, 18)
    assert not fourier_df.isna().any().any()
    assert (fourier_df >= -1.0 - 1e-6).all().all()
    assert (fourier_df <= 1.0 + 1e-6).all().all()


def test_engineer_slack_propagation_features():
    """Validates timetable slack and propagation formulas."""
    df = pd.DataFrame({
        "distance_km": [180.0, 90.0],
        "scheduled_duration_minutes": [150.0, 60.0],
        "delay_at_origin_minutes": [20, 0],
    })
    slack_df = engineer_slack_propagation_features(df)

    # Row 0: min_theoretical = (180 / 90) * 60 = 120.0 min
    # schedule_slack = 150 - 120 = 30.0 min
    # net_unabsorbed = max(0, 20 - 0.35 * 30) = 20 - 10.5 = 9.5 min
    assert np.isclose(slack_df.loc[0, "min_theoretical_duration"], 120.0)
    assert np.isclose(slack_df.loc[0, "schedule_slack_minutes"], 30.0)
    assert np.isclose(slack_df.loc[0, "net_unabsorbed_origin_delay"], 9.5)

    # Row 1: min_theoretical = 60.0 min, slack = 0, delay = 0 -> net_unabsorbed = 0
    assert np.isclose(slack_df.loc[1, "schedule_slack_minutes"], 0.0)
    assert np.isclose(slack_df.loc[1, "net_unabsorbed_origin_delay"], 0.0)


def test_compute_studentized_zscores():
    """Validates calculation of Studentized Threshold Z-scores from monotonic quantiles."""
    # 11 quantiles: [0.05, 0.15, 0.25, 0.35, 0.45, 0.50, 0.55, 0.65, 0.75, 0.85, 0.95]
    # Indices: q25 is index 2, q50 is index 5, q75 is index 8
    quantiles = np.array([
        [0.0, 2.0, 5.0, 8.0, 9.0, 10.0, 12.0, 14.0, 17.0, 22.0, 30.0],  # q50=10, q25=5, q75=17 -> iqr=12
        [10.0, 12.0, 15.0, 18.0, 20.0, 20.0, 21.0, 23.0, 25.0, 30.0, 45.0], # q50=20, q25=15, q75=25 -> iqr=10
    ], dtype=np.float32)

    transfer_buffer = np.array([25.0, 999.0], dtype=np.float32)
    z15, z_trans = compute_studentized_zscores(quantiles, transfer_buffer)

    # Row 0: z15 = (15 - 10) / 12 = 5 / 12 ~= 0.4167
    # z_trans = (25 - 5 - 10) / 12 = 10 / 12 ~= 0.8333
    assert np.isclose(z15[0], 5.0 / 12.0)
    assert np.isclose(z_trans[0], 10.0 / 12.0)

    # Row 1: z15 = (15 - 20) / 10 = -0.5
    # z_trans = (999 - 5 - 20) / 10 = 97.4
    assert np.isclose(z15[1], -0.5)
    assert np.isclose(z_trans[1], 97.4)


def test_anchored_isotonic_calibrator_monotonicity():
    """Validates anchored isotonic calibrator with boundary anchors."""
    p_raw = np.array([0.05, 0.20, 0.45, 0.75, 0.90], dtype=np.float32)
    y_true = np.array([0, 0, 1, 1, 1], dtype=np.int32)

    cal = AnchoredIsotonicCalibrator()
    cal.fit(p_raw, y_true)
    cal_p = cal.predict(p_raw)

    assert len(cal_p) == len(p_raw)
    assert (cal_p >= 0.0).all() and (cal_p <= 1.0).all()
    # Preserves monotonicity
    assert (np.diff(cal_p) >= 0.0).all()


def test_solve_l1_simplex_weights():
    """Validates L1-optimal simplex weights solver."""
    np.random.seed(42)
    y = np.array([10.0, 20.0, 30.0, 40.0])
    # Model 1 has small error, Model 2 has large error
    p1 = y + np.array([0.5, -0.5, 0.2, -0.2])
    p2 = y + np.array([5.0, -4.0, 6.0, -5.0])
    P = np.column_stack([p1, p2])

    weights = solve_l1_simplex_weights(P, y)
    assert len(weights) == 2
    assert (weights >= 0.0).all()
    assert np.isclose(np.sum(weights), 1.0)
    # Model 1 should receive nearly all weight
    assert weights[0] > 0.85
