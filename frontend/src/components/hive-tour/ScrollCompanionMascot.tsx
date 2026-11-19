'use client';

import React from 'react';
import MascotBee, { MascotGear, GEAR_CONFIG } from '../MascotBee';
import { HiveTourChapter } from './types';

export interface ScrollCompanionMascotProps {
  activeChapter: HiveTourChapter;
  companionGear: MascotGear;
  isVisible: boolean;
  scrollProgress: number;
  prefersReducedMotion: boolean;
}

const CHAPTER_SPEECHES: Record<HiveTourChapter, Record<string, string>> = {
  hero: {
    default: "Bumbi here! Ready to scout Romania's railway corridors. Pick your rail route!",
    fast: 'Queen Vira: "Supersonic rail mode! Non-stop InterCity express ready for departure."',
    safe: 'Queen Meli: "Transfer Shield active! Guarding your rail connections across all junctions."',
    economy: 'Queen Flora: "Comparing multi-operator rail fares to save the sweetest amount of LEI!"',
  },
  queens: {
    safe: '👑 Queen Meli: "Transfer Shield active! 95%+ connection shield protecting your rail transfers at Ploiești & Brașov."',
    fast: '⚡ Queen Vira: "Supersonic rail corridors loaded! 0 stopovers prioritized on InterCity trunk lines."',
    economy: '🍯 Queen Flora: "Comparing CFR Călători, Regio Călători, TFC, Softrans & Astra for lowest LEI!"',
    default: '👑 Bumbi: "Meet the 3 Royal Queen Bees: Queen Meli, Queen Vira, and Queen Flora!"',
  },
  providers: {
    default: '🧭 Bumbi: "The Synchronized Rail Grid: CFR Călători and private rail operators united!"',
    fast: '⚡ Queen Vira: "InterCity rail trunk lines and high-priority electric dispatch across national corridors!"',
    safe: '🛡️ Queen Meli: "Every rail operator synchronized with algorithmic junction transfer buffers!"',
    economy: '🍯 Queen Flora: "Comparing CFR Călători with private rail operators for the lowest LEI per kilometer!"',
  },
};

export const ScrollCompanionMascot: React.FC<ScrollCompanionMascotProps> = ({
  activeChapter,
  companionGear,
  isVisible,
  scrollProgress,
  prefersReducedMotion,
}) => {
  if (!isVisible || activeChapter === 'hero') {
    return null;
  }

  const gearConfig = GEAR_CONFIG[companionGear];
  const chapterSpeeches = CHAPTER_SPEECHES[activeChapter] || CHAPTER_SPEECHES.hero;
  const speechText =
    chapterSpeeches[companionGear] ||
    chapterSpeeches.default ||
    gearConfig.speechDefault;

  // Gentle vertical floating position along the viewport side
  // In reduced motion, fixed position without dynamic translation
  const translateY = prefersReducedMotion
    ? 0
    : Math.sin(scrollProgress * Math.PI * 4) * 12;

  return (
    <aside
      data-testid="scroll-companion-guide"
      data-chapter={activeChapter}
      data-companion-gear={companionGear}
      aria-label="Interactive Mascot Travel Guide"
      className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-30 pointer-events-none select-none flex flex-col items-end transition-opacity duration-500 ease-out"
    >
      {/* Non-blocking Compact Companion Speech Bubble */}
      <div
        aria-live="polite"
        className="pointer-events-none mb-2 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-lg border max-w-[240px] sm:max-w-[280px] text-right transition-all duration-300 animate-fade-in"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: gearConfig.borderColor,
          color: '#1E1B18',
          boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.2), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider font-extrabold mb-0.5" style={{ color: gearConfig.color }}>
          <span>{gearConfig.accessoryIcon}</span>
          <span>{gearConfig.characterName} • HIVE TOUR GUIDE</span>
        </div>
        <p className="leading-snug text-stone-800 text-[11px] sm:text-xs">
          {speechText}
        </p>

        {/* Bubble Speech Tail */}
        <div
          className="w-2.5 h-2.5 rotate-45 absolute -bottom-1 right-7 border-r border-b"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: gearConfig.borderColor,
          }}
        />
      </div>

      {/* Floating Companion Mascot Graphic */}
      <div
        className="pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(0, ${translateY}px, 0)`,
        }}
      >
        <div className="filter drop-shadow-md">
          <MascotBee
            gear={companionGear}
            size="lg"
            animated={!prefersReducedMotion}
            showAccessoryBadge={true}
          />
        </div>
      </div>
    </aside>
  );
};

export default ScrollCompanionMascot;
