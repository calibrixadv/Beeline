'use client';

import React from 'react';

/**
 * Royal Crown / Queen Aura Badge for the 3 Queen Bees
 */
export const RoyalCrownSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 32 24"
      width={size}
      height={(size * 24) / 32}
      className={`overflow-visible select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="queenCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Crown Base */}
      <path
        d="M 4 20 L 28 20 L 26 22 L 6 22 Z"
        fill="#92400E"
      />
      {/* Crown Spikes */}
      <polygon
        points="4,20 6,10 11,15 16,6 21,15 26,10 28,20"
        fill="url(#queenCrownGrad)"
        stroke="#B45309"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Crown Jewels */}
      <circle cx="16" cy="6" r="2.2" fill="#EF4444" stroke="#991B1B" strokeWidth="0.6" />
      <circle cx="6" cy="10" r="1.8" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="0.5" />
      <circle cx="26" cy="10" r="1.8" fill="#10B981" stroke="#047857" strokeWidth="0.5" />
      {/* Royal Sparkle */}
      <path
        d="M 16 0 L 17 3 L 20 4 L 17 5 L 16 8 L 15 5 L 12 4 L 15 3 Z"
        fill="#FDE047"
        opacity="0.9"
        className="animate-pulse"
      />
    </svg>
  );
};

/**
 * Pure SVG Beehive (Stupul Central — Live Disruption Protection)
 */
export const BeehiveSvg: React.FC<{
  size?: number;
  className?: string;
  isHovered?: boolean;
}> = ({ size = 180, className = '', isHovered = false }) => {
  return (
    <div
      data-testid="svg-beehive"
      className={`inline-flex items-center justify-center relative select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        className="overflow-visible"
        aria-label="Cozy Central Beehive Illustration"
      >
        <defs>
          <linearGradient id="beehiveWoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="beehiveTierShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78350F" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#78350F" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hiveGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Honey Hive Glow */}
        <circle cx="80" cy="85" r="70" fill="url(#hiveGlow)" className={isHovered ? 'animate-pulse' : ''} />

        {/* Beehive Base Stand */}
        <polygon points="40,140 120,140 125,148 35,148" fill="#78350F" stroke="#451A03" strokeWidth="1.5" />
        <rect x="50" y="148" width="12" height="8" rx="2" fill="#451A03" />
        <rect x="98" y="148" width="12" height="8" rx="2" fill="#451A03" />

        {/* Layer 5 (Bottom Tier) */}
        <rect x="36" y="112" width="88" height="26" rx="10" fill="url(#beehiveWoodGrad)" stroke="#92400E" strokeWidth="2" />
        <rect x="36" y="112" width="88" height="6" rx="3" fill="url(#beehiveTierShadow)" />

        {/* Layer 4 */}
        <rect x="42" y="88" width="76" height="24" rx="9" fill="url(#beehiveWoodGrad)" stroke="#92400E" strokeWidth="2" />
        <rect x="42" y="88" width="76" height="5" rx="2.5" fill="url(#beehiveTierShadow)" />

        {/* Layer 3 */}
        <rect x="48" y="66" width="64" height="22" rx="8" fill="url(#beehiveWoodGrad)" stroke="#92400E" strokeWidth="2" />
        <rect x="48" y="66" width="64" height="4" rx="2" fill="url(#beehiveTierShadow)" />

        {/* Layer 2 */}
        <rect x="56" y="46" width="48" height="20" rx="7" fill="url(#beehiveWoodGrad)" stroke="#92400E" strokeWidth="2" />
        <rect x="56" y="46" width="48" height="4" rx="2" fill="url(#beehiveTierShadow)" />

        {/* Layer 1 (Top Dome) */}
        <path d="M 64 46 Q 80 26 96 46 Z" fill="url(#beehiveWoodGrad)" stroke="#92400E" strokeWidth="2" />
        {/* Top Handle / Wooden Knob */}
        <circle cx="80" cy="27" r="5" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />

        {/* Beehive Flight Entrance (Arched Door) */}
        <path d="M 70 138 A 10 10 0 0 1 90 138 Z" fill="#1C1917" stroke="#78350F" strokeWidth="1.5" />
        {/* Golden Honey Oozing from Door */}
        <path d="M 74 138 Q 80 144 86 138" stroke="#FBBF24" strokeWidth="2" fill="#FBBF24" />

        {/* Decorative Golden Honeycomb Insignia */}
        <polygon points="80,72 87,76 87,84 80,88 73,84 73,76" fill="#FEF3C7" stroke="#B45309" strokeWidth="1.2" />
        <polygon points="80,74 85,77 85,83 80,86 75,83 75,77" fill="#F59E0B" />

        {/* Swirling flight trails around the hive */}
        <path
          d="M 28 80 Q 40 40 80 32 T 130 65"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.6"
        />
      </svg>
    </div>
  );
};

/**
 * Pure SVG Honeycomb Hexagonal Pattern
 */
export const HoneycombSvg: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 180, className = '' }) => {
  return (
    <div
      data-testid="svg-honeycomb"
      className={`inline-flex items-center justify-center relative select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          <pattern id="hexPattern" width="30" height="52" patternUnits="userSpaceOnUse">
            <path
              d="M 15 0 L 30 8.66 L 30 26 L 15 34.64 L 0 26 L 0 8.66 Z"
              fill="#FEF3C7"
              stroke="#FDE68A"
              strokeWidth="1.2"
              opacity="0.7"
            />
            <path
              d="M 15 26 L 30 34.64 L 30 52 L 15 60.64 L 0 52 L 0 34.64 Z"
              fill="#FFFBEB"
              stroke="#FDE68A"
              strokeWidth="1.2"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="120" height="120" fill="url(#hexPattern)" />
      </svg>
    </div>
  );
};
