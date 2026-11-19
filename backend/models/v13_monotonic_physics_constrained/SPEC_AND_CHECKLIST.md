# Model v13: Monotonic Physics-Constrained LightGBM

## Execution Checklist
- [x] Enforce explicit domain `monotone_constraints` in LightGBM (`+1` for `delay_at_origin_minutes`, `active_speed_restrictions_count`, `snow_depth_cm`, `precipitation_rate_mm_h`, `thermal_rail_stress`, `winter_switch_freeze_index`, `single_track_crossing_cascade`; `-1` for `transfer_buffer_minutes` and `net_transfer_margin` in missed-connection classification).
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT allow tree splits that violate physical monotonicity on constrained variables.
- DO NOT evaluate the 2026 Holdout Set during training or fold tuning.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
