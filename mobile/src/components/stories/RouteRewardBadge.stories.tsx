import { RouteRewardBadge, RouteRewardBadgeProps } from '../RouteRewardBadge';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<RouteRewardBadgeProps> = {
  title: 'UI/RouteRewardBadge',
  component: RouteRewardBadge,
  args: {
    type: 'lightning',
    size: 'md',
    label: 'Fastest',
  },
};

export default meta;

export const FastestLightning: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'lightning',
    label: 'Fastest',
    size: 'md',
  },
};

export const BestValueNectar: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'nectar',
    label: 'Best Value',
    size: 'md',
  },
};

export const MostReliableShield: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'shield',
    label: 'Most Reliable',
    size: 'md',
  },
};

export const SmallLightning: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'lightning',
    size: 'sm',
  },
};

export const SmallNectar: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'nectar',
    size: 'sm',
  },
};

export const SmallShield: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'shield',
    size: 'sm',
  },
};

export const DisabledShield: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'shield',
    label: 'Buffer Reserved',
    size: 'md',
    disabled: true,
  },
};

export const InteractivePress: StoryObj<RouteRewardBadgeProps> = {
  args: {
    type: 'lightning',
    label: 'Fastest Route',
    size: 'md',
    onPress: () => {},
  },
  play: async ({ canvasElement }) => {
    const badge = canvasElement.getByRole('button');
    expect(badge).toBeTruthy();
    expect(canvasElement.getByTestId('badge-icon-lightning')).toBeTruthy();
    expect(canvasElement.getByText('Fastest Route')).toBeTruthy();
    fireEvent(badge, 'hoverIn');
    fireEvent(badge, 'hoverOut');
    fireEvent.press(badge);
  },
};
