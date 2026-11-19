'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  Check,
  Sparkles,
  Play,
  RotateCcw,
  Gauge,
  Clock,
  Shield,
} from 'lucide-react';
import MascotBee, { MascotGear } from '../../MascotBee';
import MiniWorkerBee from '../MiniWorkerBee';
import { RoyalCrownSvg } from '../HiveSvgProps';

export interface Variant1AmphitheaterProps {
  activeGear?: MascotGear;
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
  onSelectGear?: (gear: 'safe' | 'fast' | 'economy') => void;
}

interface QueenProfile {
  gear: 'safe' | 'fast' | 'economy';
  name: string;
  roleTitle: string;
  title: string;
  romanianTitle: string;
  badge: string;
  color: string;
  glowColor: string;
  glowHex: string;
  ringColor: string;
  borderAccent: string;
  bgLight: string;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  mlGuarantee: string;
  testId: string;
}

const QUEENS_CONFIG: Record<'safe' | 'fast' | 'economy', QueenProfile> = {
  safe: {
    gear: 'safe',
    name: 'Queen Meli',
    roleTitle: 'Queen Transfer Guard',
    title: 'Queen Meli • Queen Transfer Guard',
    romanianTitle: 'Queen Meli — Royal Transfer Shield',
    badge: 'SAFE ROUTE GUARDIAN',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    glowHex: '#10B981',
    ringColor: 'ring-emerald-400',
    borderAccent: 'border-emerald-300 hover:border-emerald-500',
    bgLight: 'bg-emerald-50/80',
    subtitle: 'ML Connection Protection & Station Buffers',
    description:
      'Never sprint breathlessly between train platforms. Queen Meli monitors real-time CFR and private rail delay telemetry, protecting train-to-train transfers across single-track intersections with algorithmic safety shields.',
    keyFeatures: [
      '95%+ Missed-Connection Guarantee',
      'Dynamic Rail Junction Buffers (Ploiești, Brașov, Făurei)',
      'Single-Track Train Delay Auto-Shielding',
    ],
    mlGuarantee: '99.5% Transfer AUC Connection Protection',
    testId: 'queen-card-safe',
  },
  fast: {
    gear: 'fast',
    name: 'Queen Vira',
    roleTitle: 'Queen Express Scout',
    title: 'Queen Vira • Queen Express Scout',
    romanianTitle: 'Queen Vira — Supersonic Express Scout',
    badge: 'SUPERSONIC SCOUT',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    glowHex: '#3B82F6',
    ringColor: 'ring-blue-400',
    borderAccent: 'border-blue-300 hover:border-blue-500',
    bgLight: 'bg-blue-50/80',
    subtitle: '0 Stopovers & High-Speed Mainline Rail Dispatch',
    description:
      'Direct routing through Romania’s fastest mainline rail corridors. Queen Vira prioritizes non-stop InterCity (IC) and electric dispatch, bypassing single-track bottlenecks for minimum rail transit time.',
    keyFeatures: [
      '0 Stopovers Prioritization',
      'High-Priority InterCity (IC) & Hyperion Electric Dispatch',
      'Direct Mainline Rail Trunk Links',
    ],
    mlGuarantee: '-60 min saved on Trans-Carpathian Trunk',
    testId: 'queen-card-fast',
  },
  economy: {
    gear: 'economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    title: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Queen Flora — Smart Fare Harvester',
    badge: 'BEST VALUE NECTAR',
    color: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    glowHex: '#D97706',
    ringColor: 'ring-amber-400',
    borderAccent: 'border-amber-300 hover:border-amber-500',
    bgLight: 'bg-amber-50/80',
    subtitle: 'Multi-Operator Rail Fare Optimization',
    description:
      'Stop overpaying for duplicate full-fare rail tickets. Queen Flora compares CFR Călători, Regio Călători, TFC, Softrans, and Astra Trans Carpatic across RE and R trains for the lowest LEI per kilometer.',
    keyFeatures: [
      'Multi-Operator Combined Rail Fares',
      'RE & Regio Commuter Fare Optimization',
      'Lowest LEI Per Kilometer Guarantee',
    ],
    mlGuarantee: 'Save up to 61% on Intercity Rail LEI',
    testId: 'queen-card-economy',
  },
};

// 6 Orbital coordinates for orbiting worker bees around the free-floating Queen
const ORBIT_BEES = [
  { id: 'bee-orbit-1', left: '12%', top: '22%', delayMs: 0 },
  { id: 'bee-orbit-2', left: '80%', top: '16%', delayMs: 380 },
  { id: 'bee-orbit-3', left: '92%', top: '56%', delayMs: 760 },
  { id: 'bee-orbit-4', left: '76%', top: '88%', delayMs: 1140 },
  { id: 'bee-orbit-5', left: '20%', top: '84%', delayMs: 1520 },
  { id: 'bee-orbit-6', left: '4%', top: '52%', delayMs: 1900 },
];

export const Variant1Amphitheater: React.FC<Variant1AmphitheaterProps> = ({
  activeGear,
  onSelectQueen,
  onSelectGear,
}) => {
  const [selectedQueen, setSelectedQueen] = useState<'safe' | 'fast' | 'economy'>(() => {
    if (activeGear === 'fast' || activeGear === 'economy' || activeGear === 'safe') {
      return activeGear;
    }
    return 'safe';
  });

  const uniqueId = useId();

  useEffect(() => {
    if (activeGear === 'fast' || activeGear === 'economy' || activeGear === 'safe') {
      setSelectedQueen(activeGear);
    }
  }, [activeGear]);

  const handleQueenSelect = (gear: 'safe' | 'fast' | 'economy') => {
    setSelectedQueen(gear);
    onSelectQueen?.(gear);
    onSelectGear?.(gear);
  };

  const currentProfile = QUEENS_CONFIG[selectedQueen];

  // -------------------------------------------------------------
  // SIMULATOR 1 (Queen Meli - Safe): Live Junction Delay Simulator
  // -------------------------------------------------------------
  const [delayMinutes, setDelayMinutes] = useState<number>(8);
  const scheduledBuffer = 18;
  const remainingBuffer = Math.max(0, scheduledBuffer - delayMinutes);
  const isBufferGuarded = delayMinutes <= 12;
  const isCriticalDelay = delayMinutes > 18;

  // -------------------------------------------------------------
  // SIMULATOR 2 (Queen Vira - Fast): Magistrala 300 Speed Comparator
  // -------------------------------------------------------------
  const [speedMode, setSpeedMode] = useState<'direct' | 'stopping'>('direct');
  const [isRacing, setIsRacing] = useState<boolean>(false);
  const [raceProgress, setRaceProgress] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRacing) {
      timer = setInterval(() => {
        setRaceProgress((prev) => {
          if (prev >= 100) {
            setIsRacing(false);
            return 100;
          }
          return prev + 2.5;
        });
      }, 50);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRacing]);

  const handleStartRace = () => {
    setRaceProgress(0);
    setIsRacing(true);
  };

  const handleResetRace = () => {
    setIsRacing(false);
    setRaceProgress(0);
  };

  // -------------------------------------------------------------
  // SIMULATOR 3 (Queen Flora - Economy): Multi-Operator Fare Harvester
  // -------------------------------------------------------------
  const CORRIDORS = [
    {
      id: 'galati-bucuresti',
      label: 'Galați ⇄ București Nord',
      distanceKm: 229,
      fares: [
        { operator: 'CFR Călători', type: 'IR InterRegio Full Fare', price: 63.0, isBaseline: true },
        { operator: 'Softrans', type: 'Hyperion Electric RE', price: 35.0, discount: '-44%' },
        { operator: 'TFC', type: 'Regional Express', price: 28.5, discount: '-55%' },
        { operator: 'Regio Călători', type: 'Local Regio Commuter', price: 24.5, discount: '-61%', isBest: true },
      ],
      maxPrice: 63.0,
      savingsLei: 38.5,
      savingsPercent: 61,
      bestOperator: 'Regio Călători (24.50 LEI)',
    },
    {
      id: 'bucuresti-brasov',
      label: 'București ⇄ Brașov',
      distanceKm: 166,
      fares: [
        { operator: 'CFR Călători', type: 'IR InterRegio 2nd Class', price: 58.0, isBaseline: true },
        { operator: 'Softrans', type: 'Hyperion Direct Electric', price: 32.0, discount: '-45%' },
        { operator: 'TFC', type: 'Trans-Carpathian RE', price: 27.0, discount: '-53%' },
        { operator: 'Regio Călători', type: 'Regio Mountain Commuter', price: 22.0, discount: '-62%', isBest: true },
      ],
      maxPrice: 58.0,
      savingsLei: 36.0,
      savingsPercent: 62,
      bestOperator: 'Regio Călători (22.00 LEI)',
    },
    {
      id: 'cluj-timisoara',
      label: 'Cluj ⇄ Timișoara',
      distanceKm: 330,
      fares: [
        { operator: 'CFR Călători', type: 'InterRegio Standard', price: 82.0, isBaseline: true },
        { operator: 'Softrans', type: 'Inter-City Express', price: 46.0, discount: '-44%' },
        { operator: 'TFC', type: 'Regional Express Trunk', price: 38.0, discount: '-54%' },
        { operator: 'Regio Călători', type: 'Regio Cross-Banat', price: 32.5, discount: '-60%', isBest: true },
      ],
      maxPrice: 82.0,
      savingsLei: 49.5,
      savingsPercent: 60,
      bestOperator: 'Regio Călători (32.50 LEI)',
    },
  ];

  const [selectedCorridorIndex, setSelectedCorridorIndex] = useState<number>(0);
  const activeCorridor = CORRIDORS[selectedCorridorIndex];

  return (
    <div
      data-testid="variant-1-amphitheater"
      className="w-full transition-all duration-500 ease-out"
    >
      {/* 2-Column Responsive Royal Amphitheater Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* ========================================================= */}
        {/* LEFT COLUMN: ROYAL QUEEN STAGE & FLOATING HEXAGONAL DOCK   */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          {/* 1. ZERO WHITE BOX ROYAL QUEEN STAGE */}
          <div className="relative min-h-[380px] flex flex-col items-center justify-center p-4 select-none overflow-visible">
            {/* Layered Massive Radial Glow (strictly zero white card/box) */}
            <div
              className="absolute inset-0 pointer-events-none rounded-full blur-3xl opacity-50 transition-all duration-700 animate-pulse"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${currentProfile.glowHex} 0%, ${currentProfile.glowHex}22 55%, transparent 75%)`,
                transform: 'scale(1.35)',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute w-56 h-56 pointer-events-none rounded-full blur-xl opacity-60 transition-all duration-700"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${currentProfile.glowHex}66 0%, transparent 70%)`,
              }}
              aria-hidden="true"
            />

            {/* Subtle SVG Elliptical Orbits */}
            <svg
              viewBox="0 0 380 280"
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`orbitGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={currentProfile.color} stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.6" />
                  <stop offset="100%" stopColor={currentProfile.color} stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Primary Elliptical Orbit Track */}
              <ellipse
                cx="190"
                cy="140"
                rx="155"
                ry="72"
                fill="none"
                stroke={`url(#orbitGrad-${uniqueId})`}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                transform="rotate(-12 190 140)"
              />
              {/* Secondary Harmonic Orbit Track */}
              <ellipse
                cx="190"
                cy="140"
                rx="165"
                ry="58"
                fill="none"
                stroke={currentProfile.color}
                strokeWidth="1"
                strokeDasharray="2 4"
                strokeOpacity="0.3"
                transform="rotate(18 190 140)"
              />
              {/* Luminous Orbital Nectar Nodes */}
              <circle cx="50" cy="110" r="2.5" fill={currentProfile.color} opacity="0.8" />
              <circle cx="330" cy="120" r="2.5" fill="#F59E0B" opacity="0.8" />
              <circle cx="190" cy="65" r="3" fill={currentProfile.color} opacity="0.9" />
              <circle cx="190" cy="215" r="2" fill="#FDE047" opacity="0.7" />
            </svg>

            {/* 6 Orbiting MiniWorkerBee Elements flying along elliptical orbits */}
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {ORBIT_BEES.map((orbit) => (
                <div
                  key={orbit.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
                  style={{ left: orbit.left, top: orbit.top }}
                >
                  <MiniWorkerBee
                    variant={selectedQueen}
                    size={20}
                    delayMs={orbit.delayMs}
                  />
                </div>
              ))}
            </div>

            {/* Floating Royal Crown above Queen Mascot */}
            <div className="relative z-10 mb-[-14px] transition-transform duration-300 transform hover:scale-110 filter drop-shadow-md">
              <RoyalCrownSvg size={44} />
            </div>

            {/* Free-Floating 2xl Active Queen Mascot (Zero White Box!) */}
            <div className="relative z-10 p-2 flex items-center justify-center">
              <MascotBee
                gear={selectedQueen}
                size="2xl"
                animated={true}
                showAccessoryBadge={true}
                accessibilityLabel={currentProfile.name}
              />
            </div>

            {/* Active Queen Role Badge & Title Directly Over Honey Canvas */}
            <div className="relative z-10 mt-3 text-center">
              <span
                className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-widest uppercase border shadow-sm transition-colors duration-300"
                style={{
                  backgroundColor: `${currentProfile.color}15`,
                  borderColor: `${currentProfile.color}60`,
                  color: currentProfile.color,
                }}
              >
                {currentProfile.badge}
              </span>
              <div className="mt-2 text-2xl font-black text-stone-900 tracking-tight">
                {currentProfile.name}
              </div>
              <div className="text-xs font-semibold text-stone-600">
                {currentProfile.romanianTitle}
              </div>
              <div
                className="text-xs font-bold mt-1 max-w-xs mx-auto"
                style={{ color: currentProfile.color }}
              >
                {currentProfile.subtitle}
              </div>
            </div>
          </div>

          {/* 2. FLOATING HEXAGONAL QUEEN DOCK (3 Interactive Glassmorphic Cards) */}
          <div className="w-full">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2.5 px-1 flex items-center justify-between">
              <span>SELECT ROYAL QUEEN</span>
              <span className="text-amber-700 font-extrabold">3 DEDICATED SWARMS</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {(['safe', 'fast', 'economy'] as const).map((gear) => {
                const profile = QUEENS_CONFIG[gear];
                const isSelected = selectedQueen === gear;

                return (
                  <div
                    key={gear}
                    data-testid={profile.testId}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${profile.name} - ${profile.roleTitle}`}
                    onClick={() => handleQueenSelect(gear)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleQueenSelect(gear);
                      }
                    }}
                    className={`relative flex flex-col items-center text-center p-3 sm:p-3.5 rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isSelected
                        ? `bg-white/95 scale-[1.04] shadow-xl border-amber-300 ${profile.ringColor} ring-2`
                        : 'bg-white/65 hover:bg-white/85 border-stone-200/80 shadow-xs hover:shadow-md'
                    }`}
                  >
                    {/* Archetype Mini Worker Bee & Role Icon Badge */}
                    <div className="relative mb-1 flex items-center justify-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: `${profile.color}18` }}
                      >
                        {gear === 'safe' && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                        {gear === 'fast' && <Zap className="w-4 h-4 text-blue-600" />}
                        {gear === 'economy' && <Coins className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="absolute -top-1 -right-2">
                        <MiniWorkerBee variant={gear} size={14} delayMs={0} />
                      </div>
                    </div>

                    {/* Preserved Strings: Queen Name & Heading Level 4 */}
                    <div className="text-xs font-bold text-stone-800 leading-tight">
                      {profile.name}
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-extrabold text-stone-950 mt-0.5 leading-tight">
                      {profile.roleTitle}
                    </h4>

                    {/* Archetype Mini Pill */}
                    <span
                      className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                      style={{
                        backgroundColor: `${profile.color}15`,
                        color: profile.color,
                      }}
                    >
                      {gear === 'safe' ? 'SAFE' : gear === 'fast' ? 'FAST' : 'VALUE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: LIVE INTERACTIVE RAILWAY SIMULATOR DECK      */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative h-full flex flex-col justify-between rounded-3xl p-6 sm:p-7 backdrop-blur-xl bg-white/75 border border-amber-200/80 shadow-2xl overflow-hidden transition-all duration-500">
            {/* Background Honey Hex Pattern Watermark */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.035] select-none"
              aria-hidden="true"
            >
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id={`honey-sim-pat-${uniqueId}`}
                    width="40"
                    height="68"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 20 0 L 40 11.5 L 40 34.5 L 20 46 L 0 34.5 L 0 11.5 Z M 0 34.5 L 20 46 L 20 68 L 0 57.5 Z"
                      fill="none"
                      stroke="#78350F"
                      strokeWidth="1.2"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#honey-sim-pat-${uniqueId})`} />
              </svg>
            </div>

            {/* Simulator Deck Header */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-amber-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-100/90 text-amber-900 border border-amber-300/60 shadow-xs mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE CFR &amp; PRIVATE RAIL TELEMETRY DECK</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  {selectedQueen === 'safe' && 'Live Junction Delay Simulator'}
                  {selectedQueen === 'fast' && 'Interactive Magistrala 300 Speed Comparator'}
                  {selectedQueen === 'economy' && 'Multi-Operator Fare Harvester'}
                </h4>
              </div>

              {/* Active Queen Status Pill */}
              <div
                className="px-3 py-1 rounded-xl text-xs font-black border shadow-xs flex items-center gap-1.5"
                style={{
                  backgroundColor: `${currentProfile.color}15`,
                  borderColor: `${currentProfile.color}40`,
                  color: currentProfile.color,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentProfile.badge}</span>
              </div>
            </div>

            {/* Contextual Simulator Content Area */}
            <div className="relative z-10 py-5 my-auto">
              {/* --------------------------------------------------- */}
              {/* VARIANT 1.A: QUEEN MELI SAFE ROUTE DELAY SIMULATOR  */}
              {/* --------------------------------------------------- */}
              {selectedQueen === 'safe' && (
                <div className="space-y-5">
                  {/* Strategic Junction Info Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80">
                    <div>
                      <span className="font-bold text-stone-900">Strategic Junction:</span>{' '}
                      Ploiești Sud / Făurei Junction
                    </div>
                    <div>
                      <span className="font-bold text-stone-900">Incoming Feed:</span> Train 1 (IR 1572) ➔ Train 2 (RE 7570)
                    </div>
                    <div className="font-extrabold text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                      ML v41 • 99.5% Transfer AUC
                    </div>
                  </div>

                  {/* Interactive Delay Range Slider */}
                  <div className="space-y-2 bg-white/70 p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="delay-slider" className="font-extrabold text-stone-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Incoming Delay for Train IR 1572:</span>
                      </label>
                      <span className="font-black text-sm px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                        +{delayMinutes} min
                      </span>
                    </div>

                    <input
                      id="delay-slider"
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={delayMinutes}
                      onChange={(e) => setDelayMinutes(Number(e.target.value))}
                      className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />

                    {/* Presets and Remaining Buffer Display */}
                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400 font-semibold text-[11px]">Presets:</span>
                        {[0, 8, 16, 26].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setDelayMinutes(mins)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              delayMinutes === mins
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            +{mins}m
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-stone-600">Remaining Buffer:</span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                            remainingBuffer >= 8
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : remainingBuffer >= 2
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-red-100 text-red-900 border border-red-300'
                          }`}
                        >
                          {remainingBuffer} min remaining
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Animated SVG Emerald Shield Barrier Diagram */}
                  <div className="relative rounded-2xl bg-gradient-to-b from-stone-950 to-stone-900 p-4 text-stone-100 shadow-inner overflow-hidden">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-2 flex items-center justify-between">
                      <span>ANIMATED JUNCTION TOPOLOGY &amp; SHIELD BARRIER</span>
                      <span>PLOIEȘTI SUD INTERSECTION</span>
                    </div>

                    <svg
                      viewBox="0 0 500 170"
                      className="w-full h-auto overflow-visible select-none"
                      aria-hidden="true"
                    >
                      <defs>
                        {/* Emerald Glow Filter */}
                        <filter id={`emeraldShieldGlow-${uniqueId}`} x="-40%" y="-40%" width="180%" height="180%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <linearGradient id={`trackGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#475569" />
                          <stop offset="50%" stopColor="#94A3B8" />
                          <stop offset="100%" stopColor="#475569" />
                        </linearGradient>
                      </defs>

                      {/* Rail Ties for Track 1 */}
                      {[30, 70, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470].map((x) => (
                        <line key={`tie1-${x}`} x1={x} y1="34" x2={x} y2="46" stroke="#334155" strokeWidth="2" />
                      ))}
                      {/* Track 1 Rails (IR 1572) */}
                      <line x1="20" y1="36" x2="480" y2="36" stroke="#64748B" strokeWidth="2.5" />
                      <line x1="20" y1="44" x2="480" y2="44" stroke="#64748B" strokeWidth="2.5" />

                      {/* Rail Ties for Track 2 */}
                      {[30, 70, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470].map((x) => (
                        <line key={`tie2-${x}`} x1={x} y1="124" x2={x} y2="136" stroke="#334155" strokeWidth="2" />
                      ))}
                      {/* Track 2 Rails (RE 7570) */}
                      <line x1="20" y1="126" x2="480" y2="126" stroke="#64748B" strokeWidth="2.5" />
                      <line x1="20" y1="134" x2="480" y2="134" stroke="#64748B" strokeWidth="2.5" />

                      {/* Train 1 Graphic: IR 1572 */}
                      {/* Train X position shifts dynamically with delay */}
                      <g
                        transform={`translate(${Math.max(40, Math.min(180, 70 + (delayMinutes / 30) * 110))}, 28)`}
                        className="transition-transform duration-300"
                      >
                        <rect x="0" y="0" width="75" height="24" rx="4" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.2" />
                        <rect x="5" y="4" width="12" height="6" rx="1" fill="#BAE6FD" />
                        <rect x="22" y="4" width="12" height="6" rx="1" fill="#BAE6FD" />
                        <rect x="39" y="4" width="12" height="6" rx="1" fill="#BAE6FD" />
                        <polygon points="75,4 85,12 75,20" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
                        <circle cx="82" cy="12" r="2.5" fill="#FEF08A" />
                        <text x="35" y="19" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                          IR 1572
                        </text>
                      </g>

                      {/* Train 2 Graphic: RE 7570 (Waiting for passenger connection) */}
                      <g transform="translate(340, 118)">
                        <rect x="0" y="0" width="75" height="24" rx="4" fill="#D97706" stroke="#FDE68A" strokeWidth="1.2" />
                        <rect x="5" y="4" width="12" height="6" rx="1" fill="#FEF3C7" />
                        <rect x="22" y="4" width="12" height="6" rx="1" fill="#FEF3C7" />
                        <rect x="39" y="4" width="12" height="6" rx="1" fill="#FEF3C7" />
                        <polygon points="75,4 85,12 75,20" fill="#D97706" stroke="#FDE68A" strokeWidth="1" />
                        <circle cx="82" cy="12" r="2.5" fill="#FEF08A" />
                        <text x="35" y="19" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                          RE 7570
                        </text>
                      </g>

                      {/* Junction Concourse & Connection Energy Beam */}
                      <line
                        x1="180"
                        y1="40"
                        x2="250"
                        y2="85"
                        stroke="#10B981"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                        opacity={isBufferGuarded ? 0.9 : 0.4}
                      />
                      <line
                        x1="250"
                        y1="85"
                        x2="340"
                        y2="130"
                        stroke="#10B981"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                        opacity={isBufferGuarded ? 0.9 : 0.4}
                      />

                      {/* Central Animated SVG Emerald Shield Barrier */}
                      <g transform="translate(250, 85)">
                        {/* Radiating Emerald Energy Waves */}
                        <circle
                          cx="0"
                          cy="0"
                          r={24 + Math.min(delayMinutes, 14)}
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity={0.7}
                          className="animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                        <circle
                          cx="0"
                          cy="0"
                          r="18"
                          fill="#10B981"
                          fillOpacity="0.25"
                          stroke="#34D399"
                          strokeWidth="1.5"
                          filter={`url(#emeraldShieldGlow-${uniqueId})`}
                        />
                        {/* Shield Icon Graphic */}
                        <path
                          d="M -9 -11 L 9 -11 L 11 0 C 11 8 0 15 0 15 C 0 15 -11 8 -11 0 Z"
                          fill="#10B981"
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M -3 1 L 0 4 L 4 -2"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>

                      {/* Label Text Over Diagram */}
                      <text x="30" y="22" fill="#38BDF8" fontSize="8.5" fontWeight="bold">
                        Train 1: IR 1572 (Galați ➔ Ploiești Sud) • +{delayMinutes}m delay
                      </text>
                      <text x="470" y="158" fill="#FBBF24" fontSize="8.5" fontWeight="bold" textAnchor="end">
                        Train 2: RE 7570 (Ploiești Sud ➔ Brașov) • Connecting Departure
                      </text>
                    </svg>

                    {/* Live Shield Protection Telemetry Readout */}
                    <div className="mt-2 pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between text-xs text-stone-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">
                          {isBufferGuarded
                            ? 'Optimal Platform Buffer Guaranteed'
                            : isCriticalDelay
                            ? 'Algorithmic Hold Signal Dispatched (+8m hold)'
                            : 'Guarded Concourse Transfer Active'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {isCriticalDelay
                          ? 'RE 7570 dispatch delayed to guarantee transfer'
                          : 'Zero sprint needed across station platforms'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------- */}
              {/* VARIANT 1.B: QUEEN VIRA SPEED COMPARATOR SIMULATOR  */}
              {/* --------------------------------------------------- */}
              {selectedQueen === 'fast' && (
                <div className="space-y-5">
                  {/* Corridor Summary Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 bg-blue-50/70 p-3 rounded-2xl border border-blue-200/80">
                    <div>
                      <span className="font-bold text-stone-900">High-Speed Corridor:</span> Magistrala 300 (București Nord ⇄ Brașov)
                    </div>
                    <div>
                      <span className="font-bold text-stone-900">Distance:</span> 166 km Trans-Carpathian Trunk
                    </div>
                    <div className="font-extrabold text-blue-800 bg-white px-2.5 py-0.5 rounded-lg border border-blue-300">
                      25kV Electric Dispatch
                    </div>
                  </div>

                  {/* Mode Selector and -60 min Saved Banner */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                    <div>
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        TRANS-CARPATHIAN TRAVEL TIME SAVED
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight">
                        -60 min saved
                      </div>
                      <div className="text-xs text-stone-600 font-medium">
                        1h 45m direct express vs 2h 45m stopping regional
                      </div>
                    </div>

                    {/* Mode Toggle Buttons */}
                    <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSpeedMode('direct')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          speedMode === 'direct'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-stone-700 hover:text-stone-950'
                        }`}
                      >
                        Direct InterCity / Hyperion
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeedMode('stopping')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          speedMode === 'stopping'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-stone-700 hover:text-stone-950'
                        }`}
                      >
                        Stopping Regio
                      </button>
                    </div>
                  </div>

                  {/* Animated Dual-Track SVG Train Race */}
                  <div className="relative rounded-2xl bg-gradient-to-b from-stone-950 to-stone-900 p-4 text-stone-100 shadow-inner overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-blue-400 mb-2">
                      <span>DUAL-TRACK LIVE SVG MAINLINE RACE</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleStartRace}
                          disabled={isRacing}
                          className="px-2.5 py-0.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" />
                          <span>{isRacing ? 'Racing...' : 'Simulate Race'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetRace}
                          className="p-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                          title="Reset Race"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <svg
                      viewBox="0 0 500 170"
                      className="w-full h-auto overflow-visible select-none"
                      aria-hidden="true"
                    >
                      {/* Track 1: Direct Express Mainline Trunk */}
                      <line x1="30" y1="44" x2="470" y2="44" stroke="#3B82F6" strokeWidth="3" strokeDasharray="6 3" />
                      <line x1="30" y1="52" x2="470" y2="52" stroke="#3B82F6" strokeWidth="3" strokeDasharray="6 3" />
                      <text x="30" y="32" fill="#60A5FA" fontSize="8" fontWeight="bold">
                        TRACK 1 • Direct InterCity / Hyperion (0 Stopovers • 1h 45m • 25kV Electric)
                      </text>

                      {/* Express Train Position */}
                      {/* Travels smoothly from x=30 to x=400 based on raceProgress */}
                      <g
                        transform={`translate(${30 + (raceProgress / 100) * 370}, 36)`}
                        className="transition-transform duration-100"
                      >
                        <polygon points="0,0 55,0 70,8 70,16 55,20 0,20" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1.2" />
                        <rect x="8" y="4" width="10" height="5" rx="1" fill="#FFFFFF" />
                        <rect x="22" y="4" width="10" height="5" rx="1" fill="#FFFFFF" />
                        <rect x="36" y="4" width="10" height="5" rx="1" fill="#FFFFFF" />
                        {/* Pantograph Spark */}
                        <line x1="25" y1="0" x2="32" y2="-7" stroke="#FEF08A" strokeWidth="1.5" />
                        <line x1="32" y1="-7" x2="40" y2="-7" stroke="#FEF08A" strokeWidth="2" />
                        <circle cx="36" cy="-7" r="1.5" fill="#FFFFFF" />
                      </g>

                      {/* Track 2: Stopping Commuter Regio */}
                      <line x1="30" y1="120" x2="470" y2="120" stroke="#64748B" strokeWidth="2.5" />
                      <line x1="30" y1="128" x2="470" y2="128" stroke="#64748B" strokeWidth="2.5" />
                      <text x="30" y="108" fill="#94A3B8" fontSize="8" fontWeight="bold">
                        TRACK 2 • Stopping Regio (12 Stopovers • 2h 45m)
                      </text>

                      {/* 12 Intermediate Stop Dots on Track 2 */}
                      {[65, 100, 135, 170, 205, 240, 275, 310, 345, 380, 415, 450].map((dotX, idx) => (
                        <circle key={`stop-${idx}`} cx={dotX} cy="124" r="2.8" fill="#F59E0B" stroke="#78350F" strokeWidth="0.8" />
                      ))}

                      {/* Local Regio Train Position (travels at ~60% speed of express) */}
                      <g
                        transform={`translate(${30 + (raceProgress / 100) * 220}, 112)`}
                        className="transition-transform duration-100"
                      >
                        <rect x="0" y="0" width="55" height="18" rx="2" fill="#78716C" stroke="#D6D3D1" strokeWidth="1" />
                        <rect x="5" y="3" width="8" height="5" rx="1" fill="#FEF3C7" />
                        <rect x="18" y="3" width="8" height="5" rx="1" fill="#FEF3C7" />
                        <rect x="31" y="3" width="8" height="5" rx="1" fill="#FEF3C7" />
                        <text x="27" y="14" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                          REGIO R
                        </text>
                      </g>

                      {/* Destination Station Marker: Brașov */}
                      <line x1="470" y1="25" x2="470" y2="145" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x="475" y="85" fill="#FEF08A" fontSize="8" fontWeight="black">
                        Brașov Terminus
                      </text>
                    </svg>

                    {/* Progress Bar & Telemetry Readout */}
                    <div className="mt-3 flex items-center justify-between text-xs text-stone-300 border-t border-stone-800 pt-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-blue-400" />
                        <span>Cruising Speed: <strong className="text-white">140-160 km/h</strong></span>
                      </div>
                      <div className="text-[11px] font-bold text-blue-400">
                        {raceProgress >= 100
                          ? '🏆 Direct Express Completed in 1h 45m • 60 min saved'
                          : `Corridor Simulation: ${raceProgress.toFixed(0)}% Completed`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------- */}
              {/* VARIANT 1.C: QUEEN FLORA MULTI-OPERATOR HARVESTER   */}
              {/* --------------------------------------------------- */}
              {selectedQueen === 'economy' && (
                <div className="space-y-4">
                  {/* Interactive Corridor Selection Pills */}
                  <div>
                    <div className="text-xs font-bold text-stone-600 mb-1.5">
                      SELECT BENCHMARK CORRIDOR:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CORRIDORS.map((corridor, idx) => {
                        const isSelected = selectedCorridorIndex === idx;
                        return (
                          <button
                            key={corridor.id}
                            type="button"
                            onClick={() => setSelectedCorridorIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-stone-950 shadow-sm ring-2 ring-amber-300'
                                : 'bg-white/80 text-stone-700 hover:bg-white border border-stone-200'
                            }`}
                          >
                            {corridor.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Golden Honey Savings Badge */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-100/90 via-amber-50 to-yellow-100/80 border border-amber-300/80 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-lg">
                        🍯
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-amber-950">
                          Golden Honey Savings Badge • {activeCorridor.label}
                        </div>
                        <div className="text-[11px] text-amber-900 font-medium">
                          Best Nectar Fare: <strong>{activeCorridor.bestOperator}</strong> • Lowest LEI per km
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-stone-500 block">YOU SAVE</span>
                      <span className="text-base sm:text-lg font-black text-amber-900">
                        {activeCorridor.savingsLei.toFixed(2)} LEI ({activeCorridor.savingsPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Live Animated Multi-Operator Price Bars */}
                  <div className="space-y-2.5 bg-white/70 p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-500 pb-1 border-b border-stone-200/60">
                      <span>OPERATOR &amp; TRAIN TYPE</span>
                      <span>FARE (LEI)</span>
                    </div>

                    {activeCorridor.fares.map((fare, idx) => {
                      const widthPercent = (fare.price / activeCorridor.maxPrice) * 100;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-stone-900">
                                {fare.operator}
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium hidden sm:inline">
                                ({fare.type})
                              </span>
                              {fare.isBest && (
                                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-amber-400 text-amber-950">
                                  BEST VALUE
                                </span>
                              )}
                              {fare.discount && (
                                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                                  {fare.discount}
                                </span>
                              )}
                            </div>
                            <span className="font-black text-stone-900">
                              {fare.price.toFixed(2)} LEI
                            </span>
                          </div>

                          {/* Horizontal Price Bar */}
                          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/60">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                fare.isBest
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-xs'
                                  : fare.isBaseline
                                  ? 'bg-stone-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Key Features & ML Guarantee Bar */}
            <div className="relative z-10 pt-4 border-t border-amber-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {currentProfile.keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${currentProfile.color}20` }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: currentProfile.color }} />
                    </div>
                    <span className="text-[11px] sm:text-xs">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Verified ML Guarantee Pill */}
              <div
                className="px-3 py-1 rounded-xl text-xs font-black border shrink-0"
                style={{
                  backgroundColor: `${currentProfile.color}15`,
                  color: currentProfile.color,
                  borderColor: `${currentProfile.color}40`,
                }}
              >
                🛡️ {currentProfile.mlGuarantee}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Variant1Amphitheater;
