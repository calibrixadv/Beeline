import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';

export interface ScreenTransitionContextValue {
  /** Whether a screen transition is currently animating / loading */
  isTransitioning: boolean;
  /** Active transition status message */
  transitionMessage: string;
  /** Manually trigger a timed transition loader */
  triggerTransition: (message?: string, durationMs?: number) => Promise<void>;
  /** Navigate to a new route while showing the placeholder spinner transition */
  navigateWithTransition: (
    route: string,
    options?: { replace?: boolean; message?: string; durationMs?: number }
  ) => Promise<void>;
}

const defaultContext: ScreenTransitionContextValue = {
  isTransitioning: false,
  transitionMessage: 'Loading next screen...',
  triggerTransition: async () => {},
  navigateWithTransition: async () => {},
};

export const ScreenTransitionContext = createContext<ScreenTransitionContextValue>(defaultContext);

export interface ScreenTransitionProviderProps {
  children: ReactNode;
  /** Default duration in ms for transitions (default: 350ms, or 0ms in tests) */
  defaultDurationMs?: number;
}

export const ScreenTransitionProvider: React.FC<ScreenTransitionProviderProps> = ({
  children,
  defaultDurationMs,
}) => {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionMessage, setTransitionMessage] = useState<string>('Loading next screen...');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  const effectiveDefaultDuration = defaultDurationMs ?? (isTest ? 0 : 350);

  // Clean up any pending timer on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const triggerTransition = useCallback(
    (message = 'Loading next screen...', durationMs?: number): Promise<void> => {
      const dur = durationMs ?? effectiveDefaultDuration;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setTransitionMessage(message);
      setIsTransitioning(true);

      return new Promise((resolve) => {
        if (dur <= 0) {
          setIsTransitioning(false);
          resolve();
          return;
        }

        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          timeoutRef.current = null;
          resolve();
        }, dur);
      });
    },
    [effectiveDefaultDuration]
  );

  const navigateWithTransition = useCallback(
    async (
      route: string,
      options?: { replace?: boolean; message?: string; durationMs?: number }
    ): Promise<void> => {
      const message = options?.message || 'Switching route...';
      const duration = options?.durationMs ?? effectiveDefaultDuration;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setIsTransitioning(true);
      setTransitionMessage(message);

      if (options?.replace) {
        router.replace(route as never);
      } else {
        router.push(route as never);
      }

      await new Promise<void>((resolve) => {
        if (duration <= 0) {
          setIsTransitioning(false);
          resolve();
          return;
        }

        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          timeoutRef.current = null;
          resolve();
        }, duration);
      });
    },
    [effectiveDefaultDuration, router]
  );

  return (
    <ScreenTransitionContext.Provider
      value={{
        isTransitioning,
        transitionMessage,
        triggerTransition,
        navigateWithTransition,
      }}
    >
      {children}
    </ScreenTransitionContext.Provider>
  );
};

export const useScreenTransition = (): ScreenTransitionContextValue => {
  const context = useContext(ScreenTransitionContext);
  const router = useRouter();

  if (context && context !== defaultContext) {
    return context;
  }

  return {
    isTransitioning: false,
    transitionMessage: 'Loading next screen...',
    triggerTransition: async () => {},
    navigateWithTransition: async (route, options) => {
      if (options?.replace) {
        router.replace(route as never);
      } else {
        router.push(route as never);
      }
    },
  };
};

