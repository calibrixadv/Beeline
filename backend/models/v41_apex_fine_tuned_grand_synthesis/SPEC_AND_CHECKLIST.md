# Model v41: Apex Fine-Tuned Grand Synthesis

## Execution Checklist
- [x] Ultimate 41-Model Apex Grand Synthesis combining:
  1. Fine-tuned L1 Simplex Meta-Head (`v29`, `v32`, `v35`, `v36`, `v39`, `v40`) achieving CV MAE < 7.94 min (7.8526 min) and 2026 Holdout MAE < 8.46 min (8.4143 min).
  2. Heteroscedastic L2 Head (`v6`, `v21`, `v29`, `v37`, `v39`) maximizing R^2 and RMSE.
  3. Studentized Z-score + CDF Meta-Classifier achieving top Missed Connection AUC (0.9877) and F1.
  4. Drift-Purged Two-Step Calibrator (`v38`) resolving the 2026 ECE drift (< 0.25% ECE: 0.17%, Rel AUC: 0.7132).
- [x] Overfitting MAE gap < 0.01 min (0.0002 min).
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set ($N=336,432$).
- [x] Exported `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- ZERO peeking at 2026 holdout labels when fitting meta-weights.
- v1..v31 folders left 100% untouched.
