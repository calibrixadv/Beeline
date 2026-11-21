import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TripsPage from '../app/trips/page';
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

describe('Max Transfers Selector Wired to Route Planning', () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  function createTestPlan(
    id: string,
    trainNumber: string,
    transfersCount: number,
    depHour: string,
    arrHour: string
  ): TransitRoutePlan {
    const legs = [];
    if (transfersCount === 0) {
      legs.push({
        id: `leg-${id}-0`,
        legIndex: 0,
        transportType: 'TRAIN' as const,
        names: {
          originName: 'București Nord',
          originCity: 'București',
          destinationName: 'Brașov',
          destinationCity: 'Brașov',
          lineCode: trainNumber,
          operatorName: 'CFR Călători',
          operatorShortName: 'CFR',
        },
        coords: {
          originCoords: { latitude: 44.44, longitude: 26.07 },
          destinationCoords: { latitude: 45.65, longitude: 25.6 },
          intermediateStops: [],
          geometry: { type: 'LineString' as const, coordinates: [] },
        },
        timings: {
          scheduledDeparture: `${futureDate}T${depHour}:00:00+02:00`,
          scheduledArrival: `${futureDate}T${arrHour}:00:00+02:00`,
          estimatedDeparture: `${futureDate}T${depHour}:00:00+02:00`,
          estimatedArrival: `${futureDate}T${arrHour}:00:00+02:00`,
          durationMinutes: 150,
          delayMinutes: 0,
          isRealtime: false,
        },
        risk: {
          legRiskScore: 10,
          historicalPunctualityPercent: 95,
          isShieldedBuffer: true,
          disruptions: [],
        },
        fare: { amount: 65, currency: 'RON' as const, ticketCategory: 'RAIL_INTERREGIO' as const },
        amenities: { items: [], crowdingLevel: 'LOW' as const, stepFreeAccess: true },
        instructions: { leadText: `Board ${trainNumber}` },
      });
    } else {
      legs.push(
        {
          id: `leg-${id}-0`,
          legIndex: 0,
          transportType: 'TRAIN' as const,
          names: {
            originName: 'București Nord',
            originCity: 'București',
            destinationName: 'Ploiești Vest',
            destinationCity: 'Ploiești',
            lineCode: trainNumber.split('+')[0].trim(),
            operatorName: 'CFR Călători',
            operatorShortName: 'CFR',
          },
          coords: {
            originCoords: { latitude: 44.44, longitude: 26.07 },
            destinationCoords: { latitude: 44.92, longitude: 26.01 },
            intermediateStops: [],
            geometry: { type: 'LineString' as const, coordinates: [] },
          },
          timings: {
            scheduledDeparture: `${futureDate}T${depHour}:00:00+02:00`,
            scheduledArrival: `${futureDate}T${depHour}:40:00+02:00`,
            estimatedDeparture: `${futureDate}T${depHour}:00:00+02:00`,
            estimatedArrival: `${futureDate}T${depHour}:40:00+02:00`,
            durationMinutes: 40,
            delayMinutes: 0,
            isRealtime: false,
          },
          risk: {
            legRiskScore: 10,
            historicalPunctualityPercent: 95,
            isShieldedBuffer: true,
            disruptions: [],
          },
          fare: { amount: 25, currency: 'RON' as const, ticketCategory: 'RAIL_REGIO' as const },
          amenities: { items: [], crowdingLevel: 'LOW' as const, stepFreeAccess: true },
          instructions: { leadText: 'Board leg 1' },
        },
        {
          id: `leg-${id}-1`,
          legIndex: 1,
          transportType: 'TRAIN' as const,
          names: {
            originName: 'Ploiești Vest',
            originCity: 'Ploiești',
            destinationName: 'Brașov',
            destinationCity: 'Brașov',
            lineCode: trainNumber.split('+')[1]?.trim() || 'IR 1630',
            operatorName: 'CFR Călători',
            operatorShortName: 'CFR',
          },
          coords: {
            originCoords: { latitude: 44.92, longitude: 26.01 },
            destinationCoords: { latitude: 45.65, longitude: 25.6 },
            intermediateStops: [],
            geometry: { type: 'LineString' as const, coordinates: [] },
          },
          timings: {
            scheduledDeparture: `${futureDate}T${depHour}:55:00+02:00`,
            scheduledArrival: `${futureDate}T${arrHour}:00:00+02:00`,
            estimatedDeparture: `${futureDate}T${depHour}:55:00+02:00`,
            estimatedArrival: `${futureDate}T${arrHour}:00:00+02:00`,
            durationMinutes: 65,
            delayMinutes: 0,
            isRealtime: false,
          },
          risk: {
            legRiskScore: 15,
            historicalPunctualityPercent: 90,
            isShieldedBuffer: true,
            disruptions: [],
          },
          fare: { amount: 40, currency: 'RON' as const, ticketCategory: 'RAIL_INTERREGIO' as const },
          amenities: { items: [], crowdingLevel: 'LOW' as const, stepFreeAccess: true },
          instructions: { leadText: 'Board leg 2' },
        }
      );
    }

    return {
      id,
      date: futureDate,
      summary: `${trainNumber} ${transfersCount === 0 ? 'Direct Express' : 'Connecting Route'}`,
      departureTime: `${futureDate}T${depHour}:00:00+02:00`,
      arrivalTime: `${futureDate}T${arrHour}:00:00+02:00`,
      totalDurationMinutes: 150,
      totalWalkMinutes: 5,
      totalWalkDistanceMeters: 100,
      transfersCount,
      curatedPillar: transfersCount === 0 ? 'FASTEST' : 'BEST_VALUE',
      curatedPillars: [transfersCount === 0 ? 'FASTEST' : 'BEST_VALUE'],
      query: {
        origin: { name: 'București Nord' },
        destination: { name: 'Brașov' },
        departureTime: `${futureDate}T08:00:00+02:00`,
        allowedModes: ['TRAIN'],
        optimizationPreference: 'FASTEST',
      },
      mascotRecommendation: {
        persona: 'barnaby',
        badgeLabel: transfersCount === 0 ? 'FAST DIRECT' : 'CONNECTING',
        advice: 'Journey advice',
      },
      fare: {
        totalAmountLei: 65,
        totalAmountEur: 13,
        isIntegratedTicketAvailable: true,
        legFares: [],
      },
      riskAnalysis: {
        overallRiskScore: 10,
        riskLevel: 'LOW',
        historicalPunctualityRate: 0.95,
        tightestBufferMinutes: 999,
        bufferAdequacy: 'GENEROUS',
        riskSummaryText: 'Reliable route',
        factors: [],
      },
      eco: {
        routeEmissionsKgCO2: 5,
        carEmissionsKgCO2: 25,
        savedKgCO2: 20,
        percentageSaved: 80,
        treeDaysEquivalent: 3,
      },
      legs,
      createdAt: `${futureDate}T06:00:00+02:00`,
      validUntil: `${futureDate}T23:59:00+02:00`,
    };
  }

  const directPlan = createTestPlan('plan-direct', 'IR 1572', 0, '08', '10');
  const connectingPlan = createTestPlan('plan-transfer', 'R 5001 + IR 1630', 1, '11', '13');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams({
      origin: 'București Nord',
      destination: 'Brașov',
      date: futureDate,
    });
  });

  it('updates route search filtering immediately when maxTransfers selector changes', async () => {
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [directPlan, connectingPlan],
      allDayDepartures: [],
      bookingWindow: {
        minDate: futureDate,
        maxDate: '2027-02-28',
        advanceBookingDays: 90,
        activeTimetable: '2025-2026',
        liveSource: 'INFOFER',
      },
      status: 'OK',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    // Wait for skeleton to clear and both plans to be rendered
    await waitFor(() => {
      expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText(/IR 1572/i)).toBeInTheDocument();
      expect(screen.getByText(/R 5001/i)).toBeInTheDocument();
    });

    // Locate the accessible Max transfers selector
    const transfersSelect = screen.getByLabelText(/Max transfers/i);
    expect(transfersSelect).toBeInTheDocument();

    // Change to "0 (Direct only)"
    fireEvent.change(transfersSelect, { target: { value: '0' } });

    // The connecting plan should immediately disappear, leaving only the direct route
    await waitFor(() => {
      expect(screen.getByText(/IR 1572/i)).toBeInTheDocument();
      expect(screen.queryByText(/R 5001/i)).not.toBeInTheDocument();
    });

    // Change back to "Any / All"
    fireEvent.change(transfersSelect, { target: { value: 'ANY' } });

    // Both plans should immediately be visible again
    await waitFor(() => {
      expect(screen.getByText(/IR 1572/i)).toBeInTheDocument();
      expect(screen.getByText(/R 5001/i)).toBeInTheDocument();
    });
  });

  it('initializes maxTransfers filter from URL search parameters and passes to backend', async () => {
    mockSearchParams = new URLSearchParams({
      origin: 'București Nord',
      destination: 'Brașov',
      date: futureDate,
      maxTransfers: '0',
    });

    const fetchSpy = jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [directPlan, connectingPlan],
      allDayDepartures: [],
      bookingWindow: {
        minDate: futureDate,
        maxDate: '2027-02-28',
        advanceBookingDays: 90,
        activeTimetable: '2025-2026',
        liveSource: 'INFOFER',
      },
      status: 'OK',
    });

    render(
      <TripProvider>
        <TripsPage />
      </TripProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText(/IR 1572/i)).toBeInTheDocument();
      // Only direct route is shown because maxTransfers initialized to 0
      expect(screen.queryByText(/R 5001/i)).not.toBeInTheDocument();
    });

    // Check that the selector has '0' selected
    const transfersSelect = screen.getByLabelText(/Max transfers/i) as HTMLSelectElement;
    expect(transfersSelect.value).toBe('0');

    // Verify fetchDayTripsFromBackend was called with maxTransfers = 0
    expect(fetchSpy).toHaveBeenCalledWith(
      'București Nord',
      'Brașov',
      futureDate,
      undefined,
      0
    );
  });
});
