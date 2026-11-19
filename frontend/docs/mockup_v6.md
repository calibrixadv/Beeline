Act as a Principal Creative Technologist & Interactive Motion Engineer.

Implement **Variant 6 (`frontend/src/components/hive-tour/chapter1-mockups/Variant6MagneticHoneyPortal.tsx`)** in extreme detail and wire it into the `"v6"` tab of `QueenBeesSection.tsx` (setting `"v6"` as the default active tab):

1. **Liquid Honey Hexagonal Portals Floating on the Background:**
   - Render 3 organic, multi-ring **SVG Liquid Honey Portals** (`data-testid="queen-card-safe"`, `queen-card-fast`, `queen-card-economy`) floating directly over `CozyHoneyBackground` with rotating SVG dashed aura rings, dripping golden nectar accents, and `RoyalCrownSvg`.
   - Preserve all required test strings (`Queen Transfer Guard`, `Queen Express Scout`, `Queen Nectar Saver`, `Queen Meli`, `Queen Vira`, `Queen Flora`) and `MiniWorkerBee` (`data-mini-bee-variant`).

2. **Cursor-Following Magnetic Worker Bee Swarm (`requestAnimationFrame` Spring Physics):**
   - Render a live swarm of 12–15 `MiniWorkerBee` units that smoothly follow and orbit the user's cursor as it moves across the section (clamped within the section bounds and disabled automatically when `prefers-reduced-motion: reduce` is active).
   - As the cursor enters Queen Meli's zone, the magnetic swarm morphs into Emerald Guard Bees (`safe` halo shields); near Queen Vira, it morphs into Supersonic Blue Bees (`fast` speed dashes); near Queen Flora, it morphs into Golden Nectar Bees (`economy` pollen drops).

3. **Morphing "Live Corridor Telemetry Ribbon" Below the Portals:**
   - Directly below the 3 portals, render a unified, sleek glassmorphic **Telemetry Control Ribbon** that dynamically morphs its color theme, interactive train timeline (`IR 1570`, `IR 1572`, `RE 7570`), and interactive simulation controls (`[ Simulate +20m Delay ]`, `[ Toggle Express Priority ]`, `[ Compare Operator Fares ]`) based on the currently active/hovered Queen Portal.
   - Strictly zero `<canvas>`, `<map>`, or `.leaflet-container`. Verify `tsc --noEmit` and `homePage.test.tsx` pass 100%.
