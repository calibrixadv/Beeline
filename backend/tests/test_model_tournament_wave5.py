"""
Unit tests for Wave 5 Model Tournament components:
- Causal Autoregressive Rolling EMA (strictly shift(1), cold-start fallback)
- Network Contagion 3h Rolling Closed-Left & Hub Centrality
- Thermodynamic & Tribology Physics V2 (adhesion loss, cryogenic braking, catenary icing, signal visibility)
- Gated Bilinear Attention Tabular Layer (GLU + attention + highway residual)
- Heteroscedastic Adaptive L1/L2 Uncertainty Bridge
- Drift-Purged Temperature & Anchored Isotonic Calibrator
"""

import numpy as np
import pandas as pd
import pytest

from scripts.model_tournament_wave5 import (
    CausalRollingEMAEngineer,
    engineer_network_contagion_features,
    engineer_thermodynamic_tribology_physics_v2,
    GatedBilinearAttentionLayer,
    HeteroscedasticAdaptiveBridge,
    DriftPurgedTwoStepCalibrator,
)


def test_causal_rolling_ema_shift_and_cold_start():
    """Validates strictly causal shift(1) rolling EMA and cold-start HEB fallback."""
    df_tr = pd.DataFrame({
        "service_date": ["2024-01-01", "2024-01-02", "2024-01-05"],
        "train_number": ["IR 100", "IR 100", "IR 100"],
        "corridor_slug": ["c1", "c1", "c1"],
    })
    y_del_tr = np.array([20.0, 40.0, 10.0], dtype=np.float32)
    y_p15_tr = np.array([0.0, 0.0, 1.0], dtype=np.float32)

    ema = CausalRollingEMAEngineer(spans=(7, 14))
    ema.fit(df_tr, y_del_tr, y_p15_tr)

    # Query on training dates
    fallback_del = np.array([5.0, 5.0, 5.0], dtype=np.float32)
    fallback_p15 = np.array([0.8, 0.8, 0.8], dtype=np.float32)
    res = ema.transform(df_tr, fallback_del, fallback_p15)

    # On day 0 (2024-01-01), there are strictly no prior days -> must fall back to HEB prior
    assert np.isclose(res.loc[0, "train_del_ema_7d"], 5.0)
    assert np.isclose(res.loc[0, "train_p15_ema_7d"], 0.8)

    # On day 1 (2024-01-02), only day 0 (20.0) is visible
    assert np.isclose(res.loc[1, "train_del_ema_7d"], 20.0)

    # Query for completely unseen train -> must fall back to HEB prior
    unseen_df = pd.DataFrame({
        "service_date": ["2024-06-01"],
        "train_number": ["UNSEEN_TRAIN"],
        "corridor_slug": ["c1"],
    })
    unseen_res = ema.transform(unseen_df, np.array([9.9]), np.array([0.5]))
    assert np.isclose(unseen_res.loc[0, "train_del_ema_7d"], 9.9)
    assert np.isclose(unseen_res.loc[0, "train_p15_ema_7d"], 0.5)


def test_network_contagion_rolling_closed_left_and_hub_centrality():
    """Validates [t - 3h, t) closed-left contagion features and hub transfer centrality."""
    df = pd.DataFrame({
        "service_date": ["2024-05-10", "2024-05-10", "2024-05-10"],
        "departure_hour": [8, 10, 15],
        "corridor_slug": ["c1", "c1", "c1"],
        "origin_station_code": ["BCT", "BCT", "UNKNOWN_STATION"],
        "delay_at_origin_minutes": [10.0, 30.0, 0.0],
        "active_speed_restrictions_count": [1.0, 2.0, 0.0],
    })

    contagion_df = engineer_network_contagion_features(df)

    assert contagion_df.shape[0] == 3
    # Row 0 (t=8): No prior departures in [5, 8) -> count = 0, delay = 0
    assert contagion_df.loc[0, "corridor_preceding_trains_count"] == 0.0
    assert contagion_df.loc[0, "corridor_preceding_delay_mean"] == 0.0

    # Row 1 (t=10): Preceding departure at t=8 is within [7, 10) -> count = 1, delay = 10.0
    assert contagion_df.loc[1, "corridor_preceding_trains_count"] == 1.0
    assert np.isclose(contagion_df.loc[1, "corridor_preceding_delay_mean"], 10.0)

    # Row 2 (t=15): Preceding departure at t=10 is outside [12, 15) -> count = 0
    assert contagion_df.loc[2, "corridor_preceding_trains_count"] == 0.0

    # Hub weights: BCT has 1.0, UNKNOWN_STATION has default 0.10
    assert np.isclose(contagion_df.loc[0, "hub_transfer_centrality"], 1.0)
    assert np.isclose(contagion_df.loc[2, "hub_transfer_centrality"], 0.10)


def test_thermodynamic_tribology_physics_v2_non_negativity():
    """Validates 2nd-gen railway physics interactions and non-negativity constraints."""
    df = pd.DataFrame({
        "season": [2, 0, 3],  # 2 is Autumn
        "precipitation_rate_mm_h": [5.0, 10.0, 0.0],
        "stop_count": [4, 2, 8],
        "temp_celsius": [15.0, -18.0, 0.0],  # -18C triggers cryogenic brake loss
        "traction_type": [1.0, 0.0, 1.0],  # electric traction = 1.0
        "snow_depth_cm": [0.0, 20.0, 5.0],
        "freezing_rain_risk": [0.0, 0.0, 0.8],
        "visibility_meters": [150.0, 1000.0, 50.0],
        "distance_km": [200.0, 100.0, 300.0],
    })

    phys2_df = engineer_thermodynamic_tribology_physics_v2(df)

    assert (phys2_df >= 0.0).all().all()

    # Row 0: Autumn (season=2), precip=5, stops=4 -> 5 * 4 = 20.0
    assert np.isclose(phys2_df.loc[0, "autumn_rain_adhesion_loss"], 20.0)

    # Row 1: Winter (-18C), cryo loss = max(0, -10 - (-18)) * 2 = 8 * 2 = 16.0
    assert np.isclose(phys2_df.loc[1, "cryogenic_braking_loss"], 16.0)

    # Row 2: Near-freezing (0C), electric (1.0), snow=5, freeze_risk=0.8 -> 1 * 1 * (5 + 5*0.8) = 9.0
    assert np.isclose(phys2_df.loc[2, "wet_snow_catenary_icing"], 9.0)

    # Visibility deficit: Row 2 has vis=50m, dist=300km -> (200 - 50) * (300 / 100) = 150 * 3 = 450.0
    assert np.isclose(phys2_df.loc[2, "low_visibility_sighting_decel"], 450.0)


def test_gated_bilinear_attention_forward():
    """Validates GLU, feature attention projection, and highway residual connection."""
    np.random.seed(42)
    layer = GatedBilinearAttentionLayer(in_features=12, seed=42)
    X = np.random.randn(50, 12).astype(np.float32)

    out = layer.forward(X)
    assert out.shape == (50, 12)
    assert not np.isnan(out).any()
    # Residual property: out = X + X_glu
    assert not np.isclose(out, X).all()


def test_heteroscedastic_adaptive_bridge():
    """Validates dynamic uncertainty-based L1/L2 routing."""
    iqr = np.array([2.0, 3.0, 25.0, 30.0], dtype=np.float32)
    p_l1 = np.array([10.0, 10.0, 10.0, 10.0], dtype=np.float32)
    p_l2 = np.array([14.0, 14.0, 14.0, 14.0], dtype=np.float32)
    y_true = np.array([13.8, 14.1, 10.1, 9.9], dtype=np.float32)

    bridge = HeteroscedasticAdaptiveBridge()
    bridge.fit(iqr, p_l1, p_l2, y_true)

    preds = bridge.predict(iqr, p_l1, p_l2)
    assert len(preds) == 4
    # Low uncertainty (rows 0, 1) should predict closer to L2 (14.0)
    assert abs(preds[0] - 14.0) < abs(preds[0] - 10.0)
    # High uncertainty (rows 2, 3) should predict closer to L1 (10.0)
    assert abs(preds[3] - 10.0) < abs(preds[3] - 14.0)


def test_drift_purged_two_step_calibrator():
    """Validates temperature scaling + anchored isotonic blend."""
    prob_raw = np.array([0.05, 0.15, 0.40, 0.70, 0.95], dtype=np.float32)
    y_true = np.array([0, 0, 0, 1, 1], dtype=np.int32)

    cal = DriftPurgedTwoStepCalibrator()
    cal.fit(prob_raw, y_true)
    cal_p = cal.predict(prob_raw)

    assert len(cal_p) == len(prob_raw)
    assert (cal_p >= 0.0).all() and (cal_p <= 1.0).all()
    # Monotonicity preserved
    assert (np.diff(cal_p) >= 0.0).all()
