import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IconButton } from '../src/components/IconButton';

describe('IconButton Component (Extends BaseButton)', () => {
  it('renders icon with default circle shape', () => {
    const handlePress = jest.fn();
    const { getByRole } = render(
      <IconButton
        iconName="close"
        onPress={handlePress}
        accessibilityLabel="Close dialog"
      />
    );

    const btn = getByRole('button');
    expect(btn).toBeTruthy();

    fireEvent.press(btn);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('supports square and rounded shapes and sizes', () => {
    const { getByTestId: getSquare } = render(
      <IconButton iconName="search" shape="square" size="sm" testID="square-icon" />
    );
    expect(getSquare('square-icon')).toBeTruthy();

    const { getByTestId: getRounded } = render(
      <IconButton iconName="heart" shape="rounded" size="lg" testID="rounded-icon" />
    );
    expect(getRounded('rounded-icon')).toBeTruthy();
  });
});
