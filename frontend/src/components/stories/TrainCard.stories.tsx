import React from 'react';
import { TrainCard } from '../TrainCard';
import { SAMPLE_TRAINS } from '../../data/sampleTrains';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

type TrainCardProps = React.ComponentProps<typeof TrainCard>;

const meta: StoryMeta<TrainCardProps> = {
  title: 'Feature/TrainCard',
  component: TrainCard,
  args: {
    journey: SAMPLE_TRAINS[0],
    onPressDetails: () => {},
  },
};

export default meta;

export const OnTimeJourney: StoryObj<TrainCardProps> = {
  args: {
    journey: SAMPLE_TRAINS[0], // TGV INOUI 6612
    onPressDetails: () => {},
  },
};

export const DelayedJourney: StoryObj<TrainCardProps> = {
  args: {
    journey: SAMPLE_TRAINS.find((t) => t.status === 'DELAYED') || SAMPLE_TRAINS[1],
    onPressDetails: () => {},
  },
};

export const CancelledJourney: StoryObj<TrainCardProps> = {
  args: {
    journey: SAMPLE_TRAINS.find((t) => t.status === 'CANCELLED') || SAMPLE_TRAINS[3],
    onPressDetails: () => {},
  },
};
