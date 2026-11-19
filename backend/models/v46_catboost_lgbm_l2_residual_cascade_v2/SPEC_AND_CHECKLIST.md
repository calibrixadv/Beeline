# Model v46: CatBoost-LGBM L2 Residual Cascade V2

## Execution Checklist
- [x] Stage 1: Symmetric oblivious trees `CatBoostRegressor(loss_function='RMSE', depth=6)` on Wave 6 feature set.
- [x] Stage 2: Computed strictly Out-of-Fold Stage 1 residuals.
- [x] Trained regularized LightGBM on residuals with optimal shrinkage `alpha=0.65`.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Stage 2 residuals strictly computed out-of-fold. Zero peeking at 2026 holdout labels.
