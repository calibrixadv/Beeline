'use client';

import React from 'react';

export interface TripsGhostSkeletonProps {
  cardCount?: number;
  compact?: boolean;
  fullPage?: boolean;
}

const SUMMARY_BORDER_ACCENTS = [
  'border-amber-300/50',
  'border-blue-300/50',
  'border-emerald-300/50',
];

export const TripsGhostSkeleton: React.FC<TripsGhostSkeletonProps> = ({
  cardCount = 4,
  compact = false,
  fullPage = false,
}) => {
  const summaryCount = compact ? 1 : 3;
  const tripsCount = compact ? (cardCount ?? 1) : cardCount;

  return (
    <div
      data-testid="trips-ghost-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading available train routes"
      className="w-full space-y-6"
    >
      {/* Full Page Mode: Top date bar + Search bar + Filters ghost skeletons */}
      {fullPage && (
        <div className="space-y-4">
          {/* Day Navigation Bar Skeleton */}
          <div
            data-testid="ghost-trips-date-bar"
            className="glass-ghost-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-xl glass-ghost-bar shrink-0" />
              <div className="h-8 w-44 rounded-xl glass-ghost-bar" />
              <div className="w-8 h-8 rounded-xl glass-ghost-bar shrink-0" />
            </div>
            <div className="h-6 w-52 rounded-full glass-ghost-bar hidden sm:block" />
            <div className="glass-shimmer-overlay" aria-hidden="true" />
          </div>

          {/* Location / Station Search Bar Skeleton */}
          <div
            data-testid="ghost-trips-search-bar"
            className="glass-ghost-card rounded-3xl p-5 md:p-6 space-y-4"
          >
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="w-full space-y-1.5">
                <div className="h-3 w-16 rounded-full glass-ghost-bar" />
                <div className="h-11 w-full rounded-2xl glass-ghost-bar" />
              </div>
              <div className="md:mt-5 p-2 rounded-full glass-ghost-bar w-9 h-9 shrink-0" />
              <div className="w-full space-y-1.5">
                <div className="h-3 w-24 rounded-full glass-ghost-bar" />
                <div className="h-11 w-full rounded-2xl glass-ghost-bar" />
              </div>
              <div className="w-full md:w-auto md:mt-5">
                <div className="h-11 w-full md:w-28 rounded-2xl glass-ghost-bar" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-amber-200/30 flex-wrap gap-2">
              <div className="h-6 w-56 rounded-lg glass-ghost-bar" />
              <div className="h-6 w-40 rounded-lg glass-ghost-bar" />
            </div>
            <div
              className="glass-shimmer-overlay"
              style={{ animationDelay: '80ms' }}
              aria-hidden="true"
            />
          </div>

          {/* Filter Bar Skeleton */}
          <div
            data-testid="ghost-trips-filter-bar"
            className="glass-ghost-card rounded-2xl p-3.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-7 w-20 rounded-xl glass-ghost-bar" />
              <div className="h-7 w-24 rounded-xl glass-ghost-bar" />
              <div className="h-7 w-24 rounded-xl glass-ghost-bar" />
            </div>
            <div className="h-7 w-20 rounded-xl glass-ghost-bar" />
            <div
              className="glass-shimmer-overlay"
              style={{ animationDelay: '140ms' }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      {/* Block 1 — 3 Glassy Summary Metric Ghost Cards (1 if compact) */}
      <div
        className={
          compact
            ? 'grid grid-cols-1 gap-3'
            : 'grid grid-cols-1 md:grid-cols-3 gap-4'
        }
      >
        {Array.from({ length: summaryCount }).map((_, idx) => (
          <div
            key={idx}
            data-testid="ghost-summary-card"
            className={`glass-ghost-card rounded-2xl p-4 flex items-center gap-3.5 ${SUMMARY_BORDER_ACCENTS[idx % SUMMARY_BORDER_ACCENTS.length]}`}
          >
            {/* Icon placeholder */}
            <div className="w-10 h-10 rounded-xl glass-ghost-bar shrink-0" />

            {/* Stacked bar placeholders (eyebrow + value) */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-2.5 w-20 rounded-full glass-ghost-bar" />
              <div className="h-6 w-28 rounded-lg glass-ghost-bar" />
            </div>

            {/* Shimmer sweep overlay */}
            <div
              className="glass-shimmer-overlay"
              style={{ animationDelay: `${idx * 120}ms` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      {/* Block 2 — Count Header Ghost Bar (only when !compact) */}
      {!compact && (
        <div className="flex items-center gap-2 px-1">
          <div className="h-4 w-64 rounded-full glass-ghost-bar" />
        </div>
      )}

      {/* Block 3 — Glassy Trip Result Ghost Cards */}
      <div className="space-y-4">
        {Array.from({ length: tripsCount }).map((_, idx) => (
          <div
            key={idx}
            data-testid="ghost-trip-card"
            className="glass-ghost-card rounded-3xl p-5 sm:p-6"
          >
            {/* Top row: 3 pill placeholders */}
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-amber-200/30 flex-wrap">
              <div className="h-6 w-32 rounded-full glass-ghost-bar" />
              <div className="h-6 w-16 rounded-lg glass-ghost-bar" />
              <div className="h-6 w-28 rounded-full glass-ghost-bar" />
            </div>

            {/* Middle/Main row (responsive flex/grid) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Departure, Duration/Track, Arrival */}
              <div className="flex items-center gap-4 flex-1">
                {/* Left: departure time bar + origin station bar */}
                <div className="space-y-1.5 shrink-0">
                  <div className="h-8 w-16 rounded-lg glass-ghost-bar" />
                  <div className="h-3.5 w-24 rounded-full glass-ghost-bar" />
                </div>

                {/* Center: duration pill + horizontal rail track line + operator tag */}
                <div className="flex-1 flex flex-col items-center px-2 space-y-1.5">
                  <div className="h-3 w-14 rounded-full glass-ghost-bar" />
                  <div className="w-full flex items-center gap-1">
                    <div className="h-1 flex-1 rounded-full glass-ghost-bar" />
                  </div>
                  <div className="h-3 w-20 rounded-full glass-ghost-bar" />
                </div>

                {/* Right-center: arrival time bar + destination station bar */}
                <div className="space-y-1.5 shrink-0 text-right flex flex-col items-end">
                  <div className="h-8 w-16 rounded-lg glass-ghost-bar" />
                  <div className="h-3.5 w-24 rounded-full glass-ghost-bar" />
                </div>
              </div>

              {/* Far right: price bar + action button placeholder */}
              <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-amber-200/30">
                <div className="space-y-1 md:text-right flex flex-col md:items-end">
                  <div className="h-7 w-24 rounded-lg glass-ghost-bar" />
                </div>
                <div className="h-10 w-28 rounded-xl glass-ghost-bar shrink-0" />
              </div>
            </div>

            {/* Shimmer sweep overlay */}
            <div
              className="glass-shimmer-overlay"
              style={{ animationDelay: `${(idx + 1) * 140}ms` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripsGhostSkeleton;
