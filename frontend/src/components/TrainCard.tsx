'use client';

import React from 'react';
import { Train, Clock, ShieldCheck, Leaf, Info, Check, Plus } from 'lucide-react';
import { TrainJourney } from '../types/train';
import { getLowestFare, formatCurrency, formatTimeOnly } from '../utils/trainFilters';
import { useTrip } from '../context/TripContext';
import BaseCard from './BaseCard';
import BaseButton from './BaseButton';
import BaseBadge from './BaseBadge';

export interface TrainCardProps {
  journey: TrainJourney;
  onPressDetails?: (journey: TrainJourney) => void;
}

export const TrainCard: React.FC<TrainCardProps> = ({ journey, onPressDetails }) => {
  const { isTrainInTrip, addTrainToTrip, removeTrainFromTrip, trips } = useTrip();
  const isSaved = isTrainInTrip(journey.id);
  const lowestPrice = getLowestFare(journey);
  const isCancelled = journey.status === 'CANCELLED';

  const hours = Math.floor(journey.durationMinutes / 60);
  const mins = journey.durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const getStatusBadge = () => {
    switch (journey.status) {
      case 'ON_TIME':
        return <BaseBadge variant="success">On Time</BaseBadge>;
      case 'DELAYED':
        return <BaseBadge variant="warning">+{journey.delayMinutes}m Delay</BaseBadge>;
      case 'BOARDING':
        return <BaseBadge variant="info">Boarding</BaseBadge>;
      case 'CANCELLED':
        return <BaseBadge variant="danger">Cancelled</BaseBadge>;
      default:
        return <BaseBadge variant="default">{journey.status}</BaseBadge>;
    }
  };

  const handleToggleTrip = () => {
    if (isSaved) {
      const match = trips.find((t) => t.journey.id === journey.id);
      if (match) removeTrainFromTrip(match.id);
    } else {
      addTrainToTrip(journey);
    }
  };

  return (
    <BaseCard variant="elevated" className="p-5 mb-4 border border-amber-100 bg-white">
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <span className="font-black text-base text-stone-900 tracking-tight mr-2">
            {journey.trainNumber}
          </span>
          <span className="text-xs font-semibold text-stone-500">{journey.operator}</span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        {/* Origin */}
        <div className="text-left">
          <span className="text-xl font-black text-stone-900">{formatTimeOnly(journey.departureTime)}</span>
          <div className="text-xs font-bold text-stone-700">{journey.origin.city}</div>
          <div className="text-[11px] text-stone-400">{journey.origin.name}</div>
        </div>

        {/* Duration line */}
        <div className="flex flex-col items-center px-2 flex-1">
          <span className="text-xs text-stone-400 font-semibold mb-1">{durationText}</span>
          <div className="w-full flex items-center gap-1">
            <div className="h-0.5 flex-1 bg-amber-200" />
            <span className="text-[11px] text-stone-500 font-medium px-2 py-0.5 rounded-full bg-stone-100">
              {journey.stops.length} stop{journey.stops.length !== 1 ? 's' : ''}
            </span>
            <div className="h-0.5 flex-1 bg-amber-200" />
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-700 font-medium">
            <Leaf className="w-3 h-3 text-emerald-600" />
            <span>-{Math.round((journey.carbonFootprintKg || 12) * 5)}kg CO₂</span>
          </div>
        </div>

        {/* Destination */}
        <div className="text-right">
          <span className="text-xl font-black text-stone-900">{formatTimeOnly(journey.arrivalTime)}</span>
          <div className="text-xs font-bold text-stone-700">{journey.destination.city}</div>
          <div className="text-[11px] text-stone-400">{journey.destination.name}</div>
        </div>
      </div>

      {/* Card Footer: Fares & Actions */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs text-stone-400 block font-medium">From</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-amber-600">{lowestPrice.toFixed(2)}</span>
            <span className="text-xs font-bold text-stone-500 uppercase">LEI</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onPressDetails && (
            <BaseButton
              variant="outline"
              size="sm"
              onClick={() => onPressDetails(journey)}
              leftIcon={<Info className="w-3.5 h-3.5" />}
            >
              Details
            </BaseButton>
          )}

          <BaseButton
            variant={isSaved ? 'success' : isCancelled ? 'outline' : 'primary'}
            size="sm"
            disabled={isCancelled}
            onClick={handleToggleTrip}
            leftIcon={isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          >
            {isSaved ? 'In Trip ✓' : isCancelled ? 'Cancelled' : '+ Plan'}
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  );
};

export default TrainCard;
