import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseBadge } from './BaseBadge';
import { TransitLineSchedule, TransitMode } from '../types/schedule';

export interface TransitScheduleCardProps {
  schedule: TransitLineSchedule;
  onPress?: (schedule: TransitLineSchedule) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const getModeIconName = (mode: TransitMode): keyof typeof Ionicons.glyphMap => {
  switch (mode) {
    case 'METRO':
      return 'subway-outline';
    case 'TRAM':
      return 'train-outline';
    case 'BUS':
      return 'bus-outline';
    case 'TRAIN':
      return 'speedometer-outline';
    default:
      return 'navigate-outline';
  }
};

const getModeColor = (mode: TransitMode, isDark: boolean): string => {
  switch (mode) {
    case 'METRO':
      return isDark ? '#38BDF8' : '#0284C7'; // Sky
    case 'TRAM':
      return isDark ? '#34D399' : '#059669'; // Emerald
    case 'BUS':
      return isDark ? '#FBBF24' : '#D97706'; // Amber
    case 'TRAIN':
      return isDark ? '#F87171' : '#DC2626'; // Red
    default:
      return '#6B7280';
  }
};

export const TransitScheduleCard: React.FC<TransitScheduleCardProps> = ({
  schedule,
  onPress,
  style,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const [showStops, setShowStops] = useState(false);

  const modeColor = getModeColor(schedule.mode, isDark);
  const cardTestId = testID || `transit-schedule-card-${schedule.id}`;

  return (
    <BaseCard
      variant="outlined"
      padding="md"
      testID={cardTestId}
      onPress={onPress ? () => onPress(schedule) : undefined}
      accessibilityLabel={`${schedule.lineCode} ${schedule.lineName}, ${schedule.provider.shortName}, Fare ${schedule.fareLei.toFixed(2)} lei`}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
          borderColor: isDark ? '#3E3204' : theme.colors.honeyBorder,
        },
        style,
      ]}
    >
      {/* 1. Header Row: Mode Icon + Line Code Badge + Provider & City */}
      <View style={styles.headerRow}>
        <View style={styles.lineIdentityGroup}>
          <View
            style={[
              styles.modeIconBox,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                borderColor: modeColor,
              },
            ]}
          >
            <Ionicons name={getModeIconName(schedule.mode)} size={18} color={modeColor} />
          </View>
          <View style={styles.codeAndName}>
            <View style={styles.codeRow}>
              <Text
                style={[
                  styles.lineCodeText,
                  { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                ]}
              >
                {schedule.lineCode}
              </Text>
              <BaseBadge
                label={schedule.mode}
                variant="default"
                size="sm"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                  borderColor: isDark ? '#3F3F46' : '#E2E8F0',
                }}
                textStyle={{
                  color: isDark ? '#E4E4E7' : '#475569',
                  fontSize: 10,
                  fontWeight: '700',
                }}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.lineNameText,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              {schedule.lineName}
            </Text>
          </View>
        </View>

        {/* Provider and City Tag */}
        <View style={styles.providerTagGroup}>
          <Text
            style={[
              styles.providerText,
              { color: isDark ? theme.colors.brandHoney : '#92400E' },
            ]}
          >
            {schedule.provider.shortName}
          </Text>
          <Text
            style={[
              styles.cityText,
              { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
            ]}
          >
            📍 {schedule.city}
          </Text>
        </View>
      </View>

      {/* 2. Route Connection Row */}
      <View style={styles.routeRow}>
        <Text
          numberOfLines={1}
          style={[
            styles.stationText,
            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
          ]}
        >
          {schedule.origin}
        </Text>
        <View style={styles.arrowContainer}>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={isDark ? theme.colors.brandHoney : '#92400E'}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.stationText,
            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
          ]}
        >
          {schedule.destination}
        </Text>
      </View>

      {/* 3. Next Departures Chips */}
      <View style={styles.departuresContainer}>
        <Text
          style={[
            styles.departuresLabel,
            { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
          ]}
        >
          Next departures:
        </Text>
        <View style={styles.departurePillsRow}>
          {schedule.nextDepartures.map((dep, idx) => (
            <View
              key={`${dep.time}-${idx}`}
              testID={`departure-pill-${idx}`}
              style={[
                styles.departurePill,
                {
                  backgroundColor: idx === 0
                    ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7')
                    : (isDark ? '#292524' : '#F4F4F5'),
                  borderColor: idx === 0
                    ? (isDark ? theme.colors.brandHoney : '#FDE68A')
                    : (isDark ? '#3F3F46' : '#E4E4E7'),
                },
              ]}
            >
              {dep.isLiveTracking && (
                <View style={styles.livePulseDot} testID="live-tracking-dot" />
              )}
              <Text
                style={[
                  styles.depTimeText,
                  {
                    color: idx === 0
                      ? (isDark ? theme.colors.brandHoney : '#92400E')
                      : (isDark ? '#FFFFFF' : theme.colors.textCharcoal),
                    fontWeight: idx === 0 ? '800' : '600',
                  },
                ]}
              >
                {dep.time}
              </Text>
              <Text
                style={[
                  styles.depCountdownText,
                  {
                    color: idx === 0
                      ? (isDark ? theme.colors.brandHoney : '#92400E')
                      : (isDark ? theme.colors.textSecondary : '#71717A'),
                  },
                ]}
              >
                (in {dep.minutesUntil}m)
              </Text>
              {dep.platform && (
                <Text
                  style={[
                    styles.platformText,
                    { color: isDark ? '#A1A1AA' : '#64748B' },
                  ]}
                >
                  • {dep.platform}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 4. Footer Row: Frequency, Fare & Status */}
      <View style={styles.footerRow}>
        <View style={styles.footerMetaLeft}>
          {schedule.frequencyDescription && (
            <Text
              style={[
                styles.frequencyText,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              ⏱️ {schedule.frequencyDescription}
            </Text>
          )}
          <Text
            style={[
              styles.fareText,
              { color: isDark ? theme.colors.brandHoney : '#92400E' },
            ]}
          >
            🎟️ {schedule.fareLei.toFixed(2)} LEI
          </Text>
        </View>

        <View style={styles.footerMetaRight}>
          {schedule.viaStops && schedule.viaStops.length > 0 && (
            <TouchableOpacity
              testID={`toggle-stops-btn-${schedule.id}`}
              onPress={() => setShowStops(!showStops)}
              style={styles.stopsToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  styles.stopsToggleText,
                  { color: isDark ? theme.colors.brandHoney : '#92400E' },
                ]}
              >
                {showStops ? 'Hide stops ▴' : `${schedule.viaStops.length} stops ▾`}
              </Text>
            </TouchableOpacity>
          )}
          <BaseBadge
            label={schedule.status === 'ON_TIME' ? 'ON TIME' : schedule.status}
            variant={schedule.status === 'ON_TIME' ? 'success' : 'warning'}
            size="sm"
          />
        </View>
      </View>

      {/* 5. Expandable Stopover Timeline */}
      {showStops && schedule.viaStops && (
        <View
          testID={`stops-list-container-${schedule.id}`}
          style={[
            styles.stopsContainer,
            {
              borderTopColor: isDark ? '#292524' : '#FDE68A',
              backgroundColor: isDark ? '#14110F' : '#FFFDF7',
            },
          ]}
        >
          <Text
            style={[
              styles.stopsHeader,
              { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
            ]}
          >
            Key Stations & Stops:
          </Text>
          <View style={styles.stopsChipsRow}>
            {schedule.viaStops.map((stop, sIdx) => (
              <View
                key={`${stop}-${sIdx}`}
                style={[
                  styles.stopPill,
                  {
                    backgroundColor: isDark ? '#292524' : '#FEF3C7',
                    borderColor: isDark ? '#3E3204' : '#FDE68A',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stopPillText,
                    { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                  ]}
                >
                  {sIdx + 1}. {stop}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  lineIdentityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  codeAndName: {
    flexDirection: 'column',
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineCodeText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  lineNameText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 1,
  },
  providerTagGroup: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  cityText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  stationText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    flexShrink: 1,
  },
  arrowContainer: {
    flexShrink: 0,
  },
  departuresContainer: {
    marginBottom: 10,
  },
  departuresLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 4,
  },
  departurePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  departurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E', // Green live pulse
  },
  depTimeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  depCountdownText: {
    fontSize: 11,
    lineHeight: 15,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.12)',
  },
  footerMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  fareText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  footerMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopsToggle: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stopsToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stopsContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderTopWidth: 1,
  },
  stopsHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  stopsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  stopPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stopPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
