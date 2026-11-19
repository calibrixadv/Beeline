# Model v33: Hub Contagion Graph Propagation

## Execution Checklist
- [x] Engineered network contagion features using ONLY known departure state in preceding 3 hours `[t - 3h, t)` via `closed='left'`.
- [x] Mapped 8 major railway hub centrality weights (`BCT`, `BSV`, `CJN`, `PLO`, `FAU`, `TIM`, `IAS`, `CTA`) to contagion pressure.
- [x] Zero concurrent destination arrival leakage; strictly known origin delay and active speed restrictions.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set.
- [x] Exported `SPEC_AND_CHECKLIST.md`, `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Strictly ZERO concurrent `actual_delay_minutes` in 3-hour propagation window.
