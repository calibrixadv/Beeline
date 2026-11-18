# Model v7: Spatiotemporal Corridor Weather Lags & Advanced Bayesian Target Encoding

## Execution Checklist
- [x] Preserve all 45+ railway physics features from `v2`.
- [x] Compute `arrival_hour = (departure_hour + round(scheduled_duration_minutes / 60)) % 24` and join destination station weather at arrival time from `weather_archive.parquet` (read-only).
- [x] Engineer corridor weather extremes: `corridor_max_temp`, `corridor_min_temp`, `corridor_max_wind_gust`, `corridor_max_snow`, `corridor_min_visibility`, `temp_gradient_orig_dest`.
- [x] Fit inside-fold Bayesian m-estimate Target Encoding ($m=30$) for `(train_number, season)`, `(corridor_slug, is_peak_hour)`, `(origin_station_code, departure_hour)` predicting both mean delay and `te_prob_under_15m` (`actual_delay_minutes <= 15.0`).
- [x] Run 10-Fold GroupKFold CV + 2026 Holdout evaluation and export `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions (What Must NOT Be Touched)
- DO NOT use weather timestamps after scheduled arrival time (zero future weather leakage).
- DO NOT fit any target encoder outside the training fold split.
- DO NOT modify, retrain, overwrite, or delete anything inside `v1`..`v6`.
- DO NOT modify raw datasets in `backend/scraper/.cache/`.
