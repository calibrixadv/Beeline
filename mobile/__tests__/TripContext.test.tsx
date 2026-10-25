import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { TripProvider, useTripPlanner } from '../src/context/TripContext';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';

describe('TripContext & useTripPlanner', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TripProvider>{children}</TripProvider>
  );

  it('throws error when hook is used outside of TripProvider', () => {
    // Suppress console.error for expected thrown error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTripPlanner())).toThrow(
      'useTripPlanner must be used within a TripProvider'
    );
    spy.mockRestore();
  });

  it('initializes with empty trip list', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });
    expect(result.current.trips).toEqual([]);
    expect(result.current.getTripItemCount()).toBe(0);
    expect(result.current.getTripTotalCost()).toBe(0);
  });

  it('adds a valid train journey to trip and updates item count', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });
    const train = SAMPLE_TRAINS[0]; // TGV (fares: Standard 49, First 79, Business 115)

    act(() => {
      const added = result.current.addTrainToTrip(train, 'STANDARD', '2026-10-15');
      expect(added).toBe(true);
    });

    expect(result.current.getTripItemCount()).toBe(1);
    expect(result.current.isTrainInTrip(train.id)).toBe(true);
    expect(result.current.getTripTotalCost()).toBe(49);
  });

  it('calculates total cost correctly for selected class tier', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });
    const train = SAMPLE_TRAINS[0]; // TGV (First class = 79)

    act(() => {
      result.current.addTrainToTrip(train, 'FIRST', '2026-10-15');
    });

    expect(result.current.getTripTotalCost()).toBe(79);
  });

  it('prevents adding CANCELLED trains (strict restriction)', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });
    const cancelledTrain = SAMPLE_TRAINS.find((t) => t.status === 'CANCELLED')!;

    let added = true;
    act(() => {
      added = result.current.addTrainToTrip(cancelledTrain, 'STANDARD', '2026-10-15');
    });

    expect(added).toBe(false);
    expect(result.current.getTripItemCount()).toBe(0);
    expect(result.current.isTrainInTrip(cancelledTrain.id)).toBe(false);
  });

  it('avoids adding duplicate train on the same travel date with same class', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });
    const train = SAMPLE_TRAINS[0];

    act(() => {
      result.current.addTrainToTrip(train, 'STANDARD', '2026-10-15');
    });
    expect(result.current.getTripItemCount()).toBe(1);

    act(() => {
      const secondAdd = result.current.addTrainToTrip(train, 'STANDARD', '2026-10-15');
      expect(secondAdd).toBe(false);
    });
    expect(result.current.getTripItemCount()).toBe(1);
  });

  it('removes train journey from trip', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });
    const train = SAMPLE_TRAINS[0];

    act(() => {
      result.current.addTrainToTrip(train, 'STANDARD', '2026-10-15');
    });

    const tripItemId = result.current.trips[0].id;

    act(() => {
      result.current.removeTrainFromTrip(tripItemId);
    });

    expect(result.current.getTripItemCount()).toBe(0);
    expect(result.current.isTrainInTrip(train.id)).toBe(false);
    expect(result.current.getTripTotalCost()).toBe(0);
  });

  it('clears all trips when clearTrip is called', () => {
    const { result } = renderHook(() => useTripPlanner(), { wrapper });

    act(() => {
      result.current.addTrainToTrip(SAMPLE_TRAINS[0], 'STANDARD', '2026-10-15');
      result.current.addTrainToTrip(SAMPLE_TRAINS[1], 'STANDARD', '2026-10-15');
    });

    expect(result.current.getTripItemCount()).toBe(2);

    act(() => {
      result.current.clearTrip();
    });

    expect(result.current.getTripItemCount()).toBe(0);
    expect(result.current.trips).toEqual([]);
  });
});
