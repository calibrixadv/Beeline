'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Train, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink
} from 'lucide-react';
import { TransitRoutePlan } from '../types/routePlan';

export interface RouteItineraryTimelineProps {
  plan: TransitRoutePlan;
  travelDate?: string;
  onOpenTrainModal?: (trainNumber: string) => void;
}

/**
 * Formats ISO 8601 timestamp to HH:mm local time and detects date rollover (+1d).
 */
export function formatLocalTime(isoString?: string | null): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(11, 16) || '--:--';
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoString.slice(11, 16) || '--:--';
  }
}

export function isOvernightRollover(isoString?: string | null, baseDateStr?: string | null): boolean {
  if (!isoString || !baseDateStr) return false;
  try {
    const stopDate = isoString.slice(0, 10);
    const baseDate = baseDateStr.slice(0, 10);
    return stopDate > baseDate;
  } catch {
    return false;
  }
}

export const RouteItineraryTimeline: React.FC<RouteItineraryTimelineProps> = ({
  plan,
  travelDate,
  onOpenTrainModal,
}) => {
  // Track open/collapsed intermediate stops state per leg index
  const [expandedLegs, setExpandedLegs] = useState<Record<number, boolean>>({});

  const toggleLegStops = (legIndex: number) => {
    setExpandedLegs((prev) => ({ ...prev, [legIndex]: !prev[legIndex] }));
  };

  const baseDate = travelDate || plan.date || plan.departureTime?.slice(0, 10);
  const transfers = plan.transfers || [];

  return (
    <div className="space-y-4 pt-2" data-testid="route-itinerary-timeline">
      {plan.legs.map((leg, legIndex) => {
        const isStopsExpanded = !!expandedLegs[legIndex];
        const stops = leg.stops || [];
        const intermediateCount =
          leg.intermediateStopCount !== undefined
            ? leg.intermediateStopCount
            : Math.max(0, stops.length - 2);

        const trainNumber = leg.names.lineCode || leg.names.vehicleIdentifier || 'Train';
        const operatorName = leg.names.operatorName || leg.names.operatorShortName || 'CFR Călători';
        const directionDest = leg.fullTrainDestination || leg.names.destinationName;
        const legDist = leg.distanceKm !== undefined && leg.distanceKm !== null ? leg.distanceKm : null;

        // Find transfer detail following this leg (if any)
        const transferAfter = transfers.find((t) => t.transferIndex === legIndex);

        return (
          <React.Fragment key={leg.id || `leg-${legIndex}`}>
            {/* Rail Leg Card */}
            <div className="rounded-xl border border-amber-200/90 bg-stone-50/70 p-4 shadow-xs">
              {/* Leg Header Row */}
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-stone-200/70 pb-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Clickable Train Badge */}
                  <button
                    type="button"
                    data-testid="train-itinerary-trigger"
                    onClick={() => onOpenTrainModal?.(trainNumber)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-2xs cursor-pointer group"
                    title={`Click to view full end-to-end run for ${trainNumber}`}
                  >
                    <Train className="w-3.5 h-3.5 text-stone-900 group-hover:scale-110 transition-transform" />
                    <span>{trainNumber}</span>
                    <ExternalLink className="w-3 h-3 text-stone-800 opacity-60 group-hover:opacity-100" />
                  </button>

                  {/* Operator Badge */}
                  <span className="text-[11px] font-bold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded-md shadow-2xs">
                    {operatorName}
                  </span>

                  {/* Direction */}
                  {directionDest && (
                    <span className="text-[11px] text-stone-600 font-medium">
                      Direction: <strong className="text-stone-800">{directionDest}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {legDist !== null && (
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-md">
                      {legDist.toFixed(1)} km
                    </span>
                  )}

                  {/* Collapsible Stops Toggle Pill */}
                  {intermediateCount > 0 && (
                    <button
                      type="button"
                      data-testid={`toggle-stops-leg-${legIndex}`}
                      onClick={() => toggleLegStops(legIndex)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200/90 border border-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>
                        {isStopsExpanded
                          ? `Hide ${intermediateCount} intermediate stops`
                          : `Show ${intermediateCount} intermediate stops`}
                      </span>
                      {isStopsExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Endpoint Highlights (Boarding & Alighting / Transfer Out) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                <div className="flex items-center gap-2 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                  <span>
                    Departs <strong>{formatLocalTime(leg.timings.scheduledDeparture)}</strong> from{' '}
                    <strong className="text-stone-900">{leg.names.originName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-700 sm:justify-end">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200 shrink-0" />
                  <span>
                    Arrives <strong>{formatLocalTime(leg.timings.scheduledArrival)}</strong> at{' '}
                    <strong className="text-stone-900">{leg.names.destinationName}</strong>
                  </span>
                </div>
              </div>

              {/* Full Vertical Rail Timeline (Rendered when expanded or when only boarding/alighting) */}
              {isStopsExpanded && stops.length > 0 && (
                <div
                  data-testid={`leg-stops-list-${legIndex}`}
                  className="mt-3 pt-3 border-t border-dashed border-stone-200 pl-3 pr-1"
                >
                  <div className="relative border-l-2 border-amber-300 ml-2 space-y-3 pb-1">
                    {stops.map((stop, sIdx) => {
                      const isBoarding = stop.stopType === 'BOARDING';
                      const isAlighting = stop.stopType === 'ALIGHTING';
                      const isTransfer = stop.stopType === 'TRANSFER';

                      const rolloverDep = isOvernightRollover(stop.departureTime, baseDate);
                      const rolloverArr = isOvernightRollover(stop.arrivalTime, baseDate);
                      const isRollover = rolloverDep || rolloverArr;

                      const timeDisplay = isBoarding
                        ? formatLocalTime(stop.departureTime)
                        : isAlighting
                        ? formatLocalTime(stop.arrivalTime)
                        : stop.arrivalTime && stop.departureTime
                        ? `${formatLocalTime(stop.arrivalTime)} – ${formatLocalTime(stop.departureTime)}`
                        : formatLocalTime(stop.departureTime || stop.arrivalTime);

                      return (
                        <div key={stop.stopSequence || sIdx} className="relative pl-6 text-xs">
                          {/* Node Bullet Marker */}
                          <div
                            className={`absolute -left-[7px] top-1 rounded-full border border-white shadow-xs ${
                              isBoarding
                                ? 'w-3.5 h-3.5 bg-emerald-600 ring-2 ring-emerald-200'
                                : isAlighting
                                ? 'w-3.5 h-3.5 bg-stone-900 ring-2 ring-stone-300'
                                : isTransfer
                                ? 'w-3.5 h-3.5 bg-amber-500 ring-2 ring-amber-300'
                                : 'w-2.5 h-2.5 bg-amber-400 mt-0.5'
                            }`}
                          />

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Time */}
                              <span
                                className={`font-mono text-xs ${
                                  isBoarding || isAlighting
                                    ? 'font-black text-stone-900'
                                    : 'font-semibold text-stone-600'
                                }`}
                              >
                                {timeDisplay}
                              </span>
                              {isRollover && (
                                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                  +1d
                                </span>
                              )}

                              {/* Station Name & Code */}
                              <span
                                className={`text-xs ${
                                  isBoarding || isAlighting || isTransfer
                                    ? 'font-bold text-stone-950'
                                    : 'text-stone-700 font-medium'
                                }`}
                              >
                                {stop.stationName}
                              </span>
                              <span className="text-[10px] font-mono text-stone-400 bg-stone-200/70 px-1 py-0.2 rounded">
                                {stop.stationCode}
                              </span>

                              {/* Dwell Minutes Pill */}
                              {stop.dwellMinutes > 0 && (
                                <span className="text-[10px] font-semibold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded-full">
                                  {stop.dwellMinutes}m stop
                                </span>
                              )}

                              {/* Live Delay Overlay */}
                              {stop.delayMinutes !== undefined &&
                                stop.delayMinutes !== null &&
                                stop.delayMinutes > 0 && (
                                  <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded">
                                    +{stop.delayMinutes}m delay
                                  </span>
                                )}

                              {/* Stop Type Tag */}
                              {isTransfer && (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-200 border border-amber-300 px-1.5 py-0.2 rounded">
                                  Transfer Hub
                                </span>
                              )}
                            </div>

                            {/* Cumulative Distance */}
                            <div className="text-[11px] font-mono text-stone-400">
                              {stop.distanceFromOriginKm.toFixed(1)} km
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Transfer Shield Card (rendered between consecutive legs) */}
            {transferAfter && (
              <div
                data-testid={`transfer-card-${transferAfter.transferIndex}`}
                className="my-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    {transferAfter.bufferStatus === 'SAFE' ? (
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    ) : transferAfter.bufferStatus === 'TIGHT' ? (
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-stone-900">
                          {transferAfter.stationName} ({transferAfter.stationCode})
                        </span>
                        <span className="text-xs font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full">
                          {transferAfter.waitMinutes} min transfer
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Handoff: <strong className="text-stone-800">{transferAfter.fromLineCode}</strong> ({transferAfter.fromOperator}){' '}
                        ➔ <strong className="text-stone-800">{transferAfter.toLineCode}</strong> ({transferAfter.toOperator})
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & ML Connection Guarantee */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {transferAfter.bufferStatus === 'SAFE' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Safe Transfer
                      </span>
                    ) : transferAfter.bufferStatus === 'TIGHT' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200 border border-amber-400 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Tight Transfer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Risky Transfer
                      </span>
                    )}

                    {transferAfter.missedConnectionProbability !== undefined && (
                      <span className="text-xs font-bold text-stone-700 bg-white border border-amber-200 px-2 py-0.5 rounded-full">
                        🛡️ {Math.max(0, Math.min(100, Math.round((1 - transferAfter.missedConnectionProbability) * 100)))}% guarantee
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default RouteItineraryTimeline;
