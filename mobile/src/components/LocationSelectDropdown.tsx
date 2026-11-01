import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  FeaturedLocation,
  LocationType,
  getFeaturedLocationsForCity,
  getMajorRailHubsOutsideCity,
} from '../data/featuredLocations';
import { TransportMode } from './RouteFinderCard';

export interface LocationSelectDropdownProps {
  currentCity: string;
  field: 'origin' | 'destination';
  searchQuery?: string;
  selectedModes?: TransportMode[];
  recentChoices?: string[];
  isLocationActive?: boolean;
  onSelectLocation: (locationName: string, location?: FeaturedLocation) => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const getLocationTypeMeta = (
  type: LocationType,
  isDark: boolean
): { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } => {
  switch (type) {
    case 'STATION':
      return {
        label: 'TRAIN',
        icon: 'train-outline',
        color: isDark ? '#F87171' : '#DC2626',
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      };
    case 'METRO':
      return {
        label: 'METRO',
        icon: 'subway-outline',
        color: isDark ? '#38BDF8' : '#0284C7',
        bg: isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE',
      };
    case 'BUS_TRAM':
      return {
        label: 'BUS/TRAM',
        icon: 'bus-outline',
        color: isDark ? '#FBBF24' : '#D97706',
        bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      };
    case 'AIRPORT':
      return {
        label: 'AIRPORT',
        icon: 'airplane-outline',
        color: isDark ? '#C084FC' : '#7C3AED',
        bg: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F3E8FF',
      };
    case 'CURRENT_LOCATION':
    default:
      return {
        label: 'NEARBY',
        icon: 'navigate-outline',
        color: isDark ? '#34D399' : '#059669',
        bg: isDark ? 'rgba(5, 150, 105, 0.15)' : '#DCFCE7',
      };
  }
};

export const LocationSelectDropdown: React.FC<LocationSelectDropdownProps> = ({
  currentCity,
  field,
  searchQuery = '',
  selectedModes = ['Trains', 'Metro', 'Busses'],
  recentChoices = [],
  isLocationActive: _isLocationActive = false,
  onSelectLocation,
  onClose,
  style,
  testID = 'location-select-dropdown',
}) => {
  const { theme, isDark } = useTheme();

  // Determine if inner-city modes (Metro or Busses) are active without Trains
  const isInnercityOnly =
    (selectedModes.includes('Metro') || selectedModes.includes('Busses')) &&
    !selectedModes.includes('Trains');

  // Featured locations in current city
  const cityLocations = getFeaturedLocationsForCity(currentCity, {
    modes: selectedModes,
    query: searchQuery,
    prioritizeInnercity: isInnercityOnly,
  });

  // Major rail hubs outside current city (for destination or rail searches)
  const outsideHubs =
    field === 'destination' || selectedModes.includes('Trains')
      ? getMajorRailHubsOutsideCity(currentCity, searchQuery)
      : [];

  return (
    <View
      testID={testID}
      accessibilityRole="menu"
      accessibilityLabel={`Select ${field} location from ${currentCity}`}
      style={[
        styles.dropdownContainer,
        {
          backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
          borderColor: isDark ? theme.colors.brandHoneyDark : theme.colors.honeyBorder,
        },
        style,
      ]}
    >
      {/* Header bar */}
      <View style={styles.dropdownHeader}>
        <View style={styles.dropdownTitleGroup}>
          <Ionicons
            name="compass-outline"
            size={14}
            color={isDark ? theme.colors.brandHoney : '#92400E'}
          />
          <Text
            accessibilityRole="header"
            aria-level={4}
            style={[
              styles.dropdownTitle,
              { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
            ]}
          >
            {field === 'origin' ? 'Select Departure Location' : 'Select Destination Location'}
          </Text>
        </View>

        <Pressable
          testID="close-dropdown-btn"
          accessibilityRole="button"
          accessibilityLabel="Close location dropdown"
          onPress={onClose}
          hitSlop={8}
          style={styles.closeBtn}
        >
          <Ionicons
            name="close"
            size={18}
            color={isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.dropdownScroll}
        contentContainerStyle={styles.dropdownContent}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* 1. Current Location Option (for Origin) */}
        {field === 'origin' ? (
          <Pressable
            testID="dropdown-current-location-btn"
            accessibilityRole="button"
            accessibilityLabel={`Use My Current Location in ${currentCity}`}
            onPress={() =>
              onSelectLocation(`📍 My Current Location (${currentCity})`)
            }
            style={(state: any) => [
              styles.itemRow,
              {
                backgroundColor: state.pressed
                  ? isDark
                    ? '#292524'
                    : '#FEF3C7'
                  : state.hovered
                  ? isDark
                    ? '#292524'
                    : '#FFFBEB'
                  : 'transparent',
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7',
                },
              ]}
            >
              <Ionicons
                name="navigate"
                size={16}
                color={isDark ? '#34D399' : '#059669'}
              />
            </View>
            <View style={styles.itemTextContainer}>
              <View style={styles.itemTitleRow}>
                <Text
                  style={[
                    styles.itemTitle,
                    {
                      color: isDark ? '#34D399' : '#059669',
                      fontWeight: '700',
                    },
                  ]}
                >
                  📍 My Current Location
                </Text>
                <View
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(5, 150, 105, 0.15)'
                        : '#DCFCE7',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      { color: isDark ? '#34D399' : '#059669' },
                    ]}
                  >
                    GPS DETECTED
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.itemSubtitle,
                  {
                    color: isDark
                      ? theme.colors.textSecondary
                      : theme.colors.textCharcoalMuted,
                  },
                ]}
              >
                Depart directly from your detected coordinates in {currentCity}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* 2. Recent Choices Section (if any) */}
        {recentChoices.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="time-outline"
                size={12}
                color={isDark ? theme.colors.brandHoney : '#92400E'}
              />
              <Text
                style={[
                  styles.sectionHeaderText,
                  {
                    color: isDark
                      ? theme.colors.brandHoney
                      : theme.colors.textCharcoalMuted,
                  },
                ]}
              >
                RECENT SEARCHES
              </Text>
            </View>
            {recentChoices.map((choice, idx) => (
              <Pressable
                key={`recent-${idx}-${choice}`}
                testID={`dropdown-recent-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={`Recent choice: ${choice}`}
                onPress={() => onSelectLocation(choice)}
                style={(state: any) => [
                  styles.itemRow,
                  {
                    backgroundColor: state.pressed
                      ? isDark
                        ? '#292524'
                        : '#FEF3C7'
                      : state.hovered
                      ? isDark
                        ? '#292524'
                        : '#FFFBEB'
                      : 'transparent',
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isDark ? '#292524' : '#F3F4F6',
                    },
                  ]}
                >
                  <Ionicons
                    name="time"
                    size={14}
                    color={isDark ? '#F59E0B' : '#6B7280'}
                  />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                    ]}
                  >
                    {choice}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* 3. Featured in Current City */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="location"
              size={12}
              color={isDark ? theme.colors.brandHoney : '#92400E'}
            />
            <Text
              style={[
                styles.sectionHeaderText,
                {
                  color: isDark
                    ? theme.colors.brandHoney
                    : theme.colors.textCharcoalMuted,
                },
              ]}
            >
              FEATURED IN {currentCity.toUpperCase()} ({cityLocations.length})
            </Text>
          </View>

          {cityLocations.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                {
                  color: isDark
                    ? theme.colors.textSecondary
                    : theme.colors.textCharcoalMuted,
                },
              ]}
            >
              No locations match "{searchQuery}" in {currentCity}
            </Text>
          ) : (
            cityLocations.map((loc) => {
              const meta = getLocationTypeMeta(loc.type, isDark);
              return (
                <Pressable
                  key={loc.id}
                  testID={`dropdown-item-${loc.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${loc.name}, ${meta.label} in ${loc.city}. ${loc.description || ''}`}
                  onPress={() => onSelectLocation(loc.name, loc)}
                  style={(state: any) => [
                    styles.itemRow,
                    {
                      backgroundColor: state.pressed
                        ? isDark
                          ? '#292524'
                          : '#FEF3C7'
                        : state.hovered
                        ? isDark
                          ? '#292524'
                          : '#FFFBEB'
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.iconBadge, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={15} color={meta.color} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <View style={styles.itemTitleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: isDark ? '#FFFFFF' : theme.colors.textCharcoal,
                            fontWeight: loc.isMainHub ? '700' : '600',
                          },
                        ]}
                      >
                        {loc.name}
                      </Text>
                      <View
                        style={[styles.typeChip, { backgroundColor: meta.bg }]}
                      >
                        <Text
                          style={[styles.typeChipText, { color: meta.color }]}
                        >
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                    {loc.description ? (
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          styles.itemSubtitle,
                          {
                            color: isDark
                              ? theme.colors.textSecondary
                              : theme.colors.textCharcoalMuted,
                          },
                        ]}
                      >
                        {loc.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* 4. Outside Rail Hubs / Other Cities (when relevant) */}
        {outsideHubs.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="subway-outline"
                size={12}
                color={isDark ? theme.colors.brandHoney : '#92400E'}
              />
              <Text
                style={[
                  styles.sectionHeaderText,
                  {
                    color: isDark
                      ? theme.colors.brandHoney
                      : theme.colors.textCharcoalMuted,
                  },
                ]}
              >
                MAJOR HUBS IN OTHER ROMANIAN CITIES
              </Text>
            </View>

            {outsideHubs.map((loc) => {
              const meta = getLocationTypeMeta(loc.type, isDark);
              return (
                <Pressable
                  key={loc.id}
                  testID={`dropdown-outside-hub-${loc.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${loc.name} in ${loc.city}`}
                  onPress={() => onSelectLocation(loc.name, loc)}
                  style={(state: any) => [
                    styles.itemRow,
                    {
                      backgroundColor: state.pressed
                        ? isDark
                          ? '#292524'
                          : '#FEF3C7'
                        : state.hovered
                        ? isDark
                          ? '#292524'
                          : '#FFFBEB'
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.iconBadge, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={15} color={meta.color} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <View style={styles.itemTitleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: isDark ? '#FFFFFF' : theme.colors.textCharcoal,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {loc.name}
                      </Text>
                      <View
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: isDark ? '#292524' : '#F3F4F6',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            {
                              color: isDark ? '#F59E0B' : '#6B7280',
                            },
                          ]}
                        >
                          {loc.city.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 6,
    marginBottom: 8,
    maxHeight: 280,
    shadowColor: '#1C1917',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  dropdownTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
  },
  dropdownScroll: {
    maxHeight: 236,
  },
  dropdownContent: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  sectionBlock: {
    marginTop: 6,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    flexShrink: 1,
  },
  typeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  typeChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  itemSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
