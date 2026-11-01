import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTripPlanner } from '../src/context/TripContext';
import { useTheme } from '../src/context/ThemeContext';
import { useScreenTransition } from '../src/context/ScreenTransitionContext';
import { formatCurrency, formatTimeOnly } from '../src/utils/trainFilters';
import { StatusBadge } from '../src/components/StatusBadge';

export default function MyTripScreen() {
  const { theme, isDark } = useTheme();
  const { trips, removeTrainFromTrip, clearTrip, getTripTotalCost } = useTripPlanner();
  const { navigateWithTransition } = useScreenTransition();

  const totalCost = getTripTotalCost();
  const totalCO2 = trips.reduce((acc, t) => acc + t.journey.carbonFootprintKg, 0);

  const handleClear = () => {
    clearTrip();
  };


  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {trips.length === 0 ? (
        <View style={styles.emptyContainer} testID="empty-trip-view">
          <View
            style={[
              styles.emptyIconBox,
              {
                backgroundColor: isDark ? '#1F1F23' : '#FEF9C3',
              },
            ]}
          >
            <Ionicons name="train-outline" size={54} color={theme.colors.brandYellow} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            Your Itinerary is Empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Browse train routes, compare timetables, and add train legs to your trip itinerary.
          </Text>
          <TouchableOpacity
            style={[
              styles.browseBtn,
              {
                backgroundColor: theme.colors.brandYellow,
              },
            ]}
            onPress={() => navigateWithTransition('/trains', { message: 'Loading train schedules...' })}
            accessibilityRole="button"
            accessibilityLabel="Browse Train Schedules"
          >
            <Ionicons name="search" size={18} color="#000000" />
            <Text style={[styles.browseBtnText, { color: '#000000' }]}>Browse Train Schedules</Text>

          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>
                Trip Itinerary Overview
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryStat}>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Legs</Text>
                  <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                    {trips.length}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.summaryStat}>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                    Total Est. Cost
                  </Text>
                  <Text style={[styles.statValuePrice, { color: theme.colors.brandYellow }]}>
                    {formatCurrency(totalCost)}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.summaryStat}>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                    CO₂ Emissions
                  </Text>
                  <Text style={styles.statValueEco}>{totalCO2.toFixed(1)} kg</Text>
                </View>
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const fare =
              item.journey.fares.find((f) => f.classType === item.selectedClass) ||
              item.journey.fares[0];

            return (
              <View
                style={[
                  styles.tripCard,
                  {
                    backgroundColor: theme.colors.cardBg,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                testID={`itinerary-item-${item.id}`}
              >
                <View style={styles.legHeader}>
                  <View
                    style={[
                      styles.legBadge,
                      {
                        backgroundColor: theme.colors.brandYellow,
                      },
                    ]}
                  >
                    <Text style={styles.legBadgeText}>Leg {index + 1}</Text>
                  </View>
                  <Text style={[styles.trainTitle, { color: theme.colors.textPrimary }]}>
                    {item.journey.trainNumber}
                  </Text>
                  <StatusBadge
                    status={item.journey.status}
                    delayMinutes={item.journey.delayMinutes}
                  />
                </View>

                {/* Stations */}
                <View style={styles.routeRow}>
                  <View style={styles.routeCol}>
                    <Text style={[styles.routeTime, { color: theme.colors.textPrimary }]}>
                      {formatTimeOnly(item.journey.departureTime)}
                    </Text>
                    <Text style={[styles.routeCity, { color: theme.colors.textPrimary }]}>
                      {item.journey.origin.city}
                    </Text>
                    <Text style={[styles.stationSubtitle, { color: theme.colors.textSecondary }]}>
                      {item.journey.origin.name}
                    </Text>
                  </View>

                  <View style={styles.routeMiddle}>
                    <Text style={[styles.routeDuration, { color: theme.colors.textSecondary }]}>
                      {item.journey.durationFormatted}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.colors.brandYellow} />
                  </View>

                  <View style={[styles.routeCol, styles.alignRight]}>
                    <Text style={[styles.routeTime, { color: theme.colors.textPrimary }]}>
                      {formatTimeOnly(item.journey.arrivalTime)}
                    </Text>
                    <Text style={[styles.routeCity, { color: theme.colors.textPrimary }]}>
                      {item.journey.destination.city}
                    </Text>
                    <Text style={[styles.stationSubtitle, { color: theme.colors.textSecondary }]}>
                      {item.journey.destination.name}
                    </Text>
                  </View>
                </View>

                {/* Class & Price Bar */}
                <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
                  <View style={styles.classInfo}>
                    <Text style={[styles.classLabel, { color: theme.colors.textSecondary }]}>
                      Class:{' '}
                    </Text>
                    <Text style={[styles.classValue, { color: theme.colors.textPrimary }]}>
                      {item.selectedClass}
                    </Text>
                    <Text style={[styles.fareAmount, { color: theme.colors.textSecondary }]}>
                      ({formatCurrency(fare ? fare.price : 0, fare?.currency)})
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeTrainFromTrip(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.journey.trainNumber} from trip`}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[
                  styles.addMoreBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.brandYellow,
                  },
                ]}
                onPress={() => navigateWithTransition('/trains', { message: 'Browsing more train journeys...' })}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color={theme.colors.brandYellow} />
                <Text style={[styles.addMoreBtnText, { color: theme.colors.textPrimary }]}>
                  Add More Trains
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.clearTripBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handleClear}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.clearTripBtnText, { color: theme.colors.textSecondary }]}>
                  Clear Itinerary
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  browseBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statValuePrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  statValueEco: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  tripCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  legBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  legBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  trainTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  routeCol: {
    flex: 2,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  routeTime: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  routeCity: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  stationSubtitle: {
    fontSize: 11,
  },
  routeMiddle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  routeDuration: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  classLabel: {
    fontSize: 12,
  },
  classValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  fareAmount: {
    fontSize: 12,
    marginLeft: 4,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  clearTripBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
