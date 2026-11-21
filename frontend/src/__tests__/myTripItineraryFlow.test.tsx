import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import MyTripPage from '../app/my-trip/page';
import { TripItem } from '../types/trip';

const mockRemoveTrainFromTrip = jest.fn();
const mockClearTrip = jest.fn();

let mockTrips: TripItem[] = [];

jest.mock('../context/TripContext', () => ({
  useTrip: () => ({
    trips: mockTrips,
    removeTrainFromTrip: mockRemoveTrainFromTrip,
    clearTrip: mockClearTrip,
    totalCost: mockTrips.reduce((acc, t) => acc + (t.journey.fares[0]?.price || 0), 0),
    totalDurationMinutes: 120,
    totalCo2SavedKg: 25,
    isTrainInTrip: jest.fn(),
  }),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      email: 'traveler@beeline.io',
      full_name: 'Traveler Bee',
      is_guest: false,
    },
    isLoading: false,
  }),
}));

jest.mock('../services/apiClient', () => ({
  getNotificationStatus: jest.fn().mockResolvedValue({ emailNotificationsEnabled: true }),
  sendTestDepartureAlert: jest.fn().mockResolvedValue({ recipientEmail: 'traveler@beeline.io' }),
  updatePreferences: jest.fn().mockResolvedValue({}),
}));

describe('MyTripPage Itinerary Flow & Official Ticket Redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrips = [];
  });

  it('renders "No saved journeys yet." when itinerary is empty', () => {
    mockTrips = [];
    render(<MyTripPage />);

    expect(screen.getByText(/no saved journeys yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm booking/i })).not.toBeInTheDocument();
  });

  it('renders factual subtitle and official ticket redirect button when journeys exist', () => {
    const sampleTrip: TripItem = {
      id: 'trip-ir1572-1',
      travelDate: '2026-11-21',
      selectedClass: 'STANDARD',
      addedAt: '2026-11-20T10:00:00Z',
      journey: {
        id: 'plan-ir1572',
        trainNumber: 'IR 1572',
        operator: 'CFR Călători',
        origin: { code: 'GL', name: 'Galați', city: 'Galați' },
        destination: { code: 'BNC', name: 'București Nord', city: 'București' },
        departureTime: '2026-11-21T08:30:00Z',
        arrivalTime: '2026-11-21T12:15:00Z',
        durationMinutes: 225,
        durationFormatted: '3h 45m',
        status: 'ON_TIME',
        delayMinutes: 0,
        fares: [
          {
            classType: 'STANDARD',
            price: 68.5,
            currency: 'RON',
            seatsAvailable: 42,
          },
        ],
        stops: [],
        amenities: ['WIFI'],
        carbonFootprintKg: 7.2,
      },
    };

    mockTrips = [sampleTrip];
    render(<MyTripPage />);

    // Header subtitle
    expect(screen.getByText('1 saved journey in your itinerary.')).toBeInTheDocument();

    // Fake checkout card MUST NOT exist
    expect(screen.queryByTestId('checkout-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm booking/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/this train has already departed and cannot be booked/i)).not.toBeInTheDocument();

    // Official Mersul Trenurilor ticket purchase button MUST exist with safe external attributes
    const buyBtn = screen.getByTestId('buy-official-ticket');
    expect(buyBtn).toBeInTheDocument();
    expect(buyBtn).toHaveTextContent(/vezi trenul pe infofer/i);
    expect(buyBtn).toHaveAttribute('target', '_blank');
    expect(buyBtn).toHaveAttribute('rel', 'noopener noreferrer');

    const href = buyBtn.getAttribute('href');
    expect(href).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/1572?Date=21.11.2026');

    // Trash / remove button works
    const trashBtn = screen.getByTitle(/remove from itinerary/i);
    expect(trashBtn).toBeInTheDocument();
    fireEvent.click(trashBtn);
    expect(mockRemoveTrainFromTrip).toHaveBeenCalledWith('trip-ir1572-1');
  });
});
