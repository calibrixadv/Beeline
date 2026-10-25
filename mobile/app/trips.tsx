import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { useTripPlanner } from '../src/context/TripContext';
import { BaseCard } from '../src/components/BaseCard';
import { BaseInput } from '../src/components/BaseInput';
import { BaseButton } from '../src/components/BaseButton';
import { CozyHoneyBackground } from '../src/components/CozyHoneyBackground';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';
import { BookingTripCard } from '../src/components/BookingTripCard';
import { TripFilterBar } from '../src/components/TripFilterBar';
import {
  TripFilterState,
  DEFAULT_TRIP_FILTERS,
  POPULAR_ROMANIAN_PROVIDERS,
  generateTripsForCorridor,
  filterAndSortTrips,
  convertRoutePlanToTrainJourney,
} from '../src/services/tripBookingService';
import { TransitRoutePlan, CuratedPillar } from '../src/types/routePlan';

export default function TripsScreen() {
  const { theme, isDark } = useTheme();
  const { addTrainToTrip, removeTrainFromTrip, isTrainInTrip } = useTripPlanner();

  const searchParams = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    pillar?: string;
  }>();

  const [originInput, setOriginInput] = useState<string>(
    searchParams.origin ? decodeURIComponent(searchParams.origin) : 'București Nord'
  );
  const [destinationInput, setDestinationInput] = useState<string>(
    searchParams.destination ? decodeURIComponent(searchParams.destination) : 'Brașov'
  );
  const [activeDeparturePreset, setActiveDeparturePreset] = useState<string>('Now');

  // Active query committed after pressing search or changing URL params
  const [activeOrigin, setActiveOrigin] = useState<string>(originInput);
  const [activeDestination, setActiveDestination] = useState<string>(destinationInput);

  // Filter and sort state
  const [filters, setFilters] = useState<TripFilterState>(() => {
    let initialPillar: 'ALL' | CuratedPillar = 'ALL';
    if (searchParams.pillar) {
      const p = searchParams.pillar.toUpperCase();
      if (p === 'FASTEST' || p === 'BEST_VALUE' || p === 'MOST_RELIABLE' || p === 'ECO_HERO') {
        initialPillar = p as CuratedPillar;
      }
    }
    return {
      ...DEFAULT_TRIP_FILTERS,
      pillar: initialPillar,
    };
  });

  // Sync if URL search params change externally
  useEffect(() => {
    if (searchParams.origin) {
      const decodedOrig = decodeURIComponent(searchParams.origin);
      setOriginInput(decodedOrig);
      setActiveOrigin(decodedOrig);
    }
    if (searchParams.destination) {
      const decodedDest = decodeURIComponent(searchParams.destination);
      setDestinationInput(decodedDest);
      setActiveDestination(decodedDest);
    }
    if (searchParams.pillar) {
      const p = searchParams.pillar.toUpperCase();
      if (p === 'FASTEST' || p === 'BEST_VALUE' || p === 'MOST_RELIABLE' || p === 'ECO_HERO') {
        setFilters((prev) => ({ ...prev, pillar: p as CuratedPillar }));
      }
    }
  }, [searchParams.origin, searchParams.destination, searchParams.pillar]);

  // Generate multi-modal options for current corridor
  const allTrips: TransitRoutePlan[] = useMemo(() => {
    return generateTripsForCorridor(activeOrigin, activeDestination);
  }, [activeOrigin, activeDestination]);

  // Filter and sort options
  const displayedTrips = useMemo(() => {
    return filterAndSortTrips(allTrips, filters);
  }, [allTrips, filters]);

  // Quick summary matrix stats
  const lowestFareLei = useMemo(() => {
    if (allTrips.length === 0) return 0;
    return Math.min(...allTrips.map((t) => t.fare.totalAmountLei));
  }, [allTrips]);

  const fastestDurationText = useMemo(() => {
    if (allTrips.length === 0) return '--';
    const minMins = Math.min(...allTrips.map((t) => t.totalDurationMinutes));
    const h = Math.floor(minMins / 60);
    const m = minMins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [allTrips]);

  const mostShieldedPunctuality = useMemo(() => {
    if (allTrips.length === 0) return 92;
    const maxRate = Math.max(...allTrips.map((t) => t.riskAnalysis.historicalPunctualityRate));
    return Math.round(maxRate * 100);
  }, [allTrips]);

  // Handlers
  const handleSwapStations = () => {
    const temp = originInput;
    setOriginInput(destinationInput);
    setDestinationInput(temp);
    setActiveOrigin(destinationInput);
    setActiveDestination(temp);
  };

  const handleSearchCommit = () => {
    const trimmedOrig = originInput.trim() || 'București Nord';
    const trimmedDest = destinationInput.trim() || 'Brașov';
    setActiveOrigin(trimmedOrig);
    setActiveDestination(trimmedDest);
  };

  const handleSelectCorridor = (from: string, to: string) => {
    setOriginInput(from);
    setDestinationInput(to);
    setActiveOrigin(from);
    setActiveDestination(to);
  };

  const handleBookTrip = (plan: TransitRoutePlan) => {
    const journey = convertRoutePlanToTrainJourney(plan);
    addTrainToTrip(journey, 'STANDARD', '2026-10-21');
  };

  const handleRemoveTrip = (planId: string) => {
    removeTrainFromTrip(planId);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_TRIP_FILTERS);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.brandCream }]} testID="trips-screen">
      <CozyHoneyBackground testID="trips-cozy-background" style={styles.cozyBackground}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Booking Search Controls Card */}
          <BaseCard
            variant="elevated"
            padding="md"
            testID="trips-search-box"
            style={[
              styles.searchBoxCard,
              {
                backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
                borderColor: theme.colors.honeyBorder,
              },
            ]}
          >
            {/* Header badge & title */}
            <View style={styles.searchHeader}>
              <View style={[styles.searchBadge, { backgroundColor: theme.colors.brandHoney }]}>
                <Ionicons name="compass" size={13} color="#1C1917" />
                <Text style={styles.searchBadgeText}>MULTI-MODAL BOOKING</Text>
              </View>
              <Text
                style={[
                  styles.searchSubtitle,
                  { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                ]}
              >
                Accurate Romanian Rail & Urban Fares
              </Text>
            </View>

            {/* Origin & Destination Inputs with Swap Action */}
            <View style={styles.inputsRow}>
              <View style={styles.inputFlex}>
                <BaseInput
                  label="ORIGIN"
                  placeholder="e.g. București Nord"
                  value={originInput}
                  onChangeText={setOriginInput}
                  onClear={() => setOriginInput('')}
                  leftIcon={<Ionicons name="location-outline" size={18} color={theme.colors.brandHoney} />}
                  clearable
                  testID="trips-origin-input"
                  accessibilityLabel="Origin point input"
                />
              </View>

              {/* Quick Swap Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap origin and destination"
                onPress={handleSwapStations}
                testID="trips-swap-btn"
                style={[
                  styles.swapBtn,
                  {
                    backgroundColor: isDark ? '#292524' : '#FEF3C7',
                    borderColor: theme.colors.honeyBorder,
                  },
                ]}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  color={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
                />
              </Pressable>

              <View style={styles.inputFlex}>
                <BaseInput
                  label="DESTINATION"
                  placeholder="e.g. Brașov"
                  value={destinationInput}
                  onChangeText={setDestinationInput}
                  onClear={() => setDestinationInput('')}
                  leftIcon={<Ionicons name="flag-outline" size={18} color={theme.colors.brandHoney} />}
                  clearable
                  testID="trips-destination-input"
                  accessibilityLabel="Destination point input"
                />
              </View>
            </View>

            {/* Departure Presets & Primary Search Button */}
            <View style={styles.searchActionRow}>
              {/* Departure time presets */}
              <View style={styles.departurePresetsRow}>
                <Text
                  style={[
                    styles.departureLabel,
                    { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                  ]}
                >
                  DEPART:
                </Text>
                {['Now', '08:00', '12:00', '16:00'].map((preset) => {
                  const isSelected = activeDeparturePreset === preset;
                  return (
                    <Pressable
                      key={preset}
                      testID={`preset-departure-${preset.toLowerCase()}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Departure time preset ${preset}`}
                      onPress={() => setActiveDeparturePreset(preset)}
                      style={[
                        styles.departureChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.brandHoney
                            : isDark
                            ? '#292524'
                            : '#FEF3C7',
                          borderColor: isSelected
                            ? theme.colors.brandHoneyDark
                            : theme.colors.honeyBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.departureChipText,
                          {
                            color: isSelected
                              ? '#1C1917'
                              : isDark
                              ? '#FFFFFF'
                              : theme.colors.textCharcoal,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Find/Refresh Trips Button */}
              <BaseButton
                variant="primary"
                size="md"
                title="Search Trips"
                iconLeft={<Ionicons name="search" size={16} color="#1C1917" />}
                onPress={handleSearchCommit}
                testID="trips-search-btn"
                accessibilityLabel="Search trips between origin and destination"
                style={[
                  styles.searchBtn,
                  {
                    backgroundColor: theme.colors.brandHoney,
                    borderColor: theme.colors.brandHoneyDark,
                  },
                ]}
                textStyle={{ color: '#1C1917', fontWeight: '800' }}
              />
            </View>

            {/* Quick Corridor Chips */}
            <View style={styles.corridorsRow}>
              <Text
                style={[
                  styles.corridorsLabel,
                  { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                ]}
              >
                Popular corridors:
              </Text>
              {[
                { id: 'bucuresti-brasov', from: 'București Nord', to: 'Brașov', label: 'București ⇄ Brașov' },
                { id: 'galati-bucuresti', from: 'Micro 19, Galați', to: 'Piața Unirii, București', label: 'Galați ⇄ București' },
                { id: 'cluj-timisoara', from: 'Cluj-Napoca', to: 'Timișoara', label: 'Cluj ⇄ Timișoara' },
              ].map((c) => (
                <Pressable
                  key={c.id}
                  testID={`quick-corridor-${c.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select corridor ${c.label}`}
                  onPress={() => handleSelectCorridor(c.from, c.to)}
                  style={[
                    styles.corridorChip,
                    {
                      backgroundColor: isDark ? '#292524' : '#FFFDF7',
                      borderColor: theme.colors.honeyBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.corridorChipText,
                      { color: isDark ? theme.colors.brandHoney : '#92400E' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </BaseCard>

          {/* Matrix Summary Ribbon (Cheapest, Fastest, Most Shielded) */}
          <View
            style={[
              styles.matrixRibbon,
              {
                backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
                borderColor: theme.colors.honeyBorder,
              },
            ]}
            testID="trips-matrix-ribbon"
          >
            <View style={styles.matrixItem}>
              <Ionicons name="wallet" size={16} color={isDark ? '#34D399' : '#059669'} />
              <View>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                  ]}
                >
                  BEST PRICE
                </Text>
                <Text
                  style={[
                    styles.matrixValue,
                    { color: isDark ? '#34D399' : '#059669' },
                  ]}
                  testID="matrix-cheapest-price"
                >
                  From {lowestFareLei.toFixed(0)} LEI (€{(lowestFareLei / 5.0).toFixed(1)})
                </Text>
              </View>
            </View>

            <View style={[styles.matrixDivider, { backgroundColor: theme.colors.honeyBorder }]} />

            <View style={styles.matrixItem}>
              <Ionicons name="flash" size={16} color={theme.colors.brandHoney} />
              <View>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                  ]}
                >
                  FASTEST TRANSIT
                </Text>
                <Text
                  style={[
                    styles.matrixValue,
                    { color: isDark ? theme.colors.brandHoney : '#B45309' },
                  ]}
                  testID="matrix-fastest-duration"
                >
                  {fastestDurationText} Direct
                </Text>
              </View>
            </View>

            <View style={[styles.matrixDivider, { backgroundColor: theme.colors.honeyBorder }]} />

            <View style={styles.matrixItem}>
              <Ionicons name="shield-checkmark" size={16} color="#60A5FA" />
              <View>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                  ]}
                >
                  HONEY SHIELD
                </Text>
                <Text
                  style={[
                    styles.matrixValue,
                    { color: isDark ? '#60A5FA' : '#1D4ED8' },
                  ]}
                  testID="matrix-most-shielded"
                >
                  {mostShieldedPunctuality}% On-Time Safe
                </Text>
              </View>
            </View>
          </View>

          {/* Filtering and Sorting Bar Component */}
          <TripFilterBar
            filters={filters}
            onFilterChange={setFilters}
            availableOperators={POPULAR_ROMANIAN_PROVIDERS}
            totalResultsCount={allTrips.length}
            filteredResultsCount={displayedTrips.length}
            onResetFilters={handleResetFilters}
            testID="trips-filter-bar"
          />

          {/* Trip Results List */}
          {displayedTrips.length > 0 ? (
            <View testID="trips-results-list">
              {displayedTrips.map((plan) => (
                <BookingTripCard
                  key={plan.id}
                  plan={plan}
                  isBooked={isTrainInTrip(plan.id)}
                  onBookTrip={handleBookTrip}
                  onRemoveTrip={handleRemoveTrip}
                  testID={`booking-trip-card-${plan.id}`}
                />
              ))}
            </View>
          ) : (
            /* Empty State */
            <BaseCard
              variant="outlined"
              padding="lg"
              testID="trips-empty-results"
              style={[
                styles.emptyCard,
                {
                  backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
                  borderColor: theme.colors.honeyBorder,
                },
              ]}
            >
              <Ionicons name="search" size={42} color={theme.colors.brandHoney} />
              <Text
                accessibilityRole="header"
                aria-level={3}
                style={[
                  styles.emptyTitle,
                  { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                ]}
              >
                No Matching Trips Found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                ]}
              >
                Try relaxing your mode, provider, or price filters to see more transit options.
              </Text>
              <BaseButton
                variant="primary"
                size="md"
                title="Reset All Filters"
                onPress={handleResetFilters}
                testID="empty-reset-filters-btn"
                style={{
                  marginTop: 16,
                  backgroundColor: theme.colors.brandHoney,
                  borderColor: theme.colors.brandHoneyDark,
                }}
                textStyle={{ color: '#1C1917', fontWeight: '800' }}
              />
            </BaseCard>
          )}
        </ScrollView>
      </CozyHoneyBackground>

      {/* Sticky Trip Summary Banner if trips are booked */}
      <TripSummaryBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  cozyBackground: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  searchBoxCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  searchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  searchBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: 0.5,
  },
  searchSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inputFlex: {
    flex: 1,
    minWidth: 220,
  },
  swapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 18,
  },
  searchActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  departurePresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  departureLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  departureChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  departureChipText: {
    fontSize: 11,
  },
  searchBtn: {
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  corridorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  corridorsLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  corridorChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  corridorChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matrixRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  matrixItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 160,
  },
  matrixLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matrixValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  matrixDivider: {
    width: 1,
    height: 32,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 360,
  },
});
