'use client';

import React, { useState } from 'react';
import { 
  Train, 
  Bus, 
  Landmark, 
  Footprints, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  Clock 
} from 'lucide-react';
import { TransitRoutePlan, CuratedPillar } from '../types/routePlan';
import BaseCard from './BaseCard';
import BaseButton from './BaseButton';
import MascotBee from './MascotBee';

export interface BookingTripCardProps {
  plan: TransitRoutePlan;
  onBookTrip?: (plan: TransitRoutePlan) => void;
  onRemoveTrip?: (planId: string) => void;
  isBooked?: boolean;
  defaultExpanded?: boolean;
}

export function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(11, 16) || '--:--';
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoString.slice(11, 16) || '--:--';
  }
}

export function getTransitModeIcon(mode: string) {
  switch (mode) {
    case 'TRAIN':
      return Train;
    case 'METRO':
      return Landmark;
    case 'TRAM':
    case 'BUS':
      return Bus;
    case 'WALK':
      return Footprints;
    default:
      return Train;
  }
}

export const BookingTripCard: React.FC<BookingTripCardProps> = ({
  plan,
  onBookTrip,
  onRemoveTrip,
  isBooked = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});

  const toggleStops = (legId: string) => {
    setExpandedStops((prev) => ({ ...prev, [legId]: !prev[legId] }));
  };

  const hours = Math.floor(plan.totalDurationMinutes / 60);
  const mins = plan.totalDurationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  const originStation = plan.legs[0]?.names.originName || 'Origin';
  const destStation = plan.legs[plan.legs.length - 1]?.names.destinationName || 'Destination';

  // Pillar badge configuration
  const pillarInfo = (() => {
    switch (plan.curatedPillar) {
      case 'FASTEST':
        return { label: '⚡ FASTEST', mascot: 'barnaby' as const, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'BEST_VALUE':
        return { label: '💰 BEST VALUE', mascot: 'honey' as const, bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      case 'MOST_RELIABLE':
        return { label: '🛡️ RELIABLE', mascot: 'bumble' as const, bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'ECO_HERO':
        return { label: '🌿 ECO HERO', mascot: 'honey' as const, bg: 'bg-teal-50 text-teal-800 border-teal-300' };
      default:
        return null;
    }
  })();

  const shield = plan.riskAnalysis;
  const isLowRisk = shield.overallRiskScore <= 35;
  const isHighRisk = shield.overallRiskScore > 65;

  return (
    <BaseCard
      variant="elevated"
      className="p-5 md:p-6 mb-4 border border-amber-100 hover:border-amber-300/80 transition-all bg-white"
    >
      {/* Top Banner: Pillar Mascot & Risk Shield */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100 flex-wrap">
        <div className="flex items-center gap-2">
          {pillarInfo && (
            <div className="flex items-center gap-1.5">
              <MascotBee name={pillarInfo.mascot} size="sm" animated={false} />
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${pillarInfo.bg}`}>
                {pillarInfo.label}
              </span>
            </div>
          )}
          <span className="text-xs text-stone-500 font-medium">
            {plan.transfersCount === 0 ? 'Direct Route' : `${plan.transfersCount} Transfer${plan.transfersCount > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Transfer Shield Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
            isLowRisk
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isHighRisk
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
          title={shield.riskSummaryText}
        >
          {isLowRisk ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <span>Shield: {100 - shield.overallRiskScore}%</span>
        </div>
      </div>

      {/* Main Row: Time & Route Header + Price & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Departure & Arrival Times with Timeline Bar */}
        <div className="flex items-center gap-4 flex-1">
          <div className="text-left">
            <span className="text-xl md:text-2xl font-black text-stone-900 tracking-tight">
              {formatTime(plan.departureTime)}
            </span>
            <p className="text-xs text-stone-500 font-medium max-w-[130px] truncate">{originStation}</p>
          </div>

          {/* Middle Duration & Mode Icons */}
          <div className="flex-1 flex flex-col items-center px-2">
            <span className="text-xs text-stone-500 font-semibold mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              {durationText}
            </span>
            <div className="w-full flex items-center gap-1">
              <div className="h-0.5 flex-1 bg-amber-200" />
              <div className="flex items-center gap-1 px-1">
                {plan.legs.map((leg) => {
                  const Icon = getTransitModeIcon(leg.transportType);
                  return (
                    <div
                      key={leg.id}
                      className="p-1 rounded bg-amber-50 text-amber-800 border border-amber-200"
                      title={`${leg.names.operatorName || leg.names.operatorShortName || ''} (${leg.transportType})`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  );
                })}
              </div>
              <div className="h-0.5 flex-1 bg-amber-200" />
            </div>
            <span className="text-[11px] text-stone-400 mt-1">
              {plan.legs
                .map((l) => l.names.operatorShortName || l.names.operatorName || '')
                .filter((v, i, a) => v && a.indexOf(v) === i)
                .join(' + ')}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xl md:text-2xl font-black text-stone-900 tracking-tight">
              {formatTime(plan.arrivalTime)}
            </span>
            <p className="text-xs text-stone-500 font-medium max-w-[130px] truncate">{destStation}</p>
          </div>
        </div>

        {/* Pricing & Booking Button */}
        <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
          <div className="text-left md:text-right">
            <div className="flex items-baseline md:justify-end gap-1">
              <span className="text-xl md:text-2xl font-black text-amber-600">
                {plan.fare.totalAmountLei.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-stone-600 uppercase">LEI</span>
            </div>
            <span className="text-xs text-stone-400 block">
              approx. &euro;{plan.fare.totalAmountEur.toFixed(2)}
            </span>
          </div>

          <BaseButton
            variant={isBooked ? 'success' : 'primary'}
            size="md"
            onClick={() => {
              if (isBooked) {
                onRemoveTrip?.(plan.id);
              } else {
                onBookTrip?.(plan);
              }
            }}
            className={`font-bold min-w-[120px] ${
              isBooked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
            }`}
            leftIcon={isBooked ? <Check className="w-4 h-4" /> : undefined}
          >
            {isBooked ? 'In Trip ✓' : 'Book Trip'}
          </BaseButton>
        </div>
      </div>

      {/* Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-4 pt-3 border-t border-stone-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-amber-600 transition-colors cursor-pointer"
      >
        <span>{isExpanded ? 'Hide Route Details' : 'View Stopovers & Shield Analysis'}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expandable Itinerary Breakdown */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dashed border-stone-200 space-y-4">
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Itinerary Breakdown</h4>
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-amber-200">
            {plan.legs.map((leg) => {
              const Icon = getTransitModeIcon(leg.transportType);
              const legHours = Math.floor(leg.timings.durationMinutes / 60);
              const legMins = leg.timings.durationMinutes % 60;
              const legDuration = legHours > 0 ? `${legHours}h ${legMins}m` : `${legMins} min`;
              const stopsOpen = expandedStops[leg.id];

              return (
                <div key={leg.id} className="relative pl-8">
                  {/* Step Icon Node */}
                  <div className="absolute left-1.5 -translate-x-1/2 top-1 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-bold shadow-xs">
                    <Icon className="w-3 h-3 text-white" />
                  </div>

                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900 mb-1">
                      <span>{leg.names.lineName || leg.names.operatorName || leg.names.operatorShortName}</span>
                      <span className="text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                        {leg.fare.amount.toFixed(2)} LEI
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 flex items-center justify-between">
                      <span>
                        {formatTime(leg.timings.scheduledDeparture)} <strong>{leg.names.originName}</strong> ➔{' '}
                        {formatTime(leg.timings.scheduledArrival)} <strong>{leg.names.destinationName}</strong>
                      </span>
                      <span className="text-stone-400">{legDuration}</span>
                    </div>

                    {/* Intermediate stops list toggle */}
                    {leg.coords.intermediateStops && leg.coords.intermediateStops.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-stone-200">
                        <button
                          type="button"
                          onClick={() => toggleStops(leg.id)}
                          className="text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-1"
                        >
                          <span>
                            {stopsOpen
                              ? 'Hide intermediate stops'
                              : `View ${leg.coords.intermediateStops.length} intermediate stops`}
                          </span>
                        </button>

                        {stopsOpen && (
                          <div className="mt-2 pl-2 space-y-1 border-l-2 border-amber-200 text-[11px] text-stone-600">
                            {leg.coords.intermediateStops.map((st, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span>{st.name}</span>
                                <span className="text-stone-400">
                                  {formatTime(st.scheduledDeparture || st.scheduledArrival)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Romanian Transfer Shield Reliability Footer */}
          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-700">
              <span className="font-bold text-stone-900 block">Romanian Transfer Shield Evaluation</span>
              <p className="mt-0.5">{shield.riskSummaryText}</p>
              <div className="flex items-center gap-4 mt-2 text-[11px] font-medium text-stone-600">
                <span>Buffer: {shield.bufferAdequacy}</span>
                <span>Punctuality: {(shield.historicalPunctualityRate * 100).toFixed(0)}%</span>
                <span>Risk Level: {shield.riskLevel}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseCard>
  );
};

export default BookingTripCard;
