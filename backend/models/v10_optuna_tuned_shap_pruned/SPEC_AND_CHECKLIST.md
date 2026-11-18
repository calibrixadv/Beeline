# Model v10: Optuna Tuned & SHAP/Gain Pruned GBDT

## Execution Checklist
- [x] Compute feature importances on the combined `v7`+`v9` feature space strictly within 2023-2025 training folds and prune noisy/collinear low-gain features.
- [x] Run systematic hyperparameter search (`num_leaves`, `max_depth`, `min_child_samples`, `learning_rate`, `subsample`, `colsample_bytree`, `reg_alpha`, `reg_lambda`) optimizing 10-Fold `GroupKFold` CV loss with early stopping.
- [x] Verify Overfitting Gap (`Val_MAE - Train_MAE < 0.20 min`) and evaluate once on the 2026 Holdout Set.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT touch or evaluate the 2026 Holdout Set during feature pruning or hyperparameter selection (zero test-set peeking).
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v6`.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
