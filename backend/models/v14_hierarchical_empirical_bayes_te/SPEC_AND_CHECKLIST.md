# Model v14: 3-Level Hierarchical Empirical Bayes Target Encoding

## Execution Checklist
- [x] Implement 3-level Hierarchical Empirical Bayes Target Encoding inside each fold: shrink `train_number` -> `(corridor_slug, train_category)` -> `corridor_slug` -> `global_mean` using credibility weights $n / (n + m)$ ($m_1=50, m_2=30$).
- [x] Train multi-quantile ($P_{50}, P_{90}$) and reliability classifiers using these drift-resistant encodings.
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use unsmoothed or low-$m$ ($m < 30$) target encodings on high-cardinality keys that cause prior shift on the 2026 timetable.
- DO NOT fit target encoders on validation folds or the 2026 Holdout Set (zero target leakage).
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
