import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TrainDetailModal } from '../src/components/TrainDetailModal';
import { TripProvider } from '../src/context/TripContext';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';

describe('TrainDetailModal Component', () => {
  const mockOnClose = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when journey is null', () => {
    const { toJSON } = render(
      <TripProvider>
        <TrainDetailModal journey={null} visible={true} onClose={mockOnClose} />
      </TripProvider>
    );
    expect(toJSON()).toBeNull();
  });

  it('renders journey details and intermediate stops', () => {
    const journey = SAMPLE_TRAINS[0]; // Paris -> Le Creusot -> Lyon
    const { getByText } = render(
      <TripProvider>
        <TrainDetailModal journey={journey} visible={true} onClose={mockOnClose} />
      </TripProvider>
    );

    expect(getByText('TGV INOUI 6612')).toBeTruthy();
    expect(getByText('SNCF')).toBeTruthy();
    expect(getByText('Le Creusot')).toBeTruthy();
    expect(getByText('Lyon')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const journey = SAMPLE_TRAINS[0];
    const { getByLabelText } = render(
      <TripProvider>
        <TrainDetailModal journey={journey} visible={true} onClose={mockOnClose} />
      </TripProvider>
    );

    const closeBtn = getByLabelText('Close train details');
    fireEvent.press(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('allows selecting specific fare tier and adds to trip', () => {
    const journey = SAMPLE_TRAINS[0];
    const { getByLabelText, getByText } = render(
      <TripProvider>
        <TrainDetailModal journey={journey} visible={true} onClose={mockOnClose} />
      </TripProvider>
    );

    const selectFirstBtn = getByLabelText('Select FIRST class for €79.00');
    fireEvent.press(selectFirstBtn);

    expect(getByText('Added to Itinerary')).toBeTruthy();
  });
});
