import { MascotBee, MascotBeeProps } from '../MascotBee';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<MascotBeeProps> = {
  title: 'UI/MascotBee',
  component: MascotBee,
  args: {
    name: 'barnaby',
    size: 'md',
    animated: true,
  },
};

export default meta;

export const BarnabyScout: StoryObj<MascotBeeProps> = {
  args: {
    name: 'barnaby',
    size: 'lg',
    animated: true,
  },
};

export const HoneySaver: StoryObj<MascotBeeProps> = {
  args: {
    name: 'honey',
    size: 'lg',
    animated: true,
  },
};

export const BumbleGuard: StoryObj<MascotBeeProps> = {
  args: {
    name: 'bumble',
    size: 'lg',
    animated: true,
  },
};

export const SmallSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'barnaby',
    size: 'sm',
  },
};

export const MediumSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'honey',
    size: 'md',
  },
};

export const LargeSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'bumble',
    size: 'lg',
  },
};

export const ExtraLargeSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'barnaby',
    size: 'xl',
  },
};

export const StaticNoAnimation: StoryObj<MascotBeeProps> = {
  args: {
    name: 'honey',
    animated: false,
    size: 'lg',
  },
};

export const InteractiveHover: StoryObj<MascotBeeProps> = {
  args: {
    name: 'barnaby',
    size: 'md',
    onPress: () => {},
  },
  play: async ({ canvasElement }) => {
    const mascot = canvasElement.getByTestId('mascot-bee-barnaby');
    expect(mascot).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-wing-left')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-wing-right')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-barnaby')).toBeTruthy();
    fireEvent(mascot, 'hoverIn');
    fireEvent(mascot, 'hoverOut');
    fireEvent.press(mascot);
  },
};
