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
import { useTheme, ThemeTokens } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseInput } from './BaseInput';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';
import { IconButton } from './IconButton';
import { MascotBee } from './MascotBee';

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

      {/* 2-Point Inputs with Swap Action & Waggle Flight Connector */}
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
            leftIcon={<Ionicons name="navigate-circle-outline" size={18} color={theme.colors.brandHoney} />}
            clearable
            testID="route-origin-input"
            accessibilityLabel="Origin point input"
          />
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
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            onClear={() => {
              setDestination('');
              setValidationError(null);
              setSubmittedQuery(null);
            }}
            leftIcon={<Ionicons name="location-outline" size={18} color={theme.colors.brandHoney} />}
            clearable
            testID="route-destination-input"
            accessibilityLabel="Destination point input"
          />
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
});
