# Model v11: Super-Learner Nonlinear Stacking Ensemble

## Execution Checklist
- [x] Assemble the Level-1 Out-of-Fold (OOF) prediction matrix from `v7`, `v8`, `v9` (all 7 quantiles + CDF probabilities), and `v10` (plus `v5`/`v6` predictions in read-only mode).
- [x] Train a regularized non-linear Level-2 Super-Learner (shallow Gradient Boosted Decision Trees `max_depth=3, min_child_samples=250, l2_regularization=5.0` blended with L2 Ridge / Logistic Regression) + Isotonic Regression calibration for `reliability_score_pct` (0-100%).
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT fit the Level-2 Super-Learner on in-sample training predictions of Level-1 models (must use strictly Out-of-Fold predictions!).
- DO NOT modify any files inside `v1`..`v6`.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
