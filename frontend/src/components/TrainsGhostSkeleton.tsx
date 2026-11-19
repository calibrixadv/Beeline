'use client';

import React from 'react';

export interface TrainsGhostSkeletonProps {
  cardCount?: number;
  fullPage?: boolean;
}

export const TrainsGhostSkeleton: React.FC<TrainsGhostSkeletonProps> = ({
  cardCount = 6,
  fullPage = false,
}) => {
  return (
    <div
      data-testid="trains-ghost-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading trains"
      className="w-full space-y-6"
    >
      {/* Full Page Mode: Header + Search/Filter Bar Skeleton */}
      {fullPage && (
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl glass-ghost-bar" />
              <div className="h-4 w-80 max-w-full rounded-full glass-ghost-bar" />
            </div>
            <div className="w-12 h-12 rounded-2xl glass-ghost-bar shrink-0" />
          </div>

          {/* Search & Status Filters Card Skeleton */}
          <div
            data-testid="ghost-trains-filter-bar"
            className="glass-ghost-card rounded-2xl p-4 md:p-5 space-y-3"
          >
            <div className="h-11 w-full rounded-xl glass-ghost-bar" />
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <div className="h-6 w-16 rounded-full glass-ghost-bar" />
              <div className="h-7 w-20 rounded-xl glass-ghost-bar" />
              <div className="h-7 w-20 rounded-xl glass-ghost-bar" />
              <div className="h-7 w-20 rounded-xl glass-ghost-bar" />
            </div>
            <div className="glass-shimmer-overlay" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Train Cards Ghost Grid/List */}
      <div className="space-y-4">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            data-testid="ghost-train-card"
            className="glass-ghost-card rounded-3xl p-5 sm:p-6"
          >
            {/* Top row: train number pill, operator pill, live status pill */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200/30 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 rounded-full glass-ghost-bar" />
                <div className="h-6 w-28 rounded-full glass-ghost-bar" />
              </div>
              <div className="h-6 w-20 rounded-full glass-ghost-bar" />
            </div>

            {/* Route row: departure time + origin ── track bar ── arrival time + destination */}
            <div className="flex items-center justify-between gap-4 py-2">
              {/* Departure */}
              <div className="space-y-1.5 shrink-0">
                <div className="h-7 w-16 rounded-lg glass-ghost-bar" />
                <div className="h-3.5 w-28 rounded-full glass-ghost-bar" />
              </div>

              {/* Center Track Bar */}
              <div className="flex-1 flex flex-col items-center px-2 space-y-1.5">
                <div className="h-3 w-16 rounded-full glass-ghost-bar" />
                <div className="w-full flex items-center">
                  <div className="h-1 flex-1 rounded-full glass-ghost-bar" />
                </div>
              </div>

              {/* Arrival */}
              <div className="space-y-1.5 shrink-0 text-right flex flex-col items-end">
                <div className="h-7 w-16 rounded-lg glass-ghost-bar" />
                <div className="h-3.5 w-28 rounded-full glass-ghost-bar" />
              </div>
            </div>

            {/* Footer row: amenity/fare pills + detail action button bar */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-amber-200/30 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-24 rounded-lg glass-ghost-bar" />
                <div className="h-6 w-16 rounded-lg glass-ghost-bar" />
              </div>
              <div className="h-9 w-28 rounded-xl glass-ghost-bar shrink-0" />
            </div>

            {/* Shimmer sweep overlay with staggered delay */}
            <div
              className="glass-shimmer-overlay"
              style={{ animationDelay: `${(idx + 1) * 120}ms` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainsGhostSkeleton;
