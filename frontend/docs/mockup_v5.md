Act as a Principal UI/UX Engineer (Apple / Linear / Raycast Bento Design Specialist).

Implement **Variant 5 (`frontend/src/components/hive-tour/chapter1-mockups/Variant5BentoTrainRadar.tsx`)** in extreme detail and wire it into the `"v5"` tab of `QueenBeesSection.tsx` (setting `"v5"` as the default active tab):

1. **Asymmetric 12-Column Warm-Glass Bento Grid:**
   - Replace the 3 equal columns with a sophisticated 12-column Bento layout using translucent warm-honey glass panels (`bg-white/55 backdrop-blur-md border border-amber-200/80 shadow-xl`) that let the background honeycomb shine through.
   - Preserve `data-testid="queen-card-safe"`, `queen-card-fast`, `queen-card-economy`, all Queen names/titles, `RoyalCrownSvg`, and `MiniWorkerBee` swarms (`data-mini-bee-variant`).

2. **Bento Cell 1 (8 Columns Wide — Queen Meli's Live Junction Transfer Radar):**
   - Features **Queen Meli** perched beside an interactive **4-Hub Railway Radar** (`[ Ploiești Sud ]`, `[ Brașov ]`, `[ Făurei Single-Track ]`, `[ București Nord ]`).
   - Clicking any hub updates a live visual platform timeline (`Incoming IR 1572` ➔ `ML Buffer Shield +18m` ➔ `Connecting RE 7570`), showing causal completed-arrival contagion status ($t_{\text{arr}} < t_{\text{dep}}$) and the `96/100` Reliability gauge.

3. **Bento Cell 2 (4 Columns Wide — Queen Vira's Supersonic Dispatch Instrument):**
   - Features **Queen Vira** with an interactive **Train Category Speedometer** (`[ IC InterCity ]`, `[ Softrans Hyperion ]`, `[ IR InterRegio ]`) that animates an SVG radial/linear velocity gauge (`160 km/h`, `0 Stopovers`, `-45m saved`) and `v35` `< 1.5ms` inference badge.

4. **Bento Cell 3 (12 Columns Wide Bottom Banner — Queen Flora's Interactive Multi-Operator Ticket Deck):**
   - Features **Queen Flora** beside a fanned-out horizontal deck of **4 Interactive Rail Tickets** (`CFR Călători: 63.00 LEI`, `Astra Trans Carpatic: 55.00 LEI`, `TFC: 28.50 LEI`, `Regio Călători: 24.50 LEI`). Hovering or clicking any ticket elevates it, highlights the route amenities, and calculates the exact percentage and LEI saved in a golden honey jar meter.
   - Strictly zero `<canvas>`, `<map>`, or `.leaflet-container`. Verify `tsc --noEmit` and `homePage.test.tsx` pass 100%.
