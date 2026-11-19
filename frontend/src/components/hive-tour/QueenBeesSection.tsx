'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  Coffee,
  HeartHandshake,
  CheckCircle2,
  MapPin,
  Smile,
  AlertTriangle,
  X,
  Compass,
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
  // SVG topological coordinates on top golden railway track (1200 x 480 space)
  cx: number;
  cy: number;
}

const QUEENS_CONFIG: Record<QueenGear, QueenSanctuaryConfig> = {
  safe: {
    gear: 'safe',
    name: 'Queen Meli',
    roleTitle: 'Queen Transfer Guard',
    title: 'Queen Meli • Queen Transfer Guard',
    romanianTitle: 'Regina Meli — Matca Scutului de Transfer',
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
    cx: 320,
    cy: 160,
  },
  fast: {
    gear: 'fast',
    name: 'Queen Vira',
    roleTitle: 'Queen Express Scout',
    title: 'Queen Vira • Queen Express Scout',
    romanianTitle: 'Regina Vira — Matca Vitezei InterCity',
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
    cx: 880,
    cy: 160,
  },
  economy: {
    gear: 'economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    title: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Regina Flora — Matca Economiei Inteligente',
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
    cx: 600,
    cy: 330,
  },
};

// 7 Generic Stations from Point A to Point B (All rendered as interactive SVG Beehives)
interface BeehiveStationInfo {
  id: string;
  name: string;
  shortName: string;
  role: string;
  x: number; // coordinate in SVG (viewBox 0 0 1200 440)
  y: number;
  stopMinutesFlora: number;
  savingsFlora: string;
  safeRole: string;
  fastRole: string;
  economyRole: string;
}

const BEEHIVE_STATIONS: BeehiveStationInfo[] = [
  {
    id: 'origin',
    name: 'Point A • Origin Hive',
    shortName: 'Point A',
    role: 'Departure Hub',
    x: 90,
    y: 220,
    stopMinutesFlora: 0,
    savingsFlora: '0.00 LEI',
    safeRole: 'Departure Hub: Smooth boarding with zero platform rush or congestion.',
    fastRole: 'Departure Hub: Instant supersonic launch with non-stop express priority.',
    economyRole: 'Departure Hub: Calm boarding with the lowest base ticket fare.',
  },
  {
    id: 'meadow-vale',
    name: 'Meadow Vale Hive',
    shortName: 'Meadow Vale',
    role: 'Stop 1 • Wildflower Valley',
    x: 260,
    y: 220,
    stopMinutesFlora: 10,
    savingsFlora: '7.50 LEI',
    safeRole: 'Protected intermediate stop with guaranteed on-time departure.',
    fastRole: 'Skipped • 0 Wasted Stops (Express Bee flies straight past).',
    economyRole: '+10m Relaxed Stop: Grab fresh wildflower honey tea, stretch your legs, zero rush.',
  },
  {
    id: 'sunny-creek',
    name: 'Sunny Creek Hive',
    shortName: 'Sunny Creek',
    role: 'Stop 2 • Honey Creek',
    x: 430,
    y: 220,
    stopMinutesFlora: 12,
    savingsFlora: '15.00 LEI',
    safeRole: 'Synchronized stop with automated track clearance buffer.',
    fastRole: 'Skipped • 0 Wasted Stops (Mainline priority bypass).',
    economyRole: '+12m Relaxed Stop: Peaceful countryside view & pocket savings.',
  },
  {
    id: 'central-junction',
    name: 'Central Junction Hive',
    shortName: 'Central Junction',
    role: 'Main Transfer Hive',
    x: 600,
    y: 220,
    stopMinutesFlora: 15,
    savingsFlora: '23.00 LEI',
    safeRole:
      'Emerald Error-Margin Shield (+20 min Built-In Delay Buffer) guarantees you never miss your connection even if a train is late.',
    fastRole: 'Skipped • 0 Wasted Stops (Direct express arc bypasses junction bottlenecks).',
    economyRole: '+15m Relaxed Stop: Unhurried platform stroll with local honeycomb pastries.',
  },
  {
    id: 'amber-ridge',
    name: 'Amber Ridge Hive',
    shortName: 'Amber Ridge',
    role: 'Stop 4 • Mountain Pass',
    x: 770,
    y: 220,
    stopMinutesFlora: 10,
    savingsFlora: '31.50 LEI',
    safeRole: 'Protected foothill descent with continuous schedule monitoring.',
    fastRole: 'Skipped • 0 Wasted Stops (High-velocity express transit).',
    economyRole: '+10m Relaxed Stop: Breathe fresh alpine air with zero stress.',
  },
  {
    id: 'orchard-valley',
    name: 'Orchard Valley Hive',
    shortName: 'Orchard Valley',
    role: 'Stop 5 • Apple Blossoms',
    x: 940,
    y: 220,
    stopMinutesFlora: 12,
    savingsFlora: '38.50 LEI',
    safeRole: 'Final intermediate sync point ensuring exact on-time approach.',
    fastRole: 'Skipped • 0 Wasted Stops (Full throttle straight to destination).',
    economyRole: '+12m Relaxed Stop: Calm rest before destination, maximum money saved.',
  },
  {
    id: 'destination',
    name: 'Point B • Destination Hive',
    shortName: 'Point B',
    role: 'Arrival Hub',
    x: 1110,
    y: 220,
    stopMinutesFlora: 0,
    savingsFlora: 'Up to 40% (38.50 LEI)',
    safeRole: 'Arrival Hub: Guaranteed 100% On-Time Arrival at Point B.',
    fastRole: 'Arrival Hub: Arrived in Record Time (1h 40m • -55 minutes saved).',
    economyRole: 'Arrival Hub: Arrived Calm & Relaxed with the Most Money in Your Pocket.',
  },
];

// Floating Relaxed Stop Pills for Queen Flora (Economy) intermediate beehives
const FLORA_RELAXED_PILLS: (string | null)[] = [
  null,
  '☕ +12m Calm Stop',
  '🍯 +15m Scenic Break',
  '🌿 +15m Unrushed Pause',
  '☕ +10m Stretch Legs',
  '🍯 +12m Relaxed Stop',
  null,
];

// Mathematical helper to produce regular pointy-topped hexagons
function makeHexagonPath(cx: number, cy: number, r: number): string {
  const dx = Math.round(r * 0.866025 * 10) / 10;
  const dy = Math.round(r * 0.5 * 10) / 10;
  return `M ${cx} ${cy - r} L ${cx + dx} ${cy - dy} L ${cx + dx} ${cy + dy} L ${cx} ${cy + r} L ${cx - dx} ${cy + dy} L ${cx - dx} ${cy - dy} Z`;
}

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
  // Safe Mode: 'ontime' | 'delay15'
  const [safeDelayScenario, setSafeDelayScenario] = useState<'ontime' | 'delay15'>('delay15');

  // Fast Mode: 'express' | 'standard'
  const [fastMode, setFastMode] = useState<'express' | 'standard'>('express');

  // Inspected Beehive Station state (null or station id)
  const [inspectedStationId, setInspectedStationId] = useState<string | null>('central-junction');

  const inspectedStation = BEEHIVE_STATIONS.find((s) => s.id === inspectedStationId) || null;
  const activeQueenConfig = QUEENS_CONFIG[selectedQueen];

  // =============================================================
  // Top Railway Track Paths (1200 x 480 space)
  // =============================================================
  const TOP_TRACK_ORIGIN = 'M 80 250 L 260 250';
  const TOP_TRACK_SAFE =
    'M 260 250 C 275 210, 290 160, 320 160 C 370 160, 480 120, 600 120 C 760 120, 960 200, 1120 250';
  const TOP_TRACK_FAST =
    'M 260 250 C 380 250, 500 190, 600 190 C 740 190, 800 170, 880 170 C 960 170, 1040 210, 1120 250';
  const TOP_TRACK_ECONOMY =
    'M 260 250 C 340 250, 440 330, 600 330 C 760 330, 940 310, 1120 250';

  const activeTopTrackPath =
    selectedQueen === 'safe'
      ? TOP_TRACK_SAFE
      : selectedQueen === 'fast'
      ? TOP_TRACK_FAST
      : TOP_TRACK_ECONOMY;

  // =============================================================
  // Single Top Beehive Preview Route Topologies (1200 x 480 space)
  // =============================================================
  // Safe: 2-Leg Connected Route meeting at Giant Shielded Central Transfer Beehive (y = 250)
  const PREVIEW_PATH_SAFE =
    'M 90 250 L 260 250 L 430 250 L 600 250 L 770 250 L 940 250 L 1110 250';
  // Fast: Elevated Supersonic Direct Express Arch curving high above intermediate stations (y: 220 -> apex y: 40 -> y: 220)
  const PREVIEW_PATH_FAST = 'M 90 220 C 350 40, 850 40, 1110 220';
  // Economy: Warm, wavy scenic golden-honey sinusoidal curve weaving through all 7 beehive stations
  const PREVIEW_PATH_ECONOMY =
    'M 90 240 C 175 175, 175 175, 260 175 C 345 175, 345 305, 430 305 C 515 305, 515 175, 600 175 C 685 175, 685 305, 770 305 C 855 305, 855 175, 940 175 C 1025 175, 1025 240, 1110 240';

  const activePreviewRoutePath =
    selectedQueen === 'safe'
      ? PREVIEW_PATH_SAFE
      : selectedQueen === 'fast'
      ? PREVIEW_PATH_FAST
      : PREVIEW_PATH_ECONOMY;

  // Dynamic station coordinates for each Queen plan (ensures radical visual difference)
  const getStationCoords = (index: number, queen: QueenGear) => {
    const xCoords = [90, 260, 430, 600, 770, 940, 1110];
    const x = xCoords[index];
    if (queen === 'safe') {
      return { x, y: 250 };
    }
    if (queen === 'fast') {
      // Point A & Point B on high express level (y: 220); 5 intermediate hives pushed down into dimmed track (y: 370)
      return { x, y: index === 0 || index === 6 ? 220 : 370 };
    }
    // Queen Flora: Sinusoidal wave (Origin: 240, Meadow: 175, Sunny: 305, Central: 175, Amber: 305, Orchard: 175, Dest: 240)
    const yValues = [240, 175, 305, 175, 305, 175, 240];
    return { x, y: yValues[index] };
  };

  return (
    <section
      id="tour-queens"
      aria-label="The Three Queen Bees and Their Hive Swarms"
      className="relative w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 select-none"
    >
      {/* Chapter 1 Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>CHAPTER 1 • THE ROYAL HIVES</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
          The Three Queen Bees &amp; Their Hive Swarms
        </h3>
        <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
          In the Beeline hive, three specialized Queen Bees (<em>Mătci</em>) —{' '}
          <strong>Queen Meli</strong>, <strong>Queen Vira</strong>, and{' '}
          <strong>Queen Flora</strong> — command dedicated swarms of minimalist worker bees to
          optimize every railway journey across Romania.
        </p>
      </div>

      {/* ========================================================= */}
      {/* STAGE 1: TOP GOLDEN RAILWAY TRACK & SWITCH (DESIGN 4)      */}
      {/* ========================================================= */}
      <div
        data-testid="variant-4-living-rail-track"
        className="relative w-full overflow-hidden rounded-3xl bg-amber-50/40 backdrop-blur-xs border border-amber-300/40 p-4 sm:p-6 shadow-lg mb-8"
      >
        {/* Subtle Railway Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: activeQueenConfig.color }}
            />
            <span className="text-xs font-black uppercase tracking-wider text-amber-900/80">
              Living Golden Rail • Point A to Point B Flow
            </span>
          </div>
          <div className="text-[11px] font-bold text-amber-800/80 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
            Interactive Railway Switch:{' '}
            <span className="font-black text-amber-950 uppercase">{selectedQueen}</span>
          </div>
        </div>

        {/* Master Top Golden Track SVG Canvas */}
        <div className="relative w-full aspect-[1200/480] min-h-[300px]">
          <svg
            viewBox="0 0 1200 480"
            className="w-full h-full drop-shadow-sm"
            style={{ overflow: 'visible' }}
            aria-label="Golden Railway Track Diagram"
          >
            <defs>
              <linearGradient id={`${idPrefix}-goldRail`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              <linearGradient id={`${idPrefix}-safeGlow`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>

              <linearGradient id={`${idPrefix}-fastGlow`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>

              <linearGradient id={`${idPrefix}-ecoGlow`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>

              <filter id={`${idPrefix}-pulseGlow`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. TIMBER SLEEPERS (Cross-ties under the tracks) */}
            <g stroke="#92400E" strokeWidth="5" strokeLinecap="round" opacity="0.35">
              {[100, 130, 160, 190, 220, 250].map((x) => (
                <line key={`sleeper-orig-${x}`} x1={x} y1="240" x2={x} y2="260" />
              ))}
              {[1000, 1030, 1060, 1090, 1120].map((x) => (
                <line key={`sleeper-dest-${x}`} x1={x} y1="240" x2={x} y2="260" />
              ))}
              {[300, 340, 390, 450, 520, 600, 700, 800, 900].map((x, i) => (
                <line
                  key={`sleeper-safe-${i}`}
                  x1={x}
                  y1={140 + i * 8}
                  x2={x + 6}
                  y2={160 + i * 8}
                />
              ))}
              {[340, 400, 480, 560, 640, 740, 840, 940].map((x, i) => (
                <line
                  key={`sleeper-eco-${i}`}
                  x1={x}
                  y1={310 - (i > 4 ? (i - 4) * 8 : 0)}
                  x2={x + 4}
                  y2={330 - (i > 4 ? (i - 4) * 8 : 0)}
                />
              ))}
            </g>

            {/* 2. TRACK LINES */}
            <path
              d={TOP_TRACK_ORIGIN}
              fill="none"
              stroke="#D97706"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d={TOP_TRACK_SAFE}
              fill="none"
              stroke="#10B981"
              strokeWidth={selectedQueen === 'safe' ? '6' : '3'}
              strokeDasharray={selectedQueen === 'safe' ? 'none' : '6 6'}
              opacity={selectedQueen === 'safe' ? 0.95 : 0.4}
              className="transition-all duration-300"
            />
            <path
              d={TOP_TRACK_FAST}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={selectedQueen === 'fast' ? '6' : '3'}
              strokeDasharray={selectedQueen === 'fast' ? 'none' : '6 6'}
              opacity={selectedQueen === 'fast' ? 0.95 : 0.4}
              className="transition-all duration-300"
            />
            <path
              d={TOP_TRACK_ECONOMY}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={selectedQueen === 'economy' ? '6' : '3'}
              strokeDasharray={selectedQueen === 'economy' ? 'none' : '6 6'}
              opacity={selectedQueen === 'economy' ? 0.95 : 0.4}
              className="transition-all duration-300"
            />

            {/* Active Gleam Track */}
            <path
              d={activeTopTrackPath}
              fill="none"
              stroke="#FEF08A"
              strokeWidth="2.5"
              opacity="0.85"
              strokeLinecap="round"
            />

            {/* 3. ANIMATED RAILWAY SWITCH (MACAZ) */}
            <g
              data-testid="rail-switch-south"
              transform="translate(260, 250)"
              className="transition-transform duration-500 ease-out"
            >
              <circle cx="0" cy="0" r="14" fill="#78350F" stroke="#F59E0B" strokeWidth="2" />
              <line
                x1="0"
                y1="0"
                x2={selectedQueen === 'safe' ? '28' : selectedQueen === 'fast' ? '32' : '28'}
                y2={selectedQueen === 'safe' ? '-22' : selectedQueen === 'fast' ? '-6' : '22'}
                stroke="#FEF08A"
                strokeWidth="4"
                strokeLinecap="round"
                className="transition-all duration-400 ease-out"
              />
              <circle
                cx={selectedQueen === 'safe' ? '28' : selectedQueen === 'fast' ? '32' : '28'}
                cy={selectedQueen === 'safe' ? '-22' : selectedQueen === 'fast' ? '-6' : '22'}
                r="5"
                fill={activeQueenConfig.color}
                className="animate-pulse"
              />
            </g>

            {/* Switch Label */}
            <g data-testid="rail-switch-central" transform="translate(230, 210)">
              <rect x="-10" y="-12" width="75" height="20" rx="10" fill="#1E1B18" opacity="0.85" />
              <text x="27" y="2" fill="#FEF08A" fontSize="9" fontWeight="900" textAnchor="middle">
                MACAZ 1
              </text>
            </g>

            {/* Railway Signals */}
            <circle
              data-testid="rail-signal-meli"
              cx="320"
              cy="105"
              r="6"
              fill={selectedQueen === 'safe' ? '#10B981' : '#064E3B'}
            />
            <circle
              data-testid="rail-signal-vira"
              cx="880"
              cy="105"
              r="6"
              fill={selectedQueen === 'fast' ? '#3B82F6' : '#1E3A8A'}
            />
            <circle
              data-testid="rail-signal-flora"
              cx="600"
              cy="390"
              r="6"
              fill={selectedQueen === 'economy' ? '#F59E0B' : '#78350F'}
            />

            {/* Point A Beacon */}
            <g transform="translate(70, 250)">
              <circle cx="0" cy="0" r="22" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="10" fill="#D97706" />
              <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
              <text x="0" y="-30" fill="#1E1B18" fontSize="13" fontWeight="900" textAnchor="middle">
                POINT A
              </text>
              <text x="0" y="-16" fill="#78350F" fontSize="10" fontWeight="700" textAnchor="middle">
                Your Station
              </text>
            </g>

            {/* Point B Beacon */}
            <g transform="translate(1130, 250)">
              <circle cx="0" cy="0" r="24" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="12" fill="#10B981" />
              <circle cx="0" cy="0" r="5" fill="#FFFFFF" />
              <text x="0" y="-34" fill="#1E1B18" fontSize="13" fontWeight="900" textAnchor="middle">
                POINT B
              </text>
              <text x="0" y="-20" fill="#047857" fontSize="10" fontWeight="700" textAnchor="middle">
                Your Destination
              </text>
            </g>

            {/* Hexagonal Bases on Top Track */}
            <path
              d={makeHexagonPath(QUEENS_CONFIG.safe.cx, QUEENS_CONFIG.safe.cy, 60)}
              fill="url(#${idPrefix}-safeGlow)"
              stroke="#10B981"
              strokeWidth={selectedQueen === 'safe' ? '2.5' : '1.5'}
              strokeDasharray={selectedQueen === 'safe' ? 'none' : '4 4'}
              className="transition-all duration-300"
            />
            <path
              d={makeHexagonPath(QUEENS_CONFIG.fast.cx, QUEENS_CONFIG.fast.cy, 60)}
              fill="url(#${idPrefix}-fastGlow)"
              stroke="#3B82F6"
              strokeWidth={selectedQueen === 'fast' ? '2.5' : '1.5'}
              strokeDasharray={selectedQueen === 'fast' ? 'none' : '4 4'}
              className="transition-all duration-300"
            />
            <path
              d={makeHexagonPath(QUEENS_CONFIG.economy.cx, QUEENS_CONFIG.economy.cy, 60)}
              fill="url(#${idPrefix}-ecoGlow)"
              stroke="#F59E0B"
              strokeWidth={selectedQueen === 'economy' ? '2.5' : '1.5'}
              strokeDasharray={selectedQueen === 'economy' ? 'none' : '4 4'}
              className="transition-all duration-300"
            />
          </svg>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 👑 3 ROYAL DOUBLE-HEXAGON SANCTUARIES (STAGE 1.2 & 1.3)    */}
      {/* ========================================================= */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-8">
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

              {/* Disruptive Marketing Headline (Consumer Hook) */}
              <div className="my-2 p-3 rounded-2xl bg-amber-100/60 border border-amber-300/50 text-center">
                <p className="text-sm font-extrabold text-stone-900 leading-snug">
                  "{queen.headlinePromise}"
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

      {/* ========================================================= */}
      {/* 🍯 ANIMATED SVG HONEY CONNECTOR BEAM & FLOATING BEES       */}
      {/* ========================================================= */}
      <div
        data-testid="preview-connector-beam"
        className="w-full flex flex-col items-center justify-center my-4 pointer-events-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 400 40" className="w-64 h-10 overflow-visible">
          <defs>
            <linearGradient id={`${idPrefix}-beamGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D97706" stopOpacity="0.8" />
              <stop offset="50%" stopColor={activeQueenConfig.color} stopOpacity="1" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path
            d="M 200 0 L 200 40"
            stroke={`url(#${idPrefix}-beamGrad)`}
            strokeWidth="4"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
          <circle cx="200" cy="20" r="6" fill={activeQueenConfig.color} className="animate-ping" />
        </svg>
      </div>

      {/* ========================================================= */}
      {/* 🐝 UNIFIED INTERACTIVE BEEHIVE ROUTE PREVIEW STAGE        */}
      {/* (#queen-route-preview) 100% DECLARATIVE SVG + CSS         */}
      {/* ========================================================= */}
      <div
        id="queen-route-preview"
        data-testid="queen-route-preview"
        ref={previewRef}
        className="relative w-full rounded-3xl bg-amber-50/90 backdrop-blur-md border-2 border-amber-300/80 p-5 sm:p-7 shadow-2xl text-stone-900 transition-all duration-300"
      >
        {/* Route Preview Header: Plan Identity, Headline, Consumer Message & Header Toggles */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-5 border-b border-amber-200/80 gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-colors duration-300 mt-0.5"
              style={{ backgroundColor: activeQueenConfig.color }}
            >
              {selectedQueen === 'safe' && <ShieldCheck className="w-7 h-7" />}
              {selectedQueen === 'fast' && <Zap className="w-7 h-7" />}
              {selectedQueen === 'economy' && <Coins className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900/80">
                  Interactive Beehive Route Preview • Point A to Point B
                </span>
                <span
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs"
                  style={{
                    backgroundColor: `${activeQueenConfig.color}25`,
                    color: activeQueenConfig.color,
                    border: `1px solid ${activeQueenConfig.color}50`,
                  }}
                >
                  {selectedQueen.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-stone-950 mt-0.5 leading-snug">
                {selectedQueen === 'safe' &&
                  'Always Arrive On Time. Built-In Cushion for Any Delay.'}
                {selectedQueen === 'fast' &&
                  'There Is Simply No Faster Route From A to B.'}
                {selectedQueen === 'economy' &&
                  'Calm, Unrushed Journey with Longer Stops When You Have No Deadline.'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 mt-1 max-w-2xl leading-relaxed">
                {selectedQueen === 'safe' &&
                  'You always arrive on time at Point B—our built-in margin of error automatically accounts for extra buffer time in case another train runs late.'}
                {selectedQueen === 'fast' &&
                  'There is simply no faster route from Point A to Point B—fly nonstop past every slow intermediate halt.'}
                {selectedQueen === 'economy' &&
                  "A calm, unhurried route with longer stops along the way—built for when you are not in a rush, don't need to arrive by a strict time, and want to pay the lowest price."}
              </p>
            </div>
          </div>

          {/* Plan-Specific Toggles & Status in Header */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
            {selectedQueen === 'safe' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-amber-100/90 border border-amber-300">
                  <button
                    type="button"
                    data-testid="safe-ontime-btn"
                    onClick={() => setSafeDelayScenario('ontime')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      safeDelayScenario === 'ontime'
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold'
                        : 'text-stone-700 hover:bg-amber-200/80'
                    }`}
                  >
                    [ On-Time First Leg ]
                  </button>
                  <button
                    type="button"
                    data-testid="safe-delay-btn"
                    onClick={() => setSafeDelayScenario('delay15')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      safeDelayScenario === 'delay15'
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold'
                        : 'text-stone-700 hover:bg-amber-200/80'
                    }`}
                  >
                    [ +15 min Unexpected Delay on Leg 1 ]
                  </button>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Emerald Error-Margin Shield (+20 min Built-In Delay Buffer) Active</span>
                </div>
              </div>
            )}

            {selectedQueen === 'fast' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-amber-100/90 border border-amber-300">
                  <button
                    type="button"
                    data-testid="fast-express-toggle"
                    onClick={() => setFastMode('express')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      fastMode === 'express'
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-extrabold'
                        : 'text-stone-700 hover:bg-amber-200/80'
                    }`}
                  >
                    [ Queen Vira Non-Stop Express (1h 40m • Fastest Possible) ]
                  </button>
                  <button
                    type="button"
                    data-testid="fast-standard-toggle"
                    onClick={() => setFastMode('standard')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      fastMode === 'standard'
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-extrabold'
                        : 'text-stone-700 hover:bg-amber-200/80'
                    }`}
                  >
                    [ Standard Multi-Stop Line (2h 35m) ]
                  </button>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>-55 minutes saved</span>
                </div>
              </div>
            )}

            {selectedQueen === 'economy' && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500 text-stone-950 shadow-xs border border-amber-600/30">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Save up to 40%</span>
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Click any Beehive to inspect</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Status Notification Banner for Safe Mode */}
        {selectedQueen === 'safe' && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300/80 text-emerald-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {safeDelayScenario === 'delay15' ? (
                  <>
                    <strong>15 minutes of unexpected delay absorbed</strong> safely inside Queen
                    Meli's +20 min cushion. Remaining buffer: 5 minutes. Transfer preserved at
                    Central Junction Hive. Arrival at Point B remains{' '}
                    <strong>100% On Time</strong>!
                  </>
                ) : (
                  <>
                    Standard smooth run: Full +20 min buffer available. Stroll calmly between
                    platforms, grab a coffee, and arrive <strong>100% On Time</strong> at Point B.
                  </>
                )}
              </span>
            </div>
            <span className="shrink-0 font-black px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
              100% On Time
            </span>
          </div>
        )}

        {/* Master Route Preview SVG Canvas (1200 x 480) */}
        <div className="relative w-full aspect-[1200/480] min-h-[340px] my-4">
          <svg
            viewBox="0 0 1200 480"
            className="w-full h-full drop-shadow-sm"
            style={{ overflow: 'visible' }}
            aria-label="Interactive Beehive Route Map"
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
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>

              <linearGradient id={`${idPrefix}-previewEco`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              <radialGradient id={`${idPrefix}-emeraldDomeGrad`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.38" />
                <stop offset="60%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#064E3B" stopOpacity="0.05" />
              </radialGradient>

              <filter id={`${idPrefix}-beeGlow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id={`${idPrefix}-arcGlow`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ------------------------------------------------------------- */}
            {/* 2.1 QUEEN MELI (SAFE): 2-LEG ROUTE WITH CENTRAL DOME & BUFFER */}
            {/* ------------------------------------------------------------- */}
            {selectedQueen === 'safe' && (
              <g>
                {/* Leg 1: Point A -> Meadow -> Sunny Creek -> Central Junction */}
                <path
                  d="M 90 250 L 260 250 L 430 250 L 600 250"
                  fill="none"
                  stroke={`url(#${idPrefix}-previewSafe)`}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 90 250 L 600 250"
                  fill="none"
                  stroke="#FEF08A"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  opacity="0.8"
                />
                <text
                  x="345"
                  y="180"
                  fill="#065F46"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                  className="tracking-wider uppercase"
                >
                  LEG 1: FEEDER LINE (Point A ➔ Central Junction)
                </text>

                {/* Leg 2: Central Junction -> Amber Ridge -> Orchard Valley -> Point B */}
                <path
                  d="M 600 250 L 770 250 L 940 250 L 1110 250"
                  fill="none"
                  stroke={`url(#${idPrefix}-previewSafe)`}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 600 250 L 1110 250"
                  fill="none"
                  stroke="#FEF08A"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  opacity="0.8"
                />
                <text
                  x="855"
                  y="180"
                  fill="#065F46"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                  className="tracking-wider uppercase"
                >
                  LEG 2: PROTECTED CONNECTING LINE (Central Junction ➔ Point B)
                </text>

                {/* Pulsing Emerald Error-Margin Dome at Central Junction Hive */}
                <g data-testid="emerald-delay-shield">
                  <circle
                    cx="600"
                    cy="250"
                    r={safeDelayScenario === 'delay15' ? 76 : 68}
                    fill={`url(#${idPrefix}-emeraldDomeGrad)`}
                    stroke="#10B981"
                    strokeWidth={safeDelayScenario === 'delay15' ? 3.5 : 2}
                    className="animate-pulse"
                  />
                  <path
                    d="M 600 195 L 636 220 L 636 265 Q 600 300 564 265 L 564 220 Z"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    opacity="0.85"
                  />
                  {/* Dome Header Pill */}
                  <g transform="translate(600, 145)">
                    <rect
                      x="-120"
                      y="-12"
                      width="240"
                      height="24"
                      rx="12"
                      fill="#064E3B"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                    <text
                      x="0"
                      y="4"
                      fill="#A7F3D0"
                      fontSize="10.5"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      🛡️ +20 min Built-In Delay Margin
                    </text>
                  </g>
                  {/* Dynamic Visual Buffer Meter */}
                  <g transform="translate(600, 325)">
                    <rect
                      x="-105"
                      y="-12"
                      width="210"
                      height="24"
                      rx="12"
                      fill="#064E3B"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                    {safeDelayScenario === 'delay15' ? (
                      <>
                        <rect
                          x="-101"
                          y="-8"
                          width="150"
                          height="16"
                          rx="8"
                          fill="#10B981"
                          className="animate-pulse"
                        />
                        <rect x="53" y="-8" width="48" height="16" rx="8" fill="#047857" />
                        <text
                          x="0"
                          y="3.5"
                          fill="#ECFDF5"
                          fontSize="8.5"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          15 min Absorbed • 5 min Buffer Left
                        </text>
                      </>
                    ) : (
                      <>
                        <rect x="-101" y="-8" width="202" height="16" rx="8" fill="#10B981" />
                        <text
                          x="0"
                          y="3.5"
                          fill="#ECFDF5"
                          fontSize="8.5"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          Full +20m Delay Buffer Intact (0m Delay)
                        </text>
                      </>
                    )}
                  </g>
                </g>

                {/* Point B 100% On Time Badge */}
                <g transform="translate(1110, 325)">
                  <rect
                    x="-72"
                    y="-11"
                    width="144"
                    height="22"
                    rx="11"
                    fill="#064E3B"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4"
                    fill="#A7F3D0"
                    fontSize="9.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    100% ON TIME ✅
                  </text>
                </g>
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2.2 QUEEN VIRA (FAST): SUPERSONIC DIRECT BYPASS ARC           */}
            {/* ------------------------------------------------------------- */}
            {selectedQueen === 'fast' && (
              <g>
                {/* Dimmed Faded Lower Track for intermediate 5 hives */}
                <line
                  x1="180"
                  y1="370"
                  x2="1020"
                  y2="370"
                  stroke="#94A3B8"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  opacity="0.35"
                />
                <text
                  x="600"
                  y="435"
                  fill="#64748B"
                  fontSize="10"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  Bypassed • 0 Wasted Stops (Dimmed Intermediate Track)
                </text>

                {/* Bold Elevated Supersonic Electric-Blue Express Arch */}
                <path
                  d={PREVIEW_PATH_FAST}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  filter={`url(#${idPrefix}-arcGlow)`}
                />
                <path
                  d={PREVIEW_PATH_FAST}
                  fill="none"
                  stroke="#BFDBFE"
                  strokeWidth="3"
                  strokeDasharray="14 8"
                  strokeLinecap="round"
                />

                {/* Elevated Express Arch Banner at Apex */}
                <g transform="translate(600, 60)">
                  <rect
                    x="-195"
                    y="-14"
                    width="390"
                    height="28"
                    rx="14"
                    fill="#1E3A8A"
                    stroke="#3B82F6"
                    strokeWidth="2"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fill="#BFDBFE"
                    fontSize="10.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    ⚡ SUPERSONIC DIRECT EXPRESS ARC • 0 STOPS (-55 minutes saved)
                  </text>
                </g>

                {/* Non-Stop Departure & Record Arrival Badges */}
                <g transform="translate(90, 275)">
                  <rect
                    x="-55"
                    y="-9"
                    width="110"
                    height="18"
                    rx="9"
                    fill="#1E3A8A"
                    stroke="#3B82F6"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    fill="#BFDBFE"
                    fontSize="8.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    Non-Stop Departure
                  </text>
                </g>

                <g transform="translate(1110, 275)">
                  <rect
                    x="-90"
                    y="-9"
                    width="180"
                    height="18"
                    rx="9"
                    fill="#1E3A8A"
                    stroke="#3B82F6"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    fill="#BFDBFE"
                    fontSize="8.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    Non-Stop Record Arrival (1h 40m)
                  </text>
                </g>
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2.3 QUEEN FLORA (ECONOMY): CALM UNRUSHED SCENIC HONEY WAVE   */}
            {/* ------------------------------------------------------------- */}
            {selectedQueen === 'economy' && (
              <g>
                {/* Warm Wavy Sinusoidal Path weaving through all 7 hives */}
                <path
                  d={PREVIEW_PATH_ECONOMY}
                  fill="none"
                  stroke={`url(#${idPrefix}-previewEco)`}
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d={PREVIEW_PATH_ECONOMY}
                  fill="none"
                  stroke="#FEF08A"
                  strokeWidth="2.5"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                />

                {/* Scenic Wave Header Banner */}
                <g transform="translate(600, 60)">
                  <rect
                    x="-205"
                    y="-14"
                    width="410"
                    height="28"
                    rx="14"
                    fill="#78350F"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fill="#FEF3C7"
                    fontSize="10.5"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    🍯 WARM SCENIC HONEY WAVE • LONGER CALM STOPS & LOWEST FARE
                  </text>
                </g>
              </g>
            )}

            {/* --------------------------------------------------------- */}
            {/* 7 BEEHIVE STATIONS (data-testid="preview-beehive-station") */}
            {/* --------------------------------------------------------- */}
            {BEEHIVE_STATIONS.map((station, index) => {
              const coords = getStationCoords(index, selectedQueen);
              const isOriginOrDest = index === 0 || index === BEEHIVE_STATIONS.length - 1;
              const isIntermediate = !isOriginOrDest;
              const isSkippedInFast = selectedQueen === 'fast' && isIntermediate;
              const isCentralTransfer = station.id === 'central-junction';
              const isInspected = inspectedStationId === station.id;

              const relaxedPill = FLORA_RELAXED_PILLS[index];

              return (
                <g
                  key={station.id}
                  data-testid="preview-beehive-station"
                  transform={`translate(${coords.x}, ${coords.y})`}
                  onClick={() => setInspectedStationId(station.id)}
                  className="cursor-pointer group"
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect ${station.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setInspectedStationId(station.id);
                    }
                  }}
                  opacity={isSkippedInFast ? 0.35 : 1}
                  style={{
                    filter: isSkippedInFast ? 'grayscale(100%)' : undefined,
                    transition: 'all 0.4s ease',
                  }}
                >
                  {/* Station Inspected Halo Ring */}
                  {isInspected && (
                    <circle
                      cx="0"
                      cy="0"
                      r="48"
                      fill="none"
                      stroke={activeQueenConfig.color}
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      className="animate-spin-slow origin-center"
                    />
                  )}

                  {/* Economy Mode: Warm Amber Honey Glow */}
                  {selectedQueen === 'economy' && isIntermediate && (
                    <circle
                      cx="0"
                      cy="0"
                      r="40"
                      fill="#F59E0B"
                      fillOpacity="0.18"
                      stroke="#F59E0B"
                      strokeWidth="1"
                    />
                  )}

                  {/* SVG Beehive Graphic */}
                  <g
                    className="transform transition-transform duration-200 group-hover:scale-110"
                    transform={
                      selectedQueen === 'safe' && isCentralTransfer ? 'scale(1.22)' : 'scale(1)'
                    }
                  >
                    {/* Stand */}
                    <polygon
                      points="-20,24 20,24 22,28 -22,28"
                      fill="#78350F"
                      stroke="#451A03"
                      strokeWidth="1"
                    />
                    {/* Tier 4 */}
                    <rect
                      x="-22"
                      y="14"
                      width="44"
                      height="10"
                      rx="4"
                      fill="#F59E0B"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />
                    {/* Tier 3 */}
                    <rect
                      x="-19"
                      y="4"
                      width="38"
                      height="9"
                      rx="3.5"
                      fill="#FBBF24"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />
                    {/* Tier 2 */}
                    <rect
                      x="-15"
                      y="-5"
                      width="30"
                      height="8"
                      rx="3"
                      fill="#FDE68A"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />
                    {/* Tier 1 (Dome) */}
                    <path
                      d="M -11 -5 Q 0 -17 11 -5 Z"
                      fill="#FDE68A"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />
                    <circle cx="0" cy="-15" r="2.5" fill="#B45309" />
                    {/* Door */}
                    <path d="M -5 24 A 5 5 0 0 1 5 24 Z" fill="#1C1917" />
                    <circle cx="0" cy="24" r="1.5" fill="#FEF08A" />
                    {/* Honeycomb Emblem */}
                    <polygon
                      points="0,-1 3,1 3,4 0,6 -3,4 -3,1"
                      fill="#FEF3C7"
                      stroke="#B45309"
                      strokeWidth="0.8"
                    />
                  </g>

                  {/* Station Name Labels */}
                  <text
                    x="0"
                    y="-36"
                    fill="#1E1B18"
                    fontSize="10"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    {station.name}
                  </text>
                  <text
                    x="0"
                    y="-23"
                    fill="#78350F"
                    fontSize="8.5"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {station.role}
                  </text>

                  {/* Fast Mode: Intermediate Skipped Badges */}
                  {isSkippedInFast && (
                    <g transform="translate(0, 42)">
                      <rect
                        x="-55"
                        y="-9"
                        width="110"
                        height="18"
                        rx="9"
                        fill="#1E293B"
                        opacity="0.85"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#94A3B8"
                        fontSize="8"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        Skipped • 0 Wasted Stops
                      </text>
                    </g>
                  )}

                  {/* Economy Mode: Floating Relaxed Stop Pill ABOVE Hive */}
                  {selectedQueen === 'economy' && relaxedPill && (
                    <g transform="translate(0, -50)">
                      <rect
                        x="-60"
                        y="-10"
                        width="120"
                        height="20"
                        rx="10"
                        fill="#78350F"
                        stroke="#F59E0B"
                        strokeWidth="1.5"
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

                  {/* Economy Mode: Floating Golden Coin / Savings Badge BELOW Hive */}
                  {selectedQueen === 'economy' && isIntermediate && (
                    <g transform="translate(0, 44)">
                      <rect
                        x="-48"
                        y="-9"
                        width="96"
                        height="18"
                        rx="9"
                        fill="#78350F"
                        stroke="#F59E0B"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#FEF08A"
                        fontSize="8.5"
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        -40% Fare
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* --------------------------------------------------------- */}
            {/* 🐝 QUEEN-COLORED BEE LOCOMOTIVE                           */}
            {/* --------------------------------------------------------- */}
            <g
              data-testid="route-preview-bee-locomotive"
              data-bee-color={selectedQueen}
              className="pointer-events-none"
            >
              <animateMotion
                path={activePreviewRoutePath}
                dur={
                  selectedQueen === 'fast'
                    ? '2.2s'
                    : selectedQueen === 'safe'
                    ? '6s'
                    : '9.5s'
                }
                repeatCount="indefinite"
                rotate="auto"
              />

              {/* Fast Mode: Trailing Supersonic Speed Lines */}
              {selectedQueen === 'fast' && (
                <g opacity="0.9">
                  <line
                    x1="-18"
                    y1="-8"
                    x2="-48"
                    y2="-16"
                    stroke="#60A5FA"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                  <line
                    x1="-22"
                    y1="0"
                    x2="-60"
                    y2="0"
                    stroke="#93C5FD"
                    strokeWidth="3"
                    strokeDasharray="8 4"
                  />
                  <line
                    x1="-18"
                    y1="8"
                    x2="-48"
                    y2="16"
                    stroke="#60A5FA"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                </g>
              )}

              {/* Safe / Economy Nectar Wake */}
              {selectedQueen !== 'fast' && (
                <ellipse
                  cx="-22"
                  cy="0"
                  rx="14"
                  ry="5"
                  fill={activeQueenConfig.color}
                  opacity="0.5"
                  filter={`url(#${idPrefix}-beeGlow)`}
                />
              )}

              {/* Bee Body Assembly */}
              <g transform="scale(1.2)">
                {/* Fluttering Wings */}
                <ellipse
                  cx="-2"
                  cy="-9"
                  rx="7"
                  ry="4"
                  fill="#FFFFFF"
                  opacity="0.85"
                  transform="rotate(-20 -2 -9)"
                >
                  <animate
                    attributeName="ry"
                    values="4;1;4"
                    dur="0.12s"
                    repeatCount="indefinite"
                  />
                </ellipse>
                <ellipse
                  cx="4"
                  cy="-9"
                  rx="6"
                  ry="3.5"
                  fill="#FFFFFF"
                  opacity="0.8"
                  transform="rotate(15 4 -9)"
                >
                  <animate
                    attributeName="ry"
                    values="3.5;1;3.5"
                    dur="0.12s"
                    repeatCount="indefinite"
                  />
                </ellipse>

                {/* Abdomen & Thorax */}
                <ellipse cx="0" cy="0" rx="12" ry="8" fill="#1C1917" />
                {/* Signature Queen Color Stripes */}
                <path
                  d="M -6 -7 Q -4 0 -6 7"
                  stroke={activeQueenConfig.color}
                  strokeWidth="2.5"
                  fill="none"
                />
                <path d="M -1 -8 Q 1 0 -1 8" stroke="#FBBF24" strokeWidth="2.5" fill="none" />
                <path
                  d="M 4 -7 Q 6 0 4 7"
                  stroke={activeQueenConfig.color}
                  strokeWidth="2.5"
                  fill="none"
                />

                {/* Head */}
                <circle cx="10" cy="0" r="4.5" fill="#1C1917" />
                <circle cx="11" cy="-1.5" r="1.5" fill="#FFFFFF" />
                <circle cx="11.5" cy="-1.5" r="0.8" fill="#1C1917" />
                {/* Antennae */}
                <path
                  d="M 12 -3 Q 15 -7 18 -6"
                  stroke="#1C1917"
                  strokeWidth="1"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 12 -1 Q 16 -3 18 -1"
                  stroke="#1C1917"
                  strokeWidth="1"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>

              {/* 3 Tiny Escort Worker Bees in Formation */}
              <g transform="translate(-24, -14) scale(0.65)">
                <circle r="4" fill="#F59E0B" />
                <ellipse cx="0" cy="-3" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.8" />
              </g>
              <g transform="translate(-26, 14) scale(0.6)">
                <circle r="4" fill="#F59E0B" />
                <ellipse cx="0" cy="-3" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.8" />
              </g>
              <g transform="translate(-36, 0) scale(0.55)">
                <circle r="4" fill="#F59E0B" />
                <ellipse cx="0" cy="-3" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.8" />
              </g>
            </g>
          </svg>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* COMPACT STATION INSPECTION BAR (Details for clicked Beehive) */}
        {/* ----------------------------------------------------------- */}
        {inspectedStation && (
          <div className="mt-2 p-3 sm:p-4 rounded-2xl bg-white/95 border border-amber-200/90 shadow-sm flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: activeQueenConfig.color }}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-stone-950 text-sm">
                    {inspectedStation.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {inspectedStation.role}
                  </span>
                  {selectedQueen === 'economy' && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400">
                      +12m Relaxed Stop • Save up to 40%
                    </span>
                  )}
                </div>
                <p className="text-stone-700 mt-0.5 truncate">
                  {selectedQueen === 'safe' && inspectedStation.safeRole}
                  {selectedQueen === 'fast' &&
                    (inspectedStation.id === 'origin' || inspectedStation.id === 'destination'
                      ? 'Non-stop express terminal: 0 wasted stops.'
                      : 'Skipped • 0 Wasted Stops: Direct bypass saves 55 minutes.')}
                  {selectedQueen === 'economy' &&
                    (inspectedStation.stopMinutesFlora > 0
                      ? `${inspectedStation.stopMinutesFlora} min calm stop — stretch your legs, zero rush. Cumulative pocket savings: ${inspectedStation.savingsFlora} kept in your pocket vs standard ticket.`
                      : 'Arrival Hub: Arrived calm & relaxed with the most money in your pocket.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectedStationId(null)}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg shrink-0 cursor-pointer"
              aria-label="Close station inspection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default QueenBeesSection;
