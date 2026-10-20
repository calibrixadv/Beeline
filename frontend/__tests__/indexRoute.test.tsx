import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import HomeScreen from '../app/index';
import { TripProvider } from '../src/context/TripContext';
import { ScreenTransitionProvider, useScreenTransition } from '../src/context/ScreenTransitionContext';
import { getCorridorTestId } from '../src/components/MarketingShowcase';
import { useRouter } from 'expo-router';

describe('HomeScreen route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, hero card and explore button with transition message', () => {
    const router = useRouter();
    const TransitionStatusWatcher: React.FC = () => {
      const { transitionMessage } = useScreenTransition();
      return <Text testID="active-transition-msg">{transitionMessage}</Text>;
    };

    const { getByText, getByTestId } = render(
      <ScreenTransitionProvider defaultDurationMs={100}>
        <TripProvider>
          <TransitionStatusWatcher />
          <HomeScreen />
        </TripProvider>
      </ScreenTransitionProvider>
    );

    expect(getByText('Plan your European rail journey')).toBeTruthy();
    expect(getByText('Explore Trains')).toBeTruthy();

    const exploreBtn = getByText('Explore Trains');
    fireEvent.press(exploreBtn);

    expect(getByTestId('active-transition-msg').props.children).toBe(
      'Exploring train routes...'
    );
    expect(router.push).toHaveBeenCalledWith('/trains');
  });

  it('renders companion pillars and popular Romanian corridor cards as static informative guides', () => {
    const { getByText, getAllByText, getByTestId } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    expect(getByText('Why Beeline?')).toBeTruthy();
    expect(getByText('Direct Rail Connections')).toBeTruthy();
    expect(getByText('Clear Fares & Schedules')).toBeTruthy();
    expect(getByText('Protected Transfer Buffers')).toBeTruthy();
    expect(getByText('Featured Corridors')).toBeTruthy();

    const bucurestiItems = getAllByText('București Nord');
    expect(bucurestiItems.length).toBeGreaterThan(0);

    const corridorCard = getByTestId(getCorridorTestId('București Nord', 'Brașov'));
    expect(corridorCard).toBeTruthy();
    expect(corridorCard.props.accessibilityRole).toBeUndefined();
  });

  it('fulfills Role 1: integrates RouteFinderCard shorthand with filters, Trifecta preview, and STRICTLY NO REDIRECT on submit', () => {
    const router = useRouter();
    const { getByTestId, getByText } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    // Verify shorthand presence
    expect(getByTestId('home-route-finder-card')).toBeTruthy();
    expect(getByTestId('route-waggle-connector')).toBeTruthy();
    expect(getByText('ROUTE SHORTHAND')).toBeTruthy();
    expect(getByTestId('mode-filter-trains')).toBeTruthy();
    expect(getByTestId('mode-filter-metro')).toBeTruthy();
    expect(getByTestId('mode-filter-busses')).toBeTruthy();

    // Verify default Romanian hub stations
    const originInput = getByTestId('route-origin-input');
    const destInput = getByTestId('route-destination-input');
    expect(originInput.props.value).toBe('București Nord');
    expect(destInput.props.value).toBe('Brașov');

    // Submit route query with default stations
    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    // Verify prepared confirmation and Curated Trifecta preview appears with companion mascots
    expect(getByTestId('route-submission-feedback')).toBeTruthy();
    expect(getByText('București Nord ➔ Brașov')).toBeTruthy();
    expect(getByText('Template mode: submission handled; feature redirection disabled.')).toBeTruthy();

    const fastestCard = getByTestId('trifecta-card-fastest');
    expect(within(fastestCard).getByTestId('mascot-bee-barnaby')).toBeTruthy();
    const bestValueCard = getByTestId('trifecta-card-best-value');
    expect(within(bestValueCard).getByTestId('mascot-bee-honey')).toBeTruthy();
    const mostReliableCard = getByTestId('trifecta-card-most-reliable');
    expect(within(mostReliableCard).getByTestId('mascot-bee-bumble')).toBeTruthy();

    // STRICT INVARIANT: feature redirection is disabled
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('fulfills Role 2: promotes Beeline speed, coverage, and capabilities with STRICTLY NO MAP', () => {
    const { getByTestId, getByText, queryByTestId, toJSON } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    // Marketing showcase presence
    expect(getByTestId('home-marketing-showcase')).toBeTruthy();

    // Promotes speed
    expect(getByTestId('pillar-speed-card')).toBeTruthy();
    expect(getByText('Direct Rail Connections')).toBeTruthy();

    // Promotes value
    expect(getByTestId('pillar-coverage-card')).toBeTruthy();
    expect(getByText('Clear Fares & Schedules')).toBeTruthy();

    // Promotes reliability
    expect(getByTestId('pillar-capabilities-card')).toBeTruthy();
    expect(getByText('Protected Transfer Buffers')).toBeTruthy();

    // Explicit restriction: strictly no map implementation
    expect(queryByTestId('map-view')).toBeNull();
    expect(queryByTestId('map-container')).toBeNull();
    const treeString = JSON.stringify(toJSON());
    expect(treeString).not.toContain('MapView');
    expect(treeString).not.toContain('react-native-maps');
  });

  it('renders CozyHoneyBackground ambient container and harmonized warm honey layout', () => {
    const { getByTestId } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    const cozyBackground = getByTestId('home-cozy-background');
    expect(cozyBackground).toBeTruthy();
    expect(getByTestId('home-route-finder-card')).toBeTruthy();
    expect(getByTestId('home-marketing-showcase')).toBeTruthy();
  });

  it('harmonizes active trip banner with warm honey palette and navigates to /my-trip', () => {
    const router = useRouter();
    const { SAMPLE_TRAINS } = require('../src/data/sampleTrains');
    const TransitionStatusWatcher: React.FC = () => {
      const { transitionMessage } = useScreenTransition();
      return <Text testID="trip-transition-msg">{transitionMessage}</Text>;
    };
    const TestTripWrapper: React.FC = () => {
      const { addTrainToTrip } = require('../src/context/TripContext').useTripPlanner();
      React.useEffect(() => {
        addTrainToTrip(SAMPLE_TRAINS[0], 'STANDARD');
      }, [addTrainToTrip]);

      return (
        <>
          <TransitionStatusWatcher />
          <HomeScreen />
        </>
      );
    };

    const { getByTestId, getByText } = render(
      <ScreenTransitionProvider defaultDurationMs={100}>
        <TripProvider>
          <TestTripWrapper />
        </TripProvider>
      </ScreenTransitionProvider>
    );

    const tripBanner = getByTestId('home-active-trip-banner');
    expect(tripBanner).toBeTruthy();
    expect(getByText('Active Trip in Progress')).toBeTruthy();
    expect(getByText('1 train journey currently selected')).toBeTruthy();

    fireEvent.press(tripBanner);
    expect(getByTestId('trip-transition-msg').props.children).toBe(
      'Buzzing to your active trip itinerary...'
    );
    expect(router.push).toHaveBeenCalledWith('/my-trip');
  });
});
