'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import MascotBee, { MascotGear } from '../MascotBee';
import MiniWorkerBee from './MiniWorkerBee';
import { RoyalCrownSvg } from './HiveSvgProps';

export interface QueenBeesSectionProps {
  activeGear?: MascotGear;
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
  onSelectGear?: (gear: 'safe' | 'fast' | 'economy') => void;
}

export type Chapter1QueenGear = 'safe' | 'fast' | 'economy';
type QueenGear = Chapter1QueenGear;

interface QueenSanctuaryConfig {
  gear: QueenGear;
  name: string;
  roleTitle: string;
  title: string;
  romanianTitle: string;
  badge: string;
  color: string;
  glowHex: string;
  borderColor: string;
  bgLight: string;
  subtitle: string;
  headlinePromise: string;
  humanOutcome: string;
  description: string;
  keyFeatures: string[];
  heroMetric: string;
  heroDetail: string;
  testId: string;
  openPortalTestId: string;
}

const QUEENS_CONFIG: Record<QueenGear, QueenSanctuaryConfig> = {
  safe: {
    gear: 'safe',
    name: 'Queen Meli',
    roleTitle: 'Queen Transfer Guard',
    title: 'Queen Meli • Queen Transfer Guard',
    romanianTitle: 'Queen Meli — Royal Transfer Shield',
    badge: 'ZERO TRANSFER PANIC',
    color: '#10B981',
    glowHex: '#10B981',
    borderColor: 'border-emerald-400',
    bgLight: 'bg-emerald-50/70',
    subtitle: 'Built-In Platform Delay Buffer & Stress-Free Connections',
    headlinePromise: 'Always Arrive On Time. Built-In Cushion for Any Delay.',
    humanOutcome:
      'Never sprint breathlessly between train platforms. Queen Meli automatically builds extra breathing room into every transfer so you arrive on time even when another train runs late.',
    description:
      'Travel with zero panic. Queen Meli guarantees realistic platform walking cushions and protective transfer buffers, so you can grab a coffee and stroll calmly without worrying about delayed connections.',
    keyFeatures: [
      'Generous walking cushion between platforms',
      'Never sprint with heavy bags or worry about delays',
      'Guaranteed 100% on-time arrival at your destination',
    ],
    heroMetric: '+20m Cushion',
    heroDetail: 'Built-In Delay Protection Buffer',
    testId: 'queen-card-safe',
    openPortalTestId: 'open-portal-safe',
  },
  fast: {
    gear: 'fast',
    name: 'Queen Vira',
    roleTitle: 'Queen Express Scout',
    title: 'Queen Vira • Queen Express Scout',
    romanianTitle: 'Queen Vira — Supersonic Express Scout',
    badge: 'SUPERSONIC DIRECT EXPRESS',
    color: '#3B82F6',
    glowHex: '#3B82F6',
    borderColor: 'border-blue-400',
    bgLight: 'bg-blue-50/70',
    subtitle: 'Direct Non-Stop Corridors That Skip Village Halts',
    headlinePromise: 'There Is Simply No Faster Route From A to B.',
    humanOutcome:
      'Direct Point A to Point B express flight that skips all intermediate stops. Maximum velocity with zero wasted minutes.',
    description:
      'Why waste half your day crawling between tiny intermediate halts? Queen Vira identifies direct high-speed express corridors that bypass bottlenecks and get you straight to your destination in record time.',
    keyFeatures: [
      'Direct Point A to Point B non-stop express',
      'Skips all 5 intermediate stops with 0 wasted minutes',
      'Saves up to 55 minutes compared to standard lines',
    ],
    heroMetric: '-55 Minutes',
    heroDetail: 'Non-Stop Direct Velocity Saved',
    testId: 'queen-card-fast',
    openPortalTestId: 'open-portal-fast',
  },
  economy: {
    gear: 'economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    title: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Queen Flora — Smart Fare Harvester',
    badge: 'BEST VALUE NECTAR',
    color: '#D97706',
    glowHex: '#F59E0B',
    borderColor: 'border-amber-400',
    bgLight: 'bg-amber-50/70',
    subtitle: 'Calm Unhurried Stops & Maximum Ticket Savings',
    headlinePromise: 'Calm, Unrushed Journey with Longer Stops When You Have No Deadline.',
    humanOutcome:
      'Enjoy a scenic, peaceful journey with longer stops to stretch and relax, while keeping the most money in your pocket.',
    description:
      'When you are not in a rush, travel peacefully. Queen Flora finds gentle, scenic routes with relaxed 10–15 minute stops at every station and the lowest possible ticket fares for the exact same track.',
    keyFeatures: [
      'Longer 10–15 min calm stops to stretch and enjoy the view',
      'Travel when you have no tight deadline and save money',
      'Save up to 40% on ticket fares for the exact same track',
    ],
    heroMetric: 'Save 40%',
    heroDetail: 'Most Money in Your Pocket',
    testId: 'queen-card-economy',
    openPortalTestId: 'open-portal-economy',
  },
};

// 7 Generic Stations from Point A to Point B (All rendered as clear visual SVG Beehive route landmarks)
interface BeehiveStationInfo {
  id: string;
  name: string;
  shortName: string;
  role: string;
}

const BEEHIVE_STATIONS: BeehiveStationInfo[] = [
  {
    id: 'origin',
    name: 'Point A • Origin Hive',
    shortName: 'Point A',
    role: 'Departure Hub',
  },
  {
    id: 'meadow-vale',
    name: 'Meadow Vale Hive',
    shortName: 'Meadow Vale',
    role: 'Stop 1 • Wildflower Valley',
  },
  {
    id: 'sunny-creek',
    name: 'Sunny Creek Hive',
    shortName: 'Sunny Creek',
    role: 'Stop 2 • Honey Creek',
  },
  {
    id: 'central-junction',
    name: 'Central Junction Hive',
    shortName: 'Central Junction',
    role: 'Main Transfer Hive',
  },
  {
    id: 'amber-ridge',
    name: 'Amber Ridge Hive',
    shortName: 'Amber Ridge',
    role: 'Stop 4 • Mountain Pass',
  },
  {
    id: 'orchard-valley',
    name: 'Orchard Valley Hive',
    shortName: 'Orchard Valley',
    role: 'Stop 5 • Apple Blossoms',
  },
  {
    id: 'destination',
    name: 'Point B • Destination Hive',
    shortName: 'Point B',
    role: 'Arrival Hub',
  },
];

// Floating Relaxed Stop Badges for Queen Flora (Economy) intermediate beehives
const FLORA_RELAXED_PILLS: (string | null)[] = [
  null,
  '☕ +12m Relaxed Stop',
  '🌿 +15m Scenic Break',
  '🍯 +15m Relaxed Pause',
  '☕ +10m Stretch Legs',
  '🍯 +12m Unrushed Stop',
  null,
];

// SVG Route Paths & Animation Flight Durations for Unified Bee Locomotive
const PREVIEW_PATHS: Record<QueenGear, string> = {
  safe: 'M 90 135 L 910 135',
  fast: 'M 90 155 Q 500 25 910 155',
  economy: 'M 90 150 L 230 115 L 370 160 L 500 115 L 630 160 L 770 115 L 910 150',
};

const FLIGHT_DURATIONS: Record<QueenGear, string> = {
  safe: '5.5s',
  fast: '2.4s',
  economy: '8.5s',
};

export const QueenBeesSection: React.FC<QueenBeesSectionProps> = ({
  activeGear = 'safe',
  onSelectQueen,
  onSelectGear,
}) => {
  const idPrefix = useId().replace(/:/g, '');
  const previewRef = useRef<HTMLDivElement>(null);

  // Active Queen state
  const [selectedQueen, setSelectedQueen] = useState<QueenGear>(
    activeGear === 'fast' || activeGear === 'economy' ? activeGear : 'safe'
  );
  const [hoveredQueen, setHoveredQueen] = useState<QueenGear | null>(null);

  // Accessibility: prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, []);

  // Sync internal state when activeGear prop updates externally
  useEffect(() => {
    if (activeGear === 'safe' || activeGear === 'fast' || activeGear === 'economy') {
      setSelectedQueen(activeGear);
    }
  }, [activeGear]);

  // Handle Queen selection
  const handleSelect = (gear: QueenGear) => {
    setSelectedQueen(gear);
    if (onSelectQueen) onSelectQueen(gear);
    if (onSelectGear) onSelectGear(gear);
  };

  // Open Portal Handler: select Queen + smooth scroll to Route Preview Map
  const handleOpenPortal = (gear: QueenGear) => {
    handleSelect(gear);
    if (typeof window !== 'undefined' && previewRef.current) {
      if (typeof previewRef.current.scrollIntoView === 'function') {
        previewRef.current.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    }
  };

  // -------------------------------------------------------------
  // Interactive Simulation States on Route Preview Map
  // -------------------------------------------------------------
  // Safe Mode: 'ontime' | 'delay15' (Delay Buffer Simulation)
  const [safeDelayScenario, setSafeDelayScenario] = useState<'ontime' | 'delay15'>('ontime');

  const activeQueenConfig = QUEENS_CONFIG[selectedQueen];

  // Dynamic station coordinates for each Queen plan (1000 x 260 space)
  const getStationCoords = (index: number, queen: QueenGear) => {
    const xCoords = [90, 230, 370, 500, 630, 770, 910];
    const x = xCoords[index];
    if (queen === 'safe') {
      return { x, y: 135 };
    }
    if (queen === 'fast') {
      // Point A & Point B at high express departure/arrival (y: 165); 5 intermediate hives at y: 190
      return { x, y: index === 0 || index === 6 ? 165 : 190 };
    }
    // Queen Flora: Gentle wave [150, 115, 160, 115, 160, 115, 150]
    const yValues = [150, 115, 160, 115, 160, 115, 150];
    return { x, y: yValues[index] };
  };

  return (
    <section
      id="tour-queens"
      aria-label="The Three Queen Bees and Their Hive Swarms"
      className="relative w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. SECTION HEADER (CHAPTER 1 • THE ROYAL HIVES)               */}
      {/* ------------------------------------------------------------- */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>CHAPTER 1 • THE ROYAL HIVES</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
          The Three Queen Bees &amp; Their Hive Swarms
        </h3>
        <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
          In the Beeline hive, three specialized Queen Bees —{' '}
          <strong>Queen Meli</strong>, <strong>Queen Vira</strong>, and{' '}
          <strong>Queen Flora</strong> — command dedicated swarms of minimalist worker bees to
          optimize every railway journey across Romania.
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. THREE QUEEN HEXAGONAL SANCTUARIES (3-COLUMN GRID)          */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-10">
        {(['safe', 'fast', 'economy'] as QueenGear[]).map((gear) => {
          const queen = QUEENS_CONFIG[gear];
          const isSelected = selectedQueen === gear;
          const isHovered = hoveredQueen === gear;

          return (
            <div
              key={gear}
              data-testid={queen.testId}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleSelect(gear)}
              onMouseEnter={() => setHoveredQueen(gear)}
              onMouseLeave={() => setHoveredQueen(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(gear);
                }
              }}
              className={`group relative flex flex-col cursor-pointer rounded-3xl p-6 sm:p-7 transition-all duration-300 select-none ${
                isSelected
                  ? 'bg-amber-50/90 backdrop-blur-md border-2 shadow-2xl scale-102 ring-4 ring-amber-400/30'
                  : 'bg-amber-50/50 backdrop-blur-xs border border-amber-300/60 shadow-md hover:bg-amber-50/80 hover:scale-101 hover:shadow-lg'
              }`}
              style={{
                borderColor: isSelected ? queen.color : undefined,
              }}
            >
              {/* Radial Aura Glow behind the Queen */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300 opacity-20 group-hover:opacity-35"
                style={{
                  background: `radial-gradient(circle at 50% 25%, ${queen.glowHex} 0%, transparent 70%)`,
                }}
              />

              {/* Floating Crown + Mascot Chamber with 5 Orbiting Mini Worker Bees */}
              <div className="relative flex flex-col items-center justify-center pt-2 pb-4">
                {/* Floating Crown SVG */}
                <div className="mb-1 transform transition-transform duration-300 group-hover:-translate-y-1">
                  <RoyalCrownSvg size={30} />
                </div>

                {/* Queen Mascot Bee */}
                <div className="relative">
                  <MascotBee
                    gear={gear}
                    size="xl"
                    animated={isSelected || isHovered}
                    accessibilityLabel={`${queen.name} Mascot`}
                  />

                  {/* 5 Orbiting Mini Worker Bees with data-mini-bee-variant */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-2 -left-3">
                      <MiniWorkerBee variant={gear} size={15} delayMs={0} />
                    </div>
                    <div className="absolute -top-1 -right-4">
                      <MiniWorkerBee variant={gear} size={14} delayMs={250} />
                    </div>
                    <div className="absolute top-1/2 -left-5">
                      <MiniWorkerBee variant={gear} size={16} delayMs={500} />
                    </div>
                    <div className="absolute top-1/2 -right-5">
                      <MiniWorkerBee variant={gear} size={15} delayMs={750} />
                    </div>
                    <div className="absolute -bottom-2 left-1/4">
                      <MiniWorkerBee variant={gear} size={14} delayMs={1000} />
                    </div>
                  </div>
                </div>

                {/* Consumer Promise Badge */}
                <div
                  className="mt-4 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs"
                  style={{
                    backgroundColor: `${queen.color}20`,
                    color: queen.color,
                    border: `1px solid ${queen.color}50`,
                  }}
                >
                  {queen.badge}
                </div>
              </div>

              {/* Queen Identity & Headings */}
              <div className="text-center mt-1 mb-2">
                <span className="text-xs font-bold text-amber-900/70 block">{queen.name}</span>
                <h4 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mt-0.5">
                  {queen.roleTitle}
                </h4>
                <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                  {queen.romanianTitle}
                </div>
              </div>

              {/* Marketing Headline (Consumer Hook) */}
              <div className="my-2 p-3 rounded-2xl bg-amber-100/60 border border-amber-300/50 text-center">
                <p className="text-sm font-extrabold text-stone-900 leading-snug">
                  &ldquo;{queen.headlinePromise}&rdquo;
                </p>
                <p className="text-xs text-stone-700 mt-1 leading-relaxed">{queen.humanOutcome}</p>
              </div>

              {/* 3 Consumer Feature Bullets */}
              <div className="mt-2 space-y-1.5 text-xs text-stone-700 px-1 mb-4">
                {queen.keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <Check
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      style={{ color: queen.color }}
                    />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Sanctuary Footer: Metric + Open Portal Button */}
              <div className="mt-auto pt-3 border-t border-amber-200/60 flex items-center justify-between gap-2">
                <div>
                  <span className="text-base font-black text-stone-950 block">
                    {queen.heroMetric}
                  </span>
                  <span className="text-[10px] text-stone-600 font-bold block">
                    {queen.heroDetail}
                  </span>
                </div>

                {/* Open Portal Action Button (Scrolls smoothly to Route Preview Map) */}
                <button
                  type="button"
                  data-testid={queen.openPortalTestId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPortal(gear);
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isSelected
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md ring-2 ring-amber-300 scale-102'
                      : 'bg-amber-200/80 hover:bg-amber-300 text-stone-900 border border-amber-400/50'
                  }`}
                  aria-label={`Open Portal for ${queen.name}`}
                >
                  <span>Open Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SINGLE UNIFIED INTERACTIVE ROUTE PREVIEW (#queen-route-preview) */}
      {/* Vertical 3-row block architecture: NEVER squished or collapsed */}
      {/* ------------------------------------------------------------- */}
      <div
        id="queen-route-preview"
        data-testid="queen-route-preview"
        ref={previewRef}
        className="w-full flex flex-col gap-6 p-6 sm:p-8 rounded-3xl bg-amber-50/90 backdrop-blur-md border-2 border-amber-300/80 shadow-2xl text-stone-900 transition-all duration-300"
      >
        {/* ========================================================= */}
        {/* ROW 1: Full-Width Top Header & Interactive Scenario Switcher */}
        {/* ========================================================= */}
        <div className="w-full flex flex-col gap-4 border-b border-amber-200/70 pb-5">
          {/* Row 1A (Badges Row) */}
          <div className="w-full flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300/80 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              POINT A TO POINT B • INTERACTIVE ROUTE PREVIEW
            </span>
            <span
              className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs"
              style={{
                backgroundColor: `${activeQueenConfig.color}20`,
                color: activeQueenConfig.color,
                border: `1px solid ${activeQueenConfig.color}50`,
              }}
            >
              {selectedQueen === 'economy' ? 'HONEY ROUTE' : `${selectedQueen.toUpperCase()} ROUTE`}
            </span>
          </div>

          {/* Row 1B (Full-Width Headline & Description) */}
          <div className="w-full block">
            <h3 className="text-2xl sm:text-3xl font-black text-stone-900 w-full leading-tight">
              {selectedQueen === 'safe' &&
                'Always Arrive On Time. Built-In Cushion for Any Delay.'}
              {selectedQueen === 'fast' &&
                'There Is Simply No Faster Route From A to B.'}
              {selectedQueen === 'economy' &&
                'Calm, Unrushed Journey with Longer Stops When You Have No Deadline.'}
            </h3>
            <p className="text-sm sm:text-base text-stone-600 w-full max-w-4xl mt-1 leading-relaxed">
              {selectedQueen === 'safe' &&
                'You always arrive on time at Point B—our built-in margin of error automatically accounts for extra buffer time in case another train runs late.'}
              {selectedQueen === 'fast' &&
                'There is simply no faster route from Point A to Point B—fly nonstop past every slow intermediate halt.'}
              {selectedQueen === 'economy' &&
                "A calm, unhurried route with longer stops along the way—built for when you are not in a rush, don't need to arrive by a strict time, and want to pay the lowest price."}
            </p>
          </div>

          {/* Row 1C (Portal Status & Guaranteed Benefits) */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200/60">
            <div className="flex items-center gap-2">
              {selectedQueen === 'safe' && (
                <>
                  <button
                    type="button"
                    data-testid="safe-delay-btn"
                    onClick={() => setSafeDelayScenario('delay15')}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Simulate Delay
                  </button>
                  <button
                    type="button"
                    data-testid="safe-ontime-btn"
                    onClick={() => setSafeDelayScenario('ontime')}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Normal On-Time
                  </button>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Emerald Error-Margin Shield (+20 min Built-In Delay Buffer) Active</span>
                  </div>
                </>
              )}
              {selectedQueen === 'fast' && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>-55 minutes saved • Direct Non-Stop Express</span>
                </div>
              )}
              {selectedQueen === 'economy' && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500 text-stone-950 shadow-xs border border-amber-600/30">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Save up to 40% • Calm Scenic Route</span>
                </div>
              )}
            </div>

            <div className="text-xs font-bold text-stone-500 font-mono">
              {selectedQueen === 'safe' && 'Corridor: Point A ➔ Central Junction ➔ Point B'}
              {selectedQueen === 'fast' && 'Corridor: Point A ⚡ Direct Supersonic Arc ➔ Point B'}
              {selectedQueen === 'economy' && 'Corridor: Point A 🍯 Gentle Honey Route ➔ Point B'}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ROW 2: Dedicated Full-Width SVG Route Map                 */}
        {/* ========================================================= */}
        <div className="w-full rounded-2xl bg-amber-50/60 border border-amber-200/90 p-4 sm:p-6 overflow-hidden">
          <svg
            viewBox="0 0 1000 260"
            width="100%"
            height="260"
            className="w-full h-[220px] sm:h-[260px] block select-none"
            aria-label="Unified Interactive Route Preview"
          >
            <defs>
              <linearGradient id={`${idPrefix}-previewSafe`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>

              <linearGradient id={`${idPrefix}-previewFast`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>

              <linearGradient id={`${idPrefix}-previewEconomy`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              <filter id={`${idPrefix}-arcGlow`} x="-15%" y="-30%" width="130%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ------------------------------------------------------------- */}
            {/* PLAN 1: RELIABILITY (safe — Queen Meli • 100% Emerald Corridor)*/}
            {/* ------------------------------------------------------------- */}
            {selectedQueen === 'safe' && (
              <g>
                {/* Unified 100% Emerald Continuous Rail Track (Point A ➔ Point B) */}
                <path
                  d="M 90 135 L 910 135"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 90 135 L 910 135"
                  fill="none"
                  stroke="#A7F3D0"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  className="animate-track-flow"
                  opacity="0.85"
                />

                {/* Leg 1 Feeder / Absorbed Delay Badge at (280, 90) */}
                <g transform="translate(280, 90)">
                  <rect
                    x="-115"
                    y="-12"
                    width="230"
                    height="24"
                    rx="12"
                    fill="#064E3B"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fill="#A7F3D0"
                    fontSize="9.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    {safeDelayScenario === 'delay15'
                      ? '+15m Delay Absorbed at Junction'
                      : 'LEG 1: FEEDER LINE (Point A ➔ Central Junction)'}
                  </text>
                </g>

                {/* Central Junction Emerald Error-Margin Shield Dome */}
                <g data-testid="emerald-delay-shield">
                  <circle
                    cx="500"
                    cy="135"
                    r="46"
                    fill="#10B981"
                    fillOpacity="0.14"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                  <path
                    d="M 500 108 L 520 122 L 520 144 Q 500 160 480 144 L 480 122 Z"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                  {/* SVG Badge above Central Junction at (500, 62) */}
                  <g transform="translate(500, 62)">
                    <rect
                      x="-110"
                      y="-13"
                      width="220"
                      height="26"
                      rx="13"
                      fill="#059669"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="4.5"
                      fill="#FFFFFF"
                      fontSize="10.5"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      🛡️ +20 min Built-In Delay Buffer
                    </text>
                  </g>
                </g>

                {/* Leg 2 / Destination Badge at (910, 80) */}
                <g transform="translate(910, 80)">
                  <rect
                    x="-60"
                    y="-12"
                    width="120"
                    height="24"
                    rx="12"
                    fill="#059669"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    100% ON TIME
                  </text>
                </g>
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PLAN 2: FAST (fast — Queen Vira • Electric Blue #3B82F6)       */}
            {/* ------------------------------------------------------------- */}
            {selectedQueen === 'fast' && (
              <g>
                {/* Dimmed Faded Lower Track for intermediate 5 hives at y = 190 */}
                <line
                  x1="90"
                  y1="190"
                  x2="910"
                  y2="190"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  opacity="0.32"
                />

                {/* SVG Banner across (500, 232) */}
                <g transform="translate(500, 232)">
                  <rect
                    x="-205"
                    y="-11"
                    width="410"
                    height="22"
                    rx="11"
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="4"
                    fill="#94A3B8"
                    fontSize="9.5"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    5 Intermediate Stops Bypassed • 0 Wasted Time • Skipped • 0 Wasted Stops
                  </text>
                </g>

                {/* Apex Fast Express Badge above the curve (500, 48) */}
                <g transform="translate(500, 48)">
                  <rect
                    x="-145"
                    y="-12"
                    width="290"
                    height="24"
                    rx="12"
                    fill="#1E3A8A"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fill="#BFDBFE"
                    fontSize="9.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    ⚡ Direct Non-Stop Express • No Faster Route Exists
                  </text>
                </g>

                {/* Glowing High-Speed Electric-Blue Direct Arch */}
                <path
                  d="M 90 155 Q 500 25 910 155"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter={`url(#${idPrefix}-arcGlow)`}
                />
                <path
                  d="M 90 155 Q 500 25 910 155"
                  fill="none"
                  stroke="#93C5FD"
                  strokeWidth="2"
                  strokeDasharray="10 5"
                  strokeLinecap="round"
                  className="animate-track-flow"
                />
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PLAN 3: HONEY / ECONOMY (economy — Queen Flora • Golden Honey) */}
            {/* ------------------------------------------------------------- */}
            {selectedQueen === 'economy' && (
              <g>
                {/* Smooth Golden Wavy Path */}
                <path
                  d="M 90 150 L 230 115 L 370 160 L 500 115 L 630 160 L 770 115 L 910 150"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="4"
                  strokeDasharray="8 5"
                />
                <path
                  d="M 90 150 L 230 115 L 370 160 L 500 115 L 630 160 L 770 115 L 910 150"
                  fill="none"
                  stroke="#FDE68A"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animate-track-flow"
                  opacity="0.8"
                />

                {/* Point B "Save 40%" Badge at (910, 114) */}
                <g transform="translate(910, 114)">
                  <rect
                    x="-40"
                    y="-10"
                    width="80"
                    height="20"
                    rx="10"
                    fill="#78350F"
                    stroke="#F59E0B"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill="#FEF08A"
                    fontSize="9"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    Save 40%
                  </text>
                </g>
              </g>
            )}

            {/* Dynamic Traveling Route Pulse */}
            {!prefersReducedMotion && (
              <circle r="4" fill={activeQueenConfig.color} filter={`url(#${idPrefix}-arcGlow)`} opacity="0.95">
                <animateMotion
                  key={`track-pulse-${selectedQueen}`}
                  path={PREVIEW_PATHS[selectedQueen]}
                  dur={FLIGHT_DURATIONS[selectedQueen]}
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 7 BEEHIVE STATIONS (data-testid="preview-beehive-station")      */}
            {/* ------------------------------------------------------------- */}
            {BEEHIVE_STATIONS.map((station, index) => {
              const coords = getStationCoords(index, selectedQueen);
              const isOriginOrDest = index === 0 || index === BEEHIVE_STATIONS.length - 1;
              const isIntermediate = !isOriginOrDest;
              const isSkippedInFast = selectedQueen === 'fast' && isIntermediate;
              const relaxedPill = FLORA_RELAXED_PILLS[index];

              return (
                <g
                  key={station.id}
                  data-testid="preview-beehive-station"
                  transform={`translate(${coords.x}, ${coords.y})`}
                  opacity={isSkippedInFast ? 0.32 : 1}
                  style={{
                    filter: isSkippedInFast ? 'grayscale(100%)' : undefined,
                    transition: 'all 0.4s ease',
                  }}
                >
                  {/* Economy Mode: Pill Badge above intermediate hive (y - 36) */}
                  {selectedQueen === 'economy' && relaxedPill && (
                    <g transform="translate(0, -36)">
                      <rect
                        x="-58"
                        y="-10"
                        width="116"
                        height="20"
                        rx="10"
                        fill="#78350F"
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="3.5"
                        fill="#FEF08A"
                        fontSize="8.5"
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        {relaxedPill}
                      </text>
                    </g>
                  )}

                  {/* Golden Wooden Beehive Icon (36x36 centered at 0,0) */}
                  <g>
                    {/* Stand */}
                    <polygon points="-16,14 16,14 18,17 -18,17" fill="#78350F" />
                    {/* Tier 4 (bottom) */}
                    <rect x="-17" y="5" width="34" height="9" rx="3" fill="#D97706" stroke="#92400E" strokeWidth="1.2" />
                    {/* Tier 3 */}
                    <rect x="-14" y="-3" width="28" height="8" rx="3" fill="#F59E0B" stroke="#92400E" strokeWidth="1.2" />
                    {/* Tier 2 */}
                    <rect x="-11" y="-10" width="22" height="7" rx="3" fill="#FBBF24" stroke="#92400E" strokeWidth="1.2" />
                    {/* Tier 1 (Dome Cap) */}
                    <path d="M -8 -10 Q 0 -18 8 -10 Z" fill="#FDE68A" stroke="#92400E" strokeWidth="1.2" />
                    <circle cx="0" cy="-16" r="2" fill="#B45309" />
                    {/* Entrance Arch */}
                    <path d="M -4 14 A 4 4 0 0 1 4 14 Z" fill="#78350F" />
                    <circle cx="0" cy="14" r="1.2" fill="#FEF08A" />
                    {/* Honeycomb Center Emblem */}
                    <polygon points="0,0 2,1.5 2,3.5 0,5 -2,3.5 -2,1.5" fill="#FEF3C7" stroke="#B45309" strokeWidth="0.6" />
                  </g>

                  {/* Station Name Label at y = +32 */}
                  <text
                    x="0"
                    y="32"
                    fontSize="11"
                    fontWeight="700"
                    fill="#1C1917"
                    textAnchor="middle"
                  >
                    {station.name}
                  </text>
                </g>
              );
            })}

            {/* ------------------------------------------------------------- */}
            {/* 🐝 UNIFIED QUEEN-COLORED BEE LOCOMOTIVE                        */}
            {/* (Single persistent node with data-bee-color={selectedQueen})    */}
            {/* ------------------------------------------------------------- */}
            <g
              data-testid="route-preview-bee-locomotive"
              data-bee-color={selectedQueen}
              transform={
                prefersReducedMotion
                  ? selectedQueen === 'safe'
                    ? 'translate(700, 135)'
                    : selectedQueen === 'fast'
                    ? 'translate(500, 90)'
                    : 'translate(500, 115)'
                  : undefined
              }
              className="pointer-events-none select-none"
            >
              {!prefersReducedMotion && (
                <animateMotion
                  key={`bee-motion-${selectedQueen}`}
                  path={PREVIEW_PATHS[selectedQueen]}
                  dur={FLIGHT_DURATIONS[selectedQueen]}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              )}

              {/* Fast Mode: Trailing Supersonic Blue Speed Lines */}
              {selectedQueen === 'fast' && (
                <g opacity="0.9">
                  <line x1="-18" y1="-8" x2="-45" y2="-14" stroke="#60A5FA" strokeWidth="2.5" strokeDasharray="6 3" />
                  <line x1="-18" y1="8" x2="-45" y2="14" stroke="#60A5FA" strokeWidth="2.5" strokeDasharray="6 3" />
                  <line x1="-22" y1="0" x2="-55" y2="0" stroke="#93C5FD" strokeWidth="2" strokeDasharray="8 4" />
                </g>
              )}

              {/* Translucent Wings with flutter animation */}
              <g opacity="0.85">
                <ellipse
                  cx="-4"
                  cy="-12"
                  rx="10"
                  ry="5"
                  fill="#FFFFFF"
                  stroke={activeQueenConfig.color}
                  strokeWidth="1"
                  transform="rotate(-25 -4 -12)"
                >
                  {!prefersReducedMotion && (
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="-25 -4 -12; -45 -4 -12; -15 -4 -12; -25 -4 -12"
                      dur="0.14s"
                      repeatCount="indefinite"
                    />
                  )}
                </ellipse>
                <ellipse
                  cx="4"
                  cy="-12"
                  rx="9"
                  ry="4.5"
                  fill="#FFFFFF"
                  stroke={activeQueenConfig.color}
                  strokeWidth="1"
                  transform="rotate(15 4 -12)"
                >
                  {!prefersReducedMotion && (
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="15 4 -12; 35 4 -12; 5 4 -12; 15 4 -12"
                      dur="0.14s"
                      repeatCount="indefinite"
                    />
                  )}
                </ellipse>
              </g>

              {/* Bee Body (Signature Queen Color) */}
              <g>
                <polygon points="-14,0 -18,-2 -18,2" fill="#1C1917" />
                <ellipse cx="0" cy="0" rx="14" ry="9" fill={activeQueenConfig.color} stroke="#1C1917" strokeWidth="1.2" />
                <path d="M -6 -7 Q -4 0 -6 7" stroke="#1C1917" strokeWidth="2.5" fill="none" />
                <path d="M -1 -8 Q 1 0 -1 8" stroke="#FBBF24" strokeWidth="2.5" fill="none" />
                <path d="M 4 -7 Q 6 0 4 7" stroke="#1C1917" strokeWidth="2.5" fill="none" />
                <circle cx="10" cy="0" r="4.5" fill="#1C1917" />
                <circle cx="11" cy="-1.5" r="1.5" fill="#FFFFFF" />
                <circle cx="11.5" cy="-1.5" r="0.8" fill="#1C1917" />
                <path d="M 12 -3 Q 15 -7 18 -6" stroke="#1C1917" strokeWidth="1" fill="none" strokeLinecap="round" />
                <path d="M 12 -1 Q 16 -3 18 -1" stroke="#1C1917" strokeWidth="1" fill="none" strokeLinecap="round" />
              </g>

              {/* Escort Bees */}
              <g transform="translate(-24, -14) scale(0.6)">
                <circle r="4" fill="#F59E0B" />
                <ellipse cx="0" cy="-3" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.8" />
              </g>
              <g transform="translate(-26, 14) scale(0.55)">
                <circle r="4" fill="#F59E0B" />
                <ellipse cx="0" cy="-3" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.8" />
              </g>
            </g>
          </svg>
        </div>


        {/* ========================================================= */}
        {/* ROW 3: Full-Width Bottom Outcome Banner                   */}
        {/* ========================================================= */}
        <div className="w-full">
          {selectedQueen === 'safe' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300/80 text-emerald-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>
                  {safeDelayScenario === 'delay15' ? (
                    <>
                      <strong>15 minutes of unexpected delay absorbed</strong> safely inside Queen
                      Meli&apos;s buffer. Transfer preserved at Central Junction Hive. Guaranteed{' '}
                      <strong>100% On Time</strong> arrival at Point B.
                    </>
                  ) : (
                    <>
                      Standard smooth run: Full +20 min delay cushion intact. Generous platform
                      buffer with guaranteed <strong>100% On Time</strong> arrival at Point B.
                    </>
                  )}
                </span>
              </div>
              <span className="shrink-0 font-black px-3 py-1 rounded-full bg-emerald-200/90 text-emerald-900 border border-emerald-300 text-xs">
                100% On Time Guarantee
              </span>
            </div>
          )}

          {selectedQueen === 'fast' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/90 border border-blue-300/80 text-blue-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-blue-700 shrink-0" />
                <span>
                  Record-breaking velocity: <strong>Direct Point A to Point B flight in 1h 40m</strong>.
                  Skipped 5 intermediate halts with <strong>0 Wasted Stops</strong> and{' '}
                  <strong>-55 minutes saved</strong>.
                </span>
              </div>
              <span className="shrink-0 font-black px-3 py-1 rounded-full bg-blue-200/90 text-blue-900 border border-blue-300 text-xs">
                Fastest Arrival Guaranteed
              </span>
            </div>
          )}

          {selectedQueen === 'economy' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-700 shrink-0" />
                <span>
                  Peaceful unhurried journey: 5 relaxing station pauses (10–15 min each) to stretch
                  your legs, zero rush, and <strong>Save up to 40%</strong> on ticket fares for
                  the exact same track.
                </span>
              </div>
              <span className="shrink-0 font-black px-3 py-1 rounded-full bg-amber-200/90 text-amber-900 border border-amber-400 text-xs">
                Maximum Pocket Savings
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QueenBeesSection;
