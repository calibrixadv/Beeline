import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransitRoutePlan, CuratedPillar } from '../types/routePlan';
import { useTheme } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';
import { MascotBee } from './MascotBee';

export interface BookingTripCardProps {
  /** The transit route plan data representing this trip option */
  plan: TransitRoutePlan;
  /** Callback triggered when user clicks to book/add trip */
  onBookTrip?: (plan: TransitRoutePlan) => void;
  /** Callback triggered when user clicks to remove booked trip */
  onRemoveTrip?: (planId: string) => void;
  /** Whether this trip is currently booked in TripContext */
  isBooked?: boolean;
  /** Optional initial expanded state for leg-by-leg timeline */
  defaultExpanded?: boolean;
  /** Custom container style override */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

/**
 * Returns icon name corresponding to transit mode
 */
export function getModeIcon(
  mode: string
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (mode) {
    case 'TRAIN':
      return 'train-outline';
    case 'METRO':
      return 'subway-outline';
    case 'TRAM':
      return 'trail-sign-outline';
    case 'BUS':
      return 'bus-outline';
    case 'WALK':
      return 'walk-outline';
    default:
      return 'navigate-outline';
  }
}

/**
 * Format ISO datetime string to HH:MM format
 */
export function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(11, 16) || '--:--';
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoString.slice(11, 16) || '--:--';
  }
}

export const BookingTripCard: React.FC<BookingTripCardProps> = ({
  plan,
  onBookTrip,
  onRemoveTrip,
  isBooked = false,
  defaultExpanded = false,
  style,
  testID = `booking-trip-card-${plan.id}`,
}) => {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [expandedLegStops, setExpandedLegStops] = useState<Record<string, boolean>>({});

  const toggleLegStops = (legId: string) => {
    setExpandedLegStops((prev) => ({
      ...prev,
      [legId]: !prev[legId],
    }));
  };

  const hours = Math.floor(plan.totalDurationMinutes / 60);
  const mins = plan.totalDurationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  // Curated pillar badge styling
  const getPillarBadge = (pillar: CuratedPillar) => {
    switch (pillar) {
      case 'FASTEST':
        return {
          label: '⚡ FASTEST',
          variant: 'warning' as const,
          bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          color: isDark ? theme.colors.brandHoney : '#92400E',
          mascot: <MascotBee name="barnaby" size="sm" animated={false} />,
        };
      case 'BEST_VALUE':
        return {
          label: '💰 BEST VALUE',
          variant: 'success' as const,
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
          color: isDark ? '#34D399' : '#166534',
          mascot: <MascotBee name="honey" size="sm" animated={false} />,
        };
      case 'MOST_RELIABLE':
        return {
          label: '🛡️ MOST RELIABLE',
          variant: 'info' as const,
          bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
          color: isDark ? '#60A5FA' : '#1E40AF',
          mascot: <MascotBee name="bumble" size="sm" animated={false} />,
        };
      case 'ECO_HERO':
        return {
          label: '🌿 ECO HERO',
          variant: 'success' as const,
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          color: isDark ? '#34D399' : '#065F46',
          mascot: <MascotBee name="honey" size="sm" animated={false} />,
        };
      default:
        return {
          label: 'RECOMMENDED',
          variant: 'neutral' as const,
          bg: isDark ? '#292524' : '#F3F4F6',
          color: isDark ? '#FFFFFF' : '#374151',
          mascot: null,
        };
    }
  };

  const pillarBadge = getPillarBadge(plan.curatedPillar);

  // Distinct operators across all legs
  const uniqueOperators = Array.from(
    new Set(plan.legs.map((l) => l.names.operatorShortName || l.names.operatorName || 'Transit'))
  );

  return (
    <BaseCard
      variant="elevated"
      padding="none"
      testID={testID}
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
          borderColor: isBooked
            ? theme.colors.brandHoney
            : isDark
            ? theme.colors.honeyBorder
            : '#E5E7EB',
        },
        isBooked && styles.cardBooked,
        style,
      ]}
    >
      {/* Top Banner Ribbon */}
      <View
        style={[
          styles.topRibbon,
          {
            backgroundColor: isDark ? '#292524' : '#FFFDF7',
            borderBottomColor: isDark ? '#3E3835' : '#F1EAD9',
          },
        ]}
      >
        <View style={styles.ribbonLeft}>
          {pillarBadge.mascot}
          <BaseBadge
            label={pillarBadge.label}
            variant={pillarBadge.variant}
            size="sm"
            style={{ backgroundColor: pillarBadge.bg, borderWidth: 1, borderColor: pillarBadge.bg }}
            textStyle={{ color: pillarBadge.color, fontWeight: '800' }}
            testID={`pillar-badge-${plan.id}`}
          />
        </View>

        {/* Romanian Transfer Shield Risk Indicator */}
        <View
          style={[
            styles.shieldBadge,
            {
              backgroundColor:
                plan.riskAnalysis.riskLevel === 'LOW'
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.15)'
                    : '#ECFDF5'
                  : isDark
                  ? 'rgba(245, 158, 11, 0.15)'
                  : '#FFFBEB',
              borderColor:
                plan.riskAnalysis.riskLevel === 'LOW'
                  ? isDark
                    ? '#059669'
                    : '#A7F3D0'
                  : isDark
                  ? '#D97706'
                  : '#FDE68A',
            },
          ]}
          testID={`shield-risk-badge-${plan.id}`}
        >
          <Ionicons
            name="shield-checkmark"
            size={13}
            color={plan.riskAnalysis.riskLevel === 'LOW' ? '#10B981' : '#F59E0B'}
          />
          <Text
            style={[
              styles.shieldBadgeText,
              {
                color:
                  plan.riskAnalysis.riskLevel === 'LOW'
                    ? isDark
                      ? '#34D399'
                      : '#065F46'
                    : isDark
                    ? '#FBBF24'
                    : '#92400E',
              },
            ]}
          >
            {plan.transfersCount === 0
              ? 'Shield: Direct Route (0 Transfers)'
              : `Shield Risk: ${plan.riskAnalysis.overallRiskScore}/100 (${plan.riskAnalysis.riskLevel})`}
          </Text>
        </View>
      </View>

      {/* Main Booking Summary Area */}
      <View style={styles.cardBody}>
        {/* Row 1: Time, Duration & Transfer Summary */}
        <View style={styles.itineraryRow}>
          {/* Departure */}
          <View style={styles.timeBlock}>
            <Text
              style={[styles.timeText, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
              testID={`departure-time-${plan.id}`}
            >
              {formatTime(plan.departureTime)}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.stationText,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              {plan.query.origin.name}
            </Text>
          </View>

          {/* Journey Path Visual */}
          <View style={styles.journeyPathBlock}>
            <Text
              style={[
                styles.durationText,
                { color: isDark ? theme.colors.brandHoney : '#92400E' },
              ]}
              testID={`duration-text-${plan.id}`}
            >
              {durationText}
            </Text>
            <View style={styles.pathLineWrapper}>
              <View style={[styles.pathLine, { backgroundColor: theme.colors.honeyBorder }]} />
              <Ionicons
                name="chevron-forward"
                size={14}
                color={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
                style={styles.pathIcon}
              />
            </View>
            <Text
              style={[
                styles.transfersText,
                {
                  color:
                    plan.transfersCount === 0
                      ? isDark
                        ? '#34D399'
                        : '#059669'
                      : isDark
                      ? theme.colors.textSecondary
                      : theme.colors.textCharcoalMuted,
                  fontWeight: plan.transfersCount === 0 ? '700' : '500',
                },
              ]}
              testID={`transfers-count-${plan.id}`}
            >
              {plan.transfersCount === 0
                ? 'Direct'
                : `${plan.transfersCount} ${plan.transfersCount === 1 ? 'transfer' : 'transfers'}`}
            </Text>
          </View>

          {/* Arrival */}
          <View style={[styles.timeBlock, styles.timeBlockRight]}>
            <Text
              style={[styles.timeText, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
              testID={`arrival-time-${plan.id}`}
            >
              {formatTime(plan.arrivalTime)}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.stationText,
                styles.stationTextRight,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              {plan.query.destination.name}
            </Text>
          </View>
        </View>

        {/* Row 2: Providers & Transport Modes */}
        <View style={styles.metaRow}>
          <View style={styles.operatorsWrap}>
            {uniqueOperators.map((operatorName) => (
              <View
                key={operatorName}
                style={[
                  styles.operatorChip,
                  {
                    backgroundColor: isDark ? '#292524' : '#FEF3C7',
                    borderColor: isDark ? '#44403C' : '#FDE68A',
                  },
                ]}
                testID={`operator-badge-${operatorName.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Ionicons
                  name="shield-outline"
                  size={11}
                  color={isDark ? theme.colors.brandHoney : '#92400E'}
                />
                <Text
                  style={[
                    styles.operatorChipText,
                    { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                  ]}
                >
                  {operatorName}
                </Text>
              </View>
            ))}
          </View>

          {/* Mode Icons */}
          <View style={styles.modesRow}>
            {plan.legs.map((leg) => (
              <View
                key={leg.id}
                style={[
                  styles.modeMiniBadge,
                  { backgroundColor: isDark ? '#292524' : '#F3F4F6' },
                ]}
              >
                <Ionicons
                  name={getModeIcon(leg.transportType)}
                  size={12}
                  color={isDark ? theme.colors.brandHoney : theme.colors.textCharcoal}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Row 3: Price & Primary Action CTAs */}
        <View
          style={[
            styles.pricingCtaRow,
            { borderTopColor: isDark ? '#292524' : '#F3F4F6' },
          ]}
        >
          {/* Dual Currency Fare Box */}
          <View style={styles.priceContainer} testID={`price-container-${plan.id}`}>
            <View style={styles.pricePrimaryRow}>
              <Text
                style={[
                  styles.priceLei,
                  { color: isDark ? theme.colors.brandHoney : '#B45309' },
                ]}
              >
                {plan.fare.totalAmountLei.toFixed(2)} LEI
              </Text>
            </View>
            <Text
              style={[
                styles.priceEur,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              approx. €{plan.fare.totalAmountEur.toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons: Expand Toggle & Book Trip */}
          <View style={styles.buttonsGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? 'Hide journey breakdown' : 'View full journey breakdown'}
              onPress={() => setIsExpanded((prev) => !prev)}
              style={[
                styles.expandBtn,
                {
                  backgroundColor: isDark ? '#292524' : '#FEF3C7',
                  borderColor: theme.colors.honeyBorder,
                },
              ]}
              testID={`toggle-details-btn-${plan.id}`}
            >
              <Text
                style={[
                  styles.expandBtnText,
                  { color: isDark ? theme.colors.brandHoney : '#92400E' },
                ]}
              >
                {isExpanded ? 'Hide Details' : 'View Details'}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={isDark ? theme.colors.brandHoney : '#92400E'}
              />
            </Pressable>

            {isBooked ? (
              <View style={styles.bookedActionWrap}>
                <BaseButton
                  variant="secondary"
                  size="sm"
                  title="In Trip ✓"
                  iconLeft={<Ionicons name="checkmark-circle" size={14} color="#10B981" />}
                  onPress={() => onRemoveTrip?.(plan.id)}
                  testID={`remove-trip-btn-${plan.id}`}
                  accessibilityLabel="Remove from active trip itinerary"
                  style={styles.bookedBtn}
                />
              </View>
            ) : (
              <BaseButton
                variant="primary"
                size="sm"
                title="Book Trip"
                iconRight={<Ionicons name="cart-outline" size={14} color="#1C1917" />}
                onPress={() => onBookTrip?.(plan)}
                testID={`book-trip-btn-${plan.id}`}
                accessibilityLabel={`Book trip for ${plan.fare.totalAmountLei} LEI`}
                style={[
                  styles.bookBtn,
                  {
                    backgroundColor: theme.colors.brandHoney,
                    borderColor: theme.colors.brandHoneyDark,
                  },
                ]}
                textStyle={{ color: '#1C1917', fontWeight: '800' }}
              />
            )}
          </View>
        </View>

        {/* Expanded Leg-By-Leg Timeline Breakdown */}
        {isExpanded ? (
          <View
            style={[
              styles.expandedSection,
              {
                backgroundColor: isDark ? '#141312' : '#FFFDF7',
                borderColor: isDark ? '#292524' : '#FDE68A',
              },
            ]}
            testID={`trip-legs-timeline-${plan.id}`}
          >
            {/* Mascot Advice Note */}
            <View
              style={[
                styles.mascotAdviceBox,
                {
                  backgroundColor: isDark ? '#292524' : '#FEF3C7',
                  borderColor: theme.colors.honeyBorder,
                },
              ]}
              testID={`mascot-advice-${plan.id}`}
            >
              <Ionicons
                name="bulb-outline"
                size={16}
                color={isDark ? theme.colors.brandHoney : '#92400E'}
              />
              <Text
                style={[
                  styles.mascotAdviceText,
                  { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                ]}
              >
                {plan.mascotRecommendation.advice}
              </Text>
            </View>

            {/* Step-by-Step Leg Cards */}
            <Text
              style={[
                styles.timelineTitle,
                { color: isDark ? theme.colors.brandHoney : '#92400E' },
              ]}
            >
              STEP-BY-STEP ITINERARY
            </Text>

            {plan.legs.map((leg, index) => {
              const isStopsOpen = !!expandedLegStops[leg.id];
              const stopsCount = leg.coords.intermediateStops.length;

              return (
                <View key={leg.id} style={styles.legTimelineItem}>
                  {/* Left Rail with Mode Dot & Line */}
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: theme.colors.brandHoney,
                          borderColor: isDark ? '#1C1917' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Ionicons name={getModeIcon(leg.transportType)} size={11} color="#1C1917" />
                    </View>
                    {index < plan.legs.length - 1 && (
                      <View
                        style={[
                          styles.timelineConnector,
                          { backgroundColor: theme.colors.honeyBorder },
                        ]}
                      />
                    )}
                  </View>

                  {/* Leg Content Box */}
                  <View
                    style={[
                      styles.legContentBox,
                      {
                        backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
                        borderColor: isDark ? '#292524' : '#E5E7EB',
                      },
                    ]}
                  >
                    {/* Leg Header: Operator & Line */}
                    <View style={styles.legHeaderRow}>
                      <View style={styles.legLineGroup}>
                        <Text
                          style={[
                            styles.legLineCode,
                            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                          ]}
                        >
                          {leg.names.lineCode || leg.transportType}
                        </Text>
                        <Text
                          style={[
                            styles.legOperatorName,
                            { color: isDark ? theme.colors.brandHoney : '#92400E' },
                          ]}
                        >
                          {leg.names.operatorName || leg.names.operatorShortName}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.legFareTag,
                          { color: isDark ? '#34D399' : '#059669' },
                        ]}
                      >
                        {leg.fare.amount.toFixed(2)} {leg.fare.currency}
                      </Text>
                    </View>

                    {/* Departure & Arrival stations */}
                    <View style={styles.legStationsRow}>
                      <View style={styles.stationBlock}>
                        <Text
                          style={[
                            styles.stationTimeText,
                            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                          ]}
                        >
                          {formatTime(leg.timings.scheduledDeparture)}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.stationNameText,
                            {
                              color: isDark
                                ? theme.colors.textSecondary
                                : theme.colors.textCharcoalMuted,
                            },
                          ]}
                        >
                          {leg.names.originName}
                        </Text>
                      </View>
                      <Ionicons
                        name="arrow-forward"
                        size={12}
                        color={isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted}
                        style={{ marginHorizontal: 8 }}
                      />
                      <View style={styles.stationBlock}>
                        <Text
                          style={[
                            styles.stationTimeText,
                            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                          ]}
                        >
                          {formatTime(leg.timings.scheduledArrival)}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.stationNameText,
                            {
                              color: isDark
                                ? theme.colors.textSecondary
                                : theme.colors.textCharcoalMuted,
                            },
                          ]}
                        >
                          {leg.names.destinationName}
                        </Text>
                      </View>
                    </View>

                    {/* Lead instruction */}
                    {leg.instructions.leadText ? (
                      <Text
                        style={[
                          styles.instructionText,
                          {
                            color: isDark
                              ? theme.colors.textSecondary
                              : theme.colors.textCharcoalMuted,
                          },
                        ]}
                      >
                        {leg.instructions.leadText}
                      </Text>
                    ) : null}

                    {/* Intermediate Stopovers Accordion */}
                    {stopsCount > 0 ? (
                      <View style={styles.stopoversContainer}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Toggle ${stopsCount} stopovers`}
                          onPress={() => toggleLegStops(leg.id)}
                          style={styles.stopoversToggle}
                          testID={`toggle-stops-leg-${leg.id}`}
                        >
                          <Ionicons
                            name={isStopsOpen ? 'chevron-up-circle' : 'chevron-down-circle'}
                            size={14}
                            color={isDark ? theme.colors.brandHoney : '#92400E'}
                          />
                          <Text
                            style={[
                              styles.stopoversToggleText,
                              { color: isDark ? theme.colors.brandHoney : '#92400E' },
                            ]}
                          >
                            {isStopsOpen
                              ? `Hide ${stopsCount} intermediate stops`
                              : `Show ${stopsCount} intermediate stops`}
                          </Text>
                        </Pressable>

                        {isStopsOpen ? (
                          <View
                            style={[
                              styles.stopoversList,
                              { backgroundColor: isDark ? '#292524' : '#F9FAFB' },
                            ]}
                            testID={`stops-list-leg-${leg.id}`}
                          >
                            {leg.coords.intermediateStops.map((stop) => (
                              <View key={stop.stopSequence} style={styles.stopoverRow}>
                                <View
                                  style={[
                                    styles.stopoverBullet,
                                    { backgroundColor: theme.colors.honeyBorder },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.stopoverName,
                                    { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                                  ]}
                                >
                                  {stop.name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Transfer Shield Buffer Indicator */}
                    {leg.risk.transferBufferAfterMinutes !== undefined ? (
                      <View
                        style={[
                          styles.transferBufferBanner,
                          {
                            backgroundColor:
                              leg.risk.transferBufferAfterMinutes >= 25
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : '#DCFCE7'
                                : isDark
                                ? 'rgba(245, 158, 11, 0.15)'
                                : '#FEF3C7',
                            borderColor:
                              leg.risk.transferBufferAfterMinutes >= 25 ? '#10B981' : '#F59E0B',
                          },
                        ]}
                        testID={`transfer-buffer-badge-${leg.id}`}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={13}
                          color={leg.risk.transferBufferAfterMinutes >= 25 ? '#10B981' : '#F59E0B'}
                        />
                        <Text
                          style={[
                            styles.transferBufferText,
                            {
                              color:
                                leg.risk.transferBufferAfterMinutes >= 25
                                  ? isDark
                                    ? '#34D399'
                                    : '#166534'
                                  : isDark
                                  ? '#FBBF24'
                                  : '#92400E',
                            },
                          ]}
                        >
                          Romanian Transfer Shield: {leg.risk.transferBufferAfterMinutes} min transfer
                          buffer at {leg.names.destinationName}
                          {leg.risk.transferBufferAfterMinutes >= 25
                            ? ' • Protected against transit delays'
                            : ' • Tight buffer'}
                        </Text>
                      </View>
                    ) : null}

                    {/* Leg Amenities Pills */}
                    {leg.amenities.items.length > 0 ? (
                      <View style={styles.amenitiesRow}>
                        {leg.amenities.items.map((amenity) => (
                          <View
                            key={amenity}
                            style={[
                              styles.amenityChip,
                              { backgroundColor: isDark ? '#292524' : '#F3F4F6' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.amenityChipText,
                                {
                                  color: isDark
                                    ? theme.colors.textSecondary
                                    : theme.colors.textCharcoalMuted,
                                },
                              ]}
                            >
                              {amenity.replace(/_/g, ' ')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {/* Eco Savings Benchmark Footer */}
            <View
              style={[
                styles.ecoFooter,
                {
                  backgroundColor: isDark ? '#1C1917' : '#F0FDF4',
                  borderColor: isDark ? '#065F46' : '#BBF7D0',
                },
              ]}
              testID={`eco-savings-box-${plan.id}`}
            >
              <Ionicons name="leaf" size={16} color="#10B981" />
              <Text
                style={[
                  styles.ecoFooterText,
                  { color: isDark ? '#34D399' : '#166534' },
                ]}
              >
                🌿 Saves {plan.eco.savedKgCO2.toFixed(1)} kg CO₂ ({plan.eco.percentageSaved.toFixed(0)}%
                less emissions than driving by car).
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
      },
      default: {},
    }),
  },
  cardBooked: {
    borderWidth: 2,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  topRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  ribbonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  shieldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  itineraryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeBlock: {
    flex: 1,
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  stationText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  stationTextRight: {
    textAlign: 'right',
  },
  journeyPathBlock: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  pathLineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  pathLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  pathIcon: {
    marginLeft: -4,
  },
  transfersText: {
    fontSize: 11,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
    flexWrap: 'wrap',
  },
  operatorsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  operatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  operatorChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  modeMiniBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pricingCtaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
    flexWrap: 'wrap',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  pricePrimaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLei: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  priceEur: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  buttonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bookBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bookedActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookedBtn: {
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  expandedSection: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  mascotAdviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  mascotAdviceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  legTimelineItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelineRail: {
    width: 28,
    alignItems: 'center',
    marginRight: 8,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  legContentBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  legHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  legLineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legLineCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  legOperatorName: {
    fontSize: 12,
    fontWeight: '600',
  },
  legFareTag: {
    fontSize: 13,
    fontWeight: '800',
  },
  legStationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  stationBlock: {
    flex: 1,
  },
  stationTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stationNameText: {
    fontSize: 12,
  },
  instructionText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  stopoversContainer: {
    marginTop: 8,
  },
  stopoversToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  stopoversToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stopoversList: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  stopoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopoverBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stopoverName: {
    fontSize: 12,
    fontWeight: '500',
  },
  transferBufferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  transferBufferText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  amenityChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  amenityChipText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ecoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  ecoFooterText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
