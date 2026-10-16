# Implementation Plan: Adapt HomePage Template to "The Curated Trifecta" (Romania Hub)

## Overview
Adapt the Beeline HomePage template to align with the refined specification in `docs/ideas/route-results-trifecta.md`. The HomePage serves as a fast shorthand entry point centered on Romania as the primary transit hub (CFR Călători, private operators, Metrorex, regional buses) and previews the upcoming "Curated Trifecta" results experience (Fastest, Best Value with €10/hr rule, Most Reliable with extended transfer buffers). In accordance with strict constraints, the full routing feature and actual screen redirect remain **disabled**, operating strictly as an interactive shorthand preview with validation.

---

## Architecture Decisions
- **Romania as Primary Hub**: Default origin/destination points and featured corridors pivot from generic Western Europe to major Romanian routes (`București Nord`, `Brașov`, `Constanța`, `Cluj-Napoca`, `Timișoara Nord`, and international gateway to `Vienna`).
- **Shorthand "Curated Trifecta" Preview**: Upon route search submission in `RouteFinderCard`, instead of redirecting or showing a generic success box, the card presents a lightweight preview of the 3 Trifecta pillars that will be computed upon redirect (⚡ Fastest, 💰 Best Value, 🛡️ Most Reliable with 25-35m buffer warning).
- **Strict Invariant Maintenance**:
  - ZERO map on HomePage.
  - ZERO screen redirection on route search submission (`onSubmitRoute` remains an inert callback for future navigation).
  - 100% theme adaptability (Beeline Yellow / White / Dark Mode).
  - All components remain testable with Storybook CSF 3 stories and Jest automated tests.

---

## Task List

### Phase 1: Foundation & Shorthand Adaptation
- [x] **Task 1**: Update `RouteFinderCard` default stations to Romanian hub (`București Nord` ⇄ `Brașov`) and configure quick corridor helper presets.
- [x] **Task 2**: Enhance `RouteFinderCard` non-redirecting submission feedback to display the "Curated Trifecta" preview pillars (Fastest, Best Value €10/hr rule, Most Reliable buffer alert).

### Checkpoint 1: Shorthand Validation
- [x] Unit tests pass in `RouteFinderCard.test.tsx`
- [x] Storybook stories updated with Romanian corridor fixtures
- [x] Zero redirection executed on submission

### Phase 2: Marketing Showcase & HomePage Integration
- [x] **Task 3**: Update `MarketingShowcase` featured corridors to Romanian domestic & international gateways (București-Brașov, București-Constanța, București-Cluj, București-Vienna) and highlight the Curated Trifecta value proposition.
- [x] **Task 4**: Update `frontend/app/index.tsx` corridor handlers and labels to match the Romanian hub presets.

### Checkpoint 2: Full Screen Verification
- [x] `indexRoute.test.tsx` and `MarketingShowcase.test.tsx` pass cleanly
- [x] Visual harmony across Light and Dark themes

### Phase 3: Documentation & Storybook Sync
- [x] **Task 5**: Update `COMPONENTS.md`, `frontend/COMPONENTS.md`, and `PLAN_AND_STATUS.md` reflecting the adapted HomePage template and Curated Trifecta preview.

### Checkpoint 3: Complete & Clean Build
- [x] `npm test`: All test suites pass (30 suites, 337 tests)
- [x] `npm run type-check`: 0 TypeScript compiler errors under strict mode
- [x] `npm run test:storybook`: All component story tests pass (156 tests)
- [x] Ready for review

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Accidental Redirection**: Downstream agents might connect a `router.push('/trains')` on submit | High | Retain explicit unit tests asserting that `router.push` is NOT called when `onSubmitRoute` triggers |
| **Stale Submission Feedback**: Changing inputs while viewing Trifecta preview | Med | Existing state invalidation (`setSubmittedQuery(null)`) automatically clears preview on text/swap/filter changes |
| **Diacritic Inconsistencies**: Romanian station names (e.g., `București` vs `Bucuresti`) | Med | Standardize on Unicode NFC normalization and diacritic-insensitive equality |

---

## Open Questions
- None. Requirements, domain trade-offs (€10/hr threshold), network risk profiles (extended buffers for Romania), and non-redirecting shorthand constraints are fully specified.
