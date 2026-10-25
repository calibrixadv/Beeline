import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, ThemeTokens } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseInput } from './BaseInput';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';
import { IconButton } from './IconButton';
import { MascotBee } from './MascotBee';
import {
  FeaturedLocation,
  smartSuggestOrigin,
} from '../data/featuredLocations';
import { LocationSelectDropdown } from './LocationSelectDropdown';
import { transitScheduleService } from '../services/transitScheduleService';

export type TransportMode = 'Trains' | 'Metro' | 'Busses';

export interface RouteSearchParams {
  origin: string;
  destination: string;
  modes: TransportMode[];
}

export interface RouteFinderCardProps {
  /** Initial origin station/city */
  initialOrigin?: string;
  /** Initial destination station/city */
  initialDestination?: string;
  /** Initial current city */
  initialCity?: string;
  /** Initial selected transport modes */
  initialModes?: TransportMode[];
  /** Callback when user triggers search submission (no redirect performed) */
  onSubmitRoute?: (params: RouteSearchParams) => void;
  /** Callback to navigate to schedules directly */
  onNavigateSchedules?: (url: string) => void;
  /** Callback to navigate to multi-modal trip booking results directly */
  onNavigateTrips?: (url: string) => void;
  /** Callback when user clicks explore trips */
  onExploreTrips?: (params: RouteSearchParams) => void;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

export const ALL_TRANSPORT_MODES: { id: TransportMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'Trains', label: 'Trains', icon: 'train-outline' },
  { id: 'Metro', label: 'Metro', icon: 'subway-outline' },
  { id: 'Busses', label: 'Busses', icon: 'bus-outline' },
];

export interface TrifectaPreviewPillar {
  id: string;
  badgeLabel: string;
  badgeVariant: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  meta: string;
  testID: string;
  mascotName: 'barnaby' | 'honey' | 'bumble';
  mascot: React.ReactNode;
}

export const CURATED_TRIFECTA_PILLARS: TrifectaPreviewPillar[] = [
  {
    id: 'fastest',
    badgeLabel: 'FASTEST',
    badgeVariant: 'warning',
    title: '⚡ Fastest Route',
    description: 'Direct InterRegio / High-speed connection prioritizing minimum travel duration.',
    meta: 'Direct CFR IR / High-speed • Minimum transit duration',
    testID: 'trifecta-card-fastest',
    mascotName: 'barnaby',
    mascot: <MascotBee name="barnaby" size="sm" animated={false} />,
  },
  {
    id: 'best-value',
    badgeLabel: 'BEST VALUE',
    badgeVariant: 'success',
    title: '💰 Best Value',
    description: 'Applying the €10/hour saved threshold rule ~50 RON/hr.',
    meta: '€10/hr threshold rule (~50 RON/hr) • Optimal cost-time balance',
    testID: 'trifecta-card-best-value',
    mascotName: 'honey',
    mascot: <MascotBee name="honey" size="sm" animated={false} />,
  },
  {
    id: 'most-reliable',
    badgeLabel: 'MOST RELIABLE',
    badgeVariant: 'info',
    title: '🛡️ Most Reliable',
    description: 'Transfer Shield with generous 25–35 min buffers for Romanian network delay safety.',
    meta: 'Transfer Shield • 25-35m (25–35 min) buffer protection • Delay risk safety',
    testID: 'trifecta-card-most-reliable',
    mascotName: 'bumble',
    mascot: <MascotBee name="bumble" size="sm" animated={false} />,
  },
];

export const normalizeStation = (station: string): string =>
  (station || '')
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

interface QuickCorridorChipProps {
  from: string;
  to: string;
  testID: string;
  accessibilityLabel: string;
  onPress: () => void;
  isDark: boolean;
  theme: ThemeTokens;
}

const QuickCorridorChip: React.FC<QuickCorridorChipProps> = ({
  from,
  to,
  testID,
  accessibilityLabel,
  onPress,
  isDark,
  theme,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      focusable={true}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        styles.corridorChip,
        {
          backgroundColor: isDark ? '#292524' : '#FEF3C7',
          borderColor: theme.colors.honeyBorder,
        },
        isHovered && styles.corridorChipHovered,
        isPressed && styles.corridorChipPressed,
        isFocused && [
          styles.corridorChipFocused,
          Platform.OS === 'web'
            ? ({
                outlineColor: theme.colors.brandHoney,
                outlineStyle: 'solid',
                outlineWidth: 2,
                outlineOffset: 2,
                cursor: 'pointer',
              } as any)
            : { borderColor: theme.colors.brandHoney, borderWidth: 1.5 },
        ],
      ]}
    >
      <Text style={[styles.corridorChipText, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}>
        {from} ➔ {to}
      </Text>
    </Pressable>
  );
};

export const RouteFinderCard: React.FC<RouteFinderCardProps> = ({
  initialOrigin = 'București Nord',
  initialDestination = 'Brașov',
  initialCity = 'București',
  initialModes = ['Trains', 'Metro', 'Busses'],
  onSubmitRoute,
  onNavigateSchedules,
  onNavigateTrips,
  onExploreTrips,
  style,
  testID = 'route-finder-card',
}) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [currentCity, setCurrentCity] = useState(initialCity);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedCityMessage, setDetectedCityMessage] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'destination' | null>(null);
  const [recentChoices, setRecentChoices] = useState<string[]>([]);
  const [originSearch, setOriginSearch] = useState<string>('');
  const [destinationSearch, setDestinationSearch] = useState<string>('');

  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [selectedModes, setSelectedModes] = useState<TransportMode[]>(initialModes);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<RouteSearchParams | null>(null);

  // Toggle transport mode selection
  const handleToggleMode = (mode: TransportMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        // Keep at least one mode selected for valid route queries
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
    setSubmittedQuery(null);
  };

  // Swap origin and destination stations
  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setValidationError(null);
    setSubmittedQuery(null);
    setActiveDropdown(null);
  };

  // City selection & location detection
  const handleSelectCity = (newCity: string) => {
    setCurrentCity(newCity);
    setIsLocationActive(false);
    setDetectedCityMessage(null);

    // If destination is in another city, suggest origin from new city
    const suggested = smartSuggestOrigin({
      destination,
      currentCity: newCity,
      isLocationActive: false,
    });
    if (suggested) {
      setOrigin(suggested);
    }
    setValidationError(null);
    setSubmittedQuery(null);
    setActiveDropdown(null);
  };

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    setDetectedCityMessage(null);

    const executeFallback = () => {
      setIsDetectingLocation(false);
      const detected = 'Galați';
      setCurrentCity(detected);
      setIsLocationActive(true);
      setDetectedCityMessage(`📍 Location detected: ${detected}`);
      setOrigin(`📍 My Current Location (${detected})`);
      setSubmittedQuery(null);
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nearest = transitScheduleService.detectNearestCity(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setIsDetectingLocation(false);
          if (nearest) {
            setCurrentCity(nearest);
            setIsLocationActive(true);
            setDetectedCityMessage(`📍 Location detected: ${nearest}`);
            setOrigin(`📍 My Current Location (${nearest})`);
          } else {
            setDetectedCityMessage('📍 Outside covered Romanian transit cities');
          }
        },
        (_err) => {
          executeFallback();
        },
        { timeout: 8000 }
      );
    } else {
      if (process.env.NODE_ENV === 'test') {
        executeFallback();
      } else {
        setTimeout(executeFallback, 300);
      }
    }
  };

  const handleSelectOriginLocation = (locName: string, _locObj?: FeaturedLocation) => {
    setOrigin(locName);
    setOriginSearch('');
    setActiveDropdown(null);
    setValidationError(null);
    setSubmittedQuery(null);
  };

  const handleSelectDestinationLocation = (locName: string, _locObj?: FeaturedLocation) => {
    setDestination(locName);
    setDestinationSearch('');
    setActiveDropdown(null);
    setValidationError(null);
    setSubmittedQuery(null);

    // Smart heuristic:
    // "example if the user picks the target to be another city most likely it's starting point will be current location, if it is not available current cities train station, if the current city is not known destination city train station"
    const suggestedOrigin = smartSuggestOrigin({
      destination: locName,
      currentCity,
      isLocationActive,
      existingOrigin: origin,
    });
    if (suggestedOrigin && origin !== suggestedOrigin) {
      setOrigin(suggestedOrigin);
      setOriginSearch('');
    }
  };

  // Submission handler: Validates inputs and prepares query WITHOUT actual redirect
  const handleSubmit = () => {
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();

    if (!trimmedOrigin || !trimmedDestination) {
      setValidationError('Please specify both origin and destination points.');
      setSubmittedQuery(null);
      return;
    }

    if (normalizeStation(trimmedOrigin) === normalizeStation(trimmedDestination)) {
      setValidationError('Origin and destination cannot be identical.');
      setSubmittedQuery(null);
      return;
    }

    if (selectedModes.length === 0) {
      setValidationError('Please select at least one transport mode filter.');
      setSubmittedQuery(null);
      return;
    }

    setValidationError(null);
    const query: RouteSearchParams = {
      origin: trimmedOrigin,
      destination: trimmedDestination,
      modes: [...selectedModes],
    };

    setSubmittedQuery(query);

    // Add to recent choices
    setRecentChoices((prev) => {
      const next = [
        trimmedOrigin,
        trimmedDestination,
        ...prev.filter((c) => c !== trimmedOrigin && c !== trimmedDestination),
      ];
      return next.slice(0, 5);
    });

    // Call optional external callback — NOTE: Strictly no route redirect is performed here!
    onSubmitRoute?.(query);
  };

  // Quick corridor selection shortcut
  const handleSelectCorridor = (from: string, to: string) => {
    setOrigin(from);
    setDestination(to);
    setValidationError(null);
    setSubmittedQuery(null);
    setActiveDropdown(null);
  };

  return (
    <BaseCard
      variant="elevated"
      padding="md"
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceWarm,
          borderColor: theme.colors.honeyBorder,
        },
        style,
      ]}
    >
      {/* Header Badge & Subtitle */}
      <View style={styles.headerRow}>
        <View style={[styles.badgeContainer, { backgroundColor: theme.colors.brandHoney }]}>
          <Ionicons name="compass" size={13} color="#1C1917" />
          <Text style={styles.badgeText}>ROUTE SHORTHAND</Text>
        </View>
        <Text style={[styles.modeIndicator, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
          Template Mode • No Redirect
        </Text>
      </View>

      {/* Title */}
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.title, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
      >
        European Route Finder
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
        Quick 2-point routing across high-speed trains, urban metro, and regional busses.
      </Text>

      {/* Current City Selector Bar with GPS & Quick City Chips */}
      <View style={styles.citySelectorContainer} testID="current-city-selector-bar">
        <View style={styles.citySelectorHeader}>
          <View style={styles.cityLabelRow}>
            <Ionicons name="location-sharp" size={14} color={isDark ? theme.colors.brandHoney : '#92400E'} />
            <Text style={[styles.citySelectorLabel, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}>
              CURRENT CITY:{' '}
              <Text style={{ color: isDark ? theme.colors.brandHoney : '#B45309', fontWeight: '800' }}>
                {currentCity}
              </Text>
            </Text>
          </View>
          <Pressable
            testID="detect-current-city-btn"
            accessibilityRole="button"
            accessibilityLabel="Detect current city using GPS"
            onPress={handleDetectLocation}
            style={[
              styles.detectBtn,
              {
                borderColor: theme.colors.honeyBorder,
                backgroundColor: isDark ? '#292524' : '#FEF3C7',
              },
            ]}
          >
            <Ionicons name="locate" size={13} color={isDark ? theme.colors.brandHoney : '#92400E'} />
            <Text style={[styles.detectBtnText, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
              {isDetectingLocation ? 'Locating...' : 'Detect Near Me'}
            </Text>
          </Pressable>
        </View>

        {detectedCityMessage ? (
          <Text testID="detected-city-msg" style={[styles.detectedCityNotice, { color: isDark ? '#34D399' : '#059669' }]}>
            {detectedCityMessage}
          </Text>
        ) : null}

        {/* Quick Romanian City Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityChipsRow}
          style={styles.cityChipsScroll}
        >
          {['București', 'Galați', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Constanța', 'Iași'].map((city) => {
            const isSelected = city === currentCity;
            return (
              <Pressable
                key={city}
                testID={`city-select-chip-${city.toLowerCase()}`}
                accessibilityRole="button"
                accessibilityLabel={`Select current city ${city}`}
                onPress={() => handleSelectCity(city)}
                style={[
                  styles.cityChip,
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
                    styles.cityChipText,
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
                  {city}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2-Point Inputs with Swap Action, Waggle Flight Connector & Searchable Dropdowns */}
      <View style={styles.inputsContainer}>
        <View style={styles.inputRow}>
          <BaseInput
            label="ORIGIN"
            placeholder={`Origin station in ${currentCity}`}
            value={origin}
            onChangeText={(text) => {
              setOrigin(text);
              setOriginSearch(text);
              setValidationError(null);
              setSubmittedQuery(null);
              setActiveDropdown('origin');
            }}
            onFocus={() => {
              setOriginSearch('');
              setActiveDropdown('origin');
            }}
            onClear={() => {
              setOrigin('');
              setOriginSearch('');
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            leftIcon={<Ionicons name="navigate-circle-outline" size={18} color={theme.colors.brandHoney} />}
            rightIcon={
              <Pressable
                testID="origin-dropdown-toggle"
                accessibilityRole="button"
                accessibilityLabel="Toggle origin locations dropdown"
                onPress={() => {
                  setOriginSearch('');
                  setActiveDropdown((prev) => (prev === 'origin' ? null : 'origin'));
                }}
                hitSlop={8}
                style={styles.dropdownToggleBtn}
              >
                <Ionicons
                  name={activeDropdown === 'origin' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
                />
              </Pressable>
            }
            clearable
            testID="route-origin-input"
            accessibilityLabel="Origin point input"
          />

          {activeDropdown === 'origin' ? (
            <LocationSelectDropdown
              testID="origin-dropdown-menu"
              currentCity={currentCity}
              field="origin"
              searchQuery={originSearch}
              selectedModes={selectedModes}
              recentChoices={recentChoices}
              isLocationActive={isLocationActive}
              onSelectLocation={handleSelectOriginLocation}
              onClose={() => setActiveDropdown(null)}
            />
          ) : null}
        </View>

        {/* Waggle Flight Connector flanking the swap button */}
        <View
          testID="route-waggle-connector"
          style={styles.waggleConnectorContainer}
          accessibilityLabel="Waggle flight connector between origin and destination"
        >
          <View style={styles.waggleFlankSide}>
            <View
              style={[
                styles.waggleDashedLine,
                { borderColor: isDark ? theme.colors.brandHoneyDark : theme.colors.honeyBorder },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.waggleTrailGlyph,
                { color: isDark ? theme.colors.brandHoney : '#92400E' },
              ]}
            >
              ── 🐝 ~ ~ ──
            </Text>
          </View>

          <IconButton
            iconName="swap-vertical"
            iconSize={18}
            iconColor={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
            shape="circle"
            size="sm"
            variant="surface"
            onPress={handleSwap}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="route-swap-button"
            accessibilityLabel="Swap origin and destination"
            style={[
              styles.swapButton,
              {
                backgroundColor: isDark ? '#292524' : '#FEF3C7',
                borderColor: theme.colors.honeyBorder,
              },
            ]}
          />

          <View style={styles.waggleFlankSide}>
            <Text
              numberOfLines={1}
              style={[
                styles.waggleTrailGlyph,
                { color: isDark ? theme.colors.brandHoney : '#92400E' },
              ]}
            >
              ── ~ ~ 🐝 ──
            </Text>
            <View
              style={[
                styles.waggleDashedLine,
                { borderColor: isDark ? theme.colors.brandHoneyDark : theme.colors.honeyBorder },
              ]}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <BaseInput
            label="DESTINATION"
            placeholder="Destination station (e.g., Brașov)"
            value={destination}
            onChangeText={(text) => {
              setDestination(text);
              setDestinationSearch(text);
              setValidationError(null);
              setSubmittedQuery(null);
              setActiveDropdown('destination');
            }}
            onFocus={() => {
              setDestinationSearch('');
              setActiveDropdown('destination');
            }}
            onClear={() => {
              setDestination('');
              setDestinationSearch('');
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            leftIcon={<Ionicons name="location-outline" size={18} color={theme.colors.brandHoney} />}
            rightIcon={
              <Pressable
                testID="destination-dropdown-toggle"
                accessibilityRole="button"
                accessibilityLabel="Toggle destination locations dropdown"
                onPress={() => {
                  setDestinationSearch('');
                  setActiveDropdown((prev) => (prev === 'destination' ? null : 'destination'));
                }}
                hitSlop={8}
                style={styles.dropdownToggleBtn}
              >
                <Ionicons
                  name={activeDropdown === 'destination' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
                />
              </Pressable>
            }
            clearable
            testID="route-destination-input"
            accessibilityLabel="Destination point input"
          />

          {activeDropdown === 'destination' ? (
            <LocationSelectDropdown
              testID="destination-dropdown-menu"
              currentCity={currentCity}
              field="destination"
              searchQuery={destinationSearch}
              selectedModes={selectedModes}
              recentChoices={recentChoices}
              isLocationActive={isLocationActive}
              onSelectLocation={handleSelectDestinationLocation}
              onClose={() => setActiveDropdown(null)}
            />
          ) : null}
        </View>
      </View>

      {/* Transport Mode Filter Chips ("Trains", "Metro", "Busses") */}
      <View style={styles.modesSection}>
        <Text
          accessibilityRole="header"
          aria-level={3}
          style={[
            styles.modesLabel,
            { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
          ]}
        >
          TRANSPORT MODE FILTERS
        </Text>
        <View style={styles.modesRow}>
          {ALL_TRANSPORT_MODES.map((modeItem) => {
            const isSelected = selectedModes.includes(modeItem.id);
            return (
              <BaseBadge
                key={modeItem.id}
                label={modeItem.label}
                variant={isSelected ? 'warning' : 'neutral'}
                size="md"
                selected={isSelected}
                icon={
                  <Ionicons
                    name={modeItem.icon}
                    size={14}
                    color={
                      isSelected
                        ? '#1C1917'
                        : theme.colors.textCharcoalMuted
                    }
                  />
                }
                onPress={() => handleToggleMode(modeItem.id)}
                testID={`mode-filter-${modeItem.id.toLowerCase()}`}
                accessibilityLabel={`Filter by ${modeItem.label}`}
                style={[
                  styles.modeBadge,
                  isSelected
                    ? {
                        backgroundColor: theme.colors.brandHoney,
                        borderColor: theme.colors.brandHoneyDark,
                      }
                    : {
                        backgroundColor: isDark ? '#292524' : theme.colors.brandCream,
                        borderColor: isDark ? theme.colors.honeyBorder : theme.colors.honeyBorder,
                      },
                ]}
                textStyle={
                  isSelected
                    ? { color: '#1C1917', fontWeight: '800' }
                    : isDark
                    ? { color: '#FFFFFF' }
                    : { color: theme.colors.textCharcoalMuted, fontWeight: '600' }
                }
              />
            );
          })}
        </View>
      </View>

      {/* Validation Error Banner */}
      {validationError ? (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: '#EF4444' }]}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText} testID="route-validation-error">
            {validationError}
          </Text>
        </View>
      ) : null}

      {/* Prepared Submission Confirmation Banner (No Redirect Performed) */}
      {submittedQuery ? (
        <View
          testID="route-submission-feedback"
          style={[
            styles.submissionFeedbackBox,
            {
              backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
              borderColor: isDark ? theme.colors.brandHoney : theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={styles.feedbackHeader}>
            <View style={styles.feedbackTitleRow}>
              <Ionicons name="sparkles" size={16} color={isDark ? theme.colors.brandHoney : '#92400E'} />
              <Text
                accessibilityRole="header"
                aria-level={3}
                style={[styles.feedbackTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
              >
                Route Search Prepared
              </Text>
            </View>
            <BaseBadge
              label="THE CURATED TRIFECTA"
              variant="warning"
              size="sm"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                borderColor: isDark ? '#D97706' : '#FDE68A',
                borderWidth: 1,
              }}
              textStyle={{ color: isDark ? theme.colors.brandHoney : '#92400E' }}
            />
          </View>

          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.feedbackDetails, { color: isDark ? theme.colors.brandHoney : theme.colors.textCharcoal }]}
          >
            {submittedQuery.origin} ➔ {submittedQuery.destination}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.feedbackModes, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
          >
            Active filters: {submittedQuery.modes.join(', ')}
          </Text>

          {/* Curated Trifecta 3 Preview Cards with Mascot Companions */}
          <View style={styles.trifectaContainer}>
            {CURATED_TRIFECTA_PILLARS.map((pillar) => {
              const isBestValue = pillar.id === 'best-value';
              const isMostReliable = pillar.id === 'most-reliable';

              const badgeBg = isDark
                ? isMostReliable
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isBestValue
                  ? 'rgba(234, 179, 8, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)'
                : isMostReliable
                ? '#DCFCE7'
                : isBestValue
                ? '#FEF9C3'
                : '#FEF3C7';

              const badgeBorder = isDark
                ? isMostReliable
                  ? '#059669'
                  : isBestValue
                  ? '#CA8A04'
                  : '#D97706'
                : isMostReliable
                ? '#86EFAC'
                : isBestValue
                ? '#FDE047'
                : '#FDE68A';

              const badgeTextColor = isDark
                ? isMostReliable
                  ? '#34D399'
                  : isBestValue
                  ? '#FDE047'
                  : theme.colors.brandHoney
                : isMostReliable
                ? '#166534'
                : isBestValue
                ? '#854D0E'
                : '#92400E';

              return (
                <BaseCard
                  key={pillar.id}
                  variant="outlined"
                  padding="sm"
                  testID={pillar.testID}
                  accessibilityLabel={`${pillar.title} - ${pillar.badgeLabel}: ${pillar.description}`}
                  style={[
                    styles.trifectaCard,
                    {
                      backgroundColor: isDark ? '#292524' : '#FFFDF7',
                      borderColor: isDark ? theme.colors.honeyBorder : theme.colors.honeyBorder,
                    },
                  ]}
                >
                  <View style={styles.trifectaCardHeader}>
                    <View style={styles.trifectaMascotGroup}>
                      {pillar.mascot ?? (pillar.mascotName ? (
                        <MascotBee name={pillar.mascotName} size="sm" animated={false} />
                      ) : null)}
                      <Text
                        accessibilityRole="header"
                        aria-level={4}
                        style={[styles.trifectaCardTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
                      >
                        {pillar.title}
                      </Text>
                    </View>
                    <BaseBadge
                      label={pillar.badgeLabel}
                      variant={pillar.badgeVariant}
                      size="sm"
                      style={{
                        backgroundColor: badgeBg,
                        borderColor: badgeBorder,
                        borderWidth: 1,
                      }}
                      textStyle={{ color: badgeTextColor }}
                    />
                  </View>
                  <Text style={[styles.trifectaCardDesc, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
                    {pillar.description}
                  </Text>
                  <Text style={[styles.trifectaCardMeta, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
                    {pillar.meta}
                  </Text>
                </BaseCard>
              );
            })}
          </View>

          <View style={styles.templateNoteRow}>
            <Ionicons name="information-circle-outline" size={13} color={isDark ? '#34D399' : '#166534'} />
            <Text style={[styles.templateNoteText, { color: isDark ? '#34D399' : '#166534' }]}>
              Template mode: submission handled; feature redirection disabled.
            </Text>
          </View>

          <Text
            testID="trifecta-shorthand-disclaimer"
            style={[styles.disclaimerText, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}
          >
            Shorthand preview: full door-to-door itinerary and booking will load upon future redirect.
          </Text>

          {/* Direct link to Multi-Modal Trips & Booking results on /trips */}
          <View style={[styles.viewSchedulesBtnRow, { marginBottom: 10 }]}>
            <BaseButton
              variant="primary"
              size="md"
              title="Explore Multi-Modal Trips (/trips)"
              iconLeft={<Ionicons name="navigate" size={16} color="#1C1917" />}
              iconRight={<Ionicons name="arrow-forward" size={16} color="#1C1917" />}
              onPress={() => {
                const qOrigin = submittedQuery ? submittedQuery.origin : origin;
                const qDest = submittedQuery ? submittedQuery.destination : destination;
                const url = `/trips?origin=${encodeURIComponent(qOrigin)}&destination=${encodeURIComponent(qDest)}`;
                if (onExploreTrips && submittedQuery) {
                  onExploreTrips(submittedQuery);
                }
                if (onNavigateTrips) {
                  onNavigateTrips(url);
                } else {
                  router.push(url as any);
                }
              }}
              testID="explore-trips-btn"
              accessibilityLabel="Explore Multi-Modal Trips and Booking Options"
              style={[
                styles.viewSchedulesBtn,
                {
                  backgroundColor: theme.colors.brandHoney,
                  borderColor: theme.colors.brandHoneyDark,
                },
              ]}
              textStyle={{ color: '#1C1917', fontWeight: '800' }}
              fullWidth
            />
          </View>

          {/* Direct link to live schedules for this route & city */}
          <View style={styles.viewSchedulesBtnRow}>
            <BaseButton
              variant="outline"
              size="md"
              title="View Live Schedules on /schedules"
              iconLeft={<Ionicons name="time-outline" size={16} color={isDark ? theme.colors.brandHoney : '#92400E'} />}
              onPress={() => {
                const dest = submittedQuery ? submittedQuery.destination : destination;
                const url = `/schedules?city=${encodeURIComponent(currentCity)}&query=${encodeURIComponent(dest)}`;
                if (onNavigateSchedules) {
                  onNavigateSchedules(url);
                } else {
                  router.push(url as any);
                }
              }}
              testID="view-live-schedules-btn"
              accessibilityLabel={`View Live Schedules in ${currentCity}`}
              style={[
                styles.viewSchedulesBtn,
                {
                  borderColor: theme.colors.honeyBorder,
                  backgroundColor: isDark ? '#292524' : '#FEF3C7',
                },
              ]}
              textStyle={{ color: isDark ? theme.colors.brandHoney : '#92400E', fontWeight: '700' }}
              fullWidth
            />
          </View>
        </View>
      ) : null}

      {/* Primary Action Button */}
      <BaseButton
        variant="primary"
        size="lg"
        title="Find European Routes"
        iconLeft={<Ionicons name="search" size={18} color="#1C1917" />}
        onPress={handleSubmit}
        testID="route-finder-submit-btn"
        accessibilityLabel="Find European Routes"
        style={[
          styles.submitButton,
          {
            backgroundColor: theme.colors.brandHoney,
            borderColor: theme.colors.brandHoneyDark,
          },
        ]}
        textStyle={{ color: '#1C1917', fontWeight: '800' }}
        fullWidth
      />

      {/* Quick Corridor Selection Shortcuts */}
      <View style={styles.corridorsRow}>
        <Text
          accessibilityRole="header"
          aria-level={3}
          style={[
            styles.corridorsLabel,
            { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
          ]}
        >
          Popular corridors:
        </Text>
        <QuickCorridorChip
          from="Paris"
          to="Lyon"
          testID="quick-corridor-paris-lyon"
          accessibilityLabel="Quick corridor Paris to Lyon"
          onPress={() => handleSelectCorridor('Paris', 'Lyon')}
          isDark={isDark}
          theme={theme}
        />
        <QuickCorridorChip
          from="London"
          to="Paris"
          testID="quick-corridor-london-paris"
          accessibilityLabel="Quick corridor London to Paris"
          onPress={() => handleSelectCorridor('London', 'Paris')}
          isDark={isDark}
          theme={theme}
        />
        <QuickCorridorChip
          from="Milano"
          to="Roma"
          testID="quick-corridor-milano-roma"
          accessibilityLabel="Quick corridor Milano to Roma"
          onPress={() => handleSelectCorridor('Milano', 'Roma')}
          isDark={isDark}
          theme={theme}
        />
      </View>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
    shadowColor: '#1C1917',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  modeIndicator: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputsContainer: {
    marginBottom: 14,
  },
  inputRow: {
    width: '100%',
  },
  waggleConnectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    gap: 6,
  },
  waggleFlankSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 10,
    overflow: 'hidden',
  },
  waggleDashedLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  waggleTrailGlyph: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 16,
    flexShrink: 0,
  },
  swapButton: {
    marginHorizontal: 8,
    borderWidth: 1,
  },
  trifectaMascotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  modesSection: {
    marginBottom: 16,
  },
  modesLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    lineHeight: 14,
  },
  modesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    flex: 1,
  },
  submissionFeedbackBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 6,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  feedbackDetails: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 2,
  },
  feedbackModes: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 6,
  },
  trifectaContainer: {
    gap: 8,
    marginVertical: 4,
  },
  trifectaCard: {
    borderRadius: 8,
    borderWidth: 1,
  },
  trifectaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  trifectaCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    flexShrink: 1,
  },
  trifectaCardDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 4,
  },
  trifectaCardMeta: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  templateNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  templateNoteText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    flex: 1,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 10,
    marginBottom: 14,
  },
  corridorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  corridorsLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  corridorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corridorChipHovered: {
    opacity: 0.9,
    transform: [{ translateY: -1 }],
  },
  corridorChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  corridorChipFocused: {
    borderColor: '#F59E0B',
  },
  corridorChipText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  citySelectorContainer: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  citySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  cityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  citySelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  detectBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detectedCityNotice: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  cityChipsScroll: {
    width: '100%',
  },
  cityChipsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  cityChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 11,
  },
  dropdownToggleBtn: {
    padding: 4,
  },
  viewSchedulesBtnRow: {
    marginTop: 10,
  },
  viewSchedulesBtn: {
    borderRadius: 10,
  },
});
