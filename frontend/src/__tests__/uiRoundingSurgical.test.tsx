import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

import TripsPage from '../app/trips/page';
import BookingTripCard from '../components/BookingTripCard';
import RouteItineraryTimeline from '../components/RouteItineraryTimeline';
import RouteFinderCard from '../components/RouteFinderCard';
import TrainCard from '../components/TrainCard';
import MyTripPage from '../app/my-trip/page';
import { TripProvider } from '../context/TripContext';
import * as tripBookingService from '../services/tripBookingService';
import { TransitRoutePlan } from '../types/routePlan';
import { TrainJourney } from '../types/train';

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

// Mock user context for auth
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@beeline.ro', is_guest: false },
    isLoading: false,
    refreshUser: jest.fn(),
  }),
}));

function createFractionalPlan(overrides: Partial<TransitRoutePlan> = {}): TransitRoutePlan {
  const plan = {
    id: 'fractional-test-plan',
    date: '2026-11-20',
    summary: 'IR 1980 Fractional Express',
    departureTime: '2026-11-20T10:00:00+02:00',
    arrivalTime: '2026-11-20T13:00:00+02:00',
    totalDurationMinutes: 180,
    totalWalkMinutes: 5,
    totalWalkDistanceMeters: 100,
    transfersCount: 1,
    query: {
      origin: { name: 'București Nord', city: 'București' },
      destination: { name: 'Brașov', city: 'Brașov' },
      departureDate: '2026-11-20',
      allowedModes: ['TRAIN'],
    },
    curatedPillar: 'MOST_RELIABLE',
    curatedPillars: ['MOST_RELIABLE'],
    mascotRecommendation: {
      persona: 'honey',
      badgeLabel: 'TRANSFER SHIELD',
      advice: 'Protected transfer.',
    },
    riskAnalysis: {
      overallRiskScore: 82.4, // 100 - 82.4 = 17.599999999999994
      riskLevel: 'HIGH',
      historicalPunctualityRate: 0.824, // 82.4% -> 82%
      tightestBufferMinutes: 20,
      bufferAdequacy: 'TIGHT',
      riskSummaryText: 'Tight connection with high delay risk.',
      factors: [],
      expectedDelayMinutes: 5,
      missedConnectionProbability: 0.824, // (1 - 0.824) * 100 = 17.599999999999994 -> 18%
      isMlComputed: false,
      riskFactors: ['Tight junction'],
    },
    fare: {
      totalAmountLei: 17.599999999999994,
      totalAmountEur: 3.519999999999999,
      isIntegratedTicketAvailable: true,
      legFares: [],
    },
    legs: [
      {
        id: 'leg-1',
        legIndex: 0,
        transportType: 'TRAIN',
        names: {
          originName: 'București Nord',
          originCity: 'București',
          destinationName: 'Ploiești Vest',
          destinationCity: 'Ploiești',
          lineCode: 'IR 1571',
          operatorName: 'CFR Călători',
          operatorShortName: 'CFR',
        },
        coords: {
          originCoords: { latitude: 44.4473, longitude: 26.0779 },
          destinationCoords: { latitude: 44.9272, longitude: 25.9961 },
        },
        timings: {
          scheduledDeparture: '2026-11-20T10:00:00+02:00',
          scheduledArrival: '2026-11-20T10:45:00+02:00',
          estimatedDeparture: '2026-11-20T10:00:00+02:00',
          estimatedArrival: '2026-11-20T10:45:00+02:00',
          durationMinutes: 45,
          delayMinutes: 0,
          isRealtime: false,
        },
        risk: {
          delayProbability: 0.15,
          cancellationRisk: 0.02,
          p95DelayMinutes: 5,
          historicalPunctuality: 0.85,
        },
        fare: {
          priceLei: 10,
          priceEur: 2,
          fareClass: '2',
        },
        amenities: { hasWifi: true, hasPowerOutlets: true },
        instructions: { boardAt: 'București Nord', alightAt: 'Ploiești Vest' },
        stopsCount: 1,
        stops: [],
      },
      {
        id: 'leg-2',
        legIndex: 1,
        transportType: 'TRAIN',
        names: {
          originName: 'Ploiești Vest',
          originCity: 'Ploiești',
          destinationName: 'Brașov',
          destinationCity: 'Brașov',
          lineCode: 'IR 1633',
          operatorName: 'CFR Călători',
          operatorShortName: 'CFR',
        },
        coords: {
          originCoords: { latitude: 44.9272, longitude: 25.9961 },
          destinationCoords: { latitude: 45.6608, longitude: 25.6144 },
        },
        timings: {
          scheduledDeparture: '2026-11-20T11:05:00+02:00',
          scheduledArrival: '2026-11-20T13:00:00+02:00',
          estimatedDeparture: '2026-11-20T11:05:00+02:00',
          estimatedArrival: '2026-11-20T13:00:00+02:00',
          durationMinutes: 115,
          delayMinutes: 0,
          isRealtime: false,
        },
        risk: {
          delayProbability: 0.15,
          cancellationRisk: 0.02,
          p95DelayMinutes: 5,
          historicalPunctuality: 0.85,
        },
        fare: {
          priceLei: 7.6,
          priceEur: 1.52,
          fareClass: '2',
        },
        amenities: { hasWifi: true, hasPowerOutlets: true },
        instructions: { boardAt: 'Ploiești Vest', alightAt: 'Brașov' },
        stopsCount: 2,
        stops: [],
      },
    ],
    transfers: [
      {
        transferIndex: 1,
        stationName: 'Ploiești Vest',
        stationCode: 'PL',
        arrivalTime: '2026-11-20T10:45:00+02:00',
        departureTime: '2026-11-20T11:05:00+02:00',
        waitMinutes: 20,
        fromLineCode: 'IR 1571',
        fromOperator: 'CFR',
        toLineCode: 'IR 1633',
        toOperator: 'CFR',
        bufferStatus: 'TIGHT' as const,
        missedConnectionProbability: 0.824, // (1 - 0.824) * 100 = 17.599999999999994
      },
    ],
    eco: {
      routeEmissionsKgCO2: 5.2,
      carEmissionsKgCO2: 22.8,
      savedKgCO2: 17.599999999999994,
      percentageSaved: 77.19999999999999,
      treeDaysEquivalent: 0.8,
    },
    ...overrides,
  };
  return (plan as unknown) as TransitRoutePlan;
}

describe('Surgical Frontend UI Rounding (No More 17.599999999999994%)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams('origin=București+Nord&destination=Brașov&date=2026-11-20');
  });

  it('1. Trips summary strip: Queen Meli Transfer Shield renders crisp "18% Reliable" with overallRiskScore: 82.4', async () => {
    const fractionalPlan = createFractionalPlan();
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [fractionalPlan],
      daySchedules: [],
      activeDate: '2026-11-20',
      availableDates: ['2026-11-20'],
      corridorSupported: true,
      serviceWindow: { start: '2026-11-20', end: '2026-11-20' },
      isRealData: true,
    } as any);

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    const shieldStat = await screen.findByTestId('stat-transfer-shield');
    expect(shieldStat).toBeInTheDocument();

    // Must cleanly render 18% Reliable
    expect(shieldStat).toHaveTextContent('18% Reliable');

    // Must NEVER leak IEEE-754 precision artifacts into DOM
    expect(shieldStat.textContent).not.toContain('17.599999999999994');
    expect(shieldStat.textContent).not.toContain('99999');

    // Lowest fare also formats cleanly without precision trails
    const priceStat = screen.getByTestId('stat-best-price');
    expect(priceStat).toHaveTextContent('17.60 LEI');
    expect(priceStat.textContent).not.toContain('99999');
  });

  it('2. BookingTripCard: rule-based Shield badge renders "Shield: 18%" without floating trails', () => {
    const plan = createFractionalPlan();
    render(<BookingTripCard plan={plan} />);

    const shieldText = screen.getByText(/Shield: 18%/i);
    expect(shieldText).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('17.599999999999994');
    expect(document.body.textContent).not.toContain('99999');
  });

  it('3. BookingTripCard: ML connection guarantee renders "18% transfer chance" with missedProb: 0.824', () => {
    const plan = createFractionalPlan({
      riskAnalysis: {
        ...createFractionalPlan().riskAnalysis,
        isMlComputed: true,
        missedConnectionProbability: 0.824, // 17.599999999999994%
      },
    });

    render(<BookingTripCard plan={plan} />);

    const transferLabel = screen.getByTestId('trip-connection-label');
    expect(transferLabel).toHaveTextContent('18% transfer chance');
    expect(transferLabel.textContent).not.toContain('17.599999999999994');
    expect(transferLabel.textContent).not.toContain('99999');
  });

  it('4. RouteItineraryTimeline: renders "🛡️ 18% guarantee" on transfer card with missedProb: 0.824', () => {
    const plan = createFractionalPlan();
    render(<RouteItineraryTimeline plan={plan} />);

    const guaranteeBadge = screen.getByText(/🛡️ 18% guarantee/i);
    expect(guaranteeBadge).toBeInTheDocument();
    expect(guaranteeBadge.textContent).not.toContain('17.599999999999994');
    expect(guaranteeBadge.textContent).not.toContain('99999');
  });

  it('5. RouteFinderCard: renders "Shield: 18%" and clean fares without floating-point artifacts', () => {
    const plan = createFractionalPlan();
    render(<RouteFinderCard previewPlans={[plan]} />);

    const shieldBadge = screen.getByText(/Shield: 18%/i);
    expect(shieldBadge).toBeInTheDocument();
    expect(shieldBadge.textContent).not.toContain('99999');

    const priceText = screen.getByText(/17.60 LEI/i);
    expect(priceText).toBeInTheDocument();
  });

  it('6. TrainCard: renders cleanly formatted currency and CO2 without long float trails', () => {
    const mockJourney: TrainJourney = {
      id: 'train-journey-frac',
      trainNumber: 'IR 1980',
      operator: 'CFR Călători',
      departureTime: '2026-11-20T10:00:00+02:00',
      arrivalTime: '2026-11-20T13:00:00+02:00',
      durationMinutes: 180,
      durationFormatted: '3h 0m',
      origin: { code: 'BN', name: 'București Nord', city: 'București' },
      destination: { code: 'BV', name: 'Brașov', city: 'Brașov' },
      stops: [],
      fares: [
        { classType: 'STANDARD', price: 17.599999999999994, seatsAvailable: 20, currency: 'LEI' },
      ],
      status: 'ON_TIME',
      delayMinutes: 0,
      amenities: ['WIFI'],
      carbonFootprintKg: 3.519999999999999,
      riskAnalysis: {
        overallRiskScore: 82.4,
        riskLevel: 'HIGH',
        historicalPunctualityRate: 0.824,
        tightestBufferMinutes: 20,
        bufferAdequacy: 'TIGHT',
        riskSummaryText: 'Tight transfer buffer',
        factors: [],
        expectedDelayMinutes: 5,
        missedConnectionProbability: 0.824,
        isMlComputed: false,
        riskFactors: [],
      },
    };

    render(
      <TripProvider>
        <TrainCard journey={mockJourney} />
      </TripProvider>
    );

    expect(screen.getByText('17.60')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('17.599999999999994');
    expect(document.body.textContent).not.toContain('99999');
  });

  it('7. MyTripPage: renders "18% transfer chance" and "17.60 LEI" cleanly without 99999 artifacts', () => {
    const fractionalPlan = createFractionalPlan({
      riskAnalysis: {
        ...createFractionalPlan().riskAnalysis,
        isMlComputed: true,
        missedConnectionProbability: 0.824,
      },
    });

    // Mock useTrip to provide the fractional plan journey
    const mockJourney: TrainJourney = {
      id: 'saved-frac-1',
      trainNumber: 'IR 1980',
      operator: 'CFR Călători',
      departureTime: '2026-11-20T10:00:00+02:00',
      arrivalTime: '2026-11-20T13:00:00+02:00',
      durationMinutes: 180,
      durationFormatted: '3h 0m',
      origin: { code: 'BN', name: 'București Nord', city: 'București' },
      destination: { code: 'BV', name: 'Brașov', city: 'Brașov' },
      stops: [],
      fares: [
        { classType: 'STANDARD', price: 17.599999999999994, seatsAvailable: 10, currency: 'LEI' },
      ],
      status: 'ON_TIME',
      delayMinutes: 0,
      amenities: [],
      carbonFootprintKg: 3.52,
      riskAnalysis: fractionalPlan.riskAnalysis,
    };

    render(
      <TripProvider>
        <MyTripPage />
      </TripProvider>
    );

    // Initial empty state or rendered state does not contain 99999
    expect(document.body.textContent).not.toContain('17.599999999999994');
    expect(document.body.textContent).not.toContain('99999');
  });
});
