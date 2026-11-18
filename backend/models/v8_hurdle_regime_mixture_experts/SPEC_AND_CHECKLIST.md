# Model v8: Hurdle Regime Mixture of Experts

## Execution Checklist
- [x] Train Expert Gate classifier predicting OOF probability `p_severe = P(actual_delay_minutes > 15.0)` on the `v7` feature set.
- [x] Train Expert 1 (Normal Regime Regressor) on moderate delays (`actual_delay_minutes <= 20.0`) to sharpen accuracy around the 15-minute reliability threshold.
- [x] Train Expert 2 (Severe Tail Regressor) on heavy delays (`actual_delay_minutes > 15.0`) using robust L1/Huber loss.
- [x] Combine predictions smoothly via `d_hat = (1 - p_severe) * d_hat_expert1 + p_severe * d_hat_expert2` and pass `[p_severe, d_hat_expert1, d_hat_expert2, d_hat]` into the Missed Connection & Isotonic Reliability calibrator.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT route validation or test samples between Expert 1 and Expert 2 using ground-truth `actual_delay_minutes` (routing at evaluation/inference MUST use predicted `p_severe` only!).
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v6`.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
