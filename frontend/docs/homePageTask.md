Act as a Principal Frontend Architect and Interactive SVG Motion Designer.

Inspect `frontend/src/components/hive-tour/QueenBeesSection.tsx` (and any imported files in `frontend/src/components/hive-tour/chapter1-mockups/`).
Currently, Chapter 1 renders **TWO separate route preview panels** stacked below the 3 Queen Sanctuaries (the top interactive stage from Design 4 AND a second appended beehive route preview below it), and the beehive line looks almost identical across all 3 plans.

Your mission is to fix this immediately by following the strict checklist below.

---

## 1. FREEZE CONTRACT & INVARIANTS

1. **DO NOT TOUCH OTHER SECTIONS:** Leave `frontend/src/app/page.tsx`, `CozyHoneyBackground.tsx`, `TransitHoneycombSection.tsx`, `CozyHiveSection.tsx`, and `ScrollCompanionMascot.tsx` 100% untouched.
2. **STRICT INVARIANT 1:** Zero `<canvas>`, `<map>`, or `.leaflet-container` elements anywhere (`container.querySelectorAll('.leaflet-container, canvas, map').length === 0`).
3. **PRESERVE TEST CONTRACTS:** Keep `id="tour-queens"`, `data-testid="queen-card-safe|fast|economy"`, `data-testid="open-portal-safe|fast|economy"`, `data-testid="queen-route-preview"`, `data-testid="preview-beehive-station"`, and `data-testid="route-preview-bee-locomotive"`.

---

## 2. IMPLEMENTATION CHECKLIST

### STEP 1: Eliminate the 2nd Route Preview — Keep ONLY the Top Preview Stage
- [ ] **1.1 Deduplicate the Previews:**
  - Remove the second/bottom route preview block completely so there is **STRICTLY ONE route preview panel** in Chapter 1: the top preview container positioned directly below the 3 Queen Hex-Sanctuaries (`id="queen-route-preview"`, `data-testid="queen-route-preview"`).
  - Remove any leftover bottom sub-panel (such as the duplicate `"PLAN 1: RELIABILITY..."` strip below the map) so everything lives cleanly inside that single top preview stage.
  - Ensure clicking **`Open Portal`** (`data-testid="open-portal-safe|fast|economy"`) on any Queen Sanctuary selects that Queen and scrolls smoothly directly to this single top preview stage.

### STEP 2: Make the 3 Plans Visually & Structurally Distinct Inside the Single Beehive Preview
Inside the single top preview stage (`#queen-route-preview`), render the **7 Beehive Stations (`data-testid="preview-beehive-station"`)** and the **Queen-Colored Bee Locomotive (`data-testid="route-preview-bee-locomotive"`)**, but give each Queen a **radically different visual route geometry, bee speed, and station behavior** so a user can tell the difference in 1 second:

- [ ] **2.1 QUEEN MELI (`safe` • Emerald `#10B981`) — "The Shielded Transfer Buffer Geometry":**
  - **Visual Route Layout:** Render a **2-Leg Connected Route** (`Leg 1: Point A -> Meadow -> Sunny Creek` meeting at a **Giant Shielded Central Transfer Beehive**, followed by `Leg 2: Central Transfer Hive -> Amber Ridge -> Orchard -> Point B`).
  - **Visual Difference:** Around `Central Junction Hive`, draw a large, pulsing **Emerald Error-Margin Dome (`🛡️ +20 min Built-In Delay Margin`)** with a visual buffer meter showing how it absorbs delays from other trains.
  - **Bee Animation & Controls:** The Emerald Bee flies along Leg 1, passes through the glowing Emerald Buffer Shield at the Central Hive, and reaches **Point B (`100% ON TIME ✅`)**. Keep the 1-click toggle (`[ On-Time First Leg ]` vs `[ +15 min Delay on Leg 1 ]`) directly in the header of this single preview so the user sees the green buffer bar absorb the `+15 min` delay while Point B arrival stays locked on time.
  - **Consumer Message:** *"You always arrive on time at Point B—our built-in margin of error automatically accounts for extra buffer time in case another train runs late."*

- [ ] **2.2 QUEEN VIRA (`fast` • Electric Blue `#3B82F6`) — "The Supersonic Direct Bypass Arc":**
  - **Visual Route Layout:** Do NOT draw a flat line through the middle hives! Instead:
    1. Push the 5 intermediate Beehive stations (`Meadow Vale`, `Sunny Creek`, `Central Junction`, `Amber Ridge`, `Orchard Valley`) down into a dimmed, faded lower track (`opacity-30 grayscale`, labeled `"Bypassed • 0 Wasted Stops"`).
    2. Draw a bold, elevated **Supersonic Electric-Blue Express Arch** curving high above the skipped hives directly from **`Point A • Origin Hive`** straight to **`Point B • Destination Hive`**.
  - **Bee Animation & Controls:** The Electric Blue Bee (`data-testid="route-preview-bee-locomotive"`) streaks at **3x high speed** with supersonic speed-lines along the upper direct arch nonstop from Point A to Point B (`0 Stops • Fastest Possible Time: 1h 40m vs 2h 35m`).
  - **Consumer Message:** *"There is simply no faster route from Point A to Point B—fly nonstop past every slow intermediate halt."*

- [ ] **2.3 QUEEN FLORA (`economy` • Golden Honey `#D97706`) — "The Calm, Unrushed Scenic Wave with Longer Stops":**
  - **Visual Route Layout:** Draw a **Warm, Wavy Scenic Golden-Honey Path** (a gentle sinusoidal SVG curve) that weaves leisurely through **ALL 7 Beehive Stations**, where every single intermediate Beehive glows warmly and displays a floating **Relaxed Stop Pill** above it (`☕ +12m Calm Stop`, `🍯 +15m Scenic Break`, `🌿 +15m Unrushed Pause`, `☕ +10m Stretch Legs`, `🍯 +12m Relaxed Stop`) plus floating golden coin/honey-drop savings badges (`-40% Fare`).
  - **Bee Animation & Controls:** The Golden Honey Bee glides at a **calm, unhurried, gentle pace** along the wavy path, pausing softly at each Beehive station. Clicking any Beehive highlights its calm stop duration and pocket savings.
  - **Consumer Message:** *"A calm, unhurried route with longer stops along the way—built for when you are not in a rush, don't need to arrive by a strict time, and want to pay the lowest price."*

### STEP 3: Self-Verification & Audit Report Update
- [ ] Run `npx --prefix frontend tsc --noEmit` -> verify **0 TypeScript errors**.
- [ ] Run `npm --prefix frontend test -- homePage.test.tsx` -> verify **all unit tests pass (100% green)**.
- [ ] Update `frontend/docs/CHAPTER1_STAGE_REPORT.md` confirming that the duplicate second preview was removed and detailing the 3 distinct visual geometries inside the single unified top preview.
