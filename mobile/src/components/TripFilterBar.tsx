import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';
import { TripFilterState, POPULAR_ROMANIAN_PROVIDERS } from '../services/tripBookingService';
import { TransitMode, CuratedPillar } from '../types/routePlan';

export interface TripFilterBarProps {
  filters: TripFilterState;
  onFilterChange: (filters: TripFilterState) => void;
  availableOperators?: string[];
  totalResultsCount: number;
  filteredResultsCount: number;
  onResetFilters: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ALL_MODES: { id: TransitMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'TRAIN', label: 'Trains', icon: 'train-outline' },
  { id: 'METRO', label: 'Metro', icon: 'subway-outline' },
  { id: 'TRAM', label: 'Trams', icon: 'trail-sign-outline' },
  { id: 'BUS', label: 'Busses', icon: 'bus-outline' },
];

const PILLAR_OPTIONS: { id: 'ALL' | CuratedPillar; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'ALL', label: 'All Trips', icon: 'grid-outline' },
  { id: 'FASTEST', label: '⚡ Fastest Direct', icon: 'flash-outline' },
  { id: 'BEST_VALUE', label: '💰 Best Value', icon: 'wallet-outline' },
  { id: 'MOST_RELIABLE', label: '🛡️ Most Reliable', icon: 'shield-checkmark-outline' },
];

const PRICE_TIERS: { label: string; value?: number }[] = [
  { label: 'Any Price', value: undefined },
  { label: '< 50 LEI', value: 50 },
  { label: '< 70 LEI', value: 70 },
  { label: '< 100 LEI', value: 100 },
];

const SORT_OPTIONS: { id: 'departure' | 'duration' | 'price' | 'risk'; label: string }[] = [
  { id: 'departure', label: 'Departure Time' },
  { id: 'duration', label: 'Shortest Duration' },
  { id: 'price', label: 'Lowest Price' },
  { id: 'risk', label: 'Lowest Risk (Shielded)' },
];

export const TripFilterBar: React.FC<TripFilterBarProps> = ({
  filters,
  onFilterChange,
  availableOperators = POPULAR_ROMANIAN_PROVIDERS,
  totalResultsCount,
  filteredResultsCount,
  onResetFilters,
  style,
  testID = 'trip-filter-bar',
}) => {
  const { theme, isDark } = useTheme();

  const handleToggleMode = (mode: TransitMode) => {
    const exists = filters.modes.includes(mode);
    let next: TransitMode[];
    if (exists) {
      // Keep at least one mode
      if (filters.modes.length === 1) return;
      next = filters.modes.filter((m) => m !== mode);
    } else {
      next = [...filters.modes, mode];
    }
    onFilterChange({ ...filters, modes: next });
  };

  const handleToggleProvider = (provider: string) => {
    const exists = filters.providers.includes(provider);
    let next: string[];
    if (exists) {
      next = filters.providers.filter((p) => p !== provider);
    } else {
      next = [...filters.providers, provider];
    }
    onFilterChange({ ...filters, providers: next });
  };

  const handleSelectPillar = (pillar: 'ALL' | CuratedPillar) => {
    onFilterChange({ ...filters, pillar });
  };

  const handleSelectPrice = (maxPriceLei?: number) => {
    onFilterChange({ ...filters, maxPriceLei });
  };

  const handleSelectSort = (sortBy: 'departure' | 'duration' | 'price' | 'risk') => {
    onFilterChange({ ...filters, sortBy });
  };

  const activeFiltersCount =
    (filters.pillar !== 'ALL' ? 1 : 0) +
    (filters.modes.length < 4 ? 4 - filters.modes.length : 0) +
    filters.providers.length +
    (filters.maxPriceLei !== undefined ? 1 : 0) +
    (filters.maxDurationMinutes !== undefined ? 1 : 0);

  return (
    <BaseCard
      variant="elevated"
      padding="md"
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
          borderColor: theme.colors.honeyBorder,
        },
        style,
      ]}
    >
      {/* Trifecta Pillars Ribbon */}
      <View style={styles.sectionHeaderRow}>
        <Text
          accessibilityRole="header"
          aria-level={3}
          style={[styles.sectionTitle, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}
        >
          CURATED TRIFECTA PILLARS
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScrollContent}
        style={styles.horizontalScroll}
      >
        {PILLAR_OPTIONS.map((pillar) => {
          const isSelected = filters.pillar === pillar.id;
          return (
            <Pressable
              key={pillar.id}
              testID={`filter-pillar-${pillar.id.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${pillar.label}`}
              onPress={() => handleSelectPillar(pillar.id)}
              style={[
                styles.chipBtn,
                {
                  backgroundColor: isSelected
                    ? theme.colors.brandHoney
                    : isDark
                    ? '#292524'
                    : '#FFFDF7',
                  borderColor: isSelected ? theme.colors.brandHoneyDark : theme.colors.honeyBorder,
                },
              ]}
            >
              <Ionicons
                name={pillar.icon}
                size={14}
                color={isSelected ? '#1C1917' : isDark ? '#FFFFFF' : theme.colors.textCharcoal}
              />
              <Text
                style={[
                  styles.chipBtnText,
                  {
                    color: isSelected ? '#1C1917' : isDark ? '#FFFFFF' : theme.colors.textCharcoal,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {pillar.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Transit Modes Filter */}
      <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
        <Text
          style={[styles.sectionTitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
        >
          TRANSIT MODES
        </Text>
      </View>
      <View style={styles.modesRow}>
        {ALL_MODES.map((modeItem) => {
          const isSelected = filters.modes.includes(modeItem.id);
          return (
            <BaseBadge
              key={modeItem.id}
              label={modeItem.label}
              variant={isSelected ? 'warning' : 'neutral'}
              size="md"
              selected={isSelected}
              icon={
                <Ionicons
                  name={modeItem.icon}
                  size={14}
                  color={isSelected ? '#1C1917' : theme.colors.textCharcoalMuted}
                />
              }
              onPress={() => handleToggleMode(modeItem.id)}
              testID={`filter-mode-${modeItem.id.toLowerCase()}`}
              accessibilityLabel={`Filter by ${modeItem.label}`}
              style={[
                styles.modeBadge,
                isSelected
                  ? {
                      backgroundColor: theme.colors.brandHoney,
                      borderColor: theme.colors.brandHoneyDark,
                    }
                  : {
                      backgroundColor: isDark ? '#292524' : '#F9FAFB',
                      borderColor: isDark ? theme.colors.honeyBorder : '#E5E7EB',
                    },
              ]}
              textStyle={
                isSelected
                  ? { color: '#1C1917', fontWeight: '800' }
                  : isDark
                  ? { color: '#FFFFFF' }
                  : { color: theme.colors.textCharcoalMuted, fontWeight: '600' }
              }
            />
          );
        })}
      </View>

      {/* Romanian Operators / Providers */}
      <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
        <Text
          style={[styles.sectionTitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
        >
          ROMANIAN PROVIDERS
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScrollContent}
        style={styles.horizontalScroll}
      >
        {availableOperators.map((operator) => {
          const isSelected = filters.providers.includes(operator);
          return (
            <Pressable
              key={operator}
              testID={`filter-provider-${operator.toLowerCase().replace(/\s+/g, '-')}`}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${operator}`}
              onPress={() => handleToggleProvider(operator)}
              style={[
                styles.operatorChip,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? '#451A03'
                      : '#FEF3C7'
                    : isDark
                    ? '#292524'
                    : '#F9FAFB',
                  borderColor: isSelected
                    ? theme.colors.brandHoney
                    : isDark
                    ? '#44403C'
                    : '#E5E7EB',
                },
              ]}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={13}
                color={isSelected ? theme.colors.brandHoney : theme.colors.textCharcoalMuted}
              />
              <Text
                style={[
                  styles.operatorChipText,
                  {
                    color: isSelected
                      ? isDark
                        ? theme.colors.brandHoney
                        : '#92400E'
                      : isDark
                      ? '#FFFFFF'
                      : theme.colors.textCharcoal,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {operator}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Max Price and Sort Row */}
      <View style={styles.priceAndSortRow}>
        {/* Max Price Chips */}
        <View style={styles.priceColumn}>
          <Text
            style={[styles.subSectionTitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
          >
            MAX PRICE
          </Text>
          <View style={styles.priceChipsWrap}>
            {PRICE_TIERS.map((tier) => {
              const isSelected = filters.maxPriceLei === tier.value;
              return (
                <Pressable
                  key={tier.label}
                  testID={`filter-price-${tier.value ? tier.value : 'any'}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter max price ${tier.label}`}
                  onPress={() => handleSelectPrice(tier.value)}
                  style={[
                    styles.priceChip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.brandHoney
                        : isDark
                        ? '#292524'
                        : '#F3F4F6',
                      borderColor: isSelected ? theme.colors.brandHoneyDark : '#E5E7EB',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priceChipText,
                      {
                        color: isSelected ? '#1C1917' : isDark ? '#FFFFFF' : theme.colors.textCharcoal,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {tier.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sort Chips */}
        <View style={styles.sortColumn}>
          <Text
            style={[styles.subSectionTitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
          >
            SORT BY
          </Text>
          <View style={styles.sortChipsWrap}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = filters.sortBy === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`sort-option-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${opt.label}`}
                  onPress={() => handleSelectSort(opt.id)}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#451A03'
                          : '#FEF3C7'
                        : isDark
                        ? '#292524'
                        : '#F9FAFB',
                      borderColor: isSelected
                        ? theme.colors.brandHoney
                        : isDark
                        ? '#44403C'
                        : '#E5E7EB',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      {
                        color: isSelected
                          ? isDark
                            ? theme.colors.brandHoney
                            : '#92400E'
                          : isDark
                          ? '#FFFFFF'
                          : theme.colors.textCharcoal,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Results Header Count & Reset Bar */}
      <View
        style={[
          styles.resultsFooter,
          {
            borderTopColor: isDark ? '#292524' : '#F3F4F6',
          },
        ]}
      >
        <Text
          style={[styles.resultsCountText, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
          testID="trips-results-count"
        >
          Showing {filteredResultsCount} of {totalResultsCount} trips
        </Text>

        {activeFiltersCount > 0 ? (
          <BaseButton
            variant="ghost"
            size="sm"
            title={`Reset Filters (${activeFiltersCount})`}
            iconLeft={<Ionicons name="refresh" size={13} color={theme.colors.brandHoney} />}
            onPress={onResetFilters}
            testID="reset-filters-btn"
            accessibilityLabel="Reset all filters to defaults"
            textStyle={{ color: isDark ? theme.colors.brandHoney : '#92400E', fontWeight: '700' }}
          />
        ) : null}
      </View>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  horizontalScroll: {
    marginBottom: 4,
  },
  chipsScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipBtnText: {
    fontSize: 12,
  },
  modesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  modeBadge: {
    borderRadius: 20,
  },
  operatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  operatorChipText: {
    fontSize: 12,
  },
  priceAndSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  priceColumn: {
    flex: 1,
    minWidth: 200,
  },
  sortColumn: {
    flex: 1,
    minWidth: 200,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  priceChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priceChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  priceChipText: {
    fontSize: 11,
  },
  sortChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
  },
  resultsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
