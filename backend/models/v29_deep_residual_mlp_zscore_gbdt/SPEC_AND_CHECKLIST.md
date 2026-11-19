# Model v29: Deep Residual Tabular MLP & Z-Score GBDT Hybrid

## Execution Checklist
- [x] Upgrade `v19` by training an inside-fold `StandardScaler` + Deep Tabular MLP (`(256, 128, 64)` with L2 regularization and early stopping) enriched with `heb_delay`, `heb_p15`, `z_score_15m`, `z_score_transfer`, and residual propagation features.
- [x] Blend OOF neural probabilities and regressions with `v23`/`v27` GBDT estimators to push `Reliability ROC-AUC` to a new tournament record.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT fit `StandardScaler` or MLP parameters on validation or 2026 holdout samples.
- DO NOT blend using weights tuned on the test set.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
