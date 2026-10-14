import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTripPlanner } from '../src/context/TripContext';
import { formatCurrency, formatTimeOnly } from '../src/utils/trainFilters';
import { StatusBadge } from '../src/components/StatusBadge';

export default function MyTripScreen() {
  const router = useRouter();
  const { trips, removeTrainFromTrip, clearTrip, getTripTotalCost } = useTripPlanner();

  const totalCost = getTripTotalCost();
  const totalCO2 = trips.reduce((acc, t) => acc + t.journey.carbonFootprintKg, 0);

  const handleClear = () => {
    clearTrip();
  };

  return (
    <View style={styles.screen}>
      {trips.length === 0 ? (
        <View style={styles.emptyContainer} testID="empty-trip-view">
          <View style={styles.emptyIconBox}>
            <Ionicons name="train-outline" size={54} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Your Itinerary is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse train routes, compare timetables, and add train legs to your trip itinerary.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/trains')}
            accessibilityRole="button"
            accessibilityLabel="Browse Train Schedules"
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.browseBtnText}>Browse Train Schedules</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Trip Itinerary Overview</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>Legs</Text>
                  <Text style={styles.statValue}>{trips.length}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>Total Est. Cost</Text>
                  <Text style={styles.statValuePrice}>{formatCurrency(totalCost)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>CO₂ Emissions</Text>
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
              <View style={styles.tripCard} testID={`itinerary-item-${item.id}`}>
                <View style={styles.legHeader}>
                  <View style={styles.legBadge}>
                    <Text style={styles.legBadgeText}>Leg {index + 1}</Text>
                  </View>
                  <Text style={styles.trainTitle}>{item.journey.trainNumber}</Text>
                  <StatusBadge
                    status={item.journey.status}
                    delayMinutes={item.journey.delayMinutes}
                  />
                </View>

                {/* Stations */}
                <View style={styles.routeRow}>
                  <View style={styles.routeCol}>
                    <Text style={styles.routeTime}>
                      {formatTimeOnly(item.journey.departureTime)}
                    </Text>
                    <Text style={styles.routeCity}>{item.journey.origin.city}</Text>
                    <Text style={styles.stationSubtitle}>{item.journey.origin.name}</Text>
                  </View>

                  <View style={styles.routeMiddle}>
                    <Text style={styles.routeDuration}>{item.journey.durationFormatted}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  </View>

                  <View style={[styles.routeCol, styles.alignRight]}>
                    <Text style={styles.routeTime}>
                      {formatTimeOnly(item.journey.arrivalTime)}
                    </Text>
                    <Text style={styles.routeCity}>{item.journey.destination.city}</Text>
                    <Text style={styles.stationSubtitle}>{item.journey.destination.name}</Text>
                  </View>
                </View>

                {/* Class & Price Bar */}
                <View style={styles.cardFooter}>
                  <View style={styles.classInfo}>
                    <Text style={styles.classLabel}>Class: </Text>
                    <Text style={styles.classValue}>{item.selectedClass}</Text>
                    <Text style={styles.fareAmount}>
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
                style={styles.addMoreBtn}
                onPress={() => router.push('/trains')}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color="#2563EB" />
                <Text style={styles.addMoreBtnText}>Add More Trains</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearTripBtn}
                onPress={handleClear}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color="#64748B" />
                <Text style={styles.clearTripBtnText}>Clear Itinerary</Text>
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
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statValuePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#60A5FA',
  },
  statValueEco: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34D399',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  legBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  trainTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginLeft: 8,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  routeCol: {
    flex: 1,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  routeTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  routeCity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  stationSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  routeMiddle: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeDuration: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  classValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  fareAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 4,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  clearTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  clearTripBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
