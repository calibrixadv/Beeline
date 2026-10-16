# Task List: Adapt HomePage Template to "The Curated Trifecta" (Romania Hub)

## Task 1: Update Domain Corridor Data & Romanian Hub Presets in RouteFinderCard
**Description:** Update `RouteFinderCard` default stations to Romania's central rail hub (`București Nord` ➔ `Brașov`) and adjust initial state and mode options.
**Acceptance criteria:**
- [x] Initial origin defaults to `București Nord` and destination defaults to `Brașov`.
- [x] Preserves multi-modal filter chips (`Trains`, `Metro`, `Busses`).
- [x] Robust against Romanian diacritics (`București` vs `Bucuresti`) during duplicate validation.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/RouteFinderCard.test.tsx`
- [x] Storybook tests pass: `npm run test:storybook`
- [x] Manual check: Default inputs display `București Nord` and `Brașov`.
**Dependencies:** None
**Files likely touched:**
- `frontend/src/components/RouteFinderCard.tsx`
- `frontend/src/components/stories/RouteFinderCard.stories.tsx`
- `frontend/__tests__/RouteFinderCard.test.tsx`
**Estimated scope:** S (3 files)

---

## Task 2: Adapt Shorthand Submission Feedback to "Curated Trifecta" Preview
**Description:** Enhance the non-redirecting submission feedback banner in `RouteFinderCard` to present a concise preview of the 3 Curated Trifecta pillars (⚡ Fastest, 💰 Best Value applying the €10/hr rule, 🛡️ Most Reliable with 25–35m transfer buffer).
**Acceptance criteria:**
- [x] Submitting valid origin/destination displays the 3 Curated Trifecta cards preview with Beeline badges.
- [x] Informs the user that full door-to-door results will load upon future redirect.
- [x] Strictly does NOT execute a router push or page redirect.
- [x] Modifying inputs, swapping stations, or toggling modes immediately clears the preview banner.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/RouteFinderCard.test.tsx`
- [x] Manual check: Submitting shows the Trifecta preview banner without changing routes.
**Dependencies:** Task 1
**Files likely touched:**
- `frontend/src/components/RouteFinderCard.tsx`
- `frontend/src/components/stories/RouteFinderCard.stories.tsx`
- `frontend/__tests__/RouteFinderCard.test.tsx`
**Estimated scope:** S (3 files)

---

## Checkpoint 1: Shorthand Validation
- [x] RouteFinderCard tests pass cleanly (100%)
- [x] Storybook renders all RouteFinderCard variants without errors
- [x] No navigation or redirection triggered on submit

---

## Task 3: Adapt MarketingShowcase to Romanian Hub Corridors & Trifecta Pillars
**Description:** Update `MarketingShowcase` featured corridors to prominent Romanian domestic and international routes, and update feature cards to showcase the Curated Trifecta value propositions.
**Acceptance criteria:**
- [x] Featured corridors updated:
  - `București Nord` ⇄ `Brașov` (CFR IR / Astra Trans Carpatic, 2h 15m)
  - `București Nord` ⇄ `Constanța` (CFR IR, 2h 00m)
  - `Cluj-Napoca` ⇄ `București Nord` (InterRegio Nightjet / Sleeper, 8h 30m)
  - `București Nord` ⇄ `Viena Hbf` (Dacia EuroNight, 18h 45m)
- [x] Highlights the Curated Trifecta (Fastest, Best Value €10/hr threshold, Most Reliable buffer protection).
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/MarketingShowcase.test.tsx`
- [x] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:**
- `frontend/src/components/MarketingShowcase.tsx`
- `frontend/src/components/stories/MarketingShowcase.stories.tsx`
- `frontend/__tests__/MarketingShowcase.test.tsx`
**Estimated scope:** S (3 files)

---

## Task 4: Align Home Screen Integration & Route Handlers
**Description:** Align `frontend/app/index.tsx` corridor explore handlers and transitional loader messages with the Romanian hub corridors while confirming zero redirect on route finder submission.
**Acceptance criteria:**
- [x] Clicking a featured corridor triggers a transition message referencing the selected Romanian corridor.
- [x] RouteFinderCard submission handler remains non-redirecting.
- [x] Layout remains responsive on mobile and desktop without any map element.
**Verification:**
- [x] Tests pass: `npm test -- frontend/__tests__/indexRoute.test.tsx`
- [x] Type check passes: `npm run type-check`
**Dependencies:** Tasks 2, 3
**Files likely touched:**
- `frontend/app/index.tsx`
- `frontend/__tests__/indexRoute.test.tsx`
**Estimated scope:** S (2 files)

---

## Checkpoint 2: Full Screen Verification
- [x] All route and component unit tests pass
- [x] Metro web dev server renders the updated Romanian hub home screen seamlessly
- [x] Zero console warnings or layout overflows

---

## Task 5: Master Documentation & Storybook Sync
**Description:** Synchronize `COMPONENTS.md`, `frontend/COMPONENTS.md`, and `PLAN_AND_STATUS.md` with the Romanian hub presets and Curated Trifecta preview documentation.
**Acceptance criteria:**
- [x] Documents the Curated Trifecta shorthand preview in `COMPONENTS.md`.
- [x] Updates test counts and status matrix in `PLAN_AND_STATUS.md`.
- [x] AI_LOG.md is strictly untouched.
**Verification:**
- [x] Manual inspection of markdown links and status tables
- [x] `git status` verifies clean tree
**Dependencies:** Tasks 1-4
**Files likely touched:**
- `COMPONENTS.md`
- `frontend/COMPONENTS.md`
- `PLAN_AND_STATUS.md`
**Estimated scope:** XS (3 markdown files)

---

## Checkpoint 3: Complete & Clean Build
- [x] `npm test`: All test suites pass (30 suites, 337 tests)
- [x] `npm run type-check`: 0 TypeScript compiler errors under strict mode
- [x] `npm run test:storybook`: All component story tests pass (156 tests)
- [x] Ready for review
