'use client';

import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  RotateCcw,
  Play,
  HeartHandshake,
  CheckCircle2,
  Sliders,
  MapPin,
  Coffee,
  Smile,
} from 'lucide-react';
import MascotBee, { MascotGear } from '../../MascotBee';
import MiniWorkerBee from '../MiniWorkerBee';
import { RoyalCrownSvg } from '../HiveSvgProps';
import { MiniBeeVariant } from '../types';

export interface Variant6MagneticHoneyPortalProps {
  activeGear?: MascotGear;
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
  onSelectGear?: (gear: 'safe' | 'fast' | 'economy') => void;
}

export type QueenGear = 'safe' | 'fast' | 'economy';
export type ActiveTrainId = 'IR 1570' | 'IR 1572' | 'RE 7570';

interface QueenPortalConfig {
  gear: QueenGear;
  name: string;
  roleTitle: string;
  title: string;
  romanianTitle: string;
  badge: string;
  color: string;
  glowColor: string;
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
  boldPromiseBadge: string;
}

const QUEENS_CONFIG: Record<QueenGear, QueenPortalConfig> = {
  safe: {
    gear: 'safe',
    name: 'Queen Meli',
    roleTitle: 'Queen Transfer Guard',
    title: 'Queen Meli • Queen Transfer Guard',
    romanianTitle: 'Regina Meli — Matca Scutului de Transfer',
    badge: 'ZERO TRANSFER PANIC',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    glowHex: '#10B981',
    borderColor: 'border-emerald-400',
    bgLight: 'bg-emerald-50/80',
    subtitle: 'Calm Platform Transfers & Stress-Free Connection Buffers',
    headlinePromise: 'Never Sprint Across a Station Platform Again.',
    humanOutcome: 'Stress-free transfers with breathing room, even when the first train runs late.',
    description:
      'Never sprint breathlessly between train platforms with heavy suitcases. Queen Meli automatically guarantees realistic walking buffers between trains, so you can grab a coffee and stroll peacefully.',
    keyFeatures: [
      'Zero Transfer Panic Guarantee',
      'Realistic Station Walking Time Built In',
      'Peace-of-Mind Buffer Even With Delay',
    ],
    heroMetric: '96/100 Buffer',
    heroDetail: 'Peace of Mind Transfer Score',
    testId: 'queen-card-safe',
    boldPromiseBadge: 'Zero Transfer Panic',
  },
  fast: {
    gear: 'fast',
    name: 'Queen Vira',
    roleTitle: 'Queen Express Scout',
    title: 'Queen Vira • Queen Express Scout',
    romanianTitle: 'Regina Vira — Matca Vitezei InterCity',
    badge: 'DIRECT & NON-STOP',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    glowHex: '#3B82F6',
    borderColor: 'border-blue-400',
    bgLight: 'bg-blue-50/80',
    subtitle: 'High-Speed Point A to Point B Direct Mainline Express',
    headlinePromise: 'Your Time Belongs at Your Destination, Not on the Tracks.',
    humanOutcome: 'Direct Point A to Point B routes that skip pointless village stops.',
    description:
      'Why waste your afternoon stopping at 14 tiny village halts? Queen Vira identifies direct InterCity express corridors that bypass bottlenecks and get you straight to your destination.',
    keyFeatures: [
      'Direct Point A to Point B Express',
      'Skip 12+ Slow Village Halts',
      'Arrive Up to 45m Faster',
    ],
    heroMetric: '0 Stopovers',
    heroDetail: 'Direct Corridor Express',
    testId: 'queen-card-fast',
    boldPromiseBadge: 'Direct & Non-Stop',
  },
  economy: {
    gear: 'economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    title: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Regina Flora — Matca Economiei Inteligente',
    badge: 'UP TO 40% CHEAPER',
    color: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    glowHex: '#D97706',
    borderColor: 'border-amber-400',
    bgLight: 'bg-amber-50/80',
    subtitle: 'Multi-Operator Automatic Price Matching on Every Rail Line',
    headlinePromise: 'Same Track. Same View. Up to 40% More Money in Your Pocket.',
    humanOutcome: 'Automatically finds the lowest ticket price across all trains on your route without you having to know a single train company.',
    description:
      'Different rail carriers run along the exact same Romanian tracks with vastly different ticket prices. Queen Flora scans every carrier in real time, making sure you always pay the lowest fare.',
    keyFeatures: [
      'Instant Automatic Price Matching',
      'Exact Same Track & Window View',
      'Save 24.50 LEI vs 63.00 LEI Standard',
    ],
    heroMetric: '-40% LEI',
    heroDetail: 'Lowest Fare Guarantee',
    testId: 'queen-card-economy',
    boldPromiseBadge: 'Up to 40% Cheaper',
  },
};

interface SwarmParticle {
  id: number;
  orbitRadius: number;
  orbitSpeed: number;
  stiffness: number;
  damping: number;
  phase: number;
  size: number;
  delayMs: number;
}

const SWARM_PARTICLES: SwarmParticle[] = [
  { id: 0, orbitRadius: 28, orbitSpeed: 0.038, stiffness: 0.065, damping: 0.84, phase: 0.0, size: 16, delayMs: 0 },
  { id: 1, orbitRadius: 42, orbitSpeed: -0.032, stiffness: 0.058, damping: 0.82, phase: 0.45, size: 15, delayMs: 100 },
  { id: 2, orbitRadius: 55, orbitSpeed: 0.026, stiffness: 0.052, damping: 0.85, phase: 0.9, size: 17, delayMs: 200 },
  { id: 3, orbitRadius: 36, orbitSpeed: -0.042, stiffness: 0.070, damping: 0.81, phase: 1.35, size: 15, delayMs: 300 },
  { id: 4, orbitRadius: 65, orbitSpeed: 0.022, stiffness: 0.048, damping: 0.86, phase: 1.8, size: 18, delayMs: 400 },
  { id: 5, orbitRadius: 48, orbitSpeed: -0.035, stiffness: 0.062, damping: 0.83, phase: 2.25, size: 16, delayMs: 500 },
  { id: 6, orbitRadius: 72, orbitSpeed: 0.019, stiffness: 0.044, damping: 0.87, phase: 2.7, size: 16, delayMs: 600 },
  { id: 7, orbitRadius: 34, orbitSpeed: -0.045, stiffness: 0.072, damping: 0.80, phase: 3.15, size: 17, delayMs: 700 },
  { id: 8, orbitRadius: 58, orbitSpeed: 0.028, stiffness: 0.054, damping: 0.84, phase: 3.6, size: 15, delayMs: 800 },
  { id: 9, orbitRadius: 45, orbitSpeed: -0.031, stiffness: 0.060, damping: 0.82, phase: 4.05, size: 16, delayMs: 900 },
];

export const Variant6MagneticHoneyPortal: React.FC<Variant6MagneticHoneyPortalProps> = ({
  activeGear = 'safe',
  onSelectQueen,
  onSelectGear,
}) => {
  const idPrefix = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedQueen, setSelectedQueen] = useState<QueenGear>(
    activeGear === 'fast' || activeGear === 'economy' ? activeGear : 'safe'
  );
  const [hoveredQueen, setHoveredQueen] = useState<QueenGear | null>(null);

  // Swarm Morph State: 'safe' (Emerald Guard) | 'fast' (Supersonic Blue) | 'economy' (Golden Nectar)
  const [swarmZone, setSwarmZone] = useState<QueenGear>('safe');
  const [isMouseInside, setIsMouseInside] = useState<boolean>(false);

  // Interactive Story Ribbon Simulation States
  const [isDelaySimulated, setIsDelaySimulated] = useState<boolean>(false);
  const [isExpressSimulated, setIsExpressSimulated] = useState<boolean>(false);
  const [isFaresCompared, setIsFaresCompared] = useState<boolean>(false);

  // Interactive Transfer Buffer Slider (5 to 35 min)
  const [transferBufferMin, setTransferBufferMin] = useState<number>(20);

  // Sync internal state when external prop changes
  useEffect(() => {
    if (activeGear === 'safe' || activeGear === 'fast' || activeGear === 'economy') {
      setSelectedQueen(activeGear);
      setSwarmZone(activeGear);
    }
  }, [activeGear]);

  // Spring physics references for Cursor-Following Magnetic Swarm
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 300, y: 150 });
  const swarmPositionsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>(
    SWARM_PARTICLES.map((_, i) => ({
      x: 300 + Math.cos(i) * 40,
      y: 150 + Math.sin(i) * 40,
      vx: 0,
      vy: 0,
    }))
  );
  const swarmDomRefs = useRef<Array<HTMLDivElement | null>>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Handle Queen selection
  const handleSelect = (gear: QueenGear) => {
    setSelectedQueen(gear);
    setSwarmZone(gear);
    if (onSelectQueen) onSelectQueen(gear);
    if (onSelectGear) onSelectGear(gear);
  };

  // Cursor tracking & morph zone detection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    mousePosRef.current = { x: relX, y: relY };

    // Zone detection based on horizontal position across the 3 portals
    const fraction = relX / rect.width;
    if (fraction < 0.36) {
      setSwarmZone('safe');
    } else if (fraction < 0.64) {
      setSwarmZone('fast');
    } else {
      setSwarmZone('economy');
    }
  };

  // Real-time animation loop with spring damping in requestAnimationFrame
  useEffect(() => {
    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
    }

    let angle = 0;
    const loop = () => {
      angle += 0.02;
      const target = mousePosRef.current;

      SWARM_PARTICLES.forEach((particle, idx) => {
        const pState = swarmPositionsRef.current[idx];
        if (!pState) return;

        // Circular orbit offset around cursor
        const orbitAngle = angle * particle.orbitSpeed * 40 + particle.phase;
        const targetX = target.x + Math.cos(orbitAngle) * particle.orbitRadius;
        const targetY = target.y + Math.sin(orbitAngle) * particle.orbitRadius;

        // Spring acceleration
        const ax = (targetX - pState.x) * particle.stiffness;
        const ay = (targetY - pState.y) * particle.stiffness;

        pState.vx = (pState.vx + ax) * particle.damping;
        pState.vy = (pState.vy + ay) * particle.damping;

        pState.x += pState.vx;
        pState.y += pState.vy;

        // Apply DOM transform
        const el = swarmDomRefs.current[idx];
        if (el) {
          el.style.transform = `translate3d(${pState.x - particle.size / 2}px, ${
            pState.y - particle.size / 2
          }px, 0)`;
        }
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  const activeConfig = QUEENS_CONFIG[selectedQueen];

  return (
    <div
      ref={containerRef}
      data-testid="variant6-magnetic-portal-container"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsMouseInside(true)}
      onMouseLeave={() => setIsMouseInside(false)}
      className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none"
    >
      {/* ========================================================= */}
      {/* 🐝 CURSOR-FOLLOWING MAGNETIC WORKER SWARM FIELD           */}
      {/* ========================================================= */}
      <div
        data-testid="magnetic-worker-bee-swarm-field"
        className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
        aria-hidden="true"
      >
        {SWARM_PARTICLES.map((particle, idx) => (
          <div
            key={particle.id}
            ref={(el) => {
              swarmDomRefs.current[idx] = el;
            }}
            className="absolute top-0 left-0 transition-opacity duration-300"
            style={{
              opacity: isMouseInside ? 0.95 : 0.4,
              willChange: 'transform',
            }}
          >
            <MiniWorkerBee variant={swarmZone} size={particle.size} />
          </div>
        ))}
      </div>

      {/* Swarm State HUD Pill */}
      <div className="w-full flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{
              backgroundColor:
                swarmZone === 'safe' ? '#10B981' : swarmZone === 'fast' ? '#3B82F6' : '#F59E0B',
            }}
          />
          <span className="text-xs font-black uppercase tracking-wider text-amber-900/80">
            Magnetic Worker Swarm:
          </span>
          <span
            className="text-xs font-black uppercase px-2 py-0.5 rounded-full shadow-xs"
            style={{
              backgroundColor:
                swarmZone === 'safe'
                  ? '#10B98125'
                  : swarmZone === 'fast'
                  ? '#3B82F625'
                  : '#F59E0B25',
              color:
                swarmZone === 'safe' ? '#047857' : swarmZone === 'fast' ? '#1D4ED8' : '#B45309',
            }}
          >
            {swarmZone === 'safe' && 'Emerald Guard'}
            {swarmZone === 'fast' && 'Supersonic Blue'}
            {swarmZone === 'economy' && 'Golden Nectar'}
          </span>
        </div>

        <div className="text-[11px] font-bold text-amber-800/80 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
          Move your cursor near any Queen to attract her swarm
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🍯 3 FLOATING LIQUID-HONEY PORTALS                        */}
      {/* ========================================================= */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-10 z-10">
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
              className={`relative flex flex-col items-center cursor-pointer rounded-3xl p-6 sm:p-8 transition-all duration-300 select-none ${
                isSelected
                  ? 'bg-amber-50/85 backdrop-blur-md shadow-2xl scale-102 ring-4 ring-amber-400/30'
                  : 'bg-amber-50/50 backdrop-blur-xs border border-amber-300/60 shadow-md hover:bg-amber-50/80 hover:scale-101 hover:shadow-lg'
              }`}
              style={{
                borderColor: isSelected ? queen.color : undefined,
                borderWidth: isSelected ? '2px' : '1px',
              }}
            >
              {/* Soft Glowing Ambient Halo */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300 opacity-25"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${queen.glowHex} 0%, transparent 70%)`,
                }}
              />

              {/* Multi-Ring SVG Liquid Honey Portal */}
              <div className="relative w-44 h-44 flex items-center justify-center my-2">
                <svg
                  viewBox="0 0 160 160"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <linearGradient id={`${idPrefix}-portalGrad-${gear}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="50%" stopColor={queen.color} />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                  </defs>

                  {/* Outer Rotating Dashed Ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r="74"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                    opacity="0.6"
                    className="animate-spin-slow origin-center"
                  />

                  {/* Middle Liquid Organic Honey Ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r="66"
                    fill="none"
                    stroke={`url(#${idPrefix}-portalGrad-${gear})`}
                    strokeWidth={isSelected ? '3.5' : '2'}
                    opacity={isSelected ? '0.9' : '0.6'}
                  />

                  {/* Dripping Honey Accent Droplets */}
                  <circle cx="80" cy="148" r="4.5" fill="#F59E0B" opacity="0.85" />
                  <circle cx="34" cy="120" r="3" fill="#D97706" opacity="0.7" />
                  <circle cx="126" cy="120" r="3" fill="#D97706" opacity="0.7" />
                </svg>

                {/* Floating Mascot with Crown */}
                <div className="relative flex flex-col items-center justify-center z-10">
                  <div className="mb-0.5 transform -translate-y-1">
                    <RoyalCrownSvg size={28} />
                  </div>
                  <MascotBee
                    gear={gear}
                    size="xl"
                    animated={isSelected || isHovered}
                    accessibilityLabel={`${queen.name} Mascot`}
                  />

                  {/* 5 Orbiting Mini Worker Bees */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-1 -left-3">
                      <MiniWorkerBee variant={gear} size={15} delayMs={0} />
                    </div>
                    <div className="absolute -top-1 -right-3">
                      <MiniWorkerBee variant={gear} size={14} delayMs={200} />
                    </div>
                    <div className="absolute top-1/2 -left-5">
                      <MiniWorkerBee variant={gear} size={16} delayMs={400} />
                    </div>
                    <div className="absolute top-1/2 -right-5">
                      <MiniWorkerBee variant={gear} size={15} delayMs={600} />
                    </div>
                    <div className="absolute -bottom-2">
                      <MiniWorkerBee variant={gear} size={14} delayMs={800} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bold Single Consumer Promise Badge */}
              <div
                className="my-3 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-xs"
                style={{
                  backgroundColor: `${queen.color}20`,
                  color: queen.color,
                  border: `1.5px solid ${queen.color}60`,
                }}
              >
                {queen.boldPromiseBadge}
              </div>

              {/* Queen Identity & Heading */}
              <div className="text-center mt-1 mb-2">
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

              {/* Disruptive Marketing Human Promise */}
              <div className="my-2 p-3 rounded-2xl bg-amber-100/60 border border-amber-300/50 text-center w-full">
                <p className="text-xs font-extrabold text-stone-900 leading-snug">
                  "{queen.headlinePromise}"
                </p>
                <p className="text-[11px] text-stone-700 mt-1 leading-relaxed">
                  {queen.humanOutcome}
                </p>
              </div>

              {/* Footer Selection Pill */}
              <div className="mt-auto pt-3 border-t border-amber-200/60 w-full flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-stone-950 block">
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
                  {isSelected ? 'Active Portal' : 'Open Portal ➔'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 🚀 MORPHING "POINT A -> POINT B" INTERACTIVE STORY RIBBON */}
      {/* ========================================================= */}
      <div
        data-testid="live-corridor-telemetry-ribbon"
        className="w-full bg-amber-50/80 backdrop-blur-md border border-amber-300/70 rounded-3xl p-6 sm:p-8 shadow-xl text-stone-900 z-10"
      >
        {/* Ribbon Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-amber-200/80 gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: activeConfig.color }}
            >
              {selectedQueen === 'safe' && <ShieldCheck className="w-5 h-5" />}
              {selectedQueen === 'fast' && <Zap className="w-5 h-5" />}
              {selectedQueen === 'economy' && <Coins className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-900/80 block">
                LIVE CORRIDOR TELEMETRY RIBBON • POINT A TO POINT B
              </span>
              <h3 className="text-lg sm:text-xl font-black text-stone-950">
                {selectedQueen === 'safe' && 'Walk Calmly Between Platforms • 95%+ Peace-of-Mind Guarantee'}
                {selectedQueen === 'fast' && 'Direct Corridors • Skip 12+ Stops & Arrive 45m Faster'}
                {selectedQueen === 'economy' && 'Automatic Price Matching • Lowest Fare for the Exact Same View'}
              </h3>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Connected: {activeConfig.name}</span>
          </div>
        </div>

        {/* Visual Point A -> Point B Corridor Timeline */}
        <div className="py-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-100/60 border border-amber-300/60 mb-6">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>Point A: Galați / Departure</span>
              </div>
              <div className="text-[11px] text-stone-500 font-semibold">
                Corridor Trunk: Galați ➔ Buzău ➔ Ploiești Sud ➔ București Nord
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Point B: București Nord / Arrival</span>
              </div>
            </div>

            {/* Active Corridor Trains Timeline Tokens */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Train 1: IR 1570 */}
              <div className="p-3 rounded-xl bg-white/70 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">IR 1570</span>
                  <span className="text-[10px] font-bold text-stone-600">13:10 ➔ 16:15</span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1">
                  Direct Corridor Mainline • On Time
                </div>
              </div>

              {/* Train 2: IR 1572 */}
              <div className="p-3 rounded-xl bg-white/70 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">IR 1572</span>
                  <span className="text-[10px] font-bold text-stone-600">14:22 ➔ 17:28</span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1">
                  Connecting Train at Ploiești Sud • Shielded Buffer
                </div>
              </div>

              {/* Train 3: RE 7570 */}
              <div className="p-3 rounded-xl bg-white/70 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">RE 7570</span>
                  <span className="text-[10px] font-bold text-stone-600">16:55 ➔ 18:50</span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1">
                  Trans-Carpathian Regional Link • Best Value Fare
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="space-y-4">
            <span className="text-xs font-black text-stone-800 uppercase tracking-wide block">
              Test Ride the Journey Ribbon Controls:
            </span>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="simulate-delay-btn"
                onClick={() => setIsDelaySimulated((s) => !s)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isDelaySimulated
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-extrabold'
                    : 'bg-amber-100/90 text-stone-800 hover:bg-amber-200/90 border border-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Simulate +20m Delay</span>
              </button>

              <button
                type="button"
                data-testid="toggle-express-btn"
                onClick={() => setIsExpressSimulated((s) => !s)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isExpressSimulated
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-extrabold'
                    : 'bg-amber-100/90 text-stone-800 hover:bg-amber-200/90 border border-amber-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Toggle Express Priority</span>
              </button>

              <button
                type="button"
                data-testid="compare-fares-btn"
                onClick={() => setIsFaresCompared((s) => !s)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isFaresCompared
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 font-extrabold'
                    : 'bg-amber-100/90 text-stone-800 hover:bg-amber-200/90 border border-amber-300'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Compare Operator Fares</span>
              </button>
            </div>

            {/* Simulation Feedback Banners */}
            {isDelaySimulated && (
              <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-start gap-3">
                <Coffee className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block text-sm">
                    SIMULATION ACTIVE: +20m Crossover Delay on IR 1572
                  </span>
                  <span>
                    Queen Meli's buffer automatically absorbs the delay! You still have 14 calm minutes to walk between platforms. Zero panic, 95%+ peace-of-mind guarantee.
                  </span>
                </div>
              </div>
            )}

            {isExpressSimulated && (
              <div className="p-4 rounded-2xl bg-blue-100 border border-blue-300 text-blue-950 text-xs font-bold flex items-start gap-3">
                <Zap className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block text-sm">
                    SIMULATION ACTIVE: Supersonic Mainline Rail Priority Token Granted
                  </span>
                  <span>
                    Queen Vira skips 12+ slow village halts. Non-stop mainline priority active. You arrive 45 minutes faster. Your time belongs at your destination!
                  </span>
                </div>
              </div>
            )}

            {isFaresCompared && (
              <div className="p-4 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-start gap-3">
                <Coins className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block text-sm">
                    Queen Flora Multi-Operator Rail Fare Optimization Matrix
                  </span>
                  <span>
                    We check every train on the track: Standard single carrier charges 63.00 LEI. Queen Flora matches the lowest fare across operators at 24.50 LEI. Same track, same view, up to 40% more money in your pocket!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Variant6MagneticHoneyPortal;
