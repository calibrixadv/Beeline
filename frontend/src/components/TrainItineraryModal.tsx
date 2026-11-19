'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  Train, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react';
import { TrainItineraryResponse } from '../types/routePlan';
import { fetchTrainItinerary } from '../services/apiClient';
import { formatLocalTime, isOvernightRollover } from './RouteItineraryTimeline';
import BaseButton from './BaseButton';

export interface TrainItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainNumber: string;
  travelDate?: string;
}

export const TrainItineraryModal: React.FC<TrainItineraryModalProps> = ({
  isOpen,
  onClose,
  trainNumber,
  travelDate,
}) => {
  const [itinerary, setItinerary] = useState<TrainItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard Escape support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch full train itinerary when modal opens
  useEffect(() => {
    if (!isOpen || !trainNumber) {
      setItinerary(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTrainItinerary(trainNumber, travelDate)
      .then((data) => {
        if (isCancelled) return;
        setItinerary(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err?.message || `Could not load full route for ${trainNumber}`);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, trainNumber, travelDate]);

  if (!isOpen) return null;

  const durationHours = itinerary ? Math.floor(itinerary.totalDurationMinutes / 60) : 0;
  const durationMins = itinerary ? itinerary.totalDurationMinutes % 60 : 0;
  const durationFormatted =
    durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins} min`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="train-modal-title"
      data-testid="train-itinerary-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-amber-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="train-modal-title" className="text-base font-black text-stone-900 tracking-tight">
                  {itinerary?.trainNumber || trainNumber}
                </h3>
                {itinerary?.trainCategory && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    {itinerary.trainCategory}
                  </span>
                )}
                {itinerary?.operator && (
                  <span className="text-xs font-semibold text-stone-600 bg-white border border-stone-200 px-2 py-0.5 rounded shadow-2xs">
                    {itinerary.operator}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Service Date: <strong>{itinerary?.date || travelDate || 'Today'}</strong></span>
                <span className="text-stone-300">•</span>
                <span className="text-emerald-700 font-medium">Official CFR SA Route</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-train-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-500" data-testid="modal-loading-state">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Loading official timetable stops for {trainNumber}...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="py-8 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="text-xs">
                <p className="font-bold text-rose-900">Itinerary Lookup Unavailable</p>
                <p className="mt-1">{error}</p>
                <p className="mt-2 text-[11px] text-rose-700">
                  Please verify this train is scheduled in the active 2025-2026 / 2026-2027 timetable window.
                </p>
              </div>
            </div>
          )}

          {itinerary && !isLoading && (
            <>
              {/* Corridor Highlights Ribbon */}
              <div className="p-4 rounded-xl border border-amber-200 bg-linear-to-r from-amber-50/80 via-white to-amber-50/80">
                <div className="flex items-center justify-between gap-3 text-xs mb-3 flex-wrap">
                  <div>
                    <span className="text-[11px] text-stone-400 block font-medium">Physical Origin</span>
                    <strong className="text-stone-900 text-sm font-bold" data-testid="train-modal-origin">
                      {itinerary.fullTrainOrigin}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-400 px-3">
                    <span className="h-0.5 w-8 bg-amber-300" />
                    <Train className="w-4 h-4 text-amber-600" />
                    <span className="h-0.5 w-8 bg-amber-300" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-stone-400 block font-medium">Physical Terminus</span>
                    <strong className="text-stone-900 text-sm font-bold" data-testid="train-modal-destination">
                      {itinerary.fullTrainDestination}
                    </strong>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-100 text-center text-xs">
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-stone-400 block">Total Distance</span>
                    <strong className="text-stone-900 font-mono font-bold">
                      {itinerary.totalDistanceKm.toFixed(1)} km
                    </strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-stone-400 block">Total Journey</span>
                    <strong className="text-stone-900 font-bold">{durationFormatted}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-stone-400 block">Commercial Stops</span>
                    <strong className="text-stone-900 font-bold">
                      {itinerary.stops?.length || 0} stops
                    </strong>
                  </div>
                </div>
              </div>

              {/* Complete Stops Timeline */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
                  All Commercial Stops ({itinerary.stops?.length || 0})
                </h4>

                <div className="relative border-l-2 border-amber-300 ml-3 space-y-3.5 pb-2">
                  {itinerary.stops.map((stop, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === itinerary.stops.length - 1;
                    const rollover = isOvernightRollover(
                      stop.departureTime || stop.arrivalTime,
                      itinerary.date
                    );

                    const timeLabel = isFirst
                      ? formatLocalTime(stop.departureTime)
                      : isLast
                      ? formatLocalTime(stop.arrivalTime)
                      : stop.arrivalTime && stop.departureTime
                      ? `${formatLocalTime(stop.arrivalTime)} – ${formatLocalTime(stop.departureTime)}`
                      : formatLocalTime(stop.departureTime || stop.arrivalTime);

                    return (
                      <div key={stop.stopSequence || idx} className="relative pl-6 text-xs">
                        {/* Node marker */}
                        <div
                          className={`absolute -left-[7px] top-1 rounded-full border border-white shadow-xs ${
                            isFirst
                              ? 'w-3.5 h-3.5 bg-emerald-600 ring-2 ring-emerald-200'
                              : isLast
                              ? 'w-3.5 h-3.5 bg-stone-900 ring-2 ring-stone-300'
                              : 'w-2.5 h-2.5 bg-amber-400 mt-0.5'
                          }`}
                        />

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-mono ${
                                isFirst || isLast ? 'font-black text-stone-900' : 'font-semibold text-stone-600'
                              }`}
                            >
                              {timeLabel}
                            </span>
                            {rollover && (
                              <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                +1d
                              </span>
                            )}

                            <span
                              className={`font-bold ${
                                isFirst || isLast ? 'text-stone-950 text-xs' : 'text-stone-800 text-xs'
                              }`}
                            >
                              {stop.stationName}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded">
                              {stop.stationCode}
                            </span>

                            {stop.dwellMinutes > 0 && (
                              <span className="text-[10px] font-semibold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded-full">
                                {stop.dwellMinutes}m stop
                              </span>
                            )}

                            {stop.delayMinutes !== undefined &&
                              stop.delayMinutes !== null &&
                              stop.delayMinutes > 0 && (
                                <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded">
                                  +{stop.delayMinutes}m delay
                                </span>
                              )}
                          </div>

                          <span className="text-[11px] font-mono text-stone-400">
                            {stop.distanceFromOriginKm.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            Source: CFR SA XML Timetables &amp; InfoFer Live Overlays
          </span>
          <BaseButton variant="primary" size="sm" onClick={onClose} className="font-bold">
            Close
          </BaseButton>
        </div>
      </div>
    </div>
  );
};

export default TrainItineraryModal;
