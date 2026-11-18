# Model v24: Factorized Conditional Reliability Architecture

## Execution Checklist
- [x] Factorize the Reliability target (`missed_connection == 0 AND actual_delay_minutes <= 15.0`) into two exact conditional components: Component A predicting $P(\text{actual\_delay\_minutes} \le 15.0 \mid \mathbf{X})$ and Component B predicting $P(\text{missed\_connection} == 0 \mid \text{delay} \le 15.0, \mathbf{X})$.
- [x] Combine $P_{\text{rel}} = P_A \times P_B$ blended with a direct joint classifier and calibrate via Isotonic/Sigmoid calibration.
- [x] Evaluate 10-Fold GroupKFold CV (2023-2025) and untouched 2026 Holdout Set generalization.
- [x] Export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT leak ground-truth `actual_delay_minutes <= 15.0` at validation or test inference when evaluating Component B.
- DO NOT fit calibrators or conditional components outside the current training fold.
- DO NOT modify, retrain, overwrite, or delete any folder from `v1` through `v21` or existing markdown/JSON reports.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
