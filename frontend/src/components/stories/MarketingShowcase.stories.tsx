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
    const exploreBtn = canvasElement.getByTestId('marketing-explore-btn');
    fireEvent.press(exploreBtn);
  },
};

export const InteractiveCorridorClick: StoryObj<MarketingShowcaseProps> = {
  args: {
    onCorridorPress: () => {},
  },
  play: async ({ canvasElement }) => {
    // Assert all Romanian corridor labels and gateway connections are rendered
    expect(canvasElement.getAllByText('București Nord').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Brașov').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Constanța').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Cluj-Napoca').length).toBeGreaterThan(0);
    expect(canvasElement.getAllByText('Viena Hbf').length).toBeGreaterThan(0);

    // Assert Curated Trifecta feature cards are rendered
    expect(canvasElement.getByTestId('feature-card-direct-corridors')).toBeTruthy();
    expect(canvasElement.getByTestId('feature-card-value-engine')).toBeTruthy();
    expect(canvasElement.getByTestId('feature-card-transfer-shield')).toBeTruthy();
    expect(canvasElement.getByTestId('feature-card-eco-savings')).toBeTruthy();

    const domesticCard = canvasElement.getByTestId(getCorridorTestId('București Nord', 'Brașov'));
    fireEvent.press(domesticCard);

    const gatewayCard = canvasElement.getByTestId(getCorridorTestId('București Nord', 'Viena Hbf'));
    fireEvent.press(gatewayCard);
  },
};
