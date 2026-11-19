# Model v20: Physical Topology Specialized Submodels (Mixture of Experts)

## Execution Checklist
- [x] Partition training into two physical topology regimes based on `freeze_contract.md` infrastructure flags: Regime A (`is_single_track == 1` OR `mountain_pass_flag == 1`) vs. Regime B (double-track flat corridors).
- [x] Blend specialized topology experts with the shared trunk estimator.
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- Routing between Regime A and Regime B MUST use only deterministic static infrastructure features (`is_single_track`, `mountain_pass_flag`), never target variables.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
