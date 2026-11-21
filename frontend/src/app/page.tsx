'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftRight, 
  Search, 
  MapPin, 
  Calendar,
  ArrowUp
} from 'lucide-react';
import MascotBee, { MascotGear } from '../components/MascotBee';
import BaseButton from '../components/BaseButton';
import BaseCard from '../components/BaseCard';
import StationAutocompleteInput from '../components/StationAutocompleteInput';
import HomePageGhostSkeleton from '../components/HomePageGhostSkeleton';
import { stationAutocompleteService } from '../services/stationAutocompleteService';
import {
  useScrollHiveTour,
  QueenBeesSection,
  TransitHoneycombSection,
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

interface PrefMiniBeeIconProps {
  variant: 'safe' | 'fast' | 'economy';
  isActive?: boolean;
  className?: string;
}

/**
 * Minimalist Flat Vector Mini-Bee Icon (Option 3: Mini-Bee Accent)
 * Clean, calm, centered 20x20 inline SVG with soft translucent wings,
 * tiny antennas, and cute striped bee body tinted to each pillar's Cozy Hive signature color.
 */
function PrefMiniBeeIcon({
  variant,
  isActive = false,
  className = '',
}: PrefMiniBeeIconProps) {
  const palette = {
    safe: {
      body: '#10B981',
      stripe: '#047857',
      wing: '#A7F3D0',
    },
    fast: {
      body: '#3B82F6',
      stripe: '#1D4ED8',
      wing: '#BFDBFE',
    },
    economy: {
      body: '#D97706',
      stripe: '#92400E',
      wing: '#FDE68A',
    },
  }[variant];

  const clipId = `pref-bee-clip-${variant}`;

  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-5 h-5 shrink-0 ${
        isActive
          ? 'opacity-100 scale-105 transition-transform duration-200'
          : 'opacity-75 group-hover:opacity-100 transition-opacity duration-200'
      } ${className}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="10" cy="11.5" rx="5.2" ry="3.8" />
        </clipPath>
      </defs>

      {/* 1. Soft Translucent Wings */}
      <ellipse
        cx="7.8"
        cy="6"
        rx="3.2"
        ry="2"
        fill={palette.wing}
        fillOpacity="0.75"
        transform="rotate(-26 7.8 6)"
      />
      <ellipse
        cx="11.2"
        cy="5.6"
        rx="3.5"
        ry="2.1"
        fill={palette.wing}
        fillOpacity="0.88"
        transform="rotate(-8 11.2 5.6)"
      />

      {/* 2. Tiny Antennas */}
      <path
        d="M12.8 8 C13.4 6.2 14.8 5.6 15.6 5.8"
        stroke={palette.stripe}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="15.6" cy="5.8" r="0.6" fill={palette.stripe} />

      {/* Tiny Stinger Accent */}
      <path
        d="M4.8 11.5 L3.2 10.9 L3.2 12.1 Z"
        fill={palette.stripe}
      />

      {/* 3. Striped Bee Body */}
      <ellipse
        cx="10"
        cy="11.5"
        rx="5.2"
        ry="3.8"
        fill={palette.body}
      />
      <g clipPath={`url(#${clipId})`}>
        <rect x="7.8" y="6.5" width="1.6" height="10" fill={palette.stripe} />
        <rect x="10.8" y="6.5" width="1.6" height="10" fill={palette.stripe} />
      </g>

      {/* Cute Little Eye */}
      <circle cx="13.4" cy="10.4" r="0.8" fill="#1E1B18" />
      <circle cx="13.7" cy="10.1" r="0.28" fill="#FFFFFF" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();

  // Search State
  const [origin, setOrigin] = useState<string>('Galați');
  const [destination, setDestination] = useState<string>('București Nord');
  const [error, setError] = useState<string | null>(null);

  const [todayStr, setTodayStr] = useState<string>('');
  const [maxDateStr, setMaxDateStr] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    setTodayStr(todayIso);
    setTravelDate((prev) => prev || todayIso);

    const maxD = new Date();
    maxD.setDate(maxD.getDate() + 90);
    setMaxDateStr(maxD.toISOString().slice(0, 10));
  }, []);

  // First-Render Initial Loading State
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
    () => process.env.NODE_ENV !== 'test'
  );

  useEffect(() => {
    if (!isInitialLoading) return;

    let isMounted = true;
    let minTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let minElapsed = false;
    let catalogDone = false;

    const finishLoading = () => {
      if (!isMounted) return;
      setIsInitialLoading(false);
    };

    minTimer = setTimeout(() => {
      minElapsed = true;
      if (catalogDone) {
        finishLoading();
      }
    }, 320);

    maxTimer = setTimeout(() => {
      finishLoading();
    }, 700);

    stationAutocompleteService
      .loadCatalog()
      .catch(() => {})
      .finally(() => {
        catalogDone = true;
        if (minElapsed) {
          finishLoading();
        }
      });

    return () => {
      isMounted = false;
      if (minTimer) clearTimeout(minTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };
  }, [isInitialLoading]);

  const showGhostLayout = isInitialLoading;

  // Mascot & Route Gear State ('default' initially, then 'fast' | 'safe' | 'economy')
  const [activeGear, setActiveGear] = useState<MascotGear>('default');
  const [selectedRouteType, setSelectedRouteType] = useState<'fast' | 'safe' | 'economy'>('safe');
  const [queenSectionGear, setQueenSectionGear] = useState<'safe' | 'fast' | 'economy'>('safe');

  // Passive 60fps Scroll Tour Engine
  const { activeChapter, prefersReducedMotion } = useScrollHiveTour();

  // Pure derived gear: dynamically resolves gear for hero, queens, and transit without cascading renders
  const effectiveGear: MascotGear =
    activeChapter === 'queens'
      ? queenSectionGear
      : activeChapter === 'providers'
      ? 'default'
      : activeGear;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setError(null);
  };

  const handleSelectPreference = (type: 'fast' | 'safe' | 'economy') => {
    setSelectedRouteType(type);
    setActiveGear(type);
  };

  const handlePreferenceKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentType: 'safe' | 'fast' | 'economy'
  ) => {
    const preferences: Array<'safe' | 'fast' | 'economy'> = ['safe', 'fast', 'economy'];
    const currentIndex = preferences.indexOf(currentType);
    let targetIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % preferences.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + preferences.length) % preferences.length;
    }

    if (targetIndex >= 0) {
      const nextPref = preferences[targetIndex];
      handleSelectPreference(nextPref);
      const testId =
        nextPref === 'safe'
          ? 'pref-protected'
          : nextPref === 'fast'
          ? 'pref-fast'
          : 'pref-eco';
      const el = document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
      el?.focus();
    }
  };

  const handlePrevDay = () => {
    if (!travelDate || travelDate <= todayStr) return;
    const cur = new Date(travelDate);
    cur.setDate(cur.getDate() - 1);
    const prevStr = cur.toISOString().slice(0, 10);
    if (prevStr >= todayStr) {
      setTravelDate(prevStr);
    }
  };

  const handleNextDay = () => {
    if (!travelDate || travelDate >= maxDateStr) return;
    const cur = new Date(travelDate);
    cur.setDate(cur.getDate() + 1);
    const nextStr = cur.toISOString().slice(0, 10);
    if (nextStr <= maxDateStr) {
      setTravelDate(nextStr);
    }
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

    const pillarParam =
      selectedRouteType === 'fast'
        ? 'FASTEST'
        : selectedRouteType === 'economy'
        ? 'BEST_VALUE'
        : 'MOST_RELIABLE';

    const queryParams = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
      date: travelDate,
      pillar: pillarParam,
    });
    router.push(`/trips?${queryParams.toString()}`);
  };

  const handleSelectQueen = (gear: 'safe' | 'fast' | 'economy') => {
    setQueenSectionGear(gear);
    setActiveGear(gear);
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

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-start items-center overflow-x-hidden">
      {/* ========================================================= */}
      {/* AMBIENT BACKGROUND: Scaled-up flying bee with mouse follow */}
      {/* ========================================================= */}
      <BackgroundBee gear={effectiveGear} />

      {showGhostLayout ? (
        <HomePageGhostSkeleton />
      ) : (
        <div className="w-full flex flex-col items-center animate-fade-in">
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

          {/* MAIN INTERACTIVE CARD: SEARCH FORM */}
          <div className="mt-5 w-full text-left">
            <BaseCard variant="elevated" className="honey-shimmer-card p-4 sm:p-5 border border-amber-200/90 shadow-lg bg-white/95 backdrop-blur-sm overflow-visible">
                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="relative z-30 flex flex-col sm:flex-row items-center gap-2">
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

                  {/* Travel Date Selector with Compact − / + Stepper */}
                  <div className="relative z-10 pt-1 space-y-1.5">
                    <label
                      htmlFor="hero-date-input"
                      className="text-[11px] font-bold text-stone-700 tracking-wider uppercase flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      TRAVEL DATE
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="date-step-prev"
                        aria-label="Previous day"
                        disabled={!travelDate || travelDate <= todayStr}
                        onClick={handlePrevDay}
                        className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 font-bold text-sm hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                      >
                        −
                      </button>

                      <input
                        id="hero-date-input"
                        data-testid="travel-date-picker"
                        type="date"
                        min={todayStr}
                        max={maxDateStr}
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full sm:w-48 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />

                      <button
                        type="button"
                        data-testid="date-step-next"
                        aria-label="Next day"
                        disabled={!travelDate || travelDate >= maxDateStr}
                        onClick={handleNextDay}
                        className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 font-bold text-sm hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Compact Route Preference Selector */}
                  <div className="relative z-10 pt-1">
                    <label className="text-[11px] font-bold text-stone-700 tracking-wider uppercase block mb-1.5">
                      ROUTE PREFERENCE
                    </label>
                    <div
                      data-testid="hero-preference-selector"
                      role="radiogroup"
                      aria-label="Route preference"
                      className="rounded-full p-1 grid grid-cols-3 gap-1 bg-[#FAF4E8]/85 border border-[#F3E8D2]/70"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRouteType === 'safe'}
                        data-testid="pref-protected"
                        onClick={() => handleSelectPreference('safe')}
                        onKeyDown={(e) => handlePreferenceKeyDown(e, 'safe')}
                        className={`group relative py-2 px-2.5 sm:px-3 rounded-full text-xs flex items-center justify-center gap-1.5 select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/35 transition-all duration-200 ${
                          selectedRouteType === 'safe'
                            ? 'bg-white text-[#1E1B18] font-semibold border border-transparent shadow-[0_2px_8px_-1px_rgba(120,82,25,0.10),0_1px_2px_rgba(120,82,25,0.05)]'
                            : 'bg-transparent border border-transparent text-[#78716C] hover:text-[#1E1B18] hover:bg-white/45 font-medium'
                        }`}
                      >
                        <PrefMiniBeeIcon variant="safe" isActive={selectedRouteType === 'safe'} />
                        <span>Protected</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRouteType === 'fast'}
                        data-testid="pref-fast"
                        onClick={() => handleSelectPreference('fast')}
                        onKeyDown={(e) => handlePreferenceKeyDown(e, 'fast')}
                        className={`group relative py-2 px-2.5 sm:px-3 rounded-full text-xs flex items-center justify-center gap-1.5 select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/35 transition-all duration-200 ${
                          selectedRouteType === 'fast'
                            ? 'bg-white text-[#1E1B18] font-semibold border border-transparent shadow-[0_2px_8px_-1px_rgba(120,82,25,0.10),0_1px_2px_rgba(120,82,25,0.05)]'
                            : 'bg-transparent border border-transparent text-[#78716C] hover:text-[#1E1B18] hover:bg-white/45 font-medium'
                        }`}
                      >
                        <PrefMiniBeeIcon variant="fast" isActive={selectedRouteType === 'fast'} />
                        <span>Fast</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRouteType === 'economy'}
                        data-testid="pref-eco"
                        onClick={() => handleSelectPreference('economy')}
                        onKeyDown={(e) => handlePreferenceKeyDown(e, 'economy')}
                        className={`group relative py-2 px-2.5 sm:px-3 rounded-full text-xs flex items-center justify-center gap-1.5 select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/40 transition-all duration-200 ${
                          selectedRouteType === 'economy'
                            ? 'bg-white text-[#1E1B18] font-semibold border border-transparent shadow-[0_2px_8px_-1px_rgba(120,82,25,0.10),0_1px_2px_rgba(120,82,25,0.05)]'
                            : 'bg-transparent border border-transparent text-[#78716C] hover:text-[#1E1B18] hover:bg-white/45 font-medium'
                        }`}
                      >
                        <PrefMiniBeeIcon variant="economy" isActive={selectedRouteType === 'economy'} />
                        <span>Eco</span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}

                  {/* Popular Romanian Corridors */}
                  <div className="relative z-10 flex items-center gap-1.5 flex-wrap pt-0.5">
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
                  <div className="relative z-10 pt-1">
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
            viewBox="0 0 1200 1800"
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
              d="M 980 50 Q 820 400 920 700 T 300 1300 T 600 1750"
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

        {/* Minimal Jump-Back-To-Hero Action Button */}
        <div className="w-full max-w-xl mx-auto text-center pt-8 pb-16 px-4">
          <BaseButton
            type="button"
            onClick={handleScrollToHero}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto px-8 py-3.5 text-stone-950 font-extrabold bg-amber-500 hover:bg-amber-400 shadow-lg text-sm sm:text-base transition-all hover:scale-105 active:scale-95"
            leftIcon={<ArrowUp className="w-4 h-4" />}
          >
            Plan Your Route Now
          </BaseButton>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}
