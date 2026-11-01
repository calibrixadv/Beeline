import { AmenityBadge, AmenityBadgeProps } from '../AmenityBadge';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

const meta: StoryMeta<AmenityBadgeProps> = {
  title: 'UI/AmenityBadge',
  component: AmenityBadge,
  args: {
    amenity: 'WIFI',
  },
};

export default meta;

export const WiFi: StoryObj<AmenityBadgeProps> = {
  args: {
    amenity: 'WIFI',
  },
};

export const DiningCar: StoryObj<AmenityBadgeProps> = {
  args: {
    amenity: 'DINING_CAR',
  },
};

export const PowerOutlets: StoryObj<AmenityBadgeProps> = {
  args: {
    amenity: 'POWER_OUTLETS',
  },
};

export const WheelchairAccessible: StoryObj<AmenityBadgeProps> = {
  args: {
    amenity: 'WHEELCHAIR_ACCESSIBLE',
  },
};

export const QuietZone: StoryObj<AmenityBadgeProps> = {
  args: {
    amenity: 'QUIET_ZONE',
  },
};
