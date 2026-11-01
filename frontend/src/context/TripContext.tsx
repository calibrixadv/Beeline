'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { TrainClass, TrainJourney } from '../types/train';
import { TripContextType, TripItem } from '../types/trip';

const TripContext = createContext<TripContextType | undefined>(undefined);

const STORAGE_KEY = 'beeline_user_trips';

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTrips(JSON.parse(stored));
        }
      }
    } catch {}
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever trips change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      }
    } catch {}
  }, [trips, isHydrated]);

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

  const totalCost = useMemo(() => {
    return trips.reduce((sum, item) => {
      const fare = item.journey.fares.find((f) => f.classType === item.selectedClass);
      return sum + (fare?.price || 0);
    }, 0);
  }, [trips]);

  const totalDurationMinutes = useMemo(() => {
    return trips.reduce((sum, item) => sum + item.journey.durationMinutes, 0);
  }, [trips]);

  const totalCo2Kg = useMemo(() => {
    return trips.reduce((sum, item) => sum + (item.journey.carbonFootprintKg || 0), 0);
  }, [trips]);

  const totalCo2SavedKg = useMemo(() => {
    return trips.reduce((sum, item) => sum + Math.round((item.journey.carbonFootprintKg || 12) * 5), 0);
  }, [trips]);

  const getTripTotalCost = useCallback(() => totalCost, [totalCost]);
  const getTripItemCount = useCallback(() => trips.length, [trips.length]);

  const value = useMemo<TripContextType>(
    () => ({
      trips,
      addTrainToTrip,
      removeTrainFromTrip,
      isTrainInTrip,
      clearTrip,
      getTripTotalCost,
      getTripItemCount,
      totalCost,
      totalDurationMinutes,
      totalCo2Kg,
      totalCo2SavedKg,
    }),
    [
      trips,
      addTrainToTrip,
      removeTrainFromTrip,
      isTrainInTrip,
      clearTrip,
      getTripTotalCost,
      getTripItemCount,
      totalCost,
      totalDurationMinutes,
      totalCo2Kg,
      totalCo2SavedKg,
    ]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

export const useTrip = (): TripContextType => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};
