# Model v48: Full-Corpus 1M Curriculum L2 Mean Engine

## Execution Checklist
- [x] Scaled full Wave 6 pipeline to the complete 1,185,219 training corpus for 2026 holdout estimation.
- [x] Executed Two-Stage Warm-Start Curriculum Fine-Tuning under L2 loss (600 pre-training + 200 warm-start fine-tuning trees with exponential recency curriculum weights).
- [x] Alongside twin warm-start L1 head and full-corpus Z-score classifier.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Generated `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- CV evaluation strictly aligned with 350k stratified sample for cross-tournament integrity.
- Zero peeking at 2026 holdout labels.
