# Model v17: CatBoost + LightGBM Residual Boosting Cascade

## Execution Checklist
- [x] Stage 1: Fit regularized CatBoost (symmetric oblivious trees, `depth=6, l2_leaf_reg=5.0`) to capture global categorical/continuous interactions.
- [x] Stage 2: Compute OOF residuals $r = y - \hat{y}_{\text{CatBoost}}$ and fit a regularized LightGBM regressor on the residuals with shrinkage factor $\alpha \in [0.3, 0.7]$ tuned on OOF.
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT compute Stage 2 training residuals from in-sample predictions without regularization/OOF alignment.
- DO NOT tune shrinkage on the 2026 Holdout Set.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
