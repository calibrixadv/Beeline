'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  ShieldCheck,
  Coins,
  Check,
  Gauge,
  Radio,
  Activity,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import MascotBee, { MascotGear } from '../../MascotBee';
import MiniWorkerBee from '../MiniWorkerBee';
import { RoyalCrownSvg } from '../HiveSvgProps';

export interface Variant5BentoTrainRadarProps {
  activeGear?: MascotGear;
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
}

type HubId = 'ploiesti' | 'brasov' | 'faurei' | 'bucuresti';
type TrainCategory = 'ic' | 'softrans' | 'ir';

interface HubData {
  id: HubId;
  name: string;
  code: string;
  radarCoord: { x: number; y: number };
  badge: string;
  incomingTrain: {
    number: string;
    route: string;
    arrTime: string;
    delay: string;
    platform: string;
    status: string;
  };
  shieldBuffer: {
    minutes: number;
    window: string;
    confidence: string;
    absorptionRate: string;
  };
  connectingTrain: {
    number: string;
    route: string;
    depTime: string;
    platform: string;
    status: string;
  };
  causalEquation: string;
  contagionStatus: string;
  contagionRisk: string;
  reliabilityScore: number;
  junctionTelemetry: string;
}

const HUBS: Record<HubId, HubData> = {
  ploiesti: {
    id: 'ploiesti',
    name: 'Ploiești Sud',
    code: 'PLS',
    radarCoord: { x: 155, y: 95 },
    badge: 'STRATEGIC TRIFURCATION',
    incomingTrain: {
      number: 'Incoming IR 1572',
      route: 'Galați ➔ București Nord',
      arrTime: '14:22',
      delay: '+12m crossover delay',
      platform: 'Platform 2',
      status: 'Shielded Transit',
    },
    shieldBuffer: {
      minutes: 18,
      window: '14:22 ➔ 14:40',
      confidence: '99.2%',
      absorptionRate: '100% delay absorbed',
    },
    connectingTrain: {
      number: 'Connecting RE 7570',
      route: 'Ploiești Sud ➔ Brașov',
      depTime: '14:40',
      platform: 'Platform 1B',
      status: 'Interlocked Departure',
    },
    causalEquation: 't_arr (14:22) < t_dep (14:40)',
    contagionStatus: 'Causal completed-arrival verified: delay contagion safely dampened.',
    contagionRisk: '0.02% (DAMPENED)',
    reliabilityScore: 96,
    junctionTelemetry: 'Lines 300 & 500 Interlocking • 176k Historic Junction Runs',
  },
  brasov: {
    id: 'brasov',
    name: 'Brașov',
    code: 'BV',
    radarCoord: { x: 85, y: 60 },
    badge: 'CARPATHIAN SUMMIT GATEWAY',
    incomingTrain: {
      number: 'Incoming IR 1631',
      route: 'București Nord ➔ Brașov',
      arrTime: '09:48',
      delay: '+6m mountain gradient',
      platform: 'Track 3',
      status: 'Shielded Transit',
    },
    shieldBuffer: {
      minutes: 22,
      window: '09:48 ➔ 10:10',
      confidence: '99.6%',
      absorptionRate: 'Cross-platform buffer active',
    },
    connectingTrain: {
      number: 'Connecting R 3512',
      route: 'Brașov ➔ Sighișoara',
      depTime: '10:10',
      platform: 'Track 1A',
      status: 'Interlocked Departure',
    },
    causalEquation: 't_arr (09:48) < t_dep (10:10)',
    contagionStatus: 'Mountain summit contagion protected by ML slope damping.',
    contagionRisk: '0.01% (SECURED)',
    reliabilityScore: 98,
    junctionTelemetry: 'Predeal Pass Corridor • 1,054m Altitude Transit Telemetry',
  },
  faurei: {
    id: 'faurei',
    name: 'Făurei Single-Track',
    code: 'FR',
    radarCoord: { x: 175, y: 145 },
    badge: 'SINGLE-TRACK HIGH BOTTLENECK',
    incomingTrain: {
      number: 'Incoming IR 1774',
      route: 'Galați ➔ Făurei Bypass',
      arrTime: '16:15',
      delay: '+14m single-track waiting',
      platform: 'Track 1',
      status: 'Shielded Transit',
    },
    shieldBuffer: {
      minutes: 25,
      window: '16:15 ➔ 16:40',
      confidence: '98.8%',
      absorptionRate: 'Dynamic crossover shield',
    },
    connectingTrain: {
      number: 'Connecting RE 5003',
      route: 'Făurei ➔ Buzău',
      depTime: '16:40',
      platform: 'Track 2',
      status: 'Interlocked Departure',
    },
    causalEquation: 't_arr (16:15) < t_dep (16:40)',
    contagionStatus: 'Single-track interlocking isolated; holding signal till crossover clears.',
    contagionRisk: '0.04% (ISOLATED)',
    reliabilityScore: 94,
    junctionTelemetry: 'Făurei Railway Testing Ring Junction • Single-Line Signal Interlock',
  },
  bucuresti: {
    id: 'bucuresti',
    name: 'București Nord',
    code: 'BNR',
    radarCoord: { x: 120, y: 170 },
    badge: 'PRIMARY NATIONAL TERMINAL',
    incomingTrain: {
      number: 'Incoming IC 538',
      route: 'Cluj-Napoca ➔ București Nord',
      arrTime: '18:32',
      delay: '+0m on-time mainline',
      platform: 'Platform 10',
      status: 'Shielded Transit',
    },
    shieldBuffer: {
      minutes: 15,
      window: '18:32 ➔ 18:47',
      confidence: '99.9%',
      absorptionRate: 'Concourse transfer guarantee',
    },
    connectingTrain: {
      number: 'Connecting IR 1587',
      route: 'București Nord ➔ Constanța',
      depTime: '18:47',
      platform: 'Platform 6',
      status: 'Interlocked Departure',
    },
    causalEquation: 't_arr (18:32) < t_dep (18:47)',
    contagionStatus: 'Terminal dispatch synchronized with zero passenger sprint requirement.',
    contagionRisk: '0.00% (ZERO DELAY)',
    reliabilityScore: 99,
    junctionTelemetry: 'Central Concourse Hub • Corridor IV & IX High-Frequency Trunk',
  },
};

interface SpeedCategoryData {
  id: TrainCategory;
  name: string;
  trainName: string;
  speedKmh: number;
  stopovers: number;
  stopoversLabel: string;
  timeSaved: string;
  savedMinutes: number;
  transitDuration: string;
  traction: string;
  gaugePercent: number; // 0-100 on 200 km/h scale
  corridor: string;
  inferenceLatency: string;
  inferenceEngine: string;
}

const SPEED_CATEGORIES: Record<TrainCategory, SpeedCategoryData> = {
  ic: {
    id: 'ic',
    name: 'IC InterCity',
    trainName: 'IC 531 "Carpatia"',
    speedKmh: 160,
    stopovers: 0,
    stopoversLabel: '0 Stopovers',
    timeSaved: '-45m saved',
    savedMinutes: 45,
    transitDuration: '1h 45m',
    traction: '25kV AC Alstom Coradia / Softronic Transmontana',
    gaugePercent: 80, // 160 / 200
    corridor: 'București Nord ➔ Brașov (Corridor IV Mainline)',
    inferenceLatency: '< 1.5ms',
    inferenceEngine: 'v35',
  },
  softrans: {
    id: 'softrans',
    name: 'Softrans Hyperion',
    trainName: 'Hyperion RES 002',
    speedKmh: 160,
    stopovers: 0,
    stopoversLabel: '0 Stopovers',
    timeSaved: '-45m saved',
    savedMinutes: 45,
    transitDuration: '1h 52m',
    traction: 'Dual-Voltage Electric EMU (Craiova Electroputere)',
    gaugePercent: 80,
    corridor: 'Craiova ➔ București Nord ➔ Brașov Trunk',
    inferenceLatency: '< 1.4ms',
    inferenceEngine: 'v35',
  },
  ir: {
    id: 'ir',
    name: 'IR InterRegio',
    trainName: 'IR 1632 Mainline',
    speedKmh: 120,
    stopovers: 1,
    stopoversLabel: '1 Stopover (Câmpina)',
    timeSaved: '-25m saved',
    savedMinutes: 25,
    transitDuration: '2h 15m',
    traction: 'Standard Electric Locomotive Co-Co 5100 kW',
    gaugePercent: 60,
    corridor: 'Ploiești Vest ➔ Sinaia ➔ Brașov Line 300',
    inferenceLatency: '< 1.5ms',
    inferenceEngine: 'v35',
  },
};

interface RailTicket {
  id: number;
  operator: string;
  trainCode: string;
  fareLei: number;
  fareFormatted: string;
  tag: string;
  isBaseline?: boolean;
  savingsLei: number;
  savingsPercent: number;
  amenities: {
    name: string;
    included: boolean;
    detail: string;
  }[];
  seatClass: string;
  co2EcoScore: string;
  honeyJarFill: number; // 0-100%
}

const RAIL_TICKETS: RailTicket[] = [
  {
    id: 1,
    operator: 'CFR Călători',
    trainCode: 'IR 1572',
    fareLei: 63.0,
    fareFormatted: '63.00 LEI',
    tag: 'Baseline Full Fare',
    isBaseline: true,
    savingsLei: 0.0,
    savingsPercent: 0,
    amenities: [
      { name: 'Standard Seat', included: true, detail: '2nd class standard saloon seat' },
      { name: 'Luggage Storage', included: true, detail: 'Overhead luggage racks' },
      { name: 'Shared Restroom', included: true, detail: 'Carriage end toilet' },
      { name: 'Power Sockets', included: false, detail: 'Unavailable in standard coaches' },
      { name: 'Wi-Fi Onboard', included: false, detail: 'No onboard cellular router' },
      { name: 'Refreshment Trolley', included: false, detail: 'No dining car or service' },
    ],
    seatClass: '2nd Class Open Saloon',
    co2EcoScore: 'Standard Electric Grid',
    honeyJarFill: 5,
  },
  {
    id: 2,
    operator: 'Astra Trans Carpatic',
    trainCode: 'IR-N 15532',
    fareLei: 55.0,
    fareFormatted: '55.00 LEI',
    tag: 'Premium Luxury Recliner',
    savingsLei: 8.0,
    savingsPercent: 12.7,
    amenities: [
      { name: 'Italian Leather Recliners', included: true, detail: 'Anatomic tilt recliners' },
      { name: 'Free Lavazza Espresso & Snack', included: true, detail: 'Complimentary morning kit' },
      { name: '230V Sockets & USB-C', included: true, detail: 'Individual socket per seat' },
      { name: 'High-Speed Wi-Fi', included: true, detail: 'Dual-SIM 5G router' },
      { name: 'Climate Control', included: true, detail: 'Zoned temperature regulation' },
      { name: 'Clean En-Suite Washroom', included: true, detail: 'Vacuum flush sanitation' },
    ],
    seatClass: '1st Class Premium Comfort',
    co2EcoScore: 'Eco-Regenerative Braking',
    honeyJarFill: 25,
  },
  {
    id: 3,
    operator: 'TFC',
    trainCode: 'RE 10012',
    fareLei: 28.5,
    fareFormatted: '28.50 LEI',
    tag: 'Commuter Express Value',
    savingsLei: 34.5,
    savingsPercent: 54.8,
    amenities: [
      { name: 'Reserved Seat Guarantee', included: true, detail: 'Specific car and seat allocation' },
      { name: 'Instant QR E-Ticketing', included: true, detail: 'Direct in-app contactless barcode' },
      { name: 'Bicycle Dedicated Racks', included: true, detail: 'Specialized cycle hooks' },
      { name: 'Luggage Storage', included: true, detail: 'Wide overhead luggage shelves' },
      { name: 'Climate Control', included: true, detail: 'Low-emission air conditioning' },
      { name: 'Power Sockets', included: false, detail: 'Selective front-row plugs only' },
    ],
    seatClass: 'Express Regional Reserved',
    co2EcoScore: 'Optimized Commuter Fleet',
    honeyJarFill: 72,
  },
  {
    id: 4,
    operator: 'Regio Călători',
    trainCode: 'R 14032',
    fareLei: 24.5,
    fareFormatted: '24.50 LEI',
    tag: 'Max Nectar Thrift',
    savingsLei: 38.5,
    savingsPercent: 61.1,
    amenities: [
      { name: 'Lowest LEI/km Fare in Romania', included: true, detail: 'Maximum intercity fare saving' },
      { name: 'Unreserved Saloon Seating', included: true, detail: 'Flexible seating arrangement' },
      { name: 'Frequent Stopover Access', included: true, detail: 'All intermediate halts served' },
      { name: 'Instant Mobile Boarding', included: true, detail: 'Conductor scan on phone' },
      { name: 'Eco Low-Floor Boarding', included: true, detail: 'Easy wheelchair & luggage step-in' },
      { name: 'High Efficiency Traction', included: true, detail: 'Ultra-low energy consumption' },
    ],
    seatClass: 'Standard Regional Saloon',
    co2EcoScore: 'Top Energy Efficiency Rating',
    honeyJarFill: 92,
  },
];

export const Variant5BentoTrainRadar: React.FC<Variant5BentoTrainRadarProps> = ({
  activeGear,
  onSelectQueen,
}) => {
  const [selectedQueen, setSelectedQueen] = useState<'safe' | 'fast' | 'economy'>(() => {
    if (activeGear === 'safe' || activeGear === 'fast' || activeGear === 'economy') {
      return activeGear;
    }
    return 'safe';
  });

  const [selectedHub, setSelectedHub] = useState<HubId>('ploiesti');
  const [selectedCategory, setSelectedCategory] = useState<TrainCategory>('ic');
  const [selectedTicketId, setSelectedTicketId] = useState<number>(4); // Default to Regio Călători
  const [hoveredTicketId, setHoveredTicketId] = useState<number | null>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const uniqueId = useId();

  useEffect(() => {
    if (activeGear === 'safe' || activeGear === 'fast' || activeGear === 'economy') {
      setSelectedQueen(activeGear);
    }
  }, [activeGear]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  const handleQueenSelect = (gear: 'safe' | 'fast' | 'economy') => {
    setSelectedQueen(gear);
    onSelectQueen?.(gear);
  };

  const activeHubData = HUBS[selectedHub];
  const activeSpeedData = SPEED_CATEGORIES[selectedCategory];
  const activeTicket =
    RAIL_TICKETS.find((t) => t.id === (hoveredTicketId ?? selectedTicketId)) || RAIL_TICKETS[3];

  return (
    <div
      className="w-full relative transition-all duration-300"
      data-testid="variant-5-bento-train-radar"
    >
      {/* Bento Grid Top Summary Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-900 flex items-center gap-2">
            <span>Raycast / Linear Asymmetric Bento Architecture</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-bold">
              12-Column Warm Glass
            </span>
          </span>
        </div>
        <div className="text-xs text-stone-600 font-medium flex items-center gap-2">
          <span>Active Focus:</span>
          <span className="font-bold text-stone-900 capitalize px-2 py-0.5 rounded-md bg-white/70 border border-amber-200 shadow-xs">
            {selectedQueen === 'safe'
              ? 'Queen Meli (Transfer Guard)'
              : selectedQueen === 'fast'
              ? 'Queen Vira (Express Scout)'
              : 'Queen Flora (Nectar Saver)'}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 12-COLUMN ASYMMETRIC WARM-GLASS BENTO GRID               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ======================================================= */}
        {/* BENTO CELL 1: QUEEN MELI'S LIVE JUNCTION TRANSFER RADAR  */}
        {/* (8 Columns Wide)                                       */}
        {/* ======================================================= */}
        <div
          data-testid="queen-card-safe"
          role="button"
          tabIndex={0}
          aria-pressed={selectedQueen === 'safe'}
          aria-label="Queen Meli • Queen Transfer Guard - ML Connection Protection & Station Buffers"
          onClick={() => handleQueenSelect('safe')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleQueenSelect('safe');
            }
          }}
          className={`col-span-12 lg:col-span-8 flex flex-col justify-between cursor-pointer rounded-3xl p-5 sm:p-7 relative overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/55 backdrop-blur-md border border-amber-200/80 shadow-xl ${
            selectedQueen === 'safe'
              ? 'ring-2 ring-emerald-500/80 shadow-2xl shadow-emerald-500/10 border-emerald-400 bg-emerald-50/20'
              : 'hover:shadow-2xl hover:border-amber-300'
          }`}
        >
          {/* Subtle Ambient Honeycomb Glass Watermark Glow */}
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Cell 1 Header: Queen Meli Identity & Perched Mascot */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-100/90 relative z-10">
            <div className="flex items-center gap-4">
              {/* Perched Queen Mascot Chamber with Royal Crown & Swarm */}
              <div className="relative shrink-0 p-2 rounded-2xl bg-white/70 border border-emerald-200/90 shadow-sm">
                {/* Floating Royal Crown above Mascot */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-transform duration-300 transform hover:scale-110">
                  <RoyalCrownSvg size={30} />
                </div>

                {/* Queen Meli Mascot Bee */}
                <MascotBee
                  gear="safe"
                  size="lg"
                  animated={!prefersReducedMotion}
                  showAccessoryBadge={true}
                />

                {/* 5 Orbiting Minimalist Worker Bees (variant="safe") */}
                <div
                  className="absolute inset-0 pointer-events-none overflow-visible"
                  aria-hidden="true"
                >
                  <div className="absolute -top-2.5 -left-2.5">
                    <MiniWorkerBee variant="safe" size={15} delayMs={0} />
                  </div>
                  <div className="absolute top-1 -right-3.5">
                    <MiniWorkerBee variant="safe" size={17} delayMs={350} />
                  </div>
                  <div className="absolute -bottom-2 -left-2.5">
                    <MiniWorkerBee variant="safe" size={14} delayMs={700} />
                  </div>
                  <div className="absolute -bottom-2.5 right-1">
                    <MiniWorkerBee variant="safe" size={16} delayMs={1100} />
                  </div>
                  <div className="absolute top-1/2 -left-3.5">
                    <MiniWorkerBee variant="safe" size={13} delayMs={1500} />
                  </div>
                </div>
              </div>

              {/* Queen Identity Text */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-800 border border-emerald-400/50 shadow-xs">
                    SAFE ROUTE GUARDIAN
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ML Buffer Shield Active
                  </span>
                </div>
                {/* Headings tested by test suite */}
                <h4 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-1 flex items-center gap-1.5">
                  Queen Meli • Queen Transfer Guard
                </h4>
                <div className="text-xs font-semibold text-stone-500">
                  Queen Meli — Royal Transfer Shield
                </div>
              </div>
            </div>

            {/* 96/100 Reliability Gauge Scorecard Badge */}
            <div className="sm:text-right shrink-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Railway Reliability Buffer
              </div>
              <div className="flex items-baseline sm:justify-end gap-1 mt-0.5">
                <span className="text-3xl font-black font-mono tracking-tight text-emerald-600">
                  {activeHubData.reliabilityScore}
                </span>
                <span className="text-sm font-bold text-stone-500">/100</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                🛡️ 95%+ Connection Shield
              </span>
            </div>
          </div>

          {/* Queen Meli Subtitle & Context */}
          <div className="my-3 text-xs text-stone-600 leading-relaxed">
            <span className="font-bold text-stone-800">
              ML Connection Protection &amp; Station Buffers:
            </span>{' '}
            Monitors real-time CFR and private rail delay telemetry across single-track
            intersections, safeguarding transfers with algorithmic safety buffers.
          </div>

          {/* ===================================================== */}
          {/* INTERACTIVE 4-HUB RAILWAY RADAR & CONTROLS            */}
          {/* ===================================================== */}
          <div className="mt-2 space-y-4">
            {/* Hub Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-700 mr-1 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                Select Hub:
              </span>
              {(Object.keys(HUBS) as HubId[]).map((hubKey) => {
                const hub = HUBS[hubKey];
                const isCurrentHub = selectedHub === hubKey;
                return (
                  <button
                    key={hubKey}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHub(hubKey);
                      handleQueenSelect('safe');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrentHub
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400 font-extrabold'
                        : 'bg-white/80 hover:bg-white text-stone-700 border border-emerald-200/80 hover:border-emerald-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrentHub ? 'bg-white animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                    <span>{hub.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Radar View & Live Platform Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left Column: Pure SVG Circular Tactical Radar Instrument */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-950/90 border border-emerald-500/40 shadow-inner relative overflow-hidden">
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-2 px-1">
                  <span className="flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE RADAR SWEEP
                  </span>
                  <span>RANGE: 50 KM</span>
                </div>

                {/* Pure SVG Tactical Radar (STRICT ZERO CANVAS / ZERO MAP) */}
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 select-none">
                  <svg
                    viewBox="0 0 240 240"
                    className="w-full h-full overflow-visible"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      {/* Radar sweep conical gradient */}
                      <radialGradient id={`radarGlow-${uniqueId}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id={`sweepBeam-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34D399" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Dark Background Chamber */}
                    <circle cx="120" cy="120" r="110" fill="#091410" stroke="#064E3B" strokeWidth="2" />
                    <circle cx="120" cy="120" r="110" fill={`url(#radarGlow-${uniqueId})`} />

                    {/* Concentric Distance Range Rings */}
                    <circle cx="120" cy="120" r="30" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                    <circle cx="120" cy="120" r="60" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                    <circle cx="120" cy="120" r="90" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                    <circle cx="120" cy="120" r="108" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.75" />

                    {/* Cardinal Crosshairs */}
                    <line x1="120" y1="12" x2="120" y2="228" stroke="#10B981" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
                    <line x1="12" y1="120" x2="228" y2="120" stroke="#10B981" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

                    {/* Distance Labels */}
                    <text x="123" y="93" fill="#34D399" fontSize="7" fontFamily="monospace" opacity="0.7">15km</text>
                    <text x="123" y="63" fill="#34D399" fontSize="7" fontFamily="monospace" opacity="0.7">30km</text>
                    <text x="123" y="33" fill="#34D399" fontSize="7" fontFamily="monospace" opacity="0.7">45km</text>

                    {/* Rotating Radar Sweep Sector (Pure SVG Animation) */}
                    <g
                      className={!prefersReducedMotion ? 'animate-[spin_4s_linear_infinite]' : ''}
                      style={{ transformOrigin: '120px 120px' }}
                    >
                      <path
                        d="M 120 120 L 226 120 A 106 106 0 0 0 195 45 Z"
                        fill={`url(#sweepBeam-${uniqueId})`}
                      />
                      <line x1="120" y1="120" x2="226" y2="120" stroke="#6EE7B7" strokeWidth="1.8" />
                    </g>

                    {/* 4 Railway Hub Radar Blips */}
                    {(Object.keys(HUBS) as HubId[]).map((hubKey) => {
                      const hub = HUBS[hubKey];
                      const isActive = selectedHub === hubKey;
                      const { x, y } = hub.radarCoord;

                      return (
                        <g
                          key={hubKey}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHub(hubKey);
                            handleQueenSelect('safe');
                          }}
                        >
                          {isActive && (
                            <>
                              <circle cx={x} cy={y} r="14" fill="none" stroke="#34D399" strokeWidth="1.5" className="animate-ping" opacity="0.75" />
                              <circle cx={x} cy={y} r="8" fill="none" stroke="#6EE7B7" strokeWidth="1.5" />
                            </>
                          )}
                          <circle cx={x} cy={y} r={isActive ? 4.5 : 3} fill={isActive ? '#34D399' : '#047857'} stroke="#A7F3D0" strokeWidth="1" />
                          <text
                            x={x + 6}
                            y={y + 3}
                            fill={isActive ? '#A7F3D0' : '#10B981'}
                            fontSize={isActive ? '8.5' : '7.5'}
                            fontFamily="monospace"
                            fontWeight={isActive ? 'bold' : 'normal'}
                          >
                            {hub.code}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="mt-2 text-[10px] text-emerald-400/90 font-mono text-center">
                  Selected Hub: <span className="font-bold text-white">{activeHubData.name}</span>
                </div>
              </div>

              {/* Right Column: Live Visual Platform Timeline Flow */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-amber-200/60">
                  <span className="font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Live Visual Platform Timeline
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    {activeHubData.badge}
                  </span>
                </div>

                {/* The 3-Step Dynamic Flow Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 relative">
                  {/* Step 1: Incoming IR Train */}
                  <div className="p-3 rounded-2xl bg-white/80 border border-emerald-200/90 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                        STEP 1 • ARRIVAL
                      </span>
                      <div className="text-xs font-black text-stone-900 mt-1">
                        {activeHubData.incomingTrain.number}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        {activeHubData.incomingTrain.route}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-100 text-[10px]">
                      <div className="flex justify-between items-center text-stone-700">
                        <span>Platform:</span>
                        <span className="font-bold font-mono">{activeHubData.incomingTrain.platform}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-800 font-bold">
                        <span>Arr Telemetry:</span>
                        <span className="font-mono">{activeHubData.incomingTrain.arrTime}</span>
                      </div>
                      <div className="text-[9px] text-amber-700 font-semibold mt-0.5 truncate">
                        ⚠️ {activeHubData.incomingTrain.delay}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: ML Buffer Shield (Dynamic Centerpiece) */}
                  <div className="p-3 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400 shadow-md flex flex-col justify-between relative">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black tracking-wider uppercase">
                      PROTECTION
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-950 uppercase mt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>ML Buffer Shield +{activeHubData.shieldBuffer.minutes}m</span>
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-900 mt-0.5">
                        +{activeHubData.shieldBuffer.minutes}m Shield
                      </div>
                      <div className="text-[10px] text-emerald-800 font-semibold">
                        Window: {activeHubData.shieldBuffer.window}
                      </div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-emerald-200/60 text-[9px] text-emerald-950">
                      <div className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Confidence: {activeHubData.shieldBuffer.confidence}</span>
                      </div>
                      <div className="text-[9px] text-stone-600 truncate">
                        {activeHubData.shieldBuffer.absorptionRate}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Connecting RE Train */}
                  <div className="p-3 rounded-2xl bg-white/80 border border-emerald-200/90 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                        STEP 3 • DEPARTURE
                      </span>
                      <div className="text-xs font-black text-stone-900 mt-1">
                        {activeHubData.connectingTrain.number}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        {activeHubData.connectingTrain.route}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-100 text-[10px]">
                      <div className="flex justify-between items-center text-stone-700">
                        <span>Platform:</span>
                        <span className="font-bold font-mono">{activeHubData.connectingTrain.platform}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-800 font-bold">
                        <span>Dep Telemetry:</span>
                        <span className="font-mono">{activeHubData.connectingTrain.depTime}</span>
                      </div>
                      <div className="text-[9px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Platform Interlocked</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Causal Completed-Arrival Contagion Equation Banner */}
                <div className="p-2.5 rounded-xl bg-emerald-950/90 text-emerald-100 border border-emerald-500/40 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-black text-[11px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                      {activeHubData.causalEquation}
                    </span>
                    <span className="text-[11px] text-stone-200">
                      {activeHubData.contagionStatus}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-600/50 shrink-0">
                    Contagion Risk: {activeHubData.contagionRisk}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cell 1 Footer: Key Features & ML Telemetry Guarantee */}
          <div className="mt-4 pt-3 border-t border-amber-100/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-stone-700">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-stone-800">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> 95%+ Missed-Connection Guarantee
              </span>
              <span className="flex items-center gap-1 font-semibold text-stone-800">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Dynamic Rail Junction Buffers (Ploiești, Brașov, Făurei)
              </span>
            </div>
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              🛡️ 96/100 Railway Reliability Buffer
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* BENTO CELL 2: QUEEN VIRA'S SUPERSONIC DISPATCH INSTRUMENT */}
        {/* (4 Columns Wide)                                       */}
        {/* ======================================================= */}
        <div
          data-testid="queen-card-fast"
          role="button"
          tabIndex={0}
          aria-pressed={selectedQueen === 'fast'}
          aria-label="Queen Vira • Queen Express Scout - 0 Stopovers & High-Speed Mainline Rail Dispatch"
          onClick={() => handleQueenSelect('fast')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleQueenSelect('fast');
            }
          }}
          className={`col-span-12 lg:col-span-4 flex flex-col justify-between cursor-pointer rounded-3xl p-5 sm:p-7 relative overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/55 backdrop-blur-md border border-amber-200/80 shadow-xl ${
            selectedQueen === 'fast'
              ? 'ring-2 ring-blue-500/80 shadow-2xl shadow-blue-500/10 border-blue-400 bg-blue-50/20'
              : 'hover:shadow-2xl hover:border-amber-300'
          }`}
        >
          {/* Subtle Ambient Blue Speed Glow */}
          <div
            className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Cell 2 Header: Queen Vira Identity & Mascot */}
          <div>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-amber-100/90 relative z-10">
              <div className="flex items-center gap-3">
                {/* Perched Queen Mascot Chamber with Royal Crown & Swarm */}
                <div className="relative shrink-0 p-2 rounded-2xl bg-white/70 border border-blue-200/90 shadow-sm">
                  {/* Floating Royal Crown above Mascot */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-transform duration-300 transform hover:scale-110">
                    <RoyalCrownSvg size={30} />
                  </div>

                  {/* Queen Vira Mascot Bee */}
                  <MascotBee
                    gear="fast"
                    size="lg"
                    animated={!prefersReducedMotion}
                    showAccessoryBadge={true}
                  />

                  {/* 5 Orbiting Minimalist Worker Bees (variant="fast") */}
                  <div
                    className="absolute inset-0 pointer-events-none overflow-visible"
                    aria-hidden="true"
                  >
                    <div className="absolute -top-2.5 -left-2.5">
                      <MiniWorkerBee variant="fast" size={15} delayMs={0} />
                    </div>
                    <div className="absolute top-1 -right-3.5">
                      <MiniWorkerBee variant="fast" size={17} delayMs={350} />
                    </div>
                    <div className="absolute -bottom-2 -left-2.5">
                      <MiniWorkerBee variant="fast" size={14} delayMs={700} />
                    </div>
                    <div className="absolute -bottom-2.5 right-1">
                      <MiniWorkerBee variant="fast" size={16} delayMs={1100} />
                    </div>
                    <div className="absolute top-1/2 -left-3.5">
                      <MiniWorkerBee variant="fast" size={13} delayMs={1500} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-800 border border-blue-400/50 shadow-xs">
                      SUPERSONIC SCOUT
                    </span>
                  </div>
                  {/* Headings tested by test suite */}
                  <h4 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight mt-0.5">
                    Queen Vira • Queen Express Scout
                  </h4>
                  <div className="text-[11px] font-semibold text-stone-500">
                    Queen Vira — Supersonic Express Scout
                  </div>
                </div>
              </div>
            </div>

            {/* Inference Badge Requirement: v35 < 1.5ms */}
            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-blue-800 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-300 shadow-xs">
                <Cpu className="w-3 h-3 text-blue-600" />
                <span className="font-extrabold">{activeSpeedData.inferenceEngine}</span>
                <span className="text-blue-950 font-bold">&lt; 1.5ms inference</span>
              </span>
              <span className="text-[10px] font-bold text-stone-500">
                0 Stopovers Dispatch
              </span>
            </div>

            {/* Subtitle snippet */}
            <p className="mt-2 text-xs text-stone-600 leading-relaxed">
              Prioritizes non-stop InterCity (IC) and electric dispatch, bypassing single-track bottlenecks for minimum rail transit time.
            </p>

            {/* Train Category Speedometer Selector Tabs */}
            <div className="mt-3.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-blue-600" />
                Train Category Speedometer:
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-blue-100/50 border border-blue-200">
                {(Object.keys(SPEED_CATEGORIES) as TrainCategory[]).map((catKey) => {
                  const cat = SPEED_CATEGORIES[catKey];
                  const isCurrent = selectedCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(catKey);
                        handleQueenSelect('fast');
                      }}
                      className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===================================================== */}
            {/* SVG RADIAL VELOCITY GAUGE (STRICT ZERO CANVAS)        */}
            {/* ===================================================== */}
            <div className="mt-3 p-3 rounded-2xl bg-stone-950 text-white border border-blue-500/40 shadow-inner flex flex-col items-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-[9px] font-mono text-blue-400 mb-1">
                <span>VELOCITY INSTRUMENT</span>
                <span>MAX 200 KM/H</span>
              </div>

              {/* Radial Speedometer Gauge */}
              <div className="relative w-44 h-28 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 120"
                  className="w-full h-full overflow-visible"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id={`gaugeGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="60%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>

                  {/* Background Arc Track (-140deg to -40deg = 180deg sweep) */}
                  <path
                    d="M 25 105 A 75 75 0 0 1 175 105"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />

                  {/* Tick Marks */}
                  <line x1="25" y1="105" x2="15" y2="105" stroke="#64748B" strokeWidth="2" />
                  <line x1="50" y1="52" x2="43" y2="45" stroke="#64748B" strokeWidth="2" />
                  <line x1="100" y1="30" x2="100" y2="20" stroke="#64748B" strokeWidth="2" />
                  <line x1="150" y1="52" x2="157" y2="45" stroke="#64748B" strokeWidth="2" />
                  <line x1="175" y1="105" x2="185" y2="105" stroke="#64748B" strokeWidth="2" />

                  {/* Active Speed Arc (Length approx 235.6) */}
                  <path
                    d="M 25 105 A 75 75 0 0 1 175 105"
                    fill="none"
                    stroke={`url(#gaugeGrad-${uniqueId})`}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray="235.6"
                    strokeDashoffset={235.6 * (1 - activeSpeedData.gaugePercent / 100)}
                    style={{
                      transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />

                  {/* Speedometer Needle */}
                  {/* Angle: 0 km/h is -90deg (pointing left), 200 km/h is +90deg (pointing right) */}
                  {(() => {
                    const angleDeg = -90 + (activeSpeedData.gaugePercent / 100) * 180;
                    return (
                      <g
                        style={{
                          transform: `rotate(${angleDeg}deg)`,
                          transformOrigin: '100px 105px',
                          transition: prefersReducedMotion ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <line x1="100" y1="105" x2="100" y2="40" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="100" cy="105" r="7" fill="#F59E0B" />
                        <circle cx="100" cy="105" r="3" fill="#1E293B" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Digital Speed Readout in Center */}
                <div className="absolute bottom-0 text-center">
                  <div className="text-3xl font-black font-mono tracking-tight text-white leading-none">
                    {activeSpeedData.speedKmh}
                    <span className="text-xs font-bold text-blue-400 ml-1">km/h</span>
                  </div>
                </div>
              </div>

              {/* 3 Speedometer Metrics Requirement: 160 km/h, 0 Stopovers, -45m saved */}
              <div className="w-full grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-800 text-center">
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-slate-400 font-mono">TOP SPEED</div>
                  <div className="text-xs font-black font-mono text-blue-400">
                    {activeSpeedData.speedKmh} km/h
                  </div>
                </div>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-slate-400 font-mono">DISPATCH</div>
                  <div className="text-xs font-black font-mono text-emerald-400">
                    {activeSpeedData.stopoversLabel}
                  </div>
                </div>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-slate-400 font-mono">TRAVEL TIME</div>
                  <div className="text-xs font-black font-mono text-amber-400">
                    {activeSpeedData.timeSaved}
                  </div>
                </div>
              </div>
            </div>

            {/* Traction & Corridor Info */}
            <div className="mt-2.5 p-2 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-blue-950 font-bold">
                <span>Active Train:</span>
                <span className="font-mono">{activeSpeedData.trainName}</span>
              </div>
              <div className="text-stone-600 text-[10px] leading-tight">
                {activeSpeedData.traction}
              </div>
              <div className="text-[10px] text-blue-800 font-semibold pt-1 border-t border-blue-200/50 flex items-center justify-between">
                <span>Corridor IV Mainline Trunk</span>
                <span className="font-mono font-bold">{activeSpeedData.transitDuration}</span>
              </div>
            </div>
          </div>

          {/* Cell 2 Footer: ML Guarantee */}
          <div className="mt-4 pt-3 border-t border-amber-100/90 text-center">
            <div className="inline-block px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              ⚡ Up to 45m Rail Travel Time Saved
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* BENTO CELL 3: QUEEN FLORA'S MULTI-OPERATOR TICKET DECK    */}
        {/* (12 Columns Wide Bottom Banner)                         */}
        {/* ======================================================= */}
        <div
          data-testid="queen-card-economy"
          role="button"
          tabIndex={0}
          aria-pressed={selectedQueen === 'economy'}
          aria-label="Queen Flora • Queen Nectar Saver - Multi-Operator Rail Fare Optimization"
          onClick={() => handleQueenSelect('economy')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleQueenSelect('economy');
            }
          }}
          className={`col-span-12 flex flex-col justify-between cursor-pointer rounded-3xl p-5 sm:p-7 relative overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white/55 backdrop-blur-md border border-amber-200/80 shadow-xl ${
            selectedQueen === 'economy'
              ? 'ring-2 ring-amber-500/80 shadow-2xl shadow-amber-500/10 border-amber-400 bg-amber-50/20'
              : 'hover:shadow-2xl hover:border-amber-300'
          }`}
        >
          {/* Subtle Ambient Honey Amber Glow */}
          <div
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Cell 3 Header: Queen Flora Identity & Perched Mascot */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-100/90 relative z-10">
            <div className="flex items-center gap-4">
              {/* Perched Queen Mascot Chamber with Royal Crown & Swarm */}
              <div className="relative shrink-0 p-2 rounded-2xl bg-white/70 border border-amber-200/90 shadow-sm">
                {/* Floating Royal Crown above Mascot */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-transform duration-300 transform hover:scale-110">
                  <RoyalCrownSvg size={30} />
                </div>

                {/* Queen Flora Mascot Bee */}
                <MascotBee
                  gear="economy"
                  size="lg"
                  animated={!prefersReducedMotion}
                  showAccessoryBadge={true}
                />

                {/* 5 Orbiting Minimalist Worker Bees (variant="economy") */}
                <div
                  className="absolute inset-0 pointer-events-none overflow-visible"
                  aria-hidden="true"
                >
                  <div className="absolute -top-2.5 -left-2.5">
                    <MiniWorkerBee variant="economy" size={15} delayMs={0} />
                  </div>
                  <div className="absolute top-1 -right-3.5">
                    <MiniWorkerBee variant="economy" size={17} delayMs={350} />
                  </div>
                  <div className="absolute -bottom-2 -left-2.5">
                    <MiniWorkerBee variant="economy" size={14} delayMs={700} />
                  </div>
                  <div className="absolute -bottom-2.5 right-1">
                    <MiniWorkerBee variant="economy" size={16} delayMs={1100} />
                  </div>
                  <div className="absolute top-1/2 -left-3.5">
                    <MiniWorkerBee variant="economy" size={13} delayMs={1500} />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-400/50 shadow-xs">
                    BEST VALUE NECTAR
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                    Multi-Operator Rail Fare Optimization
                  </span>
                </div>
                {/* Headings tested by test suite */}
                <h4 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-1 flex items-center gap-1.5">
                  Queen Flora • Queen Nectar Saver
                </h4>
                <div className="text-xs font-semibold text-stone-500">
                  Queen Flora — Smart Fare Harvester
                </div>
              </div>
            </div>

            {/* Savings Scorecard Banner */}
            <div className="sm:text-right shrink-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Intercity Rail Thrift
              </div>
              <div className="flex items-baseline sm:justify-end gap-1 mt-0.5">
                <span className="text-3xl font-black font-mono tracking-tight text-amber-600">
                  -61.1%
                </span>
                <span className="text-sm font-bold text-amber-900">MAX SAVING</span>
              </div>
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                💰 Save Up to 40% LEI on Commutes
              </span>
            </div>
          </div>

          {/* Subtitle text */}
          <div className="my-3 text-xs text-stone-600 leading-relaxed">
            <span className="font-bold text-stone-800">
              Multi-Operator Rail Fare Optimization:
            </span>{' '}
            Compares CFR Călători, Astra Trans Carpatic, TFC, Softrans, and Regio Călători across RE and R trains for the lowest LEI per kilometer.
          </div>

          {/* ===================================================== */}
          {/* FANNED-OUT HORIZONTAL DECK OF 4 INTERACTIVE TICKETS   */}
          {/* ===================================================== */}
          <div className="mt-2 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* The 4 Interactive Rail Tickets (8 Columns on desktop) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-amber-200/60">
                <span className="font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  Interactive Rail Tickets Deck (Corridor: Galați ➔ București Nord)
                </span>
                <span className="text-[10px] font-bold text-amber-700">
                  Hover or click ticket to elevate &amp; calculate
                </span>
              </div>

              {/* Fanned-out 4 Ticket Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {RAIL_TICKETS.map((ticket) => {
                  const isElevated =
                    ticket.id === (hoveredTicketId ?? selectedTicketId);
                  return (
                    <div
                      key={ticket.id}
                      onMouseEnter={() => setHoveredTicketId(ticket.id)}
                      onMouseLeave={() => setHoveredTicketId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketId(ticket.id);
                        handleQueenSelect('economy');
                      }}
                      className={`relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isElevated
                          ? '-translate-y-2.5 shadow-2xl ring-2 ring-amber-400 bg-amber-50/95 border-amber-400 z-10'
                          : 'bg-white/80 hover:bg-white border-amber-200/80 hover:-translate-y-1 hover:shadow-md'
                      }`}
                    >
                      {/* Ticket Header & Perforation Notch effect */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-dashed border-amber-200">
                          <span className="font-bold text-stone-500 font-mono">{ticket.trainCode}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                              ticket.isBaseline
                                ? 'bg-stone-200 text-stone-700'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {ticket.tag}
                          </span>
                        </div>

                        <div className="mt-2">
                          <div className="text-xs font-black text-stone-900 truncate">
                            {ticket.operator}
                          </div>
                          <div className="text-lg font-black font-mono text-amber-950 mt-1">
                            {ticket.fareFormatted}
                          </div>
                        </div>
                      </div>

                      {/* Ticket Savings Footer */}
                      <div className="mt-3 pt-2 border-t border-amber-100 text-[10px]">
                        {ticket.isBaseline ? (
                          <span className="text-stone-500 font-semibold">Standard Baseline</span>
                        ) : (
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            Save {ticket.savingsLei.toFixed(2)} LEI ({ticket.savingsPercent.toFixed(1)}%)
                          </span>
                        )}
                        <div className="text-[9px] text-stone-500 truncate mt-0.5">
                          {ticket.seatClass}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Amenities Highlight Panel for Active Ticket */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-amber-200/60">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <span>Amenities Breakdown:</span>
                    <span className="font-extrabold text-amber-900">{activeTicket.operator} ({activeTicket.trainCode})</span>
                  </span>
                  <span className="text-[10px] font-bold text-stone-600">
                    Eco-Rating: {activeTicket.co2EcoScore}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeTicket.amenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                        amenity.included
                          ? 'bg-white/90 border-emerald-200 text-stone-800'
                          : 'bg-stone-50/50 border-stone-200 text-stone-400 line-through'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] ${
                          amenity.included
                            ? 'bg-emerald-100 text-emerald-700 font-bold'
                            : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {amenity.included ? '✓' : '✕'}
                      </div>
                      <span className="truncate">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* GOLDEN HONEY JAR METER (4 Columns on desktop)         */}
            {/* ===================================================== */}
            <div className="lg:col-span-4 p-4 rounded-2xl bg-gradient-to-b from-amber-100/70 to-amber-200/50 border border-amber-300 shadow-sm flex flex-col justify-between items-center text-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-900 pb-1 border-b border-amber-300/60">
                <span>GOLDEN HONEY JAR METER</span>
                <span className="font-mono">SAVINGS ENGINE</span>
              </div>

              {/* Pure SVG Golden Honey Jar Graphic */}
              <div className="relative my-2 w-32 h-36 flex items-center justify-center">
                <svg
                  viewBox="0 0 140 160"
                  className="w-full h-full overflow-visible select-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Honey liquid gradient */}
                    <linearGradient id={`honeyJarLiquid-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="60%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                    <clipPath id={`jarInsideClip-${uniqueId}`}>
                      {/* Inner jar interior cutout */}
                      <path d="M 45 42 Q 45 35 70 35 Q 95 35 95 42 L 95 48 C 118 55 125 90 120 120 C 115 145 95 152 70 152 C 45 152 25 145 20 120 C 15 90 22 55 45 48 Z" />
                    </clipPath>
                  </defs>

                  {/* Glass Jar Outer Reflection & Contour */}
                  <path
                    d="M 45 40 Q 45 32 70 32 Q 95 32 95 40 L 98 48 C 122 55 130 92 124 122 C 118 148 98 155 70 155 C 42 155 22 148 16 122 C 10 92 18 55 42 48 Z"
                    fill="#FFFDF7"
                    stroke="#D97706"
                    strokeWidth="3"
                    opacity="0.9"
                  />

                  {/* Honey Jar Rim / Lid Ring */}
                  <rect x="38" y="24" width="64" height="10" rx="4" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
                  <rect x="42" y="26" width="56" height="3" rx="1.5" fill="#B45309" opacity="0.8" />

                  {/* Liquid Fill masked inside the jar */}
                  <g clipPath={`url(#jarInsideClip-${uniqueId})`}>
                    {/* Dynamic Height Honey Liquid Rectangle (Y from 155 down to 42) */}
                    {(() => {
                      // fillPercent from 0 to 100
                      const fill = activeTicket.honeyJarFill;
                      const fillHeight = (fill / 100) * 110; // max 110px
                      const fillY = 152 - fillHeight;
                      return (
                        <g>
                          <rect
                            x="10"
                            y={fillY}
                            width="120"
                            height={fillHeight + 10}
                            fill={`url(#honeyJarLiquid-${uniqueId})`}
                            style={{
                              transition: prefersReducedMotion ? 'none' : 'y 0.6s cubic-bezier(0.16, 1, 0.3, 1), height 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          />
                          {/* Liquid Surface Meniscus Wave */}
                          <ellipse
                            cx="70"
                            cy={fillY}
                            rx="50"
                            ry="6"
                            fill="#FDE68A"
                            opacity="0.75"
                            style={{
                              transition: prefersReducedMotion ? 'none' : 'cy 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          />
                          {/* Sparkle Bubbles inside Honey */}
                          {fill > 20 && (
                            <>
                              <circle cx="50" cy={fillY + 30} r="3" fill="#FEF3C7" opacity="0.6" className="animate-pulse" />
                              <circle cx="85" cy={fillY + 45} r="2.5" fill="#FEF3C7" opacity="0.5" />
                              <circle cx="65" cy={fillY + 65} r="4" fill="#FEF3C7" opacity="0.4" />
                            </>
                          )}
                        </g>
                      );
                    })()}
                  </g>

                  {/* Dipping Honey Spoon Drizzle Animation */}
                  <g className={!prefersReducedMotion ? 'animate-drizzle-nectar' : ''}>
                    <line x1="102" y1="10" x2="80" y2="40" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
                    <ellipse cx="78" cy="42" rx="6" ry="4" fill="#92400E" />
                    <circle cx="78" cy="48" r="2.5" fill="#F59E0B" />
                  </g>

                  {/* Glass Highlights */}
                  <path
                    d="M 28 65 Q 24 95 28 120"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </svg>

                {/* Percentage Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pt-8 pointer-events-none">
                  <span className="text-xl font-black font-mono text-amber-950 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-300 shadow-xs">
                    {activeTicket.savingsPercent > 0
                      ? `-${activeTicket.savingsPercent.toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Exact Savings Readout Calculation */}
              <div className="w-full space-y-1 mt-1">
                <div className="text-xs font-black text-amber-950">
                  {activeTicket.isBaseline ? (
                    <span>CFR Full Fare Baseline: 63.00 LEI</span>
                  ) : (
                    <span>
                      🍯 Saved: <span className="font-mono text-emerald-800">+{activeTicket.savingsLei.toFixed(2)} LEI</span> / ticket
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-600 leading-tight">
                  {activeTicket.isBaseline
                    ? 'No discount applied. Standard baseline reference.'
                    : `Switching to ${activeTicket.operator} preserves ${activeTicket.savingsPercent.toFixed(1)}% of your nectar!`
                  }
                </div>
                <div className="pt-2 border-t border-amber-300/50 text-[10px] text-amber-900 font-bold">
                  Annual 20-trip commuter saving: ~{(activeTicket.savingsLei * 20).toFixed(0)} LEI
                </div>
              </div>
            </div>
          </div>

          {/* Cell 3 Footer: Key Features & ML Guarantee */}
          <div className="mt-4 pt-3 border-t border-amber-100/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-stone-700">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-stone-800">
                <Check className="w-3.5 h-3.5 text-amber-600" /> Multi-Operator Combined Rail Fares
              </span>
              <span className="flex items-center gap-1 font-semibold text-stone-800">
                <Check className="w-3.5 h-3.5 text-amber-600" /> Lowest LEI Per Kilometer Guarantee
              </span>
            </div>
            <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              🍯 Save up to 40% on Intercity Rail LEI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Variant5BentoTrainRadar;