import React from 'react';
import { TrainStatus } from '../types/train';
import { getStatusTheme } from '../utils/trainFilters';
import { BaseBadge, BaseBadgeProps, BadgeVariant } from './BaseBadge';

export interface StatusBadgeProps extends Omit<BaseBadgeProps, 'label' | 'variant'> {
  /** Operational status of the train */
  status: TrainStatus;
  /** Delay duration in minutes (if status is DELAYED) */
  delayMinutes?: number;
}

/**
 * StatusBadge - Extends BaseBadge to present live railway operational statuses
 * with color-coded semantic themes and accessibility labels.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  delayMinutes = 0,
  style,
  textStyle,
  testID,
  ...restProps
}) => {
  const theme = getStatusTheme(status);
  const displayText =
    status === 'DELAYED' && delayMinutes > 0
      ? `+${delayMinutes} min Delay`
      : theme.label;

  const getStatusVariant = (): BadgeVariant => {
    switch (status) {
      case 'ON_TIME':
        return 'success';
      case 'DELAYED':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      case 'BOARDING':
        return 'info';
      default:
        return 'default';
    }
  };

  const isInteractive =
    typeof restProps.onPress === 'function' ||
    typeof restProps.onHoverIn === 'function' ||
    typeof restProps.onHoverOut === 'function';

  return (
    <BaseBadge
      {...restProps}
      label={displayText}
      variant={getStatusVariant()}
      accessibilityRole={restProps.accessibilityRole ?? (isInteractive ? 'button' : 'text')}
      accessibilityLabel={restProps.accessibilityLabel ?? `Status: ${displayText}`}
      testID={testID ?? `status-badge-${status.toLowerCase()}`}
      style={[{ backgroundColor: theme.backgroundColor }, style]}
      textStyle={[{ color: theme.textColor }, textStyle]}
    />
  );
};
