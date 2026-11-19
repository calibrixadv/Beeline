# Model v27: Cross-Family CatBoost MAE + LightGBM L1 Pareto Regressor

## Execution Checklist
- [x] Train symmetric-tree `CatBoostRegressor(loss_function="MAE", depth=6, l2_leaf_reg=5.0)` alongside `LGBMRegressor(objective="quantile", alpha=0.50)` and `LGBMRegressor(objective="huber")` on the `v25`/`v26` feature set.
- [x] Combine OOF predictions to minimize both MAE and RMSE across tree families.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use RMSE-only CatBoost weights when predicting point MAE.
- DO NOT fit cross-family combinations outside the current training fold.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
