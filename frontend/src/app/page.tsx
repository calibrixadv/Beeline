'use client';

import React from 'react';
import RouteFinderCard from '../components/RouteFinderCard';
import MarketingShowcase from '../components/MarketingShowcase';
import MascotBee from '../components/MascotBee';

export default function HomePage() {
  return (
    <div className="py-8 md:py-14 px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <MascotBee name="honey" size="md" />
          <span className="text-xs font-bold tracking-widest uppercase bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 rounded-full">
            Romanian Transfer Shield Verified
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight">
          Smarter Transit Journeys Across Romania
        </h1>
        <p className="mt-3 text-base text-stone-600 max-w-xl mx-auto">
          Compare express rail, inner-city metro, and regional buses with accurate fares, zero hidden delays, and automated connection shields.
        </p>
      </div>

      {/* 2-Point Search Feature (Zero Map Invariant strictly enforced) */}
      <RouteFinderCard />

      {/* Marketing Showcase */}
      <MarketingShowcase />
    </div>
  );
}
