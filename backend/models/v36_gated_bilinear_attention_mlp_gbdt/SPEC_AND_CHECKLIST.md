# Model v36: Gated Bilinear Attention MLP & GBDT Hybrid

## Execution Checklist
- [x] Implemented Gated Linear Unit (`GLU: x * sigmoid(Wx + b)`) + Feature Attention projection + `(256, 128, 64)` Highway Residual MLP.
- [x] Fitted `StandardScaler` strictly inside each training fold (zero validation or 2026 leakage).
- [x] Blended Highway MLP representation with fine-tuned GBDT `v35`.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Fitted `StandardScaler` and neural weights strictly inside each training fold.
