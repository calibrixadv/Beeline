import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LocationSelectDropdown } from '../src/components/LocationSelectDropdown';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('LocationSelectDropdown component', () => {
  const defaultProps = {
    currentCity: 'București',
    field: 'origin' as const,
    onSelectLocation: jest.fn(),
    onClose: jest.fn(),
  };

  const renderDropdown = (props = {}) => {
    return render(
      <ThemeProvider>
        <LocationSelectDropdown {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dropdown header, current city locations, and close button', () => {
    const { getByText, getByTestId } = renderDropdown();

    expect(getByText('Select Departure Location')).toBeTruthy();
    expect(getByTestId('close-dropdown-btn')).toBeTruthy();
    expect(getByText(/FEATURED IN BUCUREȘTI/)).toBeTruthy();
    expect(getByText('București Nord')).toBeTruthy();
    expect(getByText('Piața Unirii')).toBeTruthy();
  });

  it('renders My Current Location option for origin field', () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText } = renderDropdown({
      field: 'origin',
      currentCity: 'Galați',
      onSelectLocation: onSelect,
    });

    const currLocBtn = getByTestId('dropdown-current-location-btn');
    expect(currLocBtn).toBeTruthy();
    expect(getByText('📍 My Current Location')).toBeTruthy();

    fireEvent.press(currLocBtn);
    expect(onSelect).toHaveBeenCalledWith('📍 My Current Location (Galați)');
  });

  it('calls onSelectLocation when a featured city location is tapped', () => {
    const onSelect = jest.fn();
    const { getByTestId } = renderDropdown({
      currentCity: 'Galați',
      onSelectLocation: onSelect,
    });

    const item = getByTestId('dropdown-item-galati-micro-19');
    expect(item).toBeTruthy();

    fireEvent.press(item);
    expect(onSelect).toHaveBeenCalledWith(
      'Micro 19',
      expect.objectContaining({ id: 'galati-micro-19', city: 'Galați' })
    );
  });

  it('renders recent searches section when recent choices are provided', () => {
    const onSelect = jest.fn();
    const { getByText, getByTestId, getAllByText } = renderDropdown({
      recentChoices: ['Gara Galați', 'Bariera Traian'],
      onSelectLocation: onSelect,
    });

    expect(getByText('RECENT SEARCHES')).toBeTruthy();
    expect(getAllByText('Gara Galați').length).toBeGreaterThan(0);

    const recentItem = getByTestId('dropdown-recent-0');
    fireEvent.press(recentItem);
    expect(onSelect).toHaveBeenCalledWith('Gara Galați');
  });

  it('renders outside major rail hubs when field is destination', () => {
    const { getByText, getByTestId } = renderDropdown({
      field: 'destination',
      currentCity: 'București',
    });

    expect(getByText('MAJOR HUBS IN OTHER ROMANIAN CITIES')).toBeTruthy();
    expect(getByTestId('dropdown-outside-hub-bv-gara-cfr')).toBeTruthy();
  });

  it('invokes onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderDropdown({ onClose });

    const closeBtn = getByTestId('close-dropdown-btn');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters locations by search query', () => {
    const { getByText, queryByText } = renderDropdown({
      currentCity: 'București',
      searchQuery: 'otopeni',
    });

    expect(getByText('Aeroport Otopeni (Henri Coandă)')).toBeTruthy();
    expect(queryByText('Pipera')).toBeNull();
  });
});
