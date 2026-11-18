# Model v23: Dense 11-Quantile Monotonic Grid & Studentized Threshold Z-Score

## Execution Checklist
- [x] Train an 11-Quantile monotonic grid ($\alpha \in \{0.05, 0.15, 0.25, 0.35, 0.45, 0.50, 0.55, 0.65, 0.75, 0.85, 0.95\}$) on the `v22` HEB feature space.
- [x] Engineer Studentized Threshold Z-scores from OOF quantiles: `z_score_15m = (15.0 - q50) / np.maximum(1.0, q75 - q25)` and `z_score_transfer = (transfer_buffer_minutes - 5.0 - q50) / np.maximum(1.0, q75 - q25)` plus fine-grained piecewise CDF probabilities.
- [x] Feed these into the Missed Connection & Reliability classifiers.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT allow quantile crossing (`np.maximum.accumulate` required) or use ground-truth delay in Z-score computation.
- DO NOT fit quantile regressors or calibrators outside the current training fold.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
