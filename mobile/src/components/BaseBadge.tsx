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
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BaseBadgeProps {
  /** Text label displayed inside badge */
  label: string;
  /** Visual color theme variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Optional icon rendered before label */
  icon?: React.ReactNode;
  /** Press handler if badge acts as a filter chip */
  onPress?: (event: GestureResponderEvent) => void;
  /** Selection flag if used as filter toggle */
  selected?: boolean;
  /** Hover callbacks */
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  /** Focus callbacks */
  onFocus?: () => void;
  onBlur?: () => void;
  /** Style overrides */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Accessibility */
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  testID?: string;
}

export const BaseBadge: React.FC<BaseBadgeProps> = ({
  label,
  variant = 'default',
  size = 'sm',
  icon,
  onPress,
  selected = false,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  style,
  textStyle,
  accessibilityRole,
  accessibilityLabel,
  testID,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isInteractive =
    typeof onPress === 'function' ||
    typeof onHoverIn === 'function' ||
    typeof onHoverOut === 'function' ||
    typeof onFocus === 'function' ||
    typeof onBlur === 'function';

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

  const handleFocus = () => {
    if (isInteractive) {
      setIsFocused(true);
      onFocus?.();
    }
  };

  const handleBlur = () => {
    if (isInteractive) {
      setIsFocused(false);
      onBlur?.();
    }
  };

  const { theme, isDark } = useTheme();

  const variantStyle = styles[`variant_${variant}`];
  const variantTextStyle = styles[`text_${variant}`];
  const sizeStyle = styles[`size_${size}`];
  const sizeTextStyle = styles[`textSize_${size}`];

  const dynamicSelectedContainer = selected
    ? {
        backgroundColor: isDark ? '#3E3204' : '#FEF9C3',
        borderColor: theme.colors.brandYellow,
        borderWidth: 1,
      }
    : null;
  const dynamicSelectedText = selected
    ? {
        color: isDark ? theme.colors.brandYellow : '#854D0E',
        fontWeight: '700' as const,
      }
    : null;

  const dynamicFocusStyle = isFocused && isInteractive
    ? {
        borderColor: theme.colors.brandHoney,
        borderWidth: 1.5,
        ...(Platform.OS === 'web'
          ? ({
              outlineColor: theme.colors.brandHoney,
              outlineStyle: 'solid',
              outlineWidth: 2,
              outlineOffset: 1,
              cursor: 'pointer',
            } as any)
          : {}),
      }
    : null;

  const hoverStyle = isHovered && isInteractive ? styles.hoverState : null;
  const pressedStyle = isPressed && isInteractive ? styles.pressedState : null;

  const content = (
    <>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          sizeTextStyle,
          variantTextStyle,
          dynamicSelectedText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </>
  );

  const resolvedRole = accessibilityRole ?? (isInteractive ? 'button' : 'text');
  const resolvedA11yLabel = accessibilityLabel ?? label;

  if (isInteractive) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole={resolvedRole}
        accessibilityLabel={resolvedA11yLabel}
        accessibilityState={selected !== undefined ? { selected } : undefined}
        focusable={true}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.badge,
          sizeStyle,
          variantStyle,
          dynamicSelectedContainer,
          style,
          hoverStyle,
          pressedStyle,
          dynamicFocusStyle,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole={resolvedRole}
      accessibilityLabel={resolvedA11yLabel}
      style={[styles.badge, sizeStyle, variantStyle, style]}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconContainer: {
    marginRight: 4,
  },
  hoverState: {
    opacity: 0.88,
    transform: [{ translateY: -1 }],
  },
  pressedState: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  selectedContainer: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  selectedText: {
    color: '#2563EB',
    fontWeight: '700',
  },

  // Sizing
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  size_md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  textSize_sm: {
    fontSize: 12,
  },
  textSize_md: {
    fontSize: 13,
  },

  // Variants
  variant_default: {
    backgroundColor: '#F1F5F9',
  },
  text_default: {
    color: '#475569',
  },

  variant_success: {
    backgroundColor: '#DCFCE7',
  },
  text_success: {
    color: '#166534',
  },

  variant_warning: {
    backgroundColor: '#FEF3C7',
  },
  text_warning: {
    color: '#92400E',
  },

  variant_danger: {
    backgroundColor: '#FEE2E2',
  },
  text_danger: {
    color: '#991B1B',
  },

  variant_info: {
    backgroundColor: '#DBEAFE',
  },
  text_info: {
    color: '#1E40AF',
  },

  variant_neutral: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  text_neutral: {
    color: '#64748B',
  },
});
