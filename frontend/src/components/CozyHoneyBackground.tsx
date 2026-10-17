import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface CozyHoneyBackgroundProps {
  /** Optional nested children rendered above the ambient layer */
  children?: React.ReactNode;
  /** Whether pollen particles drift and breathe. Defaults to true. Disables on prefers-reduced-motion. */
  animated?: boolean;
  /** Number of floating golden pollen particles to render. Defaults to 8. */
  particleCount?: number;
  /** Custom pointer events configuration. Defaults to 'box-none' if children exist, else 'none'. */
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

interface PollenPreset {
  top: string;
  left?: string;
  right?: string;
  size: number;
  driftX: number;
  driftY: number;
  duration: number; // in seconds
  delay: number; // in seconds
  colorKey: 'gold' | 'amber' | 'honey' | 'light';
}

const POLLEN_PRESETS: PollenPreset[] = [
  { top: '8%', left: '12%', size: 6, driftX: 8, driftY: -12, duration: 4.2, delay: 0, colorKey: 'gold' },
  { top: '15%', right: '14%', size: 5, driftX: -6, driftY: -10, duration: 5.1, delay: 0.5, colorKey: 'amber' },
  { top: '28%', left: '8%', size: 7, driftX: 10, driftY: -15, duration: 4.8, delay: 1.2, colorKey: 'honey' },
  { top: '35%', right: '22%', size: 4, driftX: -5, driftY: -8, duration: 3.8, delay: 0.2, colorKey: 'light' },
  { top: '50%', left: '18%', size: 8, driftX: 7, driftY: -14, duration: 5.5, delay: 1.5, colorKey: 'gold' },
  { top: '62%', right: '10%', size: 5, driftX: -8, driftY: -12, duration: 4.5, delay: 0.8, colorKey: 'amber' },
  { top: '75%', left: '25%', size: 6, driftX: 6, driftY: -10, duration: 5.2, delay: 1.8, colorKey: 'honey' },
  { top: '85%', right: '18%', size: 5, driftX: -7, driftY: -11, duration: 4.0, delay: 0.4, colorKey: 'gold' },
  // Extended presets for dense particleCount:
  { top: '18%', left: '45%', size: 4, driftX: 5, driftY: -9, duration: 3.9, delay: 1.0, colorKey: 'light' },
  { top: '42%', left: '38%', size: 6, driftX: -6, driftY: -13, duration: 4.7, delay: 2.1, colorKey: 'amber' },
  { top: '55%', right: '35%', size: 5, driftX: 8, driftY: -8, duration: 5.0, delay: 0.6, colorKey: 'gold' },
  { top: '68%', left: '12%', size: 7, driftX: -5, driftY: -15, duration: 4.3, delay: 1.4, colorKey: 'honey' },
  { top: '22%', right: '40%', size: 4, driftX: 6, driftY: -10, duration: 4.9, delay: 2.3, colorKey: 'light' },
  { top: '80%', left: '48%', size: 6, driftX: -7, driftY: -12, duration: 5.3, delay: 0.9, colorKey: 'gold' },
  { top: '32%', right: '8%', size: 5, driftX: 5, driftY: -11, duration: 4.1, delay: 1.7, colorKey: 'amber' },
  { top: '92%', left: '15%', size: 4, driftX: -4, driftY: -7, duration: 3.7, delay: 0.3, colorKey: 'honey' },
];

const WATERMARK_HEXES = [
  { top: 0, right: 36 },
  { top: 0, right: 88 },
  { top: 45, right: 10 },
  { top: 45, right: 62 },
  { top: 45, right: 114 },
  { top: 90, right: 36 },
  { top: 90, right: 88 },
];

export const CozyHoneyBackground: React.FC<CozyHoneyBackgroundProps> = ({
  children,
  animated = true,
  particleCount = 8,
  pointerEvents,
  style,
  testID = 'cozy-honey-background',
}) => {
  const { theme, isDark } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion across Web and React Native environments
  useEffect(() => {
    let isMounted = true;
    let removeWebListener: (() => void) | undefined;

    // Web prefers-reduced-motion check
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) {
          setReducedMotion(true);
        }
        const listener = (event: MediaQueryListEvent | MediaQueryList) => {
          if (isMounted) setReducedMotion(event.matches);
        };
        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', listener as (ev: MediaQueryListEvent) => void);
          removeWebListener = () => {
            mediaQuery.removeEventListener('change', listener as (ev: MediaQueryListEvent) => void);
          };
        } else if (typeof (mediaQuery as any).addListener === 'function') {
          (mediaQuery as any).addListener(listener);
          removeWebListener = () => {
            (mediaQuery as any).removeListener(listener);
          };
        }
      } catch {
        // Fallback for older browsers or headless testing
      }
    }

    // React Native AccessibilityInfo check
    if (typeof AccessibilityInfo?.isReduceMotionEnabled === 'function') {
      try {
        const result = AccessibilityInfo.isReduceMotionEnabled();
        if (result && typeof (result as Promise<boolean>).then === 'function') {
          (result as Promise<boolean>)
            .then((enabled) => {
              if (isMounted) {
                setReducedMotion(Boolean(enabled));
              }
            })
            .catch(() => {});
        } else if (result !== undefined) {
          setReducedMotion(Boolean(result));
        }
      } catch {
        // Safe fallback
      }
    }

    const sub = AccessibilityInfo?.addEventListener?.(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (isMounted) setReducedMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      removeWebListener?.();
      sub?.remove?.();
    };
  }, []);

  const shouldAnimate = animated && !reducedMotion;
  const count = Number.isFinite(particleCount) ? Math.max(0, Math.floor(particleCount!)) : 8;
  const activeParticles = useMemo(
    () =>
      Array.from({ length: count }, (_, idx) => ({
        ...POLLEN_PRESETS[idx % POLLEN_PRESETS.length],
        id: idx,
      })),
    [count]
  );

  // Native animation loops for 60fps native performance
  const animValues = useRef<Animated.Value[]>(
    Array.from({ length: 16 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!shouldAnimate || Platform.OS === 'web') {
      animValues.forEach((val) => val.setValue(0));
      return;
    }

    const loops = activeParticles.slice(0, 16).map((p, idx) => {
      const val = animValues[idx];
      const durationMs = Math.round(p.duration * 1000);
      const delayMs = Math.round(p.delay * 1000);

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(val, {
            toValue: 1,
            duration: durationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: durationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    });

    if (loops.length === 0) {
      return;
    }

    const parallel = Animated.parallel(loops);
    parallel.start();

    // Safeguard for Jest test runner to prevent unclosed timers
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      parallel.stop();
      return;
    }

    return () => {
      parallel.stop();
    };
  }, [shouldAnimate, activeParticles, animValues]);

  // Dynamic pollen color mapping across light and dark modes
  const getParticleColor = (colorKey: PollenPreset['colorKey']) => {
    if (isDark) {
      switch (colorKey) {
        case 'gold':
          return '#FDE047';
        case 'amber':
          return theme.colors.brandHoney;
        case 'honey':
          return theme.colors.brandAmber;
        case 'light':
          return '#FDE68A';
      }
    } else {
      switch (colorKey) {
        case 'gold':
          return '#FBBF24';
        case 'amber':
          return theme.colors.brandAmber;
        case 'honey':
          return theme.colors.brandHoney;
        case 'light':
          return theme.colors.brandHoneyLight;
      }
    }
  };

  // Pure Web CSS Keyframes for zero-jank 60fps web performance
  const webKeyframes = useMemo(() => {
    if (Platform.OS !== 'web' || !shouldAnimate) return null;
    const rules = POLLEN_PRESETS.map((p, idx) => `
      @keyframes pollenDrift_${idx} {
        0%, 100% { transform: translate(0px, 0px); opacity: 0.25; }
        50% { transform: translate(${p.driftX}px, ${p.driftY}px); opacity: 0.65; }
      }
    `).join('\n');
    return rules;
  }, [shouldAnimate]);

  return (
    <View
      testID={testID}
      pointerEvents={pointerEvents ?? (children ? 'box-none' : 'none')}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.brandCream,
        },
        style,
      ]}
    >
      {/* Web Keyframes Injection */}
      {Platform.OS === 'web' && webKeyframes && (
        <style dangerouslySetInnerHTML={{ __html: webKeyframes }} />
      )}

      {/* Ambient non-blocking floating particles & watermark layer */}
      <View
        testID="cozy-honey-ambient-layer"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        {/* Geometric Honeycomb Watermark Pattern */}
        <View testID="honeycomb-watermark" style={styles.watermarkContainer}>
          {WATERMARK_HEXES.map((hex, idx) => (
            <View
              key={idx}
              testID={`honeycomb-cell-${idx}`}
              style={[
                styles.watermarkCell,
                {
                  top: hex.top,
                  right: hex.right,
                  opacity: isDark ? 0.12 : 0.08,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="hexagon-outline"
                size={54}
                color={isDark ? theme.colors.brandHoney : theme.colors.brandAmber}
              />
            </View>
          ))}
        </View>

        {/* Golden Floating Pollen Particles */}
        {activeParticles.map((p, idx) => {
          const color = getParticleColor(p.colorKey);
          const animVal = animValues[idx % animValues.length];

          const isWeb = Platform.OS === 'web';
          const webStyle = isWeb && shouldAnimate
            ? ({
                animationName: `pollenDrift_${idx % POLLEN_PRESETS.length}`,
                animationDuration: `${p.duration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${p.delay}s`,
                animationFillMode: 'both',
                opacity: 0.25,
              } as unknown as ViewStyle)
            : undefined;

          const nativeStyle = !isWeb && shouldAnimate
            ? {
                opacity: animVal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.25, 0.65],
                }),
                transform: [
                  {
                    translateX: animVal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, p.driftX],
                    }),
                  },
                  {
                    translateY: animVal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, p.driftY],
                    }),
                  },
                ],
              }
            : { opacity: 0.38 };

          return (
            <Animated.View
              key={`pollen-${p.id}`}
              testID={`pollen-particle-${idx}`}
              style={[
                styles.pollenParticle,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: color,
                  top: p.top as any,
                  left: p.left as any,
                  right: p.right as any,
                },
                isWeb ? webStyle : nativeStyle,
              ]}
            />
          );
        })}
      </View>

      {/* Render children above the ambient layer */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 170,
    height: 150,
  },
  watermarkCell: {
    position: 'absolute',
  },
  pollenParticle: {
    position: 'absolute',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 1,
  },
});
