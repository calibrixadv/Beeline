import { MarketingShowcase, MarketingShowcaseProps, getCorridorTestId } from '../MarketingShowcase';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<MarketingShowcaseProps> = {
  title: 'Feature/MarketingShowcase',
  component: MarketingShowcase,
  args: {
    onExplorePress: () => {},
    onCorridorPress: () => {},
  },
};

export default meta;

export const Default: StoryObj<MarketingShowcaseProps> = {
  args: {
    onExplorePress: () => {},
    onCorridorPress: () => {},
  },
};

export const InteractiveExplore: StoryObj<MarketingShowcaseProps> = {
  args: {
    onExplorePress: () => {},
  },
  play: async ({ canvasElement }) => {
    const heroCard = canvasElement.getByTestId('marketing-hero-card');
    expect(heroCard).toBeTruthy();
    expect(canvasElement.getByText('Make a beeline across Romania & Europe')).toBeTruthy();

    const exploreBtn = canvasElement.getByTestId('marketing-explore-btn');
    fireEvent.press(exploreBtn);
  },
};

export const StaticReducedMotion: StoryObj<MarketingShowcaseProps> = {
  args: {
    animated: false,
    onExplorePress: () => {},
    onCorridorPress: () => {},
  },
};

export const InteractiveCorridorClick: StoryObj<MarketingShowcaseProps> = {
  args: {
    onCorridorPress: () => {},
  },
  play: async ({ canvasElement }) => {
    // Assert Hero and Trifecta Mascots are rendered
    expect(canvasElement.getByTestId('marketing-hero-card')).toBeTruthy();
    expect(canvasElement.getAllByTestId('mascot-bee-barnaby').length).toBeGreaterThan(0);
    expect(canvasElement.getByTestId('mascot-bee-honey')).toBeTruthy();
    expect(canvasElement.getByTestId('mascot-bee-bumble')).toBeTruthy();

    // Assert all Romanian corridor labels and gateway connections are rendered
    expect(canvasElement.getAllByText('București Nord').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Brașov').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Constanța').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Cluj-Napoca').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Viena Hbf').length).toBeGreaterThan(0);

    // Assert Waggle Flight Paths are rendered
    const wagglePaths = canvasElement.getAllByTestId('waggle-flight-path');
    expect(wagglePaths.length).toBe(4);

    // Assert Curated Trifecta feature cards are rendered
    expect(canvasElement.getByTestId('feature-card-direct-corridors')).toBeTruthy();
    expect(canvasElement.getByTestId('feature-card-value-engine')).toBeTruthy();
    expect(canvasElement.getByTestId('feature-card-transfer-shield')).toBeTruthy();
    expect(canvasElement.getByTestId('feature-card-eco-savings')).toBeTruthy();

    // Click all 4 Romanian corridor cards
    const card1 = canvasElement.getByTestId(getCorridorTestId('București Nord', 'Brașov'));
    fireEvent.press(card1);

    const card2 = canvasElement.getByTestId(getCorridorTestId('București Nord', 'Constanța'));
    fireEvent.press(card2);

    const card3 = canvasElement.getByTestId(getCorridorTestId('Cluj-Napoca', 'București Nord'));
    fireEvent.press(card3);

    const card4 = canvasElement.getByTestId(getCorridorTestId('București Nord', 'Viena Hbf'));
    fireEvent.press(card4);
  },
};
