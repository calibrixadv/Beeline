Act as a Principal Creative Technologist & Declarative SVG Architect.

Implement **Variant 4 (`frontend/src/components/hive-tour/chapter1-mockups/Variant4LivingRailTrack.tsx`)** in extreme detail and wire it into the `"v4"` tab of `QueenBeesSection.tsx` (setting `"v4"` as the default active tab):

1. **Zero Rectangular Cards — Sweeping SVG Mainline Railway Track on the Background:**
   - Draw an intricate, curved **SVG Dual-Rail Mainline Track with Wooden Sleepers, Railway Switches (Macazuri), Signal Lights, and 25kV Catenary Arches** winding organically directly over `CozyHoneyBackground`.
   - Position 3 monumental **Double-Hexagon Royal Hive Portals** (`data-testid="queen-card-safe"`, `queen-card-fast`, `queen-card-economy`) along the railway track (Left-Top: **Queen Meli**, Center-Right: **Queen Vira**, Bottom-Left/Center: **Queen Flora**), each surrounded by orbiting `MiniWorkerBee` units (`data-mini-bee-variant`).

2. **Interactive Railway Switch (Macaz) & Train Pulse Choreography:**
   - Animate a glowing SVG Express Train + Nectar Pulse traveling continuously along the active branch of the railway track toward the selected Queen's Hex-Node.
   - When the user clicks a Queen's Hex-Node, animate the SVG railway switch (macaz) shifting tracks, change the SVG railway signal aspect (Emerald Green double-aspect for Meli, Supersonic Blue flash for Vira, Golden Amber aspect for Flora), and trigger `onSelectGear`.

3. **Floating Holographic Glass HUD Inspector:**
   - Beside the active Hex-Node, float a frameless, angled railway HUD overlay (`backdrop-blur-md bg-stone-950/85 text-amber-50 border border-amber-400/40`) with interactive telemetry tabs (`[ Live Telemetry ]`, `[ ML Model Proof ]`, `[ Try Sample Train ]`) where the user can trigger a live simulated dispatch of `IR 1572`, `IC 531`, or `RE 7570`.
   - Preserve all required test strings (`Queen Transfer Guard`, `Queen Express Scout`, `Queen Nectar Saver`, `Queen Meli`, `Queen Vira`, `Queen Flora`) and strictly zero `<canvas>`, `<map>`, or `.leaflet-container`. Verify `tsc --noEmit` and `homePage.test.tsx` pass 100%.
