import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingSpinnerProps {
  /** Size tier of the spinner */
  size?: SpinnerSize;
  /** Primary accent color of the rotating track (defaults to Beeline Yellow #FFC700) */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Optional descriptive label displayed beneath the spinner */
  label?: string;
  /** Subtitle / status hint */
  subtitle?: string;
  /** Whether to render the central placeholder mark */
  placeholderIcon?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom label style */
  labelStyle?: StyleProp<TextStyle>;
  /** Test identifier */
  testID?: string;
}

const SIZE_MAP: Record<SpinnerSize, { diameter: number; borderWidth: number; centerSize: number; fontSize: number }> = {
  sm: { diameter: 22, borderWidth: 3, centerSize: 6, fontSize: 11 },
  md: { diameter: 40, borderWidth: 4, centerSize: 12, fontSize: 13 },
  lg: { diameter: 58, borderWidth: 5, centerSize: 18, fontSize: 15 },
  xl: { diameter: 80, borderWidth: 6, centerSize: 26, fontSize: 17 },
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color,
  trackColor,
  label,
  subtitle,
  placeholderIcon = true,
  style,
  labelStyle,
  testID = 'loading-spinner',
}) => {
  const { theme, isDark } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  const activeColor = color ?? theme.colors.brandYellow;
  const activeTrackColor =
    trackColor ?? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)');

  const dimensions = SIZE_MAP[size];

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return;
    }

    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 950,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      })
    );

    spinAnimation.start();

    return () => {
      spinAnimation.stop();
    };
  }, [spinValue]);


  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Loading content'}
      accessibilityState={{ busy: true }}
      style={[styles.container, style]}
    >
      <View
        style={[
          styles.spinnerWrapper,
          {
            width: dimensions.diameter,
            height: dimensions.diameter,
          },
        ]}
      >
        {/* Background static circular track */}
        <View
          style={[
            styles.track,
            {
              width: dimensions.diameter,
              height: dimensions.diameter,
              borderRadius: dimensions.diameter / 2,
              borderWidth: dimensions.borderWidth,
              borderColor: activeTrackColor,
            },
          ]}
        />

        {/* Rotating high-contrast yellow arc segment */}
        <Animated.View
          testID="loading-spinner-rotator"
          style={[
            styles.rotator,
            {
              width: dimensions.diameter,
              height: dimensions.diameter,
              borderRadius: dimensions.diameter / 2,
              borderWidth: dimensions.borderWidth,
              borderTopColor: activeColor,
              borderRightColor: activeColor,
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Center placeholder mark / bee transit node */}
        {placeholderIcon && (
          <View
            testID="loading-spinner-center"
            style={[
              styles.centerMark,
              {
                width: dimensions.centerSize,
                height: dimensions.centerSize,
                borderRadius: dimensions.centerSize / 2,
                backgroundColor: activeColor,
              },
            ]}
          />
        )}
      </View>

      {/* Optional accessible label and status hint */}
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textPrimary,
              fontSize: dimensions.fontSize,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  spinnerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
  },
  rotator: {
    position: 'absolute',
  },
  centerMark: {
    position: 'absolute',
  },
  label: {
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
