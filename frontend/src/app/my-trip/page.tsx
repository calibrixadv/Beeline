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
  Train,
  Bell,
  BellOff,
  ShieldCheck,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimeOnly } from '../../utils/trainFilters';
import { buildOfficialTicketUrl, buildLegTrainLinks } from '../../utils/officialTicketUrl';
import { formatCurrency, roundPercent, formatPercent, formatKgCO2 } from '../../utils/formatters';
import BaseCard from '../../components/BaseCard';
import BaseButton from '../../components/BaseButton';
import MascotBee from '../../components/MascotBee';

const LEAD_OPTIONS: Array<{ value: 5 | 10 | 30 | 60; label: string }> = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

function getLeadShortLabel(minutes?: number): string {
  if (minutes === 60) return '1h';
  return `${minutes || 30}m`;
}

function getLeadFullLabel(minutes?: number): string {
  if (minutes === 60) return '1 hour';
  return `${minutes || 30} min`;
}

export default function MyTripPage() {
  const { 
    trips, 
    removeTrainFromTrip, 
    clearTrip, 
    totalCost, 
    totalDurationMinutes, 
    totalCo2SavedKg,
    updateTripAlertSettings,
  } = useTrip();
  const { user } = useAuth();
  const isRegisteredUser = Boolean(user && !user.is_guest && !(user as any).isGuest);

  const [openPopoverTripId, setOpenPopoverTripId] = React.useState<string | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!openPopoverTripId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPopoverTripId(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopoverTripId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopoverTripId]);

  const handleUpdateAlerts = updateTripAlertSettings || (() => {});

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
      {/* 3.1 Clean Page Header */}
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
              {trips.length === 0
                ? 'No saved journeys yet.'
                : `${trips.length} saved ${trips.length === 1 ? 'journey' : 'journeys'} in your itinerary.`}
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

      {/* 3.2 Blended-In Borderless 3-Stat Summary Strip */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E6D7BC]/75 border-y border-[#E6D7BC]/70 bg-[#FAF4E8]/35 py-3.5 px-2 mb-6">
        {/* Estimated Cost */}
        <div className="flex items-center gap-3 px-4 py-1.5 sm:justify-center">
          <Coins className="w-4 h-4 text-amber-700/75 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] block">
              Estimated Cost
            </span>
            <span className="text-xl font-bold tabular-nums text-[#1E1B18] block">
              {formatCurrency(totalCost)} LEI
            </span>
            <span className="text-[11px] text-[#78716C] block">
              approx. &euro;{formatCurrency(totalCost / 5.0)}
            </span>
          </div>
        </div>

        {/* Total Transit Time */}
        <div className="flex items-center gap-3 px-4 py-1.5 sm:justify-center">
          <Clock className="w-4 h-4 text-blue-700/70 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] block">
              Total Transit Time
            </span>
            <span className="text-xl font-bold tabular-nums text-[#1E1B18] block">
              {durationText}
            </span>
            <span className="text-[11px] text-[#78716C] block">
              {trips.length} {trips.length === 1 ? 'leg' : 'legs'}
            </span>
          </div>
        </div>

        {/* CO₂ Saved */}
        <div className="flex items-center gap-3 px-4 py-1.5 sm:justify-center">
          <Leaf className="w-4 h-4 text-emerald-700/75 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C] block">
              CO₂ Saved
            </span>
            <span className="text-xl font-bold tabular-nums text-[#1E1B18] block">
              {formatKgCO2(totalCo2SavedKg)} kg CO₂
            </span>
            <span className="text-[11px] text-[#78716C] block">
              vs. driving / flight
            </span>
          </div>
        </div>
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
        <div className="space-y-4">
          {/* 3.3 Redesigned Itinerary Cards */}
          {trips.map((item) => {
            const j = item.journey;
            const fare = j.fares?.find((f) => f.classType === item.selectedClass);
            const price = fare?.price ?? j.fares?.[0]?.price ?? 0;

            const rawPillars = [
              ...(Array.isArray(item.curatedPillars) ? item.curatedPillars : []),
              ...(item.curatedPillar ? [item.curatedPillar] : []),
              ...(Array.isArray(j.curatedPillars) ? j.curatedPillars : []),
              ...(j.curatedPillar ? [j.curatedPillar] : []),
            ];
            const activePillarsSet = new Set(rawPillars);

            const hasTransfers =
              ((item as any).transfersCount !== undefined && (item as any).transfersCount > 0) ||
              ((j as any).transfersCount !== undefined && (j as any).transfersCount > 0) ||
              ((item as any).transfers && (item as any).transfers.length > 0) ||
              ((j as any).legs && (j as any).legs.length > 1);

            const legLinks = (j as any).legs && (j as any).legs.length > 1
              ? buildLegTrainLinks((j as any).legs, item.travelDate)
              : (item as any).legs && (item as any).legs.length > 1
              ? buildLegTrainLinks((item as any).legs, item.travelDate)
              : [];
            const isDirectRoute = !hasTransfers && legLinks.length <= 1;

            const officialTicketUrl = buildOfficialTicketUrl({
              trainNumber: j.trainNumber,
              origin: j.origin.name || j.origin.city,
              destination: j.destination.name || j.destination.city,
              travelDate: item.travelDate || (j.departureTime ? j.departureTime.slice(0, 10) : undefined),
              operator: j.operator,
            });

            const isReliableActive = activePillarsSet.has('MOST_RELIABLE');
            const isFastestActive = activePillarsSet.has('FASTEST');
            const isEcoActive = activePillarsSet.has('BEST_VALUE') || activePillarsSet.has('ECO_HERO');
            const isEcoHero = activePillarsSet.has('ECO_HERO') && !activePillarsSet.has('BEST_VALUE');

            const pillarsConfig = [
              {
                key: 'MOST_RELIABLE' as const,
                label: 'Reliable',
                icon: ShieldCheck,
                isActive: isReliableActive,
                activeColorClasses: 'bg-emerald-700 text-white border border-emerald-700 shadow-emerald-700/20',
              },
              {
                key: 'FASTEST' as const,
                label: 'Fastest',
                icon: Zap,
                isActive: isFastestActive,
                activeColorClasses: 'bg-blue-600 text-white border border-blue-600 shadow-blue-600/20',
              },
              {
                key: 'BEST_VALUE' as const,
                label: 'Eco',
                icon: isEcoHero ? Leaf : Coins,
                isActive: isEcoActive,
                activeColorClasses: 'bg-amber-500 text-stone-950 border border-amber-500 shadow-amber-500/20',
              },
            ];

            return (
              <div
                key={item.id}
                data-testid={`trip-itinerary-card-${item.id}`}
                className="rounded-2xl bg-white/95 border border-[#E8D9BE]/85 shadow-[0_4px_18px_rgba(120,83,24,0.05)] p-5"
              >
                {/* 1. Single-Row Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100">
                  {/* Left: Train code badge, muted operator, borderless inline date */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 border border-stone-200/80">
                      {j.trainNumber}
                    </span>
                    <span className="text-xs font-medium text-stone-500">
                      {j.operator}
                    </span>
                    <span className="text-xs text-stone-400">
                      Travel date: {item.travelDate}
                    </span>
                  </div>

                  {/* Right: Fixed 3-Slot Pillar Badges (Engraved vs. Filled) */}
                  <div className="flex items-center gap-1.5 shrink-0" data-testid="pillar-badges-row">
                    {pillarsConfig.map((p) => {
                      const Icon = p.icon;
                      if (p.isActive) {
                        return (
                          <span
                            key={p.key}
                            data-testid={`badge-${p.key}`}
                            data-badge-state="active"
                            aria-label={`${p.label} (active route badge)`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight select-none transition-all duration-200 shadow-sm ${p.activeColorClasses}`}
                          >
                            <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>{p.label}</span>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={p.key}
                          data-testid={`badge-engraved-${p.key}`}
                          data-badge-state="engraved"
                          aria-label={`${p.label} (not top ranked for this train)`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight select-none transition-all duration-200 bg-[#F4EFE6]/85 text-stone-400/85 border border-stone-200/80 shadow-[inset_0_1.5px_2.5px_rgba(28,25,23,0.12),0_1px_0_rgba(255,255,255,0.95)] [text-shadow:0_1px_0_rgba(255,255,255,0.85)]"
                        >
                          <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{p.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Middle Journey Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                  {/* Route Summary: 05:32 Galați ──── 11:10 București Nord */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-left">
                      <span className="text-lg md:text-xl font-black text-stone-900 tracking-tight">
                        {formatTimeOnly(j.departureTime)}
                      </span>
                      <p className="text-xs text-stone-500 font-medium truncate max-w-[140px]">{j.origin.name}</p>
                    </div>

                    <div className="flex-1 flex items-center gap-1.5 px-2">
                      <div className="h-0.5 flex-1 bg-amber-200" />
                      <Train className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div className="h-0.5 flex-1 bg-amber-200" />
                    </div>

                    <div className="text-right">
                      <span className="text-lg md:text-xl font-black text-stone-900 tracking-tight">
                        {formatTimeOnly(j.arrivalTime)}
                      </span>
                      <p className="text-xs text-stone-500 font-medium truncate max-w-[140px]">{j.destination.name}</p>
                    </div>
                  </div>

                  {/* Pricing, External CTA, Per-Trip Alert Bell, Delete */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
                    <div className="text-left md:text-right mr-1">
                      <span className="text-lg font-black text-amber-600 tabular-nums">{formatCurrency(price)} LEI</span>
                      <span className="text-[11px] text-stone-400 block tabular-nums">&euro;{formatCurrency(price / 5.0)}</span>
                    </div>

                    {isDirectRoute ? (
                      <a
                        href={officialTicketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="buy-official-ticket"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-xs"
                      >
                        <span>Vezi trenul pe InfoFer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap" data-testid="buy-official-ticket-multileg">
                        {legLinks.map((leg) => (
                          <a
                            key={leg.legIndex}
                            href={leg.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`buy-official-ticket-leg-${leg.legIndex}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-xs"
                            title={`Check train ${leg.trainCode} on InfoFer`}
                          >
                            <span>InfoFer: {leg.trainCode}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Per-Trip Alert Bell Control */}
                    <div
                      className="relative inline-block"
                      ref={openPopoverTripId === item.id ? popoverRef : undefined}
                    >
                      <button
                        type="button"
                        data-testid={`trip-alert-bell-${item.id}`}
                        aria-label={
                          item.alertMuted
                            ? 'Trip alerts muted'
                            : `Trip alerts active: ${getLeadFullLabel(item.alertLeadMinutes)} before departure`
                        }
                        onClick={() => {
                          setOpenPopoverTripId((prev) => (prev === item.id ? null : item.id));
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
                          item.alertMuted
                            ? 'bg-stone-100 hover:bg-stone-200/80 text-stone-600 border border-stone-200 font-semibold'
                            : 'bg-amber-100 hover:bg-amber-200/80 text-amber-900 border border-amber-300/80 font-bold'
                        }`}
                      >
                        {item.alertMuted ? (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                            <span>Muted</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                            <span>{getLeadShortLabel(item.alertLeadMinutes)}</span>
                          </>
                        )}
                      </button>

                      {/* Popover Menu on Click */}
                      {openPopoverTripId === item.id && (
                        <div
                          data-testid={`trip-alert-popover-${item.id}`}
                          className="absolute right-0 top-full mt-2 rounded-xl bg-white border border-[#E8D9BE] shadow-lg p-3 w-60 z-20 text-left"
                        >
                          <h4 className="text-xs font-bold text-stone-900 mb-1">
                            Departure & Delay Alerts
                          </h4>
                          <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                            {isRegisteredUser
                              ? `Email reminder before departure & automatic live delay alerts to ${user?.email}.`
                              : 'Sign in to receive email reminders & live delay alerts for this train.'}
                          </p>

                          {/* 4 Lead-Time Options */}
                          <div className="grid grid-cols-2 gap-1.5 mb-3">
                            {LEAD_OPTIONS.map((opt) => {
                              const isSelected = !item.alertMuted && (item.alertLeadMinutes ?? 30) === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateAlerts(item.id, {
                                      alertMuted: false,
                                      alertLeadMinutes: opt.value,
                                    });
                                  }}
                                  className={`px-2 py-1.5 text-xs rounded-lg border text-center transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 font-medium'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Mute Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateAlerts(item.id, {
                                alertMuted: !item.alertMuted,
                              });
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                          >
                            {item.alertMuted ? (
                              <>
                                <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                                <span>Unmute alerts</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                                <span>Mute alerts for this trip</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTrainFromTrip(item.id)}
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove from itinerary"
                      aria-label="Remove journey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4. Quiet Borderless Footer Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {j.riskAnalysis?.isMlComputed ? (
                      <>
                        <span
                          className={`font-medium ${
                            (j.riskAnalysis.expectedDelayMinutes ?? 0) <= 0
                              ? 'text-emerald-700'
                              : (j.riskAnalysis.expectedDelayMinutes ?? 0) <= 15
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {(j.riskAnalysis.expectedDelayMinutes ?? 0) > 0
                            ? `⏱️ +${j.riskAnalysis.expectedDelayMinutes}m expected delay`
                            : '✅ On Time'}
                        </span>
                        {isDirectRoute ? (
                          <>
                            <span className="text-stone-300">·</span>
                            <span data-testid="trip-connection-label" className="font-medium text-emerald-700">
                              🛡️ Direct route
                            </span>
                          </>
                        ) : j.riskAnalysis.missedConnectionProbability !== undefined ? (
                          (() => {
                            const pct = roundPercent((1 - j.riskAnalysis.missedConnectionProbability) * 100);
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
                    ) : j.delayMinutes > 0 ? (
                      <span className="font-medium text-amber-700">
                        ⏱️ +{j.delayMinutes}m delay
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-700">
                        ✅ On Time
                      </span>
                    )}
                  </div>

                  <Link
                    href="/profile"
                    className="text-stone-400 hover:text-stone-600 transition-colors ml-auto text-[11px]"
                  >
                    Kept in your itinerary for profile savings stats
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
