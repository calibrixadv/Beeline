'use client';

import React, { useState } from 'react';
import { Compass, Sparkles, ArrowUp, Activity, CheckCircle, ShieldAlert } from 'lucide-react';
import BaseCard from '../BaseCard';
import BaseButton from '../BaseButton';
import { BeehiveSvg, HoneyPotSvg, HoneySpoonSvg } from './HiveSvgProps';
import MiniWorkerBee from './MiniWorkerBee';

export interface CozyHiveSectionProps {
  onScrollToHero: () => void;
  scrollProgress: number;
}

export const CozyHiveSection: React.FC<CozyHiveSectionProps> = ({
  onScrollToHero,
  scrollProgress,
}) => {
  const [activeProp, setActiveProp] = useState<'pot' | 'spoon' | 'hive'>('pot');

  // Compute honey pot dynamic fill level based on scrollProgress
  const fillLevel = Math.min(100, Math.max(50, Math.round(50 + scrollProgress * 50)));

  return (
    <section
      id="tour-ecosystem"
      aria-label="Inside the Cozy Hive — Platform Architecture & Nectar Mechanics"
      className="relative w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
    >
      {/* Chapter 3 Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 mb-3 shadow-xs">
          <Compass className="w-3.5 h-3.5 text-amber-600" />
          <span>CHAPTER 3 • THE NECTAR ENGINE</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
          Inside The Cozy Hive
        </h3>
        <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
          Behind our friendly mascots beats an industrial 51-model railway machine learning engine trained
          on 1,521,651 real Romanian rail runs. Explore the physical nectar mechanics that keep your train
          connections punctual, calibrated, and stress-free.
        </p>
      </div>

      {/* 3 Physical Honey Props Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-12">
        {/* Prop 1: The Nectar Telemetry Pots (ML Risk Engine) */}
        <BaseCard
          variant="elevated"
          className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${
            activeProp === 'pot'
              ? 'border-amber-400 bg-amber-50/40 shadow-lg'
              : 'border-amber-200/80 hover:border-amber-300 bg-white'
          }`}
          onClick={() => setActiveProp('pot')}
        >
          <div className="relative mb-3 flex items-center justify-center">
            <HoneyPotSvg size={140} fillPercentage={fillLevel} />
            <div className="absolute top-1 right-1">
              <MiniWorkerBee variant="safe" size={16} delayMs={200} />
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 mb-2">
            DATA & ML BUFFER
          </span>

          <h4 className="text-lg font-black text-stone-900 mb-1">
            The Nectar Telemetry Pots
          </h4>
          <div className="text-xs font-bold text-amber-700 mb-2">
            Multi-Source Railway Physics & Causal Telemetry
          </div>

          <p className="text-xs text-stone-600 leading-relaxed mb-4">
            Just like honeycombs store liquid nectar, Beeline’s 51-model engine fills dynamic pots with live
            Romanian railway physics: (1) Causal Completed-Arrival Contagion (t_arr,j^actual &lt; t_dep,i with
            zero future lookahead) tracking rolling-stock turnaround cascades, (2) Single-Track Crossing Bottlenecks
            (Galați–Făurei and Line 300 mountain passes), and (3) 3-Point Corridor Weather Stress (summer rail
            thermal expansion &gt;32°C and winter switch-freeze indices) trained on 1,521,651 real train runs.
          </p>

          <div className="mt-auto w-full pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              {fillLevel}% Live Rail Telemetry
            </span>
            <span className="font-bold text-amber-800">1.52M Runs Trained</span>
          </div>
        </BaseCard>

        {/* Prop 2: The Calibrated Nectar Dipper (Sub-Millisecond Edge Inference) */}
        <BaseCard
          variant="elevated"
          className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${
            activeProp === 'spoon'
              ? 'border-amber-400 bg-amber-50/40 shadow-lg'
              : 'border-amber-200/80 hover:border-amber-300 bg-white'
          }`}
          onClick={() => setActiveProp('spoon')}
        >
          <div className="relative mb-3 flex items-center justify-center">
            <HoneySpoonSvg size={140} isDrizzling={true} />
            <div className="absolute top-2 left-1">
              <MiniWorkerBee variant="economy" size={16} delayMs={500} />
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 mb-2">
            INFERENCE & CALIBRATION
          </span>

          <h4 className="text-lg font-black text-stone-900 mb-1">
            The Calibrated Nectar Dipper
          </h4>
          <div className="text-xs font-bold text-amber-700 mb-2">
            Sub-Millisecond Edge Inference & Calibration
          </div>

          <p className="text-xs text-stone-600 leading-relaxed mb-4">
            No more deciphering archaic station timetables or unformatted PDF schedules. Beeline’s multi-head
            gradient-boosted and quantile ensemble distills 45+ railway physics variables into a calibrated
            Connection Guarantee (%) and Expected Delay (min) in under 1.5ms edge inference with 0.17% ECE
            isotonic calibration error.
          </p>

          <div className="mt-auto w-full pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              &lt; 1.5ms Edge Inference
            </span>
            <span className="font-bold text-amber-800">0.17% Calibration Error</span>
          </div>
        </BaseCard>

        {/* Prop 3: The Junction Transfer Beehive (Algorithmic Transfer Shield) */}
        <BaseCard
          variant="elevated"
          className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${
            activeProp === 'hive'
              ? 'border-amber-400 bg-amber-50/40 shadow-lg'
              : 'border-amber-200/80 hover:border-amber-300 bg-white'
          }`}
          onClick={() => setActiveProp('hive')}
        >
          <div className="relative mb-3 flex items-center justify-center">
            <BeehiveSvg size={140} isHovered={activeProp === 'hive'} />
            <div className="absolute bottom-1 right-2">
              <MiniWorkerBee variant="fast" size={16} delayMs={800} />
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 mb-2">
            DISRUPTION SHIELD
          </span>

          <h4 className="text-lg font-black text-stone-900 mb-1">
            The Junction Transfer Beehive
          </h4>
          <div className="text-xs font-bold text-amber-700 mb-2">
            Algorithmic Transfer Shield & Real-Time Rerouting
          </div>

          <p className="text-xs text-stone-600 leading-relaxed mb-4">
            When single-track bottlenecks or catenary wire disruptions threaten connections, Bumbi, Queen Meli,
            Queen Vira, and Queen Flora coordinate multi-carrier train connections across Romania’s 8 primary
            railway junctions (București Nord, Brașov, Cluj-Napoca, Ploiești Sud, Făurei, Timișoara, Iași, and
            Constanța), delivering a 0.9952 missed-connection ROC-AUC transfer shield that protects passengers
            before disruptions cascade.
          </p>

          <div className="mt-auto w-full pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
              99.5% Transfer AUC
            </span>
            <span className="font-bold text-amber-800">Auto-Rerouting Shield</span>
          </div>
        </BaseCard>
      </div>

      {/* 5.2 Jump Back to Action CTA Container */}
      <div className="w-full max-w-xl mx-auto text-center pt-6 pb-4">
        <BaseCard
          variant="elevated"
          className="p-6 sm:p-8 rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/90 to-white shadow-xl"
        >
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>THE LIVING HIVE TOUR COMPLETE</span>
          </div>

          <h4 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight mb-2">
            Ready to Fly Across Romania?
          </h4>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mb-6">
            Jump back into the search form above to find synchronized CFR Călători, private rail operators,
            and protected mainline junctions in seconds.
          </p>

          <BaseButton
            type="button"
            onClick={onScrollToHero}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto px-8 py-3 text-stone-950 font-extrabold bg-amber-500 hover:bg-amber-400 shadow-lg text-sm sm:text-base transition-all hover:scale-105 active:scale-95"
            leftIcon={<ArrowUp className="w-4 h-4" />}
          >
            Ready to Fly? Plan Your Route Now
          </BaseButton>
        </BaseCard>
      </div>
    </section>
  );
};

export default CozyHiveSection;
