# Model v18: Conformal CQR & Hybrid Beta/Isotonic Calibrated Risk

## Execution Checklist
- [x] Implement Split Conformalized Quantile Regression (CQR) calibrating the $[P_{10}, P_{90}]$ uncertainty interval width on OOF residuals.
- [x] Calibrate `reliability_score_pct` (`0.0%` to `100.0%`) using a drift-resistant hybrid **Sigmoid/Beta + Isotonic Calibrator** to achieve both high Reliability AUC (`> 0.76` CV) and ultra-low 2026 Test ECE (`< 0.30%`).
- [x] Evaluate 10-Fold CV and 2026 Holdout generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT overfit calibration bins to noisy validation tail probabilities.
- DO NOT fit conformal quantiles or calibrators on the 2026 Holdout Set.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v11` or existing leaderboards (`LEADERBOARD_REPORT.md`, `LEADERBOARD_WAVE2.md`).
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
