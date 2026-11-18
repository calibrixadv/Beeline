'use client';

import React, { useEffect, useRef } from 'react';

export interface CozyHoneyBackgroundProps {
  children?: React.ReactNode;
  showTexture?: boolean;
  showPollen?: boolean;
  className?: string;
}

// 12 Golden pollen & nectar motes across 2 depth layers
const POLLEN_MOTES = [
  // Depth 1: Crisp background motes (3px - 5px, delicate sharp edges)
  { id: 'bg-1', top: '18%', left: '12%', size: 'w-2 h-2', bg: 'bg-amber-300/60', blur: 'blur-[0.5px]', anim: 'animate-pollen-gentle', delay: '0s', duration: '16s' },
  { id: 'bg-2', top: '64%', left: '26%', size: 'w-2.5 h-2.5', bg: 'bg-yellow-300/70', blur: 'blur-[0.5px]', anim: 'animate-pollen-gentle', delay: '2.5s', duration: '19s' },
  { id: 'bg-3', top: '35%', left: '48%', size: 'w-2 h-2', bg: 'bg-amber-400/50', blur: 'blur-[0.5px]', anim: 'animate-pollen-gentle', delay: '5.2s', duration: '15s' },
  { id: 'bg-4', top: '80%', left: '68%', size: 'w-2.5 h-2.5', bg: 'bg-amber-300/65', blur: 'blur-[0.5px]', anim: 'animate-pollen-gentle', delay: '7.8s', duration: '18s' },
  { id: 'bg-5', top: '22%', left: '84%', size: 'w-2 h-2', bg: 'bg-yellow-400/60', blur: 'blur-[0.5px]', anim: 'animate-pollen-gentle', delay: '1.6s', duration: '14s' },
  { id: 'bg-6', top: '55%', left: '92%', size: 'w-2 h-2', bg: 'bg-amber-300/55', blur: 'blur-[0.5px]', anim: 'animate-pollen-gentle', delay: '4.2s', duration: '17s' },

  // Depth 2: Softly blurred foreground motes (6px - 9px, warm liquid amber glow)
  { id: 'fg-1', top: '42%', left: '8%', size: 'w-3.5 h-3.5', bg: 'bg-amber-400/35', blur: 'blur-[1.5px]', anim: 'animate-pollen-gentle', delay: '1.0s', duration: '13s' },
  { id: 'fg-2', top: '85%', left: '22%', size: 'w-4 h-4', bg: 'bg-amber-500/30', blur: 'blur-[2px]', anim: 'animate-pollen-gentle', delay: '3.6s', duration: '15s' },
  { id: 'fg-3', top: '12%', left: '38%', size: 'w-3 h-3', bg: 'bg-yellow-400/40', blur: 'blur-[1.5px]', anim: 'animate-pollen-gentle', delay: '6.4s', duration: '12s' },
  { id: 'fg-4', top: '48%', left: '62%', size: 'w-4 h-4', bg: 'bg-amber-400/30', blur: 'blur-[2px]', anim: 'animate-pollen-gentle', delay: '8.7s', duration: '14s' },
  { id: 'fg-5', top: '72%', left: '78%', size: 'w-3.5 h-3.5', bg: 'bg-amber-500/25', blur: 'blur-[1.5px]', anim: 'animate-pollen-gentle', delay: '2.2s', duration: '16s' },
  { id: 'fg-6', top: '30%', left: '88%', size: 'w-4 h-4', bg: 'bg-yellow-300/45', blur: 'blur-[2px]', anim: 'animate-pollen-gentle', delay: '4.8s', duration: '13.5s' },
];

// Helper to generate a pointy-topped regular hexagon SVG path
function getHexPath(cx: number, cy: number, r: number = 24): string {
  const dx = Math.round(r * 0.866025 * 10) / 10;
  const dy = Math.round(r * 0.5 * 10) / 10;
  return `M ${cx} ${cy - r} L ${cx + dx} ${cy - dy} L ${cx + dx} ${cy + dy} L ${cx} ${cy + r} L ${cx - dx} ${cy + dy} L ${cx - dx} ${cy - dy} Z`;
}

// 8 Nectar-Filled Living Cells with warm shimmer pulsation
const NECTAR_CELLS = [
  { id: 'nectar-1', cx: 82, cy: 50, r: 24, duration: '6.8s', delay: '0s' },
  { id: 'nectar-2', cx: 103, cy: 158, r: 24, duration: '8.2s', delay: '2.5s' },
  { id: 'nectar-3', cx: 1362, cy: 50, r: 24, duration: '7.2s', delay: '1.4s' },
  { id: 'nectar-4', cx: 1299, cy: 86, r: 24, duration: '8.6s', delay: '3.8s' },
  { id: 'nectar-5', cx: 1371, cy: 486, r: 24, duration: '6.4s', delay: '4.8s' },
  { id: 'nectar-6', cx: 1350, cy: 522, r: 24, duration: '7.8s', delay: '1.9s' },
  { id: 'nectar-7', cx: 71, cy: 716, r: 24, duration: '8.4s', delay: '3.1s' },
  { id: 'nectar-8', cx: 92, cy: 752, r: 24, duration: '7.0s', delay: '5.4s' },
];

// Wireframe lattice cells for decorative corner and mid-viewport clusters
const LATTICE_CELLS = [
  // Cluster 1: Top-Left
  { cx: 40, cy: 50, r: 24, stroke: '#F59E0B' },
  { cx: 124, cy: 50, r: 24, stroke: '#F59E0B' },
  { cx: 61, cy: 86, r: 24, stroke: '#D97706' },
  { cx: 103, cy: 86, r: 24, stroke: '#F59E0B' },
  { cx: 145, cy: 86, r: 24, stroke: '#F59E0B' },
  { cx: 40, cy: 122, r: 24, stroke: '#D97706' },
  { cx: 82, cy: 122, r: 24, stroke: '#F59E0B' },
  { cx: 124, cy: 122, r: 24, stroke: '#F59E0B' },
  { cx: 61, cy: 158, r: 24, stroke: '#D97706' },
  // Cluster 2: Top-Right
  { cx: 1320, cy: 50, r: 24, stroke: '#F59E0B' },
  { cx: 1404, cy: 50, r: 24, stroke: '#F59E0B' },
  { cx: 1341, cy: 86, r: 24, stroke: '#D97706' },
  { cx: 1383, cy: 86, r: 24, stroke: '#F59E0B' },
  { cx: 1320, cy: 122, r: 24, stroke: '#F59E0B' },
  { cx: 1362, cy: 122, r: 24, stroke: '#D97706' },
  { cx: 1299, cy: 158, r: 24, stroke: '#F59E0B' },
  // Cluster 3: Mid-Right Viewport
  { cx: 1350, cy: 450, r: 24, stroke: '#F59E0B' },
  { cx: 1392, cy: 450, r: 24, stroke: '#D97706' },
  { cx: 1329, cy: 486, r: 24, stroke: '#F59E0B' },
  { cx: 1413, cy: 486, r: 24, stroke: '#F59E0B' },
  { cx: 1392, cy: 522, r: 24, stroke: '#D97706' },
  { cx: 1329, cy: 558, r: 24, stroke: '#F59E0B' },
  // Cluster 4: Bottom-Left Viewport
  { cx: 50, cy: 680, r: 24, stroke: '#F59E0B' },
  { cx: 92, cy: 680, r: 24, stroke: '#D97706' },
  { cx: 134, cy: 680, r: 24, stroke: '#F59E0B' },
  { cx: 113, cy: 716, r: 24, stroke: '#D97706' },
  { cx: 50, cy: 752, r: 24, stroke: '#F59E0B' },
  { cx: 134, cy: 752, r: 24, stroke: '#D97706' },
  { cx: 71, cy: 788, r: 24, stroke: '#F59E0B' },
];

export const CozyHoneyBackground: React.FC<CozyHoneyBackgroundProps> = ({
  children,
  showTexture = true,
  showPollen = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const topAtmosphereRef = useRef<HTMLDivElement>(null);
  const midAtmosphereRef = useRef<HTMLDivElement>(null);
  const bottomAtmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let isReducedMotion = mediaQuery ? mediaQuery.matches : false;

    const handleMediaChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
      if (isReducedMotion) {
        if (topAtmosphereRef.current) topAtmosphereRef.current.style.opacity = '1';
        if (midAtmosphereRef.current) midAtmosphereRef.current.style.opacity = '0';
        if (bottomAtmosphereRef.current) bottomAtmosphereRef.current.style.opacity = '0';
      }
    };

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleMediaChange);
      }
    }

    let rafId: number | null = null;
    let lastScrollY = window.scrollY || 0;
    let lastMouseX = '50%';
    let lastMouseY = '30%';

    const update = () => {
      rafId = null;
      if (isReducedMotion) return;

      // Update cursor coordinates via CSS custom properties on container and halo
      if (haloRef.current) {
        haloRef.current.style.setProperty('--hive-mouse-x', lastMouseX);
        haloRef.current.style.setProperty('--hive-mouse-y', lastMouseY);
      }
      if (containerRef.current) {
        containerRef.current.style.setProperty('--hive-mouse-x', lastMouseX);
        containerRef.current.style.setProperty('--hive-mouse-y', lastMouseY);
      }

      // Smoothly interpolate scroll lighting atmosphere across 3 zones
      const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
      const winHeight = window.innerHeight || 768;
      const maxScroll = Math.max(1, docHeight - winHeight);
      const progress = Math.min(1, Math.max(0, lastScrollY / maxScroll));

      // Zone 1: Hero (Top) - Warm Honeycomb Milk
      const topOp = Math.max(0, 1 - progress * 1.85);
      // Zone 2: Middle Tour Sections - Golden Apiary Glow
      const midOp = Math.max(0, 1 - Math.abs(progress - 0.5) * 2.4);
      // Zone 3: Bottom Cozy Hive - Cozy Lantern Sunset
      const bottomOp = Math.max(0, (progress - 0.42) * 1.75);

      if (topAtmosphereRef.current) {
        topAtmosphereRef.current.style.opacity = topOp.toFixed(3);
      }
      if (midAtmosphereRef.current) {
        midAtmosphereRef.current.style.opacity = midOp.toFixed(3);
      }
      if (bottomAtmosphereRef.current) {
        bottomAtmosphereRef.current.style.opacity = Math.min(1, bottomOp).toFixed(3);
      }
    };

    const handleScroll = () => {
      if (isReducedMotion) return;
      lastScrollY = window.scrollY || 0;
      if (!rafId) {
        rafId = requestAnimationFrame(update);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isReducedMotion) return;
      lastMouseX = `${e.clientX}px`;
      lastMouseY = `${e.clientY}px`;
      if (!rafId) {
        rafId = requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Initial paint calculation
    update();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleMediaChange);
        } else if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handleMediaChange);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen w-full ${showTexture ? 'honeycomb-pattern' : 'bg-[#FFFDF9]'} ${className}`}
      style={{
        '--hive-mouse-x': '50%',
        '--hive-mouse-y': '30%',
      } as React.CSSProperties}
    >
      {/* =================================================================== */}
      {/* AMBIENT FIXED BACKDROP (POINTER-EVENTS-NONE, FIXED, ARIA-HIDDEN)   */}
      {/* =================================================================== */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
        aria-hidden="true"
      >
        {/* ================================================================= */}
        {/* LAYER 1: SCROLL-REACTIVE GOLDEN HOUR ATMOSPHERE                  */}
        {/* ================================================================= */}
        {/* Top (Hero): Warm Honeycomb Milk (#FFFDF9 blending into soft #FEF3C7 amber) */}
        <div
          ref={topAtmosphereRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out"
          style={{
            opacity: 1,
            background:
              'linear-gradient(180deg, rgba(255, 253, 249, 0.98) 0%, rgba(255, 253, 249, 0.75) 55%, rgba(254, 243, 199, 0.5) 100%)',
          }}
        />

        {/* Middle (Tour Sections): Golden Apiary Glow (#FFFBEB with #FDE68A warm nectar pools) */}
        <div
          ref={midAtmosphereRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out"
          style={{
            opacity: 0,
            background: '#FFFBEB',
            backgroundImage:
              'radial-gradient(ellipse 70% 45% at 20% 45%, rgba(253, 230, 138, 0.42) 0%, transparent 70%), radial-gradient(ellipse 75% 55% at 80% 55%, rgba(245, 158, 11, 0.15) 0%, transparent 75%)',
          }}
        />

        {/* Bottom (Cozy Hive): Cozy Lantern Sunset (#FEF7E6 with warm golden-honey edge vignette) */}
        <div
          ref={bottomAtmosphereRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out"
          style={{
            opacity: 0,
            background: '#FEF7E6',
            backgroundImage:
              'radial-gradient(circle at 50% 50%, transparent 55%, rgba(217, 119, 6, 0.09) 100%), radial-gradient(ellipse 100% 60% at 50% 100%, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.1) 50%, transparent 85%)',
          }}
        />

        {/* ================================================================= */}
        {/* LAYER 2: INTERACTIVE "WARM LANTERN CURSOR HALO"                   */}
        {/* ================================================================= */}
        <div
          ref={haloRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(650px circle at var(--hive-mouse-x, 50%) var(--hive-mouse-y, 30%), rgba(245, 158, 11, 0.11), rgba(217, 119, 6, 0.04) 45%, transparent 72%)',
          }}
        />

        {/* ================================================================= */}
        {/* LAYER 3: LIVING WAX HONEYCOMB CLUSTERS (PURE SVG)                */}
        {/* ================================================================= */}
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            {/* Liquid Amber Nectar Fill Gradient for pulsating cells */}
            <radialGradient id="nectarCellGrad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.65" />
            </radialGradient>
          </defs>

          {/* Decorative Wireframe Lattice Cells with delicate warm strokes */}
          <g id="honeycomb-wireframe-lattice">
            {LATTICE_CELLS.map((cell, idx) => (
              <path
                key={`lattice-${idx}`}
                d={getHexPath(cell.cx, cell.cy, cell.r)}
                fill="none"
                stroke={cell.stroke}
                strokeWidth="1.2"
                strokeOpacity="0.22"
              />
            ))}
          </g>

          {/* 6-8 Nectar-Filled Living Cells (Soft shimmer pulse: 6s-9s ease-in-out infinite) */}
          <g id="honeycomb-nectar-cells">
            {NECTAR_CELLS.map((cell) => (
              <path
                key={cell.id}
                d={getHexPath(cell.cx, cell.cy, cell.r)}
                fill="url(#nectarCellGrad)"
                stroke="#D97706"
                strokeWidth="1.4"
                strokeOpacity="0.45"
                className="animate-honey-cell-breathe"
                style={{
                  animationDuration: cell.duration,
                  animationDelay: cell.delay,
                }}
              />
            ))}
          </g>
        </svg>

        {/* ================================================================= */}
        {/* LAYER 4: COZY APIARY & RAILWAY VIADUCT HORIZON SILHOUETTE (SVG)   */}
        {/* ================================================================= */}
        <div
          className="absolute bottom-0 left-0 right-0 w-full pointer-events-none opacity-[0.055] select-none"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1440 280"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-40 sm:h-52 lg:h-64"
          >
            <defs>
              <linearGradient id="apiaryHillBack" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D97706" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#92400E" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="apiaryHillFore" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#B45309" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#78350F" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="hiveEntranceGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Distant Rolling Hill */}
            <path
              d="M 0 185 Q 360 135 760 170 T 1440 150 L 1440 280 L 0 280 Z"
              fill="url(#apiaryHillBack)"
            />

            {/* Classic Multi-Arch Railway Viaduct across horizon */}
            <g id="railway-viaduct">
              {/* Viaduct Deck & Rail Track */}
              <rect x="440" y="128" width="620" height="9" rx="2" fill="#78350F" />
              <line x1="435" y1="126" x2="1065" y2="126" stroke="#92400E" strokeWidth="2.5" />
              <line x1="435" y1="122" x2="1065" y2="122" stroke="#B45309" strokeWidth="1.2" strokeDasharray="5 3" />

              {/* Repeating Roman Arches & Piers */}
              <path
                d="
                  M 450 200 L 450 137 Q 485 118 520 137 L 520 200
                  M 535 200 L 535 137 Q 570 118 605 137 L 605 200
                  M 620 200 L 620 137 Q 655 118 690 137 L 690 200
                  M 705 200 L 705 137 Q 740 118 775 137 L 775 200
                  M 790 200 L 790 137 Q 825 118 860 137 L 860 200
                  M 875 200 L 875 137 Q 910 118 945 137 L 945 200
                  M 960 200 L 960 137 Q 995 118 1030 137 L 1030 200
                "
                stroke="#78350F"
                strokeWidth="10"
                strokeLinecap="square"
                fill="none"
              />

              {/* Passenger Transit Train Silhouette Crossing Viaduct */}
              <rect x="740" y="116" width="32" height="9" rx="2" fill="#92400E" />
              <rect x="775" y="118" width="28" height="7" rx="1.5" fill="#B45309" />
              <rect x="806" y="118" width="28" height="7" rx="1.5" fill="#B45309" />
              <rect x="837" y="118" width="28" height="7" rx="1.5" fill="#B45309" />
              {/* Locomotive headlight beam */}
              <polygon points="740,120 710,116 710,125" fill="#FEF08A" opacity="0.6" />
            </g>

            {/* Foreground Rolling Hill */}
            <path
              d="M 0 215 Q 420 178 920 208 T 1440 192 L 1440 280 L 0 280 Z"
              fill="url(#apiaryHillFore)"
            />

            {/* Beehive 1 (Tiered Wooden Langstroth Hive with glowing arched entrance) */}
            <g id="cozy-beehive-1" transform="translate(155, 172)">
              <rect x="2" y="38" width="34" height="4" rx="1" fill="#78350F" />
              <rect x="4" y="24" width="30" height="14" rx="1.5" fill="#B45309" stroke="#78350F" strokeWidth="1" />
              <rect x="5" y="12" width="28" height="12" rx="1.5" fill="#D97706" stroke="#92400E" strokeWidth="1" />
              <rect x="6" y="2" width="26" height="10" rx="1.5" fill="#B45309" stroke="#78350F" strokeWidth="1" />
              <polygon points="1,2 19,-8 37,2" fill="#78350F" stroke="#451A03" strokeWidth="1" />
              <path d="M 14 38 A 5 5 0 0 1 24 38 Z" fill="url(#hiveEntranceGlow)" />
              <circle cx="19" cy="36" r="3" fill="#FEF08A" opacity="0.75" />
            </g>

            {/* Beehive 2 (Cozy Wooden Tiered Hive with glowing arched entrance) */}
            <g id="cozy-beehive-2" transform="translate(215, 190)">
              <rect x="2" y="32" width="28" height="3" rx="1" fill="#78350F" />
              <rect x="4" y="20" width="24" height="12" rx="1" fill="#92400E" stroke="#78350F" strokeWidth="1" />
              <rect x="5" y="10" width="22" height="10" rx="1" fill="#B45309" stroke="#78350F" strokeWidth="1" />
              <polygon points="2,10 16,1 30,10" fill="#78350F" stroke="#451A03" strokeWidth="1" />
              <path d="M 12 32 A 4 4 0 0 1 20 32 Z" fill="url(#hiveEntranceGlow)" />
              <circle cx="16" cy="30" r="2.5" fill="#FEF08A" opacity="0.75" />
            </g>
          </svg>
        </div>

        {/* ================================================================= */}
        {/* LAYER 5: DUAL-DEPTH FLOATING GOLDEN POLLEN MOTES                  */}
        {/* ================================================================= */}
        {showPollen && (
          <div
            className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
            aria-hidden="true"
          >
            {POLLEN_MOTES.map((mote) => (
              <div
                key={mote.id}
                className={`absolute rounded-full pointer-events-none ${mote.size} ${mote.bg} ${mote.blur} ${mote.anim}`}
                style={{
                  top: mote.top,
                  left: mote.left,
                  animationDuration: mote.duration,
                  animationDelay: mote.delay,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main app content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
};

export default CozyHoneyBackground;
