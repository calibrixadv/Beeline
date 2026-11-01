import React from 'react';
import { TrainDetailModal } from '../TrainDetailModal';
import { SAMPLE_TRAINS } from '../../data/sampleTrains';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

type TrainDetailModalProps = React.ComponentProps<typeof TrainDetailModal>;

const meta: StoryMeta<TrainDetailModalProps> = {
  title: 'Feature/TrainDetailModal',
  component: TrainDetailModal,
  args: {
    journey: SAMPLE_TRAINS[0],
    visible: true,
    onClose: () => {},
  },
};

export default meta;

export const StandardVisibleModal: StoryObj<TrainDetailModalProps> = {
  args: {
    journey: SAMPLE_TRAINS[0],
    visible: true,
    onClose: () => {},
  },
};

export const CancelledTrainModal: StoryObj<TrainDetailModalProps> = {
  args: {
    journey: SAMPLE_TRAINS.find((t) => t.status === 'CANCELLED') || SAMPLE_TRAINS[3],
    visible: true,
    onClose: () => {},
  },
};
