import { CozyHoneyBackground, CozyHoneyBackgroundProps } from '../CozyHoneyBackground';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

const meta: StoryMeta<CozyHoneyBackgroundProps> = {
  title: 'Atmosphere/CozyHoneyBackground',
  component: CozyHoneyBackground,
  args: {
    animated: true,
    particleCount: 8,
  },
};

export default meta;

export const Default: StoryObj<CozyHoneyBackgroundProps> = {
  args: {
    animated: true,
    particleCount: 8,
  },
};

export const StaticReducedMotion: StoryObj<CozyHoneyBackgroundProps> = {
  args: {
    animated: false,
    particleCount: 8,
  },
};

export const DensePollen: StoryObj<CozyHoneyBackgroundProps> = {
  args: {
    animated: true,
    particleCount: 16,
  },
};

export const CozyHoneycombTexture: StoryObj<CozyHoneyBackgroundProps> = {
  args: {
    animated: true,
    particleCount: 12,
    showTexture: true,
  },
};

export const InteractivePlay: StoryObj<CozyHoneyBackgroundProps> = {
  args: {
    animated: true,
    particleCount: 8,
    showTexture: true,
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.getByTestId('cozy-honey-background')).toBeTruthy();
    expect(canvasElement.getByTestId('cozy-honeycomb-texture')).toBeTruthy();
    expect(canvasElement.getByTestId('honeycomb-watermark')).toBeTruthy();
    expect(canvasElement.getByTestId('honeycomb-watermark-secondary')).toBeTruthy();
    expect(canvasElement.getByTestId('pollen-particle-0')).toBeTruthy();
    expect(canvasElement.getByTestId('pollen-particle-7')).toBeTruthy();
  },
};
