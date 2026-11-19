'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftRight, 
  Search, 
  Zap, 
  ShieldCheck, 
  Coins, 
  RotateCcw, 
  ArrowRight, 
  MapPin, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import MascotBee, { MascotGear } from '../components/MascotBee';
import MascotDebugModal from '../components/MascotDebugModal';
import BaseButton from '../components/BaseButton';
import BaseInput from '../components/BaseInput';
import BaseCard from '../components/BaseCard';
import StationAutocompleteInput from '../components/StationAutocompleteInput';
import { generateTripsForCorridor, selectTrifectaPlans } from '../services/tripBookingService';
import { TransitRoutePlan } from '../types/routePlan';
import {
  useScrollHiveTour,
  QueenBeesSection,
  TransitHoneycombSection,
  CozyHiveSection,
  ScrollCompanionMascot,
} from '../components/hive-tour';

export const POPULAR_CORRIDORS = [
  { origin: 'București Nord', destination: 'Brașov', label: 'București ⇄ Brașov' },
  { origin: 'Galați', destination: 'București Nord', label: 'Galați ⇄ București' },
  { origin: 'Cluj-Napoca', destination: 'Timișoara Nord', label: 'Cluj ⇄ Timișoara' },
];

export const MAX_BEE_DISPLACEMENT_PX = 64; // 4rem = 64px
export const MAX_BEE_DISPLACEMENT_REM = 4; // 4rem

export interface BackgroundBeeProps {
  gear: MascotGear;
}

export function BackgroundBee({ gear }: BackgroundBeeProps) {
  const [displacement, setDisplacement] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState<boolean>(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const getAnchorCenter = useCallback(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      }
    }
    const winWidth = typeof window !== 'undefined' ? (window.innerWidth || 1024) : 1024;
    const winHeight = typeof window !== 'undefined' ? (window.innerHeight || 768) : 768;
    return {
      x: winWidth * 0.85,
      y: winHeight * 0.15,
      width: 320,
      height: 320,
    };
  }, []);

  const updateFollowDisplacement = useCallback((clientX: number, clientY: number) => {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsNear((prev) => (prev ? false : prev));
      setDisplacement((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
      return;
    }

    const center = getAnchorCenter();
    const deltaX = clientX - center.x;
    const deltaY = clientY - center.y;
    const distance = Math.hypot(deltaX, deltaY);

    // Proximity radius: trigger when mouse is over or near the bee (radius ~400px)
    const proximityRadius = Math.max(center.width, center.height) * 1.25;

    if (distance <= proximityRadius) {
      setIsNear((prev) => (!prev ? true : prev));
      if (distance === 0) {
        setDisplacement((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
      } else {
        const clampedDistance = Math.min(distance, MAX_BEE_DISPLACEMENT_PX);
        const factor = clampedDistance / distance;
        const rawX = deltaX * factor;
        const rawY = deltaY * factor;
        const newX = Object.is(rawX, -0) || Math.abs(rawX) < 0.0001 ? 0 : rawX;
        const newY = Object.is(rawY, -0) || Math.abs(rawY) < 0.0001 ? 0 : rawY;

        setDisplacement((prev) => {
          if (Math.abs(prev.x - newX) < 0.001 && Math.abs(prev.y - newY) < 0.001) {
            return prev;
          }
          return { x: newX, y: newY };
        });
      }
    } else {
      setIsNear((prev) => (prev ? false : prev));
      setDisplacement((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
    }
  }, [getAnchorCenter]);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      updateFollowDisplacement(e.clientX, e.clientY);
    };

    const handleWindowMouseLeave = () => {
      setIsNear((prev) => (prev ? false : prev));
      setDisplacement((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleWindowMouseLeave);
    window.addEventListener('blur', handleWindowMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      document.removeEventListener('mouseleave', handleWindowMouseLeave);
      window.removeEventListener('blur', handleWindowMouseLeave);
    };
  }, [updateFollowDisplacement]);

  // Safe formatting helpers ensuring no negative zero '-0.00'
  const formatPx = (val: number) => {
    const safe = Object.is(val, -0) || Math.abs(val) < 0.001 ? 0 : val;
    return safe.toFixed(2);
  };
  const formatRem = (val: number) => {
    const rem = val / 16;
    const safe = Object.is(rem, -0) || Math.abs(rem) < 0.0001 ? 0 : rem;
    return safe.toFixed(3);
  };

  return (
    <div
      data-testid="background-flying-mascot"
      data-gear={gear}
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      <div
        ref={anchorRef}
        data-testid="bee-mascot-anchor"
        className="absolute top-[8%] sm:top-[10%] lg:top-[12%] right-[4%] sm:right-[10%] lg:right-[16%] opacity-15 sm:opacity-20 lg:opacity-25 transition-opacity duration-700 filter drop-shadow-sm scale-75 sm:scale-90 lg:scale-100 origin-top-right pointer-events-none"
      >
        <div
          data-testid="bee-mascot-follow"
          data-near={isNear ? 'true' : 'false'}
          data-displacement-x={formatPx(displacement.x)}
          data-displacement-y={formatPx(displacement.y)}
          data-displacement-rem-x={formatRem(displacement.x)}
          data-displacement-rem-y={formatRem(displacement.y)}
          className="bee-mouse-follow cursor-default pointer-events-none"
          style={{
            transform: `translate3d(${formatPx(displacement.x)}px, ${formatPx(displacement.y)}px, 0)`,
            transition: 'transform 950ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          <div className="animate-bee-dynamic-flight">
            <MascotBee
              gear={gear}
              size="4xl"
              animated={true}
              showAccessoryBadge={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  // Search State
  const [origin, setOrigin] = useState<string>('Galați');
  const [destination, setDestination] = useState<string>('București Nord');
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const [todayStr, setTodayStr] = useState<string>('');
  const [maxDateStr, setMaxDateStr] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('');

  const [quickDates, setQuickDates] = useState<{
    today: string;
    tomorrow: string;
    weekend: string;
    month: string;
  }>({
    today: '',
    tomorrow: '',
    weekend: '',
    month: '',
  });

  useEffect(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    setTodayStr(todayIso);
    setTravelDate((prev) => prev || todayIso);

    const maxD = new Date();
    maxD.setDate(maxD.getDate() + 90);
    setMaxDateStr(maxD.toISOString().slice(0, 10));

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekend = new Date(today);
    const dayOfWeek = weekend.getDay();
    const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
    weekend.setDate(weekend.getDate() + daysUntilSat);

    const monthAhead = new Date(today);
    monthAhead.setMonth(monthAhead.getMonth() + 1);

    setQuickDates({
      today: todayIso,
      tomorrow: tomorrow.toISOString().slice(0, 10),
      weekend: weekend.toISOString().slice(0, 10),
      month: monthAhead.toISOString().slice(0, 10),
    });
  }, []);

  // Mascot & Route Gear State ('default' initially, then 'fast' | 'safe' | 'economy')
  const [activeGear, setActiveGear] = useState<MascotGear>('default');
  const [selectedRouteType, setSelectedRouteType] = useState<'fast' | 'safe' | 'economy'>('safe');
  const [queenSectionGear, setQueenSectionGear] = useState<'safe' | 'fast' | 'economy'>('safe');
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    fast?: TransitRoutePlan;
    safe?: TransitRoutePlan;
    economy?: TransitRoutePlan;
  }>({});

  // Passive 60fps Scroll Tour Engine
  const { scrollProgress, activeChapter, isCompanionVisible, prefersReducedMotion } =
    useScrollHiveTour();

  // Pure derived gear: dynamically resolves gear for hero, queens, transit, and ecosystem without cascading renders
  const effectiveGear: MascotGear = isManualOverride
    ? activeGear
    : activeChapter === 'queens'
    ? queenSectionGear
    : activeChapter === 'providers'
    ? 'default'
    : activeChapter === 'ecosystem'
    ? 'economy'
    : hasSearched
    ? selectedRouteType
    : activeGear;

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
    const { fast, safe, economy } = selectTrifectaPlans(plans);

    setSearchResults({ fast, safe, economy });
    setHasSearched(true);

    // When search runs, default to safe route and switch mascot gear immediately!
    setSelectedRouteType('safe');
    setActiveGear('safe');
    setIsManualOverride(false);
  };

  const handleSelectRouteType = (type: 'fast' | 'safe' | 'economy') => {
    setSelectedRouteType(type);
    setActiveGear(type);
    setIsManualOverride(false);
  };

  const handleResetSearch = () => {
    setHasSearched(false);
    setActiveGear('default');
    setIsManualOverride(false);
    setError(null);
  };

  const handleSelectManualGear = (gear: MascotGear) => {
    setActiveGear(gear);
    setIsManualOverride(true);
    if (gear !== 'default') {
      setSelectedRouteType(gear);
    }
  };

  const handleResetAutoMode = () => {
    setIsManualOverride(false);
    if (activeChapter === 'queens') {
      setActiveGear(queenSectionGear);
    } else if (activeChapter === 'providers') {
      setActiveGear('default');
    } else if (activeChapter === 'ecosystem') {
      setActiveGear('economy');
    } else if (hasSearched) {
      setActiveGear(selectedRouteType);
    } else {
      setActiveGear('default');
    }
  };

  const handleSelectQueen = (gear: 'safe' | 'fast' | 'economy') => {
    setQueenSectionGear(gear);
    if (!isManualOverride) {
      setActiveGear(gear);
    }
  };

  const handleScrollToHero = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
      // Focus origin input for immediate search interaction
      const originInput = document.getElementById('hero-origin-input');
      if (originInput) {
        originInput.focus();
      }
    }
  };

  const handleBookSelectedRoute = () => {
    const pillarParam = 
      selectedRouteType === 'fast' ? 'FASTEST' : 
      selectedRouteType === 'safe' ? 'MOST_RELIABLE' : 'BEST_VALUE';

    const queryParams = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
      pillar: pillarParam,
      date: travelDate,
    });
    router.push(`/trips?${queryParams.toString()}`);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-start items-center overflow-x-hidden">
      {/* ========================================================= */}
      {/* AMBIENT BACKGROUND: Scaled-up flying bee with mouse follow */}
      {/* ========================================================= */}
      <BackgroundBee gear={effectiveGear} />

      {/* ========================================================= */}
      {/* VIEWPORT 1: FROZEN JUMP-INTO-ACTION HERO SECTION          */}
      {/* ========================================================= */}
      <section
        id="section-hero"
        aria-label="Corridor Search Hero"
        className="relative w-full min-h-[calc(100dvh-4rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-5"
      >
        <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center text-center my-auto px-2">
          
          {/* App Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-950 tracking-tight mb-2">
            Beeline
          </h1>

          {/* Disruptive Headline */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Romanian Transit is Chaotic.{' '}
            <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 bg-clip-text text-transparent">
              We Made It Effortless.
            </span>
          </h2>

          {/* Disruptive Value Proposition Message */}
          <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-xl leading-relaxed text-center">
            Stop gambling on delayed CFR trains, delayed InterRegio trains, tight junction transfers, and single-track bottlenecks. 
            Beeline synchronizes Romania&apos;s national and private rail operators with real-time ML delay prediction and algorithmic transfer shields.
          </p>

          {/* MAIN INTERACTIVE CARD: SEARCH OR ROUTE TRIFECTA */}
          <div className="mt-5 w-full text-left">
            {!hasSearched ? (
              /* State 1: Initial Search Form */
              <BaseCard variant="elevated" className="honey-shimmer-card p-4 sm:p-5 border border-amber-200/90 shadow-lg bg-white/95 backdrop-blur-sm">
                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="relative flex flex-col sm:flex-row items-center gap-2">
                    <div className="w-full">
                      <StationAutocompleteInput
                        id="hero-origin-input"
                        label="DEPARTURE ORIGIN"
                        placeholder="e.g. Galați, București Nord..."
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        onClear={() => setOrigin('')}
                        excludeStationName={destination}
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
                      <StationAutocompleteInput
                        id="hero-destination-input"
                        label="ARRIVAL DESTINATION"
                        placeholder="e.g. Brașov, Cluj-Napoca..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        onClear={() => setDestination('')}
                        excludeStationName={origin}
                        leftIcon={<MapPin className="w-4 h-4 text-amber-600" />}
                      />
                    </div>
                  </div>

                  {/* Travel Date Selector & Quick Pills */}
                  <div className="pt-1 space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label htmlFor="hero-date-input" className="text-[11px] font-bold text-stone-700 tracking-wider uppercase flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        TRAVEL DATE
                      </label>
                      <div
                        data-testid="provider-booking-badge"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CFR SA / IRIS Verified Booking Window: 90 Days • Timetable 2025-2026 / 2026-2027
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        id="hero-date-input"
                        data-testid="travel-date-picker"
                        type="date"
                        min={todayStr}
                        max={maxDateStr}
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full sm:w-44 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          data-testid="date-pill-today"
                          onClick={() => setTravelDate(quickDates.today)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            travelDate === quickDates.today
                              ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                              : 'bg-stone-100 text-stone-700 hover:bg-amber-100 border border-stone-200'
                          }`}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          data-testid="date-pill-tomorrow"
                          onClick={() => setTravelDate(quickDates.tomorrow)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            travelDate === quickDates.tomorrow
                              ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                              : 'bg-stone-100 text-stone-700 hover:bg-amber-100 border border-stone-200'
                          }`}
                        >
                          Tomorrow
                        </button>
                        <button
                          type="button"
                          data-testid="date-pill-weekend"
                          onClick={() => setTravelDate(quickDates.weekend)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            travelDate === quickDates.weekend
                              ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                              : 'bg-stone-100 text-stone-700 hover:bg-amber-100 border border-stone-200'
                          }`}
                        >
                          This Weekend
                        </button>
                        <button
                          type="button"
                          data-testid="date-pill-month"
                          onClick={() => setTravelDate(quickDates.month)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            travelDate === quickDates.month
                              ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                              : 'bg-stone-100 text-stone-700 hover:bg-amber-100 border border-stone-200'
                          }`}
                        >
                          +1 Month
                        </button>
                      </div>
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
                        className="honey-corridor-pill px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
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
              /* State 2: Post-Search Route Selector */
              <BaseCard variant="elevated" className="honey-shimmer-card p-4 sm:p-5 border border-amber-300 shadow-lg bg-white/95">
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
                    {searchResults.safe?.riskAnalysis?.isMlComputed && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {(searchResults.safe.riskAnalysis.expectedDelayMinutes ?? 0) > 0
                            ? `⏱️ +${searchResults.safe.riskAnalysis.expectedDelayMinutes}m expected delay`
                            : '✅ On Time'}
                        </span>
                        {searchResults.safe.riskAnalysis.missedConnectionProbability !== undefined && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            🛡️ {Math.round((1 - searchResults.safe.riskAnalysis.missedConnectionProbability) * 100)}% connection guarantee
                          </span>
                        )}
                      </div>
                    )}
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
                    {searchResults.fast?.riskAnalysis?.isMlComputed && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {(searchResults.fast.riskAnalysis.expectedDelayMinutes ?? 0) > 0
                            ? `⏱️ +${searchResults.fast.riskAnalysis.expectedDelayMinutes}m expected delay`
                            : '✅ On Time'}
                        </span>
                        {searchResults.fast.riskAnalysis.missedConnectionProbability !== undefined && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            🛡️ {Math.round((1 - searchResults.fast.riskAnalysis.missedConnectionProbability) * 100)}% connection guarantee
                          </span>
                        )}
                      </div>
                    )}
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
                    {searchResults.economy?.riskAnalysis?.isMlComputed && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {(searchResults.economy.riskAnalysis.expectedDelayMinutes ?? 0) > 0
                            ? `⏱️ +${searchResults.economy.riskAnalysis.expectedDelayMinutes}m expected delay`
                            : '✅ On Time'}
                        </span>
                        {searchResults.economy.riskAnalysis.missedConnectionProbability !== undefined && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            🛡️ {Math.round((1 - searchResults.economy.riskAnalysis.missedConnectionProbability) * 100)}% connection guarantee
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-2 text-xs font-bold text-amber-700">
                      {searchResults.economy?.fare?.totalAmountLei 
                        ? `${searchResults.economy.fare.totalAmountLei.toFixed(2)} LEI` 
                        : '24.50 LEI'}
                    </div>
                  </div>
                </div>

                {/* Booking CTA Button */}
                <BaseButton
                  data-testid="book-selected-route-cta"
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
      </section>

      {/* ========================================================= */}
      {/* BELOW THE FOLD: "THE LIVING HIVE TOUR" SCROLLYTELLING     */}
      {/* ========================================================= */}
      <div className="relative w-full z-10 flex flex-col items-center">
        {/* Dynamic Curved Golden Dotted Flight Trail running behind chapters */}
        <div
          className="absolute inset-0 pointer-events-none select-none overflow-hidden -z-10"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1200 2400"
            preserveAspectRatio="none"
            className="w-full h-full opacity-30"
          >
            <defs>
              <linearGradient id="tourFlightTrailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                <stop offset="30%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path
              d="M 980 50 Q 820 400 920 700 T 300 1300 T 920 1800 T 600 2350"
              fill="none"
              stroke="url(#tourFlightTrailGrad)"
              strokeWidth="3.5"
              strokeDasharray="8 8"
            />
          </svg>
        </div>

        {/* CHAPTER 1: The Three Queen Bees & Their Hive Swarms */}
        <QueenBeesSection
          activeGear={effectiveGear}
          onSelectQueen={handleSelectQueen}
        />

        {/* CHAPTER 2: The Synchronized Transit Honeycomb */}
        <TransitHoneycombSection />

        {/* CHAPTER 3: Inside The Cozy Hive (Props & Bottom Action CTA) */}
        <CozyHiveSection
          onScrollToHero={handleScrollToHero}
          scrollProgress={scrollProgress}
        />
      </div>

      {/* ========================================================= */}
      {/* INTERACTIVE SCROLL COMPANION MASCOT & SPEECH BUBBLE       */}
      {/* ========================================================= */}
      <ScrollCompanionMascot
        activeChapter={activeChapter}
        companionGear={effectiveGear}
        isVisible={isCompanionVisible}
        scrollProgress={scrollProgress}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Discrete Testing/Debug Tools Trigger */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40">
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
          {isManualOverride && (
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
        currentGear={effectiveGear}
        onSelectGear={handleSelectManualGear}
        onResetAuto={handleResetAutoMode}
        isManualOverride={isManualOverride}
      />
    </div>
  );
}
