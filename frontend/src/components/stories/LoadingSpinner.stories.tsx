import { LoadingSpinner, LoadingSpinnerProps } from '../LoadingSpinner';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

const meta: StoryMeta<LoadingSpinnerProps> = {
  title: 'Feedback/LoadingSpinner',
  component: LoadingSpinner,
  args: {
    size: 'md',
    label: 'Loading routes...',
    placeholderIcon: true,
  },
};

export default meta;

export const Default: StoryObj<LoadingSpinnerProps> = {
  args: {
    size: 'md',
    label: 'Loading Beeline routes...',
  },
};

export const Small: StoryObj<LoadingSpinnerProps> = {
  args: {
    size: 'sm',
    label: 'Updating status...',
  },
};

export const Large: StoryObj<LoadingSpinnerProps> = {
  args: {
    size: 'lg',
    label: 'Connecting to rail corridor network...',
    subtitle: 'Synchronizing timetable data',
  },
};

export const ExtraLarge: StoryObj<LoadingSpinnerProps> = {
  args: {
    size: 'xl',
    label: 'Loading high-speed timetable...',
    subtitle: 'Searching 12 European cross-border corridors',
  },
};

export const WithoutPlaceholderMark: StoryObj<LoadingSpinnerProps> = {
  args: {
    size: 'md',
    placeholderIcon: false,
    label: 'Minimalist spinner',
  },
};

export const CustomColor: StoryObj<LoadingSpinnerProps> = {
  args: {
    size: 'lg',
    color: '#FFC700',
    trackColor: '#18181B',
    label: 'Beeline High-Contrast Yellow',
  },
};
