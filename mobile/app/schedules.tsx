import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { CozyHoneyBackground } from '../src/components/CozyHoneyBackground';
import { TransitScheduleCard } from '../src/components/TransitScheduleCard';
import { SearchInput } from '../src/components/SearchInput';
import { BaseBadge } from '../src/components/BaseBadge';
import { BaseButton } from '../src/components/BaseButton';
import {
  TransitMode,
  ScheduleSection,
} from '../src/types/schedule';
import { transitScheduleService } from '../src/services/transitScheduleService';

export interface SchedulesScreenProps {
  animated?: boolean;
}

export default function SchedulesScreen({
  animated = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ? false : true,
}: SchedulesScreenProps = {}) {
  const { theme, isDark } = useTheme();

  // State
  const [section, setSection] = useState<ScheduleSection>('URBAN');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<TransitMode | 'ALL'>('ALL');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [detectedLocationMessage, setDetectedLocationMessage] = useState<string | null>(null);

  // Derive schedules synchronously from the template service
  const schedules = useMemo(() => {
    const modes: TransitMode[] | undefined =
      selectedMode !== 'ALL' ? [selectedMode] : undefined;

    return transitScheduleService.getSchedulesSync({
      section,
      selectedCity: selectedCity !== 'ALL' ? selectedCity : undefined,
      modes,
      providerId: selectedProviderId !== 'ALL' ? selectedProviderId : undefined,
      searchQuery,
    });
  }, [section, selectedCity, selectedMode, selectedProviderId, searchQuery]);

  // Available cities & providers
  const availableCities = useMemo(() => {
    return ['ALL', ...transitScheduleService.getAvailableCities()];
  }, []);

  const providers = useMemo(() => {
    return transitScheduleService.getProviders(section);
  }, [section]);

  // Handle Location Detection
  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    setDetectedLocationMessage(null);

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nearest = transitScheduleService.detectNearestCity(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setIsDetectingLocation(false);
          if (nearest) {
            setSelectedCity(nearest);
            setDetectedLocationMessage(`📍 Detected nearby: ${nearest}`);
          } else {
            setDetectedLocationMessage('📍 Location outside covered Romanian cities');
          }
        },
        (_err) => {
          setIsDetectingLocation(false);
          setDetectedLocationMessage('Location permission denied or unavailable');
        },
        { timeout: 8000 }
      );
    } else {
      // Mobile / Test fallback: default to Galați demonstration
      const executeFallback = () => {
        setIsDetectingLocation(false);
        const fallbackCity = 'Galați';
        setSelectedCity(fallbackCity);
        setDetectedLocationMessage(`📍 Simulated location: ${fallbackCity}`);
      };

      if (process.env.NODE_ENV === 'test') {
        executeFallback();
      } else {
        setTimeout(executeFallback, 300);
      }
    }
  };

  const handleResetFilters = () => {
    setSelectedCity('ALL');
    setSelectedMode('ALL');
    setSelectedProviderId('ALL');
    setSearchQuery('');
    setDetectedLocationMessage(null);
  };

  const cityFilterNotice = selectedCity !== 'ALL'
    ? `Filtered by location: ${selectedCity}`
    : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <CozyHoneyBackground
        testID="schedules-cozy-background"
        animated={animated}
        style={styles.background}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header & Section Switcher */}
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              aria-level={1}
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
              ]}
            >
              Romanian Transit Schedules
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              Real-time timetables, urban lines, and national rail across Romania.
            </Text>

            {/* Section Switcher: Urban vs Train */}
            <View
              testID="schedule-section-switcher"
              style={[
                styles.sectionSwitcher,
                {
                  backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
                  borderColor: isDark ? '#3E3204' : theme.colors.honeyBorder,
                },
              ]}
            >
              <TouchableOpacity
                testID="section-tab-urban"
                accessibilityRole="button"
                accessibilityState={{ selected: section === 'URBAN' }}
                onPress={() => {
                  setSection('URBAN');
                  setSelectedMode('ALL');
                  setSelectedProviderId('ALL');
                }}
                style={[
                  styles.switcherTab,
                  section === 'URBAN' && [
                    styles.switcherTabActive,
                    {
                      backgroundColor: isDark ? '#292524' : '#FFFFFF',
                      shadowColor: '#1C1917',
                    },
                  ],
                ]}
              >
                <Text style={styles.tabIcon}>🚋 🚌 🚇</Text>
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: section === 'URBAN'
                        ? (isDark ? theme.colors.brandHoney : '#92400E')
                        : (isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted),
                      fontWeight: section === 'URBAN' ? '800' : '600',
                    },
                  ]}
                >
                  Urban Transit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="section-tab-train"
                accessibilityRole="button"
                accessibilityState={{ selected: section === 'TRAIN' }}
                onPress={() => {
                  setSection('TRAIN');
                  setSelectedMode('ALL');
                  setSelectedProviderId('ALL');
                }}
                style={[
                  styles.switcherTab,
                  section === 'TRAIN' && [
                    styles.switcherTabActive,
                    {
                      backgroundColor: isDark ? '#292524' : '#FFFFFF',
                      shadowColor: '#1C1917',
                    },
                  ],
                ]}
              >
                <Text style={styles.tabIcon}>🚆</Text>
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: section === 'TRAIN'
                        ? (isDark ? theme.colors.brandHoney : '#92400E')
                        : (isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted),
                      fontWeight: section === 'TRAIN' ? '800' : '600',
                    },
                  ]}
                >
                  Intercity Rail
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Location Filter Bar & Detection */}
          <View
            style={[
              styles.locationCard,
              {
                backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
                borderColor: isDark ? '#3E3204' : theme.colors.honeyBorder,
              },
            ]}
          >
            <View style={styles.locationHeaderRow}>
              <View style={styles.locationTitleGroup}>
                <Ionicons
                  name="location"
                  size={18}
                  color={isDark ? theme.colors.brandHoney : '#92400E'}
                />
                <Text
                  style={[
                    styles.locationTitle,
                    { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                  ]}
                >
                  Filter by Location: {selectedCity === 'ALL' ? 'All Romania' : selectedCity}
                </Text>
              </View>

              <TouchableOpacity
                testID="location-detect-btn"
                onPress={handleDetectLocation}
                disabled={isDetectingLocation}
                style={[
                  styles.detectBtn,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                    borderColor: isDark ? theme.colors.brandHoney : '#FDE68A',
                  },
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={14}
                  color={isDark ? theme.colors.brandHoney : '#92400E'}
                />
                <Text
                  style={[
                    styles.detectBtnText,
                    { color: isDark ? theme.colors.brandHoney : '#92400E' },
                  ]}
                >
                  {isDetectingLocation ? 'Locating...' : 'Detect Near Me'}
                </Text>
              </TouchableOpacity>
            </View>

            {detectedLocationMessage && (
              <Text
                testID="detected-location-msg"
                style={[
                  styles.detectedMsg,
                  { color: isDark ? theme.colors.brandHoney : '#92400E' },
                ]}
              >
                {detectedLocationMessage}
              </Text>
            )}

            {/* City Quick Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityPillsRow}
            >
              {availableCities.map((c) => {
                const isSelected = selectedCity === c;
                return (
                  <TouchableOpacity
                    key={`city-${c}`}
                    testID={`city-chip-${c.toLowerCase()}`}
                    onPress={() => setSelectedCity(c)}
                    style={[
                      styles.cityChip,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.brandHoney
                          : (isDark ? '#292524' : '#F4F4F5'),
                        borderColor: isSelected
                          ? theme.colors.brandHoneyDark
                          : (isDark ? '#3F3F46' : '#E4E4E7'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cityChipText,
                        {
                          color: isSelected
                            ? '#1C1917'
                            : (isDark ? '#E4E4E7' : theme.colors.textCharcoal),
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {c === 'ALL' ? '🇷🇴 All Romania' : c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Sub-Mode Filter (Urban: Tram, Bus, Metro) */}
          {section === 'URBAN' && (
            <View style={styles.filterSection}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                ]}
              >
                Transit Mode:
              </Text>
              <View style={styles.modesRow}>
                {(['ALL', 'TRAM', 'BUS', 'METRO'] as const).map((m) => {
                  const isSelected = selectedMode === m;
                  let label = 'All Urban';
                  if (m === 'TRAM') label = 'Tram 🚋';
                  if (m === 'BUS') label = 'Bus 🚌';
                  if (m === 'METRO') label = 'Metro 🚇';

                  return (
                    <TouchableOpacity
                      key={`mode-${m}`}
                      testID={`mode-chip-${m.toLowerCase()}`}
                      onPress={() => setSelectedMode(m)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.brandHoney
                            : (isDark ? '#292524' : '#F4F4F5'),
                          borderColor: isSelected
                            ? theme.colors.brandHoneyDark
                            : (isDark ? '#3F3F46' : '#E4E4E7'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: isSelected
                              ? '#1C1917'
                              : (isDark ? '#E4E4E7' : theme.colors.textCharcoal),
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 4. Provider Filter (Operators) */}
          <View style={styles.filterSection}>
            <Text
              style={[
                styles.filterLabel,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              Operator / Provider:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.providersRow}
            >
              <TouchableOpacity
                testID="provider-chip-all"
                onPress={() => setSelectedProviderId('ALL')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedProviderId === 'ALL'
                      ? theme.colors.brandHoney
                      : (isDark ? '#292524' : '#F4F4F5'),
                    borderColor: selectedProviderId === 'ALL'
                      ? theme.colors.brandHoneyDark
                      : (isDark ? '#3F3F46' : '#E4E4E7'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selectedProviderId === 'ALL'
                        ? '#1C1917'
                        : (isDark ? '#E4E4E7' : theme.colors.textCharcoal),
                      fontWeight: selectedProviderId === 'ALL' ? '800' : '600',
                    },
                  ]}
                >
                  All Operators
                </Text>
              </TouchableOpacity>

              {providers.map((p) => {
                const isSelected = selectedProviderId === p.id;
                return (
                  <TouchableOpacity
                    key={`prov-${p.id}`}
                    testID={`provider-chip-${p.id}`}
                    onPress={() => setSelectedProviderId(p.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.brandHoney
                          : (isDark ? '#292524' : '#F4F4F5'),
                        borderColor: isSelected
                          ? theme.colors.brandHoneyDark
                          : (isDark ? '#3F3F46' : '#E4E4E7'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: isSelected
                            ? '#1C1917'
                            : (isDark ? '#E4E4E7' : theme.colors.textCharcoal),
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {p.shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 5. Real-Time Search Input */}
          <View style={styles.searchContainer}>
            <SearchInput
              testID="schedules-search-input"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                section === 'URBAN'
                  ? 'Search line (e.g. M2, Tram 39, 102), stop, or route...'
                  : 'Search train (e.g. IR 1631, RE 7001), operator, station...'
              }
            />
          </View>

          {/* 6. Active Summary Bar */}
          <View style={styles.resultsSummaryRow}>
            <Text
              testID="schedules-count-text"
              style={[
                styles.resultsCount,
                { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
              ]}
            >
              Showing {schedules.length} departures
            </Text>
            {cityFilterNotice && (
              <BaseBadge
                label={cityFilterNotice}
                variant="warning"
                size="sm"
                style={{
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                  borderColor: isDark ? '#D97706' : '#FDE68A',
                }}
                textStyle={{ color: isDark ? theme.colors.brandHoney : '#92400E' }}
              />
            )}
          </View>

          {/* 7. Schedules List or Empty State */}
          {schedules.length > 0 ? (
            <View testID="schedules-list-container">
              {schedules.map((item) => (
                <TransitScheduleCard
                  key={item.id}
                  schedule={item}
                  testID={`schedule-card-${item.id}`}
                />
              ))}
            </View>
          ) : (
            <View
              testID="empty-schedules-container"
              style={[
                styles.emptyContainer,
                {
                  backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
                  borderColor: isDark ? '#3E3204' : theme.colors.honeyBorder,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={40}
                color={isDark ? theme.colors.brandHoney : '#92400E'}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                ]}
              >
                No Transit Schedules Found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
                ]}
              >
                No active departures match your current filters. Try selecting another city or clearing your search.
              </Text>
              <BaseButton
                variant="outline"
                size="md"
                title="Reset Filters"
                onPress={handleResetFilters}
                testID="reset-schedules-filters-btn"
                style={{ marginTop: 12 }}
              />
            </View>
          )}
        </ScrollView>
      </CozyHoneyBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  switcherTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  switcherTabActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 14,
  },
  locationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  locationTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  detectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detectedMsg: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  cityPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  searchContainer: {
    marginBottom: 14,
  },
  resultsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 18,
  },
});
