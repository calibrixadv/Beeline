'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Clock,
  Zap,
  Coins,
  Leaf,
  ExternalLink
} from 'lucide-react';
import { TransitRoutePlan } from '../types/routePlan';
import BaseCard from './BaseCard';
import BaseButton from './BaseButton';
import RouteItineraryTimeline from './RouteItineraryTimeline';
import TrainItineraryModal from './TrainItineraryModal';
import { isTrainDeparted, useNowTick } from '../utils/departureTime';
import { buildOfficialTicketUrl, buildLegTrainLinks, SAFE_EXTERNAL_LINK_ATTRS } from '../utils/officialTicketUrl';

export interface BookingTripCardProps {
  plan: TransitRoutePlan;
  onBookTrip?: (plan: TransitRoutePlan) => void;
  onAddToItinerary?: (plan: TransitRoutePlan) => void;
  onInItineraryClick?: (plan: TransitRoutePlan) => void;
  onRemoveTrip?: (planId: string) => void;
  isBooked?: boolean;
  isInItinerary?: boolean;
  defaultExpanded?: boolean;
  isHighlighted?: boolean;
  highlightLabel?: string;
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
  onAddToItinerary,
  onInItineraryClick,
  onRemoveTrip,
  isBooked = false,
  isInItinerary,
  defaultExpanded = false,
  isHighlighted = false,
  highlightLabel = '★ Selected from Home',
}) => {
  const router = useRouter();
  const isInTrip = isInItinerary !== undefined ? isInItinerary : isBooked;
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedTrainNumber, setSelectedTrainNumber] = useState<string>('');

  const now = useNowTick();
  const departed = isTrainDeparted(plan.departureTime, plan.date, now);

  const handleOpenTrainModal = (trainNum: string) => {
    setSelectedTrainNumber(trainNum);
    setModalOpen(true);
  };

  const totalIntermediateStops = plan.legs.reduce((acc, l) => {
    if (l.intermediateStopCount !== undefined) return acc + l.intermediateStopCount;
    if (l.stops && l.stops.length >= 2) return acc + (l.stops.length - 2);
    if (l.coords?.intermediateStops) return acc + l.coords.intermediateStops.length;
    return acc;
  }, 0);

  const totalDistanceKm = plan.legs.reduce((acc, l) => {
    if (l.distanceKm) return acc + l.distanceKm;
    if (l.stops && l.stops.length > 0) return acc + l.stops[l.stops.length - 1].distanceFromOriginKm;
    return acc;
  }, 0);

  const hasTransfers =
    (plan.transfersCount !== undefined && plan.transfersCount > 0) ||
    (plan.legs && plan.legs.length > 1) ||
    (plan.transfers && plan.transfers.length > 0);
  const isDirectRoute = !hasTransfers;

  const transferText =
    plan.transfersCount === 0
      ? 'Direct'
      : `${plan.transfersCount} transfer${plan.transfersCount > 1 ? 's' : ''}`;
  const stopsSummaryPart = totalIntermediateStops > 0 ? `${totalIntermediateStops} stop${totalIntermediateStops > 1 ? 's' : ''}` : null;
  const distSummaryPart = totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(1)} km` : null;
  const collapsedSummary = [transferText, stopsSummaryPart, distSummaryPart].filter(Boolean).join(' · ');

  const toggleStops = (legId: string) => {
    setExpandedStops((prev) => ({ ...prev, [legId]: !prev[legId] }));
  };

  const hours = Math.floor(plan.totalDurationMinutes / 60);
  const mins = plan.totalDurationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  const originStation = plan.legs[0]?.names.originName || 'Origin';
  const destStation = plan.legs[plan.legs.length - 1]?.names.destinationName || 'Destination';
  const trainCodes = plan.legs
    .map((l) => l.names.lineCode)
    .filter(Boolean)
    .join(' ➔ ');

  const legLinks = buildLegTrainLinks(plan, plan.date);
  const isDirect = isDirectRoute || legLinks.length <= 1;
  const directTrainUrl = buildOfficialTicketUrl({
    origin: plan.query?.origin?.name || plan.legs[0]?.names.originName || originStation,
    destination: plan.query?.destination?.name || plan.legs[plan.legs.length - 1]?.names.destinationName || destStation,
    travelDate: plan.date || (plan.departureTime ? plan.departureTime.slice(0, 10) : undefined),
    operator: plan.legs[0]?.names.operatorName || plan.legs[0]?.names.operatorShortName,
    trainNumber: plan.legs[0]?.names.lineCode || plan.summary,
  });

  // Multi-badge pillar configuration
  const rawPillars = Array.isArray(plan.curatedPillars) && plan.curatedPillars.length > 0
    ? plan.curatedPillars
    : plan.curatedPillar
    ? [plan.curatedPillar]
    : [];
  const activePillarsSet = new Set(rawPillars);

  const isReliableActive = activePillarsSet.has('MOST_RELIABLE');
  const isFastestActive = activePillarsSet.has('FASTEST');
  const isEcoActive = activePillarsSet.has('BEST_VALUE') || activePillarsSet.has('ECO_HERO');
  const isEcoHero = activePillarsSet.has('ECO_HERO') && !activePillarsSet.has('BEST_VALUE');

  const pillarsConfig = [
    {
      key: 'MOST_RELIABLE' as const,
      label: 'Meli',
      title: 'Queen Meli · Most Reliable',
      activeAriaLabel: 'Queen Meli — Most Reliable (active route badge)',
      engravedAriaLabel: 'Queen Meli — Most Reliable (not top ranked for this train)',
      icon: ShieldCheck,
      isActive: isReliableActive,
      activeColorClasses: 'bg-emerald-700 text-white border border-emerald-700 shadow-emerald-700/20',
    },
    {
      key: 'FASTEST' as const,
      label: 'Vira',
      title: 'Queen Vira · Fastest',
      activeAriaLabel: 'Queen Vira — Fastest (active route badge)',
      engravedAriaLabel: 'Queen Vira — Fastest (not top ranked for this train)',
      icon: Zap,
      isActive: isFastestActive,
      activeColorClasses: 'bg-blue-600 text-white border border-blue-600 shadow-blue-600/20',
    },
    {
      key: 'BEST_VALUE' as const,
      label: 'Flora',
      title: 'Queen Flora · Best Value',
      activeAriaLabel: 'Queen Flora — Best Value (active route badge)',
      engravedAriaLabel: 'Queen Flora — Best Value (not top ranked for this train)',
      icon: isEcoHero ? Leaf : Coins,
      isActive: isEcoActive,
      activeColorClasses: 'bg-amber-500 text-stone-950 border border-amber-500 shadow-amber-500/20',
    },
  ];

  const shield = plan.riskAnalysis;
  const isLowRisk = (shield?.overallRiskScore ?? 0) <= 35;
  const isHighRisk = (shield?.overallRiskScore ?? 0) > 65;

  return (
    <BaseCard
      data-testid="booking-trip-card"
      variant="elevated"
      className={`p-5 md:p-6 mb-4 border transition-all bg-white ${
        isHighlighted
          ? 'border-amber-400 ring-2 ring-amber-300/70 bg-amber-50/15'
          : 'border-amber-100 hover:border-amber-300/80'
      }`}
    >
      {/* Sleek Scannable Header Row: Train Identity, Route Meta & Fixed 3-Slot Pillar Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100">
        {/* Left Cluster: Train Identity & Inline Summary */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {trainCodes && (
            <button
              type="button"
              data-testid="train-itinerary-trigger"
              onClick={() => handleOpenTrainModal(plan.legs[0]?.names.lineCode || trainCodes)}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-stone-100 hover:bg-amber-100 text-stone-800 border border-stone-200/80 transition-colors cursor-pointer"
              title={`View full route for ${trainCodes}`}
            >
              <span data-testid="trip-train-code">{trainCodes}</span>
            </button>
          )}

          <span
            data-testid="trip-collapsed-summary"
            className="text-xs font-medium text-stone-500"
          >
            {collapsedSummary}
          </span>

          {isHighlighted && (
            <span
              data-testid="selected-from-home-badge"
              className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/70"
            >
              {highlightLabel}
            </span>
          )}

          {departed && (
            <span
              data-testid="trip-departed-badge"
              className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-stone-100 text-stone-500 border border-stone-200/80"
            >
              Departed
            </span>
          )}
        </div>

        {/* Right Cluster: Fixed 3-Slot Pillar Badges (Engraved vs. Filled) */}
        <div className="flex items-center gap-1.5 shrink-0" data-testid="pillar-badges-row">
          {pillarsConfig.map((item) => {
            const Icon = item.icon;
            if (item.isActive) {
              return (
                <span
                  key={item.key}
                  data-testid={`badge-${item.key}`}
                  data-badge-state="active"
                  title={item.title}
                  aria-label={item.activeAriaLabel}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight select-none transition-all duration-200 shadow-sm ${item.activeColorClasses}`}
                >
                  <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
              );
            }
            return (
              <span
                key={item.key}
                data-testid={`badge-engraved-${item.key}`}
                data-badge-state="engraved"
                title={item.title}
                aria-label={item.engravedAriaLabel}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight select-none transition-all duration-200 bg-[#F4EFE6]/85 text-stone-400/85 border border-stone-200/80 shadow-[inset_0_1.5px_2.5px_rgba(28,25,23,0.12),0_1px_0_rgba(255,255,255,0.95)] [text-shadow:0_1px_0_rgba(255,255,255,0.85)]"
              >
                <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            );
          })}
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

          <div className="flex flex-col items-end gap-1">
            <BaseButton
              variant={isInTrip ? 'success' : departed ? 'secondary' : 'primary'}
              size="md"
              disabled={departed}
              aria-disabled={departed}
              onClick={() => {
                if (departed) return;
                if (isInTrip) {
                  if (onInItineraryClick) {
                    onInItineraryClick(plan);
                  } else if (router) {
                    router.push('/my-trip');
                  }
                  return;
                }
                if (onAddToItinerary) {
                  onAddToItinerary(plan);
                } else if (onBookTrip) {
                  onBookTrip(plan);
                }
              }}
              className={`font-bold min-w-[130px] ${
                departed
                  ? 'bg-stone-200 text-stone-500 border border-stone-300 cursor-not-allowed opacity-80 shadow-none'
                  : isInTrip
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-xs'
              }`}
              leftIcon={!departed && isInTrip ? <Check className="w-4 h-4" /> : undefined}
            >
              {departed ? 'Departed' : isInTrip ? 'In Itinerary ✓' : 'Add to Itinerary'}
            </BaseButton>

            {isInTrip && !departed && (
              isDirect ? (
                <a
                  href={directTrainUrl}
                  {...SAFE_EXTERNAL_LINK_ATTRS}
                  data-testid="open-official-ticket-link"
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 pt-0.5"
                  onClick={(e) => e.stopPropagation()}
                  title="Vezi trenul pe InfoFer"
                >
                  <span>Vezi trenul pe InfoFer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div
                  data-testid="multileg-infofer-links"
                  className="flex items-center gap-1.5 pt-0.5 flex-wrap justify-end"
                >
                  {legLinks.map((leg) => (
                    <a
                      key={leg.legIndex}
                      href={leg.url}
                      {...SAFE_EXTERNAL_LINK_ATTRS}
                      data-testid={`open-official-ticket-link-leg-${leg.legIndex}`}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      title={`Vezi trenul ${leg.trainCode} pe InfoFer`}
                    >
                      <span>InfoFer: {leg.trainCode}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bottom Utility Bar: Quiet Micro-Indicators + Expand Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100 text-xs">
        {/* Left: Quiet borderless ML Delay & Connection Guarantee / Shield Micro-Indicators */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {shield?.isMlComputed ? (
            <>
              <span
                className={`font-medium ${
                  (shield.expectedDelayMinutes ?? 0) <= 0
                    ? 'text-emerald-700'
                    : (shield.expectedDelayMinutes ?? 0) <= 15
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {(shield.expectedDelayMinutes ?? 0) > 0
                  ? `⏱️ +${shield.expectedDelayMinutes}m expected delay`
                  : '✅ On Time'}
              </span>
              {isDirectRoute ? (
                <>
                  <span className="text-stone-300">·</span>
                  <span data-testid="trip-connection-label" className="font-medium text-emerald-700">
                    🛡️ Direct route
                  </span>
                </>
              ) : shield.missedConnectionProbability !== undefined ? (
                (() => {
                  const pct = Math.max(0, Math.min(100, Math.round((1 - shield.missedConnectionProbability) * 100)));
                  if (pct >= 85) {
                    return (
                      <>
                        <span className="text-stone-300">·</span>
                        <span data-testid="trip-connection-label" className="font-medium text-emerald-700">
                          🛡️ {pct}% transfer chance
                        </span>
                      </>
                    );
                  } else if (pct >= 50) {
                    return (
                      <>
                        <span className="text-stone-300">·</span>
                        <span data-testid="trip-connection-label" className="font-medium text-amber-700">
                          ⏱️ {pct}% transfer chance
                        </span>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <span className="text-stone-300">·</span>
                        <span data-testid="trip-connection-label" className="font-medium text-rose-700">
                          ⚠️ {pct}% transfer chance
                        </span>
                      </>
                    );
                  }
                })()
              ) : null}
            </>
          ) : shield ? (
            <div
              className={`flex items-center gap-1 font-medium ${
                isLowRisk
                  ? 'text-emerald-700'
                  : isHighRisk
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
              title={shield.riskSummaryText}
            >
              {isLowRisk ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              <span>Shield: {100 - shield.overallRiskScore}%</span>
            </div>
          ) : null}
        </div>

        {/* Right: Expand / Collapse Details Trigger */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="inline-flex items-center gap-1.5 font-semibold text-stone-500 hover:text-amber-600 transition-colors cursor-pointer ml-auto"
        >
          <span>{isExpanded ? 'Hide Route Details' : 'View Stopovers & Shield Analysis'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Itinerary Breakdown */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dashed border-stone-200 space-y-4">
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Itinerary Breakdown</h4>

          {/* If rich stop-by-stop itinerary data exists, render modern RouteItineraryTimeline */}
          {plan.legs.some((l) => l.stops && l.stops.length > 0) || (plan.transfers && plan.transfers.length > 0) ? (
            <RouteItineraryTimeline
              plan={plan}
              travelDate={plan.date}
              onOpenTrainModal={handleOpenTrainModal}
            />
          ) : (
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
          )}

          {/* Romanian Transfer Shield Reliability Footer */}
          {shield && (
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
          )}
        </div>
      )}

      {/* Full Train Path Modal */}
      <TrainItineraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trainNumber={selectedTrainNumber}
        travelDate={plan.date}
      />
    </BaseCard>
  );
};

export default BookingTripCard;
