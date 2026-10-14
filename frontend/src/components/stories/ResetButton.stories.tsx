import { ResetButton, ResetButtonProps } from '../ResetButton';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<ResetButtonProps> = {
  title: 'UI/ResetButton',
  component: ResetButton,
  args: {
    title: 'Reset',
    showIcon: false,
  },
};

export default meta;

export const Default: StoryObj<ResetButtonProps> = {
  args: {
    title: 'Reset',
  },
};

export const WithRefreshIcon: StoryObj<ResetButtonProps> = {
  args: {
    title: 'Reset All',
    showIcon: true,
  },
};

export const InteractiveReset: StoryObj<ResetButtonProps> = {
  args: {
    title: 'Clear Filters',
    showIcon: true,
    onPress: () => {},
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.getByRole('button');
    fireEvent(btn, 'hoverIn');
    fireEvent(btn, 'hoverOut');
    fireEvent.press(btn);
  },
};
