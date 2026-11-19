# Model v49: Variance-Partitioned Regime Experts L2

## Execution Checklist
- [x] Implemented OOF-calibrated 3-regime probability gate: Normal (<=15m), Moderate (15-45m), Severe (>45m).
- [x] Trained 3 specialized L2 GBDT experts over partitioned regime variance domains.
- [x] Combined predictions via exact total expectation: `sum_k P(Regime_k | x) * E[Y | x, Regime_k]`.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Gate and experts trained strictly inside each fold. Zero peeking at 2026 holdout labels.
