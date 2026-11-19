# Model v31: Omega Grand Champion Cross-Wave Synthesis (v1 through v30)

## Execution Checklist
- [x] Construct the ultimate **31-Model Omega Synthesis** combining the best OOF predictors across ALL FOUR WAVES (`v1` through `v30`).
- [x] Optimize non-negative convex combinations + drift-guarded calibration (`v6`/`v28` style) so `v31` achieves the strongest all-around generalization on both 10-Fold CV (2023-2025) and the Year 2026 Out-of-Time Holdout ($N=336,432$).
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- Zero peeking at 2026 test labels when fitting Omega ensemble weights.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
