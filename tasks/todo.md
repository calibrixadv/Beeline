# Task List: "The Cozy Hive" Frontpage & Honey Theme Redesign

## Task 1: Extend ThemeContext with Cozy Honey Palette Tokens
**Description:** Enhance `frontend/src/context/ThemeContext.tsx` with "Cozy Honey" design tokens (`brandHoney`, `brandAmber`, `brandCream`, `surfaceWarm`, `textCharcoal`, `honeyBorder`) for both Light and Dark themes. Maintain 100% backwards compatibility with existing tokens (`brandYellow`, `primary`, etc.) and ensure roasted charcoal typography meets WCAG AAA contrast on yellow surfaces.
**Acceptance criteria:**
- [x] `ThemeColors` interface includes cozy honey tokens (`brandHoney`, `brandAmber`, `brandCream`, `surfaceWarm`, `textCharcoal`, `honeyBorder`).
- [x] `lightColors` defines warm honeycomb cream backgrounds (`#FFFDF7`), warm honey surfaces, amber accents (`#F59E0B`, `#D97706`), and roasted charcoal text (`#1C1917`).
- [x] `darkColors` defines "Golden Hive at Night" obsidian backgrounds (`#121110`), espresso surfaces (`#1C1917`), and glowing amber accents (`#F59E0B`).
- [x] All existing tokens remain valid and functional for existing components.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/ThemeContext.test.tsx`
- [x] Type check passes: `npm run type-check`
**Dependencies:** None
**Files likely touched:**
- `frontend/src/context/ThemeContext.tsx`
- `frontend/__tests__/ThemeContext.test.tsx`
**Estimated scope:** S (2 files)

---

## Task 2: Build MascotBee & RouteRewardBadge Vector Components
**Description:** Implement `MascotBee.tsx` (supporting the 3 companion personas: `barnaby`, `honey`, `bumble` across `sm`, `md`, `lg` sizes with optional wing flutter micro-animation) and `RouteRewardBadge.tsx` (compact reward badges: `lightning`, `nectar`, `shield` for downstream route card integration) using composite React Native primitives and `@expo/vector-icons`.
**Acceptance criteria:**
- [x] `MascotBee` renders Barnaby (Scout Bee with lightning icon), Honey (Hive Saver with nectar/coin jar), and Bumble (Buffer Guard with shield & scarf).
- [x] Wing flutter animation operates smoothly via React Native `Animated` or CSS keyframes when `animated={true}` is set.
- [x] `RouteRewardBadge` renders compact, accessible reward badges representing each Trifecta pillar.
- [x] Exports components cleanly in `frontend/src/components/index.ts`.
- [x] Includes Storybook CSF 3 stories for all mascot and reward badge variants.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/MascotBee.test.tsx`
- [x] Storybook tests pass: `npm run test:storybook`
**Dependencies:** Task 1
**Files likely touched:**
- `frontend/src/components/MascotBee.tsx`
- `frontend/src/components/RouteRewardBadge.tsx`
- `frontend/src/components/index.ts`
- `frontend/src/components/stories/MascotBee.stories.tsx`
- `frontend/src/components/stories/RouteRewardBadge.stories.tsx`
- `frontend/__tests__/MascotBee.test.tsx`
**Estimated scope:** M (6 files)

---

## Checkpoint 1: Foundation Verification
- [x] All theme and mascot tests pass
- [x] Storybook renders all mascot and badge stories cleanly
- [x] TypeScript strict mode reports 0 errors

---

## Task 3: Build CozyHoneyBackground with Floating Pollen & Watermark
**Description:** Create `CozyHoneyBackground.tsx` rendering an ambient, cozy background featuring 8–10 floating golden pollen particles that drift with gentle opacity breathing, accompanied by a subtle hexagonal honeycomb watermark. The background must be pointer-transparent (`pointerEvents="none"`) and respect `prefers-reduced-motion`.
**Acceptance criteria:**
- [x] Renders floating golden pollen specks with non-blocking absolute positioning.
- [x] Smooth CSS animation on Web and native `Animated` loop fallback on mobile (60fps, 0 jank).
- [x] Disables motion when `prefers-reduced-motion` is detected or when `animated={false}`.
- [x] Adapts smoothly across Light and Dark themes.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/CozyHoneyBackground.test.tsx`
- [x] Storybook tests pass: `npm run test:storybook`
**Dependencies:** Task 1
**Files likely touched:**
- `frontend/src/components/CozyHoneyBackground.tsx`
- `frontend/src/components/index.ts`
- `frontend/src/components/stories/CozyHoneyBackground.stories.tsx`
- `frontend/__tests__/CozyHoneyBackground.test.tsx`
**Estimated scope:** S (4 files)

---

## Task 4: Redesign MarketingShowcase with Honey Hero & Waggle Corridors
**Description:** Redesign `frontend/src/components/MarketingShowcase.tsx` to embody "The Cozy Hive": warm honey-soaked hero banner, Mascot Trifecta showcase cards featuring Barnaby, Honey, and Bumble, and animated "Waggle Flight Paths" connecting Romanian transit corridors (`București Nord ⇄ Brașov`, `Constanța`, `Cluj`, `Viena`).
**Acceptance criteria:**
- [x] Hero showcase adopts warm honey palette and friendly bee messaging ("Make a beeline across Romania & Europe").
- [x] Three pillar cards feature the Mascot Trifecta (Barnaby, Honey, Bumble) explaining the algorithmic value propositions.
- [x] Featured corridor cards display an animated/styled Waggle flight trail connecting origin and destination stations.
- [x] Retains all existing testIDs, corridor data, and interactive callbacks (`onExplorePress`, `onCorridorPress`).
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/MarketingShowcase.test.tsx`
- [x] Storybook tests pass: `npm run test:storybook`
**Dependencies:** Tasks 1, 2, 3
**Files likely touched:**
- `frontend/src/components/MarketingShowcase.tsx`
- `frontend/src/components/stories/MarketingShowcase.stories.tsx`
- `frontend/__tests__/MarketingShowcase.test.tsx`
**Estimated scope:** M (3 files)

---

## Checkpoint 2: Showcase & Motion Verification
- [x] Ambient background renders without layout reflows
- [x] Marketing showcase displays the Mascot Trifecta and Waggle flight trails
- [x] All corridor cards remain interactive with clean callbacks

---

## Task 5: Enhance RouteFinderCard with Honey Accents & Mascot Preview
**Description:** Update `frontend/src/components/RouteFinderCard.tsx` with warm honey borders, a subtle waggle flight connector between origin and destination inputs, and enhance the non-redirecting Curated Trifecta submission feedback banner to feature Barnaby, Honey, and Bumble companions.
**Acceptance criteria:**
- [x] Inputs and transport filters (`Trains`, `Metro`, `Busses`) feature warm honey focus borders and chips.
- [x] Origin/destination fields include a styled waggle flight dashed trail indicator.
- [x] Submission banner presents the 3 Trifecta preview cards with the respective Mascot companion icons.
- [x] Strictly preserves the **zero-redirect** constraint on submission and diacritic-insensitive duplicate validation.
- [x] Modifying inputs immediately clears the preview banner.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/RouteFinderCard.test.tsx`
- [x] Storybook tests pass: `npm run test:storybook`
**Dependencies:** Tasks 1, 2
**Files likely touched:**
- `frontend/src/components/RouteFinderCard.tsx`
- `frontend/src/components/stories/RouteFinderCard.stories.tsx`
- `frontend/__tests__/RouteFinderCard.test.tsx`
**Estimated scope:** M (3 files)

---

## Task 6: Integrate CozyHoneyBackground into HomeScreen & Theme Harmony
**Description:** Integrate `CozyHoneyBackground` into `frontend/app/index.tsx`, harmonizing the screen layout with the warm honey palette, updating transitional loader messages with cozy bee references, and verifying zero map and zero redirect invariants.
**Acceptance criteria:**
- [x] `HomeScreen` wraps scroll content in `CozyHoneyBackground`.
- [x] Preserves responsive mobile and web layout without any map element.
- [x] Transitions and active trip indicators harmonize across Light and Dark modes.
- [x] Submission handler remains strictly non-redirecting.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/indexRoute.test.tsx`
- [x] Build succeeds: `npm run build`
**Dependencies:** Tasks 3, 4, 5
**Files likely touched:**
- `frontend/app/index.tsx`
- `frontend/__tests__/indexRoute.test.tsx`
**Estimated scope:** S (2 files)

---

## Checkpoint 3: Full Integration Verification
- [x] Zero redirection executed on route finder submission
- [x] Zero map elements present on the screen
- [x] Light and Dark modes render with seamless visual warmth

---

## Task 7: Synchronize Storybook Stories & Automated Test Suite
**Description:** Update automated Storybook interaction tests and full test suites to ensure 100% test coverage across all new and updated components.
**Acceptance criteria:**
- [x] `storybookAuto.test.tsx` discovers and executes stories for `MascotBee`, `RouteRewardBadge`, `CozyHoneyBackground`, `MarketingShowcase`, and `RouteFinderCard`.
- [x] All 30+ test suites pass with 0 failures and 0 warnings.
- [x] TypeScript strict type check passes with 0 errors.
**Verification:**
- [x] `npm test`: All test suites pass
- [x] `npm run test:storybook`: All story interaction tests pass
- [x] `npm run type-check`: 0 errors
**Dependencies:** Tasks 1-6
**Files likely touched:**
- `frontend/__tests__/storybookAuto.test.tsx`
- Any updated test fixtures
**Estimated scope:** S (2 files)

---

## Task 8: Master Documentation & Catalog Synchronization
**Description:** Update `COMPONENTS.md`, `frontend/COMPONENTS.md`, and `PLAN_AND_STATUS.md` documenting the new `MascotBee`, `RouteRewardBadge`, and `CozyHoneyBackground` components, the updated theme tokens, and verified test metrics.
**Acceptance criteria:**
- [x] Documents `MascotBee`, `RouteRewardBadge`, and `CozyHoneyBackground` in component catalogs.
- [x] Updates test status matrices and design system documentation in `PLAN_AND_STATUS.md`.
- [x] `AI_LOG.md` remains strictly untouched.
**Verification:**
- [x] Manual inspection of markdown links and tables
- [x] `git status` verifies clean tree
**Dependencies:** Tasks 1-7
**Files likely touched:**
- `COMPONENTS.md`
- `frontend/COMPONENTS.md`
- `PLAN_AND_STATUS.md`
**Estimated scope:** XS (3 markdown files)

---

## Checkpoint 4: Complete & Clean Build
- [x] `npm test`: 100% test suites pass
- [x] `npm run test:storybook`: 100% story interaction tests pass
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] Ready for review

---

## Task 9: Resolve Text Overlaps, Connector Wrapping, and Theme Contrast Discordances on HomeScreen
**Description:** Eliminate text clipping, awkward wrapping breaks, and illegible dark-mode tokens on `HomeScreen`, `RouteFinderCard`, and `MarketingShowcase`.
**Acceptance criteria:**
- [x] Remove awkward `flexWrap: 'wrap'` on flight paths and waggle connectors; use `flexShrink: 0` for glyphs/icons and `flex: 1` / `flexShrink: 1` for cities and labels.
- [x] Fix low-contrast dark tokens: ensure Curated Trifecta card metadata (`trifectaCardMeta`) uses `#F59E0B` in dark mode (>5.4:1 contrast ratio against `#292524`), not unreadable dark brown `#3E3204`.
- [x] Replace residual cold zinc `#27272A` with warm stone `#292524`.
- [x] Enforce consistent line heights (`lineHeight`) across all headers and labels preventing text overlap/clipping on compact devices.
- [x] Add tests asserting `flexShrink`, high contrast colors in dark mode, and layout stability.
- [x] Verify 100% pass rate across Jest, Storybook, and TypeScript strict checks.
**Verification:**
- [x] `npm test`: 32 suites, 418 tests passed
- [x] `npm run test:storybook`: 188 story tests passed
- [x] `npm run type-check`: 0 errors
- [x] `AI_LOG.md`: Strictly untouched
