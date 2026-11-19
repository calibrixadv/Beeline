'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  generateTripsForCorridor, 
  filterAndSortTrips, 
  convertRoutePlanToTrainJourney,
  fetchDayTripsFromBackend,
  DEFAULT_TRIP_FILTERS,
  TripFilterState
} from '../../services/tripBookingService';
import { TransitRoutePlan, CuratedPillar } from '../../types/routePlan';
import { useTrip } from '../../context/TripContext';
import BaseCard from '../../components/BaseCard';
import BaseInput from '../../components/BaseInput';
import BaseButton from '../../components/BaseButton';
import BookingTripCard from '../../components/BookingTripCard';
import TripFilterBar from '../../components/TripFilterBar';
import MascotBee from '../../components/MascotBee';

const DEPARTURE_PRESETS = ['Now', '08:00 AM', '12:00 PM', '16:00 PM'];
const POPULAR_CORRIDORS = [
  { origin: 'București Nord', destination: 'Brașov', label: 'București ⇄ Brașov' },
  { origin: 'Galați', destination: 'București Nord', label: 'Galați ⇄ București' },
  { origin: 'Cluj-Napoca', destination: 'Timișoara Nord', label: 'Cluj ⇄ Timișoara' },
];

function TripsContent() {
  const searchParams = useSearchParams();
  const { addTrainToTrip, removeTrainFromTrip, isTrainInTrip, trips: savedTrips } = useTrip();

  const initialOrigin = searchParams.get('origin') || 'Galați';
  const initialDestination = searchParams.get('destination') || 'București Nord';
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

  // Keep active filter tab on ALL by default so all unique routes for day X are visible
  const [filters, setFilters] = useState<TripFilterState>(() => {
    return { ...DEFAULT_TRIP_FILTERS, pillar: 'ALL' };
  });

  const isPlanHighlighted = (plan: TransitRoutePlan) => {
    if (!initialPillarParam) return false;
    return (
      plan.curatedPillars?.includes(initialPillarParam as CuratedPillar) ||
      plan.curatedPillar === initialPillarParam
    );
  };

  const handlePrevDay = () => {
    const cur = new Date(activeDate);
    cur.setDate(cur.getDate() - 1);
    const prevStr = cur.toISOString().slice(0, 10);
    if (prevStr >= todayStr) {
      setActiveDate(prevStr);
    }
  };

  const handleNextDay = () => {
    const cur = new Date(activeDate);
    cur.setDate(cur.getDate() + 1);
    const nextStr = cur.toISOString().slice(0, 10);
    if (nextStr <= maxDateStr) {
      setActiveDate(nextStr);
    }
  };

  const isDatePast = activeDate < todayStr;
  const isDateTooFar = activeDate > maxDateStr;
  const isOutOfBounds = isDatePast || isDateTooFar;

  useEffect(() => {
    let isCancelled = false;
    setFetchError(null);

    const backendPillarPref =
      filters.pillar !== 'ALL'
        ? filters.pillar
        : (initialPillarParam as CuratedPillar) || undefined;

    fetchDayTripsFromBackend(activeOrigin, activeDestination, activeDate, backendPillarPref)
      .then((res) => {
        if (isCancelled) return;
        if (res.error) setFetchError(res.error);
        setBackendPlans(res.plans || []);
      })
      .catch((err) => {
        if (isCancelled) return;
        setFetchError(err?.message || 'Error fetching trains');
      });

    return () => {
      isCancelled = true;
    };
  }, [activeOrigin, activeDestination, activeDate, filters.pillar]);

  const handleSwap = () => {
    setOriginInput(destinationInput);
    setDestinationInput(originInput);
    setActiveOrigin(destinationInput);
    setActiveDestination(originInput);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveOrigin(originInput);
    setActiveDestination(destinationInput);
  };

  // Generate corridor raw trips
  const rawTrips = useMemo(() => {
    if (backendPlans.length > 0) return backendPlans;
    return generateTripsForCorridor(activeOrigin, activeDestination, `${activeDate}T08:00:00+02:00`);
  }, [backendPlans, activeOrigin, activeDestination, activeDate]);

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
    return count;
  }, [filters]);

  const handleBookTrip = (plan: TransitRoutePlan) => {
    const journey = convertRoutePlanToTrainJourney(plan);
    addTrainToTrip(journey, undefined, activeDate);
  };

  const handleRemoveTrip = (planId: string) => {
    const match = savedTrips.find((t) => t.journey.id === planId);
    if (match) removeTrainFromTrip(match.id);
  };

  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
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
              onChange={(e) => setActiveDate(e.target.value)}
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

        {/* Timetable Period & Live Provider Metadata */}
        <div className="flex items-center gap-2 text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white border border-amber-200 text-stone-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {activeDate >= '2026-12-13' ? 'Timetable 2026-2027 (Official)' : 'Timetable 2025-2026 (Live InfoFer)'}
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-amber-800 font-bold">90-Day Pre-Sale Window</span>
          </div>
        </div>
      </div>

      {/* Provider Booking Window Out-of-Bounds Alert */}
      {(isOutOfBounds || fetchError) && (
        <div
          data-testid="booking-window-alert"
          className="p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2 shadow-xs"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            {fetchError ||
              (isDatePast
                ? 'Cannot plan or book a trip in the past. Please choose a date from today onward.'
                : `Travel date '${activeDate}' is outside the booking window (${todayStr} to ${maxDateStr}). Please choose a date within 90 days.`)}
          </span>
        </div>
      )}

      {/* Location Selector Bar */}
      <BaseCard variant="elevated" className="p-5 md:p-6 mb-6 border border-amber-200/90 bg-white">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-full">
              <BaseInput
                label="ORIGIN"
                placeholder="Departure station or city..."
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onClear={() => setOriginInput('')}
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
              <BaseInput
                label="DESTINATION"
                placeholder="Arrival station or city..."
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onClear={() => setDestinationInput('')}
                leftIcon={<MapPin className="w-4 h-4 text-amber-600" />}
              />
            </div>

            <div className="w-full md:w-auto md:mt-5">
              <BaseButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full md:w-auto font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 px-6 py-2.5"
                leftIcon={<Search className="w-4 h-4" />}
              >
                Find
              </BaseButton>
            </div>
          </div>

          {/* Quick Corridors & Departure Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
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

      {/* Summary Matrix Ribbon */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-stone-950 font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block">Best Price</span>
              <span className="text-lg font-black text-amber-700">{summaryStats.lowestFare.toFixed(2)} LEI</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide block">Fastest Transit</span>
              <span className="text-lg font-black text-blue-700">
                {Math.floor(summaryStats.fastestDuration / 60)}h {summaryStats.fastestDuration % 60}m
              </span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide block">Transfer Shield</span>
              <span className="text-lg font-black text-emerald-700">{summaryStats.highestShield}% Reliable</span>
            </div>
          </div>
        </div>
      )}

      {/* Trip Filter Bar */}
      <TripFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_TRIP_FILTERS)}
        activeCount={activeFilterCount}
      />

      {/* Trips Header with Total Count & Zero Duplicates Guarantee */}
      <div
        data-testid="trips-count-header"
        className="flex items-center justify-between pb-2 mb-2 px-1 flex-wrap gap-2 text-xs font-semibold text-stone-700"
      >
        <span className="flex items-center gap-1.5">
          <Train className="w-4 h-4 text-amber-600" />
          <span>
            Showing <strong className="text-stone-900 font-black">{displayedTrips.length}</strong> unique train{displayedTrips.length === 1 ? '' : 's'} operating on <strong className="text-stone-900 font-black">{activeDate}</strong> • Zero duplicates
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
                isHighlighted={isHighlighted}
                highlightLabel="★ Selected from Home"
                onBookTrip={handleBookTrip}
                onRemoveTrip={handleRemoveTrip}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-500 font-medium">Loading Trips Explorer...</div>}>
      <TripsContent />
    </Suspense>
  );
}
