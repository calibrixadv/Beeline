import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrainFilterState, TrainStatus } from '../types/train';
import { useTheme } from '../context/ThemeContext';
import { SearchInput } from './SearchInput';
import { ResetButton } from './ResetButton';

interface FilterBarProps {
  filters: TrainFilterState;
  onFilterChange: (newFilters: TrainFilterState) => void;
  availableOperators: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableOperators,
}) => {
  const { theme, isDark } = useTheme();
  const statuses: (TrainStatus | 'ALL')[] = ['ALL', 'ON_TIME', 'DELAYED', 'BOARDING', 'CANCELLED'];

  const handleSearchChange = (text: string) => {
    onFilterChange({ ...filters, searchQuery: text });
  };

  const handleStatusSelect = (status: TrainStatus | 'ALL') => {
    onFilterChange({ ...filters, statusFilter: status });
  };

  const handleOperatorSelect = (operator: string) => {
    onFilterChange({ ...filters, operatorFilter: operator });
  };

  const handleSortBy = (sortBy: 'departure' | 'price' | 'duration') => {
    if (filters.sortBy === sortBy) {
      // Toggle sort order
      onFilterChange({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onFilterChange({
        ...filters,
        sortBy,
        sortOrder: 'asc',
      });
    }
  };

  const handleReset = () => {
    onFilterChange({
      searchQuery: '',
      statusFilter: 'ALL',
      operatorFilter: 'ALL',
      sortBy: 'departure',
      sortOrder: 'asc',
    });
  };

  const hasActiveFilters =
    filters.searchQuery.length > 0 ||
    filters.statusFilter !== 'ALL' ||
    filters.operatorFilter !== 'ALL' ||
    filters.sortBy !== 'departure' ||
    filters.sortOrder !== 'asc';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      {/* Search Input */}
      <SearchInput
        value={filters.searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search train, city or operator..."
        accessibilityLabel="Search trains by number, operator, or city"
        style={styles.searchWrapper}
      />

      {/* Status Chips */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {statuses.map((status) => {
            const isSelected = filters.statusFilter === status;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F8FAFC',
                    borderColor: theme.colors.border,
                  },
                  isSelected && {
                    backgroundColor: isDark ? '#3E3204' : '#FEF9C3',
                    borderColor: theme.colors.brandYellow,
                  },
                ]}
                onPress={() => handleStatusSelect(status)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${status} status`}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.colors.textSecondary },
                    isSelected && {
                      color: isDark ? theme.colors.brandYellow : '#854D0E',
                      fontWeight: '800',
                    },
                  ]}
                >
                  {status === 'ALL' ? 'All Statuses' : status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Operator Chips */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Operator:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F8FAFC',
                borderColor: theme.colors.border,
              },
              filters.operatorFilter === 'ALL' && {
                backgroundColor: isDark ? '#3E3204' : '#FEF9C3',
                borderColor: theme.colors.brandYellow,
              },
            ]}
            onPress={() => handleOperatorSelect('ALL')}
            accessibilityRole="button"
            accessibilityLabel="Filter by all operators"
          >
            <Text
              style={[
                styles.chipText,
                { color: theme.colors.textSecondary },
                filters.operatorFilter === 'ALL' && {
                  color: isDark ? theme.colors.brandYellow : '#854D0E',
                  fontWeight: '800',
                },
              ]}
            >
              All Operators
            </Text>
          </TouchableOpacity>
          {availableOperators.map((op) => {
            const isSelected = filters.operatorFilter === op;
            return (
              <TouchableOpacity
                key={op}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F8FAFC',
                    borderColor: theme.colors.border,
                  },
                  isSelected && {
                    backgroundColor: isDark ? '#3E3204' : '#FEF9C3',
                    borderColor: theme.colors.brandYellow,
                  },
                ]}
                onPress={() => handleOperatorSelect(op)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by operator ${op}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.colors.textSecondary },
                    isSelected && {
                      color: isDark ? theme.colors.brandYellow : '#854D0E',
                      fontWeight: '800',
                    },
                  ]}
                >
                  {op}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort Buttons & Reset */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>Sort by:</Text>
        <View style={styles.sortButtonGroup}>
          {(['departure', 'price', 'duration'] as const).map((key) => {
            const isActive = filters.sortBy === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F1F5F9',
                  },
                  isActive && {
                    backgroundColor: isDark ? '#3E3204' : '#FEF9C3',
                    borderColor: theme.colors.brandYellow,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => handleSortBy(key)}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${key} ${
                  isActive ? (filters.sortOrder === 'asc' ? 'ascending' : 'descending') : ''
                }`}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    { color: theme.colors.textSecondary },
                    isActive && {
                      color: isDark ? theme.colors.brandYellow : '#854D0E',
                      fontWeight: '800',
                    },
                  ]}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                {isActive && (
                  <Ionicons
                    name={filters.sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={isDark ? theme.colors.brandYellow : '#854D0E'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {hasActiveFilters && (
          <ResetButton
            title="Reset"
            onPress={handleReset}
            accessibilityLabel="Reset all filters"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchWrapper: {
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    width: 64,
  },
  chipsScroll: {
    gap: 6,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  sortButtonGroup: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  sortBtnActive: {
    backgroundColor: '#DBEAFE',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sortBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
