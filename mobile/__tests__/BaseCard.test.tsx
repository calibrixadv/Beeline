import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BaseCard } from '../src/components/BaseCard';

describe('BaseCard Component', () => {
  it('renders children content within static container', () => {
    const { getByText } = render(
      <BaseCard>
        <Text>Card Inner Content</Text>
      </BaseCard>
    );

    expect(getByText('Card Inner Content')).toBeTruthy();
  });

  it('acts as interactive pressable container when onPress is provided', () => {
    const handlePress = jest.fn();
    const { getByRole, getByText } = render(
      <BaseCard onPress={handlePress}>
        <Text>Clickable Card</Text>
      </BaseCard>
    );

    const card = getByRole('button');
    expect(card).toBeTruthy();

    fireEvent.press(getByText('Clickable Card'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('handles onHoverIn and onHoverOut events when interactive', () => {
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();
    const { getByRole } = render(
      <BaseCard
        onPress={() => {}}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      >
        <Text>Hoverable Card</Text>
      </BaseCard>
    );

    const card = getByRole('button');
    fireEvent(card, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(card, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);
  });

  it('renders across all surface variants and padding tiers', () => {
    const variants = ['elevated', 'outlined', 'flat'] as const;
    variants.forEach((v) => {
      const { getByTestId } = render(
        <BaseCard variant={v} testID={`card-${v}`}>
          <Text>{v}</Text>
        </BaseCard>
      );
      expect(getByTestId(`card-${v}`)).toBeTruthy();
    });
  });

  it('handles onFocus and onBlur events and applies focus indicators overriding custom style border', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    const { getByRole } = render(
      <BaseCard
        onPress={() => {}}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{ borderColor: '#CCCCCC' }}
      >
        <Text>Focusable Card</Text>
      </BaseCard>
    );

    const card = getByRole('button');
    const pressable = card.parent?.parent;
    expect(pressable?.props.onFocus).toBeDefined();
    expect(pressable?.props.onBlur).toBeDefined();

    act(() => {
      pressable?.props.onFocus();
    });
    expect(handleFocus).toHaveBeenCalledTimes(1);

    // Verify focus style applies and overrides custom style borderColor
    const flattened = Array.isArray(card.props.style)
      ? card.props.style.filter(Boolean).reduce((acc: any, s: any) => ({ ...acc, ...s }), {})
      : card.props.style;
    expect(flattened.borderColor).toBe('#F59E0B');

    act(() => {
      pressable?.props.onBlur();
    });
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
