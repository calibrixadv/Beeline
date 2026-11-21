import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import MyTripPage from '../app/my-trip/page';
import { TripItem } from '../types/trip';

const mockRemoveTrainFromTrip = jest.fn();
const mockClearTrip = jest.fn();
const mockUpdateTripAlertSettings = jest.fn();

let mockTrips: TripItem[] = [];

jest.mock('../context/TripContext', () => ({
  useTrip: () => ({
    trips: mockTrips,
    removeTrainFromTrip: mockRemoveTrainFromTrip,
    clearTrip: mockClearTrip,
    updateTripAlertSettings: mockUpdateTripAlertSettings,
    totalCost: mockTrips.reduce((acc, t) => acc + (t.journey.fares?.[0]?.price || 0), 0),
    totalDurationMinutes: 195,
    totalCo2SavedKg: 38,
    isTrainInTrip: jest.fn(),
    getTripTotalCost: () => 85.76,
    getTripItemCount: () => mockTrips.length,
  }),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-42',
      email: 'traveler@beeline.io',
      full_name: 'Traveler Bee',
      is_guest: false,
    },
    isLoading: false,
  }),
}));

describe('MyTripPage Redesign & Per-Trip Alert Bell Popover', () => {
  const sampleTrip: TripItem = {
    id: 'trip-r7360-1',
    savedRouteId: 'sr-uuid-999',
    travelDate: '2026-11-20',
    selectedClass: 'STANDARD',
    addedAt: '2026-11-19T10:00:00Z',
    alertMuted: false,
    alertLeadMinutes: 30,
    curatedPillars: ['MOST_RELIABLE'],
    journey: {
      id: 'journey-r7360',
      trainNumber: 'R 7360',
      operator: 'CFR + TFC',
      origin: { code: 'GL', name: 'Galați', city: 'Galați' },
      destination: { code: 'BNC', name: 'București Nord', city: 'București' },
      departureTime: '2026-11-20T05:32:00Z',
      arrivalTime: '2026-11-20T11:10:00Z',
      durationMinutes: 338,
      durationFormatted: '5h 38m',
      status: 'ON_TIME',
      delayMinutes: 0,
      fares: [
        {
          classType: 'STANDARD',
          price: 85.76,
          currency: 'RON',
          seatsAvailable: 35,
        },
      ],
      stops: [],
      amenities: ['WIFI'],
      carbonFootprintKg: 8.5,
      riskAnalysis: {
        isMlComputed: true,
        expectedDelayMinutes: 34,
        missedConnectionProbability: 0.0,
        riskFactors: [],
        factors: [],
        overallRiskScore: 20,
        historicalPunctualityRate: 0.95,
        tightestBufferMinutes: 30,
        riskLevel: 'LOW',
        riskSummaryText: 'High punctuality rate with low transfer risk.',
        bufferAdequacy: 'GENEROUS',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrips = [];
  });

  it('verifies global "Email Departure Alerts" banner and "Confirm Booking" button do NOT exist', () => {
    mockTrips = [sampleTrip];
    render(<MyTripPage />);

    expect(screen.queryByText(/email departure alerts/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('email-departure-alerts-card')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /turn off/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send test alert email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm booking/i })).not.toBeInTheDocument();
  });

  it('verifies the 3 borderless summary stats render cleanly without negative CO₂ formatting', () => {
    mockTrips = [sampleTrip];
    render(<MyTripPage />);

    // 1. Estimated Cost
    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    expect(screen.getAllByText('85.76 LEI')).toHaveLength(2);
    expect(screen.getByText(/approx\. €17\.15/i)).toBeInTheDocument();

    // 2. Total Transit Time
    expect(screen.getByText('Total Transit Time')).toBeInTheDocument();
    expect(screen.getByText('3h 15m')).toBeInTheDocument();
    expect(screen.getByText('1 leg')).toBeInTheDocument();

    // 3. CO₂ Saved: positive clean figure, NEVER negative -38 kg CO2
    expect(screen.getByText('CO₂ Saved')).toBeInTheDocument();
    expect(screen.getByText('38 kg CO₂')).toBeInTheDocument();
    expect(screen.queryByText('-38 kg CO₂')).not.toBeInTheDocument();
    expect(screen.getByText('vs. driving / flight')).toBeInTheDocument();
  });

  it('verifies engraved vs. filled pillar badges render on itinerary cards', () => {
    mockTrips = [sampleTrip];
    render(<MyTripPage />);

    // Reliable is in curatedPillars -> active filled badge
    const reliableBadge = screen.getByTestId('badge-MOST_RELIABLE');
    expect(reliableBadge).toBeInTheDocument();
    expect(reliableBadge).toHaveAttribute('data-badge-state', 'active');
    expect(reliableBadge).toHaveTextContent('Reliable');

    // Fastest and Eco are NOT active -> engraved badges
    const fastestBadge = screen.getByTestId('badge-engraved-FASTEST');
    expect(fastestBadge).toBeInTheDocument();
    expect(fastestBadge).toHaveAttribute('data-badge-state', 'engraved');
    expect(fastestBadge).toHaveTextContent('Fastest');

    const ecoBadge = screen.getByTestId('badge-engraved-BEST_VALUE');
    expect(ecoBadge).toBeInTheDocument();
    expect(ecoBadge).toHaveAttribute('data-badge-state', 'engraved');
    expect(ecoBadge).toHaveTextContent('Eco');
  });

  it('verifies clicking the per-trip bell opens popover with options, updates lead time & toggles mute', () => {
    mockTrips = [sampleTrip];
    const { rerender } = render(<MyTripPage />);

    // Initial state: bell button with 30m active badge
    const bellBtn = screen.getByTestId('trip-alert-bell-trip-r7360-1');
    expect(bellBtn).toBeInTheDocument();
    expect(bellBtn).toHaveTextContent('30m');
    expect(bellBtn).toHaveAttribute('aria-label', 'Trip alerts active: 30 min before departure');

    // Popover is initially closed
    expect(screen.queryByTestId('trip-alert-popover-trip-r7360-1')).not.toBeInTheDocument();

    // Click to open popover
    fireEvent.click(bellBtn);
    const popover = screen.getByTestId('trip-alert-popover-trip-r7360-1');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveTextContent('Departure & Delay Alerts');
    expect(popover).toHaveTextContent(/automatic live delay alerts to traveler@beeline\.io/i);

    // Verify lead time options exist
    expect(screen.getByRole('button', { name: '5 min' })).toBeInTheDocument();
    const tenMinBtn = screen.getByRole('button', { name: '10 min' });
    expect(tenMinBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 hour' })).toBeInTheDocument();

    // Select 10 min
    fireEvent.click(tenMinBtn);
    expect(mockUpdateTripAlertSettings).toHaveBeenCalledWith('trip-r7360-1', {
      alertMuted: false,
      alertLeadMinutes: 10,
    });

    // Toggle mute
    const muteBtn = screen.getByRole('button', { name: /mute alerts for this trip/i });
    expect(muteBtn).toBeInTheDocument();
    fireEvent.click(muteBtn);
    expect(mockUpdateTripAlertSettings).toHaveBeenCalledWith('trip-r7360-1', {
      alertMuted: true,
    });

    // Re-render with muted state to verify button badge updates to "Muted"
    mockTrips = [
      {
        ...sampleTrip,
        alertMuted: true,
        alertLeadMinutes: 10,
      },
    ];
    rerender(<MyTripPage />);

    const mutedBellBtn = screen.getByTestId('trip-alert-bell-trip-r7360-1');
    expect(mutedBellBtn).toHaveTextContent('Muted');
    expect(mutedBellBtn).toHaveAttribute('aria-label', 'Trip alerts muted');
  });

  it('verifies "Vezi trenul pe InfoFer" direct train link points to specific InfoFer train with target="_blank"', () => {
    mockTrips = [sampleTrip];
    render(<MyTripPage />);

    const buyLink = screen.getByTestId('buy-official-ticket');
    expect(buyLink).toBeInTheDocument();
    expect(buyLink).toHaveTextContent('Vezi trenul pe InfoFer');
    expect(buyLink).toHaveAttribute('target', '_blank');
    expect(buyLink).toHaveAttribute('rel', 'noopener noreferrer');

    const href = buyLink.getAttribute('href');
    expect(href).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/7360?Date=20.11.2026');
  });

  it('renders individual InfoFer train links for each leg in multi-leg transfer journeys', () => {
    const multiLegTrip: TripItem = {
      id: 'trip-multileg-1',
      travelDate: '2026-11-21',
      selectedClass: 'STANDARD',
      addedAt: '2026-11-20T10:00:00Z',
      transfersCount: 1,
      legs: [
        {
          legIndex: 0,
          transportType: 'TRAIN',
          names: { lineCode: 'IR 1732', originName: 'Galați', destinationName: 'Ploiești Sud', operatorName: 'CFR Călători' },
        },
        {
          legIndex: 1,
          transportType: 'TRAIN',
          names: { lineCode: 'R-E 10061', originName: 'Ploiești Sud', destinationName: 'Brașov', operatorName: 'Regio Călători' },
        },
      ],
      journey: {
        id: 'journey-multileg',
        trainNumber: 'IR 1732 ➔ R-E 10061',
        operator: 'CFR + Regio Călători',
        origin: { code: 'GL', name: 'Galați', city: 'Galați' },
        destination: { code: 'BV', name: 'Brașov', city: 'Brașov' },
        departureTime: '2026-11-21T06:00:00Z',
        arrivalTime: '2026-11-21T11:30:00Z',
        durationMinutes: 330,
        durationFormatted: '5h 30m',
        status: 'ON_TIME',
        delayMinutes: 0,
        fares: [{ classType: 'STANDARD', price: 92.5, currency: 'RON', seatsAvailable: 20 }],
        stops: [],
        amenities: [],
        carbonFootprintKg: 10,
        legs: [
          {
            legIndex: 0,
            transportType: 'TRAIN',
            names: { lineCode: 'IR 1732', originName: 'Galați', destinationName: 'Ploiești Sud', operatorName: 'CFR Călători' },
          },
          {
            legIndex: 1,
            transportType: 'TRAIN',
            names: { lineCode: 'R-E 10061', originName: 'Ploiești Sud', destinationName: 'Brașov', operatorName: 'Regio Călători' },
          },
        ],
      },
    };

    mockTrips = [multiLegTrip];
    render(<MyTripPage />);

    expect(screen.getByTestId('buy-official-ticket-multileg')).toBeInTheDocument();
    const leg0 = screen.getByTestId('buy-official-ticket-leg-0');
    const leg1 = screen.getByTestId('buy-official-ticket-leg-1');

    expect(leg0).toHaveTextContent('InfoFer: IR 1732');
    expect(leg0).toHaveAttribute('href', 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/1732?Date=21.11.2026');

    expect(leg1).toHaveTextContent('InfoFer: R-E 10061');
    expect(leg1).toHaveAttribute('href', 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/10061?Date=21.11.2026');
  });

  it('verifies borderless quiet footer row with ML delay & connection guarantee and profile link', () => {
    mockTrips = [sampleTrip];
    render(<MyTripPage />);

    expect(screen.getByText(/⏱️ \+34m expected delay/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct route/i)).toBeInTheDocument();
    const profileLink = screen.getByText('Kept in your itinerary for profile savings stats');
    expect(profileLink).toBeInTheDocument();
    expect(profileLink.closest('a')).toHaveAttribute('href', '/profile');
  });
});
