# Model v19: Tabular MLP Neural Network & GBDT Blend

## Execution Checklist
- [x] Fit an inside-fold `StandardScaler` + regularized Tabular Neural Network (`MLPRegressor` / `MLPClassifier` with `(128, 64)` hidden layers, ReLU, L2 `alpha=0.01`, early stopping) on the engineered feature space.
- [x] Blend OOF neural predictions with Gradient Boosted Trees to capture smooth continuous representations.
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT fit `StandardScaler` or neural weights on validation or 2026 test rows.
- DO NOT tune blend weights on the 2026 Holdout Set.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
