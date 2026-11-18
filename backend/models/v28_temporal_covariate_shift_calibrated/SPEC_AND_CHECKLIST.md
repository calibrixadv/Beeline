# Model v28: Temporal Covariate Shift Weighting & Drift-Resistant Calibration

## Execution Checklist
- [x] Estimate covariate-shift density weights strictly within the 2023-2025 development set (weighting observations toward the 2025 operational distribution) without touching 2026.
- [x] Apply drift-resistant Platt/Temperature scaling + anchored Isotonic calibration so Year 2026 Reliability ECE (%) drops below `0.25%`.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use any rows from the 2026 Holdout Set to compute covariate-shift weights or calibration curves.
- DO NOT fit calibrators outside the current training fold.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
