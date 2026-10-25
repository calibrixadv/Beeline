'use client';

import React, { useState } from 'react';
import { 
  Train, 
  Bus, 
  Landmark, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  MapPin 
} from 'lucide-react';
import { TransitLineSchedule, TransitMode } from '../types/schedule';
import BaseCard from './BaseCard';
import BaseBadge from './BaseBadge';

export interface TransitScheduleCardProps {
  schedule: TransitLineSchedule;
}

export const TransitScheduleCard: React.FC<TransitScheduleCardProps> = ({ schedule }) => {
  const [showStops, setShowStops] = useState(false);

  const getModeIcon = (mode: TransitMode) => {
    switch (mode) {
      case 'METRO':
        return Landmark;
      case 'TRAIN':
        return Train;
      case 'TRAM':
      case 'BUS':
        return Bus;
      default:
        return Train;
    }
  };

  const Icon = getModeIcon(schedule.mode);

  return (
    <BaseCard variant="elevated" className="p-5 mb-4 border border-amber-100/90 bg-white">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-stone-900">{schedule.lineCode}</span>
              <span className="text-xs font-semibold text-stone-500">{schedule.provider.shortName}</span>
            </div>
            <span className="text-xs text-amber-700 font-medium">{schedule.city} • {schedule.lineName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BaseBadge variant="honey" size="sm">
            {schedule.mode}
          </BaseBadge>
          {schedule.frequencyDescription && (
            <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{schedule.frequencyDescription}</span>
            </div>
          )}
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            {schedule.fareLei.toFixed(2)} LEI
          </span>
        </div>
      </div>

      {/* Terminal Stops */}
      <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center justify-between text-xs text-stone-700">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-semibold">{schedule.origin}</span>
        </div>
        <span className="text-stone-400 mx-2">➔</span>
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold">{schedule.destination}</span>
        </div>
      </div>

      {/* Next Departures Pills */}
      {schedule.nextDepartures && schedule.nextDepartures.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-stone-400">Next Departures:</span>
          {schedule.nextDepartures.slice(0, 4).map((dep, idx) => (
            <span
              key={idx}
              className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800"
            >
              {dep.time} {dep.minutesUntil > 0 && <span className="text-amber-600">({dep.minutesUntil}m)</span>}
            </span>
          ))}
        </div>
      )}

      {/* Intermediate Stops Expander */}
      {schedule.viaStops && schedule.viaStops.length > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setShowStops(!showStops)}
            className="flex items-center justify-between w-full text-xs font-medium text-stone-500 hover:text-amber-700 transition-colors"
          >
            <span>{showStops ? 'Hide stops' : `View intermediate stops (${schedule.viaStops.length})`}</span>
            {showStops ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showStops && (
            <div className="mt-2.5 pl-3 border-l-2 border-amber-300 space-y-1 text-xs text-stone-600">
              {schedule.viaStops.map((stop, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{stop}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </BaseCard>
  );
};

export default TransitScheduleCard;
