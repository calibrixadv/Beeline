'use client';

import React from 'react';

export type MascotGear = 'default' | 'fast' | 'safe' | 'economy';
export type MascotName = MascotGear | 'barnaby' | 'honey' | 'bumble';
export type MascotSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export interface MascotBeeProps {
  name?: MascotName;
  gear?: MascotGear;
  size?: MascotSize;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
  accessibilityLabel?: string;
  showBadge?: boolean;
  showSpeech?: boolean;
  speechText?: string;
  showAccessoryBadge?: boolean;
}

const SIZE_PX: Record<MascotSize, number> = {
  sm: 28,
  md: 44,
  lg: 72,
  xl: 112,
  '2xl': 160,
  '3xl': 240,
  '4xl': 320,
};

// Map legacy persona names to new dynamic gears
export function resolveGear(nameOrGear?: MascotName, explicitGear?: MascotGear): MascotGear {
  if (explicitGear) return explicitGear;
  if (!nameOrGear) return 'default';
  switch (nameOrGear) {
    case 'barnaby':
    case 'fast':
      return 'fast';
    case 'bumble':
    case 'safe':
      return 'safe';
    case 'honey':
    case 'economy':
      return 'economy';
    case 'default':
    default:
      return 'default';
  }
}

export interface GearMetadata {
  gear: MascotGear;
  title: string;
  badge: string;
  gearName: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  speechDefault: string;
  accessoryIcon: string;
  description: string;
}

export const GEAR_CONFIG: Record<MascotGear, GearMetadata> = {
  default: {
    gear: 'default',
    title: 'Beeline Explorer',
    badge: '🧭 EXPLORER',
    gearName: 'Aviator Goggles & Explorer Knot',
    color: '#F59E0B',
    textColor: '#92400E',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    speechDefault: 'Ready to buzz across Romania! Pick your route.',
    accessoryIcon: '🧭',
    description: 'Equipped with brass aviator goggles for navigating multi-modal Romanian journeys.',
  },
  fast: {
    gear: 'fast',
    title: 'Express Scout',
    badge: '⚡ FAST ROUTE',
    gearName: 'Supersonic Speed Visor & Scarf',
    color: '#3B82F6',
    textColor: '#1E40AF',
    bgColor: '#DBEAFE',
    borderColor: '#BFDBFE',
    speechDefault: 'Supersonic mode! Zero stopovers, maximum speed.',
    accessoryIcon: '⚡',
    description: 'Equipped with streamlined aero-helmet and lightning scarf for express rail corridors.',
  },
  safe: {
    gear: 'safe',
    title: 'Transfer Guard',
    badge: '🛡️ SAFE ROUTE',
    gearName: 'Romanian Transfer Shield',
    color: '#10B981',
    textColor: '#065F46',
    bgColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    speechDefault: 'Transfer Shield active: 100% connection guarantee!',
    accessoryIcon: '🛡️',
    description: 'Equipped with hexagonal golden shield protecting CFR and Metrorex transfers.',
  },
  economy: {
    gear: 'economy',
    title: 'Nectar Saver',
    badge: '💰 BEST VALUE',
    gearName: 'Nectar Jar & Bargain Specs',
    color: '#D97706',
    textColor: '#78350F',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    speechDefault: 'Sweetest fare found! Pocket the leftover nectar.',
    accessoryIcon: '🍯',
    description: 'Equipped with golden honey jar and wire-rim spectacles for budget-optimal travel.',
  },
};

// Retain backwards compatibility for legacy imports
export const PERSONA_CONFIG: Record<
  string,
  { label: string; badge: string; color: string; accessory: string }
> = {
  barnaby: {
    label: GEAR_CONFIG.fast.title,
    badge: GEAR_CONFIG.fast.badge,
    color: GEAR_CONFIG.fast.color,
    accessory: '⚡',
  },
  honey: {
    label: GEAR_CONFIG.economy.title,
    badge: GEAR_CONFIG.economy.badge,
    color: GEAR_CONFIG.economy.color,
    accessory: '🍯',
  },
  bumble: {
    label: GEAR_CONFIG.safe.title,
    badge: GEAR_CONFIG.safe.badge,
    color: GEAR_CONFIG.safe.color,
    accessory: '🛡️',
  },
  default: {
    label: GEAR_CONFIG.default.title,
    badge: GEAR_CONFIG.default.badge,
    color: GEAR_CONFIG.default.color,
    accessory: '🧭',
  },
  fast: {
    label: GEAR_CONFIG.fast.title,
    badge: GEAR_CONFIG.fast.badge,
    color: GEAR_CONFIG.fast.color,
    accessory: '⚡',
  },
  safe: {
    label: GEAR_CONFIG.safe.title,
    badge: GEAR_CONFIG.safe.badge,
    color: GEAR_CONFIG.safe.color,
    accessory: '🛡️',
  },
  economy: {
    label: GEAR_CONFIG.economy.title,
    badge: GEAR_CONFIG.economy.badge,
    color: GEAR_CONFIG.economy.color,
    accessory: '🍯',
  },
};

export const MascotBee: React.FC<MascotBeeProps> = ({
  name = 'default',
  gear,
  size = 'md',
  animated = true,
  className = '',
  onClick,
  accessibilityLabel,
  showBadge = false,
  showSpeech = false,
  speechText,
  showAccessoryBadge = true,
}) => {
  const currentGear = resolveGear(name, gear);
  const config = GEAR_CONFIG[currentGear];
  const px = SIZE_PX[size] || SIZE_PX.md;
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const bodyGradId = `beelineBodyGrad-${uid}`;
  const wingGradId = `beelineWingGrad-${uid}`;
  const shieldGradId = `beelineShieldGrad-${uid}`;
  const potGradId = `beelinePotGrad-${uid}`;
  const fastVisorId = `beelineFastVisor-${uid}`;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={accessibilityLabel || `${config.title} - ${config.gearName}`}
      tabIndex={onClick ? 0 : undefined}
      className={`inline-flex flex-col items-center justify-center relative select-none ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {/* Speech Bubble (Optional for Hero & Interactive Views) */}
      {showSpeech && (
        <div
          className="mb-2 px-3 py-1.5 rounded-2xl text-xs font-semibold shadow-md border animate-fade-in relative max-w-[200px] text-center"
          style={{
            backgroundColor: config.bgColor,
            color: config.textColor,
            borderColor: config.borderColor,
          }}
        >
          {speechText || config.speechDefault}
          <div
            className="w-2.5 h-2.5 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b"
            style={{
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            }}
          />
        </div>
      )}

      {/* Mascot Graphic Container */}
      <div
        className={`relative inline-flex items-center justify-center ${
          animated ? 'animate-mascot-float' : ''
        }`}
        style={{ width: px, height: px }}
      >
        <svg
          viewBox="0 0 120 120"
          width={px}
          height={px}
          className="overflow-visible"
        >
          <defs>
            {/* Rich honey gradients */}
            <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="45%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id={shieldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <linearGradient id={potGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            <linearGradient id={fastVisorId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {/* BACK LAYER: Flapping Wings */}
          <g className={animated ? 'animate-wing-left' : ''}>
            <ellipse
              cx="38"
              cy="34"
              rx="21"
              ry="13"
              fill={`url(#${wingGradId})`}
              stroke="#38BDF8"
              strokeWidth="2"
            />
            <path d="M 38 34 Q 28 30 22 32" stroke="#7DD3FC" strokeWidth="1.5" fill="none" />
          </g>
          <g className={animated ? 'animate-wing-right' : ''}>
            <ellipse
              cx="82"
              cy="34"
              rx="21"
              ry="13"
              fill={`url(#${wingGradId})`}
              stroke="#38BDF8"
              strokeWidth="2"
            />
            <path d="M 82 34 Q 92 30 98 32" stroke="#7DD3FC" strokeWidth="1.5" fill="none" />
          </g>

          {/* STINGER (Cute rounded triangle) */}
          <path
            d="M 57 100 Q 60 109 60 109 Q 60 109 63 100 Z"
            fill="#1C1917"
            strokeLinejoin="round"
          />

          {/* BEE BODY (Honey Amber Gradient) */}
          <ellipse
            cx="60"
            cy="68"
            rx="33"
            ry="35"
            fill={`url(#${bodyGradId})`}
            stroke="#D97706"
            strokeWidth="1.5"
          />

          {/* OBSIDIAN STRIPES (3D Curved volume) */}
          <path
            d="M 32 58 Q 60 64 88 58"
            stroke="#1C1917"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 30 72 Q 60 79 90 72"
            stroke="#1C1917"
            strokeWidth="6.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 36 86 Q 60 92 84 86"
            stroke="#1C1917"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* ANTENNAE with golden bobbing bulbs */}
          <path
            d="M 52 38 Q 45 23 37 27"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="37" cy="27" r="3.5" fill="#F59E0B" stroke="#1C1917" strokeWidth="1.5" />

          <path
            d="M 68 38 Q 75 23 83 27"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="83" cy="27" r="3.5" fill="#F59E0B" stroke="#1C1917" strokeWidth="1.5" />

          {/* CHEEKS */}
          <ellipse cx="43" cy="54" rx="4.5" ry="2.5" fill="#FB7185" opacity="0.65" />
          <ellipse cx="77" cy="54" rx="4.5" ry="2.5" fill="#FB7185" opacity="0.65" />

          {/* BASE EYES (Shown in default, safe, and economy) */}
          {currentGear !== 'fast' && (
            <>
              {/* Left eye */}
              <circle cx="49" cy="48" r="5" fill="#1C1917" />
              <circle cx="50.8" cy="46.2" r="1.8" fill="#FFFFFF" />
              <circle cx="47.5" cy="49.5" r="0.9" fill="#FFFFFF" />

              {/* Right eye */}
              <circle cx="71" cy="48" r="5" fill="#1C1917" />
              <circle cx="72.8" cy="46.2" r="1.8" fill="#FFFFFF" />
              <circle cx="69.5" cy="49.5" r="0.9" fill="#FFFFFF" />
            </>
          )}

          {/* SMILE */}
          <path
            d="M 54 55 Q 60 61 66 55"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M 56 56 Q 60 61 64 56 Z" fill="#F43F5E" />

          {/* ========================================================= */}
          {/* DYNAMIC GEAR OVERLAYS                                     */}
          {/* ========================================================= */}

          {/* GEAR 1: DEFAULT (Aviator Explorer Goggles on forehead + Scarf) */}
          {currentGear === 'default' && (
            <g className="transition-all duration-300">
              {/* Goggle Strap */}
              <path
                d="M 33 41 Q 60 37 87 41"
                stroke="#78350F"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Left lens */}
              <circle
                cx="47"
                cy="37"
                r="7.5"
                fill="#38BDF8"
                fillOpacity="0.45"
                stroke="#92400E"
                strokeWidth="2"
              />
              <path
                d="M 44 34 L 47 40"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.8"
              />
              {/* Right lens */}
              <circle
                cx="73"
                cy="37"
                r="7.5"
                fill="#38BDF8"
                fillOpacity="0.45"
                stroke="#92400E"
                strokeWidth="2"
              />
              <path
                d="M 70 34 L 73 40"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.8"
              />
              {/* Bridge */}
              <path d="M 54.5 37 L 65.5 37" stroke="#92400E" strokeWidth="2" />
              {/* Explorer Bandana */}
              <path
                d="M 52 64 Q 60 68 68 64 L 64 73 L 60 69 L 56 73 Z"
                fill="#EF4444"
                stroke="#B91C1C"
                strokeWidth="1"
              />
            </g>
          )}

          {/* GEAR 2: FAST (Supersonic Visor, Lightning Scarf & Speed Streaks) */}
          {currentGear === 'fast' && (
            <g className="transition-all duration-300">
              {/* Speed motion streaks behind */}
              <path
                d="M 6 46 L 22 46"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
                strokeDasharray="4 3"
              />
              <path
                d="M 12 76 L 24 76"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
                strokeDasharray="4 3"
              />

              {/* Aerodynamic Flapping Scarf */}
              <path
                d="M 36 63 Q 18 61 8 54 Q 20 68 36 67 Z"
                fill="#3B82F6"
                stroke="#1D4ED8"
                strokeWidth="1.2"
              />
              <path
                d="M 38 66 Q 16 71 10 65 Q 22 75 38 70 Z"
                fill="#60A5FA"
                opacity="0.8"
              />

              {/* Supersonic Visor over eyes */}
              <rect
                x="35"
                y="41"
                width="50"
                height="15"
                rx="7.5"
                fill={`url(#${fastVisorId})`}
                stroke="#1E40AF"
                strokeWidth="2"
              />
              {/* Visor reflection shimmer */}
              <path
                d="M 41 46 L 77 46"
                stroke="#93C5FD"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.9"
              />
              {/* Lightning Bolt Emblem */}
              <polygon
                points="77,43 73,48 76,48 72,54 79,47 76,47"
                fill="#FDE047"
                stroke="#CA8A04"
                strokeWidth="0.5"
              />
            </g>
          )}

          {/* GEAR 3: SAFE (Romanian Transfer Shield & Protective Guard Gear) */}
          {currentGear === 'safe' && (
            <g className="transition-all duration-300">
              {/* Protective Epaulets */}
              <rect
                x="32"
                y="55"
                width="8"
                height="4"
                rx="2"
                fill="#059669"
                stroke="#047857"
                strokeWidth="1"
              />
              <rect
                x="80"
                y="55"
                width="8"
                height="4"
                rx="2"
                fill="#059669"
                stroke="#047857"
                strokeWidth="1"
              />
              {/* Protective Collar */}
              <path
                d="M 46 62 Q 60 67 74 62"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Romanian Transfer Shield (Golden Hexagon Shield with Checkmark) */}
              <polygon
                points="30,58 48,58 53,77 40,91 26,77"
                fill={`url(#${shieldGradId})`}
                stroke="#059669"
                strokeWidth="2.5"
              />
              {/* Inner Shield Rim */}
              <polygon
                points="33,62 45,62 49,75 40,86 30,75"
                fill="none"
                stroke="#10B981"
                strokeWidth="1"
                opacity="0.6"
              />
              {/* Verified Checkmark on Shield */}
              <path
                d="M 34 73 L 38 77 L 46 68"
                stroke="#047857"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          )}

          {/* GEAR 4: ECONOMY (Wire-Rim Specs & Nectar Jar) */}
          {currentGear === 'economy' && (
            <g className="transition-all duration-300">
              {/* Wire-Rim Bargain Specs */}
              <circle
                cx="49"
                cy="48"
                r="6.5"
                fill="#FEF3C7"
                fillOpacity="0.25"
                stroke="#B45309"
                strokeWidth="1.8"
              />
              <circle
                cx="71"
                cy="48"
                r="6.5"
                fill="#FEF3C7"
                fillOpacity="0.25"
                stroke="#B45309"
                strokeWidth="1.8"
              />
              <path
                d="M 55.5 48 Q 60 46 64.5 48"
                stroke="#B45309"
                strokeWidth="1.8"
                fill="none"
              />

              {/* Golden Nectar Honey Jar on side */}
              <path
                d="M 76 68 Q 72 84 84 87 Q 96 84 92 68 Z"
                fill={`url(#${potGradId})`}
                stroke="#92400E"
                strokeWidth="1.8"
              />
              <ellipse
                cx="84"
                cy="68"
                rx="8"
                ry="3"
                fill="#FDE68A"
                stroke="#92400E"
                strokeWidth="1.5"
              />
              {/* Dripping Nectar */}
              <path
                d="M 81 70 Q 84 78 86 76 Q 88 73 88 70"
                fill="#FBBF24"
              />
              {/* LEI / Coin currency sign on jar */}
              <text
                x="84"
                y="81"
                textAnchor="middle"
                fontSize="7"
                fontWeight="bold"
                fill="#FEF3C7"
              >
                L
              </text>
            </g>
          )}
        </svg>

        {/* Floating Mini Accessory Badge */}
        {showAccessoryBadge && size !== 'sm' && (
          <span
            className="absolute -bottom-1 -right-1 text-xs rounded-full bg-white shadow-sm border px-1.5 py-0.5 leading-none font-bold"
            style={{
              borderColor: config.borderColor,
              color: config.textColor,
            }}
            title={config.badge}
          >
            {config.accessoryIcon}
          </span>
        )}
      </div>

      {/* Pill Badge (Optional) */}
      {showBadge && (
        <span
          className="mt-2 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs"
          style={{
            backgroundColor: config.bgColor,
            color: config.textColor,
            borderColor: config.borderColor,
          }}
        >
          {config.badge}
        </span>
      )}
    </div>
  );
};

export default MascotBee;
