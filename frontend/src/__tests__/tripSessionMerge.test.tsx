import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { TripProvider, useTrip, SESSION_STORAGE_KEY } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { TrainJourney } from '../types/train';
import { TripItem } from '../types/trip';
import { convertTrainJourneyToRoutePlan } from '../services/tripBookingService';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/apiClient', () => ({
  apiClient: {
    getSavedRoutes: jest.fn(),
    saveRoute: jest.fn(),
    deleteSavedRoute: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const TEST_FUTURE_DATE = '2026-12-05';

const journey1: TrainJourney = {
  id: 'train-1572',
  trainNumber: 'IR 1572',
  operator: 'CFR Călători',
  origin: { code: 'GLT', name: 'Galați', city: 'Galați' },
  destination: { code: 'BUC', name: 'București Nord', city: 'București' },
  departureTime: `${TEST_FUTURE_DATE}T08:30:00+03:00`,
  arrivalTime: `${TEST_FUTURE_DATE}T12:15:00+03:00`,
  durationMinutes: 225,
  durationFormatted: '3h 45m',
  status: 'ON_TIME',
  delayMinutes: 0,
  carbonFootprintKg: 10,
  fares: [{ classType: 'STANDARD', price: 65, currency: 'RON', seatsAvailable: 10 }],
  stops: [],
  amenities: [],
};

const journey2: TrainJourney = {
  id: 'train-1574',
  trainNumber: 'IR 1574',
  operator: 'CFR Călători',
  origin: { code: 'GLT', name: 'Galați', city: 'Galați' },
  destination: { code: 'BUC', name: 'București Nord', city: 'București' },
  departureTime: `${TEST_FUTURE_DATE}T14:30:00+03:00`,
  arrivalTime: `${TEST_FUTURE_DATE}T18:15:00+03:00`,
  durationMinutes: 225,
  durationFormatted: '3h 45m',
  status: 'ON_TIME',
  delayMinutes: 0,
  carbonFootprintKg: 10,
  fares: [{ classType: 'STANDARD', price: 65, currency: 'RON', seatsAvailable: 10 }],
  stops: [],
  amenities: [],
};

const sessionTrip1: TripItem = {
  id: 'session-trip-1',
  journey: journey1,
  selectedClass: 'STANDARD',
  travelDate: TEST_FUTURE_DATE,
  addedAt: `${TEST_FUTURE_DATE}T08:00:00.000Z`,
};

const sessionTrip2: TripItem = {
  id: 'session-trip-2',
  journey: journey2,
  selectedClass: 'STANDARD',
  travelDate: TEST_FUTURE_DATE,
  addedAt: `${TEST_FUTURE_DATE}T09:00:00.000Z`,
};

const plan1 = convertTrainJourneyToRoutePlan(journey1, TEST_FUTURE_DATE);
const plan2 = convertTrainJourneyToRoutePlan(journey2, TEST_FUTURE_DATE);

const savedRoute1 = {
  id: 'sr-111',
  origin_name: 'Galați',
  destination_name: 'București Nord',
  plan: plan1,
  notes: null,
  created_at: `${TEST_FUTURE_DATE}T07:00:00.000Z`,
};

const savedRoute2 = {
  id: 'sr-222',
  origin_name: 'Galați',
  destination_name: 'București Nord',
  plan: plan2,
  notes: null,
  created_at: `${TEST_FUTURE_DATE}T07:30:00.000Z`,
};

const TestConsumer: React.FC<{
  onApiState?: (api: ReturnType<typeof useTrip>) => void;
}> = ({ onApiState }) => {
  const tripApi = useTrip();
  React.useEffect(() => {
    if (onApiState) {
      onApiState(tripApi);
    }
  }, [tripApi, onApiState]);

  return (
    <div>
      <div data-testid="trip-count">{tripApi.trips.length}</div>
      <div data-testid="trip-trains">
        {tripApi.trips.map((t) => t.journey.trainNumber).join(',')}
      </div>
      <button
        data-testid="add-btn-1"
        onClick={() => tripApi.addTrainToTrip(journey1, 'STANDARD', TEST_FUTURE_DATE)}
      >
        Add 1
      </button>
      <button
        data-testid="add-trip-alias"
        onClick={() => tripApi.addTrip(journey1, 'STANDARD', TEST_FUTURE_DATE)}
      >
        Add Trip Alias
      </button>
      <button
        data-testid="add-btn-2"
        onClick={() => tripApi.addTrainToTrip(journey2, 'STANDARD', TEST_FUTURE_DATE)}
      >
        Add 2
      </button>
      {tripApi.trips[0] && (
        <button
          data-testid="remove-first"
          onClick={() => tripApi.removeTrainFromTrip(tripApi.trips[0].id)}
        >
          Remove First
        </button>
      )}
    </div>
  );
};

describe('TripContext Session Storage & 4-Case Auth Merge Matrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe('Deduplication by Canonical Physical Fingerprint', () => {
    it('produces only 1 entry when adding the same physical trip twice (via addTrainToTrip and addTrip)', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      expect(screen.getByTestId('trip-count')).toHaveTextContent('0');

      // Add journey 1 first time
      act(() => {
        fireEvent.click(screen.getByTestId('add-btn-1'));
      });
      expect(screen.getByTestId('trip-count')).toHaveTextContent('1');

      // Add same journey via addTrip alias -> deduplicated, does not add
      act(() => {
        fireEvent.click(screen.getByTestId('add-trip-alias'));
      });
      expect(screen.getByTestId('trip-count')).toHaveTextContent('1');

      // Add same journey via add-btn-1 again -> still 1
      act(() => {
        fireEvent.click(screen.getByTestId('add-btn-1'));
      });
      expect(screen.getByTestId('trip-count')).toHaveTextContent('1');

      // Stored in sessionStorage cleanly
      const stored = JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].journey.trainNumber).toBe('IR 1572');
    });
  });

  describe('4-Case Login Merge Matrix', () => {
    it('Case 1: sessionTrips > 0 AND accountTrips > 0 (Distinct trains -> 2 trips, session trip persisted)', async () => {
      // Anonymous session has IR 1574
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([sessionTrip2]));

      // Account has IR 1572
      mockApiClient.getSavedRoutes.mockResolvedValue([savedRoute1 as any]);
      mockApiClient.saveRoute.mockResolvedValue({
        id: 'sr-new-222',
        origin_name: 'Galați',
        destination_name: 'București Nord',
        plan: plan2,
        created_at: '2026-10-21T09:05:00.000Z',
      });

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('2');
      });

      expect(mockApiClient.saveRoute).toHaveBeenCalledTimes(1);
      // Session storage cleared after merge
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();

      const trains = screen.getByTestId('trip-trains').textContent;
      expect(trains).toContain('IR 1572');
      expect(trains).toContain('IR 1574');
    });

    it('Case 1 (Duplicate): sessionTrips > 0 AND accountTrips > 0 (Same train -> 0 duplicates, 1 trip preserved)', async () => {
      // Anonymous session has IR 1572
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([sessionTrip1]));

      // Account already has IR 1572 (identical physical fingerprint)
      mockApiClient.getSavedRoutes.mockResolvedValue([savedRoute1 as any]);

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('1');
      });

      // No re-persisting needed because it was already in account
      expect(mockApiClient.saveRoute).not.toHaveBeenCalled();
      // Session storage cleared
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(screen.getByTestId('trip-trains')).toHaveTextContent('IR 1572');
    });

    it('Case 2: sessionTrips > 0 AND accountTrips === 0 (Session trip persisted to account & visible)', async () => {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([sessionTrip1]));

      mockApiClient.getSavedRoutes.mockResolvedValue([]);
      mockApiClient.saveRoute.mockResolvedValue({
        id: 'sr-new-111',
        origin_name: 'Galați',
        destination_name: 'București Nord',
        plan: plan1,
        created_at: '2026-10-21T09:10:00.000Z',
      });

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('1');
      });

      expect(mockApiClient.saveRoute).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(screen.getByTestId('trip-trains')).toHaveTextContent('IR 1572');
    });

    it('Case 3: sessionTrips === 0 AND accountTrips > 0 (Account trips preserved untouched)', async () => {
      // Empty session
      window.sessionStorage.clear();

      mockApiClient.getSavedRoutes.mockResolvedValue([savedRoute1 as any]);

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('1');
      });

      expect(mockApiClient.saveRoute).not.toHaveBeenCalled();
      expect(screen.getByTestId('trip-trains')).toHaveTextContent('IR 1572');
    });

    it('Case 4: sessionTrips === 0 AND accountTrips === 0 (Stays cleanly empty [])', async () => {
      window.sessionStorage.clear();
      mockApiClient.getSavedRoutes.mockResolvedValue([]);

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('0');
      });

      expect(mockApiClient.saveRoute).not.toHaveBeenCalled();
      expect(screen.getByTestId('trip-trains')).toHaveTextContent('');
    });
  });

  describe('Sync on Add and Delete for Authenticated User', () => {
    it('immediately calls saveRoute when authenticated user adds a trip, and deleteSavedRoute on removal', async () => {
      mockApiClient.getSavedRoutes.mockResolvedValue([]);
      mockApiClient.saveRoute.mockResolvedValue({
        id: 'sr-created-999',
        origin_name: 'Galați',
        destination_name: 'București Nord',
        plan: plan1,
        created_at: '2026-10-21T10:00:00.000Z',
      });
      mockApiClient.deleteSavedRoute.mockResolvedValue({ message: 'Deleted' });

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('0');
      });

      // Add journey 1
      act(() => {
        fireEvent.click(screen.getByTestId('add-btn-1'));
      });

      expect(screen.getByTestId('trip-count')).toHaveTextContent('1');
      await waitFor(() => {
        expect(mockApiClient.saveRoute).toHaveBeenCalledTimes(1);
      });

      // Remove the added trip
      act(() => {
        fireEvent.click(screen.getByTestId('remove-first'));
      });

      expect(screen.getByTestId('trip-count')).toHaveTextContent('0');
      await waitFor(() => {
        expect(mockApiClient.deleteSavedRoute).toHaveBeenCalledWith('sr-created-999');
      });
    });

    it('clears in-memory trips on logout and does NOT leak account trips to sessionStorage', async () => {
      mockApiClient.getSavedRoutes.mockResolvedValue([savedRoute1 as any]);

      // User logged in
      const { rerender } = render(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      mockUseAuth.mockReturnValue({
        user: { id: 'u-1', email: 'traveler@beeline.io', is_guest: false },
      });

      rerender(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('1');
      });

      // User logs out
      mockUseAuth.mockReturnValue({ user: null });

      rerender(
        <TripProvider>
          <TestConsumer />
        </TripProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('trip-count')).toHaveTextContent('0');
      });

      // Session storage must NOT contain the account trip
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });
});
