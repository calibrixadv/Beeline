'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Train, Bus, Landmark, Sparkles } from 'lucide-react';
import { TransitLineSchedule, TransitMode } from '../../types/schedule';
import { transitScheduleService } from '../../services/transitScheduleService';
import { ROMANIAN_CITIES } from '../../data/romanianTransitTemplates';
import BaseCard from '../../components/BaseCard';
import BaseInput from '../../components/BaseInput';
import TransitScheduleCard from '../../components/TransitScheduleCard';
import MascotBee from '../../components/MascotBee';

const MODE_TABS: { id: 'ALL' | TransitMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ALL', label: 'All Modes', icon: Sparkles },
  { id: 'METRO', label: 'Metrorex', icon: Landmark },
  { id: 'TRAIN', label: 'Trains', icon: Train },
  { id: 'TRAM', label: 'Trams', icon: Bus },
  { id: 'BUS', label: 'Buses', icon: Bus },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<TransitLineSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMode, setSelectedMode] = useState<'ALL' | TransitMode>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await transitScheduleService.getSchedules({
          section: selectedMode === 'TRAIN' ? 'TRAIN' : 'URBAN',
          selectedCity: selectedCity === 'ALL' ? undefined : selectedCity,
          modes: selectedMode === 'ALL' ? undefined : [selectedMode],
          searchQuery: searchQuery.trim() || undefined,
        });
        setSchedules(data);
      } catch (err) {
        console.error('Failed to load transit schedules:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedMode, selectedCity, searchQuery]);

  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
            Romanian Transit Schedules
          </h1>
          <p className="text-xs md:text-sm text-stone-500 mt-1">
            Official line timetables and stop-by-stop frequencies across major cities.
          </p>
        </div>
        <MascotBee name="bumble" size="md" />
      </div>

      {/* Filter and Search Bar */}
      <BaseCard variant="elevated" className="p-4 md:p-5 mb-6 border border-amber-200/90 bg-white">
        {/* Search Input */}
        <BaseInput
          placeholder="Search line number (e.g. M2, 100, IR 1572), operator, or station..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          leftIcon={<Search className="w-4 h-4 text-amber-500" />}
        />

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 pt-4 flex-wrap">
          {MODE_TABS.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedMode(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Romanian Cities Filter */}
        <div className="flex items-center gap-1.5 pt-3 flex-wrap text-xs">
          <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            City:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCity('ALL')}
            className={`px-2.5 py-1 rounded-lg border font-medium ${
              selectedCity === 'ALL'
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
          >
            All Cities
          </button>
          {ROMANIAN_CITIES.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => setSelectedCity(city.name)}
              className={`px-2.5 py-1 rounded-lg border font-medium ${
                selectedCity === city.name
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                  : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </BaseCard>

      {/* Schedules List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-stone-500">
            Loading Romanian transit lines...
          </div>
        ) : schedules.length === 0 ? (
          <BaseCard variant="outlined" className="p-8 text-center bg-white border-amber-200">
            <MascotBee name="honey" size="lg" />
            <h3 className="text-base font-bold text-stone-800 mt-3">No transit lines found</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
              Try changing the city or clearing your search keywords.
            </p>
          </BaseCard>
        ) : (
          schedules.map((schedule) => (
            <TransitScheduleCard key={schedule.id} schedule={schedule} />
          ))
        )}
      </div>
    </div>
  );
}
