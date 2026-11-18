# Model v9: Full Cumulative Distribution Function (7 Quantiles) & Conformalized Quantile Regression

## Execution Checklist
- [x] Train 7 Quantile Regressors ($\alpha \in \{0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95\}$) on the `v7` feature set.
- [x] Enforce monotonicity (`P05 <= P10 <= P25 <= P50 <= P75 <= P90 <= P95`) via row-wise sorting/accumulation (`np.maximum.accumulate`).
- [x] Compute OOF distribution features: `iqr_delay = P75 - P25`, `tail_spread = P90 - P10`, `right_skew`, `cdf_prob_delay_le_15` (piecewise-linear interpolated CDF probability that delay <= 15.0 min), and `cdf_prob_transfer_safe` (interpolated CDF probability that delay <= `transfer_buffer_minutes - 5.0`).
- [x] Train second-stage Missed Connection & Reliability classifiers enriched with these CDF probabilities + Isotonic calibration.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT allow quantile crossing in any validation or test prediction.
- DO NOT reference ground-truth `actual_delay_minutes` when computing `cdf_prob_delay_le_15` or `cdf_prob_transfer_safe`.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v6`.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
