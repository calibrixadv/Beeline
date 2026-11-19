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
 * Pure SVG Honey Pot (Borcanele cu Miere — Data & ML Risk Engine)
 */
export const HoneyPotSvg: React.FC<{
  size?: number;
  className?: string;
  fillPercentage?: number; // 0 to 100
}> = ({ size = 160, className = '', fillPercentage = 85 }) => {
  const honeyHeight = Math.max(10, Math.min(65, (fillPercentage / 100) * 65));
  const honeyY = 120 - honeyHeight;

  return (
    <div
      data-testid="svg-honey-pot"
      className={`inline-flex items-center justify-center relative select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        className="overflow-visible"
        aria-label="Honey Pot ML Risk Engine Illustration"
      >
        <defs>
          <linearGradient id="honeyAmberGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="potGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="80%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
          </linearGradient>
          <clipPath id="potInsideClip">
            <path d="M 40 50 Q 25 80 40 118 Q 70 124 100 118 Q 115 80 100 50 Z" />
          </clipPath>
        </defs>

        {/* Warm Glow behind pot */}
        <ellipse cx="70" cy="85" rx="45" ry="40" fill="#FEF3C7" opacity="0.6" />

        {/* Jar Pot Shadow */}
        <ellipse cx="70" cy="125" rx="36" ry="7" fill="#78350F" opacity="0.15" />

        {/* Nectar Liquid inside Glass */}
        <g clipPath="url(#potInsideClip)">
          {/* Amber Honey Fill */}
          <rect
            x="20"
            y={honeyY}
            width="100"
            height={honeyHeight + 10}
            fill="url(#honeyAmberGrad)"
            className="transition-all duration-700 ease-out"
          />
          {/* Wavy Honey Surface */}
          <path
            d={`M 25 ${honeyY} Q 45 ${honeyY - 4} 70 ${honeyY} T 115 ${honeyY} L 115 ${honeyY + 10} L 25 ${honeyY + 10} Z`}
            fill="#FEF08A"
            opacity="0.85"
          />
          {/* Honey Bubbles */}
          <circle cx="55" cy={honeyY + 18} r="2.5" fill="#FEF08A" opacity="0.6" />
          <circle cx="85" cy={honeyY + 28} r="3.2" fill="#FEF08A" opacity="0.5" />
          <circle cx="68" cy={honeyY + 38} r="2" fill="#FEF08A" opacity="0.7" />
        </g>

        {/* Glass Pot Outer Outline & Volume */}
        <path
          d="M 40 50 Q 25 80 40 118 Q 70 124 100 118 Q 115 80 100 50 Z"
          fill="url(#potGlassGrad)"
          stroke="#B45309"
          strokeWidth="2.2"
        />

        {/* Glass Specular Highlights */}
        <path
          d="M 37 62 Q 30 84 38 108"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Pot Neck / Rim */}
        <ellipse cx="70" cy="50" rx="32" ry="7" fill="#FEF3C7" stroke="#B45309" strokeWidth="2.2" />

        {/* Rustic Cloth Lid with Twine Ribbon */}
        <ellipse cx="70" cy="45" rx="34" ry="6" fill="#FBBF24" stroke="#92400E" strokeWidth="1.8" />
        <path
          d="M 36 45 Q 40 56 46 54 Q 70 58 94 54 Q 100 56 104 45"
          fill="#FDE68A"
          stroke="#92400E"
          strokeWidth="1.5"
        />
        {/* Twine String Tied in Bow */}
        <path d="M 38 49 Q 70 54 102 49" stroke="#78350F" strokeWidth="2" fill="none" />
        <circle cx="70" cy="52" r="3" fill="#78350F" />
        <path d="M 70 52 Q 62 60 58 55 M 70 52 Q 78 60 82 55" stroke="#78350F" strokeWidth="1.5" fill="none" />

        {/* Label Badge on Jar: "95% ML BUFFER" or "HONEY" */}
        <rect x="50" y="78" width="40" height="22" rx="4" fill="#FFFBEB" stroke="#B45309" strokeWidth="1.2" />
        <text x="70" y="88" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#92400E">
          ML BUFFER
        </text>
        <text x="70" y="96" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#059669">
          95%+ SAFE
        </text>
      </svg>
    </div>
  );
};

/**
 * Pure SVG Honey Spoon / Dipper (Lingurița de Miere — Smooth Zero-Friction Booking)
 */
export const HoneySpoonSvg: React.FC<{
  size?: number;
  className?: string;
  isDrizzling?: boolean;
}> = ({ size = 160, className = '', isDrizzling = true }) => {
  return (
    <div
      data-testid="svg-honey-spoon"
      className={`inline-flex items-center justify-center relative select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        className="overflow-visible"
        aria-label="Wooden Honey Dipper Drizzling Golden Nectar Illustration"
      >
        <defs>
          <linearGradient id="woodDipperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="drizzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Dipper Group: tilted at 35 degrees */}
        <g transform="rotate(35 80 60)">
          {/* Long Wooden Handle */}
          <rect x="76" y="10" width="8" height="60" rx="4" fill="url(#woodDipperGrad)" stroke="#78350F" strokeWidth="1.2" />
          {/* Handle Top Ring */}
          <circle cx="80" cy="12" r="5" fill="#B45309" stroke="#78350F" strokeWidth="1" />

          {/* Dipper Head Grooves / Ridges */}
          <ellipse cx="80" cy="72" rx="14" ry="5" fill="url(#woodDipperGrad)" stroke="#78350F" strokeWidth="1.2" />
          <ellipse cx="80" cy="79" rx="17" ry="6" fill="url(#woodDipperGrad)" stroke="#78350F" strokeWidth="1.2" />
          <ellipse cx="80" cy="87" rx="18" ry="6.5" fill="url(#woodDipperGrad)" stroke="#78350F" strokeWidth="1.2" />
          <ellipse cx="80" cy="95" rx="16" ry="6" fill="url(#woodDipperGrad)" stroke="#78350F" strokeWidth="1.2" />
          <ellipse cx="80" cy="102" rx="12" ry="4.5" fill="url(#woodDipperGrad)" stroke="#78350F" strokeWidth="1.2" />

          {/* Thick Amber Honey Coated on Dipper Head */}
          <path
            d="M 64 85 Q 80 112 96 85 Q 98 104 80 108 Q 62 104 64 85 Z"
            fill="url(#drizzleGrad)"
            opacity="0.92"
          />
        </g>

        {/* Smooth Continuous Ribbon of Dripping Golden Nectar */}
        {isDrizzling && (
          <g className="animate-drizzle-nectar">
            {/* Main Honey Stream */}
            <path
              d="M 88 102 Q 85 115 88 128 Q 91 140 87 152"
              stroke="url(#drizzleGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Thin trailing strand */}
            <path
              d="M 91 106 Q 93 118 90 132"
              stroke="#FEF08A"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            {/* Droplet ready to fall */}
            <ellipse cx="87" cy="154" rx="3.5" ry="5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
            <circle cx="86" cy="153" r="1.2" fill="#FFFFFF" opacity="0.8" />
          </g>
        )}
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
