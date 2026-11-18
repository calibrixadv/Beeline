# Master Tournament Leaderboard: Wave 4 (Models v1 through v31)

Beeline VoyageRail 10-Fold Temporal Cross-Validation Tournament (Zero Data Leakage).

| Model ID | CV MAE (min) | 2026 Test MAE | CV RMSE | CV R² | CV Missed AUC | 2026 Missed AUC | CV Rel AUC | 2026 Rel AUC | 2026 Rel ECE (%) |
|---|---|---|---|---|---|---|---|---|---|
| `v1_baseline_lgbm_18feat` | 11.810 | 12.958 | 16.107 | 0.1485 | 0.9840 | 0.9837 | 0.6232 | 0.6235 | 0.37% |
| `v2_physics_oof_lgbm_huber` | 10.814 | 12.048 | 15.053 | 0.2553 | 0.9881 | 0.9878 | 0.7140 | 0.7088 | 0.47% |
| `v3_log_target_cat_histgbm` | 11.969 | 12.627 | 14.707 | 0.2857 | 0.9883 | 0.9881 | 0.7167 | 0.7125 | 0.29% |
| `v4_two_stage_hurdle_chain` | 10.814 | 12.048 | 15.053 | 0.2553 | 0.9881 | 0.9878 | 0.7151 | 0.7086 | 0.44% |
| `v5_quantile_uncertainty_calibrated` | 8.068 | 8.574 | 11.889 | 0.5280 | 0.9882 | 0.9880 | 0.7147 | 0.7098 | 0.44% |
| `v6_stacked_ensemble_meta` | 8.441 | 8.905 | 11.440 | 0.5630 | 0.9884 | 0.9882 | 0.7171 | 0.7131 | 0.24% |
| `v7_spatiotemporal_corridor_weather_lags` | 10.883 | 12.212 | 15.149 | 0.2461 | 0.9883 | 0.9874 | 0.7148 | 0.6974 | 2.23% |
| `v8_hurdle_regime_mixture_experts` | 10.145 | 11.578 | 13.953 | 0.3590 | 0.9903 | 0.9873 | 0.7629 | 0.6998 | 2.39% |
| `v9_full_cdf_7quantiles_cqr` | 8.030 | 8.706 | 11.812 | 0.5341 | 0.9904 | 0.9876 | 0.7668 | 0.7023 | 2.92% |
| `v10_optuna_tuned_shap_pruned` | 7.991 | 8.546 | 11.765 | 0.5377 | 0.5799 | 0.5985 | 0.7633 | 0.7017 | 3.01% |
| `v11_super_learner_nonlinear_stack` | 8.084 | 8.743 | 11.525 | 0.5567 | 0.9905 | 0.9876 | 0.7670 | 0.7022 | 3.01% |
| `v12_task_decoupled_shap_optuna` | 8.018 | 8.678 | 11.836 | 0.5321 | 0.9883 | 0.9872 | 0.7150 | 0.6949 | 1.66% |
| `v13_monotonic_physics_constrained` | 11.386 | 12.513 | 15.642 | 0.1956 | 0.9882 | 0.9872 | 0.7153 | 0.6969 | 0.89% |
| `v14_hierarchical_empirical_bayes_te` | 8.053 | 8.491 | 11.880 | 0.5288 | 0.9882 | 0.9879 | 0.7125 | 0.7071 | 0.59% |
| `v15_temporal_decay_recency_weighted` | 8.031 | 8.662 | 11.816 | 0.5338 | 0.9902 | 0.9873 | 0.7665 | 0.6962 | 2.03% |
| `v16_composite_expectile_huber_l1` | 8.085 | 8.813 | 11.854 | 0.5310 | 0.9902 | 0.9873 | 0.7668 | 0.6963 | 2.23% |
| `v17_catboost_lgbm_residual_boost` | 8.428 | 9.144 | 11.400 | 0.5662 | 0.9903 | 0.9873 | 0.7670 | 0.6963 | 2.06% |
| `v18_conformal_cqr_beta_calibrated` | 8.031 | 8.700 | 11.813 | 0.5341 | 0.9903 | 0.9873 | 0.7670 | 0.6965 | 3.19% |
| `v19_tabular_mlp_highway_gbdt_blend` | 8.035 | 8.606 | 11.611 | 0.5498 | 0.9899 | 0.9872 | 0.7678 | 0.6989 | 2.29% |
| `v20_topology_specialized_submodels` | 8.018 | 8.685 | 11.801 | 0.5350 | 0.9903 | 0.9873 | 0.7671 | 0.6963 | 2.22% |
| `v21_grand_master_cross_wave_ensemble` | 8.314 | 9.024 | 11.392 | 0.5668 | 0.9903 | 0.9873 | 0.7677 | 0.6978 | 1.96% |
| `v22_heb_optuna_quantile_fusion` | 8.059 | 8.527 | 11.867 | 0.5298 | 0.9882 | 0.9879 | 0.7124 | 0.7077 | 0.64% |
| `v23_dense_11quantiles_studentized_zscore` | 8.115 | 8.658 | 11.924 | 0.5254 | 0.9890 | 0.9880 | 0.7353 | 0.7093 | 0.81% |
| `v24_factorized_conditional_reliability` | 8.046 | 8.504 | 11.869 | 0.5297 | 0.9889 | 0.9879 | 0.7352 | 0.7075 | 0.97% |
| `v25_origin_delay_residual_propagation` | 8.030 | 8.489 | 11.853 | 0.5309 | 0.9889 | 0.9879 | 0.7349 | 0.7073 | 0.81% |
| `v26_multi_harmonic_fourier_4level_heb` | 8.080 | 8.548 | 11.904 | 0.5268 | 0.9879 | 0.9876 | 0.7080 | 0.7009 | 0.80% |
| `v27_catboost_mae_lgbm_l1_cross_family` | 8.050 | 8.526 | 11.871 | 0.5295 | 0.9888 | 0.9879 | 0.7338 | 0.7071 | 0.79% |
| `v28_temporal_covariate_shift_calibrated` | 8.046 | 8.495 | 11.869 | 0.5297 | 0.9888 | 0.9879 | 0.7348 | 0.7069 | 1.07% |
| `v29_deep_residual_mlp_zscore_gbdt` | 8.069 | 8.479 | 11.676 | 0.5449 | 0.9887 | 0.9881 | 0.7357 | 0.7098 | 1.26% |
| `v30_dual_head_l1_l2_pareto_stacker` | 7.951 | 8.517 | 11.653 | 0.5465 | 0.9909 | 0.9880 | 0.7851 | 0.6989 | 3.94% |
| `v31_omega_grand_champion_v1_to_v30` | 7.947 | 8.524 | 11.635 | 0.5479 | 0.9909 | 0.9880 | 0.7851 | 0.6989 | 4.01% |
