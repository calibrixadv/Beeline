import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../app/page';
import TripsPage from '../app/trips/page';
import { TripProvider } from '../context/TripContext';
import { fetchDayTripsFromBackend } from '../services/tripBookingService';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}));

describe('Trips Live & 2026-2027 Date Sync Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('renders Travel Date Picker and Provider Booking Window Badge on HomePage', () => {
    render(<HomePage />);

    const datePicker = screen.getByTestId('travel-date-picker');
    expect(datePicker).toBeInTheDocument();
    expect(datePicker).toHaveAttribute('type', 'date');

    const bookingBadge = screen.getByTestId('provider-booking-badge');
    expect(bookingBadge).toBeInTheDocument();
    expect(bookingBadge).toHaveTextContent(/CFR SA \/ IRIS Verified Booking Window/i);
    expect(bookingBadge).toHaveTextContent(/90 Days/i);
    expect(bookingBadge).toHaveTextContent(/2025-2026 \/ 2026-2027/i);
  });

  it('renders Quick-Select Date Pills (Today, Tomorrow, This Weekend, +1 Month) and updates date value', () => {
    render(<HomePage />);

    const todayPill = screen.getByTestId('date-pill-today');
    const tomorrowPill = screen.getByTestId('date-pill-tomorrow');
    const weekendPill = screen.getByTestId('date-pill-weekend');
    const monthPill = screen.getByTestId('date-pill-month');

    expect(todayPill).toBeInTheDocument();
    expect(tomorrowPill).toBeInTheDocument();
    expect(weekendPill).toBeInTheDocument();
    expect(monthPill).toBeInTheDocument();

    const datePicker = screen.getByTestId('travel-date-picker') as HTMLInputElement;
    const initialVal = datePicker.value;
    expect(initialVal).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Click Tomorrow
    fireEvent.click(tomorrowPill);
    expect(datePicker.value).not.toBe('');

    // Click +1 Month
    fireEvent.click(monthPill);
    expect(datePicker.value).not.toBe(initialVal);
  });

  it('passes date parameter when booking a route from HomePage to /trips', () => {
    render(<HomePage />);

    const datePicker = screen.getByTestId('travel-date-picker') as HTMLInputElement;
    fireEvent.change(datePicker, { target: { value: '2026-11-25' } });

    // Submit corridor search
    const submitBtn = screen.getByRole('button', { name: /Find Synchronized Routes/i });
    fireEvent.click(submitBtn);

    // Book selected route
    const bookBtn = screen.getByTestId('book-selected-route-cta');
    fireEvent.click(bookBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('/trips?');
    expect(calledUrl).toContain('date=2026-11-25');
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
    await screen.findByTestId('trips-date-bar');
    expect(tripsContainer.querySelector('canvas')).toBeNull();
    expect(tripsContainer.querySelector('.leaflet-container')).toBeNull();
  });

  it('fetchDayTripsFromBackend returns train-only plans for valid date', async () => {
    const result = await fetchDayTripsFromBackend('Galați', 'București Nord', '2026-11-20');
    expect(result.plans.length).toBeGreaterThan(0);
    for (const plan of result.plans) {
      expect(plan.legs.every((l) => l.transportType === 'TRAIN')).toBe(true);
    }
  });
});
