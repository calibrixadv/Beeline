import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';
import { TrainFilterState, TrainJourney } from '../src/types/train';
import { filterAndSortTrains } from '../src/utils/trainFilters';
import { TrainCard } from '../src/components/TrainCard';
import { FilterBar } from '../src/components/FilterBar';
import { TrainDetailModal } from '../src/components/TrainDetailModal';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';

export default function TrainsScreen() {
  const [filters, setFilters] = useState<TrainFilterState>({
    searchQuery: '',
    statusFilter: 'ALL',
    operatorFilter: 'ALL',
    sortBy: 'departure',
    sortOrder: 'asc',
  });

  const [selectedJourney, setSelectedJourney] = useState<TrainJourney | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Extract unique operators from sample dataset
  const availableOperators = useMemo(() => {
    return Array.from(new Set(SAMPLE_TRAINS.map((t) => t.operator))).sort();
  }, []);

  // Filter and sort trains based on current filter state
  const displayedTrains = useMemo(() => {
    return filterAndSortTrains(SAMPLE_TRAINS, filters);
  }, [filters]);

  const handleOpenDetails = (journey: TrainJourney) => {
    setSelectedJourney(journey);
    setModalVisible(true);
  };

  const handleCloseDetails = () => {
    setModalVisible(false);
    setSelectedJourney(null);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      statusFilter: 'ALL',
      operatorFilter: 'ALL',
      sortBy: 'departure',
      sortOrder: 'asc',
    });
  };

  return (
    <View style={styles.screen}>
      {/* Top Filter and Search Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        availableOperators={availableOperators}
      />

      {/* Results Header Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          Showing {displayedTrains.length} of {SAMPLE_TRAINS.length} train journeys
        </Text>
        {filters.statusFilter !== 'ALL' && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>Status: {filters.statusFilter}</Text>
          </View>
        )}
      </View>

      {/* Trains List */}
      <FlatList
        data={displayedTrains}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrainCard journey={item} onPressDetails={handleOpenDetails} />
        )}
        contentContainerStyle={
          displayedTrains.length === 0 ? styles.emptyListContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer} testID="empty-trains-container">
            <Ionicons name="search-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Trains Found</Text>
            <Text style={styles.emptyDescription}>
              No journeys match your current search and filter criteria.
            </Text>
            <TouchableOpacity
              style={styles.resetEmptyBtn}
              onPress={handleResetFilters}
              accessibilityRole="button"
            >
              <Text style={styles.resetEmptyBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Interactive Detail Modal */}
      <TrainDetailModal
        journey={selectedJourney}
        visible={modalVisible}
        onClose={handleCloseDetails}
      />

      {/* Sticky Bottom Itinerary Summary */}
      <TripSummaryBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    maxWidth: 260,
  },
  resetEmptyBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetEmptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
