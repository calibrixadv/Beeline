'use client';

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Train, History } from 'lucide-react';
import { TrainJourney, TrainStatus } from '../../types/train';
import { apiClient } from '../../services/apiClient';
import BaseInput from '../../components/BaseInput';
import TrainCard from '../../components/TrainCard';
import TrainDetailModal from '../../components/TrainDetailModal';
import TrainsGhostSkeleton from '../../components/TrainsGhostSkeleton';
import AmbientPageMascot from '../../components/AmbientPageMascot';
import { MascotGear } from '../../components/MascotBee';

export const SAMPLE_TRAIN_CODES = ['IC 535', 'IR 1572', 'R 3029', 'RE 11631'] as const;

export const RECENT_SEARCHES_KEY = 'beeline_trains_recent_codes';
const LEGACY_RECENT_SEARCHES_KEY = 'beeline_trains_recent_searches';

const STATUS_FILTERS: { id: 'ALL' | TrainStatus; label: string }[] = [
  { id: 'ALL', label: 'All Trains' },
  { id: 'ON_TIME', label: 'On Time' },
  { id: 'DELAYED', label: 'Delayed' },
  { id: 'BOARDING', label: 'Boarding' },
];

/**
 * Normalizes train code input (e.g. "r3029" -> "R 3029", "ir 1572" -> "IR 1572", "re11631" -> "RE 11631")
 */
export function normalizeTrainCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^([a-zA-Z\s]+?)\s*(\d+)$/);
  if (match) {
    const letters = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
    return `${letters} ${match[2]}`;
  }
  return trimmed.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Case-insensitive, whitespace-tolerant train code matching helper
 */
export function isTrainCodeMatch(trainNumber: string, query: string): boolean {
  const cleanQ = query.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!cleanQ) return true;
  const compactQ = cleanQ.replace(/\s+/g, '');

  const cleanT = trainNumber.trim().toUpperCase().replace(/\s+/g, ' ');
  const compactT = cleanT.replace(/\s+/g, '');

  if (cleanQ === cleanT || compactQ === compactT) return true;

  // Category prefix queries: 'IC' matches 'IC 535', but not 'IR 1572'
  if (['IC', 'IR', 'RE', 'R'].includes(cleanQ)) {
    const tCat = cleanT.split(' ')[0];
    return tCat === cleanQ;
  }

  // Pure digits: '535' matches 'IC 535'
  if (/^\d+$/.test(cleanQ)) {
    const tParts = cleanT.split(' ');
    const tDigits = tParts.length > 1 ? tParts[1] : '';
    return cleanQ === tDigits || tDigits.includes(cleanQ);
  }

  // Cross-format train code match: e.g. "r2300" or "R-2300" matches "R 2300"
  const qDigits = compactQ.replace(/\D/g, '');
  const tDigits = compactT.replace(/\D/g, '');
  if (qDigits && tDigits && (qDigits === tDigits || tDigits.includes(qDigits))) {
    return true;
  }

  return compactT.includes(compactQ) || compactQ.includes(compactT);
}

function TrainsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL search params strictly for train code / number
  const urlTrainCode =
    searchParams?.get('trainCode') ||
    searchParams?.get('code') ||
    searchParams?.get('searchQuery') ||
    searchParams?.get('q') ||
    '';

  const hasInitialCode = Boolean(urlTrainCode.trim());

  const [trainCodeInput, setTrainCodeInput] = useState<string>(urlTrainCode);
  const [activeCode, setActiveCode] = useState<string>(urlTrainCode);
  const [hasSearched, setHasSearched] = useState<boolean>(hasInitialCode);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrainStatus>('ALL');
  const [selectedJourney, setSelectedJourney] = useState<TrainJourney | null>(null);
  const [trains, setTrains] = useState<TrainJourney[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Hydrate recent train code searches from localStorage (0 network requests)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored =
          window.localStorage.getItem(RECENT_SEARCHES_KEY) ||
          window.localStorage.getItem(LEGACY_RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const list: string[] = [];
            for (const item of parsed) {
              if (typeof item === 'string' && item.trim()) {
                list.push(item.trim());
              } else if (item && typeof item === 'object') {
                const candidate = item.code || item.trainNumber || item.trainCode;
                if (typeof candidate === 'string' && candidate.trim()) {
                  list.push(candidate.trim());
                }
              }
            }
            if (list.length > 0) {
              setRecentSearches(list.slice(0, 5));
            }
          }
        }
      } catch {
        // Fallback on storage read errors
      }
    }
  }, []);

  const saveRecentSearch = useCallback((code: string) => {
    const clean = code.trim();
    if (!clean) return;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        setRecentSearches((prev) => {
          const normClean = clean.toLowerCase().replace(/\s+/g, '');
          const filtered = prev.filter(
            (p) => p.toLowerCase().replace(/\s+/g, '') !== normClean
          );
          const updated = [clean, ...filtered].slice(0, 5);
          window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch {
        // Fallback on storage write errors
      }
    }
  }, []);

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(RECENT_SEARCHES_KEY);
        window.localStorage.removeItem(LEGACY_RECENT_SEARCHES_KEY);
      } catch {}
    }
  };

  const executeSearch = useCallback(
    async (codeToSearch: string) => {
      const clean = codeToSearch.trim();
      const normalized = clean ? normalizeTrainCode(clean) : '';

      setHasSearched(true);
      setIsLoading(true);
      setFetchError(null);
      setActiveCode(clean || normalized);

      if (clean) {
        saveRecentSearch(normalized || clean);
      }

      // Update URL parameters
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams();
        if (clean) {
          params.set('trainCode', clean);
        }
        router.replace(`/trains?${params.toString()}`);
      }

      const startTime = Date.now();
      try {
        const res = await apiClient.getTrains({
          searchQuery: normalized || clean || undefined,
        });

        if (process.env.NODE_ENV !== 'test') {
          const elapsed = Date.now() - startTime;
          if (elapsed < 260) {
            await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
          }
        }

        const rawItems = res?.items ?? (res as any)?.data ?? [];
        if (Array.isArray(rawItems)) {
          // Client-side deduplication guard on normalized train number + date
          const seenTrainKeys = new Set<string>();
          const dedupedItems: any[] = [];
          for (const item of rawItems) {
            const numKey = (item.trainNumber || '').toUpperCase().replace(/\s+/g, '');
            const dateKey = (item.departureTime || '').slice(0, 10);
            const compositeKey = `${numKey}|${dateKey}`;
            if (!seenTrainKeys.has(compositeKey)) {
              seenTrainKeys.add(compositeKey);
              dedupedItems.push(item);
            }
          }
          if (clean) {
            const matched = dedupedItems.filter((t) => isTrainCodeMatch(t.trainNumber, clean));
            setTrains(matched.length > 0 ? matched : dedupedItems);
          } else {
            setTrains(dedupedItems);
          }
        } else {
          setTrains([]);
        }
      } catch (err: any) {
        if (process.env.NODE_ENV !== 'test') {
          const elapsed = Date.now() - startTime;
          if (elapsed < 260) {
            await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
          }
        }
        setTrains([]);
        setFetchError(err?.message || 'Error fetching train details');
      } finally {
        setIsLoading(false);
      }
    },
    [router, saveRecentSearch]
  );

  // Auto-search ONLY if explicit train code query parameter exists in the URL on mount
  useEffect(() => {
    if (hasInitialCode) {
      executeSearch(urlTrainCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced live search when user types in search box (300ms)
  useEffect(() => {
    const trimmed = trainCodeInput.trim();
    if (!trimmed || trimmed === activeCode) {
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [trainCodeInput, activeCode, executeSearch]);

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(trainCodeInput);
  };

  const handleQuickCode = (code: string) => {
    setTrainCodeInput(code);
    executeSearch(code);
  };

  const displayedTrains = useMemo(() => {
    return trains.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [trains, statusFilter]);

  const activeTrainMascotGear: MascotGear = useMemo(() => {
    if (statusFilter === 'ON_TIME') {
      return 'safe';
    }
    const clean = (activeCode || trainCodeInput || '').trim().toUpperCase();
    if (/^(IC|IR)(\s|\d|$)/i.test(clean)) {
      return 'fast';
    }
    if (/^(RE|R)(\s|\d|$)/i.test(clean)) {
      return 'economy';
    }
    return 'default';
  }, [statusFilter, activeCode, trainCodeInput]);

  return (
    <div className="relative min-h-screen">
      <AmbientPageMascot gear={activeTrainMascotGear} position="top-right" />
      <div className="relative z-10 py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/70 border border-amber-200/80 px-2.5 py-0.5 rounded-full mb-2">
              <span>🧭</span>
              <span>Bumbi&apos;s Live Rail Radar</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              Train Search
            </h1>
            <p className="text-xs md:text-sm text-stone-500 mt-1">
              Search Romanian passenger trains strictly by train code for live statuses, route stops, and fare details.
            </p>
          </div>
        </div>

      {/* Clean Train Code Search Bar Container */}
      <div
        data-testid="trains-search-bar"
        className="rounded-2xl border border-[#F3E8D2] bg-[#FFFDF9] p-4 sm:p-5 mb-6 shadow-xs"
      >
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          {/* Train Code Input & Search Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full flex-1">
              <BaseInput
                id="trains-code-input"
                data-testid="trains-code-input"
                placeholder="Enter train code (e.g. IR 1572, R 3029, IC 535, RE 11631)..."
                value={trainCodeInput}
                onChange={(e) => setTrainCodeInput(e.target.value)}
                onClear={() => setTrainCodeInput('')}
                leftIcon={<Train className="w-4 h-4 text-amber-500" />}
                className="w-full text-sm py-2.5"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              data-testid="trains-search-btn"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Train</span>
            </button>
          </div>

          {/* Quick Train Code Chips */}
          <div
            data-testid="quick-corridor-chips"
            className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#F3E8D2]/60"
          >
            <span className="text-xs font-medium text-stone-400 mr-1">Sample train codes:</span>
            {SAMPLE_TRAIN_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleQuickCode(code)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAF4E8] text-stone-700 border border-[#F3E8D2] hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
              >
                {code}
              </button>
            ))}
          </div>

          {/* Recent Train Code Searches Strip (Local storage only; 0 network requests) */}
          {recentSearches.length > 0 && (
            <div
              data-testid="recent-searches-strip"
              className="flex items-center gap-1.5 flex-wrap pt-1"
            >
              <span className="text-xs font-medium text-stone-400 mr-1 flex items-center gap-1">
                <History className="w-3 h-3 text-stone-400" />
                Recent:
              </span>
              {recentSearches.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleQuickCode(code)}
                  className="px-2 py-0.5 rounded-lg text-xs bg-white text-stone-600 border border-[#F3E8D2] hover:bg-amber-50 hover:border-amber-200 transition-colors cursor-pointer"
                >
                  {code}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearRecentSearches}
                className="text-[11px] text-stone-400 hover:text-stone-600 underline ml-1 cursor-pointer"
                title="Clear recent searches"
              >
                Clear
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Main Body: Ready State vs Ghost Skeleton vs Results */}
      {!hasSearched ? (
        /* Ready State (hasSearched === false): Borderless/cozy dashed border with hive palette */
        <div
          data-testid="trains-ready-state"
          className="py-12 sm:py-16 text-center border border-dashed border-[#F3E8D2] rounded-2xl bg-[#FAF4E8]/40 px-4"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-amber-700">
            <Train className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-sm font-semibold text-stone-800">
            Search Romanian Trains by Code
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            Enter a train number or select a sample code above to view live timetable, status, and route stops.
          </p>
        </div>
      ) : isLoading ? (
        /* Ghost Skeleton while loading */
        <div className="w-full my-6">
          <TrainsGhostSkeleton />
        </div>
      ) : (
        /* Search Results */
        <div className="space-y-4 animate-fade-in">
          {/* Status Filter Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap py-2 border-b border-[#F3E8D2] mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-stone-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                Status:
              </span>
              {STATUS_FILTERS.map((f) => {
                const isSelected = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'bg-[#FAF4E8] text-stone-600 hover:bg-stone-200 border border-[#F3E8D2]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {activeCode && (
              <div className="text-xs text-stone-400 font-medium">
                Searching code: <span className="text-stone-700 font-bold">{activeCode}</span>
              </div>
            )}
          </div>

          {/* Results List or Factual No-Trains State */}
          {displayedTrains.length === 0 ? (
            <div
              data-testid="no-trains-empty-state"
              className="p-8 text-center bg-white rounded-2xl border border-[#F3E8D2] space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2 text-stone-500">
                <Train className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">No trains found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {fetchError
                  ? fetchError
                  : activeCode
                  ? `No scheduled trains found matching code "${activeCode}". Check the train number and try again.`
                  : 'No scheduled trains found matching your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-stone-500 font-medium px-1">
                Showing {displayedTrains.length} {displayedTrains.length === 1 ? 'train' : 'trains'}
                {activeCode ? ` for code "${activeCode}"` : ''}
              </div>
              {displayedTrains.map((journey) => (
                <TrainCard
                  key={journey.id}
                  journey={journey}
                  onPressDetails={(j) => setSelectedJourney(j)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Train Details Modal for on-demand route/stop details */}
      <TrainDetailModal
        journey={selectedJourney}
        isOpen={Boolean(selectedJourney)}
        onClose={() => setSelectedJourney(null)}
      />
      </div>
    </div>
  );
}

export default function TrainsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <TrainsGhostSkeleton fullPage />
        </div>
      }
    >
      <TrainsContent />
    </Suspense>
  );
}
