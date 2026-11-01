import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripFilterBar } from '../src/components/TripFilterBar';
import { ThemeProvider } from '../src/context/ThemeContext';
import { DEFAULT_TRIP_FILTERS, POPULAR_ROMANIAN_PROVIDERS } from '../src/services/tripBookingService';

const renderFilterBar = (props: Partial<React.ComponentProps<typeof TripFilterBar>> = {}) => {
  const defaultProps: React.ComponentProps<typeof TripFilterBar> = {
    filters: DEFAULT_TRIP_FILTERS,
    onFilterChange: jest.fn(),
    availableOperators: POPULAR_ROMANIAN_PROVIDERS,
    totalResultsCount: 4,
    filteredResultsCount: 4,
    onResetFilters: jest.fn(),
    ...props,
  };

  return render(
    <ThemeProvider>
      <TripFilterBar {...defaultProps} />
    </ThemeProvider>
  );
};

describe('TripFilterBar component', () => {
  it('renders Curated Trifecta pillars, transit modes, providers, and results count', () => {
    const { getByText, getByTestId } = renderFilterBar();

    expect(getByText('CURATED TRIFECTA PILLARS')).toBeTruthy();
    expect(getByText('TRANSIT MODES')).toBeTruthy();
    expect(getByText('ROMANIAN PROVIDERS')).toBeTruthy();
    expect(getByText('MAX PRICE')).toBeTruthy();
    expect(getByText('SORT BY')).toBeTruthy();

    expect(getByTestId('filter-pillar-all')).toBeTruthy();
    expect(getByTestId('filter-pillar-fastest')).toBeTruthy();
    expect(getByTestId('filter-pillar-best_value')).toBeTruthy();
    expect(getByTestId('filter-pillar-most_reliable')).toBeTruthy();

    expect(getByText('Showing 4 of 4 trips')).toBeTruthy();
  });

  it('triggers onFilterChange when selecting a Trifecta pillar chip', () => {
    const handleFilterChange = jest.fn();
    const { getByTestId } = renderFilterBar({ onFilterChange: handleFilterChange });

    const fastestChip = getByTestId('filter-pillar-fastest');
    fireEvent.press(fastestChip);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ pillar: 'FASTEST' })
    );
  });

  it('triggers onFilterChange when toggling a transport mode', () => {
    const handleFilterChange = jest.fn();
    const { getByTestId } = renderFilterBar({
      filters: DEFAULT_TRIP_FILTERS,
      onFilterChange: handleFilterChange,
    });

    const metroBadge = getByTestId('filter-mode-metro');
    fireEvent.press(metroBadge);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        modes: ['TRAIN', 'TRAM', 'BUS'],
      })
    );
  });

  it('triggers onFilterChange when toggling a Romanian provider', () => {
    const handleFilterChange = jest.fn();
    const { getByTestId } = renderFilterBar({ onFilterChange: handleFilterChange });

    const cfrChip = getByTestId('filter-provider-cfr-călători');
    fireEvent.press(cfrChip);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        providers: ['CFR Călători'],
      })
    );
  });

  it('triggers onFilterChange when selecting a max price tier', () => {
    const handleFilterChange = jest.fn();
    const { getByTestId } = renderFilterBar({ onFilterChange: handleFilterChange });

    const under50Chip = getByTestId('filter-price-50');
    fireEvent.press(under50Chip);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        maxPriceLei: 50,
      })
    );
  });

  it('triggers onFilterChange when selecting a sort option', () => {
    const handleFilterChange = jest.fn();
    const { getByTestId } = renderFilterBar({ onFilterChange: handleFilterChange });

    const sortRiskChip = getByTestId('sort-option-risk');
    fireEvent.press(sortRiskChip);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'risk',
      })
    );
  });

  it('renders Reset Filters button when active filters exist and triggers onResetFilters', () => {
    const handleReset = jest.fn();
    const { getByTestId } = renderFilterBar({
      filters: {
        ...DEFAULT_TRIP_FILTERS,
        pillar: 'FASTEST',
        maxPriceLei: 50,
      },
      onResetFilters: handleReset,
    });

    const resetBtn = getByTestId('reset-filters-btn');
    expect(resetBtn).toBeTruthy();

    fireEvent.press(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
