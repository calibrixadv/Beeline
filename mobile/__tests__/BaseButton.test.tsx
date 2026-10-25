import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BaseButton } from '../src/components/BaseButton';

describe('BaseButton Component', () => {
  it('renders title text correctly', () => {
    const { getByText } = render(<BaseButton title="Confirm Booking" />);
    expect(getByText('Confirm Booking')).toBeTruthy();
  });

  it('triggers onPress callback on click/press', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <BaseButton title="Click Me" onPress={handlePress} />
    );

    const btn = getByText('Click Me');
    fireEvent.press(btn);

    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('handles hoverIn and hoverOut callbacks', () => {
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();
    const { getByRole } = render(
      <BaseButton
        title="Hover Target"
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      />
    );

    const pressable = getByRole('button');
    // React Native testing library supports hover events on pressable
    fireEvent(pressable, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(pressable, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);
  });

  it('disables press and shows spinner when loading is true', () => {
    const handlePress = jest.fn();
    const { getByTestId, queryByText } = render(
      <BaseButton
        title="Submit"
        loading={true}
        loadingText="Please wait..."
        onPress={handlePress}
      />
    );

    expect(getByTestId('button-activity-indicator')).toBeTruthy();
    expect(getByTestId('button-activity-indicator')).toBeDefined();

    const spinner = getByTestId('button-activity-indicator');
    fireEvent.press(spinner);
    expect(handlePress).not.toHaveBeenCalled();
    expect(queryByText('Please wait...')).toBeTruthy();
  });

  it('disables press and applies disabled accessibility state when disabled is true', () => {
    const handlePress = jest.fn();
    const { getByRole } = render(
      <BaseButton title="Cannot Press" disabled={true} onPress={handlePress} />
    );

    const btn = getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(btn);
    expect(handlePress).not.toHaveBeenCalled();
  });

  it('renders variants and sizes without throwing', () => {
    const variants = [
      'primary',
      'secondary',
      'outline',
      'ghost',
      'danger',
      'success',
      'surface',
    ] as const;

    variants.forEach((v) => {
      const { getByText } = render(<BaseButton title={`Variant ${v}`} variant={v} />);
      expect(getByText(`Variant ${v}`)).toBeTruthy();
    });

    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach((s) => {
      const { getByText } = render(<BaseButton title={`Size ${s}`} size={s} />);
      expect(getByText(`Size ${s}`)).toBeTruthy();
    });
  });

  it('supports hitSlop prop and handles focus/blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    const { getByRole } = render(
      <BaseButton
        title="HitSlop Button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={() => {}}
      />
    );

    const btn = getByRole('button');
    expect(btn.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    expect(btn.props.focusable).toBe(true);

    const pressable = btn.parent?.parent;
    expect(pressable?.props.onFocus).toBeDefined();
    expect(pressable?.props.onBlur).toBeDefined();

    act(() => {
      pressable?.props.onFocus();
    });
    expect(handleFocus).toHaveBeenCalledTimes(1);

    const flattened = Array.isArray(btn.props.style)
      ? btn.props.style.filter(Boolean).reduce((acc: any, s: any) => ({ ...acc, ...s }), {})
      : btn.props.style;
    expect(flattened.borderColor).toBe('#F59E0B');

    act(() => {
      pressable?.props.onBlur();
    });
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
