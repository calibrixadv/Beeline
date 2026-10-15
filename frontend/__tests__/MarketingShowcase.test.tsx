import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MarketingShowcase, FEATURED_CORRIDORS } from '../src/components/MarketingShowcase';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('MarketingShowcase component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: React.ComponentProps<typeof MarketingShowcase> = {}) => {
    return render(
      <ThemeProvider>
        <MarketingShowcase {...props} />
      </ThemeProvider>
    );
  };

  it('renders hero card, title, and explore CTA', () => {
    const handleExplore = jest.fn();
    const { getByText, getByTestId } = renderComponent({
      onExplorePress: handleExplore,
    });

    expect(getByText('Beeline High-Speed Transit')).toBeTruthy();
    expect(getByText('Plan Your European Rail Journey')).toBeTruthy();
    expect(getByText('Fast high-speed corridors, live status tracking, stop-by-stop itineraries, and transparent eco-impact data.')).toBeTruthy();

    const exploreBtn = getByTestId('marketing-explore-btn');
    fireEvent.press(exploreBtn);

    expect(handleExplore).toHaveBeenCalledTimes(1);
  });

  it('renders the 3 core pillars promoting Beeline (Speed, Coverage, Capabilities)', () => {
    const { getByTestId, getByText } = renderComponent();

    // Pillar 1: Speed
    expect(getByTestId('pillar-speed-card')).toBeTruthy();
    expect(getByText('300+ km/h High-Speed')).toBeTruthy();
    expect(getByText('SPEED')).toBeTruthy();

    // Pillar 2: Cross-Border European Coverage
    expect(getByTestId('pillar-coverage-card')).toBeTruthy();
    expect(getByText('15+ European Countries')).toBeTruthy();
    expect(getByText('COVERAGE')).toBeTruthy();

    // Pillar 3: Capabilities
    expect(getByTestId('pillar-capabilities-card')).toBeTruthy();
    expect(getByText('Multi-Modal & Live Sync')).toBeTruthy();
    expect(getByText('CAPABILITIES')).toBeTruthy();
  });

  it('renders feature highlights matching app capabilities', () => {
    const { getByText } = renderComponent();

    expect(getByText('Why Plan With Beeline?')).toBeTruthy();
    expect(getByText('Live Status')).toBeTruthy();
    expect(getByText('Eco Impact')).toBeTruthy();
    expect(getByText('Stop Details')).toBeTruthy();
    expect(getByText('Tiered Fares')).toBeTruthy();
  });

  it('renders metrics bar and trust guarantees', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(getByTestId('marketing-metrics-card')).toBeTruthy();
    expect(getByText('300+')).toBeTruthy();
    expect(getByText('15+')).toBeTruthy();
    expect(getByText('10k+')).toBeTruthy();
    expect(getByText('85%')).toBeTruthy();

    expect(getByTestId('marketing-trust-card')).toBeTruthy();
    expect(getByText('Unified European Rail Booking with Beeline')).toBeTruthy();
  });

  it('renders all featured high-speed corridors and responds to clicks', () => {
    const handleCorridorPress = jest.fn();
    const { getByTestId, getByText } = renderComponent({
      onCorridorPress: handleCorridorPress,
    });

    expect(getByText('Featured High-Speed Corridors')).toBeTruthy();

    FEATURED_CORRIDORS.forEach((corridor) => {
      expect(
        getByTestId(`featured-corridor-${corridor.from.toLowerCase()}-${corridor.to.toLowerCase()}`)
      ).toBeTruthy();
    });

    const parisLyonCard = getByTestId('featured-corridor-paris-lyon');
    fireEvent.press(parisLyonCard);

    expect(handleCorridorPress).toHaveBeenCalledWith(FEATURED_CORRIDORS[0]);
  });

  it('STRICT INVARIANT: does not render any map implementation', () => {
    const { queryByTestId, toJSON } = renderComponent();

    // Verify no map testIDs or map components exist
    expect(queryByTestId('map-view')).toBeNull();
    expect(queryByTestId('map-container')).toBeNull();

    const jsonString = JSON.stringify(toJSON());
    expect(jsonString).not.toContain('MapView');
    expect(jsonString).not.toContain('react-native-maps');
  });
});
