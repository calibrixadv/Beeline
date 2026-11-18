Act as a Principal Frontend Architect & Interactive Scrollytelling Designer.

Implement **Variant 3 (`frontend/src/components/hive-tour/chapter1-mockups/Variant3HorizontalAccordion.tsx`)** in extreme detail and wire it into the `"v3"` tab of `QueenBeesSection.tsx` (setting `"v3"` as the default active tab):

1. **70% / 15% / 15% Fluid Horizontal Sanctuary Accordion:**
   - Build a panoramic horizontal flex/grid container where the active Queen's sanctuary smoothly expands to ~70% width (`flex-[4.5] transition-all duration-700 cubic-bezier(0.22, 1, 0.36, 1)`), while the other two Queens compress into sleek 15% vertical glass pillars (`flex-[1]`) with vertical royal badges, peeking mascots, and pulsing hover invitations.
   - Preserve `data-testid="queen-card-safe"`, `queen-card-fast`, `queen-card-economy`, all Queen names/titles, and `MiniWorkerBee` swarms (`data-mini-bee-variant`).

2. **Interactive SVG Corridor Station Map Inside the Active Sanctuary:**
   - Inside the expanded 70% stage, render an interactive horizontal **SVG Railway Corridor Diagram** (`Galați [GLT] ━━━▶ Făurei Junction [FAU] ━━━▶ Buzău [BZU] ━━━▶ Ploiești Sud [PLS] ━━━▶ București Nord [BCT]`) with animated `MiniWorkerBee` convoys and a glowing train pulse moving along the rails.
   - Allow the user to click any of the 5 stations on the SVG track to inspect station-specific telemetry tailored to the active Queen:
     * **Queen Meli (`safe`):** Shows single-track crossing cascade protection at `Făurei`, turnaround buffer at `Buzău`, and platform transfer shield at `Ploiești Sud` (`99.5% AUC`).
     * **Queen Vira (`fast`):** Shows high-priority `IC / IR 1570` non-stop express clearance, 25kV electric traction speed (`140-160 km/h`), and `< 1.5ms` edge routing.
     * **Queen Flora (`economy`):** Shows cumulative fare breakdown in LEI across `CFR`, `TFC`, and `Regio Călători` per segment.
   - Strictly zero `<canvas>`, `<map>`, or `.leaflet-container`. Verify `tsc --noEmit` and `homePage.test.tsx` pass 100%.
