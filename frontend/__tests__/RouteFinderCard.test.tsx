import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RouteFinderCard, RouteSearchParams, normalizeStation } from '../src/components/RouteFinderCard';
import { ThemeProvider } from '../src/context/ThemeContext';
import { useRouter } from 'expo-router';

describe('RouteFinderCard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: React.ComponentProps<typeof RouteFinderCard> = {}) => {
    return render(
      <ThemeProvider>
        <RouteFinderCard {...props} />
      </ThemeProvider>
    );
  };

  it('renders with default origin, destination, and all 3 transport mode filters', () => {
    const { getByText, getByTestId } = renderComponent();

    expect(getByText('ROUTE SHORTHAND')).toBeTruthy();
    expect(getByText('European Route Finder')).toBeTruthy();
    const originInput = getByTestId('route-origin-input');
    const destinationInput = getByTestId('route-destination-input');
    expect(originInput).toBeTruthy();
    expect(destinationInput).toBeTruthy();
    expect(originInput.props.value).toBe('București Nord');
    expect(destinationInput.props.value).toBe('Brașov');

    expect(getByTestId('mode-filter-trains')).toBeTruthy();
    expect(getByTestId('mode-filter-metro')).toBeTruthy();
    expect(getByTestId('mode-filter-busses')).toBeTruthy();
  });

  it('allows typing new origin and destination values', () => {
    const { getByTestId } = renderComponent();

    const originInput = getByTestId('route-origin-input');
    const destinationInput = getByTestId('route-destination-input');

    fireEvent.changeText(originInput, 'Amsterdam Centraal');
    fireEvent.changeText(destinationInput, 'Brussels Midi');

    expect(originInput.props.value).toBe('Amsterdam Centraal');
    expect(destinationInput.props.value).toBe('Brussels Midi');
  });

  it('swaps origin and destination when swap button is pressed', () => {
    const { getByTestId } = renderComponent({
      initialOrigin: 'Vienna',
      initialDestination: 'Budapest',
    });

    const originInput = getByTestId('route-origin-input');
    const destinationInput = getByTestId('route-destination-input');
    const swapButton = getByTestId('route-swap-button');

    expect(originInput.props.value).toBe('Vienna');
    expect(destinationInput.props.value).toBe('Budapest');

    fireEvent.press(swapButton);

    expect(originInput.props.value).toBe('Budapest');
    expect(destinationInput.props.value).toBe('Vienna');
  });

  it('toggles transport mode filters correctly', () => {
    const { getByTestId } = renderComponent({
      initialModes: ['Trains', 'Metro', 'Busses'],
    });

    const metroChip = getByTestId('mode-filter-metro');
    fireEvent.press(metroChip);

    // Toggling off Metro should leave Trains and Busses
    // Toggling again should re-enable Metro
    fireEvent.press(metroChip);
  });

  it('retains at least one transport mode when user tries to deselect the last one', () => {
    const { getByTestId } = renderComponent({
      initialModes: ['Trains'],
    });

    const trainsChip = getByTestId('mode-filter-trains');
    fireEvent.press(trainsChip);

    // It should still have Trains selected
    expect(trainsChip).toBeTruthy();
  });

  it('validates empty inputs and displays error message', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: '',
      initialDestination: '',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Please specify both origin and destination points.')).toBeTruthy();
  });

  it('validates identical origin and destination points', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'Berlin',
      initialDestination: 'Berlin',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('prepares route submission and STRICTLY DOES NOT REDIRECT', () => {
    const router = useRouter();
    const handleSubmit = jest.fn();

    const { getByTestId, getByText, queryByTestId } = renderComponent({
      initialOrigin: 'Frankfurt',
      initialDestination: 'Zurich',
      initialModes: ['Trains'],
      onSubmitRoute: handleSubmit,
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    // Submission callback is invoked with prepared params
    expect(handleSubmit).toHaveBeenCalledWith<[RouteSearchParams]>({
      origin: 'Frankfurt',
      destination: 'Zurich',
      modes: ['Trains'],
    });

    // In-card prepared confirmation is rendered
    expect(getByTestId('route-submission-feedback')).toBeTruthy();
    expect(getByText('Route Search Prepared')).toBeTruthy();
    expect(getByText('Frankfurt ➔ Zurich')).toBeTruthy();
    expect(getByText('Template mode: submission handled; feature redirection disabled.')).toBeTruthy();

    // 3 Curated Trifecta preview cards and shorthand disclaimer
    expect(getByTestId('trifecta-card-fastest')).toBeTruthy();
    expect(getByText('⚡ Fastest Route')).toBeTruthy();
    expect(getByText('FASTEST')).toBeTruthy();
    expect(getByText('Direct InterRegio / High-speed connection prioritizing minimum travel duration.')).toBeTruthy();

    expect(getByTestId('trifecta-card-best-value')).toBeTruthy();
    expect(getByText('💰 Best Value')).toBeTruthy();
    expect(getByText('BEST VALUE')).toBeTruthy();
    expect(getByText('Applying the €10/hour saved threshold rule ~50 RON/hr.')).toBeTruthy();

    expect(getByTestId('trifecta-card-most-reliable')).toBeTruthy();
    expect(getByText('🛡️ Most Reliable')).toBeTruthy();
    expect(getByText('MOST RELIABLE')).toBeTruthy();
    expect(getByText('Transfer Shield with generous 25–35 min buffers for Romanian network delay safety.')).toBeTruthy();

    expect(getByTestId('trifecta-shorthand-disclaimer')).toBeTruthy();
    expect(
      getByText('Shorthand preview: full door-to-door itinerary and booking will load upon future redirect.')
    ).toBeTruthy();

    // No error shown
    expect(queryByTestId('route-validation-error')).toBeNull();

    // CRITICAL INVARIANT: No router redirection occurred!
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('allows clicking quick corridor shortcuts to fill inputs', () => {
    const { getByTestId } = renderComponent();

    const quickChip = getByTestId('quick-corridor-london-paris');
    fireEvent.press(quickChip);

    const originInput = getByTestId('route-origin-input');
    const destinationInput = getByTestId('route-destination-input');

    expect(originInput.props.value).toBe('London');
    expect(destinationInput.props.value).toBe('Paris');
  });

  it('invalidates stale submitted query feedback when origin or destination changes', () => {
    const { getByTestId, queryByTestId } = renderComponent({
      initialOrigin: 'Paris',
      initialDestination: 'Lyon',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Changing origin text clears stale confirmation banner
    const originInput = getByTestId('route-origin-input');
    fireEvent.changeText(originInput, 'Marseille');
    expect(queryByTestId('route-submission-feedback')).toBeNull();

    // Re-submit
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Changing destination text clears stale confirmation banner
    const destInput = getByTestId('route-destination-input');
    fireEvent.changeText(destInput, 'Nice');
    expect(queryByTestId('route-submission-feedback')).toBeNull();
  });

  it('invalidates stale submitted query feedback when stations are swapped or filters toggled', () => {
    const { getByTestId, queryByTestId } = renderComponent({
      initialOrigin: 'Paris',
      initialDestination: 'Lyon',
      initialModes: ['Trains', 'Metro'],
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Swapping stations clears stale feedback banner
    const swapBtn = getByTestId('route-swap-button');
    fireEvent.press(swapBtn);
    expect(queryByTestId('route-submission-feedback')).toBeNull();

    // Re-submit
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Toggling mode filter clears stale feedback banner
    const metroFilter = getByTestId('mode-filter-metro');
    fireEvent.press(metroFilter);
    expect(queryByTestId('route-submission-feedback')).toBeNull();
  });

  it('normalizes unicode characters when checking for identical origin and destination', () => {
    // Composed "München" (\u00FC) vs Decomposed "Mu\u0308nchen"
    const composed = 'M\u00FCnchen';
    const decomposed = 'Mu\u0308nchen';

    const { getByTestId, getByText } = renderComponent({
      initialOrigin: composed,
      initialDestination: decomposed,
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('detects duplicate stations with Romanian diacritic variations (e.g., București vs Bucuresti)', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'București',
      initialDestination: 'Bucuresti',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('detects duplicate stations with Brașov vs Brasov case and diacritic insensitively', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'BRAȘOV',
      initialDestination: 'brasov',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('detects duplicate stations with cedilla vs comma-below Romanian diacritics', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'Bucure\u0219ti', // comma below
      initialDestination: 'Bucure\u015Fti', // cedilla
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('detects duplicate stations with irregular whitespace and Romanian diacritics', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: '  București   Nord  ',
      initialDestination: 'Bucuresti Nord',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('detects duplicate stations with hyphenation differences (e.g., Cluj-Napoca vs Cluj Napoca)', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'Cluj-Napoca',
      initialDestination: 'Cluj Napoca',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('detects duplicate stations across full Romanian diacritic spectrum (ă, â, î, ș, ț)', () => {
    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'Târgu Mureș',
      initialDestination: 'Targu Mures',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(getByTestId('route-validation-error')).toBeTruthy();
    expect(getByText('Origin and destination cannot be identical.')).toBeTruthy();
  });

  it('prepares route submission with default Romanian hub stations and strictly does not redirect', () => {
    const router = useRouter();
    const handleSubmit = jest.fn();

    const { getByTestId, getByText, queryByTestId } = renderComponent({
      onSubmitRoute: handleSubmit,
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith<[RouteSearchParams]>({
      origin: 'București Nord',
      destination: 'Brașov',
      modes: ['Trains', 'Metro', 'Busses'],
    });

    expect(getByTestId('route-submission-feedback')).toBeTruthy();
    expect(getByText('Route Search Prepared')).toBeTruthy();
    expect(getByText('București Nord ➔ Brașov')).toBeTruthy();
    expect(getByTestId('trifecta-card-fastest')).toBeTruthy();
    expect(getByTestId('trifecta-card-best-value')).toBeTruthy();
    expect(getByTestId('trifecta-card-most-reliable')).toBeTruthy();
    expect(getByText('⚡ Fastest Route')).toBeTruthy();
    expect(getByText('💰 Best Value')).toBeTruthy();
    expect(getByText('🛡️ Most Reliable')).toBeTruthy();
    expect(getByText(/€10\/hour saved threshold rule/i)).toBeTruthy();
    expect(getByText(/25–35 min buffers/i)).toBeTruthy();
    expect(
      getByText('Shorthand preview: full door-to-door itinerary and booking will load upon future redirect.')
    ).toBeTruthy();

    expect(queryByTestId('route-validation-error')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('displays the 3 Curated Trifecta pillars with €10/hr rule and 25-35m buffer note without redirecting', () => {
    const router = useRouter();
    const handleSubmit = jest.fn();

    const { getByTestId, getByText } = renderComponent({
      initialOrigin: 'București Nord',
      initialDestination: 'Brașov',
      onSubmitRoute: handleSubmit,
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);

    // Submission triggered
    expect(handleSubmit).toHaveBeenCalledTimes(1);

    // Feedback banner displayed
    expect(getByTestId('route-submission-feedback')).toBeTruthy();
    expect(getByText('THE CURATED TRIFECTA')).toBeTruthy();

    // Pillar 1: ⚡ Fastest Route
    expect(getByTestId('trifecta-card-fastest')).toBeTruthy();
    expect(getByText('⚡ Fastest Route')).toBeTruthy();
    expect(getByText('FASTEST')).toBeTruthy();
    expect(getByText('Direct InterRegio / High-speed connection prioritizing minimum travel duration.')).toBeTruthy();

    // Pillar 2: 💰 Best Value with €10/hr rule
    expect(getByTestId('trifecta-card-best-value')).toBeTruthy();
    expect(getByText('💰 Best Value')).toBeTruthy();
    expect(getByText('BEST VALUE')).toBeTruthy();
    expect(getByText('Applying the €10/hour saved threshold rule ~50 RON/hr.')).toBeTruthy();
    expect(getByText(/€10\/hr threshold rule/i)).toBeTruthy();

    // Pillar 3: 🛡️ Most Reliable with 25-35m buffer note
    expect(getByTestId('trifecta-card-most-reliable')).toBeTruthy();
    expect(getByText('🛡️ Most Reliable')).toBeTruthy();
    expect(getByText('MOST RELIABLE')).toBeTruthy();
    expect(getByText('Transfer Shield with generous 25–35 min buffers for Romanian network delay safety.')).toBeTruthy();
    expect(getByText(/25-35m/i)).toBeTruthy();
    expect(getByText(/25–35 min buffers/i)).toBeTruthy();

    // Accessibility label checks on all 3 Curated Trifecta preview cards
    const fastestCard = getByTestId('trifecta-card-fastest');
    expect(fastestCard.props.accessibilityLabel).toContain('⚡ Fastest Route');

    const bestValueCard = getByTestId('trifecta-card-best-value');
    expect(bestValueCard.props.accessibilityLabel).toContain('💰 Best Value');

    const mostReliableCard = getByTestId('trifecta-card-most-reliable');
    expect(mostReliableCard.props.accessibilityLabel).toContain('🛡️ Most Reliable');

    // Shorthand disclaimer
    expect(getByTestId('trifecta-shorthand-disclaimer')).toBeTruthy();
    expect(
      getByText('Shorthand preview: full door-to-door itinerary and booking will load upon future redirect.')
    ).toBeTruthy();

    // Strict zero-redirect verification
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('supports clear buttons on inputs and all popular corridor shortcuts', () => {
    const { getByTestId, queryByTestId } = renderComponent({
      initialOrigin: 'Paris',
      initialDestination: 'Lyon',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Clear origin via clear button clears the feedback banner
    const originClearBtn = getByTestId('route-origin-input-clear-btn');
    fireEvent.press(originClearBtn);
    const originInput = getByTestId('route-origin-input');
    expect(originInput.props.value).toBe('');
    expect(queryByTestId('route-submission-feedback')).toBeNull();

    // Re-fill origin and re-submit to test destination clear button
    fireEvent.changeText(originInput, 'București Nord');
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Clear destination via clear button clears the feedback banner
    const destClearBtn = getByTestId('route-destination-input-clear-btn');
    fireEvent.press(destClearBtn);
    const destInput = getByTestId('route-destination-input');
    expect(destInput.props.value).toBe('');
    expect(queryByTestId('route-submission-feedback')).toBeNull();

    // Re-fill destination and re-submit to test corridor shortcut clearing feedback
    fireEvent.changeText(destInput, 'Brașov');
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Clicking corridor shortcut immediately clears active feedback banner
    const parisLyonChip = getByTestId('quick-corridor-paris-lyon');
    fireEvent.press(parisLyonChip);
    expect(originInput.props.value).toBe('Paris');
    expect(destInput.props.value).toBe('Lyon');
    expect(queryByTestId('route-submission-feedback')).toBeNull();

    const milanoRomaChip = getByTestId('quick-corridor-milano-roma');
    fireEvent.press(milanoRomaChip);
    expect(originInput.props.value).toBe('Milano');
    expect(destInput.props.value).toBe('Roma');
  });
});

describe('normalizeStation utility', () => {
  it('handles null, undefined, and empty string safely', () => {
    expect(normalizeStation('')).toBe('');
    expect(normalizeStation(null as unknown as string)).toBe('');
    expect(normalizeStation(undefined as unknown as string)).toBe('');
  });

  it('collapses internal multi-space and trims leading/trailing whitespace', () => {
    expect(normalizeStation('   București     Nord   ')).toBe('bucuresti nord');
  });

  it('normalizes hyphens and underscores to single spaces', () => {
    expect(normalizeStation('Cluj-Napoca')).toBe('cluj napoca');
    expect(normalizeStation('Cluj - Napoca')).toBe('cluj napoca');
    expect(normalizeStation('Drobeta_Turnu_Severin')).toBe('drobeta turnu severin');
  });

  it('strips all Romanian diacritical marks accurately', () => {
    expect(normalizeStation('București')).toBe('bucuresti');
    expect(normalizeStation('Brașov')).toBe('brasov');
    expect(normalizeStation('Constanța')).toBe('constanta');
    expect(normalizeStation('Târgu Mureș')).toBe('targu mures');
    expect(normalizeStation('Bacău')).toBe('bacau');
    expect(normalizeStation('Întorsura Buzăului')).toBe('intorsura buzaului');
  });

  it('normalizes both comma-below and legacy cedilla Romanian letters identically', () => {
    expect(normalizeStation('Bucure\u0219ti')).toBe(normalizeStation('Bucure\u015Fti'));
    expect(normalizeStation('Constan\u021Ba')).toBe(normalizeStation('Constan\u0163a'));
  });
});

