'use client';

import React from 'react';
import { X, Train, Clock, MapPin, Wifi, BatteryCharging, Coffee, Accessibility } from 'lucide-react';
import { TrainJourney, Amenity } from '../types/train';
import { formatTimeOnly } from '../utils/trainFilters';
import BaseButton from './BaseButton';
import BaseBadge from './BaseBadge';

export interface TrainDetailModalProps {
  journey: TrainJourney | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrainDetailModal: React.FC<TrainDetailModalProps> = ({ journey, isOpen, onClose }) => {
  if (!isOpen || !journey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-amber-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-stone-900">{journey.trainNumber}</span>
              <span className="text-xs text-stone-500 font-semibold">{journey.operator}</span>
            </div>
            <span className="text-xs text-amber-600 font-medium">{journey.operator} Service</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {/* Fares & Availability */}
          <div>
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Available Fare Classes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {journey.fares.map((fare) => (
                <div
                  key={fare.classType}
                  className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between"
                >
                  <span className="text-xs font-semibold text-stone-700">{fare.classType}</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-base text-amber-700">{fare.price.toFixed(2)} LEI</span>
                    <span className="text-[10px] text-stone-400">{fare.seatsAvailable} seats</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Onboard Amenities */}
          <div>
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Amenities</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {journey.amenities.map((am) => (
                <span
                  key={am}
                  className="px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-900 border border-amber-200 font-medium"
                >
                  {am}
                </span>
              ))}
            </div>
          </div>

          {/* Intermediate Stops */}
          <div>
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Stops &amp; Schedule
            </h4>
            <div className="space-y-2 border-l-2 border-amber-200 pl-3">
              {journey.stops.map((st, i) => (
                <div key={i} className="text-xs flex items-center justify-between text-stone-700">
                  <span className="font-medium">{st.station.name}</span>
                  <span className="text-stone-400">
                    {formatTimeOnly(st.scheduledDeparture || st.scheduledArrival || '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex justify-end">
          <BaseButton variant="outline" size="sm" onClick={onClose}>
            Close
          </BaseButton>
        </div>
      </div>
    </div>
  );
};

export default TrainDetailModal;
