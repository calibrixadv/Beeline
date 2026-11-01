import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterBar } from '../src/components/FilterBar';
import { TrainFilterState } from '../src/types/train';

describe('FilterBar Component', () => {
  const initialFilters: TrainFilterState = {
    searchQuery: '',
    statusFilter: 'ALL',
    operatorFilter: 'ALL',
    sortBy: 'departure',
    sortOrder: 'asc',
  };

  const mockOnFilterChange = jest.fn();
  const availableOperators = ['Deutsche Bahn', 'Eurostar', 'SNCF'];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates search query on typing', () => {
    const { getByPlaceholderText } = render(
      <FilterBar
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        availableOperators={availableOperators}
      />
    );

    const input = getByPlaceholderText('Search train, city or operator...');
    fireEvent.changeText(input, 'Munich');

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...initialFilters,
      searchQuery: 'Munich',
    });
  });

  it('changes status filter on chip selection', () => {
    const { getByText } = render(
      <FilterBar
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        availableOperators={availableOperators}
      />
    );

    const delayedChip = getByText('DELAYED');
    fireEvent.press(delayedChip);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...initialFilters,
      statusFilter: 'DELAYED',
    });
  });

  it('changes operator filter on operator chip selection', () => {
    const { getByText } = render(
      <FilterBar
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        availableOperators={availableOperators}
      />
    );

    const sncfChip = getByText('SNCF');
    fireEvent.press(sncfChip);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...initialFilters,
      operatorFilter: 'SNCF',
    });
  });

  it('toggles sort order when clicking active sort key', () => {
    const { getByText } = render(
      <FilterBar
        filters={initialFilters} // already sorted by departure asc
        onFilterChange={mockOnFilterChange}
        availableOperators={availableOperators}
      />
    );

    const depSortBtn = getByText('Departure');
    fireEvent.press(depSortBtn);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...initialFilters,
      sortOrder: 'desc',
    });
  });

  it('switches sort key when clicking inactive sort key', () => {
    const { getByText } = render(
      <FilterBar
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        availableOperators={availableOperators}
      />
    );

    const priceSortBtn = getByText('Price');
    fireEvent.press(priceSortBtn);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...initialFilters,
      sortBy: 'price',
      sortOrder: 'asc',
    });
  });

  it('shows reset button when filters are active and resets on press', () => {
    const activeFilters: TrainFilterState = {
      ...initialFilters,
      searchQuery: 'Eurostar',
    };

    const { getByText } = render(
      <FilterBar
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        availableOperators={availableOperators}
      />
    );

    const resetBtn = getByText('Reset');
    fireEvent.press(resetBtn);

    expect(mockOnFilterChange).toHaveBeenCalledWith(initialFilters);
  });
});
