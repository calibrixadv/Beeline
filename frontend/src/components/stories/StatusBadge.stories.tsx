import { StatusBadge, StatusBadgeProps } from '../StatusBadge';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<StatusBadgeProps> = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  args: {
    status: 'ON_TIME',
    delayMinutes: 0,
  },
};

export default meta;

export const OnTime: StoryObj<StatusBadgeProps> = {
  args: {
    status: 'ON_TIME',
  },
};

export const Delayed: StoryObj<StatusBadgeProps> = {
  args: {
    status: 'DELAYED',
    delayMinutes: 25,
  },
};

export const Boarding: StoryObj<StatusBadgeProps> = {
  args: {
    status: 'BOARDING',
  },
};

export const Cancelled: StoryObj<StatusBadgeProps> = {
  args: {
    status: 'CANCELLED',
  },
};

export const InteractiveFilterStatus: StoryObj<StatusBadgeProps> = {
  args: {
    status: 'ON_TIME',
    onPress: () => {},
  },
  play: async ({ canvasElement }) => {
    const badge = canvasElement.getByRole('button');
    fireEvent(badge, 'hoverIn');
    fireEvent(badge, 'hoverOut');
    fireEvent.press(badge);
  },
};
