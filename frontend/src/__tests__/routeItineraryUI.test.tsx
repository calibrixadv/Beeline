import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BookingTripCard from '../components/BookingTripCard';
import * as apiClientModule from '../services/apiClient';
import { TransitRoutePlan } from '../types/routePlan';

// Sample Direct Train: IR 1572 (9 commercial stops, 7 intermediate, 259.6 km)
const mockDirectPlan: TransitRoutePlan = {
  id: 'plan-direct-ir1572',
  date: '2026-11-20',
  summary: 'IR 1572 Direct',
  departureTime: '2026-11-20T08:25:00+02:00',
  arrivalTime: '2026-11-20T12:09:00+02:00',
  totalDurationMinutes: 224,
  totalWalkMinutes: 0,
  totalWalkDistanceMeters: 0,
  transfersCount: 0,
  curatedPillar: 'FASTEST',
  curatedPillars: ['FASTEST'],
  mascotRecommendation: {
    persona: 'barnaby',
    badgeLabel: 'FASTEST DIRECT',
    advice: 'Direct express service.',
  },
  riskAnalysis: {
    overallRiskScore: 12,
    riskLevel: 'LOW',
    historicalPunctualityRate: 0.96,
    tightestBufferMinutes: 999,
    bufferAdequacy: 'GENEROUS',
    riskSummaryText: 'Express direct route with high punctuality.',
    factors: [],
  },
  fare: {
    totalAmountLei: 68.5,
    totalAmountEur: 13.7,
    isIntegratedTicketAvailable: true,
    legFares: [],
  },
  eco: {
    routeEmissionsKgCO2: 7.2,
    carEmissionsKgCO2: 36.0,
    savedKgCO2: 28.8,
    percentageSaved: 80.0,
    treeDaysEquivalent: 1.2,
  },
  query: {
    origin: { name: 'Galați', city: 'Galați' },
    destination: { name: 'București Nord', city: 'București' },
    allowedModes: ['TRAIN'],
    optimizationPreference: 'FASTEST',
  },
  createdAt: '2026-11-20T07:00:00Z',
  validUntil: '2026-11-20T14:00:00Z',
  legs: [
    {
      id: 'leg-ir1572',
      legIndex: 0,
      transportType: 'TRAIN',
      names: {
        originName: 'Galați',
        originCity: 'Galați',
        destinationName: 'București Nord',
        destinationCity: 'București',
        lineCode: 'IR 1572',
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
        scheduledDeparture: '2026-11-20T08:25:00+02:00',
        scheduledArrival: '2026-11-20T12:09:00+02:00',
        estimatedDeparture: '2026-11-20T08:25:00+02:00',
        estimatedArrival: '2026-11-20T12:09:00+02:00',
        durationMinutes: 224,
        delayMinutes: 0,
        isRealtime: false,
      },
      risk: {
        legRiskScore: 12,
        historicalPunctualityPercent: 96,
        isShieldedBuffer: true,
        disruptions: [],
      },
      fare: {
        amount: 68.5,
        currency: 'RON',
        ticketCategory: 'RAIL_INTERREGIO',
      },
      amenities: {
        items: ['WIFI', 'POWER_OUTLETS'],
        crowdingLevel: 'LOW',
        stepFreeAccess: true,
      },
      instructions: { leadText: 'Board IR 1572 at Galați' },
      intermediateStopCount: 7,
      distanceKm: 259.6,
      trainCategory: 'IR',
      fullTrainOrigin: 'Galați',
      fullTrainDestination: 'București Nord',
      stops: [
        {
          stopSequence: 1,
          stationCode: 'GLT',
          stationName: 'Galați',
          city: 'Galați',
          arrivalTime: null,
          departureTime: '2026-11-20T08:25:00+02:00',
          dwellMinutes: 0,
          distanceFromOriginKm: 0.0,
          stopType: 'BOARDING',
        },
        {
          stopSequence: 2,
          stationCode: 'BBS',
          stationName: 'Barboși',
          city: 'Barboși',
          arrivalTime: '2026-11-20T08:44:00+02:00',
          departureTime: '2026-11-20T08:45:00+02:00',
          dwellMinutes: 1,
          distanceFromOriginKm: 12.1,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 3,
          stationCode: 'BRL',
          stationName: 'Brăila',
          city: 'Brăila',
          arrivalTime: '2026-11-20T09:01:00+02:00',
          departureTime: '2026-11-20T09:03:00+02:00',
          dwellMinutes: 2,
          distanceFromOriginKm: 31.6,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 4,
          stationCode: 'IAN',
          stationName: 'Ianca',
          city: 'Ianca',
          arrivalTime: '2026-11-20T09:35:00+02:00',
          departureTime: '2026-11-20T09:36:00+02:00',
          dwellMinutes: 1,
          distanceFromOriginKm: 74.0,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 5,
          stationCode: 'FAU',
          stationName: 'Făurei',
          city: 'Făurei',
          arrivalTime: '2026-11-20T09:52:00+02:00',
          departureTime: '2026-11-20T09:53:00+02:00',
          dwellMinutes: 1,
          distanceFromOriginKm: 91.2,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 6,
          stationCode: 'BUZ',
          stationName: 'Buzău',
          city: 'Buzău',
          arrivalTime: '2026-11-20T10:18:00+02:00',
          departureTime: '2026-11-20T10:20:00+02:00',
          dwellMinutes: 2,
          distanceFromOriginKm: 131.6,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 7,
          stationCode: 'MZL',
          stationName: 'Mizil',
          city: 'Mizil',
          arrivalTime: '2026-11-20T10:55:00+02:00',
          departureTime: '2026-11-20T10:56:00+02:00',
          dwellMinutes: 1,
          distanceFromOriginKm: 166.5,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 8,
          stationCode: 'PLS',
          stationName: 'Ploiești Sud',
          city: 'Ploiești',
          arrivalTime: '2026-11-20T11:25:00+02:00',
          departureTime: '2026-11-20T11:27:00+02:00',
          dwellMinutes: 2,
          distanceFromOriginKm: 200.1,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 9,
          stationCode: 'BCT',
          stationName: 'București Nord',
          city: 'București',
          arrivalTime: '2026-11-20T12:09:00+02:00',
          departureTime: null,
          dwellMinutes: 0,
          distanceFromOriginKm: 259.6,
          stopType: 'ALIGHTING',
        },
      ],
    },
  ],
};

// Sample 1-Transfer Plan: Galați ➔ Brașov via Buzău (R 7360 + IR 1732)
const mockTransferPlan: TransitRoutePlan = {
  ...mockDirectPlan,
  id: 'plan-transfer-buzau',
  transfersCount: 1,
  transfers: [
    {
      transferIndex: 0,
      stationCode: 'BUZ',
      stationName: 'Buzău',
      arrivalTime: '2026-11-20T07:55:00+02:00',
      departureTime: '2026-11-20T08:51:00+02:00',
      waitMinutes: 56,
      fromLineCode: 'R 7360',
      fromOperator: 'CFR Călători',
      toLineCode: 'IR 1732',
      toOperator: 'CFR Călători',
      bufferStatus: 'SAFE',
      missedConnectionProbability: 0.04,
    },
  ],
  legs: [
    {
      ...mockDirectPlan.legs[0],
      id: 'leg-0',
      legIndex: 0,
      names: {
        ...mockDirectPlan.legs[0].names,
        lineCode: 'R 7360',
        originName: 'Galați',
        destinationName: 'Buzău',
      },
      distanceKm: 131.6,
      intermediateStopCount: 3,
      stops: [
        {
          stopSequence: 1,
          stationCode: 'GLT',
          stationName: 'Galați',
          arrivalTime: null,
          departureTime: '2026-11-20T05:22:00+02:00',
          dwellMinutes: 0,
          distanceFromOriginKm: 0.0,
          stopType: 'BOARDING',
        },
        {
          stopSequence: 2,
          stationCode: 'BRL',
          stationName: 'Brăila',
          arrivalTime: '2026-11-20T06:05:00+02:00',
          departureTime: '2026-11-20T06:07:00+02:00',
          dwellMinutes: 2,
          distanceFromOriginKm: 31.6,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 3,
          stationCode: 'FAU',
          stationName: 'Făurei',
          arrivalTime: '2026-11-20T07:11:00+02:00',
          departureTime: '2026-11-20T07:12:00+02:00',
          dwellMinutes: 1,
          distanceFromOriginKm: 91.2,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 4,
          stationCode: 'BUZ',
          stationName: 'Buzău',
          arrivalTime: '2026-11-20T07:55:00+02:00',
          departureTime: null,
          dwellMinutes: 0,
          distanceFromOriginKm: 131.6,
          stopType: 'TRANSFER',
        },
      ],
    },
    {
      ...mockDirectPlan.legs[0],
      id: 'leg-1',
      legIndex: 1,
      names: {
        ...mockDirectPlan.legs[0].names,
        lineCode: 'IR 1732',
        originName: 'Buzău',
        destinationName: 'Brașov',
      },
      distanceKm: 178.9,
      intermediateStopCount: 2,
      stops: [
        {
          stopSequence: 1,
          stationCode: 'BUZ',
          stationName: 'Buzău',
          arrivalTime: null,
          departureTime: '2026-11-20T08:51:00+02:00',
          dwellMinutes: 0,
          distanceFromOriginKm: 0.0,
          stopType: 'TRANSFER',
        },
        {
          stopSequence: 2,
          stationCode: 'PLS',
          stationName: 'Ploiești Sud',
          arrivalTime: '2026-11-20T09:57:00+02:00',
          departureTime: '2026-11-20T09:59:00+02:00',
          dwellMinutes: 2,
          distanceFromOriginKm: 68.5,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 3,
          stationCode: 'PRD',
          stationName: 'Predeal',
          arrivalTime: '2026-11-20T11:19:00+02:00',
          departureTime: '2026-11-20T11:20:00+02:00',
          dwellMinutes: 1,
          distanceFromOriginKm: 152.6,
          stopType: 'INTERMEDIATE',
        },
        {
          stopSequence: 4,
          stationCode: 'BSV',
          stationName: 'Brașov',
          arrivalTime: '2026-11-20T11:53:00+02:00',
          departureTime: null,
          dwellMinutes: 0,
          distanceFromOriginKm: 178.9,
          stopType: 'ALIGHTING',
        },
      ],
    },
  ],
};

describe('Route Itinerary & Full Train Path UI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders direct route card collapsed summary and expands all 9 stops with dwell and distance', () => {
    render(<BookingTripCard plan={mockDirectPlan} />);

    // 1. Collapsed summary: displays intermediate stop count and distance
    const collapsedSummary = screen.getByTestId('trip-collapsed-summary');
    expect(collapsedSummary).toBeInTheDocument();
    expect(collapsedSummary.textContent).toMatch(/7 stops/i);
    expect(collapsedSummary.textContent).toMatch(/259\.6 km/i);

    // 2. Expand card
    const expandBtn = screen.getByRole('button', { name: /view stopovers & shield analysis/i });
    fireEvent.click(expandBtn);

    // 3. Toggle intermediate stops on leg 0
    const toggleStopsBtn = screen.getByTestId('toggle-stops-leg-0');
    expect(toggleStopsBtn).toHaveTextContent(/Show 7 intermediate stops/i);
    fireEvent.click(toggleStopsBtn);

    // 4. Stops timeline rendered
    const stopsList = screen.getByTestId('leg-stops-list-0');
    expect(stopsList).toBeInTheDocument();

    // Verify all key stations in corridor are displayed within the timeline
    expect(within(stopsList).getByText('Galați')).toBeInTheDocument();
    expect(within(stopsList).getByText('Brăila')).toBeInTheDocument();
    expect(within(stopsList).getByText('Ianca')).toBeInTheDocument();
    expect(within(stopsList).getByText('Făurei')).toBeInTheDocument();
    expect(within(stopsList).getByText('Buzău')).toBeInTheDocument();
    expect(within(stopsList).getByText('Ploiești Sud')).toBeInTheDocument();
    expect(within(stopsList).getByText('București Nord')).toBeInTheDocument();

    // Verify dwell pills
    expect(within(stopsList).getAllByText('2m stop').length).toBeGreaterThan(0);
    expect(within(stopsList).getAllByText('1m stop').length).toBeGreaterThan(0);

    // Verify cumulative distance
    expect(within(stopsList).getByText('259.6 km')).toBeInTheDocument();
  });

  it('renders 1-transfer route card with dedicated Transfer Shield Card and buffer badges', () => {
    render(<BookingTripCard plan={mockTransferPlan} defaultExpanded={true} />);

    // Transfer Shield Card
    const transferCard = screen.getByTestId('transfer-card-0');
    expect(transferCard).toBeInTheDocument();

    // Verify transfer wait time, station, and carrier handoff
    expect(transferCard).toHaveTextContent('Buzău');
    expect(transferCard).toHaveTextContent('56 min transfer');
    expect(transferCard).toHaveTextContent('R 7360');
    expect(transferCard).toHaveTextContent('IR 1732');
    expect(transferCard).toHaveTextContent('Safe Transfer');
    expect(transferCard).toHaveTextContent('96% guarantee');
  });

  it('renders tight and risky transfer badges appropriately', () => {
    const tightPlan: TransitRoutePlan = {
      ...mockTransferPlan,
      transfers: [
        {
          ...mockTransferPlan.transfers![0],
          waitMinutes: 14,
          bufferStatus: 'TIGHT',
          missedConnectionProbability: 0.18,
        },
      ],
    };

    const { rerender } = render(<BookingTripCard plan={tightPlan} defaultExpanded={true} />);
    expect(screen.getByText('Tight Transfer')).toBeInTheDocument();
    expect(screen.getByText(/82% guarantee/i)).toBeInTheDocument();

    const riskyPlan: TransitRoutePlan = {
      ...mockTransferPlan,
      transfers: [
        {
          ...mockTransferPlan.transfers![0],
          waitMinutes: 6,
          bufferStatus: 'RISKY',
          missedConnectionProbability: 0.42,
        },
      ],
    };

    rerender(<BookingTripCard plan={riskyPlan} defaultExpanded={true} />);
    expect(screen.getByText('Risky Transfer')).toBeInTheDocument();
    expect(screen.getByText(/58% guarantee/i)).toBeInTheDocument();
  });

  it('clicking train code badge links to external InfoFer page and does NOT open modal; inline accordion expands stopovers', async () => {
    render(<BookingTripCard plan={mockDirectPlan} />);

    // 1. Train code badge is an external <a> link directly to InfoFer
    const trigger = screen.getByTestId('train-itinerary-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('target', '_blank');
    expect(trigger).toHaveAttribute('rel', 'noopener noreferrer');
    expect(trigger).toHaveAttribute('href', 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/1572?Date=20.11.2026');
    expect(trigger).toHaveAttribute('title', expect.stringContaining('InfoFer'));

    // 2. Clicking train code badge does NOT open broken modal
    fireEvent.click(trigger);
    expect(screen.queryByTestId('train-itinerary-modal')).not.toBeInTheDocument();

    // 3. Inline "View Stopovers & Shield Analysis" expands stopovers cleanly
    const expandBtn = screen.getByRole('button', { name: /view stopovers & shield analysis/i });
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);

    expect(screen.getByText('Itinerary Breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('route-itinerary-timeline')).toBeInTheDocument();
  });

  it('renders individual external InfoFer links for each leg on multi-leg transfer cards', () => {
    const multiLegPlan: TransitRoutePlan = {
      ...mockDirectPlan,
      id: 'multileg-plan-1',
      transfersCount: 1,
      legs: [
        {
          ...mockDirectPlan.legs[0],
          id: 'leg-1',
          names: {
            ...mockDirectPlan.legs[0].names,
            lineCode: 'R 7360',
          },
        },
        {
          ...mockDirectPlan.legs[0],
          id: 'leg-2',
          names: {
            ...mockDirectPlan.legs[0].names,
            lineCode: 'R-E 10700',
          },
        },
      ],
    };

    render(<BookingTripCard plan={multiLegPlan} />);

    const triggers = screen.getAllByTestId('train-itinerary-trigger');
    expect(triggers.length).toBeGreaterThanOrEqual(2);

    const leg1Link = triggers.find((el) => el.getAttribute('href')?.includes('/Tren/7360'));
    const leg2Link = triggers.find((el) => el.getAttribute('href')?.includes('/Tren/10700'));

    expect(leg1Link).toBeDefined();
    expect(leg2Link).toBeDefined();
    expect(leg1Link).toHaveAttribute('href', 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/7360?Date=20.11.2026');
    expect(leg2Link).toHaveAttribute('href', 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/10700?Date=20.11.2026');
    expect(leg1Link).toHaveAttribute('target', '_blank');
    expect(leg2Link).toHaveAttribute('target', '_blank');
  });
});
