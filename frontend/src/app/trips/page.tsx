'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftRight, 
  MapPin, 
  Search, 
  Zap, 
  Coins, 
  ShieldCheck, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Train
} from 'lucide-react';
import { 
  filterAndSortTrips, 
  convertRoutePlanToTrainJourney,
  fetchDayTripsFromBackend,
  DEFAULT_TRIP_FILTERS,
  TripFilterState,
  TripFetchStatus
} from '../../services/tripBookingService';
import { TransitRoutePlan, CuratedPillar } from '../../types/routePlan';
import { StationAutocompleteItem } from '../../types/station';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { isTrainDeparted } from '../../utils/departureTime';
import { buildOfficialTicketUrl } from '../../utils/officialTicketUrl';
import BaseCard from '../../components/BaseCard';
import BaseButton from '../../components/BaseButton';
import StationAutocompleteInput from '../../components/StationAutocompleteInput';
import BookingTripCard from '../../components/BookingTripCard';
import TripFilterBar from '../../components/TripFilterBar';
import MascotBee, { MascotGear } from '../../components/MascotBee';
import TripsGhostSkeleton from '../../components/TripsGhostSkeleton';
import MascotDebugModal from '../../components/MascotDebugModal';
import AmbientPageMascot from '../../components/AmbientPageMascot';

export const DEFAULT_TRIPS_ORIGIN = 'București Nord';
export const DEFAULT_TRIPS_DESTINATION = 'Brașov';

const DEPARTURE_PRESETS = ['Now', '08:00 AM', '12:00 PM', '16:00 PM'];
const POPULAR_CORRIDORS = [
  { origin: 'București Nord', destination: 'Brașov', label: 'București ⇄ Brașov' },
  { origin: 'Galați', destination: 'București Nord', label: 'Galați ⇄ București' },
  { origin: 'Cluj-Napoca', destination: 'Timișoara Nord', label: 'Cluj ⇄ Timișoara' },
];

function TripsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addTrainToTrip, removeTrainFromTrip, isTrainInTrip, trips: savedTrips } = useTrip();

  let user: any = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch {
    // Standalone tests outside AuthProvider
  }

  const urlOrigin = searchParams.get('origin');
  const urlDestination = searchParams.get('destination');
  const initialOrigin = urlOrigin || DEFAULT_TRIPS_ORIGIN;
  const initialDestination = urlDestination || DEFAULT_TRIPS_DESTINATION;
  const initialDateParam = searchParams.get('date');

  const initialPillarParam = searchParams.get('pillar')?.toUpperCase() || null;

  const [todayStr, setTodayStr] = useState<string>('');
  const [maxDateStr, setMaxDateStr] = useState<string>('');

  const [originInput, setOriginInput] = useState<string>(initialOrigin);
  const [destinationInput, setDestinationInput] = useState<string>(initialDestination);
  const [activeOrigin, setActiveOrigin] = useState<string>(initialOrigin);
  const [activeDestination, setActiveDestination] = useState<string>(initialDestination);
  const [departurePreset, setDeparturePreset] = useState<string>('Now');
  const [activeDate, setActiveDate] = useState<string>(() => {
    if (initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)) {
      return initialDateParam;
    }
    return '';
  });

  useEffect(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    setTodayStr(todayIso);
    setActiveDate((prev) => prev || todayIso);

    const maxD = new Date();
    maxD.setDate(maxD.getDate() + 90);
    setMaxDateStr(maxD.toISOString().slice(0, 10));
  }, []);

  const [backendPlans, setBackendPlans] = useState<TransitRoutePlan[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<TripFetchStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);
  const [isDebugLoadingForced, setIsDebugLoadingForced] = useState<boolean>(false);
  const [debugGearOverride, setDebugGearOverride] = useState<MascotGear | null>(null);
  const activeRequestIdRef = React.useRef<number>(0);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  // Keep active filter tab on ALL by default so all unique routes for day X are visible
  const [filters, setFilters] = useState<TripFilterState>(() => {
    let parsedMaxTransfers: number | undefined = undefined;
    const mtParam = searchParams.get('maxTransfers') ?? searchParams.get('max_transfers');
    if (mtParam !== null && mtParam !== undefined && mtParam !== '') {
      const parsed = parseInt(mtParam, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        parsedMaxTransfers = parsed;
      }
    }
    return { ...DEFAULT_TRIP_FILTERS, pillar: 'ALL', maxTransfers: parsedMaxTransfers };
  });

  const activeMascotGear: MascotGear = useMemo(() => {
    const currentPillar = filters.pillar !== 'ALL' ? filters.pillar : initialPillarParam;
    if (currentPillar === 'MOST_RELIABLE') return 'safe';
    if (currentPillar === 'FASTEST') return 'fast';
    if (currentPillar === 'BEST_VALUE') return 'economy';
    return 'default';
  }, [filters.pillar, initialPillarParam]);

  const effectiveIsLoading = isLoading || isDebugLoadingForced;
  const effectiveSpinnerGear: MascotGear = debugGearOverride ?? activeMascotGear;

  const isPlanHighlighted = (plan: TransitRoutePlan) => {
    if (!initialPillarParam) return false;
    return (
      plan.curatedPillars?.includes(initialPillarParam as CuratedPillar) ||
      plan.curatedPillar === initialPillarParam
    );
  };

  const updateUrlParams = (newOrigin: string, newDestination: string, newDate?: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('origin', newOrigin);
    params.set('destination', newDestination);
    if (newDate || activeDate) {
      params.set('date', newDate || activeDate);
    }
    router.replace(`/trips?${params.toString()}`);
  };

  const handlePrevDay = () => {
    const cur = new Date(activeDate);
    cur.setDate(cur.getDate() - 1);
    const prevStr = cur.toISOString().slice(0, 10);
    if (prevStr >= todayStr) {
      setActiveDate(prevStr);
      updateUrlParams(activeOrigin, activeDestination, prevStr);
      setFetchTrigger((prev) => prev + 1);
    }
  };

  const handleNextDay = () => {
    const cur = new Date(activeDate);
    cur.setDate(cur.getDate() + 1);
    const nextStr = cur.toISOString().slice(0, 10);
    if (nextStr <= maxDateStr) {
      setActiveDate(nextStr);
      updateUrlParams(activeOrigin, activeDestination, nextStr);
      setFetchTrigger((prev) => prev + 1);
    }
  };

  const handleResetToDefaultCorridor = () => {
    setOriginInput(DEFAULT_TRIPS_ORIGIN);
    setDestinationInput(DEFAULT_TRIPS_DESTINATION);
    setActiveOrigin(DEFAULT_TRIPS_ORIGIN);
    setActiveDestination(DEFAULT_TRIPS_DESTINATION);
    updateUrlParams(DEFAULT_TRIPS_ORIGIN, DEFAULT_TRIPS_DESTINATION);
    setFetchTrigger((prev) => prev + 1);
  };

  const isDatePast = activeDate < todayStr;
  const isDateTooFar = activeDate > maxDateStr;
  const isOutOfBounds = isDatePast || isDateTooFar;
  const hasNoTrainsError =
    !effectiveIsLoading &&
    (fetchStatus === 'NO_TRAINS' ||
      fetchStatus === 'INVALID_ROUTE' ||
      (backendPlans.length === 0 && !isOutOfBounds && fetchStatus !== 'OUT_OF_WINDOW'));

  useEffect(() => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setFetchError(null);
    setFetchStatus('OK');
    setBackendPlans([]);

    const backendPillarPref =
      filters.pillar !== 'ALL'
        ? filters.pillar
        : (initialPillarParam as CuratedPillar) || undefined;

    const startTime = Date.now();

    fetchDayTripsFromBackend(
      activeOrigin,
      activeDestination,
      activeDate,
      backendPillarPref,
      filters.maxTransfers
    )
      .then(async (res) => {
        if (requestId !== activeRequestIdRef.current) return;
        if (process.env.NODE_ENV !== 'test') {
          const elapsed = Date.now() - startTime;
          if (elapsed < 260) {
            await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
          }
        }
        if (requestId !== activeRequestIdRef.current) return;
        setFetchStatus(res.status || (res.plans && res.plans.length > 0 ? 'OK' : 'NO_TRAINS'));
        if (res.error) setFetchError(res.error);
        setBackendPlans(res.plans || []);
      })
      .catch(async (err) => {
        if (requestId !== activeRequestIdRef.current) return;
        if (process.env.NODE_ENV !== 'test') {
          const elapsed = Date.now() - startTime;
          if (elapsed < 260) {
            await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
          }
        }
        if (requestId !== activeRequestIdRef.current) return;
        setFetchStatus('NETWORK_ERROR');
        setFetchError(err?.message || 'Error fetching trains');
        setBackendPlans([]);
      })
      .finally(() => {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      if (activeRequestIdRef.current === requestId) {
        activeRequestIdRef.current = requestId + 1;
      }
    };
  }, [activeOrigin, activeDestination, activeDate, filters.pillar, fetchTrigger]);

  const handleSwap = () => {
    const newOrigin = destinationInput;
    const newDest = originInput;
    setOriginInput(newOrigin);
    setDestinationInput(newDest);
    setActiveOrigin(newOrigin);
    setActiveDestination(newDest);
    updateUrlParams(newOrigin, newDest);
    setFetchTrigger((prev) => prev + 1);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveOrigin(originInput);
    setActiveDestination(destinationInput);
    updateUrlParams(originInput, destinationInput);
    setFetchTrigger((prev) => prev + 1);
  };

  const handleSelectOrigin = (st: StationAutocompleteItem) => {
    setOriginInput(st.name);
    setActiveOrigin(st.name);
    updateUrlParams(st.name, destinationInput);
    setFetchTrigger((prev) => prev + 1);
  };

  const handleSelectDestination = (st: StationAutocompleteItem) => {
    setDestinationInput(st.name);
    setActiveDestination(st.name);
    updateUrlParams(originInput, st.name);
    setFetchTrigger((prev) => prev + 1);
  };

  // Corridor raw trips loaded from real backend (never synthetic fake trains)
  const rawTrips = useMemo(() => {
    return backendPlans;
  }, [backendPlans]);

  // Filter and sort trips
  const displayedTrips = useMemo(() => {
    return filterAndSortTrips(rawTrips, filters);
  }, [rawTrips, filters]);

  // Matrix ribbon summary statistics
  const summaryStats = useMemo(() => {
    if (rawTrips.length === 0) return null;
    const lowestFare = Math.min(...rawTrips.map((t) => t.fare.totalAmountLei));
    const fastestDuration = Math.min(...rawTrips.map((t) => t.totalDurationMinutes));
    const highestShield = Math.max(...rawTrips.map((t) => 100 - t.riskAnalysis.overallRiskScore));
    return { lowestFare, fastestDuration, highestShield };
  }, [rawTrips]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.pillar !== 'ALL') count++;
    if (filters.modes.length < 4) count++;
    if (filters.providers.length > 0) count++;
    if (filters.maxPriceLei !== undefined) count++;
    if (filters.sortBy !== 'departure') count++;
    if (filters.maxTransfers !== undefined) count++;
    return count;
  }, [filters]);

  const handleAddToItinerary = async (plan: TransitRoutePlan) => {
    if (isTrainDeparted(plan.departureTime, plan.date || activeDate)) {
      return;
    }
    const travelDate = plan.date || activeDate || (plan.departureTime ? plan.departureTime.slice(0, 10) : undefined);
    const journey = convertRoutePlanToTrainJourney(plan);
    addTrainToTrip(journey, undefined, travelDate);

    // Persist to saved_routes if logged in, or sessionStorage if logged out
    const isRegistered = Boolean(user && !user.is_guest && !(user as any).isGuest);
    if (isRegistered) {
      try {
        await apiClient.saveRoute(plan);
      } catch (err) {
        console.warn('Failed to persist to saved_routes:', err);
      }
    } else {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const raw = window.sessionStorage.getItem('beeline_guest_itinerary');
          const list = raw ? JSON.parse(raw) : [];
          if (!list.some((item: any) => item.id === plan.id)) {
            list.push(plan);
            window.sessionStorage.setItem('beeline_guest_itinerary', JSON.stringify(list));
          }
        }
      } catch {}
    }

    // Open official Mersul Trenurilor ticket purchase page in new tab
    const origin = plan.query?.origin?.name || plan.legs[0]?.names.originName || activeOrigin;
    const destination = plan.query?.destination?.name || plan.legs[plan.legs.length - 1]?.names.destinationName || activeDestination;
    const operator = plan.legs[0]?.names.operatorName || plan.legs[0]?.names.operatorShortName;
    const trainNumber = plan.legs[0]?.names.lineCode || plan.summary;

    const url = buildOfficialTicketUrl({
      origin,
      destination,
      travelDate,
      operator,
      trainNumber,
    });

    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleInItineraryClick = (_plan: TransitRoutePlan) => {
    router.push('/my-trip');
  };

  const handleRemoveTrip = (planId: string) => {
    const match = savedTrips.find((t) => t.journey.id === planId);
    if (match) removeTrainFromTrip(match.id);
  };

  return (
    <div className="relative min-h-screen">
      <AmbientPageMascot gear={activeMascotGear} position="top-right" />
      <div className="relative z-10 py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Day-X Timetable Navigation Bar */}
      <div
        data-testid="trips-date-bar"
        className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-xs"
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            data-testid="trips-prev-day"
            disabled={activeDate <= todayStr}
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-white border border-amber-200 text-stone-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4 text-amber-600" />
            <input
              data-testid="trips-date-input"
              type="date"
              min={todayStr}
              max={maxDateStr}
              value={activeDate}
              onChange={(e) => {
                setActiveDate(e.target.value);
                updateUrlParams(activeOrigin, activeDestination, e.target.value);
                setFetchTrigger((prev) => prev + 1);
              }}
              className="text-xs font-bold text-stone-800 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            data-testid="trips-next-day"
            disabled={activeDate >= maxDateStr}
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-white border border-amber-200 text-stone-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Provider Booking Window Out-of-Bounds Alert */}
      {(isOutOfBounds || fetchStatus === 'OUT_OF_WINDOW') && (
        <div
          data-testid="booking-window-alert"
          className="p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2 shadow-xs"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            {isDatePast
              ? 'Cannot plan or book a trip in the past. Please choose a date from today onward.'
              : isDateTooFar
              ? `Travel date '${activeDate}' is outside the booking window (${todayStr} to ${maxDateStr}). Please choose a date within 90 days.`
              : fetchError || 'Selected travel date is outside the booking window.'}
          </span>
        </div>
      )}

      {/* Location Selector Bar */}
      <BaseCard variant="elevated" className="p-5 md:p-6 mb-6 border border-amber-200/90 bg-white overflow-visible">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative z-30 flex flex-col md:flex-row items-center gap-3">
            <div className="w-full">
              <StationAutocompleteInput
                id="trips-origin-input"
                label="ORIGIN"
                placeholder="Departure station or city..."
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onSelectStation={handleSelectOrigin}
                onClear={() => setOriginInput('')}
                excludeStationName={destinationInput}
                leftIcon={<MapPin className="w-4 h-4 text-amber-500" />}
              />
            </div>

            <button
              type="button"
              onClick={handleSwap}
              title="Swap Stations"
              className="md:mt-5 p-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all shadow-xs"
            >
              <ArrowLeftRight className="w-4 h-4 rotate-90 md:rotate-0" />
            </button>

            <div className="w-full">
              <StationAutocompleteInput
                id="trips-destination-input"
                label="DESTINATION"
                placeholder="Arrival station or city..."
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onSelectStation={handleSelectDestination}
                onClear={() => setDestinationInput('')}
                excludeStationName={originInput}
                leftIcon={<MapPin className="w-4 h-4 text-amber-600" />}
              />
            </div>

            <div className="w-full md:w-auto md:mt-5">
              <BaseButton
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full md:w-auto font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                leftIcon={<Search className="w-4 h-4" />}
              >
                Find
              </BaseButton>
            </div>
          </div>

          {/* Quick Corridors & Departure Presets */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-stone-400 font-medium">Quick Picks:</span>
              {POPULAR_CORRIDORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    setOriginInput(c.origin);
                    setDestinationInput(c.destination);
                    setActiveOrigin(c.origin);
                    setActiveDestination(c.destination);
                    updateUrlParams(c.origin, c.destination);
                    setFetchTrigger((prev) => prev + 1);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors font-medium"
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-stone-400 font-medium">Depart:</span>
              {DEPARTURE_PRESETS.map((preset) => {
                const isSelected = departurePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeparturePreset(preset)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </BaseCard>

      {/* Invalid Corridor / No Real Trains Available Error State */}
      {hasNoTrainsError && (
        <div
          data-testid="no-trains-error-state"
          role="alert"
          className="p-6 mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50/90 text-stone-900 shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-200 text-amber-900 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-800" />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  No trains available for {activeOrigin} → {activeDestination} on {activeDate}
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  {fetchError ||
                    'One of the entered stations may not be served by available rail routes, or no scheduled train services operate on this corridor for the selected date.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  disabled={activeDate >= maxDateStr}
                  onClick={handleNextDay}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                >
                  Try Next Day (+1 day)
                </button>
                <button
                  type="button"
                  data-testid="reset-default-corridor-btn"
                  onClick={handleResetToDefaultCorridor}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition-all shadow-xs"
                >
                  Load București Nord → Brașov
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Filter Bar */}
      {!hasNoTrainsError && (
        <TripFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_TRIP_FILTERS)}
          activeCount={activeFilterCount}
        />
      )}

      {/* Main Content Slot: Shimmering Glass Ghost Skeleton vs Real Trips */}
      {effectiveIsLoading ? (
        <div className="w-full my-4">
          <TripsGhostSkeleton />
        </div>
      ) : hasNoTrainsError ? null : (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Matrix Ribbon - Blended-In Editorial Stat Strip */}
          {summaryStats && (
            <div
              data-testid="summary-stats-strip"
              className="w-full grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E6D7BC]/75 border-y border-[#E6D7BC]/70 bg-[#FAF4E8]/35 py-3 px-2"
            >
              <div data-testid="stat-best-price" className="flex items-center gap-3 px-4 py-1.5 sm:justify-center">
                <Coins className="w-4 h-4 text-amber-700/75 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] leading-tight block">
                    Queen Flora · Best Price
                  </span>
                  <span className="text-lg sm:text-xl font-bold tabular-nums text-[#1E1B18] leading-snug block">
                    {summaryStats.lowestFare.toFixed(2)} LEI
                  </span>
                </div>
              </div>

              <div data-testid="stat-fastest-transit" className="flex items-center gap-3 px-4 py-1.5 sm:justify-center">
                <Zap className="w-4 h-4 text-blue-700/70 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] leading-tight block">
                    Queen Vira · Fastest Transit
                  </span>
                  <span className="text-lg sm:text-xl font-bold tabular-nums text-[#1E1B18] leading-snug block">
                    {Math.floor(summaryStats.fastestDuration / 60)}h {summaryStats.fastestDuration % 60}m
                  </span>
                </div>
              </div>

              <div data-testid="stat-transfer-shield" className="flex items-center gap-3 px-4 py-1.5 sm:justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-700/75 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] leading-tight block">
                    Queen Meli · Transfer Shield
                  </span>
                  <span className="text-lg sm:text-xl font-bold tabular-nums text-[#1E1B18] leading-snug block">
                    {summaryStats.highestShield}% Reliable
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trips Header with Total Count */}
          <div
            data-testid="trips-count-header"
            className="flex items-center justify-between pb-2 mb-2 px-1 flex-wrap gap-2 text-xs font-semibold text-stone-700"
          >
            <span className="flex items-center gap-1.5">
              <Train className="w-4 h-4 text-amber-600" />
              <span>
                Showing <strong className="text-stone-900 font-black">{displayedTrips.length}</strong> unique train{displayedTrips.length === 1 ? '' : 's'} operating on <strong className="text-stone-900 font-black">{activeDate}</strong>
              </span>
            </span>
            {initialPillarParam && filters.pillar === 'ALL' && (
              <span
                data-testid="active-pillar-promoted-pill"
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300"
              >
                ★ Highlighted: {initialPillarParam === 'MOST_RELIABLE' ? 'Safe Route' : initialPillarParam === 'FASTEST' ? 'Fast Route' : 'Economy Route'}
              </span>
            )}
          </div>

          {/* Trips Results List */}
          <div className="space-y-4">
            {displayedTrips.length === 0 ? (
              <BaseCard variant="outlined" className="p-8 text-center bg-white border-amber-200">
                <MascotBee name="honey" size="lg" />
                <h3 className="text-lg font-bold text-stone-800 mt-3">No trips matching criteria</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  Try adjusting your price filter or enabling more transport modes and operators.
                </p>
                <div className="mt-4">
                  <BaseButton variant="outline" size="sm" onClick={() => setFilters(DEFAULT_TRIP_FILTERS)}>
                    Reset Filters
                  </BaseButton>
                </div>
              </BaseCard>
            ) : (
              displayedTrips.map((plan) => {
                const isBooked = isTrainInTrip(plan.id);
                const isHighlighted = initialPillarParam ? isPlanHighlighted(plan) : false;
                return (
                  <BookingTripCard
                    key={plan.id}
                    plan={plan}
                    isBooked={isBooked}
                    isInItinerary={isBooked}
                    isHighlighted={isHighlighted}
                    highlightLabel="★ Selected from Home"
                    onBookTrip={handleAddToItinerary}
                    onAddToItinerary={handleAddToItinerary}
                    onInItineraryClick={handleInItineraryClick}
                    onRemoveTrip={handleRemoveTrip}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Mascot Debug Trigger */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex flex-col items-end gap-1.5">
        {isDebugLoadingForced && (
          <button
            type="button"
            onClick={() => setIsDebugLoadingForced(false)}
            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md border border-amber-600 transition-all cursor-pointer flex items-center gap-1"
            title="Click to stop forced loading"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-ping" />
            <span>Loading Forced (Stop)</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsDebugModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-stone-900/85 hover:bg-stone-950 text-stone-200 border border-stone-700/60 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
          title="Open Mascot Testing / Debug Tools"
          aria-label="Open Debug Tools"
          aria-haspopup="dialog"
          aria-expanded={isDebugModalOpen}
        >
          <span className="text-amber-400">🛠️</span>
          <span>Debug Tools</span>
          {(debugGearOverride !== null || isDebugLoadingForced) && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
              title="Manual override active"
            />
          )}
        </button>
      </div>

      {/* Testing / Debug Modal */}
      <MascotDebugModal
        isOpen={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
        currentGear={effectiveSpinnerGear}
        onSelectGear={(gear) => setDebugGearOverride(gear)}
        isManualOverride={debugGearOverride !== null || isDebugLoadingForced}
        isLoadingForced={isDebugLoadingForced}
        onToggleForceLoading={() => {
          setIsDebugLoadingForced((prev) => !prev);
          setIsDebugModalOpen(false);
        }}
        onResetAuto={() => {
          setDebugGearOverride(null);
          setIsDebugLoadingForced(false);
        }}
        onResetLoading={() => {
          setIsDebugLoadingForced(false);
        }}
      />
      </div>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <TripsGhostSkeleton fullPage />
        </div>
      }
    >
      <TripsContent />
    </Suspense>
  );
}
