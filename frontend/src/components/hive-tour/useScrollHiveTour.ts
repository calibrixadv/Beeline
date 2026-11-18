import { useState, useEffect, useRef, useCallback } from 'react';
import { HiveTourChapter } from './types';

export interface UseScrollHiveTourResult {
  scrollY: number;
  scrollProgress: number; // 0.0 to 1.0
  activeChapter: HiveTourChapter;
  isCompanionVisible: boolean;
  prefersReducedMotion: boolean;
}

export function useScrollHiveTour(): UseScrollHiveTourResult {
  const [scrollY, setScrollY] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement?.scrollTop ||
        0
      );
    }
    return 0;
  });

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeChapter, setActiveChapter] = useState<HiveTourChapter>('hero');

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const rafIdRef = useRef<number | null>(null);

  // Subscribe to prefers-reduced-motion media query changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const evaluateScroll = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentScrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      1
    );
    const winHeight = window.innerHeight || 768;
    const maxScroll = Math.max(docHeight - winHeight, 1);
    const progress = Math.min(Math.max(currentScrollY / maxScroll, 0), 1);

    setScrollY(currentScrollY);
    setScrollProgress(progress);

    // Determine active chapter: Check section positions first
    const queensEl = document.getElementById('tour-queens');
    const providersEl = document.getElementById('tour-providers');
    const ecosystemEl = document.getElementById('tour-ecosystem');

    const hasLayout =
      queensEl &&
      typeof queensEl.getBoundingClientRect === 'function' &&
      queensEl.getBoundingClientRect().height > 0;

    if (currentScrollY < 180) {
      setActiveChapter('hero');
    } else if (hasLayout) {
      if (ecosystemEl && ecosystemEl.getBoundingClientRect().top <= winHeight * 0.45) {
        setActiveChapter('ecosystem');
      } else if (providersEl && providersEl.getBoundingClientRect().top <= winHeight * 0.45) {
        setActiveChapter('providers');
      } else if (queensEl && queensEl.getBoundingClientRect().top <= winHeight * 0.7) {
        setActiveChapter('queens');
      } else {
        setActiveChapter('hero');
      }
    } else {
      // Fallback threshold check if layout engine is absent (e.g. JSDOM)
      if (currentScrollY >= 1800) {
        setActiveChapter('ecosystem');
      } else if (currentScrollY >= 900) {
        setActiveChapter('providers');
      } else {
        setActiveChapter('queens');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (process.env.NODE_ENV === 'test' || prefersReducedMotion) {
        evaluateScroll();
        return;
      }

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        evaluateScroll();
        rafIdRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [evaluateScroll, prefersReducedMotion]);

  const isCompanionVisible = scrollY > 180 || activeChapter !== 'hero';

  return {
    scrollY,
    scrollProgress,
    activeChapter,
    isCompanionVisible,
    prefersReducedMotion,
  };
}
