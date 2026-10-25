'use client';

import React, { useState, useMemo } from 'react';
import { Search, Train, Sparkles, Filter } from 'lucide-react';
import { SAMPLE_TRAINS } from '../../data/sampleTrains';
import { TrainJourney, TrainStatus } from '../../types/train';
import { filterAndSortTrains } from '../../utils/trainFilters';
import BaseCard from '../../components/BaseCard';
import BaseInput from '../../components/BaseInput';
import TrainCard from '../../components/TrainCard';
import TrainDetailModal from '../../components/TrainDetailModal';
import MascotBee from '../../components/MascotBee';

const STATUS_FILTERS: { id: 'ALL' | TrainStatus; label: string }[] = [
  { id: 'ALL', label: 'All Trains' },
  { id: 'ON_TIME', label: 'On Time' },
  { id: 'DELAYED', label: 'Delayed' },
  { id: 'BOARDING', label: 'Boarding' },
];

export default function TrainsPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrainStatus>('ALL');
  const [selectedJourney, setSelectedJourney] = useState<TrainJourney | null>(null);

  const displayedTrains = useMemo(() => {
    return filterAndSortTrains(SAMPLE_TRAINS, {
      searchQuery,
      statusFilter,
      operatorFilter: 'ALL',
      sortBy: 'departure',
      sortOrder: 'asc',
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
            Rail Timetable &amp; Fares
          </h1>
          <p className="text-xs md:text-sm text-stone-500 mt-1">
            Real-time statuses, seat availability, and multi-tier fares across Romanian operators.
          </p>
        </div>
        <MascotBee name="barnaby" size="md" />
      </div>

      {/* Search & Status Filters */}
      <BaseCard variant="elevated" className="p-4 md:p-5 mb-6 border border-amber-200/90 bg-white">
        <BaseInput
          placeholder="Search by train number, operator (CFR, Astra), or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          leftIcon={<Search className="w-4 h-4 text-amber-500" />}
        />

        <div className="flex items-center gap-1.5 pt-3 flex-wrap">
          <span className="text-xs text-stone-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            Status:
          </span>
          {STATUS_FILTERS.map((f) => {
            const isSelected = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </BaseCard>

      {/* Trains List */}
      <div className="space-y-4">
        {displayedTrains.length === 0 ? (
          <BaseCard variant="outlined" className="p-8 text-center bg-white border-amber-200">
            <MascotBee name="honey" size="lg" />
            <h3 className="text-base font-bold text-stone-800 mt-3">No trains found</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
              Try adjusting your query or resetting your status filter.
            </p>
          </BaseCard>
        ) : (
          displayedTrains.map((journey) => (
            <TrainCard
              key={journey.id}
              journey={journey}
              onPressDetails={(j) => setSelectedJourney(j)}
            />
          ))
        )}
      </div>

      {/* Train Details Modal */}
      <TrainDetailModal
        journey={selectedJourney}
        isOpen={Boolean(selectedJourney)}
        onClose={() => setSelectedJourney(null)}
      />
    </div>
  );
}
