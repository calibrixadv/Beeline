import React from 'react';
import { render } from '@testing-library/react-native';
import { AmenityIcon } from '../src/components/AmenityIcon';
import { Amenity } from '../src/types/train';

describe('AmenityIcon Component', () => {
  const cases: [Amenity, string][] = [
    ['WIFI', 'Free Wi-Fi'],
    ['POWER_OUTLETS', 'Power outlets'],
    ['DINING_CAR', 'Dining car'],
    ['BIKE_STORAGE', 'Bike storage'],
    ['WHEELCHAIR_ACCESSIBLE', 'Accessible'],
    ['QUIET_ZONE', 'Quiet zone'],
  ];

  it.each(cases)('renders icon and text for amenity: %s -> %s', (amenity, expectedLabel) => {
    const { getByLabelText, getByText } = render(<AmenityIcon amenity={amenity} />);
    expect(getByLabelText(expectedLabel)).toBeTruthy();
    expect(getByText(expectedLabel)).toBeTruthy();
  });
});
