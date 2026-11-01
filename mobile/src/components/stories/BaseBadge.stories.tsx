import { BaseBadge, BaseBadgeProps } from '../BaseBadge';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<BaseBadgeProps> = {
  title: 'UI/BaseBadge',
  component: BaseBadge,
  args: {
    label: 'Standard',
    variant: 'default',
    size: 'sm',
  },
};

export default meta;

export const DefaultBadge: StoryObj<BaseBadgeProps> = {
  args: {
    label: 'Default',
    variant: 'default',
  },
};

export const SuccessBadge: StoryObj<BaseBadgeProps> = {
  args: {
    label: 'On Time',
    variant: 'success',
  },
};

export const WarningBadge: StoryObj<BaseBadgeProps> = {
  args: {
    label: '+15 min Delay',
    variant: 'warning',
  },
};

export const DangerBadge: StoryObj<BaseBadgeProps> = {
  args: {
    label: 'Cancelled',
    variant: 'danger',
  },
};

export const InfoBadge: StoryObj<BaseBadgeProps> = {
  args: {
    label: 'Boarding',
    variant: 'info',
  },
};

export const InteractiveChipSelected: StoryObj<BaseBadgeProps> = {
  args: {
    label: 'Active Filter',
    variant: 'neutral',
    size: 'md',
    selected: true,
    onPress: () => {},
  },
  play: async ({ canvasElement }) => {
    const chip = canvasElement.getByRole('button');
    fireEvent(chip, 'hoverIn');
    fireEvent(chip, 'hoverOut');
    fireEvent.press(chip);
  },
};
