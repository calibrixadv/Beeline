import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { TripsGhostSkeleton } from '../components/TripsGhostSkeleton';
import { AuthGhostSkeleton } from '../components/AuthGhostSkeleton';
import { TrainsGhostSkeleton } from '../components/TrainsGhostSkeleton';
import { Navbar } from '../components/Navbar';
import TrainsPage, { normalizeTrainCode, isTrainCodeMatch } from '../app/trains/page';
import TripsPage from '../app/trips/page';
import { apiClient } from '../services/apiClient';
import { SAMPLE_TRAINS } from '../data/sampleTrains';
import * as tripBookingService from '../services/tripBookingService';
import { TripProvider } from '../context/TripContext';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => mockSearchParams,
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isGuest: true,
    isLoading: false,
    login: jest.fn(),
    signup: jest.fn(),
    continueAsGuest: jest.fn(),
    logout: jest.fn(),
    mfaChallenge: null,
    verifyMFA: jest.fn(),
    cancelMFA: jest.fn(),
  }),
}));

describe('Glassy Ghost Layouts & Complete Schedules Removal Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('1. TripsGhostSkeleton & /trips Integration', () => {
    it('renders standard mode with data-testid="trips-ghost-skeleton", 3 summary cards, 4 trip cards, shimmer overlay and zero canvas/leaflet', () => {
      const { container } = render(<TripsGhostSkeleton />);

      const root = screen.getByTestId('trips-ghost-skeleton');
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('role', 'status');
      expect(root).toHaveAttribute('aria-busy', 'true');
      expect(root).toHaveAttribute('aria-label', 'Loading available train routes');

      const summaryCards = screen.getAllByTestId('ghost-summary-card');
      expect(summaryCards).toHaveLength(3);
      summaryCards.forEach((c) => {
        expect(c).toHaveClass('glass-ghost-card');
        expect(c.querySelector('.glass-shimmer-overlay')).toBeInTheDocument();
      });

      const tripCards = screen.getAllByTestId('ghost-trip-card');
      expect(tripCards).toHaveLength(4);
      tripCards.forEach((c) => {
        expect(c).toHaveClass('glass-ghost-card');
        expect(c.querySelector('.glass-shimmer-overlay')).toBeInTheDocument();
      });

      // Strictly ZERO canvas or leaflet
      expect(container.querySelectorAll('canvas').length).toBe(0);
      expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
      expect(container.querySelectorAll('map').length).toBe(0);
    });

    it('renders fullPage mode with date bar, search bar, and filter bar ghost skeletons', () => {
      const { container } = render(<TripsGhostSkeleton fullPage />);

      expect(screen.getByTestId('ghost-trips-date-bar')).toBeInTheDocument();
      expect(screen.getByTestId('ghost-trips-search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('ghost-trips-filter-bar')).toBeInTheDocument();
      expect(screen.getAllByTestId('ghost-summary-card')).toHaveLength(3);
      expect(screen.getAllByTestId('ghost-trip-card')).toHaveLength(4);

      // Strictly ZERO canvas or leaflet
      expect(container.querySelectorAll('canvas').length).toBe(0);
      expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
    });

    it('renders TripsGhostSkeleton during backend fetch and via Debug Tools', async () => {
      let resolveFetch!: (data: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockImplementation(() => pendingPromise as any);

      render(
        <TripProvider>
          <TripsPage />
        </TripProvider>
      );

      // Ghost skeleton visible while loading
      expect(screen.getByTestId('trips-ghost-skeleton')).toBeInTheDocument();

      // Resolve backend fetch
      await act(async () => {
        resolveFetch({
          plans: [],
          allDayDepartures: [],
          status: 'NO_TRAINS',
        });
      });

      // Trips skeleton unmounts once loaded
      await waitFor(() => {
        expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
      });

      // Open Debug Tools and force loading
      const debugBtn = screen.getByRole('button', { name: /Open Debug Tools/i });
      fireEvent.click(debugBtn);

      const toggleForceBtn = screen.getByTestId('debug-toggle-loading-state');
      fireEvent.click(toggleForceBtn);

      // Skeleton immediately appears
      expect(screen.getByTestId('trips-ghost-skeleton')).toBeInTheDocument();

      // Stop loading via Debug Tools
      fireEvent.click(debugBtn);
      const stopBtn = screen.getByTestId('debug-toggle-loading-state');
      fireEvent.click(stopBtn);
      expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('2. AuthGhostSkeleton Integration', () => {
    it('renders AuthGhostSkeleton with data-testid="auth-ghost-skeleton", .glass-shimmer-overlay, role="status", aria-busy="true", and zero canvas/leaflet', () => {
      const { container } = render(<AuthGhostSkeleton />);

      const root = screen.getByTestId('auth-ghost-skeleton');
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('role', 'status');
      expect(root).toHaveAttribute('aria-busy', 'true');
      expect(root).toHaveAttribute('aria-label', 'Loading authentication');

      // Shimmer overlays present
      const overlays = container.querySelectorAll('.glass-shimmer-overlay');
      expect(overlays.length).toBeGreaterThan(0);

      // Glass ghost cards present
      const cards = container.querySelectorAll('.glass-ghost-card');
      expect(cards.length).toBeGreaterThanOrEqual(2);

      // Zero canvas or leaflet
      expect(container.querySelectorAll('canvas').length).toBe(0);
      expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
      expect(container.querySelectorAll('map').length).toBe(0);
    });
  });

  describe('3. TrainsGhostSkeleton & /trains Integration', () => {
    it('renders TrainsGhostSkeleton with data-testid="trains-ghost-skeleton", cards with staggered shimmer, and zero canvas/leaflet', () => {
      const { container } = render(<TrainsGhostSkeleton cardCount={6} fullPage />);

      const root = screen.getByTestId('trains-ghost-skeleton');
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('role', 'status');
      expect(root).toHaveAttribute('aria-busy', 'true');
      expect(root).toHaveAttribute('aria-label', 'Loading trains');

      expect(screen.getByTestId('ghost-trains-filter-bar')).toBeInTheDocument();

      const trainCards = screen.getAllByTestId('ghost-train-card');
      expect(trainCards).toHaveLength(6);
      trainCards.forEach((c) => {
        expect(c).toHaveClass('glass-ghost-card');
        expect(c.querySelector('.glass-shimmer-overlay')).toBeInTheDocument();
      });

      // Zero canvas or leaflet
      expect(container.querySelectorAll('canvas').length).toBe(0);
      expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
      expect(container.querySelectorAll('map').length).toBe(0);
    });

    it('starts cleanly in ready state with zero network requests when loaded without search params', () => {
      const getTrainsSpy = jest.spyOn(apiClient, 'getTrains');
      mockSearchParams = new URLSearchParams();

      const { container } = render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      // Zero unrequested server calls on initial mount
      expect(getTrainsSpy).not.toHaveBeenCalled();

      // Ready state UI is rendered
      expect(screen.getByTestId('trains-ready-state')).toBeInTheDocument();
      expect(screen.queryByTestId('trains-ghost-skeleton')).not.toBeInTheDocument();

      // Quick sample train code chips are present (IC 535, IR 1572, R 3029, RE 11631)
      expect(screen.getByText(/IC 535/i)).toBeInTheDocument();
      expect(screen.getByText(/IR 1572/i)).toBeInTheDocument();
      expect(screen.getByText(/R 3029/i)).toBeInTheDocument();
      expect(screen.getByText(/RE 11631/i)).toBeInTheDocument();

      // Strictly ZERO canvas, leaflet, map
      expect(container.querySelectorAll('canvas').length).toBe(0);
      expect(container.querySelectorAll('.leaflet-container').length).toBe(0);
      expect(container.querySelectorAll('map').length).toBe(0);
    });

    it('loads recent searches from localStorage with zero network requests', () => {
      const getTrainsSpy = jest.spyOn(apiClient, 'getTrains');
      mockSearchParams = new URLSearchParams();
      window.localStorage.setItem(
        'beeline_trains_recent_codes',
        JSON.stringify(['IR 1572', 'R 3029'])
      );

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      expect(getTrainsSpy).not.toHaveBeenCalled();
      const recentStrip = screen.getByTestId('recent-searches-strip');
      expect(recentStrip).toBeInTheDocument();
      expect(within(recentStrip).getByText('IR 1572')).toBeInTheDocument();
    });

    it('renders on /trains while backend fetch is pending, then disappears when trains load', async () => {
      let resolveTrains!: (data: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveTrains = resolve;
      });

      jest.spyOn(apiClient, 'getTrains').mockImplementation(() => pendingPromise as any);
      mockSearchParams = new URLSearchParams('trainCode=IR+1572');

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      // Trains ghost skeleton is visible while pending
      expect(screen.getByTestId('trains-ghost-skeleton')).toBeInTheDocument();
      expect(screen.getAllByTestId('ghost-train-card').length).toBeGreaterThan(0);

      // Real trains not yet rendered
      expect(screen.queryByText(/CFR Călători/i)).not.toBeInTheDocument();

      // Resolve backend trains
      await act(async () => {
        resolveTrains({
          items: [SAMPLE_TRAINS[0]],
          total: 1,
        });
      });

      // Trains ghost skeleton disappears
      await waitFor(() => {
        expect(screen.queryByTestId('trains-ghost-skeleton')).not.toBeInTheDocument();
      });

      // Real train card is rendered
      expect(screen.getByText(SAMPLE_TRAINS[0].trainNumber)).toBeInTheDocument();
    });

    it('fires search immediately when clicking a quick sample train code chip and saves to recent searches', async () => {
      const getTrainsSpy = jest.spyOn(apiClient, 'getTrains').mockResolvedValueOnce({
        items: [SAMPLE_TRAINS[0]],
        total: 1,
      });

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      const chip = screen.getByRole('button', { name: /IC 535/i });
      fireEvent.click(chip);

      expect(getTrainsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: 'IC 535',
        })
      );

      await waitFor(() => {
        expect(screen.getByText(SAMPLE_TRAINS[0].trainNumber)).toBeInTheDocument();
      });
    });

    it('supports whitespace and case-normalization like r3029 -> R 3029 on submit', async () => {
      const getTrainsSpy = jest.spyOn(apiClient, 'getTrains').mockResolvedValueOnce({
        items: [SAMPLE_TRAINS[0]],
        total: 1,
      });

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      const input = screen.getByTestId('trains-code-input');
      fireEvent.change(input, { target: { value: 'r3029' } });

      const searchBtn = screen.getByTestId('trains-search-btn');
      fireEvent.click(searchBtn);

      expect(getTrainsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: 'R 3029',
        })
      );

      await waitFor(() => {
        expect(screen.getByText(SAMPLE_TRAINS[0].trainNumber)).toBeInTheDocument();
      });
    });

    it('displays factual no-trains empty state when search returns 0 trains without mock data', async () => {
      jest.spyOn(apiClient, 'getTrains').mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      const searchBtn = screen.getByTestId('trains-search-btn');
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(screen.getByTestId('no-trains-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/No trains found/i)).toBeInTheDocument();
      // Zero mock train cards
      expect(screen.queryByText(SAMPLE_TRAINS[0].trainNumber)).not.toBeInTheDocument();
    });

    it('normalizes IC queries and matches IC trains correctly in isTrainCodeMatch and normalizeTrainCode', () => {
      expect(normalizeTrainCode('ic535')).toBe('IC 535');
      expect(normalizeTrainCode('IC 535')).toBe('IC 535');
      expect(normalizeTrainCode('ic')).toBe('IC');
      expect(normalizeTrainCode('r3029')).toBe('R 3029');
      expect(normalizeTrainCode('re11631')).toBe('RE 11631');

      expect(isTrainCodeMatch('IC 535', 'IC')).toBe(true);
      expect(isTrainCodeMatch('IC 535', 'ic')).toBe(true);
      expect(isTrainCodeMatch('IC 535', 'ic535')).toBe(true);
      expect(isTrainCodeMatch('IC 535', 'IC 535')).toBe(true);
      expect(isTrainCodeMatch('IC 535', '535')).toBe(true);
      expect(isTrainCodeMatch('IR 1572', 'IC')).toBe(false);
      expect(isTrainCodeMatch('IR 15531', 'IC')).toBe(false);
    });

    it('searches by ic535 and displays matching IC train with normalized code', async () => {
      const icTrain = {
        ...SAMPLE_TRAINS[0],
        id: 'tr-ic-535-20261120',
        trainNumber: 'IC 535',
        operator: 'CFR Călători',
      };
      const getTrainsSpy = jest.spyOn(apiClient, 'getTrains').mockResolvedValueOnce({
        items: [icTrain],
        data: [icTrain],
        total: 1,
      });

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      const input = screen.getByTestId('trains-code-input');
      fireEvent.change(input, { target: { value: 'ic535' } });

      const searchBtn = screen.getByTestId('trains-search-btn');
      fireEvent.click(searchBtn);

      expect(getTrainsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: 'IC 535',
        })
      );

      await waitFor(() => {
        const matches = screen.getAllByText('IC 535');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some((el) => el.tagName === 'SPAN')).toBe(true);
      });
    });

    it('handles search by category prefix IC and renders matching IC trains', async () => {
      const icTrain = {
        ...SAMPLE_TRAINS[0],
        id: 'tr-ic-535-20261120',
        trainNumber: 'IC 535',
        operator: 'CFR Călători',
      };
      const getTrainsSpy = jest.spyOn(apiClient, 'getTrains').mockResolvedValueOnce({
        items: [icTrain],
        data: [icTrain],
        total: 1,
      });

      render(
        <TripProvider>
          <TrainsPage />
        </TripProvider>
      );

      const input = screen.getByTestId('trains-code-input');
      fireEvent.change(input, { target: { value: 'IC' } });

      const searchBtn = screen.getByTestId('trains-search-btn');
      fireEvent.click(searchBtn);

      expect(getTrainsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: 'IC',
        })
      );

      await waitFor(() => {
        const matches = screen.getAllByText('IC 535');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some((el) => el.tagName === 'SPAN')).toBe(true);
      });
    });
  });

  describe('4. Complete Removal of Schedules', () => {
    it('Navbar strictly contains ZERO /schedules or Schedules links', () => {
      const { container } = render(
        <TripProvider>
          <Navbar />
        </TripProvider>
      );

      // No link pointing to /schedules
      const scheduleLinks = container.querySelectorAll('a[href="/schedules"]');
      expect(scheduleLinks.length).toBe(0);

      // No text saying "Schedules"
      expect(screen.queryByText(/^Schedules$/i)).not.toBeInTheDocument();

      // Active links should be Home, Trips, Trains, My Trip
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Trips')).toBeInTheDocument();
      expect(screen.getByText('Trains')).toBeInTheDocument();
      expect(screen.getByText('My Trip')).toBeInTheDocument();
      expect(screen.queryByText(/Explore as Guest/i)).not.toBeInTheDocument();
    });
  });
});
