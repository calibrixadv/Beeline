import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchInput } from '../src/components/SearchInput';

describe('SearchInput Component (Extends BaseInput)', () => {
  it('renders default search placeholder and search accessibility label', () => {
    const { getByPlaceholderText, getByLabelText } = render(
      <SearchInput value="" onChangeText={() => {}} />
    );

    expect(getByPlaceholderText('Search train, city or operator...')).toBeTruthy();
    expect(getByLabelText('Search input')).toBeTruthy();
  });

  it('allows typing search queries and clearing query via icon button', () => {
    const handleChangeText = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SearchInput
        value="Roma Termini"
        onChangeText={handleChangeText}
      />
    );

    const input = getByPlaceholderText('Search train, city or operator...');
    fireEvent.changeText(input, 'Milano Centrale');
    expect(handleChangeText).toHaveBeenCalledWith('Milano Centrale');

    const clearBtn = getByLabelText('Clear input value');
    expect(clearBtn).toBeTruthy();
    fireEvent.press(clearBtn);
    expect(handleChangeText).toHaveBeenCalledWith('');
  });
});
