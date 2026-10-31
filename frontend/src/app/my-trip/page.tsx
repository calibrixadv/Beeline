'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Trash2, 
  Download, 
  Leaf, 
  Clock, 
  Coins, 
  ArrowRight, 
  MapPin, 
  Train 
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { formatTimeOnly } from '../../utils/trainFilters';
import BaseCard from '../../components/BaseCard';
import BaseButton from '../../components/BaseButton';
import MascotBee from '../../components/MascotBee';

export default function MyTripPage() {
  const { 
    trips, 
    removeTrainFromTrip, 
    clearTrip, 
    totalCost, 
    totalDurationMinutes, 
    totalCo2Kg, 
    totalCo2SavedKg 
  } = useTrip();

  const hours = Math.floor(totalDurationMinutes / 60);
  const mins = totalDurationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trips, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `beeline-itinerary-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              My Trip Itinerary
            </h1>
            <p className="text-xs md:text-sm text-stone-500 mt-0.5">
              {trips.length} booked {trips.length === 1 ? 'journey' : 'journeys'} in your wallet.
            </p>
          </div>
        </div>

        {trips.length > 0 && (
          <div className="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              onClick={clearTrip}
              className="text-red-600 hover:bg-red-50"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear All
            </BaseButton>
          </div>
        )}
      </div>

      {trips.length === 0 ? (
        <BaseCard variant="outlined" className="p-12 text-center bg-white border-amber-200">
          <MascotBee name="honey" size="xl" />
          <h3 className="text-xl font-bold text-stone-900 mt-4">Your itinerary is empty</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto mt-2">
            Explore multi-modal journeys across Romania and book legs directly into your trip planner.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/trips">
              <BaseButton variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Trips
              </BaseButton>
            </Link>
            <Link href="/trains">
              <BaseButton variant="outline" size="md">
                Browse Train Timetable
              </BaseButton>
            </Link>
          </div>
        </BaseCard>
      ) : (
        <div className="space-y-6">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
              <Coins className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block">Total Cost</span>
                <span className="text-xl font-black text-amber-700">{totalCost.toFixed(2)} LEI</span>
                <span className="text-[11px] text-stone-400 block">approx. &euro;{(totalCost / 5.0).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide block">Total Transit Time</span>
                <span className="text-xl font-black text-blue-700">{durationText}</span>
                <span className="text-[11px] text-stone-400 block">{trips.length} active leg(s)</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
              <Leaf className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide block">CO₂ Saved</span>
                <span className="text-xl font-black text-emerald-700">-{totalCo2SavedKg} kg CO₂</span>
                <span className="text-[11px] text-stone-400 block">vs flight emission</span>
              </div>
            </div>
          </div>

          {/* Booked Journey Cards */}
          <div className="space-y-3">
            {trips.map((item) => {
              const j = item.journey;
              const fare = j.fares.find((f) => f.classType === item.selectedClass);
              const price = fare?.price || 0;

              return (
                <BaseCard
                  key={item.id}
                  variant="elevated"
                  className="p-5 border border-amber-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 mt-1">
                      <Train className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-stone-900">{j.trainNumber}</span>
                        <span className="text-xs font-semibold text-stone-500">{j.operator}</span>
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          {item.selectedClass}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-700">
                        <span>
                          {formatTimeOnly(j.departureTime)} <strong>{j.origin.name}</strong>
                        </span>
                        <span className="text-stone-400">➔</span>
                        <span>
                          {formatTimeOnly(j.arrivalTime)} <strong>{j.destination.name}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 mt-1 block">Travel Date: {item.travelDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <div className="text-left sm:text-right">
                      <span className="text-lg font-black text-amber-600">{price.toFixed(2)} LEI</span>
                      <span className="text-[11px] text-stone-400 block">&euro;{(price / 5.0).toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTrainFromTrip(item.id)}
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from itinerary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </BaseCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
