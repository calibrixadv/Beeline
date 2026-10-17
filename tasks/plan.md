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

### Checkpoint 4: Complete & Clean Build
- [x] `npm test`: 100% passing test suites
- [x] `npm run test:storybook`: 100% passing automated story interaction tests
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `AI_LOG.md` remains strictly untouched

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Animation Performance / Janks** | High | Use pure CSS keyframes on web and native driver on mobile; keep particle count low (8–10 dots); set `pointerEvents="none"` |
| **WCAG Contrast on Dominant Yellow** | High | Enforce roasted charcoal (`#1C1917`) on warm yellow/honey surfaces; never place white text on yellow |
| **Test Suite Regressions** | Med | Extend `ThemeColors` rather than replacing existing keys; maintain existing testIDs on key interactive elements |
| **Accidental Route Redirection** | High | Retain explicit unit tests in `RouteFinderCard.test.tsx` and `indexRoute.test.tsx` asserting `router.push` is NOT called |

---

## Open Questions
- None. Requirements, mascot personalities, palette tokens, and motion strategies are fully specified in `docs/ideas/cozy-bee-homepage-redesign.md`.
