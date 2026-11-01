import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrainJourney } from '../types/train';
import { formatCurrency, formatTimeOnly, getLowestFare } from '../utils/trainFilters';
import { StatusBadge } from './StatusBadge';
import { BaseCard } from './BaseCard';
import { BaseButton } from './BaseButton';
import { PlanButton } from './PlanButton';
import { useTripPlanner } from '../context/TripContext';
import { useTheme } from '../context/ThemeContext';

interface TrainCardProps {
  journey: TrainJourney;
  onPressDetails: (journey: TrainJourney) => void;
}

export const TrainCard: React.FC<TrainCardProps> = ({ journey, onPressDetails }) => {
  const { theme, isDark } = useTheme();
  const { isTrainInTrip, addTrainToTrip } = useTripPlanner();
  const isSaved = isTrainInTrip(journey.id);
  const lowestPrice = getLowestFare(journey);
  const isCancelled = journey.status === 'CANCELLED';

  return (
    <BaseCard
      variant="elevated"
      padding="md"
      style={styles.card}
      testID={`train-card-${journey.id}`}
    >
      {/* Top Header: Train Number, Operator & Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.operatorBlock}>
          <Text style={[styles.trainNumber, { color: theme.colors.textPrimary }]}>
            {journey.trainNumber}
          </Text>
          <Text style={[styles.operatorText, { color: theme.colors.textSecondary }]}>
            {journey.operator}
          </Text>
        </View>
        <StatusBadge status={journey.status} delayMinutes={journey.delayMinutes} />
      </View>

      {/* Origin, Timeline, Destination */}
      <View style={styles.timelineRow}>
        {/* Origin */}
        <View style={styles.stationBlock}>
          <Text style={[styles.timeText, { color: theme.colors.textPrimary }]}>
            {formatTimeOnly(journey.departureTime)}
          </Text>
          <Text style={[styles.cityText, { color: theme.colors.textSecondary }]}>
            {journey.origin.city}
          </Text>
          <Text
            style={[styles.stationName, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {journey.origin.name}
          </Text>
          {journey.origin.platform ? (
            <Text style={[styles.platformText, { color: theme.colors.textSecondary }]}>
              {journey.origin.platform}
            </Text>
          ) : null}
        </View>

        {/* Center Duration Bar */}
        <View style={styles.durationBlock}>
          <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
            {journey.durationFormatted}
          </Text>
          <View style={styles.lineIndicator}>
            <View style={[styles.dot, { backgroundColor: theme.colors.brandYellow }]} />
            <View
              style={[
                styles.horizontalLine,
                { backgroundColor: isDark ? theme.colors.border : '#CBD5E1' },
              ]}
            />
            <Ionicons name="train" size={14} color={theme.colors.brandYellow} />
            <View
              style={[
                styles.horizontalLine,
                { backgroundColor: isDark ? theme.colors.border : '#CBD5E1' },
              ]}
            />
            <View style={[styles.dot, { backgroundColor: theme.colors.brandYellow }]} />
          </View>
          <Text style={[styles.stopsText, { color: theme.colors.textMuted }]}>
            {journey.stops.length <= 2 ? 'Direct' : `${journey.stops.length - 2} stops`}
          </Text>
        </View>

        {/* Destination */}
        <View style={[styles.stationBlock, styles.alignRight]}>
          <Text style={[styles.timeText, { color: theme.colors.textPrimary }]}>
            {formatTimeOnly(journey.arrivalTime)}
          </Text>
          <Text style={[styles.cityText, { color: theme.colors.textSecondary }]}>
            {journey.destination.city}
          </Text>
          <Text
            style={[styles.stationName, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {journey.destination.name}
          </Text>
          {journey.destination.platform ? (
            <Text style={[styles.platformText, { color: theme.colors.textSecondary }]}>
              {journey.destination.platform}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Class Availabilities and Environmental Note */}
      <View style={styles.metaRow}>
        <View style={styles.classChips}>
          {journey.fares.map((fare) => (
            <View
              key={fare.classType}
              style={[
                styles.fareChip,
                {
                  backgroundColor: isDark ? '#1F1F23' : '#F8FAFC',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.fareClass, { color: theme.colors.textSecondary }]}>
                {fare.classType}
              </Text>
              <Text style={[styles.farePrice, { color: theme.colors.textPrimary }]}>
                {formatCurrency(fare.price, fare.currency)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.co2Text, { color: isDark ? '#34D399' : '#166534' }]}>
          🌱 {journey.carbonFootprintKg} kg CO₂
        </Text>
      </View>

      {/* Action Footer */}
      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.fromLabel, { color: theme.colors.textMuted }]}>from</Text>
          <Text style={[styles.priceHighlight, { color: theme.colors.brandYellow }]}>
            {formatCurrency(lowestPrice)}
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <BaseButton
            variant="outline"
            size="sm"
            title="Details"
            onPress={() => onPressDetails(journey)}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${journey.trainNumber}`}
            style={styles.detailsBtn}
            textStyle={[styles.detailsBtnText, { color: theme.colors.textPrimary }]}
          />

          <PlanButton
            isSaved={isSaved}
            isCancelled={isCancelled}
            trainNumber={journey.trainNumber}
            onPress={() => addTrainToTrip(journey, 'STANDARD')}
            labelMode="compact"
            size="sm"
            style={styles.planBtnContainer}
          />
        </View>
      </View>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  operatorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8,
  },
  operatorText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stationBlock: {
    flex: 1,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E293B',
  },
  cityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  stationName: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  platformText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  durationBlock: {
    flex: 1.1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  lineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  horizontalLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stopsText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginBottom: 12,
  },
  classChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fareChip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fareClass: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },
  farePrice: {
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '600',
  },
  co2Text: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fromLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  priceHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  planBtnContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
});
