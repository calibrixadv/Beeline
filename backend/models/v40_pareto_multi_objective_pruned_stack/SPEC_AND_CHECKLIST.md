# Model v40: Pareto Multi-Objective Pruned Meta-Stacker

## Execution Checklist
- [x] Forward/simplex subset selection executed across Waves 1-5 candidate predictors.
- [x] High-drift models pruned to isolate the most temporally robust predictors: `['v32', 'v33', 'v35', 'v36', 'v37', 'v39']`.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set.
- [x] Inherited drift-purged calibrated reliability from v38.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Candidate selection and Pareto weights fitted strictly on 2023-2025 OOF folds.
