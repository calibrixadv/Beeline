import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlanButton } from '../src/components/PlanButton';

describe('PlanButton Component (Extends BaseButton)', () => {
  it('renders compact unplanned state (+ Plan)', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <PlanButton isSaved={false} isCancelled={false} onPress={handlePress} />
    );

    const btn = getByText('+ Plan');
    expect(btn).toBeTruthy();

    fireEvent.press(btn);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders compact saved state (In Trip)', () => {
    const { getByText } = render(
      <PlanButton isSaved={true} isCancelled={false} />
    );

    expect(getByText('In Trip')).toBeTruthy();
  });

  it('renders compact cancelled state (Cancelled) and disables interactions', () => {
    const handlePress = jest.fn();
    const { getByText, getByRole } = render(
      <PlanButton isSaved={false} isCancelled={true} onPress={handlePress} />
    );

    const btn = getByText('Cancelled');
    expect(btn).toBeTruthy();

    const pressable = getByRole('button');
    expect(pressable.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(pressable);
    expect(handlePress).not.toHaveBeenCalled();
  });

  it('renders full label mode states', () => {
    const { getByText: getTextUnplanned } = render(
      <PlanButton labelMode="full" isSaved={false} isCancelled={false} />
    );
    expect(getTextUnplanned('Add to Trip Planner')).toBeTruthy();

    const { getByText: getTextSaved } = render(
      <PlanButton labelMode="full" isSaved={true} isCancelled={false} />
    );
    expect(getTextSaved('Added to Itinerary')).toBeTruthy();

    const { getByText: getTextCancelled } = render(
      <PlanButton labelMode="full" isSaved={false} isCancelled={true} />
    );
    expect(getTextCancelled('Train Cancelled')).toBeTruthy();
  });

  it('declares accessible labels for screen readers', () => {
    const { getByLabelText } = render(
      <PlanButton trainNumber="ICE 9553" isSaved={false} isCancelled={false} />
    );

    expect(getByLabelText('Add train ICE 9553 to trip')).toBeTruthy();
  });

  it('triggers onHoverIn and onHoverOut in both unplanned and saved states', () => {
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();

    const { getByRole, rerender } = render(
      <PlanButton
        isSaved={false}
        isCancelled={false}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      />
    );

    const pressable = getByRole('button');
    fireEvent(pressable, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(pressable, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);

    // Verify hover in saved state
    rerender(
      <PlanButton
        isSaved={true}
        isCancelled={false}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      />
    );

    fireEvent(pressable, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(2);

    fireEvent(pressable, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(2);
  });
});
