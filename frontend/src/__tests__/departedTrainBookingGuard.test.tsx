import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { isTrainDeparted } from '../utils/departureTime';
import BookingTripCard from '../components/BookingTripCard';
import { TransitRoutePlan } from '../types/routePlan';

describe('departedTrainBookingGuard - isTrainDeparted helper', () => {
  it('returns true for past ISO timestamp', () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    expect(isTrainDeparted(pastTime)).toBe(true);
  });

  it('returns false for future ISO timestamp', () => {
    const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future
    expect(isTrainDeparted(futureTime)).toBe(false);
  });

  it('returns true for past travelDate when departureTime is absent', () => {
    const pastDate = '2020-01-01';
    expect(isTrainDeparted(null, pastDate)).toBe(true);
  });

  it('returns false for future travelDate when departureTime is absent', () => {
    const futureDate = '2099-12-31';
    expect(isTrainDeparted(null, futureDate)).toBe(false);
  });

  it('correctly handles time string combined with travelDate', () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    // 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);
    const pastTimeOnly = `${String(twoHoursAgo.getHours()).padStart(2, '0')}:${String(twoHoursAgo.getMinutes()).padStart(2, '0')}`;
    expect(isTrainDeparted(pastTimeOnly, todayStr)).toBe(true);
  });
});

describe('BookingTripCard Departed Guard', () => {
  const basePlan: TransitRoutePlan = {
    id: 'plan-direct-ir1572',
    date: '2026-11-20',
    summary: 'IR 1572 Direct',
    departureTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins in past
    arrivalTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
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
          scheduledDeparture: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          scheduledArrival: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          estimatedDeparture: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          estimatedArrival: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
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
        instructions: {
          leadText: 'Board IR 1572 directly to destination',
        },
      },
    ],
  };

  it('disables the book button and shows "Departed" badge when departureTime is in the past', () => {
    const handleBook = jest.fn();
    render(<BookingTripCard plan={basePlan} onBookTrip={handleBook} />);

    // Expect Departed badge
    const badge = screen.getByTestId('trip-departed-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Departed');

    // Expect disabled button with Departed text
    const bookBtn = screen.getByRole('button', { name: /departed/i });
    expect(bookBtn).toBeInTheDocument();
    expect(bookBtn).toBeDisabled();

    // Clicking should not invoke handleBook
    fireEvent.click(bookBtn);
    expect(handleBook).not.toHaveBeenCalled();
  });

  it('keeps itinerary button enabled and allows adding to itinerary when departureTime is in the future', () => {
    const futurePlan: TransitRoutePlan = {
      ...basePlan,
      id: 'test-guard-plan-future',
      departureTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // 2 hours in future
      arrivalTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    };

    const handleBook = jest.fn();
    render(<BookingTripCard plan={futurePlan} onBookTrip={handleBook} />);

    // Departed badge should NOT be in the document
    expect(screen.queryByTestId('trip-departed-badge')).not.toBeInTheDocument();

    // Button should be enabled and say "Add to Itinerary"
    const addBtn = screen.getByRole('button', { name: /add to itinerary/i });
    expect(addBtn).toBeInTheDocument();
    expect(addBtn).not.toBeDisabled();

    // Clicking invokes handleBook / onAddToItinerary
    fireEvent.click(addBtn);
    expect(handleBook).toHaveBeenCalledWith(futurePlan);
  });

  it('displays "In Itinerary ✓" and official Mersul Trenurilor link when already in itinerary', () => {
    const futurePlan: TransitRoutePlan = {
      ...basePlan,
      id: 'test-guard-plan-booked',
      departureTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      arrivalTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    };

    const handleInItineraryClick = jest.fn();
    render(
      <BookingTripCard
        plan={futurePlan}
        isBooked={true}
        onInItineraryClick={handleInItineraryClick}
      />
    );

    const btn = screen.getByRole('button', { name: /in itinerary ✓/i });
    expect(btn).toBeInTheDocument();

    const link = screen.getByTestId('open-official-ticket-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('mersultrenurilor.infofer.ro'));

    fireEvent.click(btn);
    expect(handleInItineraryClick).toHaveBeenCalledWith(futurePlan);
  });
});
