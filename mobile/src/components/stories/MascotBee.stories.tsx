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
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-goggles-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-barnaby')).toBeTruthy();
  },
};

export const HoneySaver: StoryObj<MascotBeeProps> = {
  args: {
    name: 'honey',
    size: 'lg',
    animated: true,
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-glasses-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-coin-honey')).toBeTruthy();
  },
};

export const BumbleGuard: StoryObj<MascotBeeProps> = {
  args: {
    name: 'bumble',
    size: 'lg',
    animated: true,
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-bumble')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-scarf-bumble')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-bumble')).toBeTruthy();
  },
};

export const SmallSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'barnaby',
    size: 'sm',
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-goggles-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-barnaby')).toBeTruthy();
  },
};

export const MediumSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'honey',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-glasses-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-coin-honey')).toBeTruthy();
  },
};

export const LargeSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'bumble',
    size: 'lg',
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-bumble')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-scarf-bumble')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-bumble')).toBeTruthy();
  },
};

export const ExtraLargeSize: StoryObj<MascotBeeProps> = {
  args: {
    name: 'barnaby',
    size: 'xl',
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-goggles-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-barnaby')).toBeTruthy();
  },
};

export const StaticNoAnimation: StoryObj<MascotBeeProps> = {
  args: {
    name: 'honey',
    animated: false,
    size: 'lg',
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('mascot-bee-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-glasses-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-coin-honey')).toBeTruthy();
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
    expect(canvasElement.getByTestId('mascot-goggles-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-accessory-barnaby')).toBeTruthy();
    fireEvent(mascot, 'hoverIn');
    fireEvent(mascot, 'hoverOut');
    fireEvent.press(mascot);
  },
};
