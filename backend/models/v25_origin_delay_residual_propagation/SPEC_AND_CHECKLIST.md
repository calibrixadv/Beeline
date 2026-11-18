# Model v25: Origin Delay Residual Propagation & Timetable Slack Network

## Execution Checklist
- [x] Engineer timetable slack and propagation features (`min_theoretical_duration = (distance_km / 90.0) * 60.0`, `schedule_slack_minutes = np.maximum(0.0, scheduled_duration_minutes - min_theoretical_duration)`, `net_unabsorbed_origin_delay = np.maximum(0.0, delay_at_origin_minutes - 0.35 * schedule_slack_minutes)`).
- [x] Train a residual regressor on $\Delta d = \text{actual\_delay\_minutes} - \text{delay\_at\_origin\_minutes}$ and reconstruct $\hat{d} = \max(0.0, \text{delay\_at\_origin\_minutes} + \widehat{\Delta d})$ blended with direct $P_{50}$ prediction.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use destination arrival timestamps or ground-truth delay when constructing slack features.
- DO NOT fit residual regressors outside the current training fold.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
