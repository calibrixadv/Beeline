# Model v35: Curriculum Warm-Start Fine-Tuned GBDT

## Execution Checklist
- [x] True Two-Stage Post-Training Fine-Tuning pipeline:
  - Stage 1 (Pre-training): 500 trees fitted on fold training split at `learning_rate=0.05`.
  - Stage 2 (Fine-Tuning): Warm-started from Stage 1 (`init_model`), +150 trees at decayed `learning_rate=0.006` and doubled L2 regularization (`reg_lambda=5.0`).
  - Sample weights exponentially emphasize the most recent 26 weeks inside each fold.
- [x] Fit strictly inside training folds (zero validation or 2026 leakage).
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Stage 2 fine-tuning uses strictly rows inside each training fold.
