'use client';

import React, { useState, useEffect } from 'react';
import MascotBee, { MascotGear } from './MascotBee';

export interface AmbientPageMascotProps {
  gear?: MascotGear;
  position?: 'top-right' | 'bottom-right';
  className?: string;
}

export const AmbientPageMascot: React.FC<AmbientPageMascotProps> = ({
  gear = 'default',
  position = 'top-right',
  className = '',
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  const positionClasses =
    position === 'bottom-right'
      ? 'absolute bottom-10 -right-12 sm:right-2 lg:right-8 xl:right-14'
      : 'absolute top-24 -right-12 sm:right-2 lg:right-8 xl:right-14';

  return (
    <div
      data-testid="ambient-page-mascot"
      data-ambient-gear={gear}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 select-none ${className}`.trim()}
    >
      <div
        className={`${positionClasses} opacity-[0.10] sm:opacity-[0.14] lg:opacity-[0.16] transition-opacity duration-500 scale-75 sm:scale-90 lg:scale-100 origin-top-right`}
      >
        {/* Subtle soft radial honey halo behind the mascot */}
        <div
          className="absolute inset-0 -m-8 rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18)_0%,rgba(251,191,36,0.06)_50%,transparent_75%)] blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        <div className={!prefersReducedMotion ? 'animate-bee-dynamic-flight' : undefined}>
          <MascotBee
            gear={gear}
            size="4xl"
            animated={!prefersReducedMotion}
            showBadge={false}
            showSpeech={false}
          />
        </div>
      </div>
    </div>
  );
};

export default AmbientPageMascot;
