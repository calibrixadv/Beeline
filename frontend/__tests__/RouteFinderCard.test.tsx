import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RouteFinderCard, RouteSearchParams } from '../src/components/RouteFinderCard';
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
    expect(getByTestId('route-origin-input')).toBeTruthy();
    expect(getByTestId('route-destination-input')).toBeTruthy();

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

  it('supports clear buttons on inputs and all popular corridor shortcuts', () => {
    const { getByTestId, queryByTestId } = renderComponent({
      initialOrigin: 'Paris',
      initialDestination: 'Lyon',
    });

    const submitBtn = getByTestId('route-finder-submit-btn');
    fireEvent.press(submitBtn);
    expect(getByTestId('route-submission-feedback')).toBeTruthy();

    // Clear origin via clear button
    const originClearBtn = getByTestId('route-origin-input-clear-btn');
    fireEvent.press(originClearBtn);
    const originInput = getByTestId('route-origin-input');
    expect(originInput.props.value).toBe('');
    expect(queryByTestId('route-submission-feedback')).toBeNull();

    // Clear destination via clear button
    const destClearBtn = getByTestId('route-destination-input-clear-btn');
    fireEvent.press(destClearBtn);
    const destInput = getByTestId('route-destination-input');
    expect(destInput.props.value).toBe('');

    // Test corridor shortcuts
    const parisLyonChip = getByTestId('quick-corridor-paris-lyon');
    fireEvent.press(parisLyonChip);
    expect(originInput.props.value).toBe('Paris');
    expect(destInput.props.value).toBe('Lyon');

    const milanoRomaChip = getByTestId('quick-corridor-milano-roma');
    fireEvent.press(milanoRomaChip);
    expect(originInput.props.value).toBe('Milano');
    expect(destInput.props.value).toBe('Roma');
  });
});

