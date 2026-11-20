'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export interface RailOperator {
  id: string;
  shortName: string;
  name: string;
  dailyTrains: number;
  routes: number;
}

export const RAIL_OPERATORS: RailOperator[] = [
  { id: 'cfr', shortName: 'CFR', name: 'CFR Călători', dailyTrains: 1256, routes: 479 },
  { id: 'tfc', shortName: 'TFC', name: 'Transferoviar Călători', dailyTrains: 303, routes: 62 },
  { id: 'regio', shortName: 'Regio', name: 'Regio Călători', dailyTrains: 273, routes: 81 },
  { id: 'interregional', shortName: 'Interregional', name: 'Interregional Călători', dailyTrains: 216, routes: 59 },
  { id: 'astra', shortName: 'Astra', name: 'Astra Trans Carpatic', dailyTrains: 21, routes: 12 },
  { id: 'ferotrafic', shortName: 'Ferotrafic', name: 'Ferotrafic TFI', dailyTrains: 18, routes: 10 },
  { id: 'softrans', shortName: 'Softrans', name: 'Softrans', dailyTrains: 16, routes: 6 },
];

export const TOTAL_XML_DAILY_TRAINS = 2103;
export const TOTAL_XML_CORRIDOR_ROUTES = 709;
export const PROVIDERS = RAIL_OPERATORS;

export interface TransitHoneycombSectionProps {
  className?: string;
  [key: string]: unknown;
}

interface HexPosition {
  id: string;
  cx: number;
  cy: number;
}

// Mathematically symmetric flat-top hexagonal tiling
// Center: CFR at (170, 170). Neighbors at D = 90 spaced at 60° intervals.
// TFC (top), Regio (top-right), Softrans (bottom-right), Ferotrafic (bottom), Astra (bottom-left), Interregional (top-left)
const HEX_POSITIONS: Record<string, HexPosition> = {
  cfr: { id: 'cfr', cx: 170, cy: 170 },
  tfc: { id: 'tfc', cx: 170, cy: 80 },
  regio: { id: 'regio', cx: 247.94, cy: 125 },
  softrans: { id: 'softrans', cx: 247.94, cy: 215 },
  ferotrafic: { id: 'ferotrafic', cx: 170, cy: 260 },
  astra: { id: 'astra', cx: 92.06, cy: 215 },
  interregional: { id: 'interregional', cx: 92.06, cy: 125 },
};

const HEX_SLOTS: Array<{ cx: number; cy: number }> = [
  { cx: 170, cy: 170 },
  { cx: 170, cy: 80 },
  { cx: 247.94, cy: 125 },
  { cx: 247.94, cy: 215 },
  { cx: 170, cy: 260 },
  { cx: 92.06, cy: 215 },
  { cx: 92.06, cy: 125 },
];

function getFlatTopHexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    const x = (cx + r * Math.cos(angle)).toFixed(2);
    const y = (cy + r * Math.sin(angle)).toFixed(2);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export const TransitHoneycombSection: React.FC<TransitHoneycombSectionProps> = ({ className = '' }) => {
  const [operators, setOperators] = useState<RailOperator[]>(RAIL_OPERATORS);
  const [totalDailyTrains, setTotalDailyTrains] = useState<number>(TOTAL_XML_DAILY_TRAINS);
  const [totalRoutes, setTotalRoutes] = useState<number>(TOTAL_XML_CORRIDOR_ROUTES);
  const [selectedId, setSelectedId] = useState<string>('cfr');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getOperatorsSummary()
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.operators) || data.operators.length === 0) {
          return;
        }
        setOperators(data.operators);
        if (typeof data.totalDailyTrains === 'number') {
          setTotalDailyTrains(data.totalDailyTrains);
        }
        if (typeof data.totalRoutes === 'number') {
          setTotalRoutes(data.totalRoutes);
        }
        setSelectedId((prev) => {
          if (data.operators.some((o) => o.id === prev)) {
            return prev;
          }
          return data.operators[0].id;
        });
      })
      .catch(() => {
        // Safe offline / test fallback
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const maxDailyTrains = Math.max(...operators.map((o) => o.dailyTrains), 1);
  const topOperators = operators.slice(0, 7);

  return (
    <section
      id="tour-providers"
      aria-label="Romanian Rail Network"
      className={`relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 ${className}`}
    >
      {/* Minimal Header (Top-Left) */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E1B18]">
          Romanian Rail Network
        </h2>
        <div className="text-sm sm:text-base text-[#78716C] tabular-nums flex items-center gap-3 mt-1.5">
          <span>{totalDailyTrains.toLocaleString()} trains/day</span>
          <span className="h-4 w-px bg-[#D6C7AE]" aria-hidden="true" />
          <span>{totalRoutes.toLocaleString()} routes</span>
        </div>
      </div>

      {/* Asymmetric Two-Column Layout */}
      <div className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column (lg:col-span-5) — Open 7-Cell Interlocking Honeycomb */}
        <div
          data-testid="svg-honeycomb"
          className="relative lg:col-span-5 flex items-center justify-center p-2"
        >
          {/* Soft radial warm amber aura directly behind the cluster */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.16) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <svg
            viewBox="0 0 340 340"
            className="w-full max-w-[340px] aspect-square overflow-visible"
            aria-label="Interlocking rail operator honeycomb"
          >
            {topOperators.map((op, idx) => {
              const pos =
                idx === 0
                  ? { id: op.id, cx: 170, cy: 170 }
                  : HEX_POSITIONS[op.id] || { id: op.id, ...(HEX_SLOTS[idx] || { cx: 170, cy: 170 }) };
              if (!pos) return null;
              const isSelected = selectedId === op.id;
              const isHovered = hoveredId === op.id;
              const points = getFlatTopHexPoints(pos.cx, pos.cy, 48);

              return (
                <g
                  key={op.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={op.name}
                  onClick={() => setSelectedId(op.id)}
                  onMouseEnter={() => {
                    setHoveredId(op.id);
                    setSelectedId(op.id);
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setSelectedId(op.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(op.id);
                    }
                  }}
                  className="cursor-pointer outline-none focus:outline-none focus-visible:filter focus-visible:drop-shadow-[0_0_8px_rgba(217,119,6,0.6)] transition-all duration-200 motion-reduce:transition-none"
                >
                  <polygon
                    points={points}
                    fill={isSelected ? '#F59E0B' : isHovered ? '#FEF3C7' : '#FAF3E4'}
                    stroke={isSelected ? '#D97706' : '#E5D5B7'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    className="transition-colors duration-200 motion-reduce:transition-none"
                  />
                  <text
                    x={pos.cx}
                    y={pos.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isSelected ? '#1E1B18' : '#3F3A34'}
                    className={`select-none pointer-events-none transition-colors duration-200 motion-reduce:transition-none ${
                      isSelected ? 'font-bold' : 'font-medium'
                    }`}
                    style={{
                      fontSize: op.shortName.length > 8 ? '10px' : '13px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {op.shortName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Column (lg:col-span-7) — Cozy Rail Ledger */}
        <div className="lg:col-span-7">
          <div className="divide-y divide-[#F3E8D2] border-y border-[#F3E8D2]">
            {operators.map((op) => {
              const isSelected = selectedId === op.id;
              const trainPct = (op.dailyTrains / maxDailyTrains) * 100;

              return (
                <button
                  key={op.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(op.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors duration-200 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/40 motion-reduce:transition-none ${
                    isSelected
                      ? 'bg-[#FAF4E8]/90 border-l-[3px] border-l-[#D97706]'
                      : 'hover:bg-[#FAF4E8]/55'
                  }`}
                >
                  {isSelected ? (
                    <div>
                      {/* Active Top Line */}
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full bg-[#D97706] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-[15px] font-semibold text-[#1E1B18] truncate">
                            {op.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-[#1E1B18] whitespace-nowrap shrink-0">
                          {op.dailyTrains.toLocaleString()} / day
                        </span>
                      </div>

                      {/* Active Full-Row Proportional Golden Bar */}
                      <div className="w-full mt-2">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-300 motion-reduce:transition-none"
                          style={{
                            width: `${trainPct}%`,
                            minWidth: '8px',
                          }}
                        />
                      </div>

                      {/* Active Expanded Factual Sub-line */}
                      <div className="text-xs sm:text-sm text-[#78716C] tabular-nums mt-1.5">
                        {op.routes} routes
                      </div>
                    </div>
                  ) : (
                    /* Inactive Row: Single horizontal flex line */
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="text-[15px] font-medium text-[#1E1B18] shrink-0 min-w-[140px] sm:min-w-[170px]">
                        {op.name}
                      </span>
                      <div className="flex-1 mx-2 sm:mx-4 flex items-center">
                        <div
                          className="h-1.5 rounded-full bg-[#D97706]/80 transition-all duration-300 motion-reduce:transition-none"
                          style={{
                            width: `${trainPct}%`,
                            minWidth: '6px',
                          }}
                        />
                      </div>
                      <span className="text-sm tabular-nums text-[#57534E] whitespace-nowrap shrink-0">
                        {op.dailyTrains.toLocaleString()} / day
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransitHoneycombSection;
