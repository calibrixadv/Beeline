'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
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

// 7 Beehive Stations from Origin to Destination (On-Theme Cozy Hive Stations)
interface BeehiveStationInfo {
  id: string;
  name: string;
  shortName: string;
  role: string;
}

const BEEHIVE_STATIONS: BeehiveStationInfo[] = [
  {
    id: 'origin',
    name: 'Origin Hive',
    shortName: 'Point A',
    role: 'Departure Hub',
  },
  {
    id: 'clover-halt',
    name: 'Clover Halt',
    shortName: 'Clover Halt',
    role: 'Stop 1',
  },
  {
    id: 'sunlit-creek',
    name: 'Sunlit Creek',
    shortName: 'Sunlit Creek',
    role: 'Stop 2',
  },
  {
    id: 'central-junction',
    name: 'Central Junction',
    shortName: 'Central Junction',
    role: 'Main Transfer Hive',
  },
  {
    id: 'amber-ridge',
    name: 'Amber Ridge',
    shortName: 'Amber Ridge',
    role: 'Stop 4',
  },
  {
    id: 'honey-orchard',
    name: 'Honey Orchard',
    shortName: 'Honey Orchard',
    role: 'Stop 5',
  },
  {
    id: 'destination',
    name: 'Arrival Hive',
    shortName: 'Point B',
    role: 'Arrival Hub',
  },
];

// Clean compact stop pills for Queen Flora (Economy) on Desktop intermediate hives
const FLORA_DESKTOP_PILLS: (string | null)[] = [
  null,
  '+12m pause',
  '+15m break',
  '+15m pause',
  '+10m break',
  '+12m pause',
  null,
];

// Mobile S-Curve Coordinates (viewBox 0 0 380 410)
// Row 1 (y = 66): Origin Hive (68, 66), Clover Halt (190, 66), Sunlit Creek (312, 66)
// Row 2 (y = 202): Central Junction (190, 202)
// Row 3 (y = 338): Amber Ridge (68, 338), Honey Orchard (190, 338), Arrival Hive (312, 338)
const MOBILE_STATION_COORDS = [
  { x: 68, y: 66 },
  { x: 190, y: 66 },
  { x: 312, y: 66 },
  { x: 190, y: 202 },
  { x: 68, y: 338 },
  { x: 190, y: 338 },
  { x: 312, y: 338 },
];

// Floating Relaxed Stop Badges for Queen Flora (Economy) on Mobile intermediate beehives
const FLORA_MOBILE_PILLS: { text: string; x: number; y: number }[] = [
  { text: '+12m', x: 190, y: 28 },
  { text: '+15m', x: 312, y: 28 },
  { text: '+15m', x: 190, y: 154 },
  { text: '+10m', x: 68, y: 300 },
  { text: '+12m', x: 190, y: 300 },
];

// Desktop SVG Route Paths & Animation Flight Durations for Unified Bee Locomotive
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

// Reusable Wooden Beehive Icon (~36x36 base scaled cleanly)
const WoodenBeehiveIcon: React.FC<{ size?: number }> = ({ size = 36 }) => {
  const scale = size / 36;
  return (
    <g transform={`scale(${scale})`}>
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
  );
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

  // Dynamic station coordinates for each Queen plan on Desktop (1000 x 260 space)
  const getStationCoords = (index: number, queen: QueenGear) => {
    const xCoords = [90, 230, 370, 500, 630, 770, 910];
    const x = xCoords[index];
    if (queen === 'safe') {
      return { x, y: 135 };
    }
    if (queen === 'fast') {
      return { x, y: index === 0 || index === 6 ? 165 : 190 };
    }
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
        className="relative w-full py-6 sm:py-8 px-1 sm:px-2 flex flex-col gap-6 transition-all duration-300"
      >
        {/* ========================================================= */}
        {/* ROW 1: Clean Open Typography Header & Scenario Controls   */}
        {/* ========================================================= */}
        <div className="w-full max-w-2xl">
          <h3 className="text-2xl sm:text-3xl font-black text-[#1E1B18] w-full leading-tight tracking-tight">
            {selectedQueen === 'safe' && 'Protected Transfers, Calm Arrivals'}
            {selectedQueen === 'fast' && 'Direct Mainline Flight, Zero Wasted Stops'}
            {selectedQueen === 'economy' && 'Unhurried Stops, Sweetest Rail Fares'}
          </h3>
          <p className="text-sm sm:text-base text-[#57534E] mt-2 leading-relaxed">
            {selectedQueen === 'safe' &&
              'Queen Meli guards every junction with a built-in delay cushion, so an early hold-up never costs you the next train.'}
            {selectedQueen === 'fast' &&
              'Queen Vira follows the fastest express corridor, flying straight past slow local halts from origin to destination.'}
            {selectedQueen === 'economy' &&
              'Queen Flora pairs calm regional pauses with the lowest multi-operator fares when saving matters more than rushing.'}
          </p>

          {/* Scenario Toggle Buttons for Queen Meli (Safe Mode) */}
          {selectedQueen === 'safe' && (
            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <button
                type="button"
                data-testid="safe-ontime-btn"
                onClick={() => setSafeDelayScenario('ontime')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  safeDelayScenario === 'ontime'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/70 border border-emerald-300/60'
                }`}
                aria-pressed={safeDelayScenario === 'ontime'}
              >
                On-Time First Train
              </button>
              <button
                type="button"
                data-testid="safe-delay-btn"
                onClick={() => setSafeDelayScenario('delay15')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  safeDelayScenario === 'delay15'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-amber-100/70 text-amber-800 hover:bg-amber-200/70 border border-amber-300/60'
                }`}
                aria-pressed={safeDelayScenario === 'delay15'}
              >
                +15m Delay on First Train
              </button>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ROW 2: Dedicated SVG Route Maps with Soft Radial Aura      */}
        {/* Desktop: Horizontal (viewBox 0 0 1000 260)                 */}
        {/* Mobile: Serpentine 3-Row S-Curve (viewBox 0 0 380 410)     */}
        {/* ========================================================= */}
        <div className="relative w-full">
          {/* Pure CSS Radial Glow Aura directly behind the SVG tracks */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-56 sm:h-64 rounded-full blur-2xl ${
              prefersReducedMotion ? '' : 'transition-all duration-500'
            }`}
            style={{
              background:
                selectedQueen === 'safe'
                  ? 'radial-gradient(ellipse 68% 58% at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 72%)'
                  : selectedQueen === 'fast'
                  ? 'radial-gradient(ellipse 68% 58% at 50% 50%, rgba(59, 130, 246, 0.14) 0%, transparent 72%)'
                  : 'radial-gradient(ellipse 68% 58% at 50% 50%, rgba(245, 158, 11, 0.16) 0%, transparent 72%)',
            }}
          />

          {/* --------------------------------------------------------- */}
          {/* 2.A DESKTOP HORIZONTAL MAP (hidden md:block)              */}
          {/* --------------------------------------------------------- */}
          <svg
            viewBox="0 0 1000 260"
            width="100%"
            height="260"
            className="hidden md:block w-full h-[260px] select-none relative z-10"
            aria-label="Desktop Interactive Route Preview"
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

            {/* PLAN 1: SAFE (safe — Queen Meli • Protected Corridor) */}
            {selectedQueen === 'safe' && (
              <g>
                {/* Unified 100% Emerald Continuous Rail Track (Origin ➔ Arrival) */}
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

                {/* Central Junction Emerald Delay-Protection Shield Dome */}
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
                  {/* Clean Desktop SVG Badge: 🛡️ +20m Delay Cushion above Central Junction */}
                  <g transform="translate(500, 62)">
                    <rect
                      x="-92"
                      y="-13"
                      width="184"
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
                      🛡️ +20m Delay Cushion
                    </text>
                  </g>
                </g>

                {/* Leg 1 Pill: Displays "+15m absorbed" when delay simulation active */}
                {safeDelayScenario === 'delay15' && (
                  <g transform="translate(280, 90)">
                    <rect
                      x="-56"
                      y="-12"
                      width="112"
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
                      +15m absorbed
                    </text>
                  </g>
                )}

                {/* Arrival Hive "On Time ✓" Badge at (910, 80) */}
                <g transform="translate(910, 80)">
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
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
                    On Time ✓
                  </text>
                </g>
              </g>
            )}

            {/* PLAN 2: FAST (fast — Queen Vira • Electric Blue #3B82F6) */}
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

                {/* Muted lower note: 5 local halts bypassed */}
                <g transform="translate(500, 232)">
                  <rect
                    x="-95"
                    y="-11"
                    width="190"
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
                    5 local halts bypassed
                  </text>
                </g>

                {/* Apex Fast Express Badge above the curve (500, 48) */}
                <g transform="translate(500, 48)">
                  <rect
                    x="-110"
                    y="-12"
                    width="220"
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
                    fontSize="10"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    ⚡ Direct Express · 0 Stops
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

            {/* PLAN 3: ECONOMY (economy — Queen Flora • Golden Honey) */}
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

                {/* Arrival Hive "Lowest Fare" Badge at (910, 114) */}
                <g transform="translate(910, 114)">
                  <rect
                    x="-46"
                    y="-10"
                    width="92"
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
                    Lowest Fare
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

            {/* 7 BEEHIVE STATIONS (data-testid="preview-beehive-station") */}
            {BEEHIVE_STATIONS.map((station, index) => {
              const coords = getStationCoords(index, selectedQueen);
              const isOriginOrDest = index === 0 || index === BEEHIVE_STATIONS.length - 1;
              const isIntermediate = !isOriginOrDest;
              const isSkippedInFast = selectedQueen === 'fast' && isIntermediate;
              const relaxedPill = FLORA_DESKTOP_PILLS[index];

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
                        x="-44"
                        y="-10"
                        width="88"
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
                  <WoodenBeehiveIcon size={36} />

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
                  {(index === 0 || index === 6) && (
                    <text
                      x="0"
                      y="44"
                      fontSize="9"
                      fontWeight="600"
                      fill="#78716C"
                      textAnchor="middle"
                    >
                      {index === 0 ? 'Point A' : 'Point B'}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 🐝 UNIFIED QUEEN-COLORED BEE LOCOMOTIVE */}
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

          {/* --------------------------------------------------------- */}
          {/* 2.B MOBILE S-CURVE SERPENTINE MAP (block md:hidden)       */}
          {/* --------------------------------------------------------- */}
          <svg
            viewBox="0 0 380 410"
            width="100%"
            height="auto"
            data-testid="mobile-scurve-route-preview"
            className="block md:hidden w-full max-w-[400px] mx-auto h-auto select-none relative z-10"
            aria-label="Mobile Serpentine Route Preview"
          >
            <defs>
              <filter id={`${idPrefix}-mobileArcGlow`} x="-15%" y="-30%" width="130%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* MOBILE PLAN 1: SAFE (Emerald #10B981) */}
            {selectedQueen === 'safe' && (
              <g>
                {/* Leg 1 Path (Origin ➔ Central Junction) */}
                <path
                  d="M 68 66 L 312 66 C 362 66, 362 202, 300 202 L 190 202"
                  fill="none"
                  stroke={safeDelayScenario === 'delay15' ? '#F59E0B' : '#10B981'}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M 68 66 L 312 66 C 362 66, 362 202, 300 202 L 190 202"
                  fill="none"
                  stroke={safeDelayScenario === 'delay15' ? '#FDE68A' : '#A7F3D0'}
                  strokeWidth="1.8"
                  strokeDasharray="6 4"
                  className="animate-track-flow"
                  opacity="0.85"
                />

                {/* Leg 2 Path (Central Junction ➔ Arrival Hive) */}
                <path
                  d="M 190 202 L 80 202 C 18 202, 18 338, 68 338 L 312 338"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M 190 202 L 80 202 C 18 202, 18 338, 68 338 L 312 338"
                  fill="none"
                  stroke="#A7F3D0"
                  strokeWidth="1.8"
                  strokeDasharray="6 4"
                  className="animate-track-flow"
                  opacity="0.85"
                />

                {/* Central Junction Emerald Shield Dome at (190, 202) */}
                <circle
                  cx="190"
                  cy="202"
                  r="36"
                  fill="#10B981"
                  fillOpacity="0.14"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />
                {/* Crisp Emerald Pill above Central Junction at (190, 148) */}
                <g transform="translate(190, 148)">
                  <rect
                    x="-54"
                    y="-11"
                    width="108"
                    height="22"
                    rx="11"
                    fill="#059669"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    🛡️ +20m Cushion
                  </text>
                </g>

                {/* Delayed State Leg 1 Badge near (265, 114) */}
                {safeDelayScenario === 'delay15' && (
                  <g transform="translate(265, 114)">
                    <rect
                      x="-44"
                      y="-10"
                      width="88"
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
                      +15m absorbed
                    </text>
                  </g>
                )}

                {/* Arrival Hive "On Time ✓" Badge at (312, 294) */}
                <g transform="translate(312, 294)">
                  <rect
                    x="-40"
                    y="-10"
                    width="80"
                    height="20"
                    rx="10"
                    fill="#059669"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    On Time ✓
                  </text>
                </g>
              </g>
            )}

            {/* MOBILE PLAN 2: FAST (Electric Blue #3B82F6) */}
            {selectedQueen === 'fast' && (
              <g>
                {/* Dimmed Faded Full S-Curve Track */}
                <path
                  d="M 68 66 L 312 66 C 362 66, 362 202, 300 202 L 80 202 C 18 202, 18 338, 68 338 L 312 338"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  opacity="0.26"
                />

                {/* Supersonic Electric-Blue Express Diagonal Arc */}
                <path
                  d="M 68 66 C 145 145, 235 255, 312 338"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter={`url(#${idPrefix}-mobileArcGlow)`}
                />
                <path
                  d="M 68 66 C 145 145, 235 255, 312 338"
                  fill="none"
                  stroke="#93C5FD"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  strokeLinecap="round"
                  className="animate-track-flow"
                />

                {/* Direct 0 Stops Pill above bee at (190, 168) */}
                <g transform="translate(190, 168)">
                  <rect
                    x="-58"
                    y="-11"
                    width="116"
                    height="22"
                    rx="11"
                    fill="#1E3A8A"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill="#BFDBFE"
                    fontSize="9.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    ⚡ Direct · 0 Stops
                  </text>
                </g>

                {/* Quiet Muted Lower Note at (190, 394) */}
                <text
                  x="190"
                  y="394"
                  fill="#78716C"
                  fontSize="10.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  5 local halts bypassed
                </text>
              </g>
            )}

            {/* MOBILE PLAN 3: ECONOMY (Golden Honey #D97706) */}
            {selectedQueen === 'economy' && (
              <g>
                {/* Warm Dashed Golden Honey S-Curve Path */}
                <path
                  d="M 68 66 L 312 66 C 362 66, 362 202, 300 202 L 80 202 C 18 202, 18 338, 68 338 L 312 338"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="4"
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                />
                <path
                  d="M 68 66 L 312 66 C 362 66, 362 202, 300 202 L 80 202 C 18 202, 18 338, 68 338 L 312 338"
                  fill="none"
                  stroke="#FDE68A"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animate-track-flow"
                  opacity="0.8"
                />

                {/* 5 Intermediate Pause Badges */}
                {FLORA_MOBILE_PILLS.map((pill, idx) => (
                  <g key={idx} transform={`translate(${pill.x}, ${pill.y})`}>
                    <rect
                      x="-20"
                      y="-9"
                      width="40"
                      height="18"
                      rx="9"
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
                      {pill.text}
                    </text>
                  </g>
                ))}

                {/* Arrival Hive "Lowest Fare" Badge at (312, 294) */}
                <g transform="translate(312, 294)">
                  <rect
                    x="-38"
                    y="-10"
                    width="76"
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
                    Lowest Fare
                  </text>
                </g>
              </g>
            )}

            {/* 7 BEEHIVE STATIONS on Mobile S-Curve (data-testid="mobile-beehive-station") */}
            {BEEHIVE_STATIONS.map((station, index) => {
              const coords = MOBILE_STATION_COORDS[index];
              const isOriginOrDest = index === 0 || index === BEEHIVE_STATIONS.length - 1;
              const isIntermediate = !isOriginOrDest;
              const isSkippedInFast = selectedQueen === 'fast' && isIntermediate;

              return (
                <g
                  key={`mobile-${station.id}`}
                  data-testid="mobile-beehive-station"
                  transform={`translate(${coords.x}, ${coords.y})`}
                  opacity={isSkippedInFast ? 0.26 : 1}
                  style={{
                    filter: isSkippedInFast ? 'grayscale(100%)' : undefined,
                    transition: 'all 0.4s ease',
                  }}
                >
                  {/* Golden Wooden Beehive Icon (~32x32) */}
                  <WoodenBeehiveIcon size={32} />

                  {/* Station Name Label at y = +28 */}
                  <text
                    x="0"
                    y="28"
                    fontSize="11.5"
                    fontWeight="700"
                    fill="#1C1917"
                    textAnchor="middle"
                  >
                    {station.name}
                  </text>
                  {(index === 0 || index === 6) && (
                    <text
                      x="0"
                      y="39"
                      fontSize="9"
                      fontWeight="600"
                      fill="#78716C"
                      textAnchor="middle"
                    >
                      {index === 0 ? 'Point A' : 'Point B'}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 🐝 MOBILE ROUTE BEE (data-testid="mobile-route-bee") */}
            <g
              data-testid="mobile-route-bee"
              data-bee-color={selectedQueen}
              transform={
                selectedQueen === 'safe'
                  ? 'translate(116, 202)'
                  : selectedQueen === 'fast'
                  ? 'translate(190, 202)'
                  : 'translate(128, 338)'
              }
              className="pointer-events-none select-none"
            >
              {/* Fast Mode: Trailing Supersonic Blue Speed Lines */}
              {selectedQueen === 'fast' && (
                <g opacity="0.9">
                  <line x1="-12" y1="-6" x2="-28" y2="-12" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 2" />
                  <line x1="-12" y1="6" x2="-28" y2="12" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 2" />
                  <line x1="-15" y1="0" x2="-35" y2="0" stroke="#93C5FD" strokeWidth="1.8" strokeDasharray="5 2" />
                </g>
              )}

              {/* Translucent Wings with flutter animation */}
              <g opacity="0.85">
                <ellipse
                  cx="-3"
                  cy="-10"
                  rx="8"
                  ry="4"
                  fill="#FFFFFF"
                  stroke={activeQueenConfig.color}
                  strokeWidth="0.9"
                  transform="rotate(-25 -3 -10)"
                >
                  {!prefersReducedMotion && (
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="-25 -3 -10; -45 -3 -10; -15 -3 -10; -25 -3 -10"
                      dur="0.14s"
                      repeatCount="indefinite"
                    />
                  )}
                </ellipse>
                <ellipse
                  cx="3"
                  cy="-10"
                  rx="7"
                  ry="3.5"
                  fill="#FFFFFF"
                  stroke={activeQueenConfig.color}
                  strokeWidth="0.9"
                  transform="rotate(15 3 -10)"
                >
                  {!prefersReducedMotion && (
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="15 3 -10; 35 3 -10; 5 3 -10; 15 3 -10"
                      dur="0.14s"
                      repeatCount="indefinite"
                    />
                  )}
                </ellipse>
              </g>

              {/* Bee Body (Signature Queen Color) */}
              <g>
                <polygon points="-11,0 -14,-1.5 -14,1.5" fill="#1C1917" />
                <ellipse cx="0" cy="0" rx="11" ry="7" fill={activeQueenConfig.color} stroke="#1C1917" strokeWidth="1" />
                <path d="M -5 -5.5 Q -3 0 -5 5.5" stroke="#1C1917" strokeWidth="2" fill="none" />
                <path d="M -1 -6 Q 0.5 0 -1 6" stroke="#FBBF24" strokeWidth="2" fill="none" />
                <path d="M 3 -5.5 Q 4.5 0 3 5.5" stroke="#1C1917" strokeWidth="2" fill="none" />
                <circle cx="8" cy="0" r="3.5" fill="#1C1917" />
                <circle cx="8.8" cy="-1.2" r="1.2" fill="#FFFFFF" />
                <circle cx="9.2" cy="-1.2" r="0.6" fill="#1C1917" />
                <path d="M 9.5 -2.5 Q 12 -5.5 14 -5" stroke="#1C1917" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                <path d="M 9.5 -0.8 Q 12.5 -2.5 14 -0.8" stroke="#1C1917" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>

        {/* ========================================================= */}
        {/* ROW 3: Borderless Left-Accented Outcome Note              */}
        {/* ========================================================= */}
        <div className="w-full">
          {selectedQueen === 'safe' && (
            <div className="mt-4 pl-4 py-1 border-l-[3px] border-emerald-500 text-sm sm:text-[15px] text-[#3F3A34] leading-relaxed">
              {safeDelayScenario === 'delay15' ? (
                <span>First train ran +15m late — Queen Meli&apos;s junction cushion absorbed the delay so you still arrive on time.</span>
              ) : (
                <span>A +20m junction cushion at Central Hive keeps your connection protected from departure to arrival.</span>
              )}
            </div>
          )}

          {selectedQueen === 'fast' && (
            <div className="mt-4 pl-4 py-1 border-l-[3px] border-blue-500 text-sm sm:text-[15px] text-[#3F3A34] leading-relaxed">
              Non-stop express arc bypassing 5 local halts — engineered for the shortest rail time on the corridor.
            </div>
          )}

          {selectedQueen === 'economy' && (
            <div className="mt-4 pl-4 py-1 border-l-[3px] border-amber-500 text-sm sm:text-[15px] text-[#3F3A34] leading-relaxed">
              Gentle regional pace with unhurried pauses along the line — designed to keep more nectar in your pocket.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QueenBeesSection;
