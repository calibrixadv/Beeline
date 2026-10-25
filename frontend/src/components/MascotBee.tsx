'use client';

import React from 'react';

export type MascotName = 'barnaby' | 'honey' | 'bumble';
export type MascotSize = 'sm' | 'md' | 'lg' | 'xl';

export interface MascotBeeProps {
  name: MascotName;
  size?: MascotSize;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
  accessibilityLabel?: string;
}

const SIZE_PX: Record<MascotSize, number> = {
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
};

const PERSONA_CONFIG: Record<
  MascotName,
  { label: string; badge: string; color: string; accessory: string }
> = {
  barnaby: {
    label: 'Barnaby Scout',
    badge: '⚡ FASTEST',
    color: '#3B82F6',
    accessory: '⚡',
  },
  honey: {
    label: 'Honey Saver',
    badge: '💰 BEST VALUE',
    color: '#F59E0B',
    accessory: '🍯',
  },
  bumble: {
    label: 'Bumble Guard',
    badge: '🛡️ RELIABLE',
    color: '#10B981',
    accessory: '🛡️',
  },
};

export const MascotBee: React.FC<MascotBeeProps> = ({
  name,
  size = 'md',
  animated = true,
  className = '',
  onClick,
  accessibilityLabel,
}) => {
  const px = SIZE_PX[size];
  const persona = PERSONA_CONFIG[name] || PERSONA_CONFIG.honey;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={accessibilityLabel || persona.label}
      tabIndex={onClick ? 0 : undefined}
      className={`inline-flex items-center justify-center relative select-none ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        className={animated ? 'animate-bounce duration-1000' : ''}
        style={{ animationDuration: '3s' }}
      >
        {/* Wings */}
        <ellipse
          cx="32"
          cy="30"
          rx="18"
          ry="10"
          transform="rotate(-30 32 30)"
          fill="#E0F2FE"
          opacity="0.8"
          stroke="#BAE6FD"
          strokeWidth="2"
        />
        <ellipse
          cx="68"
          cy="30"
          rx="18"
          ry="10"
          transform="rotate(30 68 30)"
          fill="#E0F2FE"
          opacity="0.8"
          stroke="#BAE6FD"
          strokeWidth="2"
        />

        {/* Bee Body (Yellow & Black stripes) */}
        <ellipse cx="50" cy="55" rx="28" ry="32" fill="#FBBF24" />
        
        {/* Stripes */}
        <path d="M 23 45 Q 50 49 77 45" stroke="#1E1B18" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 22 57 Q 50 61 78 57" stroke="#1E1B18" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 28 69 Q 50 72 72 69" stroke="#1E1B18" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* Stinger */}
        <polygon points="50,88 46,94 54,94" fill="#1E1B18" />

        {/* Cheerful Eyes */}
        <circle cx="42" cy="38" r="4" fill="#1E1B18" />
        <circle cx="58" cy="38" r="4" fill="#1E1B18" />
        <circle cx="43.5" cy="36.5" r="1.5" fill="#FFFFFF" />
        <circle cx="59.5" cy="36.5" r="1.5" fill="#FFFFFF" />

        {/* Rosy Cheeks */}
        <ellipse cx="36" cy="42" rx="3" ry="1.5" fill="#F87171" opacity="0.6" />
        <ellipse cx="64" cy="42" rx="3" ry="1.5" fill="#F87171" opacity="0.6" />

        {/* Smile */}
        <path d="M 45 44 Q 50 49 55 44" stroke="#1E1B18" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Antennae */}
        <path d="M 43 25 Q 38 15 32 18" stroke="#1E1B18" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="18" r="3" fill="#F59E0B" />
        <path d="M 57 25 Q 62 15 68 18" stroke="#1E1B18" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="68" cy="18" r="3" fill="#F59E0B" />
      </svg>

      {/* Floating accessory badge */}
      {size !== 'sm' && (
        <span
          className="absolute -bottom-1 -right-1 text-xs rounded-full bg-white shadow-sm border border-amber-200 px-1 py-0.5 leading-none"
          title={persona.badge}
        >
          {persona.accessory}
        </span>
      )}
    </div>
  );
};

export default MascotBee;
