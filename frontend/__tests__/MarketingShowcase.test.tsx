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
    expect(getByText('Beeline High-Speed Transit')).toBeTruthy();
    expect(getByText('Plan Your European Rail Journey')).toBeTruthy();
    expect(getByText('Make a beeline across Romania & Europe')).toBeTruthy();
    expect(
      getByText(/Fast, sweet, stress-free rail journeys\. High-speed corridors, live status tracking/)
    ).toBeTruthy();

    // Verify inline Barnaby mascot preview in hero badge
    const barnabyMascots = getAllByTestId('mascot-bee-barnaby');
    expect(barnabyMascots.length).toBeGreaterThanOrEqual(1);

    const exploreBtn = getByTestId('marketing-explore-btn');
    fireEvent.press(exploreBtn);

    expect(handleExplore).toHaveBeenCalledTimes(1);
  });

  it('renders the 3 Mascot Trifecta pillar cards (Speed with Barnaby, Value with Honey, Reliability with Bumble)', () => {
    const { getByTestId, getByText } = renderComponent();

    // Pillar 1: Speed with Barnaby
    expect(getByTestId('pillar-speed-card')).toBeTruthy();
    expect(getByText('300+ km/h High-Speed')).toBeTruthy();
    expect(getByText('SPEED')).toBeTruthy();
    expect(getByText('Barnaby the Scout')).toBeTruthy();
    expect(getByText('Direct High-Speed')).toBeTruthy();
    expect(getByText(/City-center to city-center corridors engineered for maximum velocity with Barnaby/)).toBeTruthy();
    expect(getByText('⚡ Instant timetable routing')).toBeTruthy();

    // Pillar 2: Value with Honey
    expect(getByTestId('pillar-coverage-card')).toBeTruthy();
    expect(getByText('Smart €10/Hour Value Engine')).toBeTruthy();
    expect(getByText('VALUE')).toBeTruthy();
    expect(getByText('Honey the Hive Saver')).toBeTruthy();
    expect(getByText('15+ European Countries')).toBeTruthy();
    expect(getByText(/Honey evaluates every journey against the smart €10\/hour rule/)).toBeTruthy();
    expect(getByText("💰 Honey's Nectar Jar savings")).toBeTruthy();
    expect(getByTestId('mascot-bee-honey')).toBeTruthy();

    // Pillar 3: Reliability with Bumble
    expect(getByTestId('pillar-capabilities-card')).toBeTruthy();
    expect(getByText('Romanian Transfer Shield (25–35 min buffers)')).toBeTruthy();
    expect(getByText('RELIABILITY')).toBeTruthy();
    expect(getByText('Bumble the Buffer Guard')).toBeTruthy();
    expect(getByText('Multi-Modal & Live Sync')).toBeTruthy();
    expect(getByText(/Bumble safeguards your trip with generous 25–35 min buffers/)).toBeTruthy();
    expect(getByText("🛡️ Bumble's safe transfer shield guarantee")).toBeTruthy();
    expect(getByTestId('mascot-bee-bumble')).toBeTruthy();
  });

  it('renders feature highlights showcasing the Curated Trifecta value propositions', () => {
    const { getByText, getByTestId } = renderComponent();

    expect(getByText('Why Plan With Beeline?')).toBeTruthy();
    expect(getByTestId('marketing-feature-grid')).toBeTruthy();

    expect(getByTestId('feature-card-direct-corridors')).toBeTruthy();
    expect(getByText('⚡ High-Speed & Direct Romanian Corridors')).toBeTruthy();

    expect(getByTestId('feature-card-value-engine')).toBeTruthy();
    expect(getByText('💰 Smart €10/Hour Value Engine')).toBeTruthy();

    expect(getByTestId('feature-card-transfer-shield')).toBeTruthy();
    expect(getByText('🛡️ Romanian Transfer Shield (25–35 min buffers)')).toBeTruthy();

    expect(getByTestId('feature-card-eco-savings')).toBeTruthy();
    expect(getByText('🌿 Eco CO₂ Savings over DN1 and regional flights')).toBeTruthy();
  });

  it('renders metrics bar and trust guarantees with Romanian operators', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(getByTestId('marketing-metrics-card')).toBeTruthy();
    expect(getByText('300+')).toBeTruthy();
    expect(getByText('15+')).toBeTruthy();
    expect(getByText('10k+')).toBeTruthy();
    expect(getByText('85%')).toBeTruthy();

    expect(getByTestId('marketing-trust-card')).toBeTruthy();
    expect(getByText('Unified European Rail Booking with Beeline')).toBeTruthy();
    expect(
      getByText(/Aggregating CFR Călători, Astra Trans Carpatic, Transferoviar Călători, ÖBB/)
    ).toBeTruthy();
  });

  it('renders all featured Romanian corridors with Waggle Flight Paths and responds to clicks', () => {
    const handleCorridorPress = jest.fn();
    const { getByTestId, getAllByTestId, getByText, getAllByText } = renderComponent({
      onCorridorPress: handleCorridorPress,
    });

    expect(getByText('Featured High-Speed Corridors')).toBeTruthy();
    expect(
      getByText('Direct routes connecting major Romanian metropolitan hubs and European gateways.')
    ).toBeTruthy();

    // Verify Waggle Flight Paths are rendered for each corridor
    const wagglePaths = getAllByTestId('waggle-flight-path');
    expect(wagglePaths.length).toBe(FEATURED_CORRIDORS.length);

    FEATURED_CORRIDORS.forEach((corridor) => {
      expect(
        getByTestId(getCorridorTestId(corridor.from, corridor.to))
      ).toBeTruthy();
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

    // Click each corridor card to assert callback is invoked for each route
    FEATURED_CORRIDORS.forEach((corridor, idx) => {
      const card = getByTestId(getCorridorTestId(corridor.from, corridor.to));
      fireEvent.press(card);
      expect(handleCorridorPress).toHaveBeenNthCalledWith(idx + 1, corridor);
    });
  });

  it('renders cleanly without error when callbacks are omitted', () => {
    const { getByTestId } = renderComponent();
    const card = getByTestId(getCorridorTestId('București Nord', 'Brașov'));
    expect(() => fireEvent.press(card)).not.toThrow();
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

    // Metric numbers should use high-contrast #92400E in light mode
    const metric300 = getByText('300+');
    const flatMetricStyle = StyleSheet.flatten(metric300.props.style);
    expect(flatMetricStyle.color).toBe('#92400E');

    // Hero badge text should use #92400E for >4.5:1 contrast against amber-100
    const heroBadgeText = getByText('Beeline High-Speed Transit');
    const flatHeroBadge = StyleSheet.flatten(heroBadgeText.props.style);
    expect(flatHeroBadge.color).toBe('#92400E');

    // Pillar 3 role should use #15803D for >4.5:1 contrast against warm surface
    const pillarRole = getByText('Multi-Modal & Live Sync');
    const flatPillarRole = StyleSheet.flatten(pillarRole.props.style);
    expect(flatPillarRole.color).toBe('#15803D');

    // Waggle trail should use #92400E in light mode
    const trails = getAllByText('~ ~')[0];
    const flatTrail = StyleSheet.flatten(trails.props.style);
    expect(flatTrail.color).toBe('#92400E');
  });

  it('provides comprehensive accessibility label and button role on corridor cards', () => {
    const handlePress = jest.fn();
    const { getByTestId } = renderComponent({ onCorridorPress: handlePress });

    const card = getByTestId(getCorridorTestId('București Nord', 'Brașov'));
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toContain('Explore route from București Nord to Brașov');
    expect(card.props.accessibilityLabel).toContain('CFR IR / Astra Trans Carpatic');
    expect(card.props.accessibilityLabel).toContain('2h 15m direct');
    expect(card.props.accessibilityLabel).toContain('from 48 lei (~€9.60)');
  });
});
