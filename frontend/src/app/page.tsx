'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowLeftRight, 
  Search, 
  Zap, 
  ShieldCheck, 
  Coins, 
  Compass, 
  RotateCcw, 
  ArrowRight, 
  MapPin, 
  Clock,
  CheckCircle2
} from 'lucide-react';
import MascotBee, { MascotGear, GEAR_CONFIG } from '../components/MascotBee';
import BaseButton from '../components/BaseButton';
import BaseInput from '../components/BaseInput';
import BaseCard from '../components/BaseCard';
import { generateTripsForCorridor } from '../services/tripBookingService';
import { TransitRoutePlan } from '../types/routePlan';

export const POPULAR_CORRIDORS = [
  { origin: 'București Nord', destination: 'Brașov', label: 'București ⇄ Brașov' },
  { origin: 'Galați', destination: 'București Nord', label: 'Galați ⇄ București' },
  { origin: 'Cluj-Napoca', destination: 'Timișoara Nord', label: 'Cluj ⇄ Timișoara' },
];

export default function HomePage() {
  const router = useRouter();

  // Search State
  const [origin, setOrigin] = useState<string>('Galați');
  const [destination, setDestination] = useState<string>('București Nord');
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Mascot & Route Gear State ('default' initially, then 'fast' | 'safe' | 'economy')
  const [activeGear, setActiveGear] = useState<MascotGear>('default');
  const [selectedRouteType, setSelectedRouteType] = useState<'fast' | 'safe' | 'economy'>('safe');
  const [searchResults, setSearchResults] = useState<{
    fast?: TransitRoutePlan;
    safe?: TransitRoutePlan;
    economy?: TransitRoutePlan;
  }>({});

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setError(null);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!origin.trim()) {
      setError('Please provide a departure origin station or city');
      return;
    }
    if (!destination.trim()) {
      setError('Please provide an arrival destination station or city');
      return;
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError('Origin and destination cannot be identical');
      return;
    }
    setError(null);

    // Compute generated corridor options
    const plans = generateTripsForCorridor(origin.trim(), destination.trim());
    const fast = plans.find((p) => p.curatedPillar === 'FASTEST') || plans[0];
    const safe = plans.find((p) => p.curatedPillar === 'MOST_RELIABLE') || plans[1] || plans[0];
    const economy = plans.find((p) => p.curatedPillar === 'BEST_VALUE') || plans[2] || plans[0];

    setSearchResults({ fast, safe, economy });
    setHasSearched(true);

    // When search runs, default to safe route and switch mascot gear immediately!
    setSelectedRouteType('safe');
    setActiveGear('safe');
  };

  const handleSelectRouteType = (type: 'fast' | 'safe' | 'economy') => {
    setSelectedRouteType(type);
    setActiveGear(type);
  };

  const handleResetSearch = () => {
    setHasSearched(false);
    setActiveGear('default');
    setError(null);
  };

  const handleBookSelectedRoute = () => {
    const pillarParam = 
      selectedRouteType === 'fast' ? 'FASTEST' : 
      selectedRouteType === 'safe' ? 'MOST_RELIABLE' : 'BEST_VALUE';

    const queryParams = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
      pillar: pillarParam,
    });
    router.push(`/trips?${queryParams.toString()}`);
  };

  const currentGearConfig = GEAR_CONFIG[activeGear];

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-5 overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center my-auto">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Beeline Brand, Disruptive Hook & Search Flow */}
        {/* ========================================================= */}
        <div className="md:col-span-7 flex flex-col justify-center text-left">
          
          {/* Brand Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Beeline • Romanian Transit Solved
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Zero Missed Connections
            </span>
          </div>

          {/* App Title */}
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-950 tracking-tight">
              Beeline
            </h1>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/90 px-2.5 py-0.5 rounded-full">
              Transit Planner
            </span>
          </div>

          {/* Disruptive Headline */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Romanian Transit is Chaotic.{' '}
            <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 bg-clip-text text-transparent">
              We Made It Effortless.
            </span>
          </h2>

          {/* Disruptive Value Proposition Message */}
          <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-xl leading-relaxed">
            Stop gambling on delayed CFR trains, mysterious metro gaps, and disconnected regional buses. 
            Beeline syncs direct express rail, city subways, and municipal coaches with algorithmic transfer shields.
          </p>

          {/* MAIN INTERACTIVE CARD: SEARCH OR ROUTE TRIFECTA */}
          <div className="mt-4">
            {!hasSearched ? (
              /* State 1: Initial Search Form (Mascot is Default Explorer) */
              <BaseCard variant="elevated" className="p-4 sm:p-5 border border-amber-200/90 shadow-lg bg-white/95 backdrop-blur-sm">
                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="relative flex flex-col sm:flex-row items-center gap-2">
                    <div className="w-full">
                      <BaseInput
                        label="DEPARTURE ORIGIN"
                        placeholder="e.g. Galați, București Nord..."
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        onClear={() => setOrigin('')}
                        leftIcon={<MapPin className="w-4 h-4 text-amber-500" />}
                      />
                    </div>

                    {/* Swap Button */}
                    <button
                      type="button"
                      onClick={handleSwap}
                      title="Swap Origin and Destination"
                      className="sm:mt-5 p-2 rounded-full border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all shadow-xs"
                    >
                      <ArrowLeftRight className="w-4 h-4 rotate-90 sm:rotate-0" />
                    </button>

                    <div className="w-full">
                      <BaseInput
                        label="ARRIVAL DESTINATION"
                        placeholder="e.g. Brașov, Cluj-Napoca..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        onClear={() => setDestination('')}
                        leftIcon={<MapPin className="w-4 h-4 text-amber-600" />}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}

                  {/* Popular Romanian Corridors */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-xs font-semibold text-stone-400 mr-1">Popular:</span>
                    {POPULAR_CORRIDORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => {
                          setOrigin(c.origin);
                          setDestination(c.destination);
                          setError(null);
                        }}
                        className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Action */}
                  <div className="pt-1">
                    <BaseButton
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 shadow-md py-2.5 text-sm"
                      leftIcon={<Search className="w-4 h-4" />}
                    >
                      Find Synchronized Routes
                    </BaseButton>
                  </div>
                </form>
              </BaseCard>
            ) : (
              /* State 2: Post-Search Route Selector (Mascot changes gear dynamically) */
              <BaseCard variant="elevated" className="p-4 sm:p-5 border border-amber-300 shadow-lg bg-white/95">
                <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                  <div>
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      Synchronized Corridors Found
                    </span>
                    <h3 className="text-base font-extrabold text-stone-900">
                      {origin} ➔ {destination}
                    </h3>
                  </div>
                  <button
                    onClick={handleResetSearch}
                    className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Modify
                  </button>
                </div>

                {/* 3 Dynamic Route Options (Safe, Fast, Economy) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3">
                  {/* SAFE ROUTE CARD */}
                  <div
                    onClick={() => handleSelectRouteType('safe')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRouteType === 'safe'
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm scale-[1.02]'
                        : 'border-stone-200 hover:border-emerald-300 bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        SAFE ROUTE
                      </span>
                      {selectedRouteType === 'safe' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-xs font-semibold text-stone-800">Transfer Shield</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {searchResults.safe?.totalDurationMinutes 
                        ? `${Math.floor(searchResults.safe.totalDurationMinutes / 60)}h ${searchResults.safe.totalDurationMinutes % 60}m` 
                        : '2h 05m'} • {searchResults.safe?.riskAnalysis ? `${Math.round(100 - searchResults.safe.riskAnalysis.overallRiskScore)}/100 Buffer` : '96/100 Buffer'}
                    </div>
                    <div className="mt-2 text-xs font-bold text-emerald-700">
                      {searchResults.safe?.fare?.totalAmountLei 
                        ? `${searchResults.safe.fare.totalAmountLei.toFixed(2)} LEI` 
                        : '45.00 LEI'}
                    </div>
                  </div>

                  {/* FAST ROUTE CARD */}
                  <div
                    onClick={() => handleSelectRouteType('fast')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRouteType === 'fast'
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm scale-[1.02]'
                        : 'border-stone-200 hover:border-blue-300 bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-blue-800 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        FAST ROUTE
                      </span>
                      {selectedRouteType === 'fast' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="text-xs font-semibold text-stone-800">Express Scout</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {searchResults.fast?.totalDurationMinutes 
                        ? `${Math.floor(searchResults.fast.totalDurationMinutes / 60)}h ${searchResults.fast.totalDurationMinutes % 60}m` 
                        : '1h 45m'} • {searchResults.fast ? (searchResults.fast.transfersCount === 0 ? '0 Stopovers' : `${searchResults.fast.transfersCount} Stopover${searchResults.fast.transfersCount > 1 ? 's' : ''}`) : '0 Stopovers'}
                    </div>
                    <div className="mt-2 text-xs font-bold text-blue-700">
                      {searchResults.fast?.fare?.totalAmountLei 
                        ? `${searchResults.fast.fare.totalAmountLei.toFixed(2)} LEI` 
                        : '63.00 LEI'}
                    </div>
                  </div>

                  {/* ECONOMY ROUTE CARD */}
                  <div
                    onClick={() => handleSelectRouteType('economy')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRouteType === 'economy'
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm scale-[1.02]'
                        : 'border-stone-200 hover:border-amber-300 bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        ECONOMY
                      </span>
                      {selectedRouteType === 'economy' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="text-xs font-semibold text-stone-800">Nectar Saver</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {searchResults.economy?.totalDurationMinutes 
                        ? `${Math.floor(searchResults.economy.totalDurationMinutes / 60)}h ${searchResults.economy.totalDurationMinutes % 60}m` 
                        : '2h 30m'} • Lowest Fare
                    </div>
                    <div className="mt-2 text-xs font-bold text-amber-700">
                      {searchResults.economy?.fare?.totalAmountLei 
                        ? `${searchResults.economy.fare.totalAmountLei.toFixed(2)} LEI` 
                        : '24.50 LEI'}
                    </div>
                  </div>
                </div>

                {/* Booking CTA Button */}
                <BaseButton
                  onClick={handleBookSelectedRoute}
                  variant="primary"
                  size="md"
                  className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 shadow-md py-2.5 text-sm"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Book {selectedRouteType.toUpperCase()} Route in Trip Planner
                </BaseButton>
              </BaseCard>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: The Animated Beeline Mascot Changing Gear   */}
        {/* ========================================================= */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur-md border border-amber-200/90 shadow-xl p-5 text-center flex flex-col items-center">
            
            {/* Ambient Background Aura */}
            <div 
              className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-30 blur-2xl pointer-events-none transition-colors duration-500"
              style={{ backgroundColor: currentGearConfig.color }}
            />

            {/* Mascot Title & Gear Badge */}
            <div className="mb-2">
              <span
                className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border shadow-xs inline-block"
                style={{
                  backgroundColor: currentGearConfig.bgColor,
                  color: currentGearConfig.textColor,
                  borderColor: currentGearConfig.borderColor,
                }}
              >
                {currentGearConfig.badge}
              </span>
            </div>

            {/* Mascot SVG Vector with Speech Bubble and Micro-motion */}
            <div className="my-2">
              <MascotBee
                gear={activeGear}
                size="2xl"
                animated={true}
                showSpeech={true}
                speechText={currentGearConfig.speechDefault}
              />
            </div>

            {/* Gear Equipment Details */}
            <div className="mt-2 w-full pt-3 border-t border-amber-100">
              <h4 className="text-sm font-bold text-stone-900">
                {currentGearConfig.title}
              </h4>
              <p className="text-xs font-semibold text-amber-700 mt-0.5">
                Gear: {currentGearConfig.gearName}
              </p>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {currentGearConfig.description}
              </p>
            </div>

            {/* Manual Gear Switcher Chips */}
            <div className="mt-3 pt-2.5 w-full border-t border-stone-100 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                Gear:
              </span>
              {(['default', 'fast', 'safe', 'economy'] as MascotGear[]).map((gear) => {
                const isCurrent = activeGear === gear;
                const gConfig = GEAR_CONFIG[gear];
                return (
                  <button
                    key={gear}
                    type="button"
                    onClick={() => {
                      setActiveGear(gear);
                      if (gear !== 'default') {
                        setSelectedRouteType(gear as any);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? 'shadow-xs scale-105'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: gConfig.bgColor,
                            color: gConfig.textColor,
                            borderColor: gConfig.borderColor,
                            borderWidth: 1,
                          }
                        : {}
                    }
                  >
                    {gConfig.accessoryIcon} {gear.charAt(0).toUpperCase() + gear.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
