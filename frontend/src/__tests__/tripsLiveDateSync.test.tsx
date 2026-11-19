import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HomePage from '../app/page';
import TripsPage, { DEFAULT_TRIPS_ORIGIN, DEFAULT_TRIPS_DESTINATION } from '../app/trips/page';
import { TripProvider } from '../context/TripContext';
import * as tripBookingService from '../services/tripBookingService';
import { TransitRoutePlan } from '../types/routePlan';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/trips',
}));

const mockTripPlan: TransitRoutePlan = {
  id: 'plan-101',
  date: '2026-11-20',
  summary: 'IR 1572 Direct Express',
  departureTime: '2026-11-20T08:00:00+02:00',
  arrivalTime: '2026-11-20T10:45:00+02:00',
  totalDurationMinutes: 165,
  totalWalkMinutes: 5,
  totalWalkDistanceMeters: 100,
  transfersCount: 0,
  curatedPillar: 'FASTEST',
  curatedPillars: ['FASTEST'],
  query: {
    origin: 'București Nord',
    destination: 'Brașov',
    departureDate: '2026-11-20',
    allowedModes: ['TRAIN'],
  } as any,
  mascotRecommendation: {
    persona: 'barnaby',
    badgeLabel: 'FAST ROUTE',
    advice: 'Direct express rail journey.',
  },
  fare: {
    totalAmountLei: 68.5,
    totalAmountEur: 13.7,
    isIntegratedTicketAvailable: true,
    legFares: [],
  },
  riskAnalysis: {
    overallRiskScore: 12,
    riskLevel: 'LOW',
    historicalPunctualityRate: 0.95,
    tightestBufferMinutes: 999,
    bufferAdequacy: 'GENEROUS',
    riskSummaryText: 'Direct train',
    factors: [],
    expectedDelayMinutes: 0,
    missedConnectionProbability: 0,
    isMlComputed: true,
    riskFactors: [],
  },
  eco: {
    routeEmissionsKgCO2: 5,
    carEmissionsKgCO2: 30,
    savedKgCO2: 25,
    percentageSaved: 80,
    treeDaysEquivalent: 4,
  },
  legs: [
    {
      id: 'leg-1',
      legIndex: 0,
      transportType: 'TRAIN',
      names: {
        originName: 'București Nord',
        originCity: 'București',
        destinationName: 'Brașov',
        destinationCity: 'Brașov',
        lineCode: 'IR 1572',
        lineName: 'București ⇄ Brașov',
        operatorName: 'CFR Călători',
        operatorShortName: 'CFR',
      },
      coords: {
        originCoords: { latitude: 44.44, longitude: 26.07 },
        destinationCoords: { latitude: 45.65, longitude: 25.60 },
        intermediateStops: [],
        geometry: { type: 'LineString', coordinates: [[26.07, 44.44], [25.60, 45.65]] },
      },
      timings: {
        scheduledDeparture: '2026-11-20T08:00:00+02:00',
        scheduledArrival: '2026-11-20T10:45:00+02:00',
        estimatedDeparture: '2026-11-20T08:00:00+02:00',
        estimatedArrival: '2026-11-20T10:45:00+02:00',
        durationMinutes: 165,
        delayMinutes: 0,
        isRealtime: false,
      },
      risk: { legRiskScore: 10, historicalPunctualityPercent: 95, isShieldedBuffer: true, disruptions: [] },
      fare: { amount: 68.5, currency: 'RON', ticketCategory: 'RAIL_INTERREGIO', providerPaymentMethods: ['CONTACTLESS_CARD'] },
      amenities: { items: [], crowdingLevel: 'LOW', stepFreeAccess: true },
      instructions: { leadText: 'Board IR 1572', detailSteps: [], transferNotice: '' },
    },
  ],
  createdAt: '2026-11-19T00:00:00Z',
  validUntil: '2026-11-21T00:00:00Z',
};

describe('Trips Live & 2026-2027 Date Sync Test Suite', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [mockTripPlan],
      allDayDepartures: [],
      status: 'OK',
    });
  });

  it('renders Travel Date Picker with compact − / + stepper arrows on HomePage (zero invented pills/banners)', () => {
    render(<HomePage />);

    const datePicker = screen.getByTestId('travel-date-picker');
    expect(datePicker).toBeInTheDocument();
    expect(datePicker).toHaveAttribute('type', 'date');

    const prevBtn = screen.getByTestId('date-step-prev');
    const nextBtn = screen.getByTestId('date-step-next');
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    // Verify deleted invented text/elements do NOT exist
    expect(screen.queryByTestId('provider-booking-badge')).not.toBeInTheDocument();
    expect(screen.queryByText(/CFR SA \/ IRIS Verified Booking Window/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-pill-weekend')).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-pill-month')).not.toBeInTheDocument();
  });

  it('navigates directly from HomePage to /trips with URLSearchParams payload on submit', () => {
    render(<HomePage />);

    const datePicker = screen.getByTestId('travel-date-picker') as HTMLInputElement;
    fireEvent.change(datePicker, { target: { value: '2026-11-25' } });

    // Select Fast preference
    fireEvent.click(screen.getByTestId('pref-fast'));

    // Submit corridor search
    const submitBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });
    fireEvent.click(submitBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('/trips?');
    expect(calledUrl).toContain('origin=Gala%C8%9Bi');
    expect(calledUrl).toContain('destination=Bucure%C8%99ti+Nord');
    expect(calledUrl).toContain('date=2026-11-25');
    expect(calledUrl).toContain('pillar=FASTEST');
  });

  it('/trips opened with NO query params defaults cleanly to București Nord ➔ Brașov', async () => {
    mockSearchParams = new URLSearchParams(); // Empty query params

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    const originInput = (await screen.findByPlaceholderText(/Departure station or city\.\.\./i)) as HTMLInputElement;
    const destInput = screen.getByPlaceholderText(/Arrival station or city\.\.\./i) as HTMLInputElement;

    expect(originInput.value).toBe(DEFAULT_TRIPS_ORIGIN);
    expect(destInput.value).toBe(DEFAULT_TRIPS_DESTINATION);
    expect(originInput.value).toBe('București Nord');
    expect(destInput.value).toBe('Brașov');
  });

  it('/trips with HomePage deep link payload preserves payload and is NEVER overwritten by default', async () => {
    mockSearchParams = new URLSearchParams({
      origin: 'Galați',
      destination: 'București Nord',
      pillar: 'FASTEST',
      date: '2026-11-20',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    const originInput = (await screen.findByPlaceholderText(/Departure station or city\.\.\./i)) as HTMLInputElement;
    const destInput = screen.getByPlaceholderText(/Arrival station or city\.\.\./i) as HTMLInputElement;

    expect(originInput.value).toBe('Galați');
    expect(destInput.value).toBe('București Nord');
    expect(originInput.value).not.toBe(DEFAULT_TRIPS_ORIGIN);
  });

  it('changing origin/destination directly inside /trips updates corridor and is NEVER overwritten by default', async () => {
    mockSearchParams = new URLSearchParams({
      origin: 'București Nord',
      destination: 'Brașov',
      date: '2026-11-20',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    const originInput = (await screen.findByPlaceholderText(/Departure station or city\.\.\./i)) as HTMLInputElement;
    const destInput = screen.getByPlaceholderText(/Arrival station or city\.\.\./i) as HTMLInputElement;

    // Swap corridor
    const swapBtn = screen.getByTitle('Swap Stations');
    fireEvent.click(swapBtn);
    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());

    expect(originInput.value).toBe('Brașov');
    expect(destInput.value).toBe('București Nord');
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('origin=Bra%C8%99ov&destination=Bucure%C8%99ti+Nord')
    );
  });

  it('displays no-trains-error-state with 0 trip cards when corridor returns 0 real trains', async () => {
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [],
      allDayDepartures: [],
      status: 'NO_TRAINS',
      error: 'No trains available for Atlantis → Mars on 2026-11-20',
    });

    mockSearchParams = new URLSearchParams({
      origin: 'Atlantis',
      destination: 'Mars',
      date: '2026-11-20',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    const errorState = await screen.findByTestId('no-trains-error-state');
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveAttribute('role', 'alert');
    expect(errorState).toHaveTextContent(/No trains available for Atlantis → Mars on 2026-11-20/i);

    // Verify 0 trip cards are rendered
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();

    // Verify recovery reset button loads default corridor
    const resetCorridorBtn = screen.getByTestId('reset-default-corridor-btn');
    expect(resetCorridorBtn).toBeInTheDocument();
    fireEvent.click(resetCorridorBtn);
    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());

    const originInput = screen.getByPlaceholderText(/Departure station or city\.\.\./i) as HTMLInputElement;
    const destInput = screen.getByPlaceholderText(/Arrival station or city\.\.\./i) as HTMLInputElement;
    expect(originInput.value).toBe('București Nord');
    expect(destInput.value).toBe('Brașov');
  });

  it('searching origin="da Nordgalaaa", destination="Brașov" displays no-trains-error-state, 0 trip cards, and NO stale summary stats', async () => {
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [],
      allDayDepartures: [],
      status: 'NO_TRAINS',
      error: 'No trains available for da Nordgalaaa → Brașov on 2026-11-20',
    });

    mockSearchParams = new URLSearchParams({
      origin: 'da Nordgalaaa',
      destination: 'Brașov',
      date: '2026-11-20',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    const errorState = await screen.findByTestId('no-trains-error-state');
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveAttribute('role', 'alert');
    expect(errorState).toHaveTextContent(/No trains available for da Nordgalaaa → Brașov/i);

    // Verify 0 trip cards are rendered
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();

    // Verify NO summary stats are displayed (BEST PRICE, FASTEST TRANSIT, TRANSFER SHIELD)
    expect(screen.queryByText(/Best Price/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fastest Transit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfer Shield/i)).not.toBeInTheDocument();
  });

  it('renders Day-X Navigation Bar and Date controls on /trips', async () => {
    mockSearchParams = new URLSearchParams({
      origin: 'București Nord',
      destination: 'Brașov',
      date: '2026-11-20',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    const dateBar = await screen.findByTestId('trips-date-bar');
    expect(dateBar).toBeInTheDocument();

    const prevDayBtn = screen.getByTestId('trips-prev-day');
    const nextDayBtn = screen.getByTestId('trips-next-day');
    const dateInput = screen.getByTestId('trips-date-input') as HTMLInputElement;

    expect(prevDayBtn).toBeInTheDocument();
    expect(nextDayBtn).toBeInTheDocument();
    expect(dateInput).toBeInTheDocument();
    expect(dateInput.value).toBe('2026-11-20');

    // Next day click increments date
    fireEvent.click(nextDayBtn);
    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    expect(dateInput.value).toBe('2026-11-21');
  });

  it('shows booking window alert when a past date is selected on /trips', async () => {
    mockSearchParams = new URLSearchParams({
      origin: 'București Nord',
      destination: 'Brașov',
      date: '2024-01-01',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    const alert = await screen.findByTestId('booking-window-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Cannot plan or book a trip in the past/i);
  });

  it('strictly contains ZERO canvas and ZERO leaflet-container elements across both pages', async () => {
    const { container: homeContainer } = render(<HomePage />);
    expect(homeContainer.querySelector('canvas')).toBeNull();
    expect(homeContainer.querySelector('.leaflet-container')).toBeNull();

    const { container: tripsContainer } = render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );
    await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());
    expect(tripsContainer.querySelector('canvas')).toBeNull();
    expect(tripsContainer.querySelector('.leaflet-container')).toBeNull();
  });

  it('displays glassmorphic shimmering ghost skeleton layout while waiting for backend search response, then renders trip cards on resolve', async () => {
    let resolveSearch!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });

    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockImplementation(() => pendingPromise as any);

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // 1. Assert data-testid="trips-ghost-skeleton" (role="status", aria-busy="true") is visible
    const skeleton = screen.getByTestId('trips-ghost-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading available train routes');

    // 2. Assert 3 data-testid="ghost-summary-card" and 4 data-testid="ghost-trip-card" are rendered with .glass-shimmer-overlay inside
    const summaryCards = screen.getAllByTestId('ghost-summary-card');
    expect(summaryCards).toHaveLength(3);
    summaryCards.forEach((card) => {
      expect(card.querySelector('.glass-shimmer-overlay')).toBeInTheDocument();
      expect(card).toHaveClass('glass-ghost-card');
    });

    const tripCards = screen.getAllByTestId('ghost-trip-card');
    expect(tripCards).toHaveLength(4);
    tripCards.forEach((card) => {
      expect(card.querySelector('.glass-shimmer-overlay')).toBeInTheDocument();
      expect(card).toHaveClass('glass-ghost-card');
    });

    // 3. Assert no-trains-error-state is NOT in the DOM while loading
    expect(screen.queryByTestId('no-trains-error-state')).not.toBeInTheDocument();

    // 4. Assert 0 trip cards are rendered while loading
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();

    // 5. Resolve the promise
    await act(async () => {
      resolveSearch({
        plans: [mockTripPlan],
        allDayDepartures: [],
        status: 'OK',
      });
    });

    // 6. Assert trips-ghost-skeleton disappears and the real trips render
    expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    expect(await screen.findByTestId('booking-trip-card')).toBeInTheDocument();
    expect(screen.getByText('IR 1572')).toBeInTheDocument();
  });

  it('triggers glassmorphic shimmering ghost skeleton layout again when changing travel date or submitting re-search', async () => {
    let resolveFirst!: (value: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const fetchSpy = jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockImplementation(() => firstPromise as any);

    mockSearchParams = new URLSearchParams({
      origin: 'București Nord',
      destination: 'Brașov',
      date: '2026-11-20',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // Initial search loading
    expect(screen.getByTestId('trips-ghost-skeleton')).toBeInTheDocument();

    // Resolve first search
    await act(async () => {
      resolveFirst({
        plans: [mockTripPlan],
        allDayDepartures: [],
        status: 'OK',
      });
    });

    expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('booking-trip-card')).toBeInTheDocument();

    // Trigger second search with new pending promise
    let resolveSecond!: (value: any) => void;
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    fetchSpy.mockImplementation(() => secondPromise as any);

    // Click next day to trigger re-search
    const nextDayBtn = screen.getByTestId('trips-next-day');
    fireEvent.click(nextDayBtn);

    // Assert trips-ghost-skeleton reappears immediately
    expect(screen.getByTestId('trips-ghost-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();

    // Resolve second search
    await act(async () => {
      resolveSecond({
        plans: [mockTripPlan],
        allDayDepartures: [],
        status: 'OK',
      });
    });

    // Assert loading skeleton disappears and trip cards return
    expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('booking-trip-card')).toBeInTheDocument();
  });

  it('hides ghost skeleton and displays no-trains-error-state when backend responds with 0 trains', async () => {
    let resolveSearch!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });

    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockImplementation(() => pendingPromise as any);

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // While loading, ghost skeleton is visible and no-trains-error-state is NOT in DOM
    expect(screen.getByTestId('trips-ghost-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('no-trains-error-state')).not.toBeInTheDocument();

    // Resolve with plans: []
    await act(async () => {
      resolveSearch({
        plans: [],
        allDayDepartures: [],
        status: 'NO_TRAINS',
        error: 'No trains available for this corridor',
      });
    });

    // Assert loading skeleton disappears and no-trains-error-state appears cleanly
    expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    const errorState = await screen.findByTestId('no-trains-error-state');
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();
  });

  it('allows testing loading state via Debug Tools popup and restores results upon stopping', async () => {
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [mockTripPlan],
      allDayDepartures: [],
      status: 'OK',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // Wait for /trips to finish initial loading and render real trips
    await waitFor(() => {
      expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('booking-trip-card')).toBeInTheDocument();
    expect(screen.queryByTestId('no-trains-error-state')).not.toBeInTheDocument();

    // Click Open Debug Tools button
    const debugTrigger = screen.getByRole('button', { name: /Open Debug Tools/i });
    expect(debugTrigger).toBeInTheDocument();
    fireEvent.click(debugTrigger);

    // Assert Debug modal is visible
    expect(screen.getByText(/Mascot Gear Override Panel/i)).toBeInTheDocument();

    // Click data-testid="debug-toggle-loading-state" ("Test Loading State")
    const testLoadingBtn = screen.getByTestId('debug-toggle-loading-state');
    expect(testLoadingBtn).toHaveTextContent('Test Loading State');
    fireEvent.click(testLoadingBtn);

    // Assert data-testid="trips-ghost-skeleton" appears immediately with 3 ghost summary cards and 4 ghost trip cards,
    // 0 trip cards are rendered, and no-trains-error-state is NOT shown
    const skeleton = screen.getByTestId('trips-ghost-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(screen.getAllByTestId('ghost-summary-card')).toHaveLength(3);
    expect(screen.getAllByTestId('ghost-trip-card')).toHaveLength(4);
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-trains-error-state')).not.toBeInTheDocument();

    // Re-open Debug Tools and click "Stop Loading State"
    fireEvent.click(debugTrigger);
    const stopLoadingBtn = screen.getByTestId('debug-toggle-loading-state');
    expect(stopLoadingBtn).toHaveTextContent('Stop Loading State');
    fireEvent.click(stopLoadingBtn);

    // Assert trips-ghost-skeleton disappears and the real trip cards reappear cleanly
    expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('booking-trip-card')).toBeInTheDocument();
    expect(screen.queryByTestId('no-trains-error-state')).not.toBeInTheDocument();
  });

  it('resets forced loading state when clicking Reset to Automatic Route Mode in Debug Tools', async () => {
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [mockTripPlan],
      allDayDepartures: [],
      status: 'OK',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // Wait for /trips to finish initial loading and render real trips
    await waitFor(() => {
      expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('booking-trip-card')).toBeInTheDocument();

    // Open Debug Tools and start forced loading
    const debugTrigger = screen.getByRole('button', { name: /Open Debug Tools/i });
    fireEvent.click(debugTrigger);
    fireEvent.click(screen.getByTestId('debug-toggle-loading-state'));

    // Verify loading ghost skeleton is visible
    expect(screen.getByTestId('trips-ghost-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-trip-card')).not.toBeInTheDocument();

    // Re-open Debug Tools and click Reset to Automatic Route Mode
    fireEvent.click(debugTrigger);
    const resetBtn = screen.getByRole('button', { name: /Reset to Automatic Route Mode/i });
    fireEvent.click(resetBtn);

    // Loading should be stopped and trip cards restored
    expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('booking-trip-card')).toBeInTheDocument();
  });
});
