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

---

## Task 11: Implement Romanian Multi-Modal Transit Schedule Screen
**Description:** Implement comprehensive `/schedules` screen featuring dual sections (Urban Transit: Tram, Bus, Metro vs Intercity Rail: Train), location-based filtering with city quick-pick chips and GPS detection, Romanian transit providers (Metrorex, Transurb Galați, STB, CFR Călători, Astra Trans Carpatic, TFC, Softrans, Regio Călători), and a backend-ready template service layer.
**Acceptance criteria:**
- [x] Create `frontend/src/types/schedule.ts` defining `TransitMode`, `TransitProvider`, `TransitLineSchedule`, `ScheduleSection`.
- [x] Create `frontend/src/data/romanianTransitTemplates.ts` with templates for Metrorex, Transurb Galați, STB, CTP Cluj, STPT Timișoara, CFR, Astra, TFC, etc.
- [x] Create `frontend/src/services/transitScheduleService.ts` supporting filtering by section, city, mode, operator, query, and coordinate distance resolution.
- [x] Create `frontend/src/components/TransitScheduleCard.tsx` with live departure pills, mode badges, fare in LEI, and expandable stopover timeline.
- [x] Create `frontend/app/schedules.tsx` with dual-section switcher, location filter bar, mode & provider chips, real-time search, and zero map.
- [x] Update `Navbar.tsx` and `_layout.tsx` to register and link `/schedules`.
- [x] Add Storybook stories in `TransitScheduleCard.stories.tsx` and register in `storybook.requires.ts`.
- [x] Add unit tests in `transitScheduleService.test.ts` and integration tests in `schedulesRoute.test.tsx`.
- [x] Update `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 34 suites, 440 tests passed
- [x] `npm run test:storybook`: 196 story tests passed
- [x] `npm run type-check`: 0 errors
- [x] `npm run build:web`: Export succeeded
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 12: Mainpage Route Finder Dropdowns & Smart Location Selection
**Description:** Update `RouteFinderCard.tsx` and `HomeScreen` with a Current City selector (GPS "Detect Near Me" + Romanian city quick chips), searchable featured location dropdowns (`LocationSelectDropdown.tsx`), smart inner-city and inter-city pairing heuristics, recent choices history, and direct link to live departures on `/schedules`.
**Acceptance criteria:**
- [x] Create `frontend/src/data/featuredLocations.ts` with Romanian transit hubs categorized by city, type, and transport modes, plus smart suggestion helper `smartSuggestOrigin`.
- [x] Create `frontend/src/components/LocationSelectDropdown.tsx` with sections for GPS current location, recent searches, featured city hubs, and major outside rail hubs.
- [x] Update `RouteFinderCard.tsx` with Current City selector bar, searchable origin & destination dropdowns, inner-city vs inter-city smart heuristics, recent choices memory, and `View Live Schedules on /schedules` button.
- [x] Update `frontend/app/index.tsx` to forward schedule navigation transitions.
- [x] Add Storybook stories in `LocationSelectDropdown.stories.tsx` and `RouteFinderCard.stories.tsx` and register in `storybook.requires.ts`.
- [x] Add unit tests in `featuredLocations.test.ts`, `LocationSelectDropdown.test.tsx`, and update `RouteFinderCard.test.tsx`.
- [x] Update `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 36 suites, 475 tests passed
- [x] `npm run test:storybook`: 206 story tests passed
- [x] `npm run type-check`: 0 errors
- [x] `npm run build:web`: Export succeeded
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 13: Standardized Transit Route & Multi-Modal Itinerary Contract
**Description:** Establish a reusable, future-proof JSON and TypeScript contract (`TransitRoutePlan`) with mandatory coordinates (GeoJSON LineString compliant), entity naming hierarchies, transportation modes, multi-factor risk scores (Romanian Transfer Shield), multi-carrier fares, and carbon benchmarks.
**Acceptance criteria:**
- [x] Create `frontend/src/types/routePlan.ts` with root contract `TransitRoutePlan`, `TransitLeg`, `LegNames`, `LegCoordinates`, `RouteRiskAnalysis`, `EcoBenchmark`, and `RouteFareSummary`.
- [x] Create `frontend/src/types/index.ts` consolidating and re-exporting all type modules cleanly.
- [x] Create `frontend/src/services/riskScoreCalculator.ts` implementing the Romanian Transfer Shield risk engine.
- [x] Create `frontend/src/data/sampleRoutePlans.ts` providing canonical fixtures for multi-modal travel (`Micro 19 Galați ➔ Piața Unirii București`) and direct rail corridors (`București Nord ➔ Gara Brașov`).
- [x] Add unit tests in `riskScoreCalculator.test.ts` and `sampleRoutePlans.test.ts`.
- [x] Update `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 38 suites, 495 tests passed (100%)
- [x] `npm run test:storybook`: 206 story tests passed
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `AI_LOG.md`: Strictly untouched


---

## Task 10: Streamline Marketing Showcase & Remove Invented Behaviour on HomeScreen
**Description:** Remove redundant feature grids, fabricated metrics, fake aggregator claims, and fake timetable loading transitions; rewrite hero and mascot pillars with clean, authentic copy.
**Acceptance criteria:**
- [x] Remove duplicate 4-card feature grid (`marketing-feature-grid`).
- [x] Remove fabricated metrics bar (`marketing-metrics-card`) and aggregator trust banner (`marketing-trust-card`).
- [x] Transform Featured Corridors into static informative route cards without fake loading messages or navigation.
- [x] Replace developer path CTA (`Explore /trains Route`) with `Explore Trains`.
- [x] Rewrite companion mascot descriptions without promotional engineering jargon.
- [x] Update documentation in `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 32 suites, 415 tests passed
- [x] `npm run test:storybook`: 188 story tests passed
- [x] `npm run type-check`: 0 errors
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 11: Implement Romanian Multi-Modal Transit Schedule Screen
**Description:** Implement comprehensive `/schedules` screen featuring dual sections (Urban Transit: Tram, Bus, Metro vs Intercity Rail: Train), location-based filtering with city quick-pick chips and GPS detection, Romanian transit providers (Metrorex, Transurb Galați, STB, CFR Călători, Astra Trans Carpatic, TFC, Softrans, Regio Călători), and a backend-ready template service layer.
**Acceptance criteria:**
- [x] Create `frontend/src/types/schedule.ts` defining `TransitMode`, `TransitProvider`, `TransitLineSchedule`, `ScheduleSection`.
- [x] Create `frontend/src/data/romanianTransitTemplates.ts` with templates for Metrorex, Transurb Galați, STB, CTP Cluj, STPT Timișoara, CFR, Astra, TFC, etc.
- [x] Create `frontend/src/services/transitScheduleService.ts` supporting filtering by section, city, mode, operator, query, and coordinate distance resolution.
- [x] Create `frontend/src/components/TransitScheduleCard.tsx` with live departure pills, mode badges, fare in LEI, and expandable stopover timeline.
- [x] Create `frontend/app/schedules.tsx` with dual-section switcher, location filter bar, mode & provider chips, real-time search, and zero map.
- [x] Update `Navbar.tsx` and `_layout.tsx` to register and link `/schedules`.
- [x] Add Storybook stories in `TransitScheduleCard.stories.tsx` and register in `storybook.requires.ts`.
- [x] Add unit tests in `transitScheduleService.test.ts` and integration tests in `schedulesRoute.test.tsx`.
- [x] Update `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 34 suites, 440 tests passed
- [x] `npm run test:storybook`: 196 story tests passed
- [x] `npm run type-check`: 0 errors
- [x] `npm run build:web`: Export succeeded
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 12: Mainpage Route Finder Dropdowns & Smart Location Selection
**Description:** Update `RouteFinderCard.tsx` and `HomeScreen` with a Current City selector (GPS "Detect Near Me" + Romanian city quick chips), searchable featured location dropdowns (`LocationSelectDropdown.tsx`), smart inner-city and inter-city pairing heuristics, recent choices history, and direct link to live departures on `/schedules`.
**Acceptance criteria:**
- [x] Create `frontend/src/data/featuredLocations.ts` with Romanian transit hubs categorized by city, type, and transport modes, plus smart suggestion helper `smartSuggestOrigin`.
- [x] Create `frontend/src/components/LocationSelectDropdown.tsx` with sections for GPS current location, recent searches, featured city hubs, and major outside rail hubs.
- [x] Update `RouteFinderCard.tsx` with Current City selector bar, searchable origin & destination dropdowns, inner-city vs inter-city smart heuristics, recent choices memory, and `View Live Schedules on /schedules` button.
- [x] Update `frontend/app/index.tsx` to forward schedule navigation transitions.
- [x] Add Storybook stories in `LocationSelectDropdown.stories.tsx` and `RouteFinderCard.stories.tsx` and register in `storybook.requires.ts`.
- [x] Add unit tests in `featuredLocations.test.ts`, `LocationSelectDropdown.test.tsx`, and update `RouteFinderCard.test.tsx`.
- [x] Update `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 36 suites, 475 tests passed
- [x] `npm run test:storybook`: 206 story tests passed
- [x] `npm run type-check`: 0 errors
- [x] `npm run build:web`: Export succeeded
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 13: Standardized Transit Route & Multi-Modal Itinerary Contract
**Description:** Establish a reusable, future-proof JSON and TypeScript contract (`TransitRoutePlan`) with mandatory coordinates (GeoJSON LineString compliant), entity naming hierarchies, transportation modes, multi-factor risk scores (Romanian Transfer Shield), multi-carrier fares, and carbon benchmarks.
**Acceptance criteria:**
- [x] Create `frontend/src/types/routePlan.ts` with root contract `TransitRoutePlan`, `TransitLeg`, `LegNames`, `LegCoordinates`, `RouteRiskAnalysis`, `EcoBenchmark`, and `RouteFareSummary`.
- [x] Create `frontend/src/types/index.ts` consolidating and re-exporting all type modules cleanly.
- [x] Create `frontend/src/services/riskScoreCalculator.ts` implementing the Romanian Transfer Shield risk engine.
- [x] Create `frontend/src/data/sampleRoutePlans.ts` providing canonical fixtures for multi-modal travel (`Micro 19 Galați ➔ Piața Unirii București`) and direct rail corridors (`București Nord ➔ Gara Brașov`).
- [x] Add unit tests in `riskScoreCalculator.test.ts` and `sampleRoutePlans.test.ts`.
- [x] Update `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 38 suites, 495 tests passed (100%)
- [x] `npm run test:storybook`: 206 story tests passed
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `AI_LOG.md`: Strictly untouched



---

## Task 14: FastAPI Backend with Route Contract & Enterprise Auth System
**Description:** Build a production-grade FastAPI backend for Beeline/VoyageRail that facilitates the standardized `TransitRoutePlan` contract of the main feature and provides a comprehensive authentication & session system (Sign Up, Login, Guest accounts, Guest-to-Permanent conversion, JWT rotation, Session management, TOTP MFA, Password Reset).
**Acceptance criteria:**
- [x] Create `backend/requirements.txt` and core configuration in `backend/app/core/config.py`.
- [x] Configure async SQLAlchemy database layer in `backend/app/core/database.py` with auto-table initialization (`init_db`).
- [x] Implement native bcrypt hashing and JWT token management with rotating refresh tokens in `backend/app/core/security.py`.
- [x] Implement RFC 6238 TOTP MFA service with base64 QR code and 8 emergency backup codes in `backend/app/services/mfa_service.py`.
- [x] Implement SQLAlchemy models (`User`, `UserSession`, `MFACredential`, `PasswordResetToken`, `SavedRoute`) in `backend/app/models/`.
- [x] Implement Pydantic v2 schemas strictly mirroring the TypeScript `TransitRoutePlan` and auth schemas in `backend/app/schemas/`.
- [x] Implement `routing_service.py` with multi-modal door-to-door journey calculation (*Galați Micro 19 ➔ București Piața Unirii*) and Romanian Transfer Shield risk scoring engine.
- [x] Implement Romanian transit schedule service in `backend/app/services/schedule_service.py`.
- [x] Implement FastAPI endpoints for Auth, MFA, Users/Sessions, Route Planning, and Schedules in `backend/app/api/v1/`.
- [x] Implement frontend integration client `apiClient.ts` with auto-refresh interceptor and `AuthContext.tsx`.
- [x] Build pytest automated test suite with 18 comprehensive tests across auth, MFA, password reset, routes, and schedules.
- [x] Update documentation in `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `pytest backend/tests/ -v`: 18 tests passed (100%)
- [x] `npm test`: 40 suites, 508 tests passed (100%)
- [x] `npm run test:storybook`: 207 story interaction tests passed (100%)
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `npm run build:web`: Export succeeded
- [x] `AI_LOG.md`: Strictly untouched


---

## Task 15: Relational SQL Database for Users & Multi-Engine Persistence
**Description:** Implement and configure a dedicated SQL relational database for users, sessions, MFA credentials, password resets, and saved itineraries. Provide explicit SQL DDL (`schema.sql`), SQL seed data (`seed.sql`), database initialization and seeding scripts (`init_and_seed_db.py`), PostgreSQL support via Docker Compose (`docker-compose.yml`), and automated SQL integration test suite.
**Acceptance criteria:**
- [x] Create ANSI/SQLite/PostgreSQL compatible SQL DDL in `backend/schema.sql` defining `users`, `user_sessions`, `mfa_credentials`, `password_reset_tokens`, and `saved_routes` with constraints, foreign keys (`ON DELETE CASCADE`), and indexes.
- [x] Create seed data in `backend/seed.sql` with hashed passwords for demo traveler (`traveler@beeline.io`), admin with MFA (`admin@beeline.io`), and guest explorer with saved itinerary.
- [x] Anchor `DATABASE_URL` in `backend/app/core/config.py` to absolute backend path (`backend/beeline.db`), guaranteeing consistent database persistence across working directories.
- [x] Provide `SYNC_DATABASE_URL` and `get_sync_engine()` in `backend/app/core/database.py` for raw SQL utilities, seeding, and migrations.
- [x] Create `backend/scripts/init_and_seed_db.py` to initialize tables, insert seed users, and verify database statistics from CLI.
- [x] Create `backend/docker-compose.yml` and `backend/.env.example` enabling 1-command local PostgreSQL 16 database provisioning.
- [x] Add automated SQL test suite in `backend/tests/test_sql_database.py` validating table existence, raw SQL CRUD operations, unique email constraints, and cascade deletion.
- [x] Update documentation in `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `pytest backend/tests/ -v`: 21 tests passed (100%)
- [x] `sqlite3 backend/beeline.db ".tables"`: 5 relational tables verified
- [x] `npm test`: 40 suites, 508 tests passed (100%)
- [x] `npm run test:storybook`: 207 story interaction tests passed (100%)
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 16: Multi-Modal Booking Trip Results Tab & Explorer
**Description:** Implement a dedicated `/trips` route and booking interface inspired by modern European travel booking platforms (Trainline, Omio, Google Flights). Provide origin/destination selection, departure presets, popular corridor chips, curated Trifecta badges (Barnaby, Honey, Bumble, Eco Hero), dual currency pricing (LEI & EUR), carrier breakdowns across Romanian transit operators (CFR Călători, Astra Trans Carpatic, Transferoviar Călători, Metrorex, Transurb Galați, STB), expandable leg timelines, Romanian Transfer Shield risk scores, and 1-tap "Book Trip" integration with `TripContext`.
**Acceptance criteria:**
- [x] Create multi-modal booking data service `tripBookingService.ts` providing realistic Romanian corridors, dynamic fallback route generation, filtering, sorting, and conversion to `TrainJourney` for `TripContext`.
- [x] Build `BookingTripCard.tsx` extending `BaseCard` with dual pricing, Trifecta mascot badges, Transfer Shield indicator, expandable leg accordion, operator breakdown, and "Book Trip" / "In Trip ✓" toggle.
- [x] Build `TripFilterBar.tsx` extending `BaseCard` with pillar chips, transit mode filters, Romanian operator multi-select, price tiers, sorting options, and active filter counter with reset.
- [x] Build `trips.tsx` (`/trips` route) with origin/destination selector, station swap, departure presets, quick corridor chips, live matrix ribbon, and ambient `CozyHoneyBackground`.
- [x] Register `/trips` tab in `Navbar.tsx` and `frontend/app/_layout.tsx`.
- [x] Add seamless "Explore Trips" handoff button in `RouteFinderCard.tsx` and `app/index.tsx`.
- [x] Enforce ZERO map elements invariant on the HomePage and `/trips` route.
- [x] Build Storybook stories in `BookingTripCard.stories.tsx` (7 variants) and `TripFilterBar.stories.tsx` (4 variants), registered in `storybook.requires.ts`.
- [x] Build comprehensive unit tests in `BookingTripCard.test.tsx`, `TripFilterBar.test.tsx`, `tripBookingService.test.ts`, and `tripsRoute.test.tsx`, updating `Navbar.test.tsx` and `RouteFinderCard.test.tsx`.
- [x] Update documentation in `COMPONENTS.md` and `frontend/COMPONENTS.md`.
**Verification:**
- [x] `npm test`: 44 suites, 554 tests passed (100%)
- [x] `npm run test:storybook`: 223 story interaction tests passed (100%)
- [x] `npm run type-check`: 0 TypeScript compiler errors
- [x] `npm run build:web`: Export to `dist` succeeded without errors
- [x] `pytest backend/tests/ -v`: 21 tests passed (100%)
- [x] `AI_LOG.md`: Strictly untouched

---

## Task 17: Next.js TypeScript App Router Migration
**Description:** Migrate the frontend to an official Next.js App Router TypeScript template with Tailwind CSS and Lucide React icons, preserving the existing mobile setup in `mobile/`. Port all domain models, services, datasets, contexts, UI components, and App Router pages (`/`, `/trips`, `/schedules`, `/trains`, `/my-trip`), maintaining full feature parity, zero map elements on the HomePage, and seamless root npm scripts.
**Acceptance criteria:**
- [x] Archive previous Expo mobile app in `mobile/` with intact git history.
- [x] Bootstrap official Next.js App Router TypeScript template with Tailwind CSS in `frontend/`.
- [x] Port TypeScript domain types (`train.ts`, `routePlan.ts`, `auth.ts`, `schedule.ts`, `trip.ts`) and datasets (`romanianTransitTemplates.ts`, `sampleRoutePlans.ts`, `sampleTrains.ts`, `featuredLocations.ts`).
- [x] Port core business logic and services (`apiClient.ts`, `tripBookingService.ts`, `transitScheduleService.ts`, `riskScoreCalculator.ts`, `trainFilters.ts`).
- [x] Implement React Web context providers with `localStorage` hydration (`ThemeContext.tsx`, `TripContext.tsx`, `AuthContext.tsx`).
- [x] Build Tailwind CSS UI component system: `Navbar.tsx`, `CozyHoneyBackground.tsx`, `MascotBee.tsx`, `BaseButton.tsx`, `BaseCard.tsx`, `BaseBadge.tsx`, `BaseInput.tsx`, `RouteFinderCard.tsx` (ZERO map!), `MarketingShowcase.tsx`, `BookingTripCard.tsx`, `TripFilterBar.tsx`, `TransitScheduleCard.tsx`, `TrainCard.tsx`, `TrainDetailModal.tsx`.
- [x] Implement Next.js App Router pages: `src/app/page.tsx` (Home), `src/app/trips/page.tsx` (Booking Trips), `src/app/schedules/page.tsx` (Schedules), `src/app/trains/page.tsx` (Trains), `src/app/my-trip/page.tsx` (Trip Wallet).
- [x] Configure root `package.json` scripts (`dev`, `build`, `start`, `test`, `type-check`).
- [x] Setup Jest and React Testing Library for Next.js and build automated test suites in `frontend/src/__tests__/`.
- [x] Update documentation in `COMPONENTS.md`.
**Verification:**
- [x] `npm run build`: Next.js production build succeeded in 298ms (7/7 static pages generated)
- [x] `npm run type-check`: 0 TypeScript compiler errors (`tsc --noEmit`)
- [x] `npm test`: 3 suites, 13 tests passed (100%)
- [x] `pytest backend/tests/ -v`: 21 tests passed (100%)
- [x] `AI_LOG.md`: Strictly untouched
 
---

## Task 18: Redesign MascotBee with Dynamic Gear-Shifting & Modern Vector Art
**Description:** Redesign `MascotBee.tsx` from three disconnected characters into one unified Beeline mascot that dynamically changes gear (`default`, `fast`, `safe`, `economy`). Equip with smooth vector SVG details: flapping wings, cheerful expressions, and distinct equipment overlays (resting aviator goggles for default, supersonic speed helmet/scarf for fast, Romanian Transfer Shield for safe, nectar coin pot for economy). Retain backwards compatibility for `barnaby`, `honey`, and `bumble` aliases, with `React.useId` scoped gradients and WebKit-compatible `transform-box: fill-box` wing flutters.
**Acceptance criteria:**
- [x] `MascotBee` supports gear variants: `default`, `fast`, `safe`, `economy` as well as legacy `barnaby`, `honey`, `bumble`.
- [x] Vector design features expressive high-fidelity SVG artwork with animated wings and subtle float motion.
- [x] Each gear dynamically overlays equipment: aviator goggles (`default`), supersonic helmet/scarf (`fast`), golden honey shield (`safe`), and nectar jar (`economy`).
- [x] Backwards-compatible rendering with existing pages (`/trips`, `/schedules`, `/trains`, `/my-trip`).
- [x] Unit tests pass in `src/__tests__/components.test.tsx`.
**Verification:**
- [x] `npm test`: passes
- [x] `npm run type-check`: 0 errors
**Dependencies:** None
**Files likely touched:**
- `frontend/src/components/MascotBee.tsx`
- `frontend/src/__tests__/components.test.tsx`
- `frontend/src/app/globals.css`
**Estimated scope:** S (3 files)

---

## Task 19: Rebrand Navbar, Metadata & Export Itinerary to "Beeline"
**Description:** Update branding in `Navbar.tsx`, `layout.tsx`, and `my-trip/page.tsx` from "VoyageRail" to "Beeline", featuring the redesigned Beeline mascot in default gear and rebranded itinerary export download.
**Acceptance criteria:**
- [x] Navbar logo displays "Beeline" with modern styling and the redesigned MascotBee.
- [x] App metadata in `layout.tsx` reflects "Beeline | Smart Romanian Transit Planner".
- [x] Itinerary export in `my-trip/page.tsx` downloads with `beeline-itinerary-*.json` filename.
- [x] Mobile drawer and desktop nav links remain fully operational.
**Verification:**
- [x] `npm test`: passes
- [x] `npm run type-check`: 0 errors
**Dependencies:** Task 18
**Files likely touched:**
- `frontend/src/components/Navbar.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/my-trip/page.tsx`
**Estimated scope:** S (3 files)

---

## Task 20: Build Simplified Exact Screen-Size Hero with Search & Gear-Shifting Mascot
**Description:** Simplify the frontend of `frontend/src/app/page.tsx` into an exact screen-size hero (`min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)]`), displaying the prominent Beeline `h1` app title, a disruptive headline ("Romanian Transit is Chaotic. We Made It Effortless."), a streamlined 2-point corridor search, and the animated mascot that starts on `default` gear and dynamically shifts into `safe`, `fast`, or `economy` gear upon searching or selecting a route option.
**Acceptance criteria:**
- [x] Hero layout fits screen height (`min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)]` on desktop, clean full-viewport responsiveness on mobile) without unnecessary vertical scroll clutter.
- [x] Prominently presents the title "Beeline" as `h1` and disruptive punchline as `h2`.
- [x] Responsive 2-column layout (`md:grid-cols-12`) prevents vertical overflow clipping on tablets and iPads.
- [x] Animated Beeline mascot starts in `default` gear on initial view.
- [x] Integrated fast corridor search (origin, destination, swap, quick corridor presets).
- [x] After search or route selection, presents the 3 route archetypes (⚡ Fast, 🛡️ Safe, 💰 Economy), and dynamically shifts the mascot's gear to match the selected route.
- [x] Interactive gear switcher allows trying on all gears with companion reactive speech/taglines.
- [x] Action button allows seamlessly continuing to `/trips` with pre-filled route parameters.
- [x] ZERO map elements on `frontend/src/app/page.tsx` (Strict Invariant 1).
**Verification:**
- [x] `npm test`: passes (22/22 tests across 4 suites)
- [x] `npm run build`: Next.js production build succeeds (7/7 static pages generated)
- [x] `npm run type-check`: 0 errors
**Dependencies:** Tasks 18, 19
**Files likely touched:**
- `frontend/src/app/page.tsx`
- `frontend/src/__tests__/homePage.test.tsx`
**Estimated scope:** S (2 files)

---

## Task 21: Quality Gates, Full Test Pass & Zero Regression Verification
**Description:** Execute all project quality gates from root (`npm run type-check`, `npm test`, `npm run build`, `pytest`), ensuring zero regressions and verifying invariant constraints.
**Acceptance criteria:**
- [x] `npm run type-check` reports 0 errors.
- [x] `npm test` passes with 100% of test suites green (4 suites, 22 tests).
- [x] `npm run build` generates all static routes successfully (7/7 pages).
- [x] `pytest backend/tests/ -v` passes 100% (21/21 backend tests).
- [x] Strict Invariant 1: Zero map elements on HomePage.
- [x] Strict Invariant 2: `AI_LOG.md` remains strictly untouched.
**Verification:**
- [x] All CLI commands succeed with return code 0.
- [x] `git status` verifies `AI_LOG.md` was never modified.
**Dependencies:** Tasks 18, 19, 20
**Files likely touched:** None (verification phase)
**Estimated scope:** XS

---

## Checkpoint 7: Clean Build & Full Verification
- [x] All frontend tests pass (4 suites, 22 tests)
- [x] All backend tests pass (21 tests)
- [x] Next.js production build succeeds (7/7 static pages)
- [x] TypeScript strict type-check clean (0 errors)
- [x] Zero map on HomePage (Strict Invariant 1 preserved)
- [x] AI_LOG.md untouched (Strict Invariant 2 preserved)



