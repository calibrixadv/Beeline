'use client';

import React, { useState } from 'react';
import { Train, Network, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import BaseCard from '../BaseCard';
import { HoneycombSvg } from './HiveSvgProps';
import { TransitProviderInfo } from './types';

const PROVIDERS: TransitProviderInfo[] = [
  // Row 1 — National & Long-Distance Express Rail (#D97706 Amber Gold)
  {
    id: 'cfr',
    name: 'CFR Călători',
    fullName: 'Compania Națională de Transport Feroviar CFR Călători S.A.',
    type: 'rail',
    badge: 'NATIONAL FLAGSHIP RAIL',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    accentColor: '#D97706',
    coverage: '100% Nationwide Network (All 8 National Magistrales)',
    fleet: 'IC, IR, RE, R (All 8 National Magistrales)',
    syncFeature: '985,000+ historical runs modeled; automated 15–25m ML transfer buffers at Ploiești Sud, Brașov, and Adjud.',
    iconName: 'Train',
  },
  {
    id: 'astra',
    name: 'Astra Trans Carpatic',
    fullName: 'Astra Trans Carpatic S.R.L.',
    type: 'rail',
    badge: 'PREMIUM LONG-DISTANCE RAIL',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    accentColor: '#D97706',
    coverage: 'București – Brașov – Arad – Timișoara / Constanța',
    fleet: 'Modern AC InterRegio, Sleeper & Couchette',
    syncFeature: 'Guaranteed seat reservations synchronized with morning and overnight mainline rail connections.',
    iconName: 'Train',
  },
  {
    id: 'softrans',
    name: 'Softrans',
    fullName: 'Softrans S.R.L. (Hyperion Train Fleet)',
    type: 'rail',
    badge: 'HYPERION ELECTRIC RAIL',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    accentColor: '#D97706',
    coverage: 'Craiova – București Nord – Brașov / Constanța',
    fleet: 'Hyperion 25kV AC Dual-Voltage EMUs',
    syncFeature: 'High-speed electric corridors (Craiova – București Nord – Brașov / Constanța) with live catenary weather telemetry.',
    iconName: 'Zap',
  },

  // Row 2 — Private Regional & InterRegio Rail (#F59E0B Warm Honey)
  {
    id: 'tfc',
    name: 'Transferoviar Călători',
    fullName: 'Transferoviar Călători S.A. (TFC)',
    type: 'rail',
    badge: 'REGIONAL & COMMUTER EXPRESS',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    accentColor: '#F59E0B',
    coverage: 'București, Buzău, Galați, and Cluj Lines',
    fleet: 'Bombardier Talent & Alstom Coradia DMUs',
    syncFeature: '176,000+ runs analyzed; high-punctuality regional feeders synced on București, Buzău, Galați, and Cluj lines.',
    iconName: 'Train',
  },
  {
    id: 'regio',
    name: 'Regio Călători',
    fullName: 'Regio Călători S.R.L.',
    type: 'rail',
    badge: 'PRIVATE REGIONAL NETWORK',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    accentColor: '#F59E0B',
    coverage: 'Moldavia, Banat & Transylvania Regional Lines',
    fleet: 'Alstom & Duewag Regional Railcars',
    syncFeature: '332,000+ historical runs trained; seamless regional-to-InterCity timetable synchronization.',
    iconName: 'Train',
  },
  {
    id: 'interregional',
    name: 'Interregional Călători',
    fullName: 'Interregional Călători S.R.L. (IRC)',
    type: 'rail',
    badge: 'TRANSYLVANIAN RAIL LINKS',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    accentColor: '#F59E0B',
    coverage: 'Cluj-Napoca, Oradea, Satu Mare & Târgu Mureș Corridors',
    fleet: 'Siemens Desiro & Regional Railcars',
    syncFeature: 'Synchronized northern & western rail corridors across Cluj-Napoca, Oradea, Satu Mare, and Târgu Mureș.',
    iconName: 'Train',
  },

  // Row 3 — Specialized Rail & Critical Junction Hubs (#059669 Railway Emerald)
  {
    id: 'ferotrafic',
    name: 'Ferotrafic TFI',
    fullName: 'Ferotrafic TFI S.R.L.',
    type: 'rail',
    badge: 'SPECIALIZED REGIONAL RAIL',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Regional Branch Lines & Interconnecting Rail Corridors',
    fleet: 'Branch-Line & Commuter Rail Units',
    syncFeature: 'Branch-line arrival alignment protecting against missed mainline InterRegio departures.',
    iconName: 'Train',
  },
  {
    id: 'bucuresti-hub',
    name: 'București Nord Hub',
    fullName: 'Gara de Nord Central Railway Terminal Hub',
    type: 'junction',
    badge: 'PRIMARY NATIONAL RAIL JUNCTION',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Magistrales 300, 500, 700, 800 & 900 Central Interchange',
    fleet: 'Magistrales 300, 500, 700, 800 & 900',
    syncFeature: 'Causal hub contagion tracking ([t-3h, t) window) & platform-to-platform transfer shield across all carriers.',
    iconName: 'Network',
  },
  {
    id: 'carpathian-danube-hub',
    name: 'Carpathian & Danube Hubs',
    fullName: 'Strategic Mountain Pass & River Junction Rail Network',
    type: 'junction',
    badge: 'BOTTLENECK & MOUNTAIN PASS GUARD',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentColor: '#059669',
    coverage: 'Brașov, Ploiești Sud, Făurei & Predeal Mountain Pass',
    fleet: 'Brașov, Ploiești Sud, Făurei & Predeal Pass',
    syncFeature: 'Single-track crossing cascade modeling (Galați–Făurei) & winter switch-freeze telemetry (Line 300).',
    iconName: 'Network',
  },
];

export const TransitHoneycombSection: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<TransitProviderInfo>(PROVIDERS[0]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section
      id="tour-providers"
      aria-label="The Synchronized Transit Honeycomb"
      className="relative w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
    >
      {/* Chapter 2 Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 mb-3 shadow-xs">
          <Network className="w-3.5 h-3.5 text-amber-600" />
          <span>CHAPTER 2 • THE CONNECTED NETWORK</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
          The Synchronized Transit Honeycomb
        </h3>
        <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
          Romania’s rail network spans national and private operators across 8 mainline magistrales. Beeline unifies all 7 passenger rail carriers and strategic bottleneck junctions into one synchronized hexagonal hive.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT / CENTER: Hexagonal Honeycomb Interactive Grid */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
          {/* Background Decorative SVG Honeycomb Lattice */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <HoneycombSvg size={400} />
          </div>

          <div
            data-testid="svg-honeycomb"
            className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center gap-3 py-4"
          >
            {/* Row 1: 3 National & Long-Distance Express Rail Hexagons */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {PROVIDERS.slice(0, 3).map((p) => (
                <HoneycombHexCell
                  key={p.id}
                  provider={p}
                  isSelected={selectedProvider.id === p.id}
                  isHovered={hoveredId === p.id}
                  onHover={(h) => setHoveredId(h ? p.id : null)}
                  onSelect={() => setSelectedProvider(p)}
                />
              ))}
            </div>

            {/* Row 2: 3 Private Regional & InterRegio Rail Hexagons (Offset) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 -mt-2">
              {PROVIDERS.slice(3, 6).map((p) => (
                <HoneycombHexCell
                  key={p.id}
                  provider={p}
                  isSelected={selectedProvider.id === p.id}
                  isHovered={hoveredId === p.id}
                  onHover={(h) => setHoveredId(h ? p.id : null)}
                  onSelect={() => setSelectedProvider(p)}
                />
              ))}
            </div>

            {/* Row 3: 3 Specialized Rail & Critical Junction Hub Hexagons */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 -mt-2">
              {PROVIDERS.slice(6, 9).map((p) => (
                <HoneycombHexCell
                  key={p.id}
                  provider={p}
                  isSelected={selectedProvider.id === p.id}
                  isHovered={hoveredId === p.id}
                  onHover={(h) => setHoveredId(h ? p.id : null)}
                  onSelect={() => setSelectedProvider(p)}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] font-semibold text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Intercity & Express Rail
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Regional Rail & Junctions
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Selected Provider Detail Inspector Chamber */}
        <div className="lg:col-span-5 w-full">
          <BaseCard
            variant="elevated"
            className="p-6 rounded-3xl border-2 border-amber-200/90 shadow-lg bg-white/95"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border mb-1.5 shadow-xs ${selectedProvider.badgeColor}`}
                >
                  {selectedProvider.badge}
                </span>
                <h4 className="text-2xl font-black text-stone-900">
                  {selectedProvider.name}
                </h4>
                <div className="text-xs text-stone-500 font-medium">
                  {selectedProvider.fullName}
                </div>
              </div>

              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: selectedProvider.accentColor }}
              >
                {selectedProvider.type === 'junction' ? (
                  <Network className="w-5 h-5" />
                ) : (
                  <Train className="w-5 h-5" />
                )}
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-stone-700">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="font-bold text-stone-900 block mb-0.5">Coverage & Corridors:</span>
                <span>{selectedProvider.coverage}</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="font-bold text-stone-900 block mb-0.5">Fleet & Rolling Stock:</span>
                <span>{selectedProvider.fleet}</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-1 text-amber-900 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Beeline Hive Synchronization Feature:</span>
                </div>
                <span className="text-amber-800 leading-relaxed font-medium">
                  {selectedProvider.syncFeature}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live Timetables Synced
              </span>
              <span>Click any hexagon to inspect</span>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>
  );
};

interface HoneycombHexCellProps {
  provider: TransitProviderInfo;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}

const HoneycombHexCell: React.FC<HoneycombHexCellProps> = ({
  provider,
  isSelected,
  isHovered,
  onHover,
  onSelect,
}) => {
  const isJunction = provider.type === 'junction';
  const isEmerald = provider.accentColor === '#059669';

  const fillGradient = !isEmerald
    ? isSelected
      ? 'from-amber-400 to-amber-600 text-stone-950 font-black'
      : isHovered
      ? 'from-amber-200 to-amber-300 text-stone-900 font-bold'
      : 'from-amber-50 to-amber-100 text-stone-800 font-bold'
    : isSelected
    ? 'from-emerald-400 to-emerald-600 text-stone-950 font-black'
    : isHovered
    ? 'from-emerald-200 to-emerald-300 text-stone-900 font-bold'
    : 'from-emerald-50 to-emerald-100 text-stone-800 font-bold';

  const borderColor = !isEmerald
    ? isSelected
      ? 'border-amber-600 shadow-amber-300/50'
      : 'border-amber-300'
    : isSelected
    ? 'border-emerald-600 shadow-emerald-300/50'
    : 'border-emerald-300';

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => {
        onHover(true);
        onSelect();
      }}
      onBlur={() => onHover(false)}
      aria-label={`Inspect ${provider.name}`}
      aria-pressed={isSelected}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gradient-to-br ${fillGradient} ${borderColor} ${
        isSelected
          ? 'scale-110 shadow-lg z-20'
          : isHovered
          ? 'scale-105 shadow-md z-10'
          : 'shadow-xs hover:shadow-sm'
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center mb-1">
        {isJunction ? (
          <Network className={`w-4 h-4 ${isSelected ? 'text-stone-950' : 'text-emerald-700'}`} />
        ) : (
          <Train
            className={`w-4 h-4 ${
              isSelected ? 'text-stone-950' : isEmerald ? 'text-emerald-700' : 'text-amber-700'
            }`}
          />
        )}
      </div>
      <span className="text-[11px] sm:text-xs text-center leading-tight tracking-tight line-clamp-2 px-1">
        {provider.name}
      </span>
      {isSelected && (
        <span className="w-1.5 h-1.5 rounded-full bg-stone-950 mt-1 animate-pulse" />
      )}
    </button>
  );
};

export default TransitHoneycombSection;
