import { TripFilterBar, TripFilterBarProps } from '../TripFilterBar';
import { DEFAULT_TRIP_FILTERS, POPULAR_ROMANIAN_PROVIDERS } from '../../services/tripBookingService';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<TripFilterBarProps> = {
  title: 'Feature/TripFilterBar',
  component: TripFilterBar,
  args: {
    filters: DEFAULT_TRIP_FILTERS,
    availableOperators: POPULAR_ROMANIAN_PROVIDERS,
    totalResultsCount: 4,
    filteredResultsCount: 4,
    onFilterChange: () => {},
    onResetFilters: () => {},
  },
};

export default meta;

export const Default: StoryObj<TripFilterBarProps> = {
  args: {
    filters: DEFAULT_TRIP_FILTERS,
    totalResultsCount: 4,
    filteredResultsCount: 4,
  },
};

export const WithActiveFilters: StoryObj<TripFilterBarProps> = {
  args: {
    filters: {
      ...DEFAULT_TRIP_FILTERS,
      modes: ['TRAIN'],
      providers: ['CFR Călători', 'Astra Trans Carpatic'],
      maxPriceLei: 70,
      sortBy: 'price',
    },
    totalResultsCount: 4,
    filteredResultsCount: 2,
  },
};

export const FilteredByPillar: StoryObj<TripFilterBarProps> = {
  args: {
    filters: {
      ...DEFAULT_TRIP_FILTERS,
      pillar: 'FASTEST',
      sortBy: 'duration',
    },
    totalResultsCount: 4,
    filteredResultsCount: 1,
  },
};

export const InteractiveToggleFilters: StoryObj<TripFilterBarProps> = {
  args: {
    filters: DEFAULT_TRIP_FILTERS,
    totalResultsCount: 4,
    filteredResultsCount: 4,
  },
  play: async ({ canvasElement }) => {
    // Assert Curated Trifecta title renders
    expect(canvasElement.getByText('CURATED TRIFECTA PILLARS')).toBeTruthy();

    // Toggle a pillar
    const fastestPillarBtn = canvasElement.getByTestId('filter-pillar-fastest');
    fireEvent.press(fastestPillarBtn);

    // Toggle a mode
    const metroBtn = canvasElement.getByTestId('filter-mode-metro');
    fireEvent.press(metroBtn);
  },
};
