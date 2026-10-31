# Implementation Plan: "The Cozy Hive" Frontpage & Honey Theme Redesign

## Overview
Implement "The Cozy Hive" redesign specified in `docs/ideas/cozy-bee-homepage-redesign.md`. The redesign shifts the Beeline visual language to a warm, dominant honey/amber palette, introduces the Trifecta Mascot Squad (Barnaby the Scout, Honey the Hive Saver, Bumble the Buffer Guard) with companion route reward badges, adds a zero-jank animated ambient background (floating golden pollen and subtle honeycomb watermarks), and brings animated "Waggle Flight Paths" to Romanian transit corridors. All existing scopes—the shorthand 2-point route search, diacritic-insensitive duplicate validation, zero page redirection, zero map, and Romanian transit corridor focus—are strictly preserved.

---

## Architecture Decisions
- **Zero-Dependency Vector Mascot System**: Implement `MascotBee` and `RouteRewardBadge` using composite React Native primitives (`View`, `Text`, `StyleSheet`) and `@expo/vector-icons` (`MaterialCommunityIcons`, `Ionicons`). This avoids heavy external binary libraries (e.g. Lottie, full SVG parsers) and guarantees 100% compatibility across Expo Web, iOS, Android, Jest, and Storybook without native build linking risks.
- **Global "Cozy Honey" Theme Extension**: Enhance `ThemeContext.tsx` with dedicated honey/amber tokens (`brandHoney`, `brandAmber`, `brandCream`, `surfaceWarm`, `textCharcoal`) while maintaining full backwards compatibility with existing `brandYellow`, `primary`, and `surface` tokens.
- **Performant Ambient Background (`CozyHoneyBackground`)**: Render floating golden pollen particles using lightweight CSS keyframe animations on Web and `Animated.timing` loops on native platforms, isolated in an absolute layer with `pointerEvents="none"` to prevent layout recalculation or interference with interactive cards. Respect `prefers-reduced-motion`.
- **Mascots on Home ➔ Reward Badges on Routes**: On the HomePage, full companion mascots explain the value props. Downstream (prepared in `RouteRewardBadge`), mascots transform into sleek reward badges (Lightning Wing, Nectar Jar, Honey Shield) stamped on qualifying route results.
- **Strict Invariants Preserved**:
  - ZERO map on HomePage.
  - ZERO page redirection on `RouteFinderCard` submission.
  - 100% test suite pass rate (Jest unit tests + Storybook automated story tests).

---

## Task List

### Phase 1: Foundation (Theme Tokens & Mascot Primitives)
- [x] **Task 1**: Extend `ThemeContext.tsx` with "Cozy Honey" tokens for Light and Dark modes with full backwards compatibility and updated theme unit tests.
- [x] **Task 2**: Build `MascotBee.tsx` (Barnaby, Honey, Bumble) and `RouteRewardBadge.tsx` with micro-motions, Storybook CSF 3 stories, and unit tests.

### Checkpoint 1: Foundation Verification
- [x] All theme and mascot unit tests pass
- [x] Storybook renders all mascot and badge variants cleanly
- [x] Zero TypeScript compiler errors under strict mode

### Phase 2: Ambient Atmosphere & Marketing Showcase Redesign
- [x] **Task 3**: Build `CozyHoneyBackground.tsx` with floating golden pollen particles, subtle honeycomb watermark, and reduced-motion support.
- [x] **Task 4**: Redesign `MarketingShowcase.tsx` with honey-soaked hero banner, Waggle flight paths for Romanian corridors, and the Mascot Trifecta showcase cards.

### Checkpoint 2: Showcase & Motion Verification
- [x] Ambient background renders at 60fps without layout reflows
- [x] Corridor cards display animated waggle paths and respond to interaction
- [x] `MarketingShowcase.test.tsx` and stories pass 100%

### Phase 3: Route Finder Alignment & Home Screen Integration
- [x] **Task 5**: Enhance `RouteFinderCard.tsx` with warm honey borders, waggle flight connector between origin/destination, and embed the Trifecta mascot companions in the submission preview banner (preserving zero-redirect).
- [x] **Task 6**: Integrate `CozyHoneyBackground` into `HomeScreen` (`frontend/app/index.tsx`) and harmonize layout, transitions, and dark mode toggling.

### Checkpoint 3: Full Integration Verification
- [x] Zero redirection executed on route finder submission
- [x] Zero map elements present on the screen
- [x] Light and Dark modes render with seamless visual warmth

### Phase 4: Master Test Suite, Storybook & Documentation Sync
- [x] **Task 7**: Synchronize all Storybook CSF 3 interaction stories and Jest test suites (`storybookAuto.test.tsx`, `indexRoute.test.tsx`).
- [x] **Task 8**: Update `COMPONENTS.md`, `frontend/COMPONENTS.md`, and `PLAN_AND_STATUS.md` with the new component catalog and verification metrics.
- [x] **Task 9**: Resolve text overlaps, connector wrapping, and dark mode contrast discordances on HomeScreen.
- [x] **Task 10**: Streamline MarketingShowcase, remove duplicate feature cards, fabricated metrics, and fake navigation transitions.

### Phase 5: Romanian Transit Multi-Modal Schedule Screen
- [x] **Task 11**: Implement `/schedules` screen with dual-section switcher (Urban Transit vs Intercity Rail), Romanian transit provider templates (Metrorex, Transurb Galați, STB, CFR Călători, Astra Trans Carpatic, TFC, Softrans, Regio Călători), distance-based location filtering, expandable stop timeline accordion, and zero map implementation.

### Phase 6: Mainpage Route Finder Dropdowns & Smart Location Selection
- [x] **Task 12**: Update `RouteFinderCard.tsx` and `HomeScreen` with Current City selector (GPS "Detect Near Me" + Romanian city quick chips), searchable featured location dropdowns (`LocationSelectDropdown.tsx`), smart inner-city and inter-city pairing heuristics, recent choices history, and direct link to live departures on `/schedules`.

### Phase 7: Simplified Single-Screen Hero with Beeline Branding & Gear-Shifting Mascot
- [x] **Task 18**: Redesign `MascotBee.tsx` into a unified high-fidelity Beeline mascot that dynamically shifts gear (`default`, `fast`, `safe`, `economy`) with smooth vector animations, `React.useId` scoped gradient defs, WebKit-compliant `transform-box: fill-box` wing rotations, and backwards compatibility.
- [x] **Task 19**: Update branding in `Navbar.tsx`, `layout.tsx`, and `my-trip/page.tsx` to "Beeline" with unified mascot integration and rebranded exports.
- [x] **Task 20**: Build exact screen-size hero on `frontend/src/app/page.tsx` with prominent `h1` Beeline title, disruptive punchline, responsive 2-column layout (`md:grid-cols-12`) with non-clipping `100dvh` viewport handling, integrated 2-point corridor search, and dynamic mascot gear switching upon route selection (ZERO map invariant strictly enforced).
- [x] **Task 21**: Verify quality gates (`npm run type-check`, `npm run build`, `npm test`, `pytest`) with zero regressions and expanded edge case test coverage.

### Checkpoint 7: Clean Build & Full Verification
- [x] `npm test`: 4 test suites, 22 tests passed (100%)
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `npm run build`: Production Next.js build succeeds with 7/7 static pages generated
- [x] `pytest backend/tests/ -v`: 21 backend tests passed (100%)
- [x] Zero map elements on HomePage
- [x] `AI_LOG.md` remains strictly untouched

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Animation Performance / Janks** | High | Use pure CSS keyframes on web and native driver on mobile; keep particle count low (8–10 dots); set `pointerEvents="none"` |
| **WCAG Contrast on Dominant Yellow** | High | Enforce roasted charcoal (`#1C1917`) on warm yellow/honey surfaces; never place white text on yellow |
| **Test Suite Regressions** | Med | Retain backwards-compatible persona names (`barnaby`, `honey`, `bumble`) while supporting new gears (`default`, `fast`, `safe`, `economy`) |
| **Accidental Map Inclusion** | Critical | Enforce Strict Invariant 1: zero map elements or leafleft/mapbox scripts on HomePage |

---

## Open Questions
- None. Scope and constraints are fully clear from `<original_task>`.

