import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner, SpinnerSize } from './LoadingSpinner';
import { BaseCard } from './BaseCard';

export interface ScreenLoaderProps {
  /** Whether the loader is visible */
  visible?: boolean;
  /** Primary status message */
  message?: string;
  /** Subtitle or secondary detail */
  subtitle?: string;
  /** Spinner size */
  spinnerSize?: SpinnerSize;
  /** Whether to render as modal or inline overlay */
  fullScreen?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

export const ScreenLoader: React.FC<ScreenLoaderProps> = ({
  visible = true,
  message = 'Loading Beeline Express Routes...',
  subtitle = 'Fetching timetable and corridor availability',
  spinnerSize = 'lg',
  fullScreen = true,
  style,
  testID = 'screen-loader',
}) => {
  const { theme, isDark } = useTheme();

  if (!visible) {
    return null;
  }

  const content = (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={message}
      accessibilityLiveRegion="assertive"
      style={[
        fullScreen ? styles.fullScreenOverlay : styles.inlineOverlay,
        {
          backgroundColor: isDark
            ? 'rgba(9, 9, 11, 0.88)'
            : 'rgba(255, 255, 255, 0.92)',
        },
        style,
      ]}
    >
      <BaseCard
        variant="elevated"
        padding="lg"
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.cardBg,
            borderColor: isDark ? theme.colors.brandYellow : theme.colors.borderStrong,
          },
        ]}
      >
        {/* Placeholder Favicon / Logo Badge */}
        <View style={styles.brandRow}>
          <View
            testID="screen-loader-favicon-placeholder"
            style={[
              styles.faviconBadge,
              {
                backgroundColor: theme.colors.brandYellow,
              },
            ]}
          >
            <Text style={styles.faviconText}>🐝</Text>
          </View>
          <Text
            style={[
              styles.brandTitle,
              {
                color: theme.colors.textPrimary,
              },
            ]}
          >
            BEELINE
          </Text>
        </View>

        {/* Placeholder Spinner */}
        <LoadingSpinner
          size={spinnerSize}
          color={theme.colors.brandYellow}
          label={message}
          subtitle={subtitle}
        />
      </BaseCard>
    </View>
  );

  return content;
};

const styles = StyleSheet.create({
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inlineOverlay: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    maxWidth: 360,
    borderWidth: 2,
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  faviconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faviconText: {
    fontSize: 14,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
