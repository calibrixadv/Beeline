# Model v34: Thermodynamic & Tribology Physics V2

## Execution Checklist
- [x] Implemented 2nd-generation railway physics interactions with strict non-negativity:
  - (a) Autumn/rain wheel-rail adhesion loss: `(season == 2) * precipitation_rate_mm_h * stop_count`
  - (b) Cryogenic brake-pipe pressure loss: `np.maximum(0.0, -10.0 - temp_celsius) * stop_count`
  - (c) Wet-snow catenary icing: `traction_type * ((temp_celsius >= -2.5) & (temp_celsius <= 1.5)) * (snow_depth_cm + 5.0 * freezing_rain_risk)`
  - (d) Low-visibility signal sighting deceleration: `np.maximum(0.0, 200.0 - visibility_meters) * (distance_km / 100.0)`
- [x] Combined on top of `v25` + `v32` + `v33`.
- [x] Evaluated 10-Fold CV across 158 ISO weeks and untouched 2026 Holdout Set.
- [x] Generated `metrics.json`, `feature_importances.csv`, and `model_artifact.pkl`.

## Specific Restrictions & Guardrails
- Enforced physical non-negativity on all stress indices.
