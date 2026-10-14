import React, { useEffect } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';
import { TripProvider, useTripPlanner } from '../src/context/TripContext';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';
import { useRouter } from 'expo-router';

// Helper component to add train into context
const TripBannerWrapper: React.FC<{ addTrain?: boolean }> = ({ addTrain }) => {
  const { addTrainToTrip } = useTripPlanner();

  useEffect(() => {
    if (addTrain) {
      addTrainToTrip(SAMPLE_TRAINS[0], 'STANDARD', '2026-10-15');
    }
  }, [addTrain, addTrainToTrip]);

  return <TripSummaryBanner />;
};

describe('TripSummaryBanner Component', () => {
  it('renders nothing when no trains are planned', () => {
    const { toJSON } = render(
      <TripProvider>
        <TripBannerWrapper addTrain={false} />
      </TripProvider>
    );
    expect(toJSON()).toBeNull();
  });

  it('renders summary banner when trains exist in itinerary', () => {
    const { getByText, getByTestId } = render(
      <TripProvider>
        <TripBannerWrapper addTrain={true} />
      </TripProvider>
    );

    expect(getByTestId('trip-summary-banner')).toBeTruthy();
    expect(getByText('1 Train Planned')).toBeTruthy();
    expect(getByText('Estimated Total: €49.00')).toBeTruthy();
  });

  it('navigates to /my-trip when View Itinerary is clicked', () => {
    const router = useRouter();
    const { getByText } = render(
      <TripProvider>
        <TripBannerWrapper addTrain={true} />
      </TripProvider>
    );

    const btn = getByText('View Itinerary');
    fireEvent.press(btn);

    expect(router.push).toHaveBeenCalledWith('/my-trip');
  });
});
