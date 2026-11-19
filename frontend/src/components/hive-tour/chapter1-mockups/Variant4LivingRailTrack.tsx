'use client';

import React, { useState, useEffect, useId, useRef } from 'react';
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
  TrendingUp,
  MapPin,
  Timer,
  Smile,
  AlertTriangle,
} from 'lucide-react';
import MascotBee, { MascotGear } from '../../MascotBee';
import MiniWorkerBee from '../MiniWorkerBee';
import { RoyalCrownSvg } from '../HiveSvgProps';

export interface Variant4LivingRailTrackProps {
  activeGear?: MascotGear;
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
  onSelectGear?: (gear: 'safe' | 'fast' | 'economy') => void;
}

export type LivingRailQueenGear = 'safe' | 'fast' | 'economy';
type QueenGear = LivingRailQueenGear;

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
  description: string;
  headlinePromise: string;
  humanOutcome: string;
  keyFeatures: string[];
  heroMetric: string;
  heroDetail: string;
  testId: string;
  // Topological coordinate anchors (in 1200 x 620 SVG space)
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
    subtitle: 'Stress-Free Station Transfers & Generous Buffer Times',
    headlinePromise: 'Never Sprint Across a Station Platform Again.',
    humanOutcome: 'Stress-free transfers with breathing room, even when your first train runs late.',
    description:
      'Never sprint breathlessly between train platforms with heavy luggage. Queen Meli automatically builds generous breathing room into your connection, so you can grab a warm coffee and walk calmly to your next train.',
    keyFeatures: [
      'Stress-Free Platform Transfer Window',
      'Automatic Walking Time Between Platforms',
      'Guaranteed Calm Connection Even in Bad Weather',
    ],
    heroMetric: '96/100 Buffer',
    heroDetail: 'Peace of Mind Transfer Score',
    testId: 'queen-card-safe',
    cx: 320,
    cy: 220,
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
    headlinePromise: 'Your Time Belongs at Your Destination, Not on the Tracks.',
    humanOutcome: 'Direct Point A to Point B routes that skip pointless village stops.',
    description:
      'Why waste half your day crawling between tiny village stations? Queen Vira scours the rails for direct, non-stop express routes that get you to your hotel, meeting, or family in record time.',
    keyFeatures: [
      '0 Intermediate Village Stops',
      'Point-to-Point Direct Corridor Routing',
      'Reclaim 45+ Minutes of Free Life',
    ],
    heroMetric: '0 Stopovers',
    heroDetail: 'Direct Corridor Velocity',
    testId: 'queen-card-fast',
    cx: 880,
    cy: 220,
  },
  economy: {
    gear: 'economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    title: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Regina Flora — Matca Economiei Inteligente',
    badge: 'BEST VALUE HARVEST',
    color: '#D97706',
    glowHex: '#F59E0B',
    borderColor: 'border-amber-400',
    bgLight: 'bg-amber-50/70',
    subtitle: 'Automatic Price Matching Across Every Train on Your Route',
    headlinePromise: 'Same Track. Same View. Up to 40% More Money in Your Pocket.',
    humanOutcome: 'Automatically finds the lowest ticket price across all trains on your route without you having to know a single train company.',
    description:
      'Different train companies run on the exact same rails, charging vastly different ticket prices for the exact same view. Queen Flora automatically finds you the lowest fare without you having to know a single train company.',
    keyFeatures: [
      'Automatic Lowest Fare Comparison',
      'Same Scenic Window View for Less Money',
      'Up to 40% Cash Kept in Your Pocket',
    ],
    heroMetric: '-40% LEI',
    heroDetail: 'Lowest Price Guarantee',
    testId: 'queen-card-economy',
    cx: 600,
    cy: 390,
  },
};

// Mathematical helper to produce regular pointy-topped hexagons
function makeHexagonPath(cx: number, cy: number, r: number): string {
  const dx = Math.round(r * 0.866025 * 10) / 10;
  const dy = Math.round(r * 0.5 * 10) / 10;
  return `M ${cx} ${cy - r} L ${cx + dx} ${cy - dy} L ${cx + dx} ${cy + dy} L ${cx} ${cy + r} L ${cx - dx} ${cy + dy} L ${cx - dx} ${cy - dy} Z`;
}

export const Variant4LivingRailTrack: React.FC<Variant4LivingRailTrackProps> = ({
  activeGear = 'safe',
  onSelectQueen,
  onSelectGear,
}) => {
  const idPrefix = useId().replace(/:/g, '');
  const [selectedQueen, setSelectedQueen] = useState<QueenGear>(
    activeGear === 'fast' || activeGear === 'economy' ? activeGear : 'safe'
  );

  // Queen Meli Scenario State: 'ontime' | 'late15' | 'late25'
  const [meliScenario, setMeliScenario] = useState<'ontime' | 'late15' | 'late25'>('late15');

  // Queen Vira Mode State: 'express' | 'stopping'
  const [viraMode, setViraMode] = useState<'express' | 'stopping'>('express');

  // Queen Flora Scope State: 'single' | 'weekend' | 'monthly'
  const [floraScope, setFloraScope] = useState<'single' | 'weekend' | 'monthly'>('single');

  // Pulse animation cycle counter
  const [pulseCycle, setPulseCycle] = useState<number>(0);

  // Sync internal state when external prop changes
  useEffect(() => {
    if (activeGear === 'safe' || activeGear === 'fast' || activeGear === 'economy') {
      setSelectedQueen(activeGear);
    }
  }, [activeGear]);

  // Handle Queen Selection with Switch Throw & Pulse Animation
  const handleSelect = (gear: QueenGear) => {
    setSelectedQueen(gear);
    setPulseCycle((c) => c + 1);
    if (onSelectQueen) onSelectQueen(gear);
    if (onSelectGear) onSelectGear(gear);
  };

  const activeConfig = QUEENS_CONFIG[selectedQueen];

  // SVG Railway Topological Paths (1200 x 620 coordinate space)
  // Origin: Point A (100, 310) -> Switch (280, 310)
  // Branch Safe: (280, 310) -> curves up to (320, 220) -> (600, 160) -> Destination (1100, 310)
  // Branch Fast: (280, 310) -> (600, 220) -> (880, 220) -> Destination (1100, 310)
  // Branch Economy: (280, 310) -> curves down to (600, 390) -> Destination (1100, 310)
  const TRACK_ORIGIN = 'M 80 310 L 260 310';
  const TRACK_SAFE = 'M 260 310 C 275 270, 290 220, 320 220 C 370 220, 480 170, 600 170 C 760 170, 960 250, 1120 310';
  const TRACK_FAST = 'M 260 310 C 380 310, 500 240, 600 240 C 740 240, 800 220, 880 220 C 960 220, 1040 270, 1120 310';
  const TRACK_ECONOMY = 'M 260 310 C 340 310, 440 390, 600 390 C 760 390, 940 370, 1120 310';

  const activeTrackPath =
    selectedQueen === 'safe' ? TRACK_SAFE : selectedQueen === 'fast' ? TRACK_FAST : TRACK_ECONOMY;

  return (
    <div
      data-testid="variant-4-living-rail-track"
      className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none"
    >
      {/* ========================================================= */}
      {/* 🌟 POINT A -> POINT B GOLDEN RAIL SVG CANVAS              */}
      {/* ========================================================= */}
      <div className="relative w-full overflow-hidden rounded-3xl bg-amber-50/40 backdrop-blur-xs border border-amber-300/40 p-4 sm:p-6 shadow-lg mb-8">
        {/* Subtle Railway Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-900/80">
              Living Golden Rail • Point A to Point B Flow
            </span>
          </div>
          <div className="text-[11px] font-bold text-amber-800/80 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
            Interactive Railway Switch: <span className="font-black text-amber-950 uppercase">{selectedQueen}</span>
          </div>
        </div>

        {/* Master SVG Canvas */}
        <div className="relative w-full aspect-[1200/580] min-h-[360px]">
          <svg
            viewBox="0 0 1200 580"
            className="w-full h-full drop-shadow-sm"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Amber Rail Metallic Gradients */}
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

              {/* Glowing Train Pulse Filter */}
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
              {/* Origin trunk sleepers */}
              {[100, 130, 160, 190, 220, 250].map((x) => (
                <line key={`sleeper-orig-${x}`} x1={x} y1="300" x2={x} y2="320" />
              ))}
              {/* Destination sleepers */}
              {[1000, 1030, 1060, 1090, 1120].map((x) => (
                <line key={`sleeper-dest-${x}`} x1={x} y1="300" x2={x} y2="320" />
              ))}
              {/* Branch Safe sleepers */}
              {[300, 340, 390, 450, 520, 600, 700, 800, 900].map((x, i) => (
                <line
                  key={`sleeper-safe-${i}`}
                  x1={x}
                  y1={200 + i * 8}
                  x2={x + 6}
                  y2={220 + i * 8}
                />
              ))}
              {/* Branch Economy sleepers */}
              {[340, 400, 480, 560, 640, 740, 840, 940].map((x, i) => (
                <line
                  key={`sleeper-eco-${i}`}
                  x1={x}
                  y1={370 - (i > 4 ? (i - 4) * 8 : 0)}
                  x2={x + 4}
                  y2={390 - (i > 4 ? (i - 4) * 8 : 0)}
                />
              ))}
            </g>

            {/* 2. DORMANT / INACTIVE GOLDEN TRACKS */}
            <path
              d={TRACK_ORIGIN}
              fill="none"
              stroke="#D97706"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d={TRACK_SAFE}
              fill="none"
              stroke="#10B981"
              strokeWidth={selectedQueen === 'safe' ? '6' : '3'}
              strokeDasharray={selectedQueen === 'safe' ? 'none' : '6 6'}
              opacity={selectedQueen === 'safe' ? 0.95 : 0.4}
              className="transition-all duration-300"
            />
            <path
              d={TRACK_FAST}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={selectedQueen === 'fast' ? '6' : '3'}
              strokeDasharray={selectedQueen === 'fast' ? 'none' : '6 6'}
              opacity={selectedQueen === 'fast' ? 0.95 : 0.4}
              className="transition-all duration-300"
            />
            <path
              d={TRACK_ECONOMY}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={selectedQueen === 'economy' ? '6' : '3'}
              strokeDasharray={selectedQueen === 'economy' ? 'none' : '6 6'}
              opacity={selectedQueen === 'economy' ? 0.95 : 0.4}
              className="transition-all duration-300"
            />

            {/* 3. INNER GLEAM ON ACTIVE TRACK */}
            <path
              d={activeTrackPath}
              fill="none"
              stroke="#FEF08A"
              strokeWidth="2"
              opacity="0.8"
              strokeLinecap="round"
            />

            {/* 4. ANIMATED RAILWAY SWITCH (MACAZ) */}
            <g
              data-testid="rail-switch-south"
              transform="translate(260, 310)"
              className="transition-transform duration-500 ease-out"
            >
              {/* Mechanical Switch Frog Base */}
              <circle cx="0" cy="0" r="14" fill="#78350F" stroke="#F59E0B" strokeWidth="2" />
              {/* Mechanical Pivot Tongue */}
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
              {/* Switch Target Beacon */}
              <circle
                cx={selectedQueen === 'safe' ? '28' : selectedQueen === 'fast' ? '32' : '28'}
                cy={selectedQueen === 'safe' ? '-22' : selectedQueen === 'fast' ? '-6' : '22'}
                r="5"
                fill={activeConfig.color}
                className="animate-pulse"
              />
            </g>

            {/* Switch Labels & Signal Aspects */}
            <g data-testid="rail-switch-central" transform="translate(230, 270)">
              <rect x="-10" y="-12" width="75" height="20" rx="10" fill="#1E1B18" opacity="0.85" />
              <text x="27" y="2" fill="#FEF08A" fontSize="9" fontWeight="900" textAnchor="middle">
                MACAZ 1
              </text>
            </g>

            {/* Signals for test contracts */}
            <circle
              data-testid="rail-signal-meli"
              cx="320"
              cy="165"
              r="6"
              fill={selectedQueen === 'safe' ? '#10B981' : '#064E3B'}
            />
            <circle
              data-testid="rail-signal-vira"
              cx="880"
              cy="165"
              r="6"
              fill={selectedQueen === 'fast' ? '#3B82F6' : '#1E3A8A'}
            />
            <circle
              data-testid="rail-signal-flora"
              cx="600"
              cy="450"
              r="6"
              fill={selectedQueen === 'economy' ? '#F59E0B' : '#78350F'}
            />

            {/* 5. POINT A (DEPARTURE) BEACON */}
            <g transform="translate(70, 310)">
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

            {/* 6. POINT B (DESTINATION) BEACON */}
            <g transform="translate(1130, 310)">
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

            {/* 7. ANIMATED TRAIN PULSE ASSEMBLY (Traveling Point A -> Queen -> Point B) */}
            <g id="moving-train-assembly">
              <circle
                r="10"
                fill={activeConfig.color}
                filter={`url(#${idPrefix}-pulseGlow)`}
                className="opacity-90"
              >
                <animateMotion
                  key={`pulse-${pulseCycle}-${selectedQueen}`}
                  path={activeTrackPath}
                  dur="4s"
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
              {/* Secondary tail bead */}
              <circle r="5" fill="#FEF08A" opacity="0.8">
                <animateMotion
                  key={`tail-${pulseCycle}-${selectedQueen}`}
                  path={activeTrackPath}
                  dur="4s"
                  begin="0.12s"
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </g>

            {/* 8. HEXAGONAL SANCTUARY PLATFORMS ON SVG */}
            {/* Queen Meli Hex Base */}
            <path
              d={makeHexagonPath(QUEENS_CONFIG.safe.cx, QUEENS_CONFIG.safe.cy, 76)}
              fill="url(#${idPrefix}-safeGlow)"
              stroke="#10B981"
              strokeWidth={selectedQueen === 'safe' ? '3' : '1.5'}
              strokeDasharray={selectedQueen === 'safe' ? 'none' : '4 4'}
              className="transition-all duration-300"
            />
            {/* Queen Vira Hex Base */}
            <path
              d={makeHexagonPath(QUEENS_CONFIG.fast.cx, QUEENS_CONFIG.fast.cy, 76)}
              fill="url(#${idPrefix}-fastGlow)"
              stroke="#3B82F6"
              strokeWidth={selectedQueen === 'fast' ? '3' : '1.5'}
              strokeDasharray={selectedQueen === 'fast' ? 'none' : '4 4'}
              className="transition-all duration-300"
            />
            {/* Queen Flora Hex Base */}
            <path
              d={makeHexagonPath(QUEENS_CONFIG.economy.cx, QUEENS_CONFIG.economy.cy, 76)}
              fill="url(#${idPrefix}-ecoGlow)"
              stroke="#F59E0B"
              strokeWidth={selectedQueen === 'economy' ? '3' : '1.5'}
              strokeDasharray={selectedQueen === 'economy' ? 'none' : '4 4'}
              className="transition-all duration-300"
            />
          </svg>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 👑 3 MONUMENTAL DOUBLE-HEXAGON ROYAL SANCTUARIES          */}
      {/* ========================================================= */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-10">
        {(['safe', 'fast', 'economy'] as QueenGear[]).map((gear) => {
          const queen = QUEENS_CONFIG[gear];
          const isSelected = selectedQueen === gear;

          return (
            <div
              key={gear}
              data-testid={queen.testId}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleSelect(gear)}
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

              {/* Floating Crown + Mascot Chamber */}
              <div className="relative flex flex-col items-center justify-center pt-2 pb-4">
                {/* Floating Crown SVG */}
                <div className="mb-1 transform transition-transform duration-300 group-hover:-translate-y-1">
                  <RoyalCrownSvg size={30} />
                </div>

                {/* Queen Bee Mascot */}
                <div className="relative">
                  <MascotBee
                    gear={gear}
                    size="xl"
                    animated={isSelected}
                    accessibilityLabel={`${queen.name} Mascot`}
                  />

                  {/* 6 Orbiting Mini Worker Bees */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-2 -left-3">
                      <MiniWorkerBee variant={gear} size={15} delayMs={0} />
                    </div>
                    <div className="absolute -top-1 -right-4">
                      <MiniWorkerBee variant={gear} size={14} delayMs={200} />
                    </div>
                    <div className="absolute top-1/2 -left-5">
                      <MiniWorkerBee variant={gear} size={16} delayMs={400} />
                    </div>
                    <div className="absolute top-1/2 -right-5">
                      <MiniWorkerBee variant={gear} size={15} delayMs={600} />
                    </div>
                    <div className="absolute -bottom-2 left-0">
                      <MiniWorkerBee variant={gear} size={14} delayMs={800} />
                    </div>
                    <div className="absolute -bottom-2 right-0">
                      <MiniWorkerBee variant={gear} size={15} delayMs={1000} />
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

              {/* Queen Identity & Titles */}
              <div className="text-center mt-1 mb-3">
                <span className="text-xs font-bold text-amber-900/70 block">
                  {queen.name}
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mt-0.5">
                  {queen.roleTitle}
                </h4>
                <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                  {queen.romanianTitle}
                </div>
              </div>

              {/* Disruptive Marketing Headline */}
              <div className="my-2 p-3 rounded-2xl bg-amber-100/60 border border-amber-300/50 text-center">
                <p className="text-sm font-extrabold text-stone-900 leading-snug">
                  "{queen.headlinePromise}"
                </p>
                <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                  {queen.humanOutcome}
                </p>
              </div>

              {/* Hero Metric Pill */}
              <div className="mt-auto pt-3 border-t border-amber-200/60 flex items-center justify-between">
                <div>
                  <span className="text-base font-black text-stone-950 block">
                    {queen.heroMetric}
                  </span>
                  <span className="text-[10px] text-stone-600 font-bold block">
                    {queen.heroDetail}
                  </span>
                </div>
                <div
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'bg-amber-200/70 text-stone-800'
                  }`}
                >
                  {isSelected ? 'Active Track' : 'Switch Track ➔'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* ☕ INTERACTIVE "POINT A -> POINT B" CONSUMER STAGE         */}
      {/* ========================================================= */}
      <div className="w-full bg-amber-50/80 backdrop-blur-md border border-amber-300/70 rounded-3xl p-6 sm:p-8 shadow-xl text-stone-900">
        {/* Stage Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-amber-200/80 gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: activeConfig.color }}
            >
              {selectedQueen === 'safe' && <Coffee className="w-5 h-5" />}
              {selectedQueen === 'fast' && <Zap className="w-5 h-5" />}
              {selectedQueen === 'economy' && <Coins className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-900/80 block">
                POINT A ➔ POINT B CONSUMER PLAYGROUND
              </span>
              <h3 className="text-lg sm:text-xl font-black text-stone-950">
                {selectedQueen === 'safe' && 'The Coffee vs. Panic Transfer Tester'}
                {selectedQueen === 'fast' && 'The Time-Back Visualizer'}
                {selectedQueen === 'economy' && 'The Pocket Money Harvester'}
              </h3>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Active: {activeConfig.name}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CASE 1: QUEEN MELI SAFE — "COFFEE VS PANIC TRANSFER TESTER"  */}
        {/* ------------------------------------------------------------- */}
        {selectedQueen === 'safe' && (
          <div className="pt-6 space-y-6">
            <div>
              <p className="text-sm text-stone-700 leading-relaxed max-w-2xl">
                Ever sprinted across train tracks sweating with heavy suitcases, only to watch your next train pull out of the station? Queen Meli solves platform panic forever by ensuring every connection has real human walking time.
              </p>
            </div>

            {/* Scenario Buttons */}
            <div>
              <span className="text-xs font-black text-stone-800 uppercase tracking-wide block mb-2">
                Click a Real-Life Delay Scenario:
              </span>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setMeliScenario('ontime')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    meliScenario === 'ontime'
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold'
                      : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                  }`}
                >
                  [ On-Time Day (0m Late) ]
                </button>
                <button
                  type="button"
                  onClick={() => setMeliScenario('late15')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    meliScenario === 'late15'
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold'
                      : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                  }`}
                >
                  [ First Train +15m Late ]
                </button>
                <button
                  type="button"
                  onClick={() => setMeliScenario('late25')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    meliScenario === 'late25'
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold'
                      : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                  }`}
                >
                  [ Heavy Snow +25m Late ]
                </button>
              </div>
            </div>

            {/* Side-by-Side Comparison: Ordinary Ticket vs Queen Meli Protected */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ordinary Ticket (Broken) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50/80 border border-red-300/70 text-stone-900">
                <div className="flex items-center justify-between pb-3 border-b border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-black uppercase text-red-900">
                      Ordinary Tight Ticket
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    8 Min Scheduled Buffer
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-700">
                    <span>Train 1 Arrival:</span>
                    <span className="font-bold">
                      {meliScenario === 'ontime'
                        ? '14:20 (On Time)'
                        : meliScenario === 'late15'
                        ? '14:35 (+15m Late)'
                        : '14:45 (+25m Late)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Train 2 Departure:</span>
                    <span className="font-bold">14:28</span>
                  </div>

                  <div className="pt-2 text-sm font-black">
                    {meliScenario === 'ontime' ? (
                      <span className="text-amber-800">
                        ⚠️ Only 8 minutes! Sprint up stairs, drag luggage, heart rate 145 bpm.
                      </span>
                    ) : (
                      <span className="text-red-700">
                        ❌ CONNECTION MISSED! Train left without you. Stranded on cold platform for 3 hours.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Queen Meli Buffer (100% Stress Free) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-400 text-stone-900 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-emerald-700 animate-bounce" />
                    <span className="text-xs font-black uppercase text-emerald-950">
                      Queen Meli Protected Route
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    29 Min Human Walking Buffer
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-700">
                    <span>Train 1 Arrival:</span>
                    <span className="font-bold">
                      {meliScenario === 'ontime'
                        ? '14:20 (On Time)'
                        : meliScenario === 'late15'
                        ? '14:35 (+15m Late)'
                        : '14:45 (+25m Late)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Connecting Train:</span>
                    <span className="font-bold">14:49 (Platform 2)</span>
                  </div>

                  <div className="pt-2 text-sm font-black text-emerald-900">
                    {meliScenario === 'ontime' && (
                      <span>
                        ☕ 29 calm minutes! Plenty of time to sit down, enjoy a fresh espresso and walk smoothly.
                      </span>
                    )}
                    {meliScenario === 'late15' && (
                      <span>
                        ☕ "You still have 14 minutes to grab a warm coffee and walk calmly to your next train."
                      </span>
                    )}
                    {meliScenario === 'late25' && (
                      <span>
                        ☕ "Still 4 safe minutes. You walk calmly to your next train. 100% stress-free guarantee."
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CASE 2: QUEEN VIRA FAST — "THE TIME-BACK VISUALIZER"          */}
        {/* ------------------------------------------------------------- */}
        {selectedQueen === 'fast' && (
          <div className="pt-6 space-y-6">
            <div>
              <p className="text-sm text-stone-700 leading-relaxed max-w-2xl">
                Every stop at an empty village halt adds 6 minutes of slowing down, waiting, and speeding back up. Queen Vira cuts through the noise with supersonic direct routes that prioritize your life.
              </p>
            </div>

            {/* Toggle Mode */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViraMode('express')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viraMode === 'express'
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-extrabold'
                    : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                }`}
              >
                [ Queen Vira Direct Express ]
              </button>
              <button
                type="button"
                onClick={() => setViraMode('stopping')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viraMode === 'stopping'
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-extrabold'
                    : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                }`}
              >
                [ Ordinary Multi-Stop Train ]
              </button>
            </div>

            {/* Point A -> Point B Visual Progress Bar */}
            <div className="p-5 rounded-2xl bg-amber-100/60 border border-amber-300/70">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-2">
                <span>Point A: Departure (12:30)</span>
                <span>
                  {viraMode === 'express'
                    ? 'Point B: Arrival 14:15 (1h 45m Total)'
                    : 'Point B: Arrival 15:45 (3h 15m Total)'}
                </span>
              </div>

              {/* Progress Line */}
              <div className="relative w-full h-8 bg-stone-200 rounded-full overflow-hidden flex items-center px-2">
                <div
                  className={`h-4 rounded-full transition-all duration-700 ${
                    viraMode === 'express'
                      ? 'w-full bg-gradient-to-r from-blue-500 to-sky-400'
                      : 'w-2/3 bg-stone-400'
                  }`}
                />

                {/* Intermediate Stop Dots */}
                {viraMode === 'stopping' ? (
                  <div className="absolute inset-0 flex justify-between items-center px-8 pointer-events-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((stop) => (
                      <span
                        key={stop}
                        className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white"
                        title={`Village Halt #${stop}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-black text-white uppercase tracking-wider drop-shadow-sm">
                      ⚡ 0 Intermediate Stops • Pure Direct Speed
                    </span>
                  </div>
                )}
              </div>

              {/* Outcome Highlight */}
              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-blue-900 block">
                    {viraMode === 'express'
                      ? 'Direct Point A ➔ Point B Corridors'
                      : '14 Village Intermediate Halts'}
                  </span>
                  <p className="text-sm font-extrabold text-stone-900 mt-0.5">
                    {viraMode === 'express'
                      ? '14:15 — Already checking in and relaxing at your destination.'
                      : '15:45 — Still sitting on the train waiting at empty platform sidings.'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-blue-700 block">
                    {viraMode === 'express' ? '+45 min saved' : '0 min saved'}
                  </span>
                  <span className="text-[10px] text-stone-600 font-bold">
                    {viraMode === 'express' ? 'Free Life Reclaimed' : 'Wasted on Tracks'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CASE 3: QUEEN FLORA ECONOMY — "POCKET MONEY HARVESTER"        */}
        {/* ------------------------------------------------------------- */}
        {selectedQueen === 'economy' && (
          <div className="pt-6 space-y-6">
            <div>
              <p className="text-sm text-stone-700 leading-relaxed max-w-2xl">
                Multiple train companies run on the exact same Romanian rails. Some charge double simply because of their brand name. Queen Flora scans every train automatically so you always pay the lowest price.
              </p>
            </div>

            {/* Scope Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFloraScope('single')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  floraScope === 'single'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 font-extrabold'
                    : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                }`}
              >
                [ Single Trip ]
              </button>
              <button
                type="button"
                onClick={() => setFloraScope('weekend')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  floraScope === 'weekend'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 font-extrabold'
                    : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                }`}
              >
                [ Weekend for Two ]
              </button>
              <button
                type="button"
                onClick={() => setFloraScope('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  floraScope === 'monthly'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 font-extrabold'
                    : 'bg-amber-100/80 text-stone-800 hover:bg-amber-200/80 border border-amber-300/60'
                }`}
              >
                [ Monthly Commute ]
              </button>
            </div>

            {/* Honey Jar Money Filling Stage */}
            <div className="p-5 rounded-2xl bg-amber-100/60 border border-amber-300/70 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* SVG Honey Jar */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-32 h-36">
                  <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
                    {/* Jar Outline */}
                    <path
                      d="M 25 20 L 75 20 C 85 20, 90 30, 90 40 L 85 105 C 85 112, 78 118, 70 118 L 30 118 C 22 118, 15 112, 15 105 L 10 40 C 10 30, 15 20, 25 20 Z"
                      fill="#FEF3C7"
                      stroke="#92400E"
                      strokeWidth="3"
                    />
                    {/* Jar Lid */}
                    <rect x="20" y="8" width="60" height="12" rx="4" fill="#B45309" stroke="#78350F" strokeWidth="2" />

                    {/* Honey Level */}
                    <path
                      d={
                        floraScope === 'single'
                          ? 'M 14 75 Q 50 70, 86 75 L 85 105 C 85 112, 78 118, 70 118 L 30 118 C 22 118, 15 112, 15 105 Z'
                          : floraScope === 'weekend'
                          ? 'M 12 50 Q 50 45, 88 50 L 85 105 C 85 112, 78 118, 70 118 L 30 118 C 22 118, 15 112, 15 105 Z'
                          : 'M 10 32 Q 50 28, 90 32 L 85 105 C 85 112, 78 118, 70 118 L 30 118 C 22 118, 15 112, 15 105 Z'
                      }
                      fill="#F59E0B"
                      className="transition-all duration-500 ease-out"
                    />
                    {/* Golden Coins inside */}
                    <circle cx="50" cy="85" r="9" fill="#FDE047" stroke="#B45309" strokeWidth="1.5" />
                    <text x="50" y="89" fill="#78350F" fontSize="8" fontWeight="900" textAnchor="middle">
                      LEI
                    </text>
                  </svg>
                </div>
                <span className="text-xs font-black text-amber-950 uppercase tracking-wide mt-2">
                  Golden Savings Jar
                </span>
              </div>

              {/* Detailed Breakdown */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-xs font-bold text-stone-700">Ordinary Ticket Search:</span>
                  <span className="text-sm font-black text-stone-900">
                    {floraScope === 'single' ? '63.00 LEI' : floraScope === 'weekend' ? '252.00 LEI' : '1,260.00 LEI'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                  <span className="text-xs font-bold text-emerald-900">Queen Flora Matched Lowest Fare:</span>
                  <span className="text-sm font-black text-emerald-800">
                    {floraScope === 'single' ? '24.50 LEI' : floraScope === 'weekend' ? '98.00 LEI' : '650.00 LEI'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-950">
                    Money Kept in Your Pocket:
                  </span>
                  <span className="text-base font-black text-amber-900">
                    {floraScope === 'single' && 'Save 38.50 LEI (61% More Money)'}
                    {floraScope === 'weekend' && 'Save 154.00 LEI (Weekend For Two)'}
                    {floraScope === 'monthly' && 'Save 600+ LEI Every Month'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Variant4LivingRailTrack;
