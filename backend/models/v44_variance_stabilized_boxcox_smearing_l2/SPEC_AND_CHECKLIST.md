# Model v44: Variance-Stabilized Box-Cox Smearing L2

## Execution Checklist
- [x] Fitted log1p variance-stabilizing transformation over the v43 feature space.
- [x] Replaced naive scalar Duan smearing with Heteroscedastic Regime-Conditional Smearing (grouped by season, single-track, congestion decile).
- [x] Implemented inside-fold non-negative L2 expectation calibration layer.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Smearing factors and non-negative weights fitted strictly inside each training fold.
- Zero peeking at 2026 holdout labels.
