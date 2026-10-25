import { PlanButton, PlanButtonProps } from '../PlanButton';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<PlanButtonProps> = {
  title: 'UI/PlanButton',
  component: PlanButton,
  args: {
    trainNumber: 'TGV 6612',
    isSaved: false,
    isCancelled: false,
    labelMode: 'compact',
  },
};

export default meta;

export const UnplannedCompact: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: false,
    isCancelled: false,
    labelMode: 'compact',
  },
};

export const InTripCompact: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: true,
    isCancelled: false,
    labelMode: 'compact',
  },
};

export const CancelledCompact: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: false,
    isCancelled: true,
    labelMode: 'compact',
  },
};

export const UnplannedFull: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: false,
    isCancelled: false,
    labelMode: 'full',
  },
};

export const InTripFull: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: true,
    isCancelled: false,
    labelMode: 'full',
  },
};

export const CancelledFull: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: false,
    isCancelled: true,
    labelMode: 'full',
  },
};

export const InteractivePlan: StoryObj<PlanButtonProps> = {
  args: {
    isSaved: false,
    trainNumber: 'ICE 9553',
    labelMode: 'compact',
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.getByRole('button');
    fireEvent(btn, 'hoverIn');
    fireEvent(btn, 'hoverOut');
    fireEvent.press(btn);
  },
};
