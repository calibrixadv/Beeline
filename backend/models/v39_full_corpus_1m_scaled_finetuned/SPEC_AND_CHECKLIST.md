# Model v39: Full-Corpus 1M-Scaled Fine-Tuned Pipeline

## Execution Checklist
- [x] Scaled the `v25 + v32 + v34 + v35` fine-tuned pipeline using the full 2023-2025 corpus (1,185,219 rows).
- [x] Full-corpus 3-level Empirical Bayes tables and causal rolling EMAs computed across 1.185M training rows.
- [x] Evaluated 10-Fold CV across 158 ISO weeks (350k aligned index for strict comparability) and untouched 2026 Holdout Set.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Strictly ZERO data from `service_date >= '2026-01-01'` in the 1.185M training corpus.
