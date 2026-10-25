import { MarketingShowcase, MarketingShowcaseProps, getCorridorTestId } from '../MarketingShowcase';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<MarketingShowcaseProps> = {
  title: 'Feature/MarketingShowcase',
  component: MarketingShowcase,
  args: {
    onExplorePress: () => {},
  },
};

export default meta;

export const Default: StoryObj<MarketingShowcaseProps> = {
  args: {
    onExplorePress: () => {},
  },
};

export const InteractiveExplore: StoryObj<MarketingShowcaseProps> = {
  args: {
    onExplorePress: () => {},
  },
  play: async ({ canvasElement }) => {
    const heroCard = canvasElement.getByTestId('marketing-hero-card');
    expect(heroCard).toBeTruthy();
    expect(canvasElement.getByText('Plan your European rail journey')).toBeTruthy();

    const exploreBtn = canvasElement.getByTestId('marketing-explore-btn');
    fireEvent.press(exploreBtn);
  },
};

export const StaticReducedMotion: StoryObj<MarketingShowcaseProps> = {
  args: {
    animated: false,
    onExplorePress: () => {},
  },
};

export const FeaturedCorridorsInspection: StoryObj<MarketingShowcaseProps> = {
  args: {
    onExplorePress: () => {},
  },
  play: async ({ canvasElement }) => {
    // Assert Hero and Companion Mascots are rendered
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

    // Assert corridor cards are rendered as static informational cards
    expect(canvasElement.getByTestId(getCorridorTestId('București Nord', 'Brașov'))).toBeTruthy();
    expect(canvasElement.getByTestId(getCorridorTestId('București Nord', 'Constanța'))).toBeTruthy();
    expect(canvasElement.getByTestId(getCorridorTestId('Cluj-Napoca', 'București Nord'))).toBeTruthy();
    expect(canvasElement.getByTestId(getCorridorTestId('București Nord', 'Viena Hbf'))).toBeTruthy();
  },
};
