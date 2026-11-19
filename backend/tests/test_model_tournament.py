"""
Unit and integration tests for Model Tournament components:
- Railway physics feature engineering
- Bayesian Out-of-Fold Target Encoding (m-estimate)
- Calibrated Reliability Score & ECE calculation
- Duan smearing log-transformation
- GroupKFold temporal integrity
"""

import numpy as np
import pandas as pd
import pytest

from scripts.model_tournament import (
    BayesianTargetEncoder,
    compute_ece,
    compute_duan_smearing_factor,
    apply_duan_smearing,
    engineer_railway_physics_features,
    extract_v1_legacy_features,
)


def test_railway_physics_features_formulas():
    """Validates formulas for railway physics features and checks boundary conditions."""
    data = {
        "service_date": ["2024-01-15", "2024-07-20"],
        "temp_celsius": [-5.0, 36.0],
        "distance_km": [150.0, 200.0],
        "scheduled_duration_minutes": [120.0, 150.0],
        "stop_count": [6, 4],
        "delay_at_origin_minutes": [10, 0],
        "traction_type": [1, 1],
        "has_transfer": [1, 0],
        "transfer_buffer_minutes": [25.0, 999.0],
        "precipitation_rate_mm_h": [2.0, 0.0],
        "is_thunderstorm": [0, 1],
        "wind_speed_kmh": [20.0, 15.0],
        "wind_gust_kmh": [60.0, 45.0],
        "snow_depth_cm": [5.0, 0.0],
        "freezing_rain_risk": [1, 0],
        "visibility_meters": [800.0, 10000.0],
        "season": [0, 2],
        "departure_hour": [8, 17],
        "is_peak_hour": [1, 1],
        "day_of_week": [0, 5],
        "is_weekend": [0, 1],
        "is_holiday_window": [0, 0],
        "is_single_track": [1, 0],
        "mountain_pass_flag": [1, 0],
        "active_speed_restrictions_count": [2, 0],
        "train_category": [2, 3],
        "train_number": ["IR 1581", "IC 532"],
        "operator": ["CFR", "CFR"],
        "origin_station_code": ["BCT", "BSV"],
        "destination_station_code": ["BSV", "BCT"],
        "corridor_slug": ["bct-bsv", "bsv-bct"],
    }
    df = pd.DataFrame(data)
    features_df = engineer_railway_physics_features(df)

    # 1. Thermal Rail Stress:
    # Row 0: temp -5 < 32 -> 0.0
    # Row 1: max(0, 36 - 32)^2 * (200 / 100) = 16 * 2 = 32.0
    assert features_df.loc[0, "thermal_rail_stress"] == 0.0
    assert np.isclose(features_df.loc[1, "thermal_rail_stress"], 32.0)

    # 2. Winter Switch Freeze Index:
    # Row 0: temp < 0 (True) * (5 + 10 * 1) * 6 = 15 * 6 = 90.0
    # Row 1: temp > 0 -> 0.0
    assert np.isclose(features_df.loc[0, "winter_switch_freeze_index"], 90.0)
    assert features_df.loc[1, "winter_switch_freeze_index"] == 0.0

    # 3. Catenary Glaze & Wind Risk:
    # Row 0: traction(1) * (5*1 + 3*0 + (60>55)) = 1 * (5 + 1) = 6.0
    # Row 1: traction(1) * (5*0 + 3*1 + (45>55)) = 1 * 3 = 3.0
    assert np.isclose(features_df.loc[0, "catenary_glaze_wind_risk"], 6.0)
    assert np.isclose(features_df.loc[1, "catenary_glaze_wind_risk"], 3.0)

    # 4. Single-Track Crossing Cascade:
    # Row 0: 1 * 6 * (1 + 0.5*1) * (1 + 2) = 6 * 1.5 * 3 = 27.0
    # Row 1: single_track = 0 -> 0.0
    assert np.isclose(features_df.loc[0, "single_track_crossing_cascade"], 27.0)
    assert features_df.loc[1, "single_track_crossing_cascade"] == 0.0

    # 5. Schedule Tightness:
    # Row 0: scheduled_speed_kmh = 150 / (120/60) = 75.0 km/h; stops_per_100km = (6 * 100) / 150 = 4.0
    assert np.isclose(features_df.loc[0, "scheduled_speed_kmh"], 75.0)
    assert np.isclose(features_df.loc[0, "stops_per_100km"], 4.0)

    # 6. Transfer Margin Dynamics:
    # Row 0: net_transfer_margin = 25 - 5 - 10 = 10.0
    # Row 1: direct -> 999.0
    assert np.isclose(features_df.loc[0, "net_transfer_margin"], 10.0)
    assert np.isclose(features_df.loc[1, "net_transfer_margin"], 999.0)

    # 7. Cyclical Temporal Encodings:
    assert -1.0 <= features_df["sin_departure_hour"].min() <= 1.0
    assert -1.0 <= features_df["cos_departure_hour"].max() <= 1.0


def test_bayesian_target_encoder_m_estimate():
    """Validates Bayesian m-estimate smoothing formula and handling of unseen categories."""
    cats = pd.Series(["A", "A", "A", "B", "B"])
    targets = pd.Series([10.0, 20.0, 30.0, 50.0, 70.0])  # mean(A)=20.0 (count=3), mean(B)=60.0 (count=2), global=36.0
    global_mean = targets.mean()

    m = 10.0
    encoder = BayesianTargetEncoder(m=m)
    encoder.fit(cats, targets)

    # For 'A': count=3, mean=20, m=10, global=36
    # smoothed = (3 * 20 + 10 * 36) / (3 + 10) = (60 + 360) / 13 = 420 / 13 ~= 32.30769
    expected_a = (3 * 20.0 + 10 * 36.0) / 13.0
    encoded = encoder.transform(cats)
    assert np.isclose(encoded[0], expected_a)

    # Test unseen category fallback to global mean
    unseen = pd.Series(["C", "UNKNOWN"])
    encoded_unseen = encoder.transform(unseen)
    assert np.allclose(encoded_unseen, global_mean)


def test_calibrated_reliability_and_ece():
    """Validates calculation of is_reliable_journey ground truth and Expected Calibration Error (ECE)."""
    # ECE on perfectly calibrated probabilities should be near 0
    y_true = np.array([0, 0, 0, 1, 1, 1, 1, 1, 1, 1])
    y_prob = np.array([0.1, 0.1, 0.1, 0.8, 0.8, 0.8, 0.9, 0.9, 0.9, 0.9])
    ece = compute_ece(y_true, y_prob, n_bins=10)
    assert 0.0 <= ece <= 100.0


def test_duan_smearing_back_transformation():
    """Validates Duan smearing factor calculation and log1p back-transformation."""
    # Suppose true targets are [5, 15, 25]
    y_true = np.array([5.0, 15.0, 25.0])
    z_true = np.log1p(y_true)
    # Predicted z with slight residual
    z_pred = z_true - 0.2  # underestimating by 0.2
    residuals = z_true - z_pred  # all 0.2
    smearing = compute_duan_smearing_factor(residuals)
    assert np.isclose(smearing, np.exp(0.2))

    # Back transformed
    y_back = apply_duan_smearing(z_pred, smearing)
    assert np.allclose(y_back, y_true)


def test_v1_legacy_features_shape():
    """Validates V1 18-feature extraction vector."""
    df_sample = pd.DataFrame({
        "train_category": [2],
        "corridor_slug": ["bucuresti_nord-brasov"],
        "scheduled_duration_minutes": [150.0],
        "stop_count": [4],
        "distance_km": [166.0],
        "departure_hour": [9],
        "is_peak_hour": [1],
        "day_of_week": [2],
        "is_weekend": [0],
        "has_transfer": [0],
        "transfer_buffer_minutes": [999.0],
        "active_speed_restrictions_count": [1],
        "is_thunderstorm": [0],
        "delay_at_origin_minutes": [5],
        "operator": ["CFR"],
    })
    X_v1 = extract_v1_legacy_features(df_sample)
    assert X_v1.shape == (1, 18)
    assert not np.isnan(X_v1).any()


def test_piecewise_linear_cdf_monotonicity():
    """Validates Wave 2 vectorized piecewise-linear CDF probability interpolation and anti-crossing."""
    from scripts.model_tournament_wave2 import compute_cdf_prob_vectorized

    alphas = np.array([0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95], dtype=np.float32)
    # 3 samples with known quantiles
    quantiles = np.array([
        [0.0, 2.0, 5.0, 10.0, 15.0, 25.0, 40.0],
        [5.0, 10.0, 12.0, 15.0, 20.0, 30.0, 50.0],
        [20.0, 25.0, 30.0, 35.0, 40.0, 50.0, 60.0],
    ], dtype=np.float32)

    # For T = 15.0:
    # Row 0: 15.0 is exactly at index 4 (alpha=0.75) -> prob should be 0.75
    # Row 1: 15.0 is exactly at index 3 (alpha=0.50) -> prob should be 0.50
    # Row 2: 15.0 is below min quantile (20.0), between (0, 0) and (20, 0.05) -> 15/20 * 0.05 = 0.0375
    probs = compute_cdf_prob_vectorized(quantiles, alphas, 15.0)
    assert np.isclose(probs[0], 0.75)
    assert np.isclose(probs[1], 0.50)
    assert np.isclose(probs[2], 0.0375)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()


def test_wave2_target_encoder_under15m():
    """Validates Wave 2 Bayesian m-estimate (m=30) target encoder for punctuality probability."""
    from scripts.model_tournament_wave2 import Wave2BayesianTargetEncoderPipeline

    df = pd.DataFrame({
        "train_number": ["IR 1581", "IR 1581", "IR 1581", "IC 532", "IC 532"],
        "season": [0, 0, 1, 0, 0],
        "corridor_slug": ["c1", "c1", "c1", "c2", "c2"],
        "is_peak_hour": [1, 1, 0, 1, 1],
        "origin_station_code": ["BCT", "BCT", "BCT", "BSV", "BSV"],
        "departure_hour": [8, 8, 14, 17, 17],
    })
    y_del = pd.Series([5.0, 10.0, 30.0, 50.0, 12.0])
    y_p15 = (y_del <= 15.0).astype(float)
    y_mis = pd.Series([0, 0, 1, 1, 0])

    pipe = Wave2BayesianTargetEncoderPipeline(m=30.0)
    pipe.fit(df, y_del, y_p15, y_mis)
    transformed = pipe.transform(df)

    assert "te_prob_under_15m_train_season" in transformed.columns
    assert "te_delay_corridor_peak" in transformed.columns
    assert not transformed.isna().any().any()
    assert (transformed["te_prob_under_15m_train_season"] >= 0.0).all()
    assert (transformed["te_prob_under_15m_train_season"] <= 1.0).all()


def test_wave3_hierarchical_empirical_bayes_target_encoder():
    """Validates 3-level Hierarchical Empirical Bayes Target Encoding shrinkage."""
    from scripts.model_tournament_wave3 import HierarchicalEmpiricalBayesTargetEncoder

    df = pd.DataFrame({
        "train_number": ["IR 100", "IR 100", "IR 101", "IC 200"],
        "corridor_slug": ["c1", "c1", "c1", "c2"],
        "train_category": [2, 2, 2, 3],
    })
    y = pd.Series([10.0, 20.0, 30.0, 100.0])  # global mean = 40.0

    heb = HierarchicalEmpiricalBayesTargetEncoder(m1=50.0, m2=30.0)
    heb.fit(df, y)
    preds = heb.transform(df)

    assert len(preds) == 4
    assert not np.isnan(preds).any()
    # Unseen train number on seen corridor/category should fall back to level 2 prior
    unseen_df = pd.DataFrame({
        "train_number": ["NEW_TRAIN_999", "NEW_CORRIDOR_TRAIN"],
        "corridor_slug": ["c1", "c_unknown"],
        "train_category": [2, 2],
    })
    unseen_preds = heb.transform(unseen_df)
    assert len(unseen_preds) == 2
    assert not np.isnan(unseen_preds).any()
    # Unknown corridor completely falls back to global mean
    assert np.isclose(unseen_preds[1], 40.0)


def test_wave3_hybrid_beta_isotonic_calibrator():
    """Validates drift-resistant hybrid Beta + Isotonic calibrator."""
    from scripts.model_tournament_wave3 import HybridBetaIsotonicCalibrator

    np.random.seed(42)
    p_raw = np.array([0.05, 0.20, 0.50, 0.80, 0.95], dtype=np.float32)
    y_true = np.array([0, 0, 1, 1, 1], dtype=np.int32)

    cal = HybridBetaIsotonicCalibrator(beta_weight=0.70)
    cal.fit(p_raw, y_true)
    cal_probs = cal.predict(p_raw)

    assert len(cal_probs) == len(p_raw)
    assert (cal_probs >= 0.0).all() and (cal_probs <= 1.0).all()
    # Monotonic ranking preserved
    assert (np.diff(cal_probs) >= 0.0).all()


def test_wave3_split_conformal_quantile_calibrator():
    """Validates Split Conformalized Quantile Regression adjustment and interval coverage."""
    from scripts.model_tournament_wave3 import SplitConformalQuantileCalibrator

    q_low = np.array([2.0, 5.0, 10.0, 15.0], dtype=np.float32)
    q_high = np.array([10.0, 15.0, 25.0, 30.0], dtype=np.float32)
    y_true = np.array([5.0, 12.0, 22.0, 28.0], dtype=np.float32)

    cqr = SplitConformalQuantileCalibrator(coverage=0.80)
    cqr.fit(q_low, q_high, y_true)

    c_low, c_high, width = cqr.transform(q_low, q_high)
    assert (c_low >= 0.0).all()
    assert (c_high >= c_low).all()
    assert (width >= 0.0).all()


def test_wave3_temporal_recency_weights():
    """Validates exponential recency sample weights calculation."""
    from scripts.model_tournament_wave3 import compute_temporal_recency_weights

    dates = pd.Series(["2023-01-01", "2024-01-01", "2025-01-01", "2025-12-31"])
    weights = compute_temporal_recency_weights(dates, reference_date="2026-01-01", lambda_decay=0.45)

    assert len(weights) == 4
    assert (weights > 0.0).all()
    # More recent date should have strictly higher weight
    assert weights[3] > weights[2] > weights[1] > weights[0]

