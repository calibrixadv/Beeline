import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BaseInput } from '../src/components/BaseInput';

describe('BaseInput Component', () => {
  it('renders label, placeholder, and current text value', () => {
    const { getByText, getByPlaceholderText, getByDisplayValue } = render(
      <BaseInput
        label="Departure City"
        placeholder="Enter city..."
        value="Bruxelles"
        onChangeText={() => {}}
      />
    );

    expect(getByText('Departure City')).toBeTruthy();
    expect(getByPlaceholderText('Enter city...')).toBeTruthy();
    expect(getByDisplayValue('Bruxelles')).toBeTruthy();
  });

  it('calls onChangeText when typing text', () => {
    const handleChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <BaseInput
        placeholder="Search..."
        value=""
        onChangeText={handleChangeText}
      />
    );

    const input = getByPlaceholderText('Search...');
    fireEvent.changeText(input, 'Amsterdam');

    expect(handleChangeText).toHaveBeenCalledWith('Amsterdam');
  });

  it('renders clear button and clears value on press', () => {
    const handleChangeText = jest.fn();
    const handleClear = jest.fn();
    const { getByLabelText } = render(
      <BaseInput
        value="Zurich"
        onChangeText={handleChangeText}
        clearable={true}
        onClear={handleClear}
      />
    );

    const clearBtn = getByLabelText('Clear input value');
    expect(clearBtn).toBeTruthy();

    fireEvent.press(clearBtn);
    expect(handleChangeText).toHaveBeenCalledWith('');
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('displays error message when provided', () => {
    const { getByText } = render(
      <BaseInput
        value=""
        onChangeText={() => {}}
        error="Field cannot be blank"
      />
    );

    expect(getByText('Field cannot be blank')).toBeTruthy();
  });

  it('handles focus and blur synthetic events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <BaseInput
        placeholder="Focus test"
        value=""
        onChangeText={() => {}}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );

    const input = getByPlaceholderText('Focus test');
    fireEvent(input, 'focus');
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent(input, 'blur');
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('triggers onHoverIn and onHoverOut callbacks on container hover', () => {
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();
    const { getByTestId } = render(
      <BaseInput
        testID="hover-input"
        value=""
        onChangeText={() => {}}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      />
    );

    const container = getByTestId('hover-input-container');
    fireEvent(container, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(container, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);
  });
});
