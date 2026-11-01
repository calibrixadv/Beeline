import React, { useState, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  AccessibilityRole,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type CardVariant = 'elevated' | 'outlined' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface BaseCardProps {
  /** Visual surface style */
  variant?: CardVariant;
  /** Internal padding */
  padding?: CardPadding;
  /** Click/press handler if card is interactive */
  onPress?: (event: GestureResponderEvent) => void;
  /** Hover callbacks (web/pointer) */
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  /** Focus callbacks (keyboard/web) */
  onFocus?: () => void;
  onBlur?: () => void;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Card body content */
  children?: React.ReactNode;
  /** Accessibility */
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  testID?: string;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  variant = 'elevated',
  padding = 'md',
  onPress,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  style,
  children,
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

  const dynamicCardStyle = useMemo(() => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.cardBg,
          borderColor: isDark ? theme.colors.border : '#E2E8F0',
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.cardBg,
          borderColor: isDark ? theme.colors.borderStrong : '#CBD5E1',
        };
      case 'flat':
        return {
          backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F8FAFC',
        };
      default:
        return {
          backgroundColor: theme.colors.cardBg,
        };
    }
  }, [variant, theme, isDark]);

  const dynamicHoverStyle = isHovered && isInteractive
    ? { borderColor: theme.colors.brandHoney }
    : null;

  const dynamicFocusStyle = isFocused && isInteractive
    ? {
        borderColor: theme.colors.brandHoney,
        borderWidth: 2,
        ...(Platform.OS === 'web'
          ? ({
              outlineColor: theme.colors.brandHoney,
              outlineStyle: 'solid',
              outlineWidth: 2,
              outlineOffset: 2,
              cursor: 'pointer',
            } as any)
          : {}),
      }
    : null;

  const variantStyle = styles[`variant_${variant}`];
  const paddingStyle = styles[`padding_${padding}`];
  const hoverStyle = isHovered && isInteractive ? styles.hoverState : null;
  const pressedStyle = isPressed && isInteractive ? styles.pressedState : null;

  if (isInteractive) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        focusable={true}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.base,
          variantStyle,
          dynamicCardStyle,
          paddingStyle,
          style,
          hoverStyle,
          dynamicHoverStyle,
          pressedStyle,
          dynamicFocusStyle,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, variantStyle, dynamicCardStyle, paddingStyle, style]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  hoverState: {
    shadowOpacity: 0.12,
    transform: [{ translateY: -2 }],
  },
  pressedState: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  // Paddings
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: 10,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 22,
  },

  // Variants
  variant_elevated: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  variant_outlined: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  variant_flat: {
    backgroundColor: '#F8FAFC',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
