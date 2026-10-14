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

    expect(getByText('Why Plan With VoyageRail?')).toBeTruthy();
    expect(getByText('Live Status')).toBeTruthy();
    expect(getByText('Eco Impact')).toBeTruthy();
    expect(getByText('Featured High-Speed Corridors')).toBeTruthy();

    const parisItems = getAllByText('Paris');
    expect(parisItems.length).toBeGreaterThan(0);
    fireEvent.press(parisItems[0]);

    expect(router.push).toHaveBeenCalledWith('/trains');
  });
});
