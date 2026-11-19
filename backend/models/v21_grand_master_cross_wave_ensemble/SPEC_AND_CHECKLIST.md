# Model v21: Grand Master Cross-Wave Meta-Ensemble

## Execution Checklist
- [x] Combine OOF and 2026 predictions across the strongest models from ALL THREE WAVES (`v5`, `v6`, `v9`, `v10`, `v11` read-only + `v12`..`v20`).
- [x] Fit convex non-negative meta-learners (optimizing MAE, RMSE/$R^2$, Missed Connection AUC/Brier, and Reliability AUC) + drift-corrected probability calibration so `v21` achieves the best overall balanced profile across 10-Fold CV and 2026 Out-of-Time Holdout.
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- Strictly zero test-set leakage; all meta-weights and calibrators must be fitted exclusively on 2023-2025 10-Fold OOF predictions.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
