import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { BaseButton, BaseButtonProps } from './BaseButton';

export interface PlanButtonProps extends Omit<BaseButtonProps, 'variant' | 'iconLeft' | 'iconRight'> {
  /** Whether the journey is already in the user's itinerary */
  isSaved?: boolean;
  /** Whether the train service has been cancelled */
  isCancelled?: boolean;
  /** Train number for accessible announcement */
  trainNumber?: string;
  /** Label variant: compact (e.g. '+ Plan') vs full (e.g. 'Add to Trip Planner') */
  labelMode?: 'compact' | 'full';
}

export const PlanButton: React.FC<PlanButtonProps> = ({
  isSaved = false,
  isCancelled = false,
  trainNumber,
  labelMode = 'compact',
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  testID,
  onHoverIn,
  onHoverOut,
  ...restProps
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isCompact = labelMode === 'compact';

  const handleHoverIn = () => {
    setIsHovered(true);
    onHoverIn?.();
  };

  const handleHoverOut = () => {
    setIsHovered(false);
    onHoverOut?.();
  };

  let title = isCompact ? '+ Plan' : 'Add to Trip Planner';
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'add-circle-outline';
  let iconColor = '#FFFFFF';
  let customStyle = undefined;
  let customTextStyle = undefined;
  let defaultA11yLabel = trainNumber
    ? `Add train ${trainNumber} to trip`
    : 'Add to Trip';

  if (isCancelled) {
    title = isCompact ? 'Cancelled' : 'Train Cancelled';
    iconName = 'close-circle';
    iconColor = '#991B1B';
    customStyle = styles.cancelledBtn;
    customTextStyle = styles.cancelledText;
    defaultA11yLabel = 'Cancelled train cannot be added';
  } else if (isSaved) {
    title = isCompact ? 'In Trip' : 'Added to Itinerary';
    iconName = 'checkmark-circle';
    iconColor = '#166534';
    customStyle = isHovered ? styles.savedHoverBtn : styles.savedBtn;
    customTextStyle = styles.savedText;
    defaultA11yLabel = trainNumber
      ? `Train ${trainNumber} is already in your trip`
      : 'In your Trip';
  }

  return (
    <BaseButton
      {...restProps}
      variant={isSaved || isCancelled ? 'surface' : 'primary'}
      title={title}
      disabled={disabled || isCancelled}
      testID={testID ?? `plan-btn-${isCancelled ? 'cancelled' : isSaved ? 'saved' : 'add'}`}
      accessibilityLabel={accessibilityLabel ?? defaultA11yLabel}
      iconLeft={<Ionicons name={iconName} size={isCompact ? 16 : 20} color={iconColor} />}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[customStyle, style]}
      textStyle={[customTextStyle, textStyle]}
    />
  );
};

const styles = StyleSheet.create({
  savedBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  savedHoverBtn: {
    backgroundColor: '#BBF7D0',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  savedText: {
    color: '#166534',
  },
  cancelledBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    opacity: 0.85,
  },
  cancelledText: {
    color: '#991B1B',
  },
});
