'use client';

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Leaf, 
  ArrowUpDown, 
  SlidersHorizontal, 
  ChevronDown,
  GitFork 
} from 'lucide-react';
import { TripFilterState, POPULAR_ROMANIAN_PROVIDERS } from '../services/tripBookingService';
import { TransitMode, CuratedPillar } from '../types/routePlan';

export interface TripFilterBarProps {
  filters: TripFilterState;
  onChange: (updated: TripFilterState) => void;
  onReset?: () => void;
  activeCount?: number;
}

const PRIMARY_PILLARS: { 
  id: 'ALL' | CuratedPillar; 
  label: string; 
  icon?: React.ComponentType<{ className?: string }>;
  activeClass: string;
  title?: string;
  ariaLabel?: string;
}[] = [
  { 
    id: 'ALL', 
    label: 'All Trips', 
    activeClass: 'bg-amber-500 text-stone-950 font-bold shadow-sm',
    title: 'Show all available train trips',
  },
  { 
    id: 'MOST_RELIABLE', 
    label: 'Queen Meli', 
    icon: ShieldCheck, 
    activeClass: 'bg-emerald-700 text-white font-bold shadow-sm',
    title: 'Queen Meli — Most Reliable & Protected Transfers',
    ariaLabel: 'Filter by Queen Meli (Most Reliable)',
  },
  { 
    id: 'FASTEST', 
    label: 'Queen Vira', 
    icon: Zap, 
    activeClass: 'bg-blue-600 text-white font-bold shadow-sm',
    title: 'Queen Vira — Fastest Express Routes',
    ariaLabel: 'Filter by Queen Vira (Fastest)',
  },
  { 
    id: 'BEST_VALUE', 
    label: 'Queen Flora', 
    icon: Leaf, 
    activeClass: 'bg-amber-500 text-stone-950 font-bold shadow-sm',
    title: 'Queen Flora — Best Value & Eco Fares',
    ariaLabel: 'Filter by Queen Flora (Best Value)',
  },
];

const MODES: { id: TransitMode; label: string }[] = [
  { id: 'TRAIN', label: 'Trains & Rail' },
];

const PRICE_TIERS = [
  { label: 'Any Price', max: undefined },
  { label: '< 50 LEI', max: 50 },
  { label: '< 70 LEI', max: 70 },
  { label: '< 100 LEI', max: 100 },
];

export const MAX_TRANSFERS_OPTIONS: {
  value: number | undefined;
  id: string;
  label: string;
}[] = [
  { value: undefined, id: 'ANY', label: 'Any / All' },
  { value: 0, id: '0', label: '0 (Direct only)' },
  { value: 1, id: '1', label: 'Max 1 transfer' },
  { value: 2, id: '2', label: 'Max 2 transfers' },
  { value: 3, id: '3', label: 'Max 3 transfers' },
];

export const TripFilterBar: React.FC<TripFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  activeCount,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const toggleMode = (mode: TransitMode) => {
    const exists = filters.modes.includes(mode);
    const updated = exists ? filters.modes.filter((m) => m !== mode) : [...filters.modes, mode];
    onChange({ ...filters, modes: updated });
  };

  const toggleProvider = (p: string) => {
    const exists = filters.providers.includes(p);
    const updated = exists ? filters.providers.filter((x) => x !== p) : [...filters.providers, p];
    onChange({ ...filters, providers: updated });
  };

  const activeSecondaryCount = useMemo(() => {
    let count = 0;
    if (filters.providers && filters.providers.length > 0) {
      count += filters.providers.length;
    }
    if (filters.maxPriceLei !== undefined) {
      count += 1;
    }
    if (filters.modes && filters.modes.length < 4) {
      count += 1;
    }
    return count;
  }, [filters.providers, filters.maxPriceLei, filters.modes]);

  const handleResetSecondary = () => {
    onChange({
      ...filters,
      providers: [],
      maxPriceLei: undefined,
      modes: ['TRAIN', 'METRO', 'TRAM', 'BUS'],
    });
  };

  return (
    <div className="w-full flex flex-col gap-2.5 mb-6">
      {/* Primary Floating Row (Always Visible - Single Compact Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Floating Island — Primary Pillar Filter Dock */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-white/85 backdrop-blur-md border border-[#E8D9BE]/80 shadow-[0_4px_16px_rgba(120,83,24,0.06)]">
          {PRIMARY_PILLARS.map((p) => {
            const isSelected = filters.pillar === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange({ ...filters, pillar: p.id })}
                title={p.title}
                aria-label={p.ariaLabel}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? p.activeClass
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF4E8] font-medium'
                }`}
              >
                {Icon && <Icon className="w-[13px] h-[13px] shrink-0" />}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Floating Islands — Transfers Dock + Sort Dock + "More filters" Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Max Transfers Floating Island */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-[#E8D9BE]/80 shadow-[0_4px_16px_rgba(120,83,24,0.06)]">
            <GitFork className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <select
              id="max-transfers-select"
              name="maxTransfers"
              data-testid="max-transfers-select"
              aria-label="Max transfers"
              value={filters.maxTransfers !== undefined ? String(filters.maxTransfers) : 'ANY'}
              onChange={(e) => {
                const val = e.target.value;
                const parsed =
                  val === 'ANY' || val === 'ALL' || val === ''
                    ? undefined
                    : Number(val);
                onChange({
                  ...filters,
                  maxTransfers: Number.isNaN(parsed) ? undefined : parsed,
                });
              }}
              className="bg-transparent border-0 text-xs font-semibold text-stone-800 outline-none focus:outline-none focus-visible:outline-none cursor-pointer pr-1"
            >
              {MAX_TRANSFERS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Floating Island */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-[#E8D9BE]/80 shadow-[0_4px_16px_rgba(120,83,24,0.06)]">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
              aria-label="Sort trips by"
              className="bg-transparent border-0 text-xs font-semibold text-stone-800 outline-none focus:outline-none focus-visible:outline-none cursor-pointer pr-1"
            >
              <option value="departure">Departure Time (00:00–23:59)</option>
              <option value="risk">Recommended / Safest</option>
              <option value="duration">Fastest</option>
              <option value="price">Lowest Price</option>
            </select>
          </div>

          {/* "More filters" Floating Island Button */}
          <button
            type="button"
            data-testid="toggle-more-filters"
            aria-expanded={isMoreOpen}
            aria-controls="trips-secondary-filters-island"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold backdrop-blur-md border shadow-[0_4px_16px_rgba(120,83,24,0.06)] transition-all cursor-pointer ${
              isMoreOpen || activeSecondaryCount > 0
                ? 'bg-amber-50/95 border-amber-300/90 text-amber-950'
                : 'bg-white/85 border-[#E8D9BE]/80 text-stone-700 hover:bg-[#FAF4E8]'
            }`}
          >
            <SlidersHorizontal className="w-[13px] h-[13px] shrink-0" />
            <span>More filters</span>
            {activeSecondaryCount > 0 && (
              <span
                data-testid="active-secondary-count-badge"
                className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold leading-4"
              >
                {activeSecondaryCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                isMoreOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Secondary Floating Island (Collapsed by Default) */}
      {isMoreOpen && (
        <div
          id="trips-secondary-filters-island"
          data-testid="more-filters-panel"
          className="p-4 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E8D9BE]/85 shadow-[0_10px_28px_rgba(120,83,24,0.08)] flex flex-col gap-3"
        >
          {/* Header row with Reset filters button when active */}
          <div className="flex items-center justify-between pb-1 border-b border-[#E8D9BE]/40">
            <span className="text-xs font-semibold text-stone-700">Additional Filters</span>
            {activeSecondaryCount > 0 && (
              <button
                type="button"
                data-testid="reset-filters"
                onClick={handleResetSecondary}
                className="text-xs text-amber-800 hover:text-amber-950 font-semibold cursor-pointer transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* 1. Operators */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-stone-500 mr-1">Operators:</span>
            {POPULAR_ROMANIAN_PROVIDERS.map((prov) => {
              const isSelected = filters.providers.includes(prov);
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => toggleProvider(prov)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {prov}
                </button>
              );
            })}
          </div>

          {/* 2. Budget */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-stone-500 mr-1">Budget:</span>
            {PRICE_TIERS.map((tier) => {
              const isSelected = filters.maxPriceLei === tier.max;
              return (
                <button
                  key={tier.label}
                  type="button"
                  onClick={() => onChange({ ...filters, maxPriceLei: tier.max })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                      : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>

          {/* 3. Modes */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-stone-500 mr-1">Modes:</span>
            {MODES.map((m) => {
              const isSelected = filters.modes.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMode(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                      : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripFilterBar;
