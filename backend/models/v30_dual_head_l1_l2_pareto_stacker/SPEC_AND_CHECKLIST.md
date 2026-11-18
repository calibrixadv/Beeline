# Model v30: Dual-Head L1/L2 Pareto-Optimal Meta-Stacker

## Execution Checklist
- [x] Solve the MAE vs. $R^2$ trade-off by training a **Dual-Head Level-2 Stacker** on OOF predictions from `v5`, `v6`, `v11`, `v14`, `v19`, `v22`..`v29`: Head A uses `QuantileRegressor(quantile=0.50)` / $L_1$-optimal simplex weights for minimal MAE (`< 8.0 min` CV, `< 8.48 min` Test 2026), while Head B uses non-negative Ridge for maximal $R^2$, plus a dedicated Meta-Calibrator for Missed Connections and Reliability.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT train Level-2 meta-heads on in-sample Level-1 predictions; use strictly 10-Fold OOF predictions.
- DO NOT fit meta-weights on the 2026 test set.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
