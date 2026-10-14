import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TrainsScreen from '../app/trains';
import { TripProvider } from '../src/context/TripContext';

describe('/trains route integration', () => {
  it('renders train schedules list with header count', () => {
    const { getByText, getByPlaceholderText } = render(
      <TripProvider>
        <TrainsScreen />
      </TripProvider>
    );

    expect(getByText('Showing 10 of 10 train journeys')).toBeTruthy();
    expect(getByPlaceholderText('Search train, city or operator...')).toBeTruthy();
    expect(getByText('TGV INOUI 6612')).toBeTruthy();
  });

  it('filters train list when searching for a city', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <TripProvider>
        <TrainsScreen />
      </TripProvider>
    );

    const input = getByPlaceholderText('Search train, city or operator...');
    fireEvent.changeText(input, 'Munich');

    expect(getByText('ICE 921')).toBeTruthy();
    expect(queryByText('TGV INOUI 6612')).toBeNull();
  });

  it('displays empty state when no trains match filter and allows reset', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <TripProvider>
        <TrainsScreen />
      </TripProvider>
    );

    const input = getByPlaceholderText('Search train, city or operator...');
    fireEvent.changeText(input, 'NonExistentCityXYZ');

    expect(getByTestId('empty-trains-container')).toBeTruthy();
    expect(getByText('No Trains Found')).toBeTruthy();

    const resetBtn = getByText('Reset Filters');
    fireEvent.press(resetBtn);

    expect(getByText('Showing 10 of 10 train journeys')).toBeTruthy();
  });

  it('opens detail modal on pressing Details', () => {
    const { getAllByText, getByText } = render(
      <TripProvider>
        <TrainsScreen />
      </TripProvider>
    );

    const detailsButtons = getAllByText('Details');
    fireEvent.press(detailsButtons[0]);

    expect(getByText('Itinerary & Stops')).toBeTruthy();
    expect(getByText('Onboard Amenities')).toBeTruthy();
  });
});
