import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrainClass, TrainJourney } from '../types/train';
import { StatusBadge } from './StatusBadge';
import { AmenityIcon } from './AmenityIcon';
import { IconButton } from './IconButton';
import { BaseButton } from './BaseButton';
import { PlanButton } from './PlanButton';
import { formatCurrency } from '../utils/trainFilters';
import { useTripPlanner } from '../context/TripContext';
import { useTheme } from '../context/ThemeContext';

interface TrainDetailModalProps {
  journey: TrainJourney | null;
  visible: boolean;
  onClose: () => void;
}

export const TrainDetailModal: React.FC<TrainDetailModalProps> = ({
  journey,
  visible,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const { isTrainInTrip, addTrainToTrip } = useTripPlanner();

  if (!journey) return null;

  const isSaved = isTrainInTrip(journey.id);
  const isCancelled = journey.status === 'CANCELLED';

  const handleSelectFare = (classType: TrainClass) => {
    addTrainToTrip(journey, classType);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="train-detail-modal"
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.cardBg }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <View>
              <Text style={[styles.trainTitle, { color: theme.colors.textPrimary }]}>
                {journey.trainNumber}
              </Text>
              <Text style={[styles.operatorSubtitle, { color: theme.colors.textSecondary }]}>
                {journey.operator}
              </Text>
            </View>
            <IconButton
              iconName="close"
              iconSize={24}
              iconColor={theme.colors.textSecondary}
              onPress={onClose}
              accessibilityLabel="Close train details"
              style={styles.closeBtn}
            />
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Status & Carbon footprint */}
            <View style={styles.statusRow}>
              <StatusBadge status={journey.status} delayMinutes={journey.delayMinutes} />
              <View style={styles.greenBanner}>
                <Ionicons name="leaf" size={14} color="#166534" />
                <Text style={styles.greenBannerText}>
                  {journey.carbonFootprintKg} kg CO₂ (~85% cleaner than flying)
                </Text>
              </View>
            </View>

            {/* Route Stops Itinerary */}
            <Text style={[styles.sectionHeader, { color: theme.colors.textPrimary }]}>
              Itinerary & Stops
            </Text>
            <View
              style={[
                styles.itineraryBox,
                {
                  backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F8FAFC',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {journey.stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === journey.stops.length - 1;

                return (
                  <View key={`${stop.station.code}-${stop.stopNumber}`} style={styles.stopRow}>
                    <View style={styles.timeColumn}>
                      <Text style={[styles.stopTime, { color: theme.colors.textPrimary }]}>
                        {stop.scheduledDeparture || stop.scheduledArrival}
                      </Text>
                      {stop.actualDeparture && stop.actualDeparture !== stop.scheduledDeparture ? (
                        <Text style={styles.delaySubText}>exp. {stop.actualDeparture}</Text>
                      ) : null}
                      {stop.actualArrival && stop.actualArrival !== stop.scheduledArrival ? (
                        <Text style={styles.delaySubText}>exp. {stop.actualArrival}</Text>
                      ) : null}
                    </View>

                    <View style={styles.timelineColumn}>
                      <View
                        style={[
                          styles.timelineNode,
                          (isFirst || isLast) && [
                            styles.timelineNodeTerminal,
                            { backgroundColor: theme.colors.brandYellow },
                          ],
                        ]}
                      />
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineBar,
                            { backgroundColor: isDark ? theme.colors.border : '#CBD5E1' },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stationInfoColumn}>
                      <Text style={[styles.stopCityName, { color: theme.colors.textPrimary }]}>
                        {stop.station.city}
                      </Text>
                      <Text style={[styles.stopStationName, { color: theme.colors.textMuted }]}>
                        {stop.station.name}
                      </Text>
                      {stop.platform ? (
                        <Text style={[styles.stopPlatform, { color: theme.colors.textSecondary }]}>
                          Platform: {stop.platform}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Onboard Amenities */}
            <Text style={[styles.sectionHeader, { color: theme.colors.textPrimary }]}>
              Onboard Amenities
            </Text>
            <View style={styles.amenitiesGrid}>
              {journey.amenities.map((amenity) => (
                <AmenityIcon key={amenity} amenity={amenity} />
              ))}
            </View>

            {/* Available Classes & Pricing */}
            <Text style={[styles.sectionHeader, { color: theme.colors.textPrimary }]}>
              Fares & Classes
            </Text>
            <View style={styles.fareList}>
              {journey.fares.map((fare) => {
                const isUnavailable = isCancelled || fare.seatsAvailable === 0;
                return (
                  <View
                    key={fare.classType}
                    style={[
                      styles.fareRow,
                      {
                        borderBottomColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View>
                      <Text style={[styles.fareClassTitle, { color: theme.colors.textPrimary }]}>
                        {fare.classType} CLASS
                      </Text>
                      <Text style={[styles.seatsLeft, { color: theme.colors.textSecondary }]}>
                        {fare.seatsAvailable > 0
                          ? `${fare.seatsAvailable} seats remaining`
                          : 'Sold out'}
                      </Text>
                    </View>
                    <View style={styles.fareRight}>
                      <Text
                        style={[styles.farePriceText, { color: theme.colors.brandYellow }]}
                      >
                        {formatCurrency(fare.price, fare.currency)}
                      </Text>
                      <BaseButton
                        variant={isUnavailable ? 'surface' : 'primary'}
                        size="sm"
                        title={isCancelled ? 'N/A' : 'Select'}
                        disabled={isUnavailable}
                        onPress={() => handleSelectFare(fare.classType)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${fare.classType} class for ${formatCurrency(
                          fare.price,
                          fare.currency
                        )}`}
                        style={[
                          styles.selectClassBtn,
                          isUnavailable && styles.selectClassBtnDisabled,
                        ]}
                        textStyle={styles.selectClassBtnText}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
            <PlanButton
              isSaved={isSaved}
              isCancelled={isCancelled}
              trainNumber={journey.trainNumber}
              onPress={() => addTrainToTrip(journey, 'STANDARD')}
              labelMode="full"
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  trainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  operatorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  greenBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 14,
    marginBottom: 10,
  },
  itineraryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timeColumn: {
    width: 60,
    alignItems: 'flex-start',
  },
  stopTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  delaySubText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
    marginTop: 3,
  },
  timelineNodeTerminal: {
    backgroundColor: '#2563EB',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineBar: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  stationInfoColumn: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 12,
  },
  stopCityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopStationName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  stopPlatform: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fareList: {
    gap: 10,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fareClassTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  seatsLeft: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fareRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  farePriceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectClassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectClassBtnDisabled: {
    backgroundColor: '#CBD5E1',
    borderColor: '#CBD5E1',
  },
  selectClassBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
