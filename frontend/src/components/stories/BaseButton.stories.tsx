import { BaseButton, BaseButtonProps } from '../BaseButton';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<BaseButtonProps> = {
  title: 'UI/BaseButton',
  component: BaseButton,
  args: {
    title: 'Click Me',
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
  },
};

export default meta;

export const Primary: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Primary Action',
    variant: 'primary',
  },
};

export const Secondary: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Secondary Action',
    variant: 'secondary',
  },
};

export const Outline: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Outline Action',
    variant: 'outline',
  },
};

export const Ghost: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Ghost Action',
    variant: 'ghost',
  },
};

export const Danger: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Danger Action',
    variant: 'danger',
  },
};

export const Success: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Success Action',
    variant: 'success',
  },
};

export const Loading: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Submitting',
    loading: true,
    loadingText: 'Loading...',
  },
};

export const Disabled: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Disabled Action',
    disabled: true,
  },
};

export const InteractivePlay: StoryObj<BaseButtonProps> = {
  args: {
    title: 'Automated Play Button',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.getByRole('button');
    fireEvent(btn, 'hoverIn');
    fireEvent(btn, 'hoverOut');
    fireEvent.press(btn);
  },
};
