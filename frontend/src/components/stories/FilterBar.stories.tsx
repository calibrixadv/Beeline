import React from 'react';
import { FilterBar } from '../FilterBar';
import { TrainFilterState } from '../../types/train';
import { StoryMeta, StoryObj } from '../../../.storybook/testing';

type FilterBarProps = React.ComponentProps<typeof FilterBar>;

const defaultFilters: TrainFilterState = {
  searchQuery: '',
  statusFilter: 'ALL',
  operatorFilter: 'ALL',
  sortBy: 'departure',
  sortOrder: 'asc',
};

const meta: StoryMeta<FilterBarProps> = {
  title: 'Feature/FilterBar',
  component: FilterBar,
  args: {
    filters: defaultFilters,
    onFilterChange: () => {},
    availableOperators: ['SNCF', 'Deutsche Bahn', 'Eurostar', 'Trenitalia'],
  },
};

export default meta;

export const Default: StoryObj<FilterBarProps> = {
  args: {
    filters: defaultFilters,
    onFilterChange: () => {},
    availableOperators: ['SNCF', 'Deutsche Bahn', 'Eurostar', 'Trenitalia'],
  },
};

export const ActiveFilters: StoryObj<FilterBarProps> = {
  args: {
    filters: {
      searchQuery: 'Paris',
      statusFilter: 'ON_TIME',
      operatorFilter: 'SNCF',
      sortBy: 'price',
      sortOrder: 'asc',
    },
    onFilterChange: () => {},
    availableOperators: ['SNCF', 'Deutsche Bahn', 'Eurostar', 'Trenitalia'],
  },
};
