# Model v50: Decoupled Dual-Head R2/MAE Stacker

## Execution Checklist
- [x] Stacked OOF predictions from `v6`, `v17`, `v21`, `v29`, `v35`, `v37`, `v39`, and `v42`–`v49`.
- [x] Enforced strict Anti-Collapse Diversity Constraint (`max(w_k) <= 0.45`, `w_k >= 0`, `sum(w_k) = 1`).
- [x] Head A (L2 Expectation Stacker: Non-Negative Ridge + Shallow Depth-3 L2 GBDT) maximizing R^2 and slashing RMSE.
- [x] Head B (L1 Simplex Stacker) minimizing MAE.
- [x] United via variance-preserving heteroscedastic bridge.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Anti-collapse diversity strictly verified: max weight = 0.332 <= 0.45.
- Zero peeking at 2026 holdout labels.
