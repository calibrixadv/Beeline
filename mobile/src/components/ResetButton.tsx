import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseButton, BaseButtonProps } from './BaseButton';

export interface ResetButtonProps extends Omit<BaseButtonProps, 'variant'> {
  /** Optional icon display */
  showIcon?: boolean;
}

export const ResetButton: React.FC<ResetButtonProps> = ({
  title = 'Reset',
  showIcon = false,
  accessibilityLabel = 'Reset all filters',
  testID = 'reset-filters-btn',
  style,
  textStyle,
  ...restProps
}) => {
  return (
    <BaseButton
      {...restProps}
      title={title}
      variant="ghost"
      size={restProps.size ?? 'sm'}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      iconLeft={
        showIcon ? (
          <Ionicons name="refresh-outline" size={14} color="#DC2626" />
        ) : undefined
      }
      style={[styles.container, style]}
      textStyle={[styles.text, textStyle]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
