# Model v22: Hierarchical Empirical Bayes Optuna Quantile Fusion

## Execution Checklist
- [x] Use `v14` 3-Level Hierarchical Empirical Bayes shrinkage (`train_number -> corridor_category -> corridor -> global` with $m_1=50, m_2=30$ for `heb_delay`, `heb_p15`, `heb_missed`) as the core feature backbone.
- [x] Apply `v12` task-decoupled feature selection (preserving `transfer_buffer_minutes` and `net_transfer_margin` for classification) and Optuna-tuned $P_{50}$ Quantile + Binary estimators.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use unsmoothed single-level target encodings that drift on the 2026 timetable.
- DO NOT fit target encoders or feature selectors outside the current training fold (zero data leakage).
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
