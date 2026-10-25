import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { BaseButton, BaseButtonProps } from './BaseButton';

export type IconButtonShape = 'circle' | 'square' | 'rounded';

export interface IconButtonProps
  extends Omit<BaseButtonProps, 'title' | 'children' | 'iconLeft' | 'iconRight' | 'fullWidth'> {
  /** Ionicons icon name */
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  /** Icon size */
  iconSize?: number;
  /** Icon color */
  iconColor?: string;
  /** Shape geometry */
  shape?: IconButtonShape;
}

export const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  iconSize = 18,
  iconColor = '#64748B',
  shape = 'circle',
  size = 'md',
  style,
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const shapeStyle =
    shape === 'circle'
      ? styles.shapeCircle
      : shape === 'square'
      ? styles.shapeSquare
      : styles.shapeRounded;

  const sizeContainerStyle =
    size === 'sm'
      ? styles.containerSm
      : size === 'lg'
      ? styles.containerLg
      : styles.containerMd;

  return (
    <BaseButton
      {...restProps}
      size={size}
      variant={restProps.variant ?? 'ghost'}
      testID={testID ?? `icon-btn-${iconName}`}
      accessibilityLabel={accessibilityLabel ?? `Action ${iconName}`}
      style={[styles.base, shapeStyle, sizeContainerStyle, style]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </BaseButton>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeCircle: {
    borderRadius: 9999,
  },
  shapeSquare: {
    borderRadius: 0,
  },
  shapeRounded: {
    borderRadius: 8,
  },
  containerSm: {
    width: 28,
    height: 28,
  },
  containerMd: {
    width: 36,
    height: 36,
  },
  containerLg: {
    width: 44,
    height: 44,
  },
});
