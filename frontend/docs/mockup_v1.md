Act as a Principal Frontend Architect & Interactive SVG Designer.

1. Create an isolated directory `frontend/src/components/hive-tour/chapter1-mockups/`.
2. Inside `QueenBeesSection.tsx`, add a sleek, prominent "🧪 CHAPTER 1 DESIGN LAB" tab switcher bar at the top of the section with buttons for:
   - `classic` ("0. Current Cards")
   - `v1` ("1. Royal Amphitheater + Live Simulator")
   - `v2` ("2. 3D Spatial Pop-Out")
   - `v3` ("3. Expanding Rail Accordion")
   - `v4` ("4. Living Rail Track & Hex-Nodes")
   - `v5` ("5. Asymmetric Bento Train Radar")
   - `v6` ("6. Magnetic Swarm Portal")
   Default the active preview tab to `v1` (or whichever variant was most recently implemented).

3. Implement **Variant 1 (`frontend/src/components/hive-tour/chapter1-mockups/Variant1Amphitheater.tsx`)** in extreme interactive detail:
   - **Zero White Box Around the Active Queen:** The active Queen (**Queen Meli**, **Queen Vira**, or **Queen Flora**) floats freely at `2xl` scale directly over the `CozyHoneyBackground` with a huge layered radial glow (`#10B981` Emerald, `#3B82F6` Electric Blue, or `#D97706` Golden Nectar), floating `RoyalCrownSvg`, and 6 orbiting `MiniWorkerBee` elements (`data-mini-bee-variant`) flying along elliptical SVG orbits.
   - **Floating Hexagonal Queen Dock:** 3 interactive glassmorphic dock cards (`data-testid="queen-card-safe"`, `data-testid="queen-card-fast"`, `data-testid="queen-card-economy"`) that preserve the strings `"Queen Meli"`, `"Queen Transfer Guard"`, `"Queen Vira"`, `"Queen Express Scout"`, `"Queen Flora"`, `"Queen Nectar Saver"` and call `onSelectGear`.
   - **Live Interactive Railway Simulator Deck (Translucent Honey-Glass Panel on the right):**
     * When **Queen Meli (`safe`)** is active: Render a **Live Junction Delay Simulator** with an interactive range slider (`0 min` to `+30 min` incoming delay for train `IR 1572` at `Ploiești Sud` / `Făurei` junction). As the user drags the slider, dynamically calculate the remaining transfer buffer, animate an SVG emerald shield barrier between `Train 1 (IR 1572)` and `Train 2 (RE 7570)`, and show live ML `v41` (`99.5% Transfer AUC`) protection status.
     * When **Queen Vira (`fast`)** is active: Render an **Interactive Magistrala 300 Speed Comparator** toggling between `Direct InterCity / Hyperion (0 Stopovers • 1h 45m • 25kV Electric)` and `Stopping Regio (12 Stopovers • 2h 45m)`, with an animated dual-track SVG train race and time-saved counter (`-60 min saved`).
     * When **Queen Flora (`economy`)** is active: Render a **Multi-Operator Fare Harvester** where clicking corridor pills (`Galați ⇄ București Nord`, `București ⇄ Brașov`, `Cluj ⇄ Timișoara`) animates live price bars comparing `CFR Călători (63.00 LEI)`, `Softrans (35.00 LEI)`, `TFC (28.50 LEI)`, and `Regio Călători (24.50 LEI)` with a golden honey savings badge.
   - Strictly zero `<canvas>`, `<map>`, or `.leaflet-container` elements. Ensure `npx --prefix frontend tsc --noEmit` and `npm --prefix frontend test -- homePage.test.tsx` pass 100%.
