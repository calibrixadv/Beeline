import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.setTimeout(20000);
import TripsPage from '../app/trips/page';
import BookingTripCard from '../components/BookingTripCard';
import { TripProvider } from '../context/TripContext';
import * as tripBookingService from '../services/tripBookingService';
import { TransitRoutePlan } from '../types/routePlan';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/trips',
}));

// Helper to create mock plans
function createMockPlan(
  id: string,
  trainNumber: string,
  depTime: string,
  arrTime: string,
  durationMinutes: number,
  fareLei: number,
  curatedPillars: Array<'MOST_RELIABLE' | 'FASTEST' | 'BEST_VALUE'>,
  curatedPillar: 'MOST_RELIABLE' | 'FASTEST' | 'BEST_VALUE' | null
): TransitRoutePlan {
  return {
    id,
    date: '2026-11-20',
    summary: `${trainNumber} Direct Express`,
    departureTime: `2026-11-20T${depTime}:00+02:00`,
    arrivalTime: `2026-11-20T${arrTime}:00+02:00`,
    totalDurationMinutes: durationMinutes,
    totalWalkMinutes: 5,
    totalWalkDistanceMeters: 150,
    transfersCount: 0,
    query: {
      origin: 'Galați',
      destination: 'București Nord',
      departureDate: '2026-11-20',
      allowedModes: ['TRAIN'],
    } as any,
    curatedPillar: curatedPillar as any,
    curatedPillars: curatedPillars as any,
    mascotRecommendation: {
      persona: 'bumble',
      badgeLabel: 'HONEY SHIELD',
      advice: 'Smooth journey.',
    },
    riskAnalysis: {
      overallRiskScore: 10,
      riskLevel: 'LOW',
      historicalPunctualityRate: 0.95,
      tightestBufferMinutes: 999,
      bufferAdequacy: 'GENEROUS',
      riskSummaryText: 'Direct rail trip.',
      factors: [],
      expectedDelayMinutes: 0,
      missedConnectionProbability: 0.0,
      isMlComputed: true,
      riskFactors: ['Safe direct train'],
    },
    fare: {
      totalAmountLei: fareLei,
      totalAmountEur: fareLei / 5.0,
      isIntegratedTicketAvailable: true,
      legFares: [
        {
          legId: `leg-${id}`,
          operator: 'CFR Călători',
          amountLei: fareLei,
          amountEur: fareLei / 5.0,
        },
      ],
    },
    eco: {
      routeEmissionsKgCO2: 5.0,
      carEmissionsKgCO2: 30.0,
      savedKgCO2: 25.0,
      percentageSaved: 80.0,
      treeDaysEquivalent: 4.0,
    },
    legs: [
      {
        id: `leg-${id}`,
        legIndex: 0,
        transportType: 'TRAIN',
        names: {
          originName: 'Galați',
          originCity: 'Galați',
          destinationName: 'București Nord',
          destinationCity: 'București',
          lineCode: trainNumber,
          lineName: 'Galați ⇄ București Nord',
          operatorName: 'CFR Călători',
          operatorShortName: 'CFR',
        },
        coords: {
          originCoords: { latitude: 45.4418, longitude: 28.0583 },
          destinationCoords: { latitude: 44.4473, longitude: 26.0747 },
          intermediateStops: [],
          geometry: { type: 'LineString', coordinates: [[28.0583, 45.4418], [26.0747, 44.4473]] },
        },
        timings: {
          scheduledDeparture: `2026-11-20T${depTime}:00+02:00`,
          scheduledArrival: `2026-11-20T${arrTime}:00+02:00`,
          estimatedDeparture: `2026-11-20T${depTime}:00+02:00`,
          estimatedArrival: `2026-11-20T${arrTime}:00+02:00`,
          durationMinutes,
          delayMinutes: 0,
          isRealtime: false,
        },
        risk: {
          legRiskScore: 10,
          historicalPunctualityPercent: 95,
          isShieldedBuffer: true,
          disruptions: [],
        },
        fare: {
          amount: fareLei,
          currency: 'RON',
          ticketCategory: 'RAIL_INTERREGIO',
          providerPaymentMethods: ['CONTACTLESS_CARD'],
        },
        amenities: { items: [], crowdingLevel: 'LOW', stepFreeAccess: true },
        instructions: { leadText: `Board ${trainNumber}`, detailSteps: [], transferNotice: '' },
      },
    ],
    createdAt: '2026-11-19T00:00:00Z',
    validUntil: '2026-11-21T00:00:00Z',
  };
}

describe('Trips All-Day Routes & Multi-Badge Pillar Test Suite', () => {
  const mock6Plans: TransitRoutePlan[] = [
    // Plan 1: Wins BOTH MOST_RELIABLE and BEST_VALUE (safest and cheapest!)
    createMockPlan(
      'plan-1',
      'RE 11631',
      '05:30',
      '08:50',
      200,
      38.5,
      ['MOST_RELIABLE', 'BEST_VALUE'],
      'MOST_RELIABLE'
    ),
    // Plan 2: Wins FASTEST
    createMockPlan('plan-2', 'IC 572', '07:15', '10:45', 180, 85.0, ['FASTEST'], 'FASTEST'),
    // Plan 3: Standard departure
    createMockPlan('plan-3', 'IR 1572', '09:00', '12:40', 220, 63.0, [], null),
    // Plan 4: Standard departure
    createMockPlan('plan-4', 'IR 1574', '12:30', '16:15', 225, 63.0, [], null),
    // Plan 5: Standard departure
    createMockPlan('plan-5', 'IR 10074', '15:45', '19:25', 220, 58.0, [], null),
    // Plan 6: Standard departure
    createMockPlan('plan-6', 'IR 1576', '18:20', '22:05', 225, 63.0, [], null),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams({
      origin: 'Galați',
      destination: 'București Nord',
      date: '2026-11-20',
      pillar: 'MOST_RELIABLE',
    });

    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: mock6Plans,
      allDayDepartures: [],
      bookingWindow: {
        minDate: '2026-11-19',
        maxDate: '2027-02-17',
        advanceBookingDays: 90,
        activeTimetable: '2025-2026 / 2026-2027',
        liveSource: 'INFOFER_IRIS_AND_OFFICIAL_XML',
      },
    });
  });

  it('renders ALL 6 unique routes for day X by default even when deep-linked with ?pillar=MOST_RELIABLE', async () => {
    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // Wait for trips count header to display 6 unique trains
    await waitFor(() => {
      const countHeader = screen.getByTestId('trips-count-header');
      expect(countHeader).toBeInTheDocument();
      expect(countHeader).toHaveTextContent(/Showing 6 unique trains operating on 2026-11-20/i);
    });

    // Assert that all 6 unique train cards are visible in the document
    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.getByText('IC 572')).toBeInTheDocument();
      expect(screen.getByText('IR 1572')).toBeInTheDocument();
      expect(screen.getByText('IR 1574')).toBeInTheDocument();
      expect(screen.getByText('IR 10074')).toBeInTheDocument();
      expect(screen.getByText('IR 1576')).toBeInTheDocument();
    });
  });

  it('renders BOTH badge-MOST_RELIABLE and badge-BEST_VALUE on a single multi-badge card with zero duplicate cards', async () => {
    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await screen.findByTestId('trips-count-header');

    // Multi-badge card: RE 11631
    const multiBadgeCard = screen.getByText('RE 11631').closest('[data-testid="booking-trip-card"]');
    expect(multiBadgeCard).not.toBeNull();

    // Assert BOTH badges are present within this single card
    const reliableBadge = screen.getByTestId('badge-MOST_RELIABLE');
    const bestValueBadge = screen.getByTestId('badge-BEST_VALUE');
    expect(reliableBadge).toBeInTheDocument();
    expect(bestValueBadge).toBeInTheDocument();
    expect(reliableBadge).toHaveTextContent(/Meli/i);
    expect(bestValueBadge).toHaveTextContent(/Flora/i);

    // Assert fastest badge is on IC 572
    const fastestBadge = screen.getByTestId('badge-FASTEST');
    expect(fastestBadge).toBeInTheDocument();
    expect(fastestBadge).toHaveTextContent(/Vira/i);

    // Assert RE 11631 occurs exactly once (never duplicated)
    const occurrences = screen.getAllByText('RE 11631');
    expect(occurrences).toHaveLength(1);
  });

  it('includes multi-badge card when filtering by either MOST_RELIABLE or BEST_VALUE', async () => {
    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await screen.findByTestId('trips-count-header');

    // 1. Click "Reliable" pillar filter (Queen Meli)
    const reliableBtn = screen.getByRole('button', { name: /Queen Meli/i });
    fireEvent.click(reliableBtn);

    // Multi-badge route RE 11631 is included
    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.queryByText('IC 572')).not.toBeInTheDocument();
    });

    // 2. Click "Eco" pillar filter (Queen Flora)
    const bestValueBtn = screen.getByRole('button', { name: /Queen Flora/i });
    fireEvent.click(bestValueBtn);

    // Multi-badge route RE 11631 is ALSO included under Best Value
    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.queryByText('IC 572')).not.toBeInTheDocument();
    });

    // 3. Click "Fastest" pillar filter (Queen Vira)
    const fastestBtn = screen.getByRole('button', { name: /Queen Vira/i });
    fireEvent.click(fastestBtn);

    // IC 572 is shown under fastest
    await waitFor(() => {
      expect(screen.getByText('IC 572')).toBeInTheDocument();
      expect(screen.queryByText('RE 11631')).not.toBeInTheDocument();
    });

    // 4. Click "All Trips" filter to restore all 6 trains
    const allBtn = screen.getByRole('button', { name: /^All Trips$/i });
    fireEvent.click(allBtn);

    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.getByText('IC 572')).toBeInTheDocument();
      expect(screen.getByText('IR 1572')).toBeInTheDocument();
    });
  }, 15000);

  it('renders blended-in 3-stat summary strip with computed values and supports secondary filters drawer on /trips', async () => {
    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await screen.findByTestId('trips-count-header');

    // Verify 3 summary metrics are present and computed correctly
    const strip = screen.getByTestId('summary-stats-strip');
    expect(strip).toBeInTheDocument();

    const bestPriceStat = screen.getByTestId('stat-best-price');
    expect(bestPriceStat).toHaveTextContent(/Best Price/i);
    expect(bestPriceStat).toHaveTextContent(/LEI/i);

    const fastestStat = screen.getByTestId('stat-fastest-transit');
    expect(fastestStat).toHaveTextContent(/Fastest Transit/i);
    expect(fastestStat).toHaveTextContent(/h.*m/i);

    const shieldStat = screen.getByTestId('stat-transfer-shield');
    expect(shieldStat).toHaveTextContent(/Transfer Shield/i);
    expect(shieldStat).toHaveTextContent(/% Reliable/i);

    // Verify secondary filters panel is hidden initially
    expect(screen.queryByTestId('more-filters-panel')).not.toBeInTheDocument();

    // Open More filters drawer
    const toggleBtn = screen.getByTestId('toggle-more-filters');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const panel = await screen.findByTestId('more-filters-panel');
    expect(panel).toBeInTheDocument();

    // Select operator CFR Călători
    const cfrBtn = screen.getByRole('button', { name: 'CFR Călători' });
    fireEvent.click(cfrBtn);

    // Active secondary count badge appears
    await waitFor(() => {
      const badge = screen.getByTestId('active-secondary-count-badge');
      expect(badge).toHaveTextContent('1');
    });

    // Close More filters drawer
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('more-filters-panel')).not.toBeInTheDocument();
  }, 15000);
});

describe('BookingTripCard Engraved and Filled Pillar Badges Focused Suite', () => {
  it('renders a card with curatedPillars: [FASTEST, BEST_VALUE] showing badge-FASTEST, badge-BEST_VALUE, and badge-engraved-MOST_RELIABLE', () => {
    const plan = createMockPlan('card-1', 'IC 572', '08:00', '11:00', 180, 75, ['FASTEST', 'BEST_VALUE'], null);
    render(<BookingTripCard plan={plan} />);

    // 1. Active badges
    const fastest = screen.getByTestId('badge-FASTEST');
    expect(fastest).toBeInTheDocument();
    expect(fastest).toHaveAttribute('data-badge-state', 'active');
    expect(fastest).toHaveAttribute('aria-label', 'Queen Vira — Fastest (active route badge)');
    expect(fastest).toHaveTextContent('Vira');

    const bestValue = screen.getByTestId('badge-BEST_VALUE');
    expect(bestValue).toBeInTheDocument();
    expect(bestValue).toHaveAttribute('data-badge-state', 'active');
    expect(bestValue).toHaveAttribute('aria-label', 'Queen Flora — Best Value (active route badge)');
    expect(bestValue).toHaveTextContent('Flora');

    // 2. Engraved slot
    const engravedReliable = screen.getByTestId('badge-engraved-MOST_RELIABLE');
    expect(engravedReliable).toBeInTheDocument();
    expect(engravedReliable).toHaveAttribute('data-badge-state', 'engraved');
    expect(engravedReliable).toHaveAttribute('aria-label', 'Queen Meli — Most Reliable (not top ranked for this train)');
    expect(engravedReliable).toHaveTextContent('Meli');

    // 3. Confirm opposite states are absent
    expect(screen.queryByTestId('badge-MOST_RELIABLE')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-engraved-FASTEST')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-engraved-BEST_VALUE')).not.toBeInTheDocument();
  });

  it('renders a standard card with curatedPillars: [] showing all 3 engraved slots and 0 active badges', () => {
    const standardPlan = createMockPlan('card-2', 'IR 1572', '09:00', '12:40', 220, 63.0, [], null);
    render(<BookingTripCard plan={standardPlan} />);

    // All 3 engraved
    const engravedReliable = screen.getByTestId('badge-engraved-MOST_RELIABLE');
    const engravedFastest = screen.getByTestId('badge-engraved-FASTEST');
    const engravedBestValue = screen.getByTestId('badge-engraved-BEST_VALUE');

    expect(engravedReliable).toBeInTheDocument();
    expect(engravedReliable).toHaveAttribute('data-badge-state', 'engraved');
    expect(engravedReliable).toHaveAttribute('aria-label', 'Queen Meli — Most Reliable (not top ranked for this train)');

    expect(engravedFastest).toBeInTheDocument();
    expect(engravedFastest).toHaveAttribute('data-badge-state', 'engraved');
    expect(engravedFastest).toHaveAttribute('aria-label', 'Queen Vira — Fastest (not top ranked for this train)');

    expect(engravedBestValue).toBeInTheDocument();
    expect(engravedBestValue).toHaveAttribute('data-badge-state', 'engraved');
    expect(engravedBestValue).toHaveAttribute('aria-label', 'Queen Flora — Best Value (not top ranked for this train)');

    // 0 active badges
    expect(screen.queryByTestId('badge-MOST_RELIABLE')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-FASTEST')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-BEST_VALUE')).not.toBeInTheDocument();
  });

  it('preserves trip-train-code, train-itinerary-trigger, trip-collapsed-summary, and expandable RouteItineraryTimeline', () => {
    const richPlan: TransitRoutePlan = {
      ...createMockPlan('card-3', 'RE 11631', '06:00', '09:00', 180, 50, ['MOST_RELIABLE'], 'MOST_RELIABLE'),
      legs: [
        {
          ...createMockPlan('card-3', 'RE 11631', '06:00', '09:00', 180, 50, ['MOST_RELIABLE'], 'MOST_RELIABLE').legs[0],
          intermediateStopCount: 7,
          distanceKm: 259.6,
          stops: [
            {
              stopSequence: 1,
              stationCode: 'GLT',
              stationName: 'Galați',
              city: 'Galați',
              arrivalTime: null,
              departureTime: '2026-11-20T06:00:00+02:00',
              dwellMinutes: 0,
              distanceFromOriginKm: 0.0,
              stopType: 'BOARDING',
            },
            {
              stopSequence: 2,
              stationCode: 'BRL',
              stationName: 'Brăila',
              city: 'Brăila',
              arrivalTime: '2026-11-20T06:30:00+02:00',
              departureTime: '2026-11-20T06:32:00+02:00',
              dwellMinutes: 2,
              distanceFromOriginKm: 31.2,
              stopType: 'INTERMEDIATE',
            },
            {
              stopSequence: 3,
              stationCode: 'BCT',
              stationName: 'București Nord',
              city: 'București',
              arrivalTime: '2026-11-20T09:00:00+02:00',
              departureTime: null,
              dwellMinutes: 0,
              distanceFromOriginKm: 259.6,
              stopType: 'ALIGHTING',
            },
          ],
        },
      ],
    };

    render(<BookingTripCard plan={richPlan} />);

    // 1. Train code & trigger
    const trainCode = screen.getByTestId('trip-train-code');
    expect(trainCode).toHaveTextContent('RE 11631');
    const trigger = screen.getByTestId('train-itinerary-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', expect.stringContaining('/Tren/11631?Date='));
    expect(trigger).toHaveAttribute('target', '_blank');

    // 2. Borderless inline collapsed summary
    const summary = screen.getByTestId('trip-collapsed-summary');
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).toMatch(/Direct/i);
    expect(summary.textContent).toMatch(/7 stops/i);
    expect(summary.textContent).toMatch(/259\.6 km/i);

    // 3. Expand accordion & RouteItineraryTimeline
    const expandBtn = screen.getByRole('button', { name: /view stopovers & shield analysis/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText('Itinerary Breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('route-itinerary-timeline')).toBeInTheDocument();
  });
});

describe('BookingTripCard Accurate Connection & Transfer Chance Labels', () => {
  it('renders "Direct route" with emerald styling when transfersCount === 0 (regardless of missedConnectionProbability)', () => {
    const directPlan = {
      ...createMockPlan('card-direct', 'IR 1572', '08:00', '11:00', 180, 60, [], null),
      transfersCount: 0,
      riskAnalysis: {
        ...createMockPlan('card-direct', 'IR 1572', '08:00', '11:00', 180, 60, [], null).riskAnalysis,
        isMlComputed: true,
        missedConnectionProbability: 0.04,
      },
    };

    render(<BookingTripCard plan={directPlan} />);

    const label = screen.getByTestId('trip-connection-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Direct route');
    expect(label).toHaveClass('text-emerald-700');
    expect(screen.queryByText(/connection guarantee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transfer chance/i)).not.toBeInTheDocument();
  });

  it('renders low connection percentage (0.98 missed probability -> 2% transfer chance) with rose/red styling (NOT green)', () => {
    const connectingPlan: TransitRoutePlan = {
      ...createMockPlan('card-conn-low', 'IR 1574 + R 3001', '09:00', '13:30', 270, 75, [], null),
      transfersCount: 1,
      legs: [
        {
          ...createMockPlan('card-conn-low', 'IR 1574', '09:00', '11:00', 120, 45, [], null).legs[0],
          id: 'leg-1',
        },
        {
          ...createMockPlan('card-conn-low', 'R 3001', '11:30', '13:30', 120, 30, [], null).legs[0],
          id: 'leg-2',
        },
      ],
      riskAnalysis: {
        ...createMockPlan('card-conn-low', 'IR 1574', '09:00', '11:00', 120, 45, [], null).riskAnalysis,
        isMlComputed: true,
        missedConnectionProbability: 0.98,
      },
    };

    render(<BookingTripCard plan={connectingPlan} />);

    const label = screen.getByTestId('trip-connection-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('2% transfer chance');
    expect(label).toHaveClass('text-rose-700');
    expect(label).not.toHaveClass('text-emerald-700');
    expect(screen.queryByText(/connection guarantee/i)).not.toBeInTheDocument();
  });

  it('renders high connection percentage (0.04 missed probability -> 96% transfer chance) with emerald styling', () => {
    const connectingPlan: TransitRoutePlan = {
      ...createMockPlan('card-conn-high', 'IR 1574 + R 3001', '09:00', '13:30', 270, 75, [], null),
      transfersCount: 1,
      legs: [
        {
          ...createMockPlan('card-conn-high', 'IR 1574', '09:00', '11:00', 120, 45, [], null).legs[0],
          id: 'leg-1',
        },
        {
          ...createMockPlan('card-conn-high', 'R 3001', '11:30', '13:30', 120, 30, [], null).legs[0],
          id: 'leg-2',
        },
      ],
      riskAnalysis: {
        ...createMockPlan('card-conn-high', 'IR 1574', '09:00', '11:00', 120, 45, [], null).riskAnalysis,
        isMlComputed: true,
        missedConnectionProbability: 0.04,
      },
    };

    render(<BookingTripCard plan={connectingPlan} />);

    const label = screen.getByTestId('trip-connection-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('96% transfer chance');
    expect(label).toHaveClass('text-emerald-700');
    expect(label).not.toHaveClass('text-rose-700');
    expect(screen.queryByText(/connection guarantee/i)).not.toBeInTheDocument();
  });

  it('renders moderate connection percentage (0.35 missed probability -> 65% transfer chance) with amber styling', () => {
    const connectingPlan: TransitRoutePlan = {
      ...createMockPlan('card-conn-mod', 'IR 1574 + R 3001', '09:00', '13:30', 270, 75, [], null),
      transfersCount: 1,
      legs: [
        {
          ...createMockPlan('card-conn-mod', 'IR 1574', '09:00', '11:00', 120, 45, [], null).legs[0],
          id: 'leg-1',
        },
        {
          ...createMockPlan('card-conn-mod', 'R 3001', '11:30', '13:30', 120, 30, [], null).legs[0],
          id: 'leg-2',
        },
      ],
      riskAnalysis: {
        ...createMockPlan('card-conn-mod', 'IR 1574', '09:00', '11:00', 120, 45, [], null).riskAnalysis,
        isMlComputed: true,
        missedConnectionProbability: 0.35,
      },
    };

    render(<BookingTripCard plan={connectingPlan} />);

    const label = screen.getByTestId('trip-connection-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('65% transfer chance');
    expect(label).toHaveClass('text-amber-700');
  });

  it('guarantees Flora (BEST_VALUE) strictly on the cheapest route when client filters narrow down trips', () => {
    const plans: TransitRoutePlan[] = [
      createMockPlan('p-1', 'IR 100', '06:00', '08:00', 120, 80, ['BEST_VALUE'], 'BEST_VALUE'),
      createMockPlan('p-2', 'IR 200', '07:00', '09:00', 120, 45, [], null),
      createMockPlan('p-3', 'IR 300', '08:00', '10:00', 120, 60, [], null),
    ];

    // Filter without pillar: Flora MUST be reassigned to p-2 (45 LEI) because 45 < 80
    const filtered = tripBookingService.filterAndSortTrips(plans, { ...tripBookingService.DEFAULT_TRIP_FILTERS });
    const cheapest = filtered.find((p) => p.id === 'p-2');
    const expensive = filtered.find((p) => p.id === 'p-1');

    expect(cheapest?.curatedPillars).toContain('BEST_VALUE');
    expect(expensive?.curatedPillars).not.toContain('BEST_VALUE');
  });

  it('awards active Flora (BEST_VALUE) badge to ALL routes tied for the strict lowest price (e.g. 39.12 LEI)', () => {
    const tiedPlan1 = createMockPlan('tie-1', 'IR 100', '06:00', '08:00', 120, 39.12, [], null);
    const tiedPlan2 = createMockPlan('tie-2', 'IR 200', '07:30', '09:30', 120, 39.12, [], null);
    const pricierPlan = createMockPlan('pricier', 'IC 300', '09:00', '11:00', 120, 55.0, ['BEST_VALUE'], 'BEST_VALUE');

    // 1. Reconcile via filterAndSortTrips
    const filtered = tripBookingService.filterAndSortTrips(
      [tiedPlan1, tiedPlan2, pricierPlan],
      { ...tripBookingService.DEFAULT_TRIP_FILTERS }
    );

    const res1 = filtered.find((p) => p.id === 'tie-1');
    const res2 = filtered.find((p) => p.id === 'tie-2');
    const resPricier = filtered.find((p) => p.id === 'pricier');

    expect(res1?.curatedPillars).toContain('BEST_VALUE');
    expect(res2?.curatedPillars).toContain('BEST_VALUE');
    expect(resPricier?.curatedPillars).not.toContain('BEST_VALUE');
    expect(resPricier?.curatedPillar).not.toBe('BEST_VALUE');

    // 2. Render both tied trip cards and verify Flora is active on both
    const { rerender } = render(<BookingTripCard plan={res1!} />);
    const badge1 = screen.getByTestId('badge-BEST_VALUE');
    expect(badge1).toBeInTheDocument();
    expect(badge1).toHaveAttribute('data-badge-state', 'active');
    expect(badge1).toHaveTextContent(/Flora/i);
    expect(screen.queryByTestId('badge-engraved-BEST_VALUE')).not.toBeInTheDocument();

    rerender(<BookingTripCard plan={res2!} />);
    const badge2 = screen.getByTestId('badge-BEST_VALUE');
    expect(badge2).toBeInTheDocument();
    expect(badge2).toHaveAttribute('data-badge-state', 'active');
    expect(badge2).toHaveTextContent(/Flora/i);
    expect(screen.queryByTestId('badge-engraved-BEST_VALUE')).not.toBeInTheDocument();

    // 3. Render pricier trip card and verify Flora is engraved (not active)
    rerender(<BookingTripCard plan={resPricier!} />);
    expect(screen.queryByTestId('badge-BEST_VALUE')).not.toBeInTheDocument();
    const engravedBadge = screen.getByTestId('badge-engraved-BEST_VALUE');
    expect(engravedBadge).toBeInTheDocument();
    expect(engravedBadge).toHaveAttribute('data-badge-state', 'engraved');
  });
});
