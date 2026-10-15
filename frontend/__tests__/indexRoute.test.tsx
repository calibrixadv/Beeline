import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../app/index';
import { TripProvider } from '../src/context/TripContext';
import { useRouter } from 'expo-router';

describe('HomeScreen route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, hero card and explore button', () => {
    const router = useRouter();
    const { getByText } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    expect(getByText('Plan Your European Rail Journey')).toBeTruthy();
    expect(getByText('Explore /trains Route')).toBeTruthy();

    const exploreBtn = getByText('Explore /trains Route');
    fireEvent.press(exploreBtn);

    expect(router.push).toHaveBeenCalledWith('/trains');
  });

  it('renders features and popular corridor shortcuts', () => {
    const router = useRouter();
    const { getByText, getAllByText } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    expect(getByText('Why Plan With Beeline?')).toBeTruthy();
    expect(getByText('Live Status')).toBeTruthy();
    expect(getByText('Eco Impact')).toBeTruthy();
    expect(getByText('Featured High-Speed Corridors')).toBeTruthy();

    const parisItems = getAllByText('Paris');
    expect(parisItems.length).toBeGreaterThan(0);
    fireEvent.press(parisItems[0]);

    expect(router.push).toHaveBeenCalledWith('/trains');
  });

  it('fulfills Role 1: integrates RouteFinderCard shorthand with filters and STRICTLY NO REDIRECT on submit', () => {
    const router = useRouter();
    const { getByTestId, getByText } = render(
      <TripProvider>
        <HomeScreen />
      </TripProvider>
    );

    // Verify shorthand presence
    expect(getByTestId('home-route-finder-card')).toBeTruthy();
    expect(getByText('ROUTE SHORTHAND')).toBeTruthy();
    expect(getByTestId('mode-filter-trains')).toBeTruthy();
    expect(getByTestId('mode-filter-metro')).toBeTruthy();
    expect(getByTestId('mode-filter-busses')).toBeTruthy();

    // Verify origin and destination inputs
    const originInput = getByTestId('route-origin-input');
    const destInput = getByTestId('route-destination-input');
    fireEvent.changeText(originInput, 'Munich');
    fireEvent.changeText(destInput, 'Salzburg');

    // Submit route query
    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    // Verify prepared confirmation appears
    expect(getByTestId('route-submission-feedback')).toBeTruthy();
    expect(getByText('Munich ➔ Salzburg')).toBeTruthy();
    expect(getByText('Template mode: submission handled; feature redirection disabled.')).toBeTruthy();

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
    expect(getByText('300+ km/h High-Speed')).toBeTruthy();

    // Promotes cross-border European coverage
    expect(getByTestId('pillar-coverage-card')).toBeTruthy();
    expect(getByText('15+ European Countries')).toBeTruthy();

    // Promotes app capabilities
    expect(getByTestId('pillar-capabilities-card')).toBeTruthy();
    expect(getByText('Multi-Modal & Live Sync')).toBeTruthy();

    // Explicit restriction: strictly no map implementation
    expect(queryByTestId('map-view')).toBeNull();
    expect(queryByTestId('map-container')).toBeNull();
    const treeString = JSON.stringify(toJSON());
    expect(treeString).not.toContain('MapView');
    expect(treeString).not.toContain('react-native-maps');
  });
});
