import { RouteFinderCard, RouteFinderCardProps } from '../RouteFinderCard';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<RouteFinderCardProps> = {
  title: 'Feature/RouteFinderCard',
  component: RouteFinderCard,
  args: {
    initialOrigin: 'București Nord',
    initialDestination: 'Brașov',
    initialModes: ['Trains', 'Metro', 'Busses'],
  },
};

export default meta;

export const Default: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'București Nord',
    initialDestination: 'Brașov',
    initialModes: ['Trains', 'Metro', 'Busses'],
  },
};

export const TrainsOnly: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'București Nord',
    initialDestination: 'Constanța',
    initialModes: ['Trains'],
  },
};

export const InteractiveSwap: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'București Nord',
    initialDestination: 'Brașov',
    initialModes: ['Trains', 'Metro'],
  },
  play: async ({ canvasElement }) => {
    const swapButton = canvasElement.getByTestId('route-swap-button');
    fireEvent.press(swapButton);
  },
};

export const InteractiveSubmitPrepared: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'Cluj-Napoca',
    initialDestination: 'București Nord',
    initialModes: ['Trains', 'Busses'],
  },
  play: async ({ canvasElement }) => {
    const submitBtn = canvasElement.getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    // Verifies the prepared feedback banner is shown and no redirect occurs
    expect(canvasElement.getByTestId('route-submission-feedback')).toBeTruthy();
  },
};

export const InteractiveToggleMode: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'Timișoara Nord',
    initialDestination: 'București Nord',
    initialModes: ['Trains'],
  },
  play: async ({ canvasElement }) => {
    const metroFilter = canvasElement.getByTestId('mode-filter-metro');
    fireEvent.press(metroFilter);
  },
};

export const WithValidationError: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: '',
    initialDestination: '',
  },
  play: async ({ canvasElement }) => {
    const submitBtn = canvasElement.getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    expect(canvasElement.getByTestId('route-validation-error')).toBeTruthy();
  },
};

export const DuplicateDiacriticValidation: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'București',
    initialDestination: 'Bucuresti',
  },
  play: async ({ canvasElement }) => {
    const submitBtn = canvasElement.getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    expect(canvasElement.getByTestId('route-validation-error')).toBeTruthy();
    expect(canvasElement.getByText('Origin and destination cannot be identical.')).toBeTruthy();
    expect(canvasElement.queryByTestId('route-submission-feedback')).toBeNull();
  },
};

