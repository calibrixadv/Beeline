# Model v15: Temporal Decay Recency-Weighted GBDT

## Execution Checklist
- [x] Compute exponential recency sample weights $w_i = \exp(-\lambda \cdot \text{days\_before\_2026} / 365.0)$ with $\lambda = 0.45$ so recent 2025 railway infrastructure conditions carry higher weight than 2023.
- [x] Pass `sample_weight=w_train` during training inside each fold and for the 2026 holdout model.
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT apply sample weights to validation or test metric calculations (evaluation metrics must remain unweighted and identical to `v1`..`v11`).
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
