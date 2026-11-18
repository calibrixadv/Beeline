# Model v16: Composite Expectile-Huber L1 Dual-Objective Regressor

## Execution Checklist
- [x] Train both an $L_1$-optimal Median Quantile ($P_{50}$) regressor and an $L_2$/Huber variance-explaining regressor (with Log1p/Duan + Physics features).
- [x] Learn an optimal OOF dual-objective projection that simultaneously achieves low MAE (~8.5 min) AND high $R^2$ (~0.60+).
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT tune blending weights on the 2026 Holdout Set (fit strictly on 2023-2025 OOF predictions).
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
