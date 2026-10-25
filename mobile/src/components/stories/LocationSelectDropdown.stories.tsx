import { LocationSelectDropdown, LocationSelectDropdownProps } from '../LocationSelectDropdown';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<LocationSelectDropdownProps> = {
  title: 'Feature/LocationSelectDropdown',
  component: LocationSelectDropdown,
  args: {
    currentCity: 'București',
    field: 'origin',
    selectedModes: ['Trains', 'Metro', 'Busses'],
  },
};

export default meta;

export const BucharestOrigin: StoryObj<LocationSelectDropdownProps> = {
  args: {
    currentCity: 'București',
    field: 'origin',
    isLocationActive: true,
  },
};

export const GalatiDestination: StoryObj<LocationSelectDropdownProps> = {
  args: {
    currentCity: 'Galați',
    field: 'destination',
    selectedModes: ['Trains', 'Busses'],
  },
};

export const WithRecentSearches: StoryObj<LocationSelectDropdownProps> = {
  args: {
    currentCity: 'București',
    field: 'origin',
    recentChoices: ['Gara de Nord', 'Piața Victoriei'],
  },
};

export const InnercityMetroOnly: StoryObj<LocationSelectDropdownProps> = {
  args: {
    currentCity: 'București',
    field: 'origin',
    selectedModes: ['Metro'],
  },
};

export const InteractiveSelectLocation: StoryObj<LocationSelectDropdownProps> = {
  args: {
    currentCity: 'Galați',
    field: 'origin',
    onSelectLocation: () => {},
  },
  play: async ({ canvasElement }) => {
    const item = canvasElement.getByTestId('dropdown-item-galati-micro-19');
    fireEvent.press(item);
  },
};
