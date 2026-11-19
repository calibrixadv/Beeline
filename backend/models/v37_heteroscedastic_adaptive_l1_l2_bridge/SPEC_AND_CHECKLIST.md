# Model v37: Heteroscedastic Adaptive L1/L2 Uncertainty Bridge

## Execution Checklist
- [x] Dynamically resolved MAE (L1) vs R^2 (L2) per sample using predicted OOF interquartile uncertainty `iqr = q75 - q25`.
- [x] Fitted adaptive gating weight `alpha_i = sigmoid(k * (iqr_i - tau))` on 2023-2025 OOF predictions.
- [x] Low-uncertainty runs blend toward L2/Ridge (boosting R^2 and RMSE).
- [x] High-uncertainty outlier runs route toward L1 median P50 (protecting MAE).
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Gating parameters `(k, tau)` fitted strictly on 2023-2025 OOF predictions.
