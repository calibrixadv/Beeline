import { ScreenLoader, ScreenLoaderProps } from '../ScreenLoader';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

const meta: StoryMeta<ScreenLoaderProps> = {
  title: 'Feedback/ScreenLoader',
  component: ScreenLoader,
  args: {
    visible: true,
    message: 'Loading Beeline Express Routes...',
    subtitle: 'Fetching timetable and corridor availability',
    spinnerSize: 'lg',
    fullScreen: false,
  },
};

export default meta;

export const Default: StoryObj<ScreenLoaderProps> = {
  args: {
    visible: true,
    message: 'Loading Beeline Express Routes...',
    subtitle: 'Fetching timetable and corridor availability',
    fullScreen: false,
  },
};

export const SwitchingScreen: StoryObj<ScreenLoaderProps> = {
  args: {
    visible: true,
    message: 'Switching to Schedules...',
    subtitle: 'Updating active rail corridors',
    fullScreen: false,
  },
};

export const RouteTransition: StoryObj<ScreenLoaderProps> = {
  args: {
    visible: true,
    message: 'Booking Journey Leg...',
    subtitle: 'Reserving seat compartment with operator',
    spinnerSize: 'xl',
    fullScreen: false,
  },
};
