import { IconButton, IconButtonProps } from '../IconButton';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<IconButtonProps> = {
  title: 'UI/IconButton',
  component: IconButton,
  args: {
    iconName: 'heart',
    shape: 'circle',
    size: 'md',
  },
};

export default meta;

export const CloseCircle: StoryObj<IconButtonProps> = {
  args: {
    iconName: 'close',
    shape: 'circle',
    size: 'md',
  },
};

export const SearchRounded: StoryObj<IconButtonProps> = {
  args: {
    iconName: 'search',
    shape: 'rounded',
    size: 'sm',
  },
};

export const SquareFilter: StoryObj<IconButtonProps> = {
  args: {
    iconName: 'options-outline',
    shape: 'square',
    size: 'lg',
  },
};

export const InteractiveIconButton: StoryObj<IconButtonProps> = {
  args: {
    iconName: 'bookmark-outline',
    shape: 'circle',
    size: 'md',
    onPress: () => {},
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.getByRole('button');
    fireEvent(btn, 'hoverIn');
    fireEvent(btn, 'hoverOut');
    fireEvent.press(btn);
  },
};
