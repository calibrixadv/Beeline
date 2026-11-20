import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TripsPage from '../app/trips/page';
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
    expect(reliableBadge).toHaveTextContent(/Safe • Transfer Shield/i);
    expect(bestValueBadge).toHaveTextContent(/Economy • Best Value/i);

    // Assert fastest badge is on IC 572
    const fastestBadge = screen.getByTestId('badge-FASTEST');
    expect(fastestBadge).toBeInTheDocument();
    expect(fastestBadge).toHaveTextContent(/Fast • Express Scout/i);

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

    // 1. Click "🛡️ Most Reliable" pillar filter
    const reliableBtn = screen.getByRole('button', { name: /🛡️ Most Reliable/i });
    fireEvent.click(reliableBtn);

    // Multi-badge route RE 11631 is included
    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.queryByText('IC 572')).not.toBeInTheDocument();
    });

    // 2. Click "💰 Best Value" pillar filter
    const bestValueBtn = screen.getByRole('button', { name: /💰 Best Value/i });
    fireEvent.click(bestValueBtn);

    // Multi-badge route RE 11631 is ALSO included under Best Value
    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.queryByText('IC 572')).not.toBeInTheDocument();
    });

    // 3. Click "⚡ Fastest Direct" pillar filter
    const fastestBtn = screen.getByRole('button', { name: /⚡ Fastest Direct/i });
    fireEvent.click(fastestBtn);

    // IC 572 is shown under fastest
    await waitFor(() => {
      expect(screen.getByText('IC 572')).toBeInTheDocument();
      expect(screen.queryByText('RE 11631')).not.toBeInTheDocument();
    });

    // 4. Click "All Trips" filter to restore all 6 trains
    const allBtn = screen.getByRole('button', { name: /All Trips/i });
    fireEvent.click(allBtn);

    await waitFor(() => {
      expect(screen.getByText('RE 11631')).toBeInTheDocument();
      expect(screen.getByText('IC 572')).toBeInTheDocument();
      expect(screen.getByText('IR 1572')).toBeInTheDocument();
    });
  }, 15000);
});
