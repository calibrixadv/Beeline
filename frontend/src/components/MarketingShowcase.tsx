'use client';

import React from 'react';
import { ShieldCheck, Zap, Globe, Leaf, Clock, Award } from 'lucide-react';
import BaseCard from './BaseCard';

export const MarketingShowcase: React.FC = () => {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Romanian Transfer Shield',
      desc: 'Smart risk assessment analyzing operator punctuality, buffer margins, and connection guarantees across CFR, Metrorex, and STB.',
      badge: '0-100 Risk Score',
    },
    {
      icon: Zap,
      title: 'Real-Time Corridors',
      desc: 'Door-to-door itinerary planning combining express rail, inner-city subway, and municipal trams into unified timetables.',
      badge: 'Multi-Modal Sync',
    },
    {
      icon: Leaf,
      title: 'Eco Analytics',
      desc: 'Track exact carbon emission reductions per trip compared to domestic flights and passenger cars.',
      badge: '~85% CO₂ Saved',
    },
    {
      icon: Globe,
      title: 'Cross-Network Coverage',
      desc: 'Direct connection to CFR Călători, Astra Trans Carpatic, Transferoviar Călători (TFC), Metrorex, Transurb Galați, and STB.',
      badge: '6 Major Operators',
    },
  ];

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs uppercase font-bold tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
          The Beeline Difference
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight mt-3">
          Travel Through Romania with Confidence
        </h2>
        <p className="text-sm text-stone-600 mt-2">
          Engineered for travelers navigating multi-operator rail and urban transit networks without missed connections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <BaseCard
              key={f.title}
              variant="elevated"
              hoverEffect
              className="p-5 flex flex-col justify-between border border-amber-100/80 bg-white"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-stone-900">{f.title}</h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            </BaseCard>
          );
        })}
      </div>
    </section>
  );
};

export default MarketingShowcase;
