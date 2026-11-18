# Model v47: Deep ResMLP GLU L2 Expectation Hybrid

## Execution Checklist
- [x] Standardized complete Wave 6 feature matrix inside each fold.
- [x] Implemented 4-layer Highway Residual MLP (256 -> 128 -> 64 -> 32) with Gated Linear Unit (GLU) bilinear feature attention.
- [x] Blended via OOF-optimal L2 weights (0.75 v46 GBDT + 0.25 ResMLP).
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- StandardScaler and GLU attention fitted strictly inside each training fold.
- Zero peeking at 2026 holdout labels.
