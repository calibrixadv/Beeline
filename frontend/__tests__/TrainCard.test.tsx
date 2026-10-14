import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TrainCard } from '../src/components/TrainCard';
import { TripProvider } from '../src/context/TripContext';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';

describe('TrainCard Component', () => {
  const mockOnPressDetails = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders train details correctly (operator, number, cities)', () => {
    const journey = SAMPLE_TRAINS[0]; // TGV INOUI 6612, Paris -> Lyon
    const { getByText } = render(
      <TripProvider>
        <TrainCard journey={journey} onPressDetails={mockOnPressDetails} />
      </TripProvider>
    );

    expect(getByText('TGV INOUI 6612')).toBeTruthy();
    expect(getByText('SNCF')).toBeTruthy();
    expect(getByText('Paris')).toBeTruthy();
    expect(getByText('Lyon')).toBeTruthy();
    expect(getByText('1h 56m')).toBeTruthy();
  });

  it('calls onPressDetails when Details button is pressed', () => {
    const journey = SAMPLE_TRAINS[0];
    const { getByText } = render(
      <TripProvider>
        <TrainCard journey={journey} onPressDetails={mockOnPressDetails} />
      </TripProvider>
    );

    const detailsBtn = getByText('Details');
    fireEvent.press(detailsBtn);

    expect(mockOnPressDetails).toHaveBeenCalledTimes(1);
    expect(mockOnPressDetails).toHaveBeenCalledWith(journey);
  });

  it('toggles to "In Trip" state when Plan button is clicked', () => {
    const journey = SAMPLE_TRAINS[0];
    const { getByText, queryByText } = render(
      <TripProvider>
        <TrainCard journey={journey} onPressDetails={mockOnPressDetails} />
      </TripProvider>
    );

    const planBtn = getByText('+ Plan');
    fireEvent.press(planBtn);

    expect(queryByText('In Trip')).toBeTruthy();
  });

  it('disables plan button for CANCELLED trains', () => {
    const cancelledJourney = SAMPLE_TRAINS.find((t) => t.status === 'CANCELLED')!;
    const { getByLabelText } = render(
      <TripProvider>
        <TrainCard journey={cancelledJourney} onPressDetails={mockOnPressDetails} />
      </TripProvider>
    );

    const cancelledBtn = getByLabelText('Cancelled train cannot be added');
    expect(cancelledBtn).toBeTruthy();
    expect(cancelledBtn.props.accessibilityState?.disabled).toBe(true);
  });
});
