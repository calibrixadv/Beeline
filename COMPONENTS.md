# VoyageRail UI Component System & Storybook Testing Library Reference

> **Document Status**: Production Active  
> **Audience**: All Engineering & AI Agents  
> **Target Framework**: Expo SDK 51 / React Native 0.74 / TypeScript Strict / React Native Web  
> **Storybook Version**: `@storybook/react-native` v7 + `@storybook/testing-library` + Jest Expo  

---

## 1. Architectural Principles & Extension Pattern

To ensure brand cohesion, maintainability, and zero code duplication across VoyageRail, **all agents must adhere to the Component Extension Pattern**:

```
                              ┌────────────────────┐
                              │     BaseButton     │
                              └─────────┬──────────┘
             ┌──────────────────────────┼──────────────────────────┬──────────────────────┐
             │                          │                          │                      │
             ▼                          ▼                          ▼                      ▼
      ┌─────────────┐            ┌─────────────┐            ┌─────────────┐        ┌─────────────┐
      │ LoginButton │            │ PlanButton  │            │ IconButton  │        │ ResetButton │
      └─────────────┘            └─────────────┘            └─────────────┘        └─────────────┘

                              ┌────────────────────┐
                              │     BaseBadge      │
                              └─────────┬──────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
      ┌─────────────┐                                       ┌─────────────┐
      │ StatusBadge │                                       │ AmenityBadge│
      └─────────────┘                                       └─────────────┘

                              ┌────────────────────┐
                              │     BaseInput      │
                              └─────────┬──────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ SearchInput │
                                 └─────────────┘

                              ┌────────────────────┐
                              │      BaseCard      │
                              └─────────┬──────────┘
             ┌──────────────────────────┼──────────────────────────┬──────────────────────┐
             │                          │                          │                      │
             ▼                          ▼                          ▼                      ▼
      ┌─────────────┐            ┌─────────────┐            ┌───────────────┐      ┌───────────────────┐
      │  TrainCard  │            │   Navbar    │            │RouteFinderCard│      │ MarketingShowcase │
      └─────────────┘            └─────────────┘            └───────────────┘      └───────────────────┘

                              ┌────────────────────┐
                              │   LoadingSpinner   │
                              └─────────┬──────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ ScreenLoader│
                                 └─────────────┘
```

### Golden Rule for All Agents
> **Always inspect existing components before creating a new one.**  
> If an existing component can be extended, specialized, or composed (e.g., `BaseButton` -> `LoginButton`, `BaseBadge` -> `StatusBadge`, `BaseInput` -> `SearchInput`), you **MUST** extend the base component rather than building primitive UI from scratch with raw `TouchableOpacity` or `View`.

---

## 2. Credentials Requirement Audit & Freeze Assessment

- **Required Credentials**: **NONE (0 Credentials Required)**.
- **Freeze Status**: **NOT FROZEN — Complete Offline/Local Setup**.
- **Audit Explanation**:
  - The Storybook Component Library (`@storybook/react-native`, `@storybook/testing-library`), Jest test runner (`jest-expo`), and React Native Testing Library (`@testing-library/react-native`) are fully open-source and run **100% locally and offline** within the Node.js / Expo environment.
  - No cloud services, SaaS tokens, API keys, or paid visual diff subscriptions (e.g. Chromatic cloud project tokens) are required for testing or running Storybook.
  - If a team later decides to publish stories to a cloud visual regression service like Chromatic or Percy in CI/CD, the task may be frozen until a `CHROMATIC_PROJECT_TOKEN` is supplied in the environment. For all current local automated testing and Storybook usage, no credentials are required.

---

## 3. Component Catalog & API Reference

### 1. `BaseButton`
- **File**: [`frontend/src/components/BaseButton.tsx`](frontend/src/components/BaseButton.tsx)
- **Lineage**: Root Foundational Component
- **Description**: Highly flexible primary button supporting 7 color variants, 3 sizes, loading spinners, disabled states, accessibility tags, and hover/press gestures.
- **States & Handlers**:
  - `onClick` / `onPress`: Invoked on pointer or touch trigger. Suppressed when `disabled` or `loading`.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut` (and web pointer events). Highlights border/background color.
  - `loading`: Displays an `ActivityIndicator` with accessible `busy` state.
  - `disabled`: Dims opacity, sets cursor, and renders disabled accessibility state.
- **Props**:
  - `variant`: `'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'surface'` (default `'primary'`)
  - `size`: `'sm' | 'md' | 'lg'` (default `'md'`)
  - `title`?: string
  - `loading`?: boolean
  - `disabled`?: boolean
  - `iconLeft`?: ReactNode
  - `iconRight`?: ReactNode
  - `onPress`?: (event) => void
  - `fullWidth`?: boolean
- **When to Use**: Whenever a generic action, form submit, or navigation button is needed.
- **How to Use**:
  ```tsx
  import { BaseButton } from '@/components/BaseButton';

  <BaseButton
    variant="primary"
    size="md"
    title="Search Rail Corridors"
    onPress={() => console.log('Searching...')}
  />
  ```
- **What Can Be Improved**: Add spring physics micro-interactions via `react-native-reanimated` for native platforms.

---

### 2. `LoginButton`
- **File**: [`frontend/src/components/LoginButton.tsx`](frontend/src/components/LoginButton.tsx)
- **Lineage**: Extends `BaseButton`
- **Description**: Authentication trigger with pre-configured provider logos, color schemes, single-flight concurrent click prevention, and logged-in states for VoyageRail, Google, Apple, Email, and Guest authentication.
- **States & Handlers**:
  - `onClick` / `onPress`: Invoked to trigger OAuth or credentials login. Supports async Promise handlers with single-flight concurrency protection (`preventConcurrent: true`). If an async action is in flight, the button automatically activates its `loading` state, displays an `ActivityIndicator` spinner, and ignores concurrent clicks to prevent duplicate authentication attempts.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut` and pointer events. Transitions background/border color according to the provider theme.
  - `isLoggedIn`: Displays dedicated logged-in label for each provider ("Signed in to VoyageRail", "Signed in with Google", "Signed in with Apple", "Signed in with Email", "Continuing as Guest") with checkmark and active state label.
  - `loading`: Displays spinner while credentials or OAuth tokens are validating; suppresses all further presses.
- **Props**:
  - Extends all `BaseButtonProps` (except children)
  - `provider`: `'voyagerail' | 'google' | 'apple' | 'email' | 'guest'` (default `'voyagerail'`)
  - `isLoggedIn`?: boolean
  - `preventConcurrent`?: boolean (default `true`)
- **When to Use**: In authentication sheets, login modals, account drawers, and checkout gates.
- **How to Use**:
  ```tsx
  import { LoginButton } from '@/components/LoginButton';

  <LoginButton
    provider="google"
    onPress={async () => {
      await authService.loginWithGoogle();
    }}
  />
  ```
- **What Can Be Improved**: Add auto-dismiss tooltip explaining SSO biometric security.

---

### 3. `PlanButton`
- **File**: [`frontend/src/components/PlanButton.tsx`](frontend/src/components/PlanButton.tsx)
- **Lineage**: Extends `BaseButton`
- **Description**: Dedicated booking and itinerary state button for railway journeys. Automatically handles transitions between unplanned (`+ Plan`), added (`In Trip`), and cancelled (`Cancelled`) states.
- **States & Handlers**:
  - `onClick` / `onPress`: Dispatches trip planner itinerary add/toggle actions. Disabled when journey is cancelled.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut`. In unplanned state, darkens blue button (`#1D4ED8`); in saved state, transitions soft green to hover green (`#BBF7D0` with `#4ADE80` border).
  - `isCancelled`: Automatically disables interaction, sets red warning banner, and informs screen readers.
  - `isSaved`: Changes background to soft green (`#DCFCE7`), icon to checkmark, and text to "In Trip".
- **Props**:
  - Extends `BaseButtonProps`
  - `isSaved`?: boolean
  - `isCancelled`?: boolean
  - `trainNumber`?: string
  - `labelMode`?: `'compact' | 'full'`
- **When to Use**: On timetable journey cards (`TrainCard`) and modal itinerary headers (`TrainDetailModal`).
- **How to Use**:
  ```tsx
  import { PlanButton } from '@/components/PlanButton';

  <PlanButton
    isSaved={isSaved}
    isCancelled={journey.status === 'CANCELLED'}
    trainNumber={journey.trainNumber}
    onPress={() => addTrainToTrip(journey, 'STANDARD')}
    labelMode="compact"
  />
  ```
- **What Can Be Improved**: Add haptic feedback on successful itinerary addition on iOS/Android.

---

### 4. `IconButton`
- **File**: [`frontend/src/components/IconButton.tsx`](frontend/src/components/IconButton.tsx)
- **Lineage**: Extends `BaseButton`
- **Description**: Compact square, circle, or rounded button optimized for icon-only action triggers like closing modals, clearing search, or saving favorites.
- **States & Handlers**:
  - `onClick` / `onPress`: Triggers icon callback.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut`. Emphasizes subtle background overlay (`#F1F5F9`).
- **Props**:
  - `iconName`: `Ionicons` name
  - `iconSize`?: number
  - `iconColor`?: string
  - `shape`?: `'circle' | 'square' | 'rounded'` (default `'circle'`)
  - `size`?: `'sm' | 'md' | 'lg'`
- **When to Use**: Modal dismiss headers, search clear buttons, back arrows.
- **How to Use**:
  ```tsx
  import { IconButton } from '@/components/IconButton';

  <IconButton
    iconName="close"
    iconSize={22}
    onPress={closeModal}
    accessibilityLabel="Close dialog"
  />
  ```
- **What Can Be Improved**: Support custom SVG icon glyphs.

---

### 5. `ResetButton`
- **File**: [`frontend/src/components/ResetButton.tsx`](frontend/src/components/ResetButton.tsx)
- **Lineage**: Extends `BaseButton`
- **Description**: Danger/ghost reset control for clearing active search queries, operator filters, or itinerary selections.
- **States & Handlers**:
  - `onClick` / `onPress`: Triggers reset dispatch.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut`. Soft red hover wash (`#F1F5F9`).
- **Props**:
  - `title`?: string (default `'Reset'`)
  - `showIcon`?: boolean
- **When to Use**: Timetable filter bars and empty search CTA cards.
- **How to Use**:
  ```tsx
  import { ResetButton } from '@/components/ResetButton';

  <ResetButton onPress={resetFilters} showIcon />
  ```
- **What Can Be Improved**: Add confirmation popover if resetting large multi-leg itineraries.

---

### 6. `BaseBadge`
- **File**: [`frontend/src/components/BaseBadge.tsx`](frontend/src/components/BaseBadge.tsx)
- **Lineage**: Root Foundational Component
- **Description**: Visual status pill supporting 6 semantic variants and dual operation: static text badge or interactive filter chip.
- **States & Handlers**:
  - `onClick` / `onPress`: When supplied, turns badge into an interactive chip with accessible `button` role.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut`. Scales by 1.02 with 0.85 opacity on pointer hover.
  - `selected`: Applies active blue border (`#3B82F6`) and tinted fill (`#EFF6FF`).
- **Props**:
  - `label`: string
  - `variant`?: `'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'`
  - `size`?: `'sm' | 'md'`
  - `icon`?: ReactNode
  - `selected`?: boolean
  - `onPress`?: () => void
  - `onHoverIn`?: () => void
  - `onHoverOut`?: () => void
- **When to Use**: Fare classes, tags, live train status, onboard amenity chips.
- **How to Use**:
  ```tsx
  import { BaseBadge } from '@/components/BaseBadge';

  <BaseBadge
    label="FIRST CLASS"
    variant="neutral"
    size="sm"
  />
  ```
- **What Can Be Improved**: Add pulsating dot for live boarding or real-time GPS tracking.

---

### 7. `StatusBadge`
- **File**: [`frontend/src/components/StatusBadge.tsx`](frontend/src/components/StatusBadge.tsx)
- **Lineage**: Extends `BaseBadge` (inherits `BaseBadgeProps`)
- **Description**: Domain-specific badge translating railway operational statuses (`ON_TIME`, `DELAYED`, `BOARDING`, `CANCELLED`) into semantic colors and delay minute announcements. Supports both static display and interactive chip filtering modes.
- **States & Handlers**:
  - `onClick` / `onPress`: Supported via `BaseBadge`. When supplied, acts as an interactive status filter button.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut`. Scales badge on pointer hover.
  - Static display with accessible text label (e.g. `Status: +15 min Delay`).
- **Props**:
  - Extends `Omit<BaseBadgeProps, 'label' | 'variant'>`
  - `status`: `TrainStatus`
  - `delayMinutes`?: number
- **When to Use**: Train journey cards and itinerary stops.
- **How to Use**:
  ```tsx
  import { StatusBadge } from '@/components/StatusBadge';

  <StatusBadge status={journey.status} delayMinutes={journey.delayMinutes} />
  ```
- **What Can Be Improved**: Flash animation when delay status changes in real-time.

---

### 8. `AmenityBadge`
- **File**: [`frontend/src/components/AmenityBadge.tsx`](frontend/src/components/AmenityBadge.tsx)
- **Lineage**: Extends `BaseBadge`
- **Description**: Maps `Amenity` enum to icons (Wi-Fi, Power, Dining, Bike, Accessibility, Quiet zone) with standard badge formatting.
- **Props**:
  - `amenity`: `Amenity`
- **When to Use**: Train feature inspection lists and filter chips.
- **How to Use**:
  ```tsx
  import { AmenityBadge } from '@/components/AmenityBadge';

  <AmenityBadge amenity="DINING_CAR" />
  ```
- **What Can Be Improved**: Add interactive info popover explaining bistro menu or socket voltages.

---

### 9. `BaseCard`
- **File**: [`frontend/src/components/BaseCard.tsx`](frontend/src/components/BaseCard.tsx)
- **Lineage**: Root Foundational Component
- **Description**: Container surface supporting elevated shadow, outlined border, and flat background variants, with optional pressable hover feedback. Interactive when `onPress`, `onHoverIn`, or `onHoverOut` is provided.
- **States & Handlers**:
  - `onClick` / `onPress`: Turns card into a pressable surface with accessible `button` role.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut`. Emphasizes blue border outline (`#3B82F6`) and increases shadow opacity to 0.12.
- **Props**:
  - `variant`?: `'elevated' | 'outlined' | 'flat'`
  - `padding`?: `'none' | 'sm' | 'md' | 'lg'`
  - `onPress`?: () => void
  - `onHoverIn`?: () => void
  - `onHoverOut`?: () => void
  - `children`?: ReactNode
- **When to Use**: Card containers, journey items, modal bodies, summary boxes.
- **How to Use**:
  ```tsx
  import { BaseCard } from '@/components/BaseCard';

  <BaseCard variant="elevated" padding="md">
    <Text>Journey Card Details</Text>
  </BaseCard>
  ```
- **What Can Be Improved**: Add dark mode elevation adaptations.

---

### 10. `BaseInput`
- **File**: [`frontend/src/components/BaseInput.tsx`](frontend/src/components/BaseInput.tsx)
- **Lineage**: Root Foundational Component
- **Description**: Form input with integrated label, left/right icons, clear button, focus highlight, error text, and hover detection.
- **States & Handlers**:
  - `onFocus` / `onBlur`: Highlights border in blue (`#2563EB`) with white background.
  - `onHover`: Handled via `onHoverIn` / `onHoverOut` and container pointer enter/leave. Subtly darkens border to `#94A3B8`.
  - `onChangeText`: Text input event.
  - `onClear`: Fast reset button clearing input value.
  - `disabled`: Dims background (`#F1F5F9`) with 0.6 opacity and disables editing.
- **Props**:
  - `value`: string
  - `onChangeText`: (text: string) => void
  - `placeholder`?: string
  - `label`?: string
  - `clearable`?: boolean
  - `error`?: string
  - `disabled`?: boolean
  - `leftIcon`?: ReactNode
  - `rightIcon`?: ReactNode
  - `onHoverIn`?: () => void
  - `onHoverOut`?: () => void
- **When to Use**: Station search, passenger names, booking references.
- **How to Use**:
  ```tsx
  import { BaseInput } from '@/components/BaseInput';

  <BaseInput
    label="Origin Station"
    value={city}
    onChangeText={setCity}
    placeholder="e.g. Paris Gare de Lyon"
    clearable
  />
  ```
- **What Can Be Improved**: Station auto-complete dropdown integration.

---

### 11. `SearchInput`
- **File**: [`frontend/src/components/SearchInput.tsx`](frontend/src/components/SearchInput.tsx)
- **Lineage**: Extends `BaseInput`
- **Description**: Specialization of `BaseInput` tailored for search filters with magnifying glass icon and instant clear interaction.
- **Props**:
  - Extends `BaseInputProps` (except leftIcon)
  - `searchIconColor`?: string
- **When to Use**: Timetable search bar, station filtering.
- **How to Use**:
  ```tsx
  import { SearchInput } from '@/components/SearchInput';

  <SearchInput
    value={query}
    onChangeText={setQuery}
    placeholder="Search train, city or operator..."
  />
  ```
- **What Can Be Improved**: Recent search history tags.

---

### 12. Compound & Feature Components
- **`AmenityIcon`**: [`frontend/src/components/AmenityIcon.tsx`](frontend/src/components/AmenityIcon.tsx) — Compact amenity badge.
- **`TrainCard`**: [`frontend/src/components/TrainCard.tsx`](frontend/src/components/TrainCard.tsx) — Full journey summary card built from `BaseCard`, `StatusBadge`, `BaseButton`, and `PlanButton`.
- **`FilterBar`**: [`frontend/src/components/FilterBar.tsx`](frontend/src/components/FilterBar.tsx) — Timetable control bar using `SearchInput`, `ResetButton`, and status chips.
- **`TrainDetailModal`**: [`frontend/src/components/TrainDetailModal.tsx`](frontend/src/components/TrainDetailModal.tsx) — Intermediate stops sheet using `IconButton`, `PlanButton`, `BaseButton`, and `StatusBadge`.
- **`TripSummaryBanner`**: [`frontend/src/components/TripSummaryBanner.tsx`](frontend/src/components/TripSummaryBanner.tsx) — Bottom docking banner using `BaseButton`.

---

### 13. `LoadingSpinner`
- **File**: [`frontend/src/components/LoadingSpinner.tsx`](frontend/src/components/LoadingSpinner.tsx)
- **Lineage**: Root Foundational Feedback Component
- **Description**: High-contrast Beeline Yellow animated circular spinner with central transit bee/dot placeholder mark, customizable size tiers (`sm`, `md`, `lg`, `xl`), and accessible progressbar role.
- **Props**:
  - `size`?: `'sm' | 'md' | 'lg' | 'xl'` (default `'md'`)
  - `color`?: string (defaults to Beeline Yellow `#FFC700`)
  - `trackColor`?: string
  - `label`?: string
  - `subtitle`?: string
  - `placeholderIcon`?: boolean (default `true`)
- **When to Use**: Feedback indicators, async network requests, screen loaders, button states.

---

### 14. `ScreenLoader`
- **File**: [`frontend/src/components/ScreenLoader.tsx`](frontend/src/components/ScreenLoader.tsx)
- **Lineage**: Extends `BaseCard` & composes `LoadingSpinner`
- **Description**: Dedicated full-screen and inline route transition loader with backdrop wash, Beeline brand text, placeholder favicon/icon indicator, and spinner.
- **Props**:
  - `visible`?: boolean (default `true`)
  - `message`?: string
  - `subtitle`?: string
  - `spinnerSize`?: `SpinnerSize` (default `'lg'`)
  - `fullScreen`?: boolean (default `true`)
- **When to Use**: During screen transitions and page navigation.

---

### 15. `Navbar`
- **File**: [`frontend/src/components/Navbar.tsx`](frontend/src/components/Navbar.tsx)
- **Lineage**: Composed Navigation Component (built with `BaseCard`, `BaseButton`, `IconButton`)
- **Description**: Top header navigation bar for the Beeline website featuring placeholder brand icon, placeholder favicon tag, route links (`/`, `/trains`, `/my-trip`), quick action CTA, and light/dark theme toggle.
- **Props**:
  - `activeRoute`?: string
  - `onNavigate`?: (route: string) => void
  - `showThemeToggle`?: boolean (default `true`)
  - `showQuickAction`?: boolean (default `true`)
- **When to Use**: Site-wide top navigation in root layout and page headers.

---

### 16. Theme System & Providers
- **`ThemeContext`**: [`frontend/src/context/ThemeContext.tsx`](frontend/src/context/ThemeContext.tsx) — Beeline Yellow (`#FFC700`), White (`#FFFFFF`), and Black (`#000000` / `#09090B`) color token system with complete light and dark mode support via `ThemeProvider` and `useTheme()` hook.
  - Dynamically consumed by foundational components (`BaseButton`, `BaseCard`, `BaseInput`, `BaseBadge`) and composite screens (`TrainCard`, `FilterBar`, `TrainDetailModal`, `TripSummaryBanner`, `Navbar`, `LoadingSpinner`, `ScreenLoader`).
  - High-contrast compliance: WCAG AAA on Beeline Yellow (`#000000` text on `#FFC700` background: 13.8:1 ratio), ensuring zero contrast degradation.
- **`ScreenTransitionContext`**: [`frontend/src/context/ScreenTransitionContext.tsx`](frontend/src/context/ScreenTransitionContext.tsx) — Coordinates screen change loading transitions with `useScreenTransition()`.
  - Single-flight concurrency safety: Automatically clears any in-flight transition timers when new transitions are triggered to prevent race conditions and premature spinner dismissal during rapid clicks.
  - Lifecycle unmount protection: Cleans up pending transition timeouts on component unmount to prevent memory leaks and React state update warnings.
  - Custom transition message preservation: Root layout app shell detects in-flight transitions and preserves custom route change status messages instead of overriding them with generic fallbacks.

---

### 17. `RouteFinderCard`
- **File**: [`frontend/src/components/RouteFinderCard.tsx`](frontend/src/components/RouteFinderCard.tsx)
- **Lineage**: Extends `BaseCard`, composes `BaseInput`, `BaseBadge`, `BaseButton`, `IconButton`
- **Description**: HomePage Role 1 shorthand route finder facilitating quick 2-point journeys (Origin and Destination points) with transport mode filters ("Trains", "Metro", "Busses"), station swap action, diacritic-insensitive duplicate validation, and prepared submission feedback showcasing the **Curated Trifecta** (⚡ Fastest, 💰 Best Value with €10/hr rule, 🛡️ Most Reliable with 25-35m Transfer Shield buffer) without executing feature redirection.
- **States & Handlers**:
  - `origin` & `destination`: Controlled text inputs with clearable actions extending `BaseInput`. Modifying text immediately clears active preview feedback.
  - `swap`: Swaps origin and destination stations using `IconButton` (`swap-vertical`). Immediately dismisses active preview feedback.
  - `modes`: Interactive multi-select filter chips (`Trains`, `Metro`, `Busses`) extending `BaseBadge`. Retains at least 1 active mode; toggling dismisses active preview feedback.
  - `onSubmitRoute`: Validates non-empty and distinct inputs, formats prepared query `{ origin, destination, modes }`, displays in-card Curated Trifecta preview cards, and invokes optional callback.
  - **Invariant**: Strictly does NOT execute router redirection.
- **Props**:
  - `initialOrigin`?: string (default `'București Nord'`)
  - `initialDestination`?: string (default `'Brașov'`)
  - `initialModes`?: `TransportMode[]` (default `['Trains', 'Metro', 'Busses']`)
  - `onSubmitRoute`?: `(params: RouteSearchParams) => void`
  - `style`?: StyleProp<ViewStyle>
  - `testID`?: string
- **When to Use**: HomePage hero action shorthand to capture user travel intent quickly.

---

### 18. `MarketingShowcase`
- **File**: [`frontend/src/components/MarketingShowcase.tsx`](frontend/src/components/MarketingShowcase.tsx)
- **Lineage**: Composed Feature Component (built with `BaseCard`, `BaseBadge`, `BaseButton`)
- **Description**: HomePage Role 2 clean marketing showcase placeholders promoting Beeline's capabilities, speed, and cross-border European coverage. Contains hero banner, 3 pillars (Speed: 300+ km/h, Coverage: 15+ European countries, Capabilities: Multi-modal live sync & eco footprint analytics), featured high-speed corridors, and trust metrics. Strictly contains NO map implementation.
- **Props**:
  - `onExplorePress`?: `() => void`
  - `onCorridorPress`?: `(corridor: FeaturedCorridor) => void`
  - `style`?: StyleProp<ViewStyle>
  - `testID`?: string
- **When to Use**: HomePage marketing promotion and corridor discovery without loading heavy maps.

---

## 4. Automated Storybook Testing Library

### Structure
- **Config**: [`frontend/.storybook/main.ts`](frontend/.storybook/main.ts) & [`frontend/.storybook/preview.tsx`](frontend/.storybook/preview.tsx)
- **Testing Utilities**: [`frontend/.storybook/testing.tsx`](frontend/.storybook/testing.tsx)
- **Registry**: [`frontend/.storybook/storybook.requires.ts`](frontend/.storybook/storybook.requires.ts)
- **Interactive UI**: [`frontend/.storybook/index.tsx`](frontend/.storybook/index.tsx)
- **Stories Directory**: [`frontend/src/components/stories/`](frontend/src/components/stories/)

### How Automated Tests Run
The test runner in [`frontend/__tests__/storybookAuto.test.tsx`](frontend/__tests__/storybookAuto.test.tsx) dynamically inspects every registered story in `.storybook/storybook.requires.ts`. For each component and every story variant:
1. Verifies non-null rendering inside the `TripProvider` and layout decorators.
2. Asserts proper accessibility tree attributes (`accessibilityRole`, `accessibilityLabel`).
3. Executes automated interaction play functions via `@storybook/testing-library`.

### How to Run Tests
```bash
# 1. Run all unit & automated Storybook tests
npm test

# 2. Run automated Storybook component test runner exclusively
npm run test:storybook

# 3. Run test coverage audit (>95% coverage)
npm run test:coverage

# 4. Run strict type-check
npm run type-check

# 5. Export production web bundle
npm run build:web
```

---

## 5. Guide: Creating and Extending Components for Future Agents

When asked to create a new component `NewWidget`:
1. **Search Catalog**:
   - Needs a clickable action? -> Extend `BaseButton` (like `LoginButton`, `PlanButton`, `IconButton`, `ResetButton`).
   - Needs an informative status/tag? -> Extend `BaseBadge` (like `StatusBadge`, `AmenityBadge`).
   - Needs text entry? -> Extend `BaseInput` (like `SearchInput`).
   - Needs a container? -> Extend `BaseCard` (like `TrainCard`).
2. **Implement Extension**:
   - Inherit props: `interface NewWidgetProps extends Omit<BaseButtonProps, ...> { ... }`.
   - Forward unhandled props via rest spread: `<BaseButton {...restProps} ... />`.
3. **Add Storybook Stories**:
   - Create `src/components/stories/NewWidget.stories.tsx`.
   - Register in `.storybook/storybook.requires.ts`.
4. **Add Automated Tests**:
   - Create `__tests__/NewWidget.test.tsx`.
   - Verify `storybookAuto.test.tsx` passes automatically.
5. **Update This Document**:
   - Add the new component to the inheritance tree, catalog, and instructions in this Markdown file.
