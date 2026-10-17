import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export type RewardBadgeType = 'lightning' | 'nectar' | 'shield';
export type RewardBadgeSize = 'sm' | 'md';

export interface RouteRewardBadgeProps {
  /** Reward badge type: lightning (Fastest), nectar (Value), shield (Reliable) */
  type: RewardBadgeType;
  /** Badge size preset: sm, md */
  size?: RewardBadgeSize;
  /** Custom badge text label. Defaults based on type. */
  label?: string;
  /** Disabled state for non-interactive / dim display */
  disabled?: boolean;
  /** Optional press handler for interactive filtering/navigation */
  onPress?: (event: GestureResponderEvent) => void;
  /** Hover callbacks */
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  /** Style overrides for container */
  style?: StyleProp<ViewStyle>;
  /** Style overrides for text label */
  textStyle?: StyleProp<TextStyle>;
  /** Accessibility role (defaults to button if interactive, text otherwise) */
  accessibilityRole?: AccessibilityRole;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test identifier */
  testID?: string;
}

const DEFAULT_LABELS: Record<RewardBadgeType, string> = {
  lightning: 'Fastest',
  nectar: 'Best Value',
  shield: 'Most Reliable',
};

export const RouteRewardBadge: React.FC<RouteRewardBadgeProps> = ({
  type,
  size = 'md',
  label,
  disabled = false,
  onPress,
  onHoverIn,
  onHoverOut,
  style,
  textStyle,
  accessibilityRole,
  accessibilityLabel,
  testID,
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const displayLabel = label ?? DEFAULT_LABELS[type];
  const resolvedTestId = testID ?? `reward-badge-${type}`;
  const isInteractive =
    !disabled &&
    (typeof onPress === 'function' ||
      typeof onHoverIn === 'function' ||
      typeof onHoverOut === 'function');

  const resolvedRole = accessibilityRole ?? (isInteractive ? 'button' : 'text');
  const resolvedA11yLabel = accessibilityLabel ?? `${displayLabel} Route Reward`;

  const handleHoverIn = () => {
    if (isInteractive) {
      setIsHovered(true);
      onHoverIn?.();
    }
  };

  const handleHoverOut = () => {
    if (isInteractive) {
      setIsHovered(false);
      onHoverOut?.();
    }
  };

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 12 : 15;

  const renderIcon = () => {
    if (type === 'lightning') {
      return (
        <Ionicons
          name="flash"
          size={iconSize}
          color={theme.colors.brandHoneyDark}
          testID="badge-icon-lightning"
        />
      );
    }
    if (type === 'nectar') {
      return (
        <MaterialCommunityIcons
          name="bee-flower"
          size={iconSize}
          color={theme.colors.brandHoneyDark}
          testID="badge-icon-nectar"
        />
      );
    }
    if (type === 'shield') {
      return (
        <Ionicons
          name="shield-checkmark"
          size={iconSize}
          color={theme.colors.success}
          testID="badge-icon-shield"
        />
      );
    }
    return null;
  };

  const badgeContent = (
    <>
      <View style={[styles.iconContainer, isSmall && styles.iconContainerSm]}>
        {renderIcon()}
      </View>
      <Text
        style={[
          styles.text,
          isSmall ? styles.textSm : styles.textMd,
          { color: theme.colors.textCharcoal },
          textStyle,
        ]}
      >
        {displayLabel}
      </Text>
    </>
  );

  const containerStyles = [
    styles.pill,
    isSmall ? styles.pillSm : styles.pillMd,
    {
      backgroundColor: theme.colors.surfaceWarm,
      borderColor: theme.colors.honeyBorder,
    },
    isHovered && styles.hovered,
    disabled && styles.disabled,
    style,
  ];

  if (isInteractive) {
    return (
      <Pressable
        testID={resolvedTestId}
        accessibilityRole={resolvedRole}
        accessibilityLabel={resolvedA11yLabel}
        accessibilityState={disabled ? { disabled: true } : undefined}
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        style={containerStyles}
      >
        {badgeContent}
      </Pressable>
    );
  }

  return (
    <View
      testID={resolvedTestId}
      accessibilityRole={resolvedRole}
      accessibilityLabel={resolvedA11yLabel}
      accessibilityState={disabled ? { disabled: true } : undefined}
      style={containerStyles}
    >
      {badgeContent}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  iconContainer: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSm: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 13,
    lineHeight: 16,
  },
  hovered: {
    opacity: 0.88,
    transform: [{ scale: 1.02 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
