'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, MapPin, Navigation, Train, Bus, Landmark, Search, Sparkles } from 'lucide-react';
import BaseCard from './BaseCard';
import BaseInput from './BaseInput';
import BaseButton from './BaseButton';
import MascotBee from './MascotBee';

export const POPULAR_CORRIDORS = [
  { origin: 'București Nord', destination: 'Brașov', label: 'București ⇄ Brașov' },
  { origin: 'Galați', destination: 'București Nord', label: 'Galați ⇄ București' },
  { origin: 'Cluj-Napoca', destination: 'Timișoara Nord', label: 'Cluj ⇄ Timișoara' },
];

export const RouteFinderCard: React.FC = () => {
  const router = useRouter();
  const [origin, setOrigin] = useState<string>('Galați');
  const [destination, setDestination] = useState<string>('București Nord');
  const [selectedMode, setSelectedMode] = useState<'ALL' | 'TRAIN' | 'METRO' | 'BUS'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setError(null);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!origin.trim()) {
      setError('Please provide a departure origin station or city');
      return;
    }
    if (!destination.trim()) {
      setError('Please provide an arrival destination station or city');
      return;
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError('Origin and destination cannot be identical');
      return;
    }
    setError(null);

    const queryParams = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
    });
    router.push(`/trips?${queryParams.toString()}`);
  };

  return (
    <BaseCard variant="elevated" className="p-6 md:p-8 max-w-2xl mx-auto shadow-xl border border-amber-200/80">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
            <Navigation className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Plan Your Journey</h2>
            <p className="text-xs text-stone-500">Multi-modal corridors across Romanian transit</p>
          </div>
        </div>
        <MascotBee name="barnaby" size="sm" />
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Origin & Destination Inputs with Swap Button */}
        <div className="relative flex flex-col md:flex-row items-center gap-3">
          <div className="w-full">
            <BaseInput
              label="ORIGIN"
              placeholder="e.g. Galați, București Nord..."
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onClear={() => setOrigin('')}
              leftIcon={<MapPin className="w-4 h-4 text-amber-500" />}
            />
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Origin and Destination"
            className="md:mt-5 p-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeftRight className="w-4 h-4 rotate-90 md:rotate-0" />
          </button>

          <div className="w-full">
            <BaseInput
              label="DESTINATION"
              placeholder="e.g. Brașov, Cluj-Napoca..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onClear={() => setDestination('')}
              leftIcon={<MapPin className="w-4 h-4 text-amber-600" />}
            />
          </div>
        </div>

        {error && <div className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</div>}

        {/* Transport Mode Chips */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs font-semibold text-stone-500 mr-1">Modes:</span>
          {[
            { id: 'ALL', label: 'All Modes', icon: Sparkles },
            { id: 'TRAIN', label: 'Trains', icon: Train },
            { id: 'METRO', label: 'Metro', icon: Landmark },
            { id: 'BUS', label: 'Buses & Trams', icon: Bus },
          ].map(({ id, label, icon: Icon }) => {
            const isSelected = selectedMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedMode(id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Corridor Chips */}
        <div className="flex items-center gap-1.5 pt-2 flex-wrap">
          <span className="text-xs text-stone-400 mr-1">Popular:</span>
          {POPULAR_CORRIDORS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                setOrigin(c.origin);
                setDestination(c.destination);
                setError(null);
              }}
              className="px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Submission */}
        <div className="pt-2">
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 shadow-md py-3"
            leftIcon={<Search className="w-4 h-4" />}
          >
            Explore Trips &amp; Fares
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  );
};

export default RouteFinderCard;
