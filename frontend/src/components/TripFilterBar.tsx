'use client';

import React from 'react';
import { Filter, RotateCcw, Zap, Coins, ShieldCheck, Sparkles, ArrowUpDown } from 'lucide-react';
import { TripFilterState, POPULAR_ROMANIAN_PROVIDERS } from '../services/tripBookingService';
import { TransitMode, CuratedPillar } from '../types/routePlan';
import BaseCard from './BaseCard';
import BaseButton from './BaseButton';

export interface TripFilterBarProps {
  filters: TripFilterState;
  onChange: (updated: TripFilterState) => void;
  onReset: () => void;
  activeCount: number;
}

const PILLARS: { id: 'ALL' | CuratedPillar; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ALL', label: 'All Trips', icon: Sparkles },
  { id: 'FASTEST', label: '⚡ Fastest Direct', icon: Zap },
  { id: 'BEST_VALUE', label: '💰 Best Value', icon: Coins },
  { id: 'MOST_RELIABLE', label: '🛡️ Most Reliable', icon: ShieldCheck },
];

const MODES: { id: TransitMode; label: string }[] = [
  { id: 'TRAIN', label: 'Trains' },
  { id: 'METRO', label: 'Metrorex' },
  { id: 'TRAM', label: 'Trams' },
  { id: 'BUS', label: 'Buses' },
];

const PRICE_TIERS = [
  { label: 'Any Price', max: undefined },
  { label: '< 50 LEI', max: 50 },
  { label: '< 70 LEI', max: 70 },
  { label: '< 100 LEI', max: 100 },
];

export const TripFilterBar: React.FC<TripFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  activeCount,
}) => {
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

  return (
    <BaseCard variant="elevated" className="p-4 md:p-5 mb-6 border border-amber-200/80 bg-white">
      {/* Top Header Row with Active Count and Reset */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-sm text-stone-900">Filters &amp; Sorting</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-stone-950">
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline font-medium">Sort by:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="departure">Departure Time</option>
              <option value="duration">Shortest Duration</option>
              <option value="price">Lowest Fare</option>
              <option value="risk">Most Reliable (Shield)</option>
            </select>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Curated Trifecta Pillar Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PILLARS.map((p) => {
            const isSelected = filters.pillar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange({ ...filters, pillar: p.id })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Transit Modes Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-stone-400 mr-1">Modes:</span>
          {MODES.map((m) => {
            const isSelected = filters.modes.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
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

        {/* Romanian Operators Multi-select Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-stone-400 mr-1">Operators:</span>
          {POPULAR_ROMANIAN_PROVIDERS.map((prov) => {
            const isSelected = filters.providers.includes(prov);
            return (
              <button
                key={prov}
                type="button"
                onClick={() => toggleProvider(prov)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
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

        {/* Price Tiers */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-stone-400 mr-1">Budget:</span>
          {PRICE_TIERS.map((tier) => {
            const isSelected = filters.maxPriceLei === tier.max;
            return (
              <button
                key={tier.label}
                type="button"
                onClick={() => onChange({ ...filters, maxPriceLei: tier.max })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
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
      </div>
    </BaseCard>
  );
};

export default TripFilterBar;
