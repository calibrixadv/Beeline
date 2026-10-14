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
  style,
  textStyle,
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
  const variantTextStyle = styles[`text_${variant}`];
  const sizeStyle = styles[`size_${size}`];
  const sizeTextStyle = styles[`textSize_${size}`];

  const selectedContainerStyle = selected ? styles.selectedContainer : null;
  const selectedTextStyle = selected ? styles.selectedText : null;
  const hoverStyle = isHovered && isInteractive ? styles.hoverState : null;

  const content = (
    <>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          sizeTextStyle,
          variantTextStyle,
          selectedTextStyle,
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
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        style={[
          styles.badge,
          sizeStyle,
          variantStyle,
          selectedContainerStyle,
          hoverStyle,
          style,
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
    opacity: 0.85,
    transform: [{ scale: 1.02 }],
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
