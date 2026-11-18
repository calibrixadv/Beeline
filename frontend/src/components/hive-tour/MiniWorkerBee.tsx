'use client';

import React from 'react';
import { MiniBeeVariant } from './types';

export interface MiniWorkerBeeProps {
  variant: MiniBeeVariant;
  size?: number; // default 16
  className?: string;
  delayMs?: number;
}

export const MiniWorkerBee: React.FC<MiniWorkerBeeProps> = ({
  variant,
  size = 18,
  className = '',
  delayMs = 0,
}) => {
  // Variant palette
  const colors = {
    fast: {
      body: '#3B82F6',
      stripe: '#1D4ED8',
      wing: '#BAE6FD',
      accent: '#60A5FA',
    },
    safe: {
      body: '#10B981',
      stripe: '#065F46',
      wing: '#A7F3D0',
      accent: '#34D399',
    },
    economy: {
      body: '#F59E0B',
      stripe: '#92400E',
      wing: '#FDE68A',
      accent: '#FDE047',
    },
  }[variant];

  const animationClass = {
    fast: 'animate-mini-bee-fast',
    safe: 'animate-mini-bee-safe',
    economy: 'animate-mini-bee-economy',
  }[variant];

  return (
    <div
      data-mini-bee-variant={variant}
      className={`inline-flex items-center justify-center pointer-events-none select-none ${animationClass} ${className}`}
      style={{
        animationDelay: `${delayMs}ms`,
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Archetype Accent 1: Speed dashes behind fast bee */}
        {variant === 'fast' && (
          <g opacity="0.8">
            <line x1="1" y1="10" x2="5" y2="10" stroke={colors.accent} strokeWidth="1.2" strokeLinecap="round" />
            <line x1="2" y1="14" x2="6" y2="14" stroke={colors.accent} strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )}

        {/* Archetype Accent 2: Protective shield halo around safe bee */}
        {variant === 'safe' && (
          <circle
            cx="13"
            cy="12"
            r="9"
            fill="none"
            stroke={colors.accent}
            strokeWidth="0.9"
            strokeDasharray="3 2"
            opacity="0.85"
          />
        )}

        {/* Primitive 1: Tiny Wing Droplet */}
        <ellipse
          cx="11"
          cy="7"
          rx="4"
          ry="2.5"
          fill={colors.wing}
          opacity="0.85"
          transform="rotate(-20 11 7)"
        />

        {/* Primitive 2: Rounded Pill/Oval Body */}
        <ellipse
          cx="13"
          cy="12"
          rx="6"
          ry="4"
          fill={colors.body}
          stroke={colors.stripe}
          strokeWidth="0.8"
        />

        {/* Primitive 3: Single Stripe */}
        <path
          d="M 13 8.2 L 13 15.8"
          stroke={colors.stripe}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Archetype Accent 3: Tiny Golden Pollen Dot for economy bee */}
        {variant === 'economy' && (
          <circle
            cx="18"
            cy="14"
            r="1.8"
            fill={colors.accent}
            stroke={colors.stripe}
            strokeWidth="0.5"
          />
        )}
      </svg>
    </div>
  );
};

export default MiniWorkerBee;
