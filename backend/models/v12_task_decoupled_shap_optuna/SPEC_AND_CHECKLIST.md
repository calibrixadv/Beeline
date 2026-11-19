# Model v12: Task-Decoupled SHAP/Gain Feature Pruning & Independent Optuna Tuning

## Execution Checklist
- [x] Compute separate feature importance rankings for (a) Delay Regression, (b) Missed Connection Classification, and (c) Reliability Classification (`missed_connection == 0` and `actual_delay_minutes <= 15.0`).
- [x] Prune features independently per task so `transfer_buffer_minutes` and `net_transfer_margin` are guaranteed to be retained for the classifiers (fixing the `v10` classifier drop).
- [x] Use Optuna-tuned LightGBM Quantile ($P_{50}$) regressor and tuned binary classifiers.
- [x] Verify 10-Fold CV generalization and evaluate once on the 2026 Holdout Set.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use a single regressor-only pruned feature list for the Missed Connection classifier.
- DO NOT touch or evaluate the 2026 Holdout Set during feature pruning or hyperparameter optimization.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
