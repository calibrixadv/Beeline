# Model v26: Multi-Harmonic Fourier & 4-Level Hierarchical Empirical Bayes

## Execution Checklist
- [x] Add $k=1, 2, 3$ order Fourier harmonics ($\sin(2\pi k t / T), \cos(2\pi k t / T)$) for `departure_hour`, `day_of_week`, and `day_of_year`.
- [x] Build a 4-Level Hierarchical Empirical Bayes encoder (`(train_number, season) -> train_number -> (corridor_slug, season) -> global_mean` with conservative shrinkage $m_0=60, m_1=50, m_2=30$) strictly inside each fold.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT fit any level of the 4-level hierarchy outside the current training fold.
- DO NOT compute Fourier cyclical harmonics using future or test-set timestamps.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
