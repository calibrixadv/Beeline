import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BaseInput, BaseInputProps } from './BaseInput';

export interface SearchInputProps extends Omit<BaseInputProps, 'leftIcon'> {
  /** Optional override for search icon color */
  searchIconColor?: string;
}

/**
 * SearchInput - Extends BaseInput tailored for filtering and queries
 * with standard search glyph and automated clear interaction.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  searchIconColor = '#94A3B8',
  placeholder = 'Search train, city or operator...',
  clearable = true,
  accessibilityLabel = 'Search input',
  testID = 'search-input',
  ...restProps
}) => {
  return (
    <BaseInput
      {...restProps}
      placeholder={placeholder}
      clearable={clearable}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      leftIcon={<Ionicons name="search" size={18} color={searchIconColor} />}
    />
  );
};
