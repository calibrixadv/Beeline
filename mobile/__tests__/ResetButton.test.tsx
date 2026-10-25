import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResetButton } from '../src/components/ResetButton';

describe('ResetButton Component (Extends BaseButton)', () => {
  it('renders default Reset text and fires onPress callback', () => {
    const handleReset = jest.fn();
    const { getByText, getByRole } = render(
      <ResetButton onPress={handleReset} />
    );

    const btn = getByText('Reset');
    expect(btn).toBeTruthy();

    fireEvent.press(getByRole('button'));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders with optional icon and custom title', () => {
    const { getByText } = render(
      <ResetButton title="Clear All" showIcon={true} />
    );

    expect(getByText('Clear All')).toBeTruthy();
  });
});
