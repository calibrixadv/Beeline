Act as a Principal Frontend Architect & 3D CSS/SVG Motion Specialist.

Implement **Variant 2 (`frontend/src/components/hive-tour/chapter1-mockups/Variant2SpatialPopOut.tsx`)** in extreme detail and wire it into the `"v2"` tab of `QueenBeesSection.tsx` (setting `"v2"` as the default active tab so it is immediately visible):

1. **Out-of-Bounds Pop-Out Architecture:**
   - Render 3 low-profile, translucent warm-wax glassmorphic cards (`backdrop-blur-md bg-amber-50/45 border border-amber-300/60 shadow-2xl`, `data-testid="queen-card-safe"`, `queen-card-fast`, `queen-card-economy`).
   - Position the upper 55% of each `MascotBee` (`Queen Meli`, `Queen Vira`, `Queen Flora`) and her `RoyalCrownSvg` **outside the top edge of the card (`-mt-20`)** so the mascot floats directly over the `CozyHoneyBackground` honeycomb lattice, surrounded by orbiting `MiniWorkerBee` swarms (`data-mini-bee-variant`).
   - Cast a dynamic colored ambient floor aura (`emerald-500/20`, `blue-500/20`, `amber-500/20`) beneath each card onto the page background.

2. **Real-Time 3D Mouse Tilt & Inverse Mascot Parallax:**
   - Track mouse coordinates over each card to compute smooth 3D perspective transforms (`perspective(1000px) rotateX(...) rotateY(...)`, clamped to `+-10deg`, bypassed on `prefers-reduced-motion`).
   - Apply counter-parallax translation (`translate3d`) to the popped-out Queen Bee, her Royal Crown, and the 5 Mini Worker Bees so they appear to levitate in 3D space in front of the glass surface.

3. **De-Cluttered Front + Interactive Expandable Telemetry Drawer:**
   - Keep the default card face clean and scannable: Queen Name & Title (`Queen Meli • Queen Transfer Guard`, `Queen Vira • Queen Express Scout`, `Queen Flora • Queen Nectar Saver`), 1 hero metric badge (`96/100 Buffer`, `0 Stopovers`, `-40% LEI`), and an interactive **"⚡ Live Rail Telemetry"** toggle button + mini animated SVG train track preview.
   - Clicking the card or toggle button smoothly expands a glassmorphic drawer inside the card containing an interactive station/train inspection widget (junction buffer switcher for Meli, IC vs RE speed bar for Vira, multi-operator ticket selector for Flora).
   - Strictly zero `<canvas>`, `<map>`, or `.leaflet-container`. Verify `tsc --noEmit` and `homePage.test.tsx` pass 100%.
