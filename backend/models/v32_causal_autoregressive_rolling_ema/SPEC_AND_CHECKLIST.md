# Model v32: Causal Autoregressive Rolling EMA

## Execution Checklist
- [x] Implemented strictly causal historical exponential moving averages over 7d, 14d, 30d windows per `train_number` and `corridor_slug`.
- [x] Shifted historical aggregations by 1 calendar day (`service_date + 1 day`) to guarantee zero concurrent or future leakage.
- [x] Cold-start fallback dynamically populated using inside-fold 3-level HEB priors.
- [x] 10-Fold GroupKFold CV across 158 ISO weeks (2023-2025) and untouched 2026 Holdout evaluation.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- ZERO same-day target leakage in rolling windows.
- v1..v31 folders and raw datasets left 100% untouched.
