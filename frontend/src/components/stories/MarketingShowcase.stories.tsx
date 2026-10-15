import { MarketingShowcase, MarketingShowcaseProps } from '../MarketingShowcase';
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
    const corridorCard = canvasElement.getByTestId('featured-corridor-paris-lyon');
    fireEvent.press(corridorCard);
  },
};
