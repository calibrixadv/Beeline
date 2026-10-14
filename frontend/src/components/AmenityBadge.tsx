import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Amenity } from '../types/train';
import { BaseBadge, BaseBadgeProps } from './BaseBadge';

export interface AmenityBadgeProps
  extends Omit<BaseBadgeProps, 'label' | 'icon' | 'variant'> {
  /** Amenity enum type */
  amenity: Amenity;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * AmenityBadge - Extends BaseBadge to render onboard train amenities
 * with semantic icons and accessible labels.
 */
export const AmenityBadge: React.FC<AmenityBadgeProps> = ({
  amenity,
  testID,
  ...restProps
}) => {
  const getAmenityConfig = (
    type: Amenity
  ): { name: IoniconsName; label: string } => {
    switch (type) {
      case 'WIFI':
        return { name: 'wifi', label: 'Free Wi-Fi' };
      case 'POWER_OUTLETS':
        return { name: 'flash', label: 'Power outlets' };
      case 'DINING_CAR':
        return { name: 'restaurant', label: 'Dining car' };
      case 'BIKE_STORAGE':
        return { name: 'bicycle', label: 'Bike storage' };
      case 'WHEELCHAIR_ACCESSIBLE':
        return { name: 'body', label: 'Accessible' };
      case 'QUIET_ZONE':
        return { name: 'volume-mute', label: 'Quiet zone' };
      default:
        return { name: 'checkmark-circle-outline', label: type };
    }
  };

  const config = getAmenityConfig(amenity);

  return (
    <BaseBadge
      {...restProps}
      label={config.label}
      variant="neutral"
      icon={<Ionicons name={config.name} size={14} color="#64748B" />}
      accessibilityLabel={`Amenity: ${config.label}`}
      testID={testID ?? `amenity-badge-${amenity.toLowerCase()}`}
    />
  );
};
