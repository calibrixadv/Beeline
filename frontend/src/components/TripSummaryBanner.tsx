import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTripPlanner } from '../context/TripContext';
import { formatCurrency } from '../utils/trainFilters';
import { BaseButton } from './BaseButton';

export const TripSummaryBanner: React.FC = () => {
  const router = useRouter();
  const { getTripTotalCost, getTripItemCount } = useTripPlanner();

  const count = getTripItemCount();
  if (count === 0) return null;

  const totalCost = getTripTotalCost();

  return (
    <View style={styles.container} testID="trip-summary-banner">
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="briefcase" size={18} color="#2563EB" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>
            {count} {count === 1 ? 'Train' : 'Trains'} Planned
          </Text>
          <Text style={styles.costSubtext}>Estimated Total: {formatCurrency(totalCost)}</Text>
        </View>
      </View>

      <BaseButton
        variant="primary"
        size="sm"
        title="View Itinerary"
        iconRight={<Ionicons name="arrow-forward" size={14} color="#FFFFFF" />}
        onPress={() => router.push('/my-trip')}
        accessibilityRole="button"
        accessibilityLabel="View Trip Itinerary"
        style={styles.viewTripBtn}
        textStyle={styles.viewTripBtnText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  costSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  viewTripBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewTripBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
