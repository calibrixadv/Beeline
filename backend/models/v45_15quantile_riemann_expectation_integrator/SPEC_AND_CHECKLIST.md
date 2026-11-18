# Model v45: 15-Quantile Riemann Expectation Integrator

## Execution Checklist
- [x] Trained dense 15-quantile monotonic grid: `tau in [0.02, 0.05, 0.10, 0.15, 0.25, 0.35, 0.50, 0.65, 0.75, 0.85, 0.90, 0.95, 0.97, 0.98, 0.99]`.
- [x] Enforced monotonic non-crossing via `np.maximum.accumulate`.
- [x] Reconstructed exact conditional expectation `E[Y|X]` via trapezoidal Riemann-Stieltjes numerical integration + OOF Non-Negative Ridge weights.
- [x] Retained P50 for L1 median loss and computed exact risk scores (`z_score_15m`, `z_score_transfer`, `cdf_prob_15m`, `cdf_prob_transfer_safe`).
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Quantile sorting strictly monotonic. Zero peeking at 2026 holdout labels.
