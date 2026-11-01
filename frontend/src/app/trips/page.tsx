'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeftRight, 
  MapPin, 
  Search, 
  Clock, 
  Sparkles, 
  Zap, 
  Coins, 
  ShieldCheck, 
  Calendar 
} from 'lucide-react';
import { 
  generateTripsForCorridor, 
  filterAndSortTrips, 
  convertRoutePlanToTrainJourney,
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

  const [originInput, setOriginInput] = useState<string>(initialOrigin);
  const [destinationInput, setDestinationInput] = useState<string>(initialDestination);
  const [activeOrigin, setActiveOrigin] = useState<string>(initialOrigin);
  const [activeDestination, setActiveDestination] = useState<string>(initialDestination);
  const [departurePreset, setDeparturePreset] = useState<string>('Now');

  const [filters, setFilters] = useState<TripFilterState>(() => {
    let pillar: 'ALL' | CuratedPillar = 'ALL';
    const p = searchParams.get('pillar')?.toUpperCase();
    if (p === 'FASTEST' || p === 'BEST_VALUE' || p === 'MOST_RELIABLE' || p === 'ECO_HERO') {
      pillar = p as CuratedPillar;
    }
    return { ...DEFAULT_TRIP_FILTERS, pillar };
  });

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
    return generateTripsForCorridor(activeOrigin, activeDestination);
  }, [activeOrigin, activeDestination]);

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
    addTrainToTrip(journey);
  };

  const handleRemoveTrip = (planId: string) => {
    const match = savedTrips.find((t) => t.journey.id === planId);
    if (match) removeTrainFromTrip(match.id);
  };

  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
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
            return (
              <BookingTripCard
                key={plan.id}
                plan={plan}
                isBooked={isBooked}
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
