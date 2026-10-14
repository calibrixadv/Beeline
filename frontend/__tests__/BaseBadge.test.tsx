import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BaseBadge } from '../src/components/BaseBadge';

describe('BaseBadge Component', () => {
  it('renders static badge label correctly', () => {
    const { getByText } = render(<BaseBadge label="First Class" />);
    expect(getByText('First Class')).toBeTruthy();
  });

  it('renders across all semantic variants', () => {
    const variants = ['default', 'success', 'warning', 'danger', 'info', 'neutral'] as const;
    variants.forEach((v) => {
      const { getByText } = render(<BaseBadge label={v} variant={v} />);
      expect(getByText(v)).toBeTruthy();
    });
  });

  it('acts as interactive chip when onPress is provided', () => {
    const handlePress = jest.fn();
    const { getByRole, getByText } = render(
      <BaseBadge label="Filter Chip" onPress={handlePress} selected={true} />
    );

    const chip = getByRole('button');
    expect(chip).toBeTruthy();
    expect(chip.props.accessibilityState?.selected).toBe(true);

    fireEvent.press(getByText('Filter Chip'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('handles hover callbacks on interactive chip', () => {
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();
    const { getByRole } = render(
      <BaseBadge
        label="Hover Chip"
        onPress={() => {}}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      />
    );

    const chip = getByRole('button');
    fireEvent(chip, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(chip, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);
  });
});
