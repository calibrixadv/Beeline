import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseInput } from './BaseInput';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';
import { IconButton } from './IconButton';

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
  /** Initial selected transport modes */
  initialModes?: TransportMode[];
  /** Callback when user triggers search submission (no redirect performed) */
  onSubmitRoute?: (params: RouteSearchParams) => void;
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
  },
  {
    id: 'best-value',
    badgeLabel: 'BEST VALUE',
    badgeVariant: 'success',
    title: '💰 Best Value',
    description: 'Applying the €10/hour saved threshold rule ~50 RON/hr.',
    meta: '€10/hr threshold rule (~50 RON/hr) • Optimal cost-time balance',
    testID: 'trifecta-card-best-value',
  },
  {
    id: 'most-reliable',
    badgeLabel: 'MOST RELIABLE',
    badgeVariant: 'info',
    title: '🛡️ Most Reliable',
    description: 'Transfer Shield with generous 25–35 min buffers for Romanian network delay safety.',
    meta: 'Transfer Shield • 25-35m (25–35 min) buffer protection • Delay risk safety',
    testID: 'trifecta-card-most-reliable',
  },
];

export const normalizeStation = (station: string): string =>
  (station || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const RouteFinderCard: React.FC<RouteFinderCardProps> = ({
  initialOrigin = 'București Nord',
  initialDestination = 'Brașov',
  initialModes = ['Trains', 'Metro', 'Busses'],
  onSubmitRoute,
  style,
  testID = 'route-finder-card',
}) => {
  const { theme, isDark } = useTheme();

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

    // Call optional external callback — NOTE: Strictly no route redirect is performed here!
    onSubmitRoute?.(query);
  };

  // Quick corridor selection shortcut
  const handleSelectCorridor = (from: string, to: string) => {
    setOrigin(from);
    setDestination(to);
    setValidationError(null);
    setSubmittedQuery(null);
  };

  const dynamicCardBorder = useMemo(() => {
    return isDark ? theme.colors.brandYellow : '#000000';
  }, [isDark, theme.colors.brandYellow]);

  return (
    <BaseCard
      variant="elevated"
      padding="md"
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#141416' : '#FFFFFF',
          borderColor: dynamicCardBorder,
        },
        style,
      ]}
    >
      {/* Header Badge & Subtitle */}
      <View style={styles.headerRow}>
        <View style={[styles.badgeContainer, { backgroundColor: theme.colors.brandYellow }]}>
          <Ionicons name="compass" size={13} color="#000000" />
          <Text style={styles.badgeText}>ROUTE SHORTHAND</Text>
        </View>
        <Text style={[styles.modeIndicator, { color: theme.colors.textMuted }]}>
          Template Mode • No Redirect
        </Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        European Route Finder
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Quick 2-point routing across high-speed trains, urban metro, and regional busses.
      </Text>

      {/* 2-Point Inputs with Swap Action */}
      <View style={styles.inputsContainer}>
        <View style={styles.inputRow}>
          <BaseInput
            label="ORIGIN"
            placeholder="Origin station (e.g., București Nord)"
            value={origin}
            onChangeText={(text) => {
              setOrigin(text);
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            onClear={() => {
              setOrigin('');
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            leftIcon={<Ionicons name="navigate-circle-outline" size={18} color={theme.colors.brandYellow} />}
            clearable
            testID="route-origin-input"
            accessibilityLabel="Origin point input"
          />
        </View>

        {/* Swap Button */}
        <View style={styles.swapRow}>
          <View style={[styles.swapDivider, { backgroundColor: theme.colors.border }]} />
          <IconButton
            iconName="swap-vertical"
            iconSize={18}
            iconColor={isDark ? theme.colors.brandYellow : '#000000'}
            shape="circle"
            size="sm"
            variant="surface"
            onPress={handleSwap}
            testID="route-swap-button"
            accessibilityLabel="Swap origin and destination"
            style={[
              styles.swapButton,
              {
                backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                borderColor: theme.colors.border,
              },
            ]}
          />
          <View style={[styles.swapDivider, { backgroundColor: theme.colors.border }]} />
        </View>

        <View style={styles.inputRow}>
          <BaseInput
            label="DESTINATION"
            placeholder="Destination station (e.g., Brașov)"
            value={destination}
            onChangeText={(text) => {
              setDestination(text);
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            onClear={() => {
              setDestination('');
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            leftIcon={<Ionicons name="location-outline" size={18} color={theme.colors.brandYellow} />}
            clearable
            testID="route-destination-input"
            accessibilityLabel="Destination point input"
          />
        </View>
      </View>

      {/* Transport Mode Filter Chips ("Trains", "Metro", "Busses") */}
      <View style={styles.modesSection}>
        <Text style={[styles.modesLabel, { color: theme.colors.textMuted }]}>
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
                    color={isSelected ? '#000000' : theme.colors.textMuted}
                  />
                }
                onPress={() => handleToggleMode(modeItem.id)}
                testID={`mode-filter-${modeItem.id.toLowerCase()}`}
                accessibilityLabel={`Filter by ${modeItem.label}`}
                style={[
                  styles.modeBadge,
                  isSelected && {
                    backgroundColor: theme.colors.brandYellow,
                    borderColor: theme.colors.brandYellowDark,
                  },
                ]}
                textStyle={isSelected ? { color: '#000000', fontWeight: '800' } : undefined}
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
              backgroundColor: isDark ? '#141416' : '#F9FAFB',
              borderColor: isDark ? theme.colors.brandYellow : '#E5E7EB',
            },
          ]}
        >
          <View style={styles.feedbackHeader}>
            <View style={styles.feedbackTitleRow}>
              <Ionicons name="sparkles" size={16} color={isDark ? theme.colors.brandYellow : '#D97706'} />
              <Text style={[styles.feedbackTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                Route Search Prepared
              </Text>
            </View>
            <BaseBadge label="THE CURATED TRIFECTA" variant="warning" size="sm" />
          </View>

          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.feedbackDetails, { color: isDark ? '#E4E4E7' : '#1F2937' }]}
          >
            {submittedQuery.origin} ➔ {submittedQuery.destination}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.feedbackModes, { color: isDark ? '#A1A1AA' : '#6B7280' }]}
          >
            Active filters: {submittedQuery.modes.join(', ')}
          </Text>

          {/* Curated Trifecta 3 Preview Cards */}
          <View style={styles.trifectaContainer}>
            {CURATED_TRIFECTA_PILLARS.map((pillar) => (
              <BaseCard
                key={pillar.id}
                variant="outlined"
                padding="sm"
                testID={pillar.testID}
                accessibilityLabel={`${pillar.title} - ${pillar.badgeLabel}: ${pillar.description}`}
                style={[
                  styles.trifectaCard,
                  {
                    backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                    borderColor: isDark ? '#3F3F46' : '#E4E4E7',
                  },
                ]}
              >
                <View style={styles.trifectaCardHeader}>
                  <Text style={[styles.trifectaCardTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                    {pillar.title}
                  </Text>
                  <BaseBadge
                    label={pillar.badgeLabel}
                    variant={pillar.badgeVariant}
                    size="sm"
                  />
                </View>
                <Text style={[styles.trifectaCardDesc, { color: isDark ? '#D4D4D8' : '#3F3F46' }]}>
                  {pillar.description}
                </Text>
                <Text style={[styles.trifectaCardMeta, { color: isDark ? '#A1A1AA' : '#71717A' }]}>
                  {pillar.meta}
                </Text>
              </BaseCard>
            ))}
          </View>

          <View style={styles.templateNoteRow}>
            <Ionicons name="information-circle-outline" size={13} color={isDark ? '#34D399' : '#059669'} />
            <Text style={[styles.templateNoteText, { color: isDark ? '#34D399' : '#059669' }]}>
              Template mode: submission handled; feature redirection disabled.
            </Text>
          </View>

          <Text
            testID="trifecta-shorthand-disclaimer"
            style={[styles.disclaimerText, { color: isDark ? '#A1A1AA' : '#4B5563' }]}
          >
            Shorthand preview: full door-to-door itinerary and booking will load upon future redirect.
          </Text>
        </View>
      ) : null}

      {/* Primary Action Button */}
      <BaseButton
        variant="primary"
        size="lg"
        title="Find European Routes"
        iconLeft={<Ionicons name="search" size={18} color="#000000" />}
        onPress={handleSubmit}
        testID="route-finder-submit-btn"
        accessibilityLabel="Find European Routes"
        style={[
          styles.submitButton,
          {
            backgroundColor: theme.colors.brandYellow,
            borderColor: theme.colors.brandYellow,
          },
        ]}
        textStyle={{ color: '#000000', fontWeight: '800' }}
        fullWidth
      />

      {/* Quick Corridor Selection Shortcuts */}
      <View style={styles.corridorsRow}>
        <Text style={[styles.corridorsLabel, { color: theme.colors.textMuted }]}>
          Popular corridors:
        </Text>
        <TouchableOpacity
          style={[
            styles.corridorChip,
            { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.colors.border },
          ]}
          onPress={() => handleSelectCorridor('Paris', 'Lyon')}
          accessibilityRole="button"
          accessibilityLabel="Quick corridor Paris to Lyon"
          testID="quick-corridor-paris-lyon"
        >
          <Text style={[styles.corridorChipText, { color: theme.colors.textPrimary }]}>
            Paris ➔ Lyon
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.corridorChip,
            { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.colors.border },
          ]}
          onPress={() => handleSelectCorridor('London', 'Paris')}
          accessibilityRole="button"
          accessibilityLabel="Quick corridor London to Paris"
          testID="quick-corridor-london-paris"
        >
          <Text style={[styles.corridorChipText, { color: theme.colors.textPrimary }]}>
            London ➔ Paris
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.corridorChip,
            { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.colors.border },
          ]}
          onPress={() => handleSelectCorridor('Milano', 'Roma')}
          accessibilityRole="button"
          accessibilityLabel="Quick corridor Milano to Roma"
          testID="quick-corridor-milano-roma"
        >
          <Text style={[styles.corridorChipText, { color: theme.colors.textPrimary }]}>
            Milano ➔ Roma
          </Text>
        </TouchableOpacity>
      </View>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#000000',
    letterSpacing: 0.5,
  },
  modeIndicator: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
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
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  swapDivider: {
    flex: 1,
    height: 1,
  },
  swapButton: {
    marginHorizontal: 8,
    borderWidth: 1,
  },
  modesSection: {
    marginBottom: 16,
  },
  modesLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
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
    marginBottom: 2,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  feedbackDetails: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  feedbackModes: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
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
  },
  trifectaCardDesc: {
    fontSize: 12,
    lineHeight: 16,
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
    gap: 4,
    marginTop: 4,
  },
  templateNoteText: {
    fontSize: 11,
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 2,
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
  },
  corridorChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  corridorChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
