import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripsScreen from '../app/trips';
import { TripProvider } from '../src/context/TripContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ScreenTransitionProvider } from '../src/context/ScreenTransitionContext';
import { useLocalSearchParams } from 'expo-router';

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

const renderTripsScreen = () => {
  return render(
    <ThemeProvider>
      <TripProvider>
        <ScreenTransitionProvider>
          <TripsScreen />
        </ScreenTransitionProvider>
      </TripProvider>
    </ThemeProvider>
  );
};

describe('TripsScreen route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it('renders default route parameters, search box, swap button, and matrix ribbon', () => {
    const { getByTestId, getByText } = renderTripsScreen();

    expect(getByTestId('trips-screen')).toBeTruthy();
    expect(getByTestId('trips-search-box')).toBeTruthy();
    expect(getByText('MULTI-MODAL BOOKING')).toBeTruthy();

    const originInput = getByTestId('trips-origin-input');
    const destinationInput = getByTestId('trips-destination-input');
    expect(originInput.props.value).toBe('București Nord');
    expect(destinationInput.props.value).toBe('Brașov');

    expect(getByTestId('trips-swap-btn')).toBeTruthy();
    expect(getByTestId('trips-search-btn')).toBeTruthy();
    expect(getByTestId('trips-matrix-ribbon')).toBeTruthy();
    expect(getByTestId('matrix-cheapest-price')).toBeTruthy();
    expect(getByTestId('matrix-fastest-duration')).toBeTruthy();
    expect(getByTestId('matrix-most-shielded')).toBeTruthy();
  });

  it('pre-fills origin, destination, and pillar from URL search parameters', () => {
    mockUseLocalSearchParams.mockReturnValue({
      origin: encodeURIComponent('Micro 19, Galați'),
      destination: encodeURIComponent('Piața Unirii, București'),
      pillar: 'MOST_RELIABLE',
    });

    const { getByTestId, getByText } = renderTripsScreen();

    const originInput = getByTestId('trips-origin-input');
    const destinationInput = getByTestId('trips-destination-input');
    expect(originInput.props.value).toBe('Micro 19, Galați');
    expect(destinationInput.props.value).toBe('Piața Unirii, București');

    // Filter bar should show 1 active filter count
    expect(getByText(/Reset Filters/)).toBeTruthy();
  });

  it('swaps origin and destination when swap button is pressed', () => {
    const { getByTestId } = renderTripsScreen();

    const originInput = getByTestId('trips-origin-input');
    const destinationInput = getByTestId('trips-destination-input');
    const swapBtn = getByTestId('trips-swap-btn');

    expect(originInput.props.value).toBe('București Nord');
    expect(destinationInput.props.value).toBe('Brașov');

    fireEvent.press(swapBtn);

    expect(originInput.props.value).toBe('Brașov');
    expect(destinationInput.props.value).toBe('București Nord');
  });

  it('selects quick corridor and updates search inputs', () => {
    const { getByTestId } = renderTripsScreen();

    const corridorBtn = getByTestId('quick-corridor-galati-bucuresti');
    fireEvent.press(corridorBtn);

    const originInput = getByTestId('trips-origin-input');
    const destinationInput = getByTestId('trips-destination-input');
    expect(originInput.props.value).toBe('Micro 19, Galați');
    expect(destinationInput.props.value).toBe('Piața Unirii, București');
  });

  it('books trip option into TripContext and shows sticky TripSummaryBanner', () => {
    const { getByTestId, queryByTestId, getByText } = renderTripsScreen();

    // Summary banner should be hidden initially
    expect(queryByTestId('trip-summary-banner')).toBeNull();

    // Press book trip on first option
    const bookBtn = getByTestId('book-trip-btn-itinerary-buc-brasov-direct-002');
    expect(bookBtn).toBeTruthy();
    fireEvent.press(bookBtn);

    // Itinerary banner should now be visible
    expect(getByTestId('trip-summary-banner')).toBeTruthy();
    expect(getByText('1 Train Planned')).toBeTruthy();

    // Button should now indicate In Trip ✓
    expect(getByTestId('remove-trip-btn-itinerary-buc-brasov-direct-002')).toBeTruthy();
    expect(getByText('In Trip ✓')).toBeTruthy();
  });

  it('enforces STRICT INVARIANT: ZERO map on the trips screen', () => {
    const { queryByTestId, toJSON } = renderTripsScreen();

    expect(queryByTestId('map-view')).toBeNull();
    expect(queryByTestId('map-container')).toBeNull();
    const treeString = JSON.stringify(toJSON());
    expect(treeString).not.toContain('MapView');
    expect(treeString).not.toContain('react-native-maps');
  });
});
