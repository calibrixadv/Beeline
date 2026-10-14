import React, { useEffect } from 'react';
import { TripSummaryBanner } from '../TripSummaryBanner';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';
import { useTripPlanner } from '../../context/TripContext';
import { SAMPLE_TRAINS } from '../../data/sampleTrains';

const TripBannerWithItems: React.FC = () => {
  const { addTrainToTrip } = useTripPlanner();
  useEffect(() => {
    addTrainToTrip(SAMPLE_TRAINS[0], 'STANDARD', '2026-10-15');
  }, [addTrainToTrip]);

  return <TripSummaryBanner />;
};

const meta: StoryMeta = {
  title: 'Feature/TripSummaryBanner',
  component: TripBannerWithItems,
};

export default meta;

export const DefaultBanner: StoryObj = {};
