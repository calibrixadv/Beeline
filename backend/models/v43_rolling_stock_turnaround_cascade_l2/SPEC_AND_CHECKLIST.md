# Model v43: Rolling-Stock Turnaround Cascade L2

## Execution Checklist
- [x] Integrated causal rolling-stock turnaround match within `[dep - 180m, dep - 10m]`.
- [x] Engineered `turnaround_prev_delay` and `turnaround_slack_deficit`.
- [x] Added bidirectional single-track opposing corridor pressure multiplied by `is_single_track`.
- [x] Trained under L2 regression objective, achieving substantial R^2 boost and RMSE reduction.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Turnaround matching is strictly backward-looking (`actual_arrival_dt < dep_dt`).
- Zero peeking at 2026 holdout labels.
