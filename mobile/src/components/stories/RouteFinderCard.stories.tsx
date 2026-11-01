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
    // Verifies the waggle flight connector is rendered between origin and destination
    expect(canvasElement.getByTestId('route-waggle-connector')).toBeTruthy();

    const submitBtn = canvasElement.getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    // Verifies the prepared feedback banner is shown and no redirect occurs
    expect(canvasElement.getByTestId('route-submission-feedback')).toBeTruthy();

    // Verifies all 3 Curated Trifecta preview pillars render with their respective mascots
    expect(canvasElement.getByTestId('trifecta-card-fastest')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-barnaby')).toBeTruthy();
    expect(canvasElement.getByText('⚡ Fastest Route')).toBeTruthy();
    expect(canvasElement.getByText('FASTEST')).toBeTruthy();

    expect(canvasElement.getByTestId('trifecta-card-best-value')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-honey')).toBeTruthy();
    expect(canvasElement.getByText('💰 Best Value')).toBeTruthy();
    expect(canvasElement.getByText('BEST VALUE')).toBeTruthy();
    expect(canvasElement.getByText(/€10\/hour saved threshold rule/i)).toBeTruthy();

    expect(canvasElement.getByTestId('trifecta-card-most-reliable')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-bumble')).toBeTruthy();
    expect(canvasElement.getByText('🛡️ Most Reliable')).toBeTruthy();
    expect(canvasElement.getByText('MOST RELIABLE')).toBeTruthy();
    expect(canvasElement.getByText(/25–35 min buffers/i)).toBeTruthy();

    // Verifies shorthand disclaimer
    expect(
      canvasElement.getByText('Shorthand preview: full door-to-door itinerary and booking will load upon future redirect.')
    ).toBeTruthy();
  },
};

export const WarmHoneyWaggleAndMascotTrifecta: StoryObj<RouteFinderCardProps> = {
  args: {
    initialOrigin: 'București Nord',
    initialDestination: 'Brașov',
    initialModes: ['Trains', 'Metro', 'Busses'],
  },
  play: async ({ canvasElement }) => {
    // Assert waggle connector presence and trail glyphs
    expect(canvasElement.getByTestId('route-waggle-connector')).toBeTruthy();
    expect(canvasElement.getByText('── 🐝 ~ ~ ──')).toBeTruthy();
    expect(canvasElement.getByText('── ~ ~ 🐝 ──')).toBeTruthy();

    // Assert transport mode filters with warm honey chip styling
    expect(canvasElement.getByTestId('mode-filter-trains')).toBeTruthy();
    expect(canvasElement.getByTestId('mode-filter-metro')).toBeTruthy();
    expect(canvasElement.getByTestId('mode-filter-busses')).toBeTruthy();

    // Trigger prepared submit to inspect Mascot Trifecta companions
    const submitBtn = canvasElement.getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(canvasElement.getByTestId('route-submission-feedback')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-barnaby')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-bumble')).toBeTruthy();
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

export const WithCurrentCityLocationDropdown: StoryObj<RouteFinderCardProps> = {
  args: {
    initialCity: 'București',
    initialOrigin: 'București Nord',
    initialDestination: 'Brașov',
  },
  play: async ({ canvasElement }) => {
    // Open origin dropdown
    const toggle = canvasElement.getByTestId('origin-dropdown-toggle');
    fireEvent.press(toggle);
    expect(canvasElement.getByTestId('origin-dropdown-menu')).toBeTruthy();
  },
};

export const SmartIntercityPairing: StoryObj<RouteFinderCardProps> = {
  args: {
    initialCity: 'Galați',
    initialOrigin: 'Micro 19',
    initialDestination: 'Bariera Traian',
  },
  play: async ({ canvasElement }) => {
    // Toggle destination dropdown and select outside city
    const toggle = canvasElement.getByTestId('destination-dropdown-toggle');
    fireEvent.press(toggle);

    const outsideHub = canvasElement.getByTestId('dropdown-outside-hub-bv-gara-cfr');
    fireEvent.press(outsideHub);

    // Origin is smartly paired to Gara Galați
    const originInput = canvasElement.getByTestId('route-origin-input');
    expect(originInput.props.value).toBe('Gara Galați');
  },
};

