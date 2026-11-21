'use client';

import React from 'react';
import { X, ExternalLink, Check, Plus } from 'lucide-react';
import { TrainJourney } from '../types/train';
import { formatTimeOnly } from '../utils/trainFilters';
import { isTrainDeparted } from '../utils/departureTime';
import { buildOfficialTicketUrl, SAFE_EXTERNAL_LINK_ATTRS } from '../utils/officialTicketUrl';
import { formatCurrency } from '../utils/formatters';
import { useTrip } from '../context/TripContext';
import BaseButton from './BaseButton';

export interface TrainDetailModalProps {
  journey: TrainJourney | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrainDetailModal: React.FC<TrainDetailModalProps> = ({ journey, isOpen, onClose }) => {
  const { isTrainInTrip, addTrainToTrip, removeTrainFromTrip, trips } = useTrip();

  if (!isOpen || !journey) return null;

  const isSaved = isTrainInTrip(journey.id);
  const isCancelled = journey.status === 'CANCELLED';
  const departed = isTrainDeparted(journey.departureTime);

  const handleToggleTrip = () => {
    if (departed || isCancelled) return;
    if (isSaved) {
      const match = trips.find((t) => t.journey.id === journey.id);
      if (match) removeTrainFromTrip(match.id);
    } else {
      addTrainToTrip(journey);
    }
  };

  const trainUrl = buildOfficialTicketUrl({
    trainNumber: journey.trainNumber,
    travelDate: journey.departureTime ? journey.departureTime.slice(0, 10) : undefined,
    origin: journey.origin.name,
    destination: journey.destination.name,
    operator: journey.operator,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-amber-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-stone-900">{journey.trainNumber}</span>
              <span className="text-xs text-stone-500 font-semibold">{journey.operator}</span>
              {isTrainDeparted(journey.departureTime) && (
                <span
                  data-testid="train-modal-departed-badge"
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300"
                >
                  Departed
                </span>
              )}
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
                    <span className="font-bold text-base text-amber-700">{formatCurrency(fare.price)} LEI</span>
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
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <a
            href={trainUrl}
            {...SAFE_EXTERNAL_LINK_ATTRS}
            data-testid="modal-infofer-train-link"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
            title={`Vezi trenul ${journey.trainNumber} pe InfoFer`}
          >
            <span>Vezi trenul pe InfoFer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <BaseButton variant="outline" size="sm" onClick={onClose}>
              Close
            </BaseButton>

            <BaseButton
              variant={isSaved ? 'success' : isCancelled || departed ? 'outline' : 'primary'}
              size="sm"
              disabled={isCancelled || departed}
              aria-disabled={isCancelled || departed}
              onClick={handleToggleTrip}
              className={
                departed
                  ? 'bg-stone-100 text-stone-400 border-stone-300 cursor-not-allowed opacity-75'
                  : isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-xs'
              }
              leftIcon={
                isSaved ? (
                  <Check className="w-3.5 h-3.5" />
                ) : !departed && !isCancelled ? (
                  <Plus className="w-3.5 h-3.5" />
                ) : undefined
              }
            >
              {isSaved ? 'In Trip ✓' : isCancelled ? 'Cancelled' : departed ? 'Departed' : '+ Add to Itinerary'}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainDetailModal;
