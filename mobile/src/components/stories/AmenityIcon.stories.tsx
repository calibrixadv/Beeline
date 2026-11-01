import React from 'react';
import { AmenityIcon } from '../AmenityIcon';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

type AmenityIconProps = React.ComponentProps<typeof AmenityIcon>;

const meta: StoryMeta<AmenityIconProps> = {
  title: 'UI/AmenityIcon',
  component: AmenityIcon,
  args: {
    amenity: 'WIFI',
  },
};

export default meta;

export const WiFi: StoryObj<AmenityIconProps> = {
  args: {
    amenity: 'WIFI',
  },
};

export const PowerOutlets: StoryObj<AmenityIconProps> = {
  args: {
    amenity: 'POWER_OUTLETS',
  },
};

export const DiningCar: StoryObj<AmenityIconProps> = {
  args: {
    amenity: 'DINING_CAR',
  },
};
