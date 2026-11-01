import React from 'react';
import { render } from '@testing-library/react-native';
import { AmenityBadge } from '../src/components/AmenityBadge';
import { Amenity } from '../src/types/train';

describe('AmenityBadge Component (Extends BaseBadge)', () => {
  const amenities: Amenity[] = [
    'WIFI',
    'POWER_OUTLETS',
    'DINING_CAR',
    'BIKE_STORAGE',
    'WHEELCHAIR_ACCESSIBLE',
    'QUIET_ZONE',
  ];

  it('renders each railway amenity with accurate label and testID', () => {
    amenities.forEach((amenity) => {
      const { getByTestId } = render(<AmenityBadge amenity={amenity} />);
      expect(getByTestId(`amenity-badge-${amenity.toLowerCase()}`)).toBeTruthy();
    });
  });

  it('renders specific text for Free Wi-Fi and Dining car', () => {
    const { getByText: getWifi } = render(<AmenityBadge amenity="WIFI" />);
    expect(getWifi('Free Wi-Fi')).toBeTruthy();

    const { getByText: getDining } = render(<AmenityBadge amenity="DINING_CAR" />);
    expect(getDining('Dining car')).toBeTruthy();
  });
});
