import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TripsPage from '../app/trips/page';
import TrainsPage from '../app/trains/page';
import AmbientPageMascot from '../components/AmbientPageMascot';
import BookingTripCard from '../components/BookingTripCard';
import TrainCard from '../components/TrainCard';
import { TripProvider } from '../context/TripContext';
import * as tripBookingService from '../services/tripBookingService';
import { apiClient } from '../services/apiClient';
import { TransitRoutePlan } from '../types/routePlan';
import { TrainJourney } from '../types/train';

// Mock Next.js navigation hooks
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

// Helper to generate mock route plans
function createMockPlan(
  id: string,
  trainNumber: string,
  curatedPillars: Array<'MOST_RELIABLE' | 'FASTEST' | 'BEST_VALUE'>
): TransitRoutePlan {
  return {
    id,
    date: '2026-11-20',
    summary: `${trainNumber} Express`,
    departureTime: '2026-11-20T08:00:00+02:00',
    arrivalTime: '2026-11-20T11:00:00+02:00',
    totalDurationMinutes: 180,
    totalWalkMinutes: 5,
    totalWalkDistanceMeters: 100,
    transfersCount: 0,
    query: {
      origin: 'București Nord',
      destination: 'Brașov',
      departureDate: '2026-11-20',
      allowedModes: ['TRAIN'],
    } as any,
    curatedPillar: curatedPillars[0] || null,
    curatedPillars: curatedPillars as any,
    mascotRecommendation: {
      persona: 'bumble',
      badgeLabel: 'QUEEN ROUTE',
      advice: 'Smooth run.',
    },
    riskAnalysis: {
      overallRiskScore: 12,
      riskLevel: 'LOW',
      historicalPunctualityRate: 0.96,
      tightestBufferMinutes: 999,
      bufferAdequacy: 'GENEROUS',
      riskSummaryText: 'Direct rail trip',
      factors: [],
      expectedDelayMinutes: 0,
      missedConnectionProbability: 0,
      isMlComputed: true,
      riskFactors: [],
    },
    fare: {
      totalAmountLei: 65.0,
      totalAmountEur: 13.0,
      isIntegratedTicketAvailable: true,
      legFares: [],
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
          originName: 'București Nord',
          originCity: 'București',
          destinationName: 'Brașov',
          destinationCity: 'Brașov',
          lineCode: trainNumber,
          lineName: 'București ⇄ Brașov',
          operatorName: 'CFR Călători',
          operatorShortName: 'CFR',
        },
        coords: {
          originCoords: { latitude: 44.44, longitude: 26.07 },
          destinationCoords: { latitude: 45.65, longitude: 25.60 },
          intermediateStops: [],
          geometry: { type: 'LineString', coordinates: [] },
        },
        timings: {
          scheduledDeparture: '2026-11-20T08:00:00+02:00',
          scheduledArrival: '2026-11-20T11:00:00+02:00',
          estimatedDeparture: '2026-11-20T08:00:00+02:00',
          estimatedArrival: '2026-11-20T11:00:00+02:00',
          durationMinutes: 180,
          delayMinutes: 0,
          isRealtime: false,
        },
        risk: {
          legRiskScore: 10,
          historicalPunctualityPercent: 96,
          isShieldedBuffer: true,
          disruptions: [],
        },
        fare: {
          amount: 65.0,
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

const mockSampleJourney: TrainJourney = {
  id: 'train-ir-1572',
  trainNumber: 'IR 1572',
  operator: 'CFR Călători',
  departureTime: '2026-11-20T08:00:00+02:00',
  arrivalTime: '2026-11-20T10:45:00+02:00',
  durationMinutes: 165,
  durationFormatted: '2h 45m',
  status: 'ON_TIME',
  delayMinutes: 0,
  origin: { code: 'BN', name: 'București Nord', city: 'București' },
  destination: { code: 'BV', name: 'Brașov', city: 'Brașov' },
  fares: [{ classType: 'STANDARD', price: 68.5, currency: 'RON', seatsAvailable: 10 }],
  stops: [],
  amenities: [],
  carbonFootprintKg: 10,
};

describe('Surgical Frontend Branding & Ambient Mascot Test Suite', () => {
  jest.setTimeout(25000);

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('1. AmbientPageMascot Component Invariants', () => {
    it('renders with pointer-events-none, aria-hidden="true", and default data-ambient-gear="default"', () => {
      render(<AmbientPageMascot />);
      const mascot = screen.getByTestId('ambient-page-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('aria-hidden', 'true');
      expect(mascot).toHaveAttribute('data-ambient-gear', 'default');
      expect(mascot).toHaveClass('pointer-events-none');
      expect(mascot).toHaveClass('fixed');
      expect(mascot).toHaveClass('inset-0');
      expect(mascot).toHaveClass('overflow-hidden');
      expect(mascot).toHaveClass('z-0');
      expect(mascot).toHaveClass('select-none');
    });

    it('updates data-ambient-gear according to gear prop without crashing', () => {
      const { rerender } = render(<AmbientPageMascot gear="safe" />);
      let mascot = screen.getByTestId('ambient-page-mascot');
      expect(mascot).toHaveAttribute('data-ambient-gear', 'safe');

      rerender(<AmbientPageMascot gear="fast" />);
      mascot = screen.getByTestId('ambient-page-mascot');
      expect(mascot).toHaveAttribute('data-ambient-gear', 'fast');

      rerender(<AmbientPageMascot gear="economy" />);
      mascot = screen.getByTestId('ambient-page-mascot');
      expect(mascot).toHaveAttribute('data-ambient-gear', 'economy');
    });

    it('respects prefers-reduced-motion: reduce cleanly without motion classes', () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { container } = render(<AmbientPageMascot gear="default" />);
      expect(container.querySelector('.animate-bee-dynamic-flight')).toBeNull();

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('2. /trips Mascot Branding & Ambient Sync', () => {
    const mockPlans = [
      createMockPlan('plan-1', 'RE 11631', ['MOST_RELIABLE', 'BEST_VALUE']),
      createMockPlan('plan-2', 'IC 572', ['FASTEST']),
    ];

    beforeEach(() => {
      jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
        plans: mockPlans,
        allDayDepartures: [],
        status: 'OK',
      });
    });

    it('renders AmbientPageMascot and dynamically syncs data-ambient-gear from default to safe, fast, economy on filter pill clicks', async () => {
      render(
        <TripProvider>
          <TripsPage />
        </TripProvider>
      );

      // Wait for page load
      await waitFor(() => {
        expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
      });

      const ambientMascot = screen.getByTestId('ambient-page-mascot');
      expect(ambientMascot).toBeInTheDocument();
      // Default state is Bumbi ('default')
      expect(ambientMascot).toHaveAttribute('data-ambient-gear', 'default');

      // 1. Click Queen Meli (Most Reliable) -> gear shifts to 'safe'
      const meliBtn = screen.getByRole('button', { name: /Queen Meli/i });
      expect(meliBtn).toHaveAttribute('title', 'Queen Meli — Most Reliable & Protected Transfers');
      fireEvent.click(meliBtn);
      await waitFor(() => {
        expect(ambientMascot).toHaveAttribute('data-ambient-gear', 'safe');
      });

      // 2. Click Queen Vira (Fastest) -> gear shifts to 'fast'
      const viraBtn = screen.getByRole('button', { name: /Queen Vira/i });
      expect(viraBtn).toHaveAttribute('title', 'Queen Vira — Fastest Express Routes');
      fireEvent.click(viraBtn);
      await waitFor(() => {
        expect(ambientMascot).toHaveAttribute('data-ambient-gear', 'fast');
      });

      // 3. Click Queen Flora (Best Value) -> gear shifts to 'economy'
      const floraBtn = screen.getByRole('button', { name: /Queen Flora/i });
      expect(floraBtn).toHaveAttribute('title', 'Queen Flora — Best Value & Eco Fares');
      fireEvent.click(floraBtn);
      await waitFor(() => {
        expect(ambientMascot).toHaveAttribute('data-ambient-gear', 'economy');
      });

      // 4. Click All Trips -> resets to 'default' (Bumbi)
      const allBtn = screen.getByRole('button', { name: /^All Trips$/i });
      fireEvent.click(allBtn);
      await waitFor(() => {
        expect(ambientMascot).toHaveAttribute('data-ambient-gear', 'default');
      });
    }, 20000);

    it('renders the borderless 3-stat summary strip with Queen Flora, Queen Vira, Queen Meli brand pairings', async () => {
      render(
        <TripProvider>
          <TripsPage />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
      });

      const strip = screen.getByTestId('summary-stats-strip');
      expect(strip).toBeInTheDocument();

      expect(screen.getByTestId('stat-best-price')).toHaveTextContent(/Queen Flora · Best Price/i);
      expect(screen.getByTestId('stat-fastest-transit')).toHaveTextContent(/Queen Vira · Fastest Transit/i);
      expect(screen.getByTestId('stat-transfer-shield')).toHaveTextContent(/Queen Meli · Transfer Shield/i);
    });
  });

  describe('3. BookingTripCard Mascot Badges (Engraved vs. Filled)', () => {
    it('renders Meli, Vira, Flora labels with data-badge-state="active" and "engraved"', () => {
      // Plan with Queen Meli (MOST_RELIABLE) active, others engraved
      const plan = createMockPlan('c1', 'RE 11631', ['MOST_RELIABLE']);
      render(<BookingTripCard plan={plan} />);

      // Active Queen Meli badge
      const activeMeli = screen.getByTestId('badge-MOST_RELIABLE');
      expect(activeMeli).toBeInTheDocument();
      expect(activeMeli).toHaveAttribute('data-badge-state', 'active');
      expect(activeMeli).toHaveAttribute('title', 'Queen Meli · Most Reliable');
      expect(activeMeli).toHaveAttribute('aria-label', 'Queen Meli — Most Reliable (active route badge)');
      expect(activeMeli).toHaveTextContent('Meli');

      // Engraved Queen Vira badge
      const engravedVira = screen.getByTestId('badge-engraved-FASTEST');
      expect(engravedVira).toBeInTheDocument();
      expect(engravedVira).toHaveAttribute('data-badge-state', 'engraved');
      expect(engravedVira).toHaveAttribute('title', 'Queen Vira · Fastest');
      expect(engravedVira).toHaveAttribute('aria-label', 'Queen Vira — Fastest (not top ranked for this train)');
      expect(engravedVira).toHaveTextContent('Vira');

      // Engraved Queen Flora badge
      const engravedFlora = screen.getByTestId('badge-engraved-BEST_VALUE');
      expect(engravedFlora).toBeInTheDocument();
      expect(engravedFlora).toHaveAttribute('data-badge-state', 'engraved');
      expect(engravedFlora).toHaveAttribute('title', 'Queen Flora · Best Value');
      expect(engravedFlora).toHaveAttribute('aria-label', 'Queen Flora — Best Value (not top ranked for this train)');
      expect(engravedFlora).toHaveTextContent('Flora');
    });
  });

  describe('4. /trains Mascot Branding & Ambient Background', () => {
    it('renders AmbientPageMascot with data-ambient-gear="default" (Bumbi) and brand kicker on initial ready state', () => {
      const { container } = render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      // Ambient background mascot exists with Bumbi gear
      const ambient = screen.getByTestId('ambient-page-mascot');
      expect(ambient).toBeInTheDocument();
      expect(ambient).toHaveAttribute('data-ambient-gear', 'default');

      // Brand kicker is present
      expect(screen.getByText(/Bumbi's Live Rail Radar/i)).toBeInTheDocument();

      // Strictly ZERO canvas, leaflet, map
      expect(container.querySelectorAll('canvas').length).toBe(0);
      expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
      expect(container.querySelectorAll('map').length).toBe(0);
    });

    it('dynamically adapts data-ambient-gear when filtering or searching train categories and status', async () => {
      jest.spyOn(apiClient, 'getTrains').mockResolvedValue({
        items: [mockSampleJourney],
        total: 1,
      });

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      const ambient = screen.getByTestId('ambient-page-mascot');
      expect(ambient).toHaveAttribute('data-ambient-gear', 'default');

      // 1. Enter express train code (IR 1572) -> gear becomes 'fast' (Queen Vira)
      const input = screen.getByTestId('trains-code-input');
      fireEvent.change(input, { target: { value: 'IR 1572' } });
      const searchBtn = screen.getByTestId('trains-search-btn');
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(ambient).toHaveAttribute('data-ambient-gear', 'fast');
      });

      // 2. Click "On Time" status filter -> gear becomes 'safe' (Queen Meli)
      const onTimeBtn = screen.getByRole('button', { name: /^On Time$/i });
      fireEvent.click(onTimeBtn);
      expect(ambient).toHaveAttribute('data-ambient-gear', 'safe');

      // 3. Search regional category (R 3029) with status reset to ALL -> gear becomes 'economy' (Queen Flora)
      const allTrainsBtn = screen.getByRole('button', { name: /^All Trains$/i });
      fireEvent.click(allTrainsBtn);
      fireEvent.change(input, { target: { value: 'R 3029' } });
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(ambient).toHaveAttribute('data-ambient-gear', 'economy');
      });
    });

    it('renders TrainCard with subtle semantic title tooltip on trainNumber', () => {
      const futureJourney = {
        ...mockSampleJourney,
        departureTime: new Date(Date.now() + 86400000).toISOString(),
      };

      render(
        <TripProvider>
          <TrainCard journey={futureJourney} />
        </TripProvider>
      );

      const trainNumberSpan = screen.getByText('IR 1572');
      expect(trainNumberSpan).toHaveAttribute('title', 'Queen Vira · Express Mainline');

      // Direct InfoFer train link
      const infoferLink = screen.getByTestId('infofer-direct-link');
      expect(infoferLink).toBeInTheDocument();
      expect(infoferLink).toHaveTextContent(/vezi trenul pe infofer/i);
      expect(infoferLink.getAttribute('href')).toContain('/Tren/1572?Date=');

      // Submit "+ Plan" button has complementary non-green styling
      const planBtn = screen.getByRole('button', { name: /\+ plan/i });
      expect(planBtn).toHaveClass('bg-amber-500');
      expect(planBtn).not.toHaveClass('bg-emerald-600');
    });
  });
});
