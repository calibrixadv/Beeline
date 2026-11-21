'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { TrainClass, TrainJourney } from '../types/train';
import { TripContextType, TripItem } from '../types/trip';
import { useAuth } from './AuthContext';
import { apiClient } from '../services/apiClient';
import {
  convertRoutePlanToTrainJourney,
  convertTrainJourneyToRoutePlan,
} from '../services/tripBookingService';
import { isTrainDeparted } from '../utils/departureTime';
import {
  getJourneyFingerprint,
  getTripItemFingerprint,
} from '../utils/tripFingerprint';

const TripContext = createContext<TripContextType | undefined>(undefined);

export const SESSION_STORAGE_KEY = 'beeline_session_trips_v1';
export const LEGACY_STORAGE_KEY = 'beeline_user_trips';

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  let user: any = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch {
    // Outside AuthProvider in standalone unit tests
  }

  const [trips, setTrips] = useState<TripItem[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const lastMergedUserIdRef = useRef<string | null>(null);

  // 1. Initial hydration and legacy localStorage cleanup
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}

    // If unauthenticated on mount, hydrate anonymous trips from sessionStorage
    if (!user || user.is_guest) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const seen = new Set<string>();
              const deduped: TripItem[] = [];
              for (const item of parsed) {
                const fp = getTripItemFingerprint(item);
                if (!seen.has(fp)) {
                  seen.add(fp);
                  deduped.push({
                    ...item,
                    alertMuted: typeof item.alertMuted === 'boolean' ? item.alertMuted : false,
                    alertLeadMinutes: item.alertLeadMinutes || 30,
                  });
                }
              }
              setTrips(deduped);
            }
          }
        }
      } catch {}
    }

    setIsHydrated(true);
  }, []);

  // 2. Exact 4-Case Auth Merge Matrix when user logs in / transitions auth state
  useEffect(() => {
    const isAuthenticated = Boolean(user && !user.is_guest);

    // Logout Transition: clear in-memory trips and do NOT leak account trips into sessionStorage
    if (!isAuthenticated) {
      if (lastMergedUserIdRef.current !== null) {
        lastMergedUserIdRef.current = null;
        setTrips([]);
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } catch {}
      }
      return;
    }

    // Already merged for this user
    if (lastMergedUserIdRef.current === user.id) {
      return;
    }
    lastMergedUserIdRef.current = user.id;

    let isCancelled = false;

    const performAuthMerge = async () => {
      // Step A: Fetch persisted account trips via GET /api/v1/routes/saved
      let rawSaved: any = [];
      try {
        rawSaved = await apiClient.getSavedRoutes();
      } catch (err) {
        rawSaved = [];
      }
      if (isCancelled) return;

      const savedList = Array.isArray(rawSaved)
        ? rawSaved
        : Array.isArray(rawSaved?.data)
        ? rawSaved.data
        : [];

      const accountTrips: TripItem[] = [];
      for (const sr of savedList) {
        if (sr?.plan) {
          try {
            const journey = convertRoutePlanToTrainJourney(sr.plan);
            const travelDate = sr.plan.departureTime
              ? sr.plan.departureTime.slice(0, 10)
              : sr.plan.date || '2026-10-15';
            accountTrips.push({
              id: `saved-${sr.id}`,
              savedRouteId: sr.id,
              journey,
              selectedClass: 'STANDARD',
              travelDate,
              addedAt: sr.created_at || new Date().toISOString(),
              notes: sr.notes,
              alertMuted: typeof sr.alertMuted === 'boolean' ? sr.alertMuted : false,
              alertLeadMinutes: sr.alertLeadMinutes || 30,
              curatedPillars: sr.plan?.curatedPillars || (sr.plan?.curatedPillar ? [sr.plan.curatedPillar] : []),
              curatedPillar: sr.plan?.curatedPillar,
            });
          } catch {}
        }
      }

      // Step B: Read current anonymous sessionStorage trips
      let sessionTrips: TripItem[] = [];
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              sessionTrips = parsed;
            }
          }
        }
      } catch {}

      // Fallback: If sessionStorage was empty, check in-memory unpersisted trips
      if (
        sessionTrips.length === 0 &&
        trips.length > 0 &&
        !trips.some((t) => t.savedRouteId || t.id.startsWith('saved-'))
      ) {
        sessionTrips = [...trips];
      }

      // Step C: Apply exact 4-Case Merge Matrix
      if (sessionTrips.length > 0 && accountTrips.length > 0) {
        // Case 1: Both non-empty -> persist session trips not in account, merge deduplicated
        const accountFingerprints = new Set(accountTrips.map(getTripItemFingerprint));
        const newlyPersisted: TripItem[] = [];

        for (const sTrip of sessionTrips) {
          const fp = getTripItemFingerprint(sTrip);
          if (!accountFingerprints.has(fp)) {
            accountFingerprints.add(fp);
            try {
              const plan = convertTrainJourneyToRoutePlan(sTrip.journey, sTrip.travelDate);
              const saved = await apiClient.saveRoute(plan);
              if (sTrip.alertMuted !== undefined || sTrip.alertLeadMinutes !== undefined) {
                try {
                  await apiClient.updateSavedRouteAlerts(saved.id, {
                    alertMuted: sTrip.alertMuted,
                    alertLeadMinutes: sTrip.alertLeadMinutes,
                  });
                } catch {}
              }
              newlyPersisted.push({
                ...sTrip,
                id: `saved-${saved.id}`,
                savedRouteId: saved.id,
                addedAt: saved.created_at || sTrip.addedAt,
                alertMuted: sTrip.alertMuted ?? false,
                alertLeadMinutes: sTrip.alertLeadMinutes ?? 30,
              });
            } catch (err) {
              console.error('Failed to persist session trip during merge:', err);
            }
          }
        }

        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } catch {}

        if (!isCancelled) {
          setTrips([...accountTrips, ...newlyPersisted]);
        }
      } else if (sessionTrips.length > 0 && accountTrips.length === 0) {
        // Case 2: Session non-empty, Account empty -> persist unique session trips to account
        const seenFps = new Set<string>();
        const newlyPersisted: TripItem[] = [];

        for (const sTrip of sessionTrips) {
          const fp = getTripItemFingerprint(sTrip);
          if (!seenFps.has(fp)) {
            seenFps.add(fp);
            try {
              const plan = convertTrainJourneyToRoutePlan(sTrip.journey, sTrip.travelDate);
              const saved = await apiClient.saveRoute(plan);
              if (sTrip.alertMuted !== undefined || sTrip.alertLeadMinutes !== undefined) {
                try {
                  await apiClient.updateSavedRouteAlerts(saved.id, {
                    alertMuted: sTrip.alertMuted,
                    alertLeadMinutes: sTrip.alertLeadMinutes,
                  });
                } catch {}
              }
              newlyPersisted.push({
                ...sTrip,
                id: `saved-${saved.id}`,
                savedRouteId: saved.id,
                addedAt: saved.created_at || sTrip.addedAt,
                alertMuted: sTrip.alertMuted ?? false,
                alertLeadMinutes: sTrip.alertLeadMinutes ?? 30,
              });
            } catch (err) {
              console.error('Failed to persist session trip to empty account:', err);
            }
          }
        }

        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } catch {}

        if (!isCancelled) {
          setTrips(newlyPersisted);
        }
      } else if (sessionTrips.length === 0 && accountTrips.length > 0) {
        // Case 3: Session empty, Account non-empty -> keep account trips untouched
        if (!isCancelled) {
          setTrips(accountTrips);
        }
      } else {
        // Case 4: Both empty -> keep itinerary cleanly empty
        if (!isCancelled) {
          setTrips([]);
        }
      }
    };

    performAuthMerge();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, user?.is_guest]);

  // 3. Persist anonymous trips strictly to sessionStorage (never leak account trips)
  useEffect(() => {
    if (!isHydrated) return;
    const isAuthenticated = Boolean(user && !user.is_guest);
    if (!isAuthenticated) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          if (trips.length > 0) {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trips));
          } else {
            window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch {}
    }
  }, [trips, isHydrated, user?.id, user?.is_guest]);

  // 4. Add trip with immediate canonical fingerprint deduplication & backend sync
  const addTrainToTrip = useCallback(
    (
      journey: TrainJourney,
      selectedClass: TrainClass = 'STANDARD',
      travelDate?: string
    ): boolean => {
      // Cannot book cancelled trains
      if (journey.status === 'CANCELLED') {
        return false;
      }

      const effectiveDate =
        travelDate ||
        (journey.departureTime
          ? journey.departureTime.slice(0, 10)
          : new Date().toISOString().slice(0, 10));

      // Cannot book departed trains
      if (isTrainDeparted(journey.departureTime, effectiveDate)) {
        return false;
      }

      const incomingFp = getJourneyFingerprint(journey, effectiveDate);
      const alreadyExists = trips.some((item) => getTripItemFingerprint(item) === incomingFp);
      if (alreadyExists) {
        return false;
      }

      const tempId = `trip-${journey.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newItem: TripItem = {
        id: tempId,
        journey,
        selectedClass,
        travelDate: effectiveDate,
        addedAt: new Date().toISOString(),
        alertMuted: false,
        alertLeadMinutes: 30,
        curatedPillars: (journey as any).curatedPillars,
        curatedPillar: (journey as any).curatedPillar,
        legs: (journey as any).legs,
        transfersCount: (journey as any).transfersCount,
        transfers: (journey as any).transfers,
      };

      setTrips((prev) => {
        if (prev.some((item) => getTripItemFingerprint(item) === incomingFp)) {
          return prev;
        }
        return [...prev, newItem];
      });

      // If user is authenticated, sync immediately with POST /api/v1/routes/saved
      const isAuthenticated = Boolean(user && !user.is_guest);
      if (isAuthenticated) {
        try {
          const plan = convertTrainJourneyToRoutePlan(journey, effectiveDate);
          apiClient
            .saveRoute(plan)
            .then((saved) => {
              if (saved?.id) {
                setTrips((prev) =>
                  prev.map((item) =>
                    item.id === tempId
                      ? {
                          ...item,
                          id: `saved-${saved.id}`,
                          savedRouteId: saved.id,
                          addedAt: saved.created_at || item.addedAt,
                        }
                      : item
                  )
                );
              }
            })
            .catch((err) => {
              console.error('Failed to sync added trip to backend saved routes:', err);
            });
        } catch (err) {
          console.error('Failed to prepare plan for saved routes:', err);
        }
      }

      return true;
    },
    [user?.id, user?.is_guest]
  );

  const addTrip = useCallback(
    (
      journeyOrItem: TrainJourney | TripItem,
      selectedClass?: TrainClass,
      travelDate?: string
    ): boolean => {
      if ('journey' in journeyOrItem && journeyOrItem.journey) {
        return addTrainToTrip(
          journeyOrItem.journey,
          journeyOrItem.selectedClass || selectedClass,
          journeyOrItem.travelDate || travelDate
        );
      }
      return addTrainToTrip(journeyOrItem as TrainJourney, selectedClass, travelDate);
    },
    [addTrainToTrip]
  );

  // 5. Remove trip with backend sync for authenticated users
  const removeTrainFromTrip = useCallback(
    (tripItemId: string) => {
      let removedItem: TripItem | undefined;
      setTrips((prev) => {
        removedItem = prev.find((item) => item.id === tripItemId);
        return prev.filter((item) => item.id !== tripItemId);
      });

      const isAuthenticated = Boolean(user && !user.is_guest);
      if (isAuthenticated) {
        const routeId =
          removedItem?.savedRouteId ||
          (tripItemId.startsWith('saved-') ? tripItemId.slice(6) : null);
        if (routeId) {
          apiClient
            .deleteSavedRoute(routeId)
            .catch((err) => console.error('Failed to delete saved route from backend:', err));
        }
      }
    },
    [user?.id, user?.is_guest]
  );

  const isTrainInTrip = useCallback(
    (trainId: string): boolean => {
      return trips.some((item) => item.journey.id === trainId);
    },
    [trips]
  );

  const clearTrip = useCallback(() => {
    setTrips([]);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {}
  }, []);

  const updateTripAlertSettings = useCallback(
    async (
      tripId: string,
      settings: { alertMuted?: boolean; alertLeadMinutes?: 5 | 10 | 30 | 60 }
    ) => {
      let savedRouteIdToSync: string | null = null;

      setTrips((prev) => {
        const next = prev.map((item) => {
          if (item.id === tripId) {
            savedRouteIdToSync =
              item.savedRouteId ||
              (tripId.startsWith('saved-') ? tripId.slice(6) : null);
            return { ...item, ...settings };
          }
          return item;
        });

        // If logged out / guest, ensure updated trip is persisted immediately to sessionStorage
        const isAuthenticated = Boolean(user && !user.is_guest);
        if (!isAuthenticated) {
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
            }
          } catch {}
        }

        return next;
      });

      // If authenticated (with persisted savedRouteId), persist via apiClient.updateSavedRouteAlerts
      const isAuthenticated = Boolean(user && !user.is_guest);
      if (isAuthenticated && savedRouteIdToSync) {
        try {
          await apiClient.updateSavedRouteAlerts(savedRouteIdToSync, settings);
        } catch (err) {
          console.error('Failed to update saved route alert settings on backend:', err);
        }
      }
    },
    [user?.id, user?.is_guest]
  );

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
    return trips.reduce(
      (sum, item) => sum + Math.round((item.journey.carbonFootprintKg || 12) * 5),
      0
    );
  }, [trips]);

  const getTripTotalCost = useCallback(() => totalCost, [totalCost]);
  const getTripItemCount = useCallback(() => trips.length, [trips.length]);

  const value = useMemo<TripContextType>(
    () => ({
      trips,
      addTrainToTrip,
      addTrip,
      removeTrainFromTrip,
      updateTripAlertSettings,
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
      addTrip,
      removeTrainFromTrip,
      updateTripAlertSettings,
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
