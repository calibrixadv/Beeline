# Model v42: Causal Completed-Arrivals Contagion L2

## Execution Checklist
- [x] Computed physical completion timestamps strictly via `actual_arrival_dt = dep_dt + pd.to_timedelta(duration + delay, unit='m')`.
- [x] Enforced strict causal contagion law (`actual_arrival_dt_j < dep_dt_i`) for 1h, 3h, and 6h windows on corridor, destination, and origin.
- [x] Integrated corridor EWMA with 90-minute half-life.
- [x] Replaced L1 quantile objective with dual L2 regression head (residual delta_d + direct delay) targeting R^2 maximization.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- ZERO peeking at trains still in transit (`actual_arrival_dt_j >= dep_dt_i`).
- All prior models v1..v41 left 100% untouched.
