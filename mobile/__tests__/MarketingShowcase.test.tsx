import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  MarketingShowcase,
  FEATURED_CORRIDORS,
  getCorridorTestId,
  WaggleFlightPath,
} from '../src/components/MarketingShowcase';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('MarketingShowcase component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (
    props: React.ComponentProps<typeof MarketingShowcase> = {},
    mode: 'light' | 'dark' = 'light'
  ) => {
    return render(
      <ThemeProvider initialMode={mode}>
        <MarketingShowcase {...props} />
      </ThemeProvider>
    );
  };

  it('renders hero card in honey theme with friendly copy, Barnaby mascot preview, and explore CTA', () => {
    const handleExplore = jest.fn();
    const { getByText, getByTestId, getAllByTestId } = renderComponent({
      onExplorePress: handleExplore,
    });

    expect(getByTestId('marketing-hero-card')).toBeTruthy();
    expect(getByText('Beeline Rail Transit')).toBeTruthy();
    expect(getByText('Plan your European rail journey')).toBeTruthy();
    expect(
      getByText('Search direct train corridors, check schedules, and explore routes across Romania and Europe.')
    ).toBeTruthy();

    // Verify inline Barnaby mascot preview in hero badge
    const barnabyMascots = getAllByTestId('mascot-bee-barnaby');
    expect(barnabyMascots.length).toBeGreaterThanOrEqual(1);

    const exploreBtn = getByTestId('marketing-explore-btn');
    expect(exploreBtn.props.accessibilityLabel).toBe('Explore Trains');
    fireEvent.press(exploreBtn);

    expect(handleExplore).toHaveBeenCalledTimes(1);
  });

  it('renders the 3 companion pillar cards (Speed with Barnaby, Value with Honey, Reliability with Bumble)', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(getByText('Why Beeline?')).toBeTruthy();
    expect(getByText('Thoughtful rail travel planning with our companion guides.')).toBeTruthy();

    // Pillar 1: Speed with Barnaby
    expect(getByTestId('pillar-speed-card')).toBeTruthy();
    expect(getByText('Direct Rail Connections')).toBeTruthy();
    expect(getByText('SPEED')).toBeTruthy();
    expect(getByText('Barnaby the Scout')).toBeTruthy();
    expect(getByText('Direct Routes')).toBeTruthy();
    expect(getByText(/Fast point-to-point connections prioritizing direct travel and minimal station stops\./)).toBeTruthy();
    expect(getByText('⚡ Direct corridor routing')).toBeTruthy();

    // Pillar 2: Value with Honey
    expect(getByTestId('pillar-coverage-card')).toBeTruthy();
    expect(getByText('Clear Fares & Schedules')).toBeTruthy();
    expect(getByText('VALUE')).toBeTruthy();
    expect(getByText('Honey the Hive Saver')).toBeTruthy();
    expect(getByText('Transparent Pricing')).toBeTruthy();
    expect(getByText(/Upfront pricing with no hidden booking fees, helping you compare and find the best value/)).toBeTruthy();
    expect(getByText('💰 Upfront fare comparisons')).toBeTruthy();
    expect(getByTestId('mascot-bee-honey')).toBeTruthy();

    // Pillar 3: Reliability with Bumble
    expect(getByTestId('pillar-capabilities-card')).toBeTruthy();
    expect(getByText('Protected Transfer Buffers')).toBeTruthy();
    expect(getByText('RELIABILITY')).toBeTruthy();
    expect(getByText('Bumble the Buffer Guard')).toBeTruthy();
    expect(getByText('Comfortable Transfers')).toBeTruthy();
    expect(getByText(/Sensible connection windows at major transfer stations so you can switch trains without rushing\./)).toBeTruthy();
    expect(getByText('🛡️ Generous connection buffers')).toBeTruthy();
    expect(getByTestId('mascot-bee-bumble')).toBeTruthy();
  });

  it('does NOT render redundant feature cards, fabricated metrics, or aggregator claims', () => {
    const { queryByTestId } = renderComponent();

    expect(queryByTestId('marketing-feature-grid')).toBeNull();
    expect(queryByTestId('feature-card-direct-corridors')).toBeNull();
    expect(queryByTestId('feature-card-value-engine')).toBeNull();
    expect(queryByTestId('feature-card-transfer-shield')).toBeNull();
    expect(queryByTestId('feature-card-eco-savings')).toBeNull();

    expect(queryByTestId('marketing-metrics-card')).toBeNull();
    expect(queryByTestId('marketing-trust-card')).toBeNull();
  });

  it('renders all featured Romanian corridors with Waggle Flight Paths as static informational cards', () => {
    const { getByTestId, getAllByTestId, getByText, getAllByText } = renderComponent();

    expect(getByText('Featured Corridors')).toBeTruthy();
    expect(
      getByText('Direct routes connecting major Romanian metropolitan hubs and European gateways.')
    ).toBeTruthy();

    // Verify Waggle Flight Paths are rendered for each corridor
    const wagglePaths = getAllByTestId('waggle-flight-path');
    expect(wagglePaths.length).toBe(FEATURED_CORRIDORS.length);

    FEATURED_CORRIDORS.forEach((corridor) => {
      const card = getByTestId(getCorridorTestId(corridor.from, corridor.to));
      expect(card).toBeTruthy();
      // Ensure card is a static informational card without button role
      expect(card.props.accessibilityRole).toBeUndefined();
    });

    // Check Romanian domestic corridors and European gateway connections
    expect(getAllByText('București Nord').length).toBeGreaterThan(0);
    expect(getAllByText('Brașov').length).toBeGreaterThan(0);
    expect(getAllByText('Constanța').length).toBeGreaterThan(0);
    expect(getAllByText('Cluj-Napoca').length).toBeGreaterThan(0);
    expect(getAllByText('Viena Hbf').length).toBeGreaterThan(0);

    // Check operator details & prices
    expect(getByText(/CFR IR \/ Astra Trans Carpatic/)).toBeTruthy();
    expect(getByText(/from 48 lei/)).toBeTruthy();
    expect(getByText(/CFR IR Sun Train/)).toBeTruthy();
    expect(getByText(/from 65 lei/)).toBeTruthy();
    expect(getByText(/InterRegio Nightjet \/ Sleeper/)).toBeTruthy();
    expect(getByText(/from 115 lei/)).toBeTruthy();
    expect(getByText(/Dacia EuroNight 346/)).toBeTruthy();
    expect(getByText(/from €39\.00/)).toBeTruthy();
  });

  it('renders properly under dark theme mode', () => {
    const { getByTestId } = renderComponent({}, 'dark');
    const heroCard = getByTestId('marketing-hero-card');
    expect(heroCard).toBeTruthy();
    const flattened = StyleSheet.flatten(heroCard.props.style);
    expect(flattened.backgroundColor).toBe('#1C1917');
  });

  describe('getCorridorTestId helper', () => {
    it('normalizes Romanian diacritics, spaces, and hyphens into slug test IDs', () => {
      expect(getCorridorTestId('București Nord', 'Brașov')).toBe(
        'featured-corridor-bucuresti-nord-brasov'
      );
      expect(getCorridorTestId('Cluj-Napoca', 'București Nord')).toBe(
        'featured-corridor-cluj-napoca-bucuresti-nord'
      );
      expect(getCorridorTestId('București Nord', 'Constanța')).toBe(
        'featured-corridor-bucuresti-nord-constanta'
      );
      expect(getCorridorTestId('București Nord', 'Viena Hbf')).toBe(
        'featured-corridor-bucuresti-nord-viena-hbf'
      );
    });

    it('robustly handles edge cases, special characters, and missing inputs', () => {
      expect(getCorridorTestId('Braşov', 'Constanţa')).toBe(
        'featured-corridor-brasov-constanta'
      );
      expect(getCorridorTestId(' Wien (Hbf) ', 'München')).toBe(
        'featured-corridor-wien-hbf-munchen'
      );
      expect(getCorridorTestId('', '')).toBe('featured-corridor--');
      expect(getCorridorTestId(undefined as any, null as any)).toBe('featured-corridor--');
    });
  });

  it('supports animated={false} on MarketingShowcase for static reduced motion', () => {
    const { getByTestId, getAllByTestId } = renderComponent({ animated: false });
    expect(getByTestId('marketing-hero-card')).toBeTruthy();
    expect(getAllByTestId('waggle-flight-path').length).toBe(4);
  });

  describe('WaggleFlightPath component standalone', () => {
    it('renders leading line, bee wave trail, and trailing line', () => {
      const { getByTestId, getByText } = render(
        <ThemeProvider>
          <WaggleFlightPath testID="standalone-waggle" />
        </ThemeProvider>
      );

      expect(getByTestId('standalone-waggle')).toBeTruthy();
      expect(getByTestId('waggle-line-leading')).toBeTruthy();
      expect(getByTestId('waggle-bee-trail')).toBeTruthy();
      expect(getByText('🐝')).toBeTruthy();
      expect(getByText('~ ~')).toBeTruthy();
      expect(getByTestId('waggle-line-trailing')).toBeTruthy();
    });

    it('handles animated=false static mode cleanly without throwing', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <WaggleFlightPath testID="static-waggle" animated={false} />
        </ThemeProvider>
      );

      expect(getByTestId('static-waggle')).toBeTruthy();
      expect(getByTestId('waggle-line-leading')).toBeTruthy();
      expect(getByTestId('waggle-bee-trail')).toBeTruthy();
      expect(getByTestId('waggle-line-trailing')).toBeTruthy();
    });
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

  it('guarantees WCAG 2.1 AA text contrast tokens on light surfaces (>4.5:1 ratio)', () => {
    const { getByText, getAllByText } = renderComponent();

    // Hero badge text should use #92400E for >4.5:1 contrast against amber-100
    const heroBadgeText = getByText('Beeline Rail Transit');
    const flatHeroBadge = StyleSheet.flatten(heroBadgeText.props.style);
    expect(flatHeroBadge.color).toBe('#92400E');

    // Pillar 3 role should use #15803D for >4.5:1 contrast against warm surface
    const pillarRole = getByText('Comfortable Transfers');
    const flatPillarRole = StyleSheet.flatten(pillarRole.props.style);
    expect(flatPillarRole.color).toBe('#15803D');

    // Waggle trail should use #92400E in light mode
    const trails = getAllByText('~ ~')[0];
    const flatTrail = StyleSheet.flatten(trails.props.style);
    expect(flatTrail.color).toBe('#92400E');
  });

  it('provides clean accessibility labels on corridor cards', () => {
    const { getByTestId } = renderComponent();

    const card = getByTestId(getCorridorTestId('București Nord', 'Brașov'));
    expect(card.props.accessibilityLabel).toContain('București Nord to Brașov');
    expect(card.props.accessibilityLabel).toContain('CFR IR / Astra Trans Carpatic');
    expect(card.props.accessibilityLabel).toContain('2h 15m direct');
    expect(card.props.accessibilityLabel).toContain('from 48 lei (~€9.60)');
  });

  it('guarantees text breathing and robust flex layout without awkward wrapping splits', () => {
    const { getByText, getAllByText, getAllByTestId } = renderComponent();

    // 1. Corridor cities have flexShrink: 1 and WaggleFlightPath has flexShrink: 0
    const city = getAllByText('București Nord')[0];
    const flatCity = StyleSheet.flatten(city.props.style);
    expect(flatCity.flexShrink).toBe(1);

    const waggleContainers = getAllByTestId('waggle-flight-path');
    const flatWaggle = StyleSheet.flatten(waggleContainers[0].props.style);
    expect(flatWaggle.flexShrink).toBe(0);

    // 2. Hero badge text has flexShrink: 1 to prevent pushing past mobile card padding
    const heroBadge = getByText('Beeline Rail Transit');
    const flatBadge = StyleSheet.flatten(heroBadge.props.style);
    expect(flatBadge.flexShrink).toBe(1);
  });
});
