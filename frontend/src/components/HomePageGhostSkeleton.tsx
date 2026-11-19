'use client';

import React from 'react';

export const HomePageGhostSkeleton: React.FC = () => {
  return (
    <div
      data-testid="homepage-ghost-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Beeline home page"
      className="relative z-10 w-full flex flex-col items-center"
    >
      {/* Block 1 — Above-the-Fold Hero Ghost Layout */}
      <div className="min-h-[calc(100dvh-4rem)] w-full max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center py-8 gap-6">
        {/* Brand Header Ghost: centered translucent shimmer bars matching h1, h2, sub-line */}
        <div className="flex flex-col items-center text-center gap-3 w-full">
          <div className="h-12 w-44 rounded-2xl glass-ghost-bar" />
          <div className="h-9 w-full max-w-xl rounded-xl glass-ghost-bar" />
          <div className="h-4 w-full max-w-lg rounded-full glass-ghost-bar" />
        </div>

        {/* Search Card Ghost */}
        <div
          data-testid="ghost-hero-search-card"
          className="glass-ghost-card w-full rounded-3xl p-5 sm:p-7 space-y-5"
        >
          {/* Row 1 (Origin + Swap + Destination) */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="h-12 flex-1 w-full rounded-2xl glass-ghost-bar" />
            <div className="w-10 h-10 rounded-full glass-ghost-bar shrink-0" />
            <div className="h-12 flex-1 w-full rounded-2xl glass-ghost-bar" />
          </div>

          {/* Row 2 (Date Stepper) */}
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 rounded-xl glass-ghost-bar shrink-0" />
            <div className="h-11 flex-1 rounded-xl glass-ghost-bar" />
            <div className="h-11 w-11 rounded-xl glass-ghost-bar shrink-0" />
          </div>

          {/* Row 3 (Preference Selector) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 rounded-xl glass-ghost-bar" />
            <div className="h-10 rounded-xl glass-ghost-bar" />
            <div className="h-10 rounded-xl glass-ghost-bar" />
          </div>

          {/* Row 4 (Popular Corridors) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-7 w-32 rounded-full glass-ghost-bar" />
            <div className="h-7 w-32 rounded-full glass-ghost-bar" />
            <div className="h-7 w-32 rounded-full glass-ghost-bar" />
          </div>

          {/* Row 5 (Submit CTA) */}
          <div className="h-12 w-full rounded-2xl glass-ghost-bar" />

          {/* Shimmer overlay */}
          <div className="glass-shimmer-overlay" aria-hidden="true" />
        </div>
      </div>

      {/* Block 2 — Below-the-Fold Chapter 1 Preview Ghost */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 140, 280].map((delayMs, idx) => (
            <div
              key={idx}
              data-testid="ghost-queen-card"
              className="glass-ghost-card rounded-3xl p-6 h-56 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl glass-ghost-bar" />
                  <div className="w-16 h-6 rounded-full glass-ghost-bar" />
                </div>
                <div className="h-5 w-36 rounded-lg glass-ghost-bar" />
                <div className="h-3.5 w-full rounded-full glass-ghost-bar" />
                <div className="h-3.5 w-4/5 rounded-full glass-ghost-bar" />
              </div>
              <div className="h-4 w-28 rounded-full glass-ghost-bar" />
              <div
                className="glass-shimmer-overlay"
                style={{ animationDelay: `${delayMs}ms` }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePageGhostSkeleton;
