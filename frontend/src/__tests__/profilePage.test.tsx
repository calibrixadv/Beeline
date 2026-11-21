import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProfilePage from '../app/profile/page';
import { apiClient } from '../services/apiClient';
import { UserProfile, UserTravelStats } from '../types/auth';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockRefreshUser = jest.fn().mockResolvedValue(undefined);

let mockAuthUser: UserProfile | null = {
  id: 'usr-traveler-123',
  email: 'andrei.popescu@beeline.io',
  username: 'andrei_bee',
  full_name: 'Andrei Popescu',
  phone_number: '+40722123456',
  avatar_url: null,
  is_guest: false,
  is_active: true,
  mfa_enabled: false,
  email_verified: true,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
    refreshUser: mockRefreshUser,
  }),
}));

jest.mock('../services/apiClient', () => ({
  apiClient: {
    getTravelStats: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

describe('ProfilePage (/profile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = {
      id: 'usr-traveler-123',
      email: 'andrei.popescu@beeline.io',
      username: 'andrei_bee',
      full_name: 'Andrei Popescu',
      phone_number: '+40722123456',
      avatar_url: null,
      is_guest: false,
      is_active: true,
      mfa_enabled: false,
      email_verified: true,
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:00:00Z',
    };
  });

  it('renders /profile with mocked getTravelStats showing honest comparative stats vs. car and routes ledger', async () => {
    const mockStats: UserTravelStats = {
      totalTrips: 3,
      moneySavedLei: 182.45,
      minutesSaved: 35,
      totalDistanceKm: 636.2,
      co2SavedKg: 86.5,
      comparisonBaseline: 'CAR',
      favoriteRoute: {
        origin: 'Galați',
        destination: 'București Nord',
        tripCount: 2,
        totalDistanceKm: 465.8,
        moneySavedLei: 177.84,
        minutesSaved: 20,
        topOperator: 'CFR Călători',
      },
      topRoutes: [
        {
          origin: 'Galați',
          destination: 'București Nord',
          tripCount: 2,
          totalDistanceKm: 465.8,
          moneySavedLei: 177.84,
          minutesSaved: 20,
          topOperator: 'CFR Călători',
        },
        {
          origin: 'București Nord',
          destination: 'Brașov',
          tripCount: 1,
          totalDistanceKm: 170.4,
          moneySavedLei: 4.61,
          minutesSaved: 15,
          topOperator: 'CFR Călători',
        },
      ],
    };

    (apiClient.getTravelStats as jest.Mock).mockResolvedValue(mockStats);

    render(<ProfilePage />);

    // Header assertions
    expect(screen.getByText('Andrei Popescu')).toBeInTheDocument();
    expect(screen.getByText('andrei.popescu@beeline.io')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByTestId('profile-my-trip-link')).toBeInTheDocument();

    // Travel Savings Strip assertions
    await waitFor(() => {
      expect(screen.getByTestId('profile-savings-strip')).toBeInTheDocument();
    });

    const moneySavedEl = screen.getByTestId('stat-money-saved');
    expect(moneySavedEl).toHaveTextContent('182.45 RON');

    const minutesSavedEl = screen.getByTestId('stat-minutes-saved');
    expect(minutesSavedEl).toHaveTextContent('35 min');

    const favoriteRouteEl = screen.getByTestId('stat-favorite-route');
    expect(favoriteRouteEl).toHaveTextContent('Galați ➔ București Nord');
    expect(favoriteRouteEl).toHaveTextContent('2 trips');

    // Sub-line factual stats
    expect(screen.getByText(/3 trips \| 636\.2 km \| 86\.5 kg CO2 saved/)).toBeInTheDocument();

    // Your Corridors Ledger
    const ledger = screen.getByTestId('profile-top-routes');
    expect(ledger).toBeInTheDocument();
    expect(within(ledger).getByText('Galați ➔ București Nord')).toBeInTheDocument();
    expect(screen.getByText('+177.84 RON saved')).toBeInTheDocument();
    expect(within(ledger).getByText('București Nord ➔ Brașov')).toBeInTheDocument();
    expect(screen.getByText('+4.61 RON saved')).toBeInTheDocument();
  });

  it('renders clean empty state with 0 trips showing 0.00 RON, 0 min, and "No trips yet" without fabricating data', async () => {
    const zeroStats: UserTravelStats = {
      totalTrips: 0,
      moneySavedLei: 0.0,
      minutesSaved: 0,
      totalDistanceKm: 0.0,
      co2SavedKg: 0.0,
      comparisonBaseline: 'CAR',
      favoriteRoute: null,
      topRoutes: [],
    };

    (apiClient.getTravelStats as jest.Mock).mockResolvedValue(zeroStats);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-savings-strip')).toBeInTheDocument();
    });

    // Zero factual values
    expect(screen.getByTestId('stat-money-saved')).toHaveTextContent('0.00 RON');
    expect(screen.getByTestId('stat-minutes-saved')).toHaveTextContent('0 min');
    expect(screen.getByTestId('stat-favorite-route')).toHaveTextContent('No trips yet');
    expect(screen.getByText(/0 trips \| 0\.0 km \| 0\.0 kg CO2 saved/)).toBeInTheDocument();

    // Clean empty state prompt
    expect(screen.getByText('No journeys recorded yet')).toBeInTheDocument();
    expect(screen.getByText('Plan your first trip')).toBeInTheDocument();
  });

  it('handles profile update form submission and calls PATCH /api/v1/users/me with ONLY username via apiClient.updateProfile', async () => {
    (apiClient.getTravelStats as jest.Mock).mockResolvedValue({
      totalTrips: 0,
      moneySavedLei: 0.0,
      minutesSaved: 0,
      totalDistanceKm: 0.0,
      co2SavedKg: 0.0,
      comparisonBaseline: 'CAR',
      favoriteRoute: null,
      topRoutes: [],
    });

    (apiClient.updateProfile as jest.Mock).mockResolvedValue({
      id: 'usr-traveler-123',
      email: 'andrei.popescu@beeline.io',
      username: 'andrei_updated',
      full_name: 'Andrei Popescu',
      phone_number: '+40722123456',
    });

    render(<ProfilePage />);

    // Assert full_name and phone_number inputs are NOT present in Account Details
    expect(screen.queryByTestId('profile-input-fullname')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-input-phone')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();

    // Verify ONLY username input is rendered with proper attributes
    const usernameInput = screen.getByTestId('profile-input-username');
    const saveBtn = screen.getByTestId('profile-save-button');

    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('id', 'profile-username-input');
    expect(usernameInput).toHaveAttribute('aria-label', 'Username');
    expect(usernameInput).toHaveValue('andrei_bee');
    expect(saveBtn).toHaveAttribute('type', 'submit');

    // Change username field
    fireEvent.change(usernameInput, { target: { value: 'andrei_updated' } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.updateProfile).toHaveBeenCalledWith({
        username: 'andrei_updated',
      });
    });

    expect(mockRefreshUser).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('profile-form-feedback')).toHaveTextContent(
        'Profile details updated successfully.'
      );
    });
  });

  it('displays error feedback on 409 username already taken', async () => {
    (apiClient.getTravelStats as jest.Mock).mockResolvedValue({
      totalTrips: 0,
      moneySavedLei: 0.0,
      minutesSaved: 0,
      totalDistanceKm: 0.0,
      co2SavedKg: 0.0,
      comparisonBaseline: 'CAR',
      favoriteRoute: null,
      topRoutes: [],
    });

    const conflictErr: any = new Error('Username is already taken');
    conflictErr.status = 409;
    (apiClient.updateProfile as jest.Mock).mockRejectedValueOnce(conflictErr);

    render(<ProfilePage />);

    const usernameInput = screen.getByTestId('profile-input-username');
    const saveBtn = screen.getByTestId('profile-save-button');

    fireEvent.change(usernameInput, { target: { value: 'taken_user' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('profile-form-feedback')).toHaveTextContent(
        'Username is already taken. Please choose another.'
      );
    });
  });
});
