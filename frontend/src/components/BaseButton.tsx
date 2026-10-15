import React, { useState, useMemo } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  AccessibilityState,
  GestureResponderEvent,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'surface';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseButtonProps {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size tier */
  size?: ButtonSize;
  /** Button text label */
  title?: string;
  /** React children (overrides or complements title) */
  children?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state with spinner */
  loading?: boolean;
  /** Optional loading text */
  loadingText?: string;
  /** Left-aligned icon or element */
  iconLeft?: React.ReactNode;
  /** Right-aligned icon or element */
  iconRight?: React.ReactNode;
  /** Click/press handler */
  onPress?: (event: GestureResponderEvent) => unknown;
  /** Hover in handler (web & pointer) */
  onHoverIn?: () => void;
  /** Hover out handler (web & pointer) */
  onHoverOut?: () => void;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Text style overrides */
  textStyle?: StyleProp<TextStyle>;
  /** Accessibility role (defaults to button) */
  accessibilityRole?: AccessibilityRole;
  /** Accessible label */
  accessibilityLabel?: string;
  /** Accessible state */
  accessibilityState?: AccessibilityState;
  /** Test identifier */
  testID?: string;
  /** Full width stretching */
  fullWidth?: boolean;
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  variant = 'primary',
  size = 'md',
  title,
  children,
  disabled = false,
  loading = false,
  loadingText,
  iconLeft,
  iconRight,
  onPress,
  onHoverIn,
  onHoverOut,
  style,
  textStyle,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  testID,
  fullWidth = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isInteractive = !disabled && !loading;

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

  const handlePressIn = () => {
    if (isInteractive) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    if (isInteractive) {
      setIsPressed(false);
    }
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (isInteractive && onPress) {
      onPress(e);
    }
  };

  const { theme, isDark } = useTheme();

  // Dynamic theme-aware color styling
  const dynamicStyles = useMemo(() => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.primaryText,
            fontWeight: '800' as const,
          },
          hover: {
            backgroundColor: theme.colors.primaryHover,
            borderColor: theme.colors.primaryHover,
          },
          spinnerColor: theme.colors.primaryText,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: theme.colors.secondary,
            borderColor: theme.colors.secondary,
          },
          text: {
            color: theme.colors.secondaryText,
          },
          hover: {
            backgroundColor: theme.colors.secondaryHover,
            borderColor: theme.colors.secondaryHover,
          },
          spinnerColor: theme.colors.secondaryText,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: isDark ? theme.colors.borderStrong : '#CBD5E1',
          },
          text: {
            color: theme.colors.textPrimary,
          },
          hover: {
            backgroundColor: isDark ? '#1F1F23' : '#F8FAFC',
            borderColor: theme.colors.brandYellow,
          },
          spinnerColor: theme.colors.textPrimary,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
          text: {
            color: theme.colors.textPrimary,
          },
          hover: {
            backgroundColor: isDark ? '#1F1F23' : '#F1F5F9',
          },
          spinnerColor: theme.colors.textPrimary,
        };
      case 'surface':
        return {
          container: {
            backgroundColor: isDark ? theme.colors.surfaceElevated : '#F1F5F9',
            borderColor: theme.colors.border,
          },
          text: {
            color: theme.colors.textPrimary,
          },
          hover: {
            backgroundColor: isDark ? '#2E2E33' : '#E2E8F0',
          },
          spinnerColor: theme.colors.textPrimary,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: theme.colors.danger,
            borderColor: theme.colors.danger,
          },
          text: {
            color: '#FFFFFF',
          },
          hover: {
            backgroundColor: '#B91C1C',
            borderColor: '#B91C1C',
          },
          spinnerColor: '#FFFFFF',
        };
      case 'success':
        return {
          container: {
            backgroundColor: theme.colors.success,
            borderColor: theme.colors.success,
          },
          text: {
            color: '#FFFFFF',
          },
          hover: {
            backgroundColor: '#15803D',
            borderColor: '#15803D',
          },
          spinnerColor: '#FFFFFF',
        };
      default:
        return {
          container: {},
          text: {},
          hover: {},
          spinnerColor: '#FFFFFF',
        };
    }
  }, [variant, theme, isDark]);

  // Determine styling based on state
  const variantContainerStyle = styles[`variant_${variant}`];
  const variantTextStyle = styles[`text_${variant}`];
  const sizeContainerStyle = styles[`size_${size}`];
  const sizeTextStyle = styles[`textSize_${size}`];

  const hoverStyle = isHovered && isInteractive ? styles[`hover_${variant}`] : null;
  const pressedStyle = isPressed && isInteractive ? styles.pressedState : null;
  const disabledContainerStyle = disabled ? styles.disabledContainer : null;
  const disabledTextStyle = disabled ? styles.disabledText : null;
  const fullWidthStyle = fullWidth ? styles.fullWidth : null;

  const resolvedSpinnerColor = dynamicStyles.spinnerColor;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{
        disabled,
        busy: loading,
        ...accessibilityState,
      }}
      disabled={!isInteractive}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[
        styles.base,
        sizeContainerStyle,
        variantContainerStyle,
        dynamicStyles.container,
        fullWidthStyle,
        hoverStyle,
        isHovered && isInteractive && dynamicStyles.hover,
        pressedStyle,
        disabledContainerStyle,
        style,
      ]}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size="small"
            color={resolvedSpinnerColor}
            style={styles.spinner}
            testID="button-activity-indicator"
          />
          {loadingText ? (
            <Text
              style={[
                styles.baseText,
                sizeTextStyle,
                variantTextStyle,
                dynamicStyles.text,
                disabledTextStyle,
                textStyle,
              ]}
            >
              {loadingText}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {iconLeft ? <>{iconLeft}</> : null}
          {title ? (
            <Text
              style={[
                styles.baseText,
                sizeTextStyle,
                variantTextStyle,
                dynamicStyles.text,
                disabledTextStyle,
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null}
          {children}
          {iconRight ? <>{iconRight}</> : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  fullWidth: {
    width: '100%',
  },
  baseText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  spinner: {
    marginRight: 4,
  },
  pressedState: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabledContainer: {
    opacity: 0.5,
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  disabledText: {
    color: '#94A3B8',
  },

  // Sizing
  size_sm: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  size_md: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  size_lg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  textSize_sm: {
    fontSize: 12,
  },
  textSize_md: {
    fontSize: 14,
  },
  textSize_lg: {
    fontSize: 16,
  },

  // Variants
  variant_primary: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  hover_primary: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },

  variant_secondary: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  hover_secondary: {
    backgroundColor: '#1E293B',
  },

  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  text_outline: {
    color: '#334155',
  },
  hover_outline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#94A3B8',
  },

  variant_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  text_ghost: {
    color: '#475569',
  },
  hover_ghost: {
    backgroundColor: '#F1F5F9',
  },

  variant_danger: {
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  text_danger: {
    color: '#FFFFFF',
  },
  hover_danger: {
    backgroundColor: '#B91C1C',
  },

  variant_success: {
    backgroundColor: '#16A34A',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  text_success: {
    color: '#FFFFFF',
  },
  hover_success: {
    backgroundColor: '#15803D',
  },

  variant_surface: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  text_surface: {
    color: '#334155',
  },
  hover_surface: {
    backgroundColor: '#E2E8F0',
  },
});
