import React, { useEffect, useRef } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MyTripScreen from '../app/my-trip';
import { TripProvider, useTripPlanner } from '../src/context/TripContext';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';
import { useRouter } from 'expo-router';

const MyTripWithData: React.FC = () => {
  const { addTrainToTrip } = useTripPlanner();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      addTrainToTrip(SAMPLE_TRAINS[0], 'STANDARD', '2026-10-15');
      addTrainToTrip(SAMPLE_TRAINS[1], 'FIRST', '2026-10-15');
    }
  }, [addTrainToTrip]);

  return <MyTripScreen />;
};

describe('MyTripScreen route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no trains in itinerary', () => {
    const router = useRouter();
    const { getByTestId, getByText } = render(
      <TripProvider>
        <MyTripScreen />
      </TripProvider>
    );

    expect(getByTestId('empty-trip-view')).toBeTruthy();
    expect(getByText('Your Itinerary is Empty')).toBeTruthy();

    const browseBtn = getByText('Browse Train Schedules');
    fireEvent.press(browseBtn);
    expect(router.push).toHaveBeenCalledWith('/trains');
  });

  it('renders itinerary list, overview card and allows clearing itinerary', () => {
    const { getByText, queryByText } = render(
      <TripProvider>
        <MyTripWithData />
      </TripProvider>
    );

    expect(getByText('Trip Itinerary Overview')).toBeTruthy();
    expect(getByText('Leg 1')).toBeTruthy();
    expect(getByText('TGV INOUI 6612')).toBeTruthy();
    expect(getByText('Leg 2')).toBeTruthy();
    expect(getByText('ICE 921')).toBeTruthy();

    // Click clear itinerary
    const clearBtn = getByText('Clear Itinerary');
    fireEvent.press(clearBtn);

    expect(queryByText('Leg 1')).toBeNull();
    expect(getByText('Your Itinerary is Empty')).toBeTruthy();
  });
});
