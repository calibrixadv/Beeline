import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { TrainClass, TrainJourney } from '../types/train';
import { TripContextType, TripItem } from '../types/trip';

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<TripItem[]>([]);

  const addTrainToTrip = useCallback(
    (
      journey: TrainJourney,
      selectedClass: TrainClass = 'STANDARD',
      travelDate: string = '2026-10-15'
    ): boolean => {
      // Strict restriction: Cannot book cancelled trains
      if (journey.status === 'CANCELLED') {
        return false;
      }

      let added = false;
      setTrips((prev) => {
        // Avoid duplicate leg on the same travel date with same class
        const exists = prev.some(
          (item) =>
            item.journey.id === journey.id &&
            item.selectedClass === selectedClass &&
            item.travelDate === travelDate
        );
        if (exists) {
          return prev;
        }

        added = true;
        const newItem: TripItem = {
          id: `trip-${journey.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          journey,
          selectedClass,
          travelDate,
          addedAt: new Date().toISOString(),
        };
        return [...prev, newItem];
      });

      return added;
    },
    []
  );

  const removeTrainFromTrip = useCallback((tripItemId: string) => {
    setTrips((prev) => prev.filter((item) => item.id !== tripItemId));
  }, []);

  const isTrainInTrip = useCallback(
    (trainId: string): boolean => {
      return trips.some((item) => item.journey.id === trainId);
    },
    [trips]
  );

  const clearTrip = useCallback(() => {
    setTrips([]);
  }, []);

  const getTripTotalCost = useCallback((): number => {
    return trips.reduce((acc, item) => {
      const fare = item.journey.fares.find((f) => f.classType === item.selectedClass);
      const cost = fare ? fare.price : (item.journey.fares[0]?.price ?? 0);
      return acc + cost;
    }, 0);
  }, [trips]);

  const getTripItemCount = useCallback((): number => trips.length, [trips.length]);

  const contextValue = useMemo<TripContextType>(
    () => ({
      trips,
      addTrainToTrip,
      removeTrainFromTrip,
      isTrainInTrip,
      clearTrip,
      getTripTotalCost,
      getTripItemCount,
    }),
    [
      trips,
      addTrainToTrip,
      removeTrainFromTrip,
      isTrainInTrip,
      clearTrip,
      getTripTotalCost,
      getTripItemCount,
    ]
  );

  return <TripContext.Provider value={contextValue}>{children}</TripContext.Provider>;
};

export const useTripPlanner = (): TripContextType => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTripPlanner must be used within a TripProvider');
  }
  return context;
};
