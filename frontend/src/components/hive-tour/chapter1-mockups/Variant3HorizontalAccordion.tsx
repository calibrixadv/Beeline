'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  Check,
  Train,
  Cpu,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import MascotBee, { MascotGear } from '../../MascotBee';
import MiniWorkerBee from '../MiniWorkerBee';
import { RoyalCrownSvg } from '../HiveSvgProps';

export interface Variant3HorizontalAccordionProps {
  activeGear?: MascotGear;
  onSelectQueen?: (gear: 'safe' | 'fast' | 'economy') => void;
  onSelectGear?: (gear: 'safe' | 'fast' | 'economy') => void;
}

export type AccordionQueenGear = 'safe' | 'fast' | 'economy';
type QueenGear = AccordionQueenGear;
export type StationCode = 'GLT' | 'FAU' | 'BZU' | 'PLS' | 'BCT';

interface QueenProfile {
  gear: QueenGear;
  name: string;
  roleTitle: string;
  headingTitle: string;
  romanianTitle: string;
  badge: string;
  color: string;
  glowHex: string;
  borderColor: string;
  bgActiveGradient: string;
  bgPillar: string;
  icon: React.ReactNode;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  mlGuarantee: string;
  heroMetric: string;
  heroMetricLabel: string;
  testId: string;
  pillarBadge: string;
}

const QUEENS_DATA: QueenProfile[] = [
  {
    gear: 'safe',
    name: 'Queen Meli',
    roleTitle: 'Queen Transfer Guard',
    headingTitle: 'Queen Meli • Queen Transfer Guard',
    romanianTitle: 'Queen Meli — Royal Transfer Shield',
    badge: 'SAFE ROUTE GUARDIAN',
    color: '#10B981',
    glowHex: 'rgba(16, 185, 129, 0.45)',
    borderColor: 'border-emerald-500/50',
    bgActiveGradient: 'from-emerald-950/90 via-stone-900/95 to-stone-950/90',
    bgPillar: 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    subtitle: 'ML Connection Protection & Station Buffers',
    description:
      'Never sprint breathlessly between train platforms. Queen Meli monitors real-time CFR and private rail delay telemetry, protecting train-to-train transfers across single-track intersections with algorithmic safety shields.',
    keyFeatures: [
      '95%+ Missed-Connection Guarantee',
      'Dynamic Rail Junction Buffers (Ploiești, Brașov, Făurei)',
      'Single-Track Train Delay Auto-Shielding',
    ],
    mlGuarantee: '99.5% Transfer AUC Connection Protection',
    heroMetric: '99.5% AUC',
    heroMetricLabel: 'Platform Transfer Shield',
    testId: 'queen-card-safe',
    pillarBadge: 'TRANSFER GUARD',
  },
  {
    gear: 'fast',
    name: 'Queen Vira',
    roleTitle: 'Queen Express Scout',
    headingTitle: 'Queen Vira • Queen Express Scout',
    romanianTitle: 'Queen Vira — Supersonic Express Scout',
    badge: 'SUPERSONIC SCOUT',
    color: '#3B82F6',
    glowHex: 'rgba(59, 130, 246, 0.45)',
    borderColor: 'border-blue-500/50',
    bgActiveGradient: 'from-blue-950/90 via-stone-900/95 to-stone-950/90',
    bgPillar: 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/30',
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    subtitle: '0 Stopovers & High-Speed Mainline Rail Dispatch',
    description:
      'Direct routing through Romania’s fastest mainline rail corridors. Queen Vira prioritizes non-stop InterCity (IC) and electric dispatch, bypassing single-track bottlenecks for minimum rail transit time.',
    keyFeatures: [
      '0 Stopovers Prioritization',
      'High-Priority InterCity (IC) & Hyperion Electric Dispatch',
      'Direct Mainline Rail Trunk Links',
    ],
    mlGuarantee: 'Up to 45m Rail Travel Time Saved',
    heroMetric: '140-160 km/h',
    heroMetricLabel: '25kV Electric Traction',
    testId: 'queen-card-fast',
    pillarBadge: 'EXPRESS SCOUT',
  },
  {
    gear: 'economy',
    name: 'Queen Flora',
    roleTitle: 'Queen Nectar Saver',
    headingTitle: 'Queen Flora • Queen Nectar Saver',
    romanianTitle: 'Queen Flora — Smart Fare Harvester',
    badge: 'BEST VALUE NECTAR',
    color: '#D97706',
    glowHex: 'rgba(217, 119, 6, 0.45)',
    borderColor: 'border-amber-500/50',
    bgActiveGradient: 'from-amber-950/90 via-stone-900/95 to-stone-950/90',
    bgPillar: 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/30',
    icon: <Coins className="w-5 h-5 text-amber-400" />,
    subtitle: 'Multi-Operator Rail Fare Optimization',
    description:
      'Stop overpaying for duplicate full-fare rail tickets. Queen Flora compares CFR Călători, Regio Călători, TFC, Softrans, and Astra Trans Carpatic across RE and R trains for the lowest LEI per kilometer.',
    keyFeatures: [
      'Multi-Operator Combined Rail Fares',
      'RE & Regio Commuter Fare Optimization',
      'Lowest LEI Per Kilometer Guarantee',
    ],
    mlGuarantee: 'Save up to 40% on Intercity Rail LEI',
    heroMetric: '-54.5% LEI',
    heroMetricLabel: 'Combined Fare Savings',
    testId: 'queen-card-economy',
    pillarBadge: 'NECTAR SAVER',
  },
];

interface StationTelemetry {
  code: StationCode;
  name: string;
  fullName: string;
  km: number;
  kmLabel: string;
  xCoord: number; // SVG horizontal position (0-960)
  tag: string;
  description: string;
  safe: {
    title: string;
    badge: string;
    metric: string;
    submetric: string;
    aucGuarantee: string;
    note: string;
  };
  fast: {
    title: string;
    badge: string;
    speed: string;
    latency: string;
    traction: string;
    clearance: string;
    note: string;
  };
  economy: {
    title: string;
    badge: string;
    segmentFare: {
      cfr: number;
      tfc: number;
      regio: number;
    };
    cumulativeFare: {
      cfr: number;
      tfc: number;
      regio: number;
      bestCombined: number;
      savingsLei: number;
      savingsPct: number;
    };
    note: string;
  };
}

export const CORRIDOR_STATIONS: StationTelemetry[] = [
  {
    code: 'GLT',
    name: 'Galați',
    fullName: 'Galați Central Railhead',
    km: 0,
    kmLabel: 'Km 0',
    xCoord: 90,
    tag: 'Danube Passenger & Freight Terminal',
    description: 'Danube port railway hub connecting Eastern Moldavia to the national mainline network.',
    safe: {
      title: 'Galați Departure Platform & Sensor Lock',
      badge: 'ORIGIN BUFFER PROTECTED',
      metric: '99.8% Departure Punctuality',
      submetric: 'Initial Timetable Delay Guard',
      aucGuarantee: '99.8% Initial Dispatch AUC',
      note: 'Sensor-verified departure slot allocation preventing initial delay propagation across Danube feeder lines.',
    },
    fast: {
      title: 'Galați Green Wave Express Departure',
      badge: 'HIGH-PRIORITY OUTBOUND',
      speed: '120 km/h Terminal Exit',
      latency: '< 1.2ms Edge Sync',
      traction: '25kV AC Overhead Catenary Ready',
      clearance: 'Direct IC 1570 Outbound Slot',
      note: 'High-priority IC 1570 non-stop slot assigned with zero yard staging delay and immediate mainline clearance.',
    },
    economy: {
      title: 'Galați Terminal Fare Gate',
      badge: 'ORIGIN KM 0',
      segmentFare: { cfr: 0, tfc: 0, regio: 0 },
      cumulativeFare: { cfr: 0, tfc: 0, regio: 0, bestCombined: 0, savingsLei: 0, savingsPct: 0 },
      note: 'Base terminal origin for multi-operator tariff comparison across the Galați ➔ București Nord corridor.',
    },
  },
  {
    code: 'FAU',
    name: 'Făurei',
    fullName: 'Făurei Strategic Railway Junction',
    km: 92,
    kmLabel: 'Km 92',
    xCoord: 285,
    tag: 'Strategic Single-Track Rail Junction',
    description: 'High-traffic intersection linking lines 700, 702, and the national high-speed test circuit ring.',
    safe: {
      title: 'Single-Track Crossing Cascade Protection',
      badge: 'SINGLE-TRACK CASCADE SHIELD',
      metric: '99.2% Anti-Cascade Interlock',
      submetric: 'Dynamic Siding Bypass Lock',
      aucGuarantee: '99.2% Crossing Safety AUC',
      note: 'Single-track crossing cascade protection at Făurei: dynamic siding clearance prevents waiting trains from domino delay cascading across the Danube plains.',
    },
    fast: {
      title: 'Făurei Straight-Track Express Clearance',
      badge: 'NON-STOP JUNCTION SPRINT',
      speed: '140 km/h Switch Flyover',
      latency: '< 1.4ms Switch Routing',
      traction: '25kV 50Hz Electric Interlock',
      clearance: 'High-priority IC / IR 1570 non-stop express clearance',
      note: 'High-priority IC / IR 1570 non-stop express clearance through Făurei switches at 140 km/h, bypassing single-track siding waits entirely.',
    },
    economy: {
      title: 'Galați ➔ Făurei Segment Harvest',
      badge: 'SEGMENT 1 • 92 KM',
      segmentFare: { cfr: 24.5, tfc: 14.0, regio: 12.0 },
      cumulativeFare: { cfr: 24.5, tfc: 14.0, regio: 12.0, bestCombined: 12.0, savingsLei: 12.5, savingsPct: 51 },
      note: 'Regio Călători commuter ticket of 12.00 LEI delivers an immediate 51% (12.50 LEI) savings over CFR Călători full fare.',
    },
  },
  {
    code: 'BZU',
    name: 'Buzău',
    fullName: 'Buzău Mainline Turnaround Hub',
    km: 132,
    kmLabel: 'Km 132',
    xCoord: 480,
    tag: 'Carpathian Bend Rail Hub & Maintenance Depot',
    description: 'Central Muntenia junction converging traffic from Moldavia onto the Magistrala 500 trunk corridor.',
    safe: {
      title: 'Turnaround Buffer & Dispatch Recovery',
      badge: 'SCHEDULE RECOVERY BUFFER',
      metric: '+18 min ML Turnaround Buffer',
      submetric: 'Dynamic Rescheduling Cushion',
      aucGuarantee: '98.9% Schedule Recovery AUC',
      note: 'Turnaround buffer at Buzău dynamically provides an 18-minute schedule recovery window, absorbing upstream Danube plain freight latency before trains enter the busy Prahova corridor.',
    },
    fast: {
      title: 'Buzău Mainline Electric Speedway',
      badge: '150 KM/H ELECTRIC SPRINT',
      speed: '150 km/h Mainline Track',
      latency: '< 1.3ms Dispatch Lock',
      traction: '25kV Dual-Pantograph Traction',
      clearance: 'High-priority IC / IR 1570 non-stop express clearance',
      note: 'High-priority IC / IR 1570 non-stop express clearance with green wave signaling along the 150 km/h straight mainline corridor.',
    },
    economy: {
      title: 'Făurei ➔ Buzău Segment Harvest',
      badge: 'SEGMENT 2 • 40 KM',
      segmentFare: { cfr: 16.0, tfc: 8.5, regio: 7.5 },
      cumulativeFare: { cfr: 40.5, tfc: 22.5, regio: 19.5, bestCombined: 19.5, savingsLei: 21.0, savingsPct: 52 },
      note: 'Cumulative fare to Buzău drops from 40.50 LEI (CFR) to 19.50 LEI with smart multi-operator ticket splitting (52% savings).',
    },
  },
  {
    code: 'PLS',
    name: 'Ploiești Sud',
    fullName: 'Ploiești Sud Platform Transfer Junction',
    km: 202,
    kmLabel: 'Km 202',
    xCoord: 675,
    tag: 'Critical Trans-Carpathian Trunk Hub',
    description: 'High-density railway junction uniting Magistrala 500 (Moldavia) with Magistrala 300 (Brașov/Transylvania).',
    safe: {
      title: 'Platform Transfer Shield & Connection Lock',
      badge: 'PLATFORM TRANSFER SHIELD (99.5% AUC)',
      metric: '99.5% Transfer AUC Shield',
      submetric: '+14 min Protected Cross-Platform Transfer',
      aucGuarantee: '99.5% Platform Transfer Shield AUC',
      note: 'Platform transfer shield at Ploiești Sud guarantees connection between incoming IR 1572 and RE 7570 with 99.5% AUC certainty, automatically dispatching hold requests to station dispatch.',
    },
    fast: {
      title: 'Ploiești Sud High-Speed Flyover Bypass',
      badge: '160 KM/H MAINLINE FLYOVER',
      speed: '160 km/h Mainline Flyover',
      latency: '< 1.1ms Routing Edge (< 1.5ms Edge Routing)',
      traction: '25kV High-Speed Electric Traction',
      clearance: 'High-priority IC / IR 1570 non-stop express clearance',
      note: 'Direct IC / IR 1570 non-stop express clearance via high-speed flyover tracks at 160 km/h, bypassing station sidings with < 1.5ms edge routing recalculation.',
    },
    economy: {
      title: 'Buzău ➔ Ploiești Sud Segment Harvest',
      badge: 'SEGMENT 3 • 70 KM',
      segmentFare: { cfr: 22.5, tfc: 11.0, regio: 9.5 },
      cumulativeFare: { cfr: 63.0, tfc: 33.5, regio: 29.0, bestCombined: 29.0, savingsLei: 34.0, savingsPct: 54 },
      note: 'Cumulative fare reaches 29.00 LEI vs 63.00 LEI for full-fare CFR, delivering a 34.00 LEI (54%) cost cut.',
    },
  },
  {
    code: 'BCT',
    name: 'București Nord',
    fullName: 'București Nord National Central Terminal',
    km: 260,
    kmLabel: 'Km 260',
    xCoord: 870,
    tag: 'National Central Rail Hub & Terminus',
    description: 'Romania’s principal railway passenger station, servicing over 200 daily regional and international trains.',
    safe: {
      title: 'Central Terminus Arrival Shield & Platform Lock',
      badge: 'CENTRAL PLATFORM LOCK',
      metric: '100% Platform Safety',
      submetric: 'Terminus Multi-Track Approach Guard',
      aucGuarantee: '99.5% Journey Protection AUC',
      note: 'Central terminal arrival protection guards against platform approach gridlock and platform change confusion upon entering Gara de Nord.',
    },
    fast: {
      title: 'București Nord Express Arrival Terminal',
      badge: 'SUPERSONIC EXPRESS ARRIVAL',
      speed: '140-160 km/h Corridor Average',
      latency: '< 1.5ms Edge Routing',
      traction: 'Full 25kV Electric Mainline Dispatch',
      clearance: 'Non-stop InterCity Terminal Arrival',
      note: 'Terminus arrival saves 45-60 min travel time vs regional stopping services, powered by 25kV electric traction and < 1.5ms edge routing.',
    },
    economy: {
      title: 'Ploiești Sud ➔ București Nord Final Harvest',
      badge: 'SEGMENT 4 • 58 KM (FULL CORRIDOR)',
      segmentFare: { cfr: 19.5, tfc: 9.5, regio: 8.5 },
      cumulativeFare: { cfr: 82.5, tfc: 43.0, regio: 37.5, bestCombined: 37.5, savingsLei: 45.0, savingsPct: 54.5 },
      note: 'Full corridor Galați ➔ București Nord cumulative fare breakdown: CFR 82.50 LEI vs TFC 43.00 LEI vs Regio Călători 37.50 LEI (Best Combined: 37.50 LEI, Save 45.00 LEI / 54.5%!).',
    },
  },
];

export const Variant3HorizontalAccordion: React.FC<Variant3HorizontalAccordionProps> = ({
  activeGear,
  onSelectQueen,
  onSelectGear,
}) => {
  const [selectedQueen, setSelectedQueen] = useState<QueenGear>(() => {
    if (activeGear && activeGear !== 'default') return activeGear;
    return 'safe';
  });

  const [selectedStation, setSelectedStation] = useState<StationCode>('PLS');
  const [hoveredStation, setHoveredStation] = useState<StationCode | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const prevActiveGearRef = useRef(activeGear);

  // Sync with prop activeGear when changed externally
  useEffect(() => {
    if (activeGear && activeGear !== 'default' && activeGear !== prevActiveGearRef.current) {
      prevActiveGearRef.current = activeGear;
      setSelectedQueen(activeGear);
    }
  }, [activeGear]);

  // Motion preference listener
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleQueenSelect = (gear: QueenGear) => {
    setSelectedQueen(gear);
    onSelectQueen?.(gear);
    onSelectGear?.(gear);
  };

  const activeStationData =
    CORRIDOR_STATIONS.find((s) => s.code === selectedStation) || CORRIDOR_STATIONS[3];

  return (
    <div
      data-testid="variant-3-horizontal-accordion"
      className="w-full flex flex-col space-y-6"
    >
      {/* ========================================================================= */}
      {/* PANORAMIC ACCORDION CONTAINER: 70% Active Sanctuary / 15% Pillars        */}
      {/* ========================================================================= */}
      <div
        className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch w-full min-h-[660px]"
        style={{
          perspective: '1200px',
        }}
      >
        {QUEENS_DATA.map((queen) => {
          const isActive = selectedQueen === queen.gear;

          if (isActive) {
            {/* ================================================================= */}
            {/* 70% EXPANDED ROYAL SANCTUARY (flex-[4.5])                         */}
            {/* ================================================================= */}
            return (
              <div
                key={queen.gear}
                data-testid={queen.testId}
                role="button"
                tabIndex={0}
                aria-pressed="true"
                aria-label={`${queen.headingTitle} - Active Sanctuary`}
                onClick={() => handleQueenSelect(queen.gear)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleQueenSelect(queen.gear);
                  }
                }}
                className={`lg:flex-[4.5] flex-1 min-w-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-3xl p-5 sm:p-7 bg-gradient-to-br ${queen.bgActiveGradient} border-2 ${queen.borderColor} shadow-2xl relative overflow-hidden flex flex-col justify-between`}
                style={{
                  transition: 'all 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                  boxShadow: `0 20px 45px -12px ${queen.glowHex}, 0 0 25px -4px ${queen.glowHex}`,
                }}
              >
                {/* Ambient Radial Backlight Glow */}
                <div
                  className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-25"
                  style={{ backgroundColor: queen.color }}
                  aria-hidden="true"
                />
                <div
                  className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
                  style={{ backgroundColor: queen.color }}
                  aria-hidden="true"
                />

                {/* ============================================================= */}
                {/* TOP SANCTUARY DECK: Queen Mascot Chamber + Royal Narrative    */}
                {/* ============================================================= */}
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 pb-6 border-b border-stone-800/80">
                  {/* Left: Royal Mascot Chamber with Orbiting Worker Bees */}
                  <div className="relative shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-900/80 border border-stone-700/60 shadow-inner">
                    {/* Floating Royal Crown */}
                    <div className="mb-[-10px] z-20 transform hover:scale-110 transition-transform">
                      <RoyalCrownSvg size={38} />
                    </div>

                    {/* Mascot Bee Visual */}
                    <div className="relative p-2">
                      <MascotBee
                        gear={queen.gear}
                        size="xl"
                        animated={!prefersReducedMotion}
                        showAccessoryBadge={true}
                      />

                      {/* 5 Orbiting Mini Worker Bees around active Queen */}
                      <div className="absolute inset-0 pointer-events-none overflow-visible">
                        <div className="absolute -top-3 -left-4">
                          <MiniWorkerBee variant={queen.gear} size={18} delayMs={0} />
                        </div>
                        <div className="absolute top-2 -right-4">
                          <MiniWorkerBee variant={queen.gear} size={19} delayMs={380} />
                        </div>
                        <div className="absolute -bottom-2 -left-3">
                          <MiniWorkerBee variant={queen.gear} size={17} delayMs={760} />
                        </div>
                        <div className="absolute -bottom-3 right-0">
                          <MiniWorkerBee variant={queen.gear} size={18} delayMs={1140} />
                        </div>
                        <div className="absolute top-1/2 -left-6">
                          <MiniWorkerBee variant={queen.gear} size={16} delayMs={1520} />
                        </div>
                      </div>
                    </div>

                    {/* Royal Sanctuary Status Pill */}
                    <span
                      className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-sm"
                      style={{
                        backgroundColor: `${queen.color}20`,
                        borderColor: `${queen.color}60`,
                        color: queen.color,
                      }}
                    >
                      👑 SANCTUARY EXPANDED
                    </span>
                  </div>

                  {/* Right: Titles, Romanian Epithet, Value Props & Guarantees */}
                  <div className="flex-1 text-center md:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border"
                        style={{
                          backgroundColor: `${queen.color}25`,
                          borderColor: `${queen.color}50`,
                          color: queen.color,
                        }}
                      >
                        {queen.badge}
                      </span>
                      <span className="text-[10px] font-bold text-stone-400 bg-stone-900/80 px-2.5 py-0.5 rounded-full border border-stone-800">
                        70% WIDE CORRIDOR OBSERVATORY
                      </span>
                    </div>

                    {/* Level 4 Heading Required by Specs */}
                    <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                      {queen.headingTitle}
                    </h4>

                    {/* Romanian Title */}
                    <div className="text-xs sm:text-sm font-semibold text-amber-300/90 mt-1">
                      {queen.romanianTitle}
                    </div>

                    {/* Subtitle */}
                    <div className="text-xs sm:text-sm font-bold text-stone-300 mt-1 flex items-center justify-center md:justify-start gap-1.5">
                      <span>{queen.subtitle}</span>
                    </div>

                    {/* Description */}
                    <p className="mt-2 text-xs sm:text-sm text-stone-300/90 leading-relaxed max-w-2xl">
                      {queen.description}
                    </p>

                    {/* Key Features & ML Guarantee */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      {queen.keyFeatures.map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] font-medium text-stone-200"
                        >
                          <Check className="w-3 h-3" style={{ color: queen.color }} />
                          <span>{feat}</span>
                        </div>
                      ))}
                      <div
                        className="px-3 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${queen.color}18`,
                          borderColor: `${queen.color}50`,
                          color: '#F9FAFB',
                        }}
                      >
                        <span>🛡️</span>
                        <span>{queen.mlGuarantee}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* MIDDLE & BOTTOM: INTERACTIVE SVG CORRIDOR STATION MAP         */}
                {/* ============================================================= */}
                <div className="relative z-10 mt-5 pt-4 flex flex-col space-y-4">
                  {/* Track Diagram Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Train className="w-4 h-4 text-amber-400" />
                      <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                        Magistrala 700 / 500 Romanian Rail Corridor Diagram
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-stone-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        {selectedQueen === 'safe' && 'Cascade Protection Shield Active'}
                        {selectedQueen === 'fast' && '25kV High-Speed Mainline Interlock'}
                        {selectedQueen === 'economy' && 'Multi-Operator Fare Matrix Synchronized'}
                      </span>
                    </div>
                  </div>

                  {/* Interactive SVG Railway Corridor Diagram */}
                  <div className="w-full bg-stone-950/80 rounded-2xl p-3 sm:p-4 border border-stone-800 shadow-inner relative overflow-hidden">
                    <svg
                      viewBox="0 0 960 140"
                      className="w-full h-auto overflow-visible select-none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Interactive Romanian Railway Corridor Diagram Galați to București Nord"
                    >
                      <defs>
                        {/* Metallic Rail Gradient */}
                        <linearGradient id="railSteelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#78716C" />
                          <stop offset="25%" stopColor="#D6D3D1" />
                          <stop offset="50%" stopColor="#A8A29E" />
                          <stop offset="75%" stopColor="#E7E5E4" />
                          <stop offset="100%" stopColor="#78716C" />
                        </linearGradient>

                        {/* Train Body Livery Gradients */}
                        <linearGradient id="trainLiveryGrad-safe" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="trainLiveryGrad-fast" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#1D4ED8" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                        <linearGradient id="trainLiveryGrad-economy" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#B45309" />
                          <stop offset="100%" stopColor="#F59E0B" />
                        </linearGradient>

                        {/* Soft Glow Filter */}
                        <filter id="royalNodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Ballast Gravel Bed */}
                      <rect
                        x="30"
                        y="62"
                        width="900"
                        height="32"
                        rx="6"
                        fill="#1C1917"
                        stroke="#44403C"
                        strokeWidth="1.2"
                        opacity="0.8"
                      />

                      {/* Concrete Cross-Tie Sleepers (56 Sleepers across corridor) */}
                      {Array.from({ length: 56 }).map((_, idx) => {
                        const x = 40 + idx * 15.8;
                        return (
                          <line
                            key={idx}
                            x1={x}
                            y1="62"
                            x2={x}
                            y2="94"
                            stroke="#57534E"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            opacity="0.85"
                          />
                        );
                      })}

                      {/* Dual Heavy Steel Rails */}
                      <line
                        x1="35"
                        y1="70"
                        x2="925"
                        y2="70"
                        stroke="url(#railSteelGrad)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                      <line
                        x1="35"
                        y1="86"
                        x2="925"
                        y2="86"
                        stroke="url(#railSteelGrad)"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />

                      {/* Directional Signal Arrowheads along Segments (━━━▶) */}
                      <text x="187" y="81" fill="#F59E0B" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.85">
                        ▶
                      </text>
                      <text x="382" y="81" fill="#F59E0B" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.85">
                        ▶
                      </text>
                      <text x="577" y="81" fill="#F59E0B" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.85">
                        ▶
                      </text>
                      <text x="772" y="81" fill="#F59E0B" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.85">
                        ▶
                      </text>

                      {/* ===================================================== */}
                      {/* ANIMATED LOCOMOTIVE PULSE MOVING ALONG TRACK          */}
                      {/* ===================================================== */}
                      <g
                        className={
                          !prefersReducedMotion
                            ? `animate-corridor-train-${queen.gear}`
                            : undefined
                        }
                        style={prefersReducedMotion ? { transform: 'translateX(350px)' } : undefined}
                      >
                        {/* Headlight Beam illumination casting forward */}
                        <polygon
                          points="118,78 170,64 170,92"
                          fill="#FEF08A"
                          opacity="0.32"
                        />

                        {/* Train Carriage Body */}
                        <rect
                          x="82"
                          y="67"
                          width="36"
                          height="22"
                          rx="4"
                          fill={`url(#trainLiveryGrad-${queen.gear})`}
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                          filter="url(#royalNodeGlow)"
                        />

                        {/* Train Cab Windows */}
                        <rect x="104" y="70" width="10" height="16" rx="2" fill="#E0F2FE" opacity="0.9" />
                        <rect x="91" y="72" width="7" height="6" rx="1.5" fill="#FEF3C7" opacity="0.8" />

                        {/* Headlight Glint */}
                        <circle cx="116" cy="78" r="2.8" fill="#FEF08A" />

                        {/* Queen Archetype Icon Badge on Train */}
                        {queen.gear === 'safe' && (
                          <circle cx="95" cy="78" r="3.5" fill="#065F46" />
                        )}
                        {queen.gear === 'fast' && (
                          <polygon points="92,81 97,75 95,78 98,78 93,82" fill="#FEF08A" />
                        )}
                        {queen.gear === 'economy' && (
                          <circle cx="95" cy="78" r="3.5" fill="#78350F" />
                        )}
                      </g>

                      {/* ===================================================== */}
                      {/* 5 INTERACTIVE RAILWAY CORRIDOR STATIONS               */}
                      {/* ===================================================== */}
                      {CORRIDOR_STATIONS.map((st) => {
                        const isStationSelected = selectedStation === st.code;
                        const isStationHovered = hoveredStation === st.code;

                        return (
                          <g
                            key={st.code}
                            role="button"
                            data-testid={`station-node-${st.code}`}
                            tabIndex={0}
                            aria-label={`Inspect Station ${st.fullName} [${st.code}]`}
                            aria-pressed={isStationSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStation(st.code);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedStation(st.code);
                              }
                            }}
                            onMouseEnter={() => setHoveredStation(st.code)}
                            onMouseLeave={() => setHoveredStation(null)}
                            className="cursor-pointer group focus:outline-none"
                          >
                            {/* Station Code Badge (Above Track) */}
                            <g transform={`translate(${st.xCoord}, 34)`}>
                              <rect
                                x="-24"
                                y="-14"
                                width="48"
                                height="20"
                                rx="5"
                                fill={isStationSelected ? queen.color : '#1C1917'}
                                stroke={isStationSelected ? '#FFFFFF' : '#57534E'}
                                strokeWidth={isStationSelected ? '1.5' : '1'}
                              />
                              <text
                                x="0"
                                y="0"
                                fill={isStationSelected ? '#000000' : '#F5F5F4'}
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                [{st.code}]
                              </text>
                            </g>

                            {/* Connecting Anchor Stem from Code Badge to Track Node */}
                            <line
                              x1={st.xCoord}
                              y1="40"
                              x2={st.xCoord}
                              y2="66"
                              stroke={isStationSelected ? queen.color : '#78716C'}
                              strokeWidth={isStationSelected ? '2' : '1.2'}
                              strokeDasharray={isStationSelected ? 'none' : '2 2'}
                            />

                            {/* Ripple Pulse Rings if Station is Selected */}
                            {isStationSelected && !prefersReducedMotion && (
                              <circle
                                cx={st.xCoord}
                                cy="78"
                                r="18"
                                fill="none"
                                stroke={queen.color}
                                strokeWidth="1.5"
                                opacity="0.6"
                                className="animate-ping"
                              />
                            )}

                            {/* Outer Station Node Ring */}
                            <circle
                              cx={st.xCoord}
                              cy="78"
                              r={isStationSelected ? 12 : isStationHovered ? 10 : 8}
                              fill={isStationSelected ? queen.color : '#292524'}
                              stroke="#FFFFFF"
                              strokeWidth={isStationSelected ? '2.5' : '1.5'}
                              className="transition-all duration-300"
                            />

                            {/* Inner Node Core */}
                            <circle
                              cx={st.xCoord}
                              cy="78"
                              r={isStationSelected ? 5 : 3.5}
                              fill={isStationSelected ? '#FFFFFF' : queen.color}
                            />

                            {/* Station Name Label (Below Track) */}
                            <text
                              x={st.xCoord}
                              y="112"
                              fill={isStationSelected ? '#FBBF24' : '#F5F5F4'}
                              fontSize={isStationSelected ? '12' : '11'}
                              fontWeight="bold"
                              textAnchor="middle"
                              className="transition-colors"
                            >
                              {st.name}
                            </text>

                            {/* Kilometer Label (Below Name) */}
                            <text
                              x={st.xCoord}
                              y="126"
                              fill="#A8A29E"
                              fontSize="9.5"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {st.kmLabel}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Worker Bee Convoy Escort Flying Along Corridor */}
                    <div className="absolute top-2 left-6 right-6 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2">
                        <MiniWorkerBee variant={queen.gear} size={16} delayMs={100} />
                        <span className="text-[10px] font-mono text-stone-400">Escort Unit Alpha</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-stone-400">Escort Unit Omega</span>
                        <MiniWorkerBee variant={queen.gear} size={16} delayMs={500} />
                      </div>
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* STATION SELECTOR BUTTONS & ACCESSIBILITY CONTROLS             */}
                  {/* ============================================================= */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select Corridor Station:</span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {CORRIDOR_STATIONS.map((st) => {
                        const isSelected = selectedStation === st.code;
                        return (
                          <button
                            key={st.code}
                            type="button"
                            data-testid={`station-pill-${st.code}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStation(st.code);
                            }}
                            aria-pressed={isSelected}
                            aria-label={`Inspect ${st.fullName}`}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-stone-950 shadow-md font-extrabold ring-1 ring-amber-300'
                                : 'bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
                            }`}
                          >
                            <span className="font-mono text-[10px]">[{st.code}]</span>
                            <span>{st.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* STATION-SPECIFIC TELEMETRY INSPECTOR DECK                     */}
                  {/* Tailored Specifically for Active Queen                        */}
                  {/* ============================================================= */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/90 border border-stone-800/90 text-stone-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-amber-400">
                            [{activeStationData.code}]
                          </span>
                          <span className="text-base sm:text-lg font-black text-white">
                            {activeStationData.fullName}
                          </span>
                          <span className="text-xs font-mono text-stone-400">
                            ({activeStationData.kmLabel})
                          </span>
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {activeStationData.tag} • {activeStationData.description}
                        </div>
                      </div>

                      <div
                        className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm"
                        style={{
                          backgroundColor: `${queen.color}20`,
                          borderColor: `${queen.color}60`,
                          color: queen.color,
                        }}
                      >
                        {selectedQueen === 'safe' && activeStationData.safe.badge}
                        {selectedQueen === 'fast' && activeStationData.fast.badge}
                        {selectedQueen === 'economy' && activeStationData.economy.badge}
                      </div>
                    </div>

                    {/* Queen Meli: Safe Telemetry Deck */}
                    {selectedQueen === 'safe' && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            {activeStationData.safe.title}
                          </span>
                          <div className="text-xl font-black text-white mt-1">
                            {activeStationData.safe.metric}
                          </div>
                          <span className="text-xs text-stone-400 mt-1">
                            {activeStationData.safe.submetric}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            ML Connection Guarantee
                          </span>
                          <div className="text-lg font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <span>{activeStationData.safe.aucGuarantee}</span>
                          </div>
                          <span className="text-xs text-stone-400 mt-1">
                            Cascading delay mitigation interlock
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-center">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                            Corridor Protection Note
                          </span>
                          <p className="text-xs text-stone-300 leading-relaxed">
                            {activeStationData.safe.note}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Queen Vira: Fast Telemetry Deck */}
                    {selectedQueen === 'fast' && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                            {activeStationData.fast.title}
                          </span>
                          <div className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <span>{activeStationData.fast.speed}</span>
                          </div>
                          <span className="text-xs text-stone-400 mt-1">
                            {activeStationData.fast.traction}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between">
                          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Edge Dispatch Latency
                          </span>
                          <div className="text-lg font-bold text-blue-300 mt-1 flex items-center gap-1.5">
                            <Cpu className="w-5 h-5 text-blue-400" />
                            <span>{activeStationData.fast.latency}</span>
                          </div>
                          <span className="text-xs text-stone-400 mt-1">
                            {activeStationData.fast.clearance}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-center">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                            High-Speed Corridor Dispatch
                          </span>
                          <p className="text-xs text-stone-300 leading-relaxed">
                            {activeStationData.fast.note}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Queen Flora: Economy Telemetry Deck */}
                    {selectedQueen === 'economy' && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
                          {/* CFR Full Fare */}
                          <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                            <div className="text-[10px] font-bold text-stone-400 uppercase">
                              CFR Călători Fare
                            </div>
                            <div className="text-base sm:text-lg font-black text-stone-200 mt-0.5">
                              {activeStationData.economy.cumulativeFare.cfr.toFixed(2)} LEI
                            </div>
                            <div className="text-[10px] text-stone-400">
                              Segment: +{activeStationData.economy.segmentFare.cfr.toFixed(2)} LEI
                            </div>
                          </div>

                          {/* TFC Fare */}
                          <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                            <div className="text-[10px] font-bold text-stone-400 uppercase">
                              Transferoviar (TFC)
                            </div>
                            <div className="text-base sm:text-lg font-black text-blue-300 mt-0.5">
                              {activeStationData.economy.cumulativeFare.tfc.toFixed(2)} LEI
                            </div>
                            <div className="text-[10px] text-stone-400">
                              Segment: +{activeStationData.economy.segmentFare.tfc.toFixed(2)} LEI
                            </div>
                          </div>

                          {/* Regio Călători Fare */}
                          <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                            <div className="text-[10px] font-bold text-stone-400 uppercase">
                              Regio Călători
                            </div>
                            <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                              {activeStationData.economy.cumulativeFare.regio.toFixed(2)} LEI
                            </div>
                            <div className="text-[10px] text-stone-400">
                              Segment: +{activeStationData.economy.segmentFare.regio.toFixed(2)} LEI
                            </div>
                          </div>

                          {/* Best Combined Savings */}
                          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40">
                            <div className="text-[10px] font-black text-amber-400 uppercase">
                              Best Multi-Operator
                            </div>
                            <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                              {activeStationData.economy.cumulativeFare.bestCombined.toFixed(2)} LEI
                            </div>
                            <div className="text-[10px] font-bold text-emerald-400">
                              Save {activeStationData.economy.cumulativeFare.savingsLei.toFixed(2)} LEI (
                              {activeStationData.economy.cumulativeFare.savingsPct}%)
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
                          <p className="text-xs text-stone-300 leading-relaxed">
                            {activeStationData.economy.note}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          {/* =================================================================== */}
          {/* 15% SLEEK VERTICAL GLASS PILLARS (flex-1)                           */}
          {/* =================================================================== */}
          return (
            <div
              key={queen.gear}
              data-testid={queen.testId}
              role="button"
              tabIndex={0}
              aria-pressed="false"
              aria-label={`${queen.headingTitle} - Click to Expand Sanctuary`}
              onClick={() => handleQueenSelect(queen.gear)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleQueenSelect(queen.gear);
                }
              }}
              className={`lg:flex-1 flex-none min-w-[110px] sm:min-w-[130px] lg:min-w-[110px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-3xl p-4 sm:p-5 ${queen.bgPillar} backdrop-blur-md border flex flex-col items-center justify-between cursor-pointer group hover:scale-[1.01] hover:shadow-2xl relative overflow-hidden`}
              style={{
                transition: 'all 700ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {/* Subtle Queen Glow in Pillar */}
              <div
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${queen.color}, transparent 70%)`,
                }}
                aria-hidden="true"
              />

              {/* Pillar Top: Royal Crown + Peeking Mascot Bee */}
              <div className="relative flex flex-col items-center justify-center pt-2">
                <div className="mb-[-8px] z-10 transition-transform duration-300 group-hover:scale-110">
                  <RoyalCrownSvg size={28} />
                </div>

                <div className="relative p-1.5 rounded-xl bg-stone-900/60 border border-stone-700/50">
                  <MascotBee
                    gear={queen.gear}
                    size="md"
                    animated={!prefersReducedMotion}
                    showAccessoryBadge={true}
                  />

                  {/* Peeking Mini Worker Bees on Pillar */}
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    <div className="absolute -top-2 -left-2">
                      <MiniWorkerBee variant={queen.gear} size={15} delayMs={100} />
                    </div>
                    <div className="absolute -bottom-2 -right-2">
                      <MiniWorkerBee variant={queen.gear} size={16} delayMs={500} />
                    </div>
                  </div>
                </div>

                {/* Level 4 Heading for Accessible Matching in Compressed Pillar */}
                <h4 className="text-xs sm:text-sm font-black text-white text-center leading-tight tracking-tight mt-2.5">
                  {queen.roleTitle}
                </h4>
                <div className="text-[11px] font-bold text-stone-400 text-center">
                  {queen.name}
                </div>
              </div>

              {/* Pillar Center: Vertical Royal Badge */}
              <div className="my-auto py-4 flex flex-col items-center justify-center">
                <span
                  className="[writing-mode:vertical-rl] rotate-180 text-[10px] sm:text-xs font-black tracking-widest uppercase py-3.5 px-2 rounded-full border bg-stone-950/70 shadow-inner transition-colors group-hover:bg-stone-900"
                  style={{
                    color: queen.color,
                    borderColor: `${queen.color}50`,
                  }}
                >
                  {queen.pillarBadge}
                </span>
              </div>

              {/* Pillar Bottom: Metric Badge & Pulsing Hover Invitation */}
              <div className="w-full flex flex-col items-center pt-2 border-t border-stone-800/80">
                <div
                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold border mb-2 text-center w-full truncate"
                  style={{
                    backgroundColor: `${queen.color}15`,
                    color: queen.color,
                    borderColor: `${queen.color}40`,
                  }}
                >
                  {queen.heroMetric}
                </div>

                {/* Pulsing Hover Invitation */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400 group-hover:text-white transition-colors">
                  <span
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: queen.color }}
                  />
                  <span>Expand</span>
                  <ChevronRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Variant3HorizontalAccordion;
