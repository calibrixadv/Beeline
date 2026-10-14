import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  AccessibilityRole,
  GestureResponderEvent,
} from 'react-native';

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
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
  testID,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isInteractive =
    typeof onPress === 'function' ||
    typeof onHoverIn === 'function' ||
    typeof onHoverOut === 'function';

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

  const variantStyle = styles[`variant_${variant}`];
  const paddingStyle = styles[`padding_${padding}`];
  const hoverStyle = isHovered && isInteractive ? styles.hoverState : null;

  if (isInteractive) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        style={[styles.base, variantStyle, paddingStyle, hoverStyle, style]}
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
      style={[styles.base, variantStyle, paddingStyle, style]}
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
    borderColor: '#3B82F6',
    shadowOpacity: 0.12,
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
