'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  Check,
  Train,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Percent,
} from 'lucide-react';
import MascotBee from '../../MascotBee';
import MiniWorkerBee from '../MiniWorkerBee';
import { RoyalCrownSvg } from '../HiveSvgProps';

export interface Variant2SpatialPopOutProps {
  activeGear?: 'safe' | 'fast' | 'economy' | 'default';
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
}

interface QueenConfig {
  gear: 'safe' | 'fast' | 'economy';
  testId: string;
  name: string;
  roleTitle: string;
  headingTitle: string;
  romanianTitle: string;
  subtitle: string;
  heroMetric: string;
  heroMetricIcon: string;
  heroMetricDetail: string;
  accentColor: string;
  auraClass: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  trackSpeedLabel: string;
}

const QUEENS_CONFIG: QueenConfig[] = [
  {
    gear: 'safe',
    testId: 'queen-card-safe',
    name: 'Queen Meli',
    roleTitle: 'Queen Transfer Guard',
    headingTitle: 'Queen Meli • Queen Transfer Guard',
    romanianTitle: 'Regina Meli — Matca Scutului de Transfer',
    subtitle: 'ML Connection Protection & Station Buffers',
    heroMetric: '96/100 Buffer',
    heroMetricIcon: '🛡️',
    heroMetricDetail: 'Railway Reliability Buffer',
    accentColor: '#10B981',
    auraClass: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-400/50',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-800',
    trackSpeedLabel: '🟢 96% Protected Buffer',
  },
  {
    gear: 'fast',
    testId: 'queen-card-fast',
    name: 'Queen Vira',
    roleTitle: 'Queen Express Scout',
    headingTitle: 'Queen Vira • Queen Express Scout',
    romanianTitle: 'Regina Vira — Matca Vitezei InterCity',
    subtitle: '0 Stopovers & High-Speed Mainline Rail Dispatch',
    heroMetric: '0 Stopovers',
    heroMetricIcon: '⚡',
    heroMetricDetail: 'Direct Corridor Express',
    accentColor: '#3B82F6',
    auraClass: 'bg-blue-500/20',
    badgeBorder: 'border-blue-400/50',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-800',
    trackSpeedLabel: '⚡ 140 km/h Direct Express',
  },
  {
    gear: 'economy',
    testId: 'queen-card-economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    headingTitle: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Regina Flora — Matca Economiei Inteligente',
    subtitle: 'Multi-Operator Rail Fare Optimization',
    heroMetric: '-40% LEI',
    heroMetricIcon: '🍯',
    heroMetricDetail: 'Intercity Rail Savings',
    accentColor: '#D97706',
    auraClass: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400/50',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-800',
    trackSpeedLabel: '💰 Lowest LEI / km Guarantee',
  },
];

// Configuration for 5 orbiting worker bees with individual 3D depth planes
const WORKER_BEE_SLOTS = [
  { posClass: '-top-4 -left-7', size: 16, delayMs: 0, parallaxFactor: { x: -1.8, y: 1.8, z: 35 } },
  { posClass: '-top-3 -right-7', size: 18, delayMs: 350, parallaxFactor: { x: -2.4, y: 2.4, z: 50 } },
  { posClass: 'top-1/2 -left-9', size: 15, delayMs: 700, parallaxFactor: { x: -1.5, y: 1.5, z: 28 } },
  { posClass: '-bottom-2 -left-5', size: 16, delayMs: 1050, parallaxFactor: { x: -2.1, y: 2.1, z: 44 } },
  { posClass: '-bottom-3 -right-6', size: 19, delayMs: 1400, parallaxFactor: { x: -2.7, y: 2.7, z: 60 } },
];

/**
 * Pure SVG Mini Animated Train Track Preview
 * Strictly zero canvas / map / leaflet dependencies.
 */
const MiniAnimatedTrainTrack: React.FC<{
  gear: 'safe' | 'fast' | 'economy';
  color: string;
  prefersReducedMotion: boolean;
}> = ({ gear, color, prefersReducedMotion }) => {
  // 15 track sleepers
  const sleepers = Array.from({ length: 15 }, (_, i) => 12 + i * 15);

  const animationClass = {
    safe: 'animate-train-glide-safe',
    fast: 'animate-train-glide-fast',
    economy: 'animate-train-glide-economy',
  }[gear];

  return (
    <div className="w-full py-1.5 px-2 rounded-xl bg-stone-900/5 border border-amber-900/10 shadow-inner">
      <div className="flex items-center justify-between text-[10px] font-bold text-stone-600 mb-1 px-1">
        <span className="flex items-center gap-1">
          <Train className="w-3 h-3 text-stone-500" />
          <span>Active Track Corridor</span>
        </span>
        <span className="font-mono text-[9px] text-stone-500">
          {gear === 'safe' ? 'Ploiești ⇄ Buzău' : gear === 'fast' ? 'M300 Express' : 'Galați ⇄ Buc.'}
        </span>
      </div>

      <svg
        viewBox="0 0 240 26"
        className="w-full h-7 overflow-visible select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`railGrad-${gear}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78716C" />
            <stop offset="50%" stopColor="#A8A29E" />
            <stop offset="100%" stopColor="#78716C" />
          </linearGradient>
          <linearGradient id={`trainBody-${gear}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop
              offset="100%"
              stopColor={gear === 'safe' ? '#34D399' : gear === 'fast' ? '#60A5FA' : '#FBBF24'}
            />
          </linearGradient>
        </defs>

        {/* Track Ballast Bed */}
        <rect x="4" y="4" width="232" height="18" rx="4" fill="#F5F5F4" opacity="0.8" />

        {/* Track Sleepers (Cross-ties) */}
        {sleepers.map((x, idx) => (
          <line
            key={idx}
            x1={x}
            y1={4}
            x2={x}
            y2={22}
            stroke="#D6D3D1"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        ))}

        {/* Dual Steel Rails */}
        <line
          x1="6"
          y1="8"
          x2="234"
          y2="8"
          stroke={`url(#railGrad-${gear})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <line
          x1="6"
          y1="18"
          x2="234"
          y2="18"
          stroke={`url(#railGrad-${gear})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Animated Locomotive / Signal Indicator */}
        <g
          className={!prefersReducedMotion ? animationClass : undefined}
          style={prefersReducedMotion ? { transform: 'translateX(80px)' } : undefined}
        >
          {gear === 'safe' && (
            // Safe: Emerald locomotive with protective shield aura and headlight
            <g>
              <rect
                x="8"
                y="5"
                width="28"
                height="16"
                rx="4"
                fill={`url(#trainBody-${gear})`}
                stroke="#047857"
                strokeWidth="1"
              />
              <rect x="26" y="7" width="8" height="12" rx="2" fill="#A7F3D0" />
              <circle cx="35" cy="13" r="2.2" fill="#FEF08A" />
              <polygon points="36,13 54,7 54,19" fill="#FEF08A" opacity="0.35" />
              <circle cx="16" cy="13" r="3.5" fill="#047857" opacity="0.4" />
              <path
                d="M 16 11 L 18 12.5 L 18 14.5 L 16 16 L 14 14.5 L 14 12.5 Z"
                fill="#FFFFFF"
              />
            </g>
          )}

          {gear === 'fast' && (
            // Fast: Aerodynamic bullet nose with blue speed glow
            <g>
              <path
                d="M 6 6 L 30 6 Q 42 13 30 20 L 6 20 Z"
                fill={`url(#trainBody-${gear})`}
                stroke="#1D4ED8"
                strokeWidth="1"
              />
              <path d="M 22 8 L 30 10 L 30 16 L 22 18 Z" fill="#BAE6FD" />
              <circle cx="34" cy="13" r="2.5" fill="#60A5FA" />
              <polygon points="36,13 58,6 58,20" fill="#93C5FD" opacity="0.4" />
              <path
                d="M 14 9 L 18 13 L 15 13 L 19 17 L 15 14 L 17 14 Z"
                fill="#FFFFFF"
                opacity="0.9"
              />
            </g>
          )}

          {gear === 'economy' && (
            // Economy: Commuter railcar with golden honey coin emblem
            <g>
              <rect
                x="8"
                y="5"
                width="30"
                height="16"
                rx="4"
                fill={`url(#trainBody-${gear})`}
                stroke="#B45309"
                strokeWidth="1"
              />
              <rect x="13" y="8" width="6" height="6" rx="1.5" fill="#FEF3C7" />
              <rect x="22" y="8" width="6" height="6" rx="1.5" fill="#FEF3C7" />
              <circle cx="37" cy="13" r="2.2" fill="#FDE047" />
              <circle cx="10" cy="13" r="2.5" fill="#FDE68A" />
              <text x="9" y="15" fontSize="5" fontWeight="bold" fill="#78350F">
                L
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

/**
 * Widget 1: Junction Buffer Switcher (Queen Meli - Safe)
 */
const MeliJunctionBufferWidget: React.FC = () => {
  const [selectedJunction, setSelectedJunction] = useState<'Ploiești Sud' | 'Brașov' | 'Făurei'>(
    'Ploiești Sud'
  );

  const junctionData = {
    'Ploiești Sud': {
      incoming: 'IR 1572 (Linia 2)',
      connecting: 'RE 7570 (Linia 3)',
      buffer: '+18 min',
      shieldPct: '96%',
      riskRisk: '0.2%',
      note: 'Protected against single-track siding delays on Ploiești ⇄ Buzău corridor.',
    },
    Brașov: {
      incoming: 'IC 531 (Linia 1)',
      connecting: 'R 3003 (Linia 4)',
      buffer: '+24 min',
      shieldPct: '99%',
      riskRisk: '0.1%',
      note: 'Alpine mainline buffer shielded against Prahova gorge freight slowdowns.',
    },
    Făurei: {
      incoming: 'IR 1574 (Linia 1)',
      connecting: 'R 7002 (Linia 2)',
      buffer: '+15 min',
      shieldPct: '94%',
      riskRisk: '0.4%',
      note: 'Danube plains junction switch auto-synchronized with dynamic delay cushion.',
    },
  }[selectedJunction];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Junction Delay Shield</span>
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          96/100 Buffer Health
        </span>
      </div>

      {/* Junction Switcher Buttons */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-emerald-900/5 rounded-xl border border-emerald-200/80">
        {(['Ploiești Sud', 'Brașov', 'Făurei'] as const).map((junction) => (
          <button
            key={junction}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedJunction(junction);
            }}
            className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all text-center ${
              selectedJunction === junction
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-emerald-100/60'
            }`}
          >
            {junction}
          </button>
        ))}
      </div>

      {/* Station Details */}
      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-stone-800 text-xs space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-500 font-medium">Arrival:</span>
          <span className="font-bold font-mono text-emerald-900">{junctionData.incoming}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-500 font-medium">Connecting:</span>
          <span className="font-bold font-mono text-emerald-900">{junctionData.connecting}</span>
        </div>

        {/* Dynamic Buffer Bar */}
        <div>
          <div className="flex justify-between text-[10px] font-semibold text-emerald-800 mb-1">
            <span>Buffer Cushion: {junctionData.buffer}</span>
            <span>Reliability: {junctionData.shieldPct}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-emerald-200/80 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: junctionData.shieldPct }}
            />
          </div>
        </div>

        <p className="text-[10px] text-stone-600 leading-tight pt-1 border-t border-emerald-200/50">
          💡 {junctionData.note}
        </p>
      </div>
    </div>
  );
};

/**
 * Widget 2: IC vs RE Speed Bar (Queen Vira - Fast)
 */
const ViraSpeedComparatorWidget: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<'ic' | 're' | 'both'>('both');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          <span>Magistrala 300 Speed Bar</span>
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          -65m Travel Time Saved
        </span>
      </div>

      {/* Switcher Modes */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-blue-900/5 rounded-xl border border-blue-200/80">
        {[
          { id: 'both', label: 'Dual Race' },
          { id: 'ic', label: 'InterCity (IC)' },
          { id: 're', label: 'Regio (RE)' },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMode(m.id as any);
            }}
            className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${
              selectedMode === m.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-blue-100/60'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Comparative Speed Bars */}
      <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-stone-800 text-xs space-y-2.5">
        {/* IC Bar */}
        {(selectedMode === 'both' || selectedMode === 'ic') && (
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <span>⚡ IC 531 Express</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-200/80 text-blue-800 font-extrabold">
                  0 STOPS
                </span>
              </span>
              <span className="font-black text-blue-700 font-mono">1h 45m</span>
            </div>
            <div className="w-full h-3 rounded-full bg-blue-200/70 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-500 relative flex items-center justify-end pr-1"
                style={{ width: '62%' }}
              >
                <span className="text-[8px] font-extrabold text-white">140 km/h</span>
              </div>
            </div>
          </div>
        )}

        {/* RE Bar */}
        {(selectedMode === 'both' || selectedMode === 're') && (
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="font-medium text-stone-700 flex items-center gap-1">
                <span>🚂 RE 3001 Commuter</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-stone-200 text-stone-700">
                  14 STOPS
                </span>
              </span>
              <span className="font-semibold text-stone-600 font-mono">2h 50m</span>
            </div>
            <div className="w-full h-3 rounded-full bg-stone-200 overflow-hidden relative">
              <div
                className="h-full bg-stone-400 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                style={{ width: '100%' }}
              >
                <span className="text-[8px] font-bold text-white">65 km/h</span>
              </div>
            </div>
          </div>
        )}

        <div className="text-[10px] text-stone-600 pt-1 border-t border-blue-200/50 flex items-center justify-between">
          <span>Corridor: București Nord ➔ Brașov (166 km)</span>
          <span className="font-bold text-blue-800">⚡ -40% Transit Time</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Widget 3: Multi-Operator Ticket Selector (Queen Flora - Economy)
 */
const FloraMultiOperatorWidget: React.FC = () => {
  const [selectedOperator, setSelectedOperator] = useState<'regio' | 'tfc' | 'softrans' | 'cfr'>(
    'regio'
  );

  const operators = [
    {
      id: 'regio',
      name: 'Regio Călători',
      train: 'R 14032',
      fare: '24.50 LEI',
      savings: '-61% vs CFR',
      badge: 'Best Value',
      note: 'Lowest LEI/km fare with unreserved commuter seating.',
    },
    {
      id: 'tfc',
      name: 'Transferoviar',
      train: 'RE 10012',
      fare: '28.50 LEI',
      savings: '-55% vs CFR',
      badge: 'Reserved Seat',
      note: 'Guaranteed seat reservation and online e-ticketing included.',
    },
    {
      id: 'softrans',
      name: 'Softrans (Hyperion)',
      train: 'IC 15832',
      fare: '35.00 LEI',
      savings: '-44% vs CFR',
      badge: 'AC + WiFi',
      note: 'Modern Hyperion electric train with 230V plugs and air conditioning.',
    },
    {
      id: 'cfr',
      name: 'CFR Călători',
      train: 'IR 1572',
      fare: '63.00 LEI',
      savings: 'Baseline',
      badge: 'Full Fare',
      note: 'Standard state carrier full fare ticket.',
    },
  ];

  const currentOp = operators.find((o) => o.id === selectedOperator) || operators[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>Multi-Operator Fare Harvester</span>
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Save Up to 40% LEI
        </span>
      </div>

      {/* Operator Cards / Pills */}
      <div className="grid grid-cols-2 gap-1.5">
        {operators.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOperator(op.id as any);
            }}
            className={`p-2 rounded-xl text-left border transition-all ${
              selectedOperator === op.id
                ? 'bg-amber-500/20 border-amber-500 shadow-xs ring-1 ring-amber-400'
                : 'bg-white/60 hover:bg-white border-amber-200/80 text-stone-700'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold truncate">{op.name}</span>
              <span className="font-black text-amber-900 font-mono">{op.fare}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5 text-[9px]">
              <span className="text-stone-500 font-mono">{op.train}</span>
              <span
                className={`font-extrabold ${
                  op.id === 'cfr' ? 'text-stone-500' : 'text-emerald-700'
                }`}
              >
                {op.savings}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Ticket Breakdown */}
      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-stone-800 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-amber-950">{currentOp.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-200/80 text-amber-900">
            {currentOp.badge}
          </span>
        </div>
        <p className="text-[10px] text-stone-600 leading-tight">{currentOp.note}</p>
        <div className="text-[10px] pt-1 border-t border-amber-200/50 flex justify-between items-center text-amber-900 font-semibold">
          <span>Corridor: Galați ⇄ București Nord</span>
          <span className="font-black">🍯 Save 38.50 LEI / Ticket</span>
        </div>
      </div>
    </div>
  );
};

/**
 * SpatialQueenCard: Individual 3D Perspective Glassmorphic Card
 * Features real-time mouse tracking, clamped 3D perspective rotation,
 * out-of-bounds mascot floating, and inverse parallax translation.
 */
interface SpatialQueenCardProps {
  queen: QueenConfig;
  isSelected: boolean;
  onSelect: () => void;
  prefersReducedMotion: boolean;
}

const SpatialQueenCard: React.FC<SpatialQueenCardProps> = ({
  queen,
  isSelected,
  onSelect,
  prefersReducedMotion,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; isHovered: boolean }>({
    rotateX: 0,
    rotateY: 0,
    isHovered: false,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(isSelected);

  // Sync drawer state with external selection
  useEffect(() => {
    if (isSelected) {
      setIsDrawerOpen(true);
    }
  }, [isSelected]);

  // Real-time 3D mouse coordinate tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = x / rect.width - 0.5; // -0.5 to +0.5
    const normY = y / rect.height - 0.5; // -0.5 to +0.5

    // Clamped strictly to +-10deg
    const rX = Math.max(-10, Math.min(10, -normY * 20));
    const rY = Math.max(-10, Math.min(10, normX * 20));

    setTilt({ rotateX: rX, rotateY: rY, isHovered: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, isHovered: false });
  };

  const handleCardClick = () => {
    onSelect();
    setIsDrawerOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  // 3D Perspective Card Transform Style
  const cardTransformStyle: React.CSSProperties = prefersReducedMotion
    ? {}
    : {
        transform: `perspective(1000px) rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg)`,
        transformStyle: 'preserve-3d',
        transition: tilt.isHovered
          ? 'transform 0.08s ease-out'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      };

  // Inverse counter-parallax for floating Queen Mascot
  const mascotParallaxStyle: React.CSSProperties = prefersReducedMotion
    ? {}
    : {
        transform: `translate3d(${(-tilt.rotateY * 1.6).toFixed(2)}px, ${(tilt.rotateX * 1.6).toFixed(2)}px, 42px)`,
        transformStyle: 'preserve-3d',
        transition: tilt.isHovered
          ? 'transform 0.08s ease-out'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      };

  // Inverse counter-parallax for Royal Crown (higher depth layer)
  const crownParallaxStyle: React.CSSProperties = prefersReducedMotion
    ? {}
    : {
        transform: `translate3d(${(-tilt.rotateY * 2.2).toFixed(2)}px, ${(tilt.rotateX * 2.2).toFixed(2)}px, 58px)`,
        transformStyle: 'preserve-3d',
        transition: tilt.isHovered
          ? 'transform 0.08s ease-out'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      };

  return (
    <div className="relative flex flex-col">
      {/* Dynamic Colored Ambient Floor Aura beneath card onto page background */}
      <div
        className={`absolute -bottom-7 left-1/2 -translate-x-1/2 w-4/5 h-12 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${queen.auraClass}`}
        style={{
          opacity: isSelected ? 1 : tilt.isHovered ? 0.8 : 0.4,
          transform: `translateX(-50%) scale(${isSelected ? 1.25 : tilt.isHovered ? 1.1 : 0.95})`,
        }}
        aria-hidden="true"
      />

      {/* Main Glassmorphic 3D Card */}
      <div
        ref={cardRef}
        data-testid={queen.testId}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected ? 'true' : 'false'}
        aria-label={`${queen.headingTitle} - ${queen.subtitle}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={cardTransformStyle}
        className={`relative flex flex-col cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-3xl backdrop-blur-md bg-amber-50/45 border border-amber-300/60 shadow-2xl p-5 pt-0 overflow-visible ${
          isSelected
            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-amber-50/40 shadow-amber-500/20'
            : 'hover:border-amber-400/90 hover:shadow-xl'
        }`}
      >
        {/* Out-of-Bounds Pop-Out Mascot Chamber: upper 55% positioned outside card top edge */}
        <div
          className="-mt-20 relative flex flex-col items-center justify-center pointer-events-none select-none z-20"
          style={mascotParallaxStyle}
        >
          {/* Floating Royal Crown above Mascot */}
          <div
            className="mb-[-12px] z-30 transition-transform duration-300"
            style={crownParallaxStyle}
          >
            <RoyalCrownSvg size={38} className="filter drop-shadow-md" />
          </div>

          {/* Queen Mascot Bee & 5 Orbiting Mini Worker Bees */}
          <div className="relative">
            {/* Ambient Back-Glow */}
            <div
              className={`absolute inset-0 rounded-full blur-xl -z-10 transition-opacity duration-300 ${queen.auraClass}`}
              style={{ transform: 'scale(1.2)' }}
              aria-hidden="true"
            />

            <MascotBee
              gear={queen.gear}
              size="xl"
              animated={!prefersReducedMotion}
              showAccessoryBadge={true}
            />

            {/* 5 Orbiting Mini Worker Bees with archetype-matched variants and independent 3D parallax */}
            <div
              className="absolute inset-0 pointer-events-none overflow-visible"
              aria-hidden="true"
            >
              {WORKER_BEE_SLOTS.map((slot, idx) => {
                const beeStyle: React.CSSProperties = prefersReducedMotion
                  ? {}
                  : {
                      transform: `translate3d(${(tilt.rotateY * slot.parallaxFactor.x).toFixed(2)}px, ${(tilt.rotateX * slot.parallaxFactor.y).toFixed(2)}px, ${slot.parallaxFactor.z}px)`,
                      transformStyle: 'preserve-3d',
                      transition: tilt.isHovered
                        ? 'transform 0.08s ease-out'
                        : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    };

                return (
                  <div key={idx} className={`absolute ${slot.posClass}`} style={beeStyle}>
                    <MiniWorkerBee
                      variant={queen.gear}
                      size={slot.size}
                      delayMs={slot.delayMs}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card Front: Clean & Scannable Queen Identity */}
        <div className="text-center mt-3 mb-2">
          <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center justify-center gap-1.5 flex-wrap">
            {queen.headingTitle}
          </h4>
          <div className="text-[11px] font-semibold text-stone-500 mt-0.5">
            {queen.romanianTitle}
          </div>
          <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">
            {queen.subtitle}
          </p>
        </div>

        {/* 1 Hero Metric Badge */}
        <div className="flex items-center justify-center my-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${queen.badgeBg} ${queen.badgeText} ${queen.badgeBorder}`}
          >
            <span>{queen.heroMetricIcon}</span>
            <span>{queen.heroMetric}</span>
            <span className="text-[10px] font-semibold text-stone-600 lowercase opacity-85">
              ({queen.heroMetricDetail})
            </span>
          </span>
        </div>

        {/* Mini Animated SVG Train Track Preview */}
        <div className="my-2">
          <MiniAnimatedTrainTrack
            gear={queen.gear}
            color={queen.accentColor}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        {/* Interactive "⚡ Live Rail Telemetry" Toggle Button */}
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerOpen(!isDrawerOpen);
            }}
            aria-expanded={isDrawerOpen}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 border shadow-xs cursor-pointer ${
              isDrawerOpen
                ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-amber-500/25 font-extrabold'
                : 'bg-white/80 hover:bg-white text-stone-800 border-amber-300 hover:border-amber-400'
            }`}
          >
            <span>⚡ Live Rail Telemetry</span>
            <span className="text-[10px] font-semibold">
              {isDrawerOpen ? '▲ Hide' : '▼ Inspect'}
            </span>
          </button>
        </div>

        {/* Interactive Expandable Telemetry Drawer */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isDrawerOpen ? 'max-h-[500px] opacity-100 mt-3 pt-1' : 'max-h-0 opacity-0 mt-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-amber-200/90 p-3.5 shadow-inner text-left space-y-3">
            {queen.gear === 'safe' && <MeliJunctionBufferWidget />}
            {queen.gear === 'fast' && <ViraSpeedComparatorWidget />}
            {queen.gear === 'economy' && <FloraMultiOperatorWidget />}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Variant 2: 3D Spatial Pop-Out Architecture
 * Displays 3 translucent warm-wax glassmorphic cards with out-of-bounds mascots,
 * real-time 3D mouse tilt with counter-parallax, and interactive expandable telemetry drawers.
 */
export const Variant2SpatialPopOut: React.FC<Variant2SpatialPopOutProps> = ({
  activeGear = 'safe',
  onSelectQueen,
}) => {
  const [selectedQueen, setSelectedQueen] = useState<'safe' | 'fast' | 'economy'>(
    activeGear === 'fast' || activeGear === 'economy' ? activeGear : 'safe'
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Sync internal selectedQueen when activeGear prop updates
  useEffect(() => {
    if (activeGear === 'safe' || activeGear === 'fast' || activeGear === 'economy') {
      setSelectedQueen(activeGear);
    }
  }, [activeGear]);

  // Detect user's reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const handleSelectQueen = (gear: 'safe' | 'fast' | 'economy') => {
    setSelectedQueen(gear);
    onSelectQueen?.(gear);
  };

  return (
    <div className="w-full">
      {/* 3 Queen Cards Grid with ample top margin for -mt-20 pop-out headroom */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-8 items-start pt-20 pb-4">
        {QUEENS_CONFIG.map((queen) => (
          <SpatialQueenCard
            key={queen.gear}
            queen={queen}
            isSelected={selectedQueen === queen.gear || activeGear === queen.gear}
            onSelect={() => handleSelectQueen(queen.gear)}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>
    </div>
  );
};

export default Variant2SpatialPopOut;
