import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';
import { MascotBee } from './MascotBee';

export interface FeaturedCorridor {
  from: string;
  to: string;
  operator: string;
  duration: string;
  price: string;
}

export interface MarketingShowcaseProps {
  /** Callback when user clicks the primary hero CTA */
  onExplorePress?: () => void;
  /** Callback when user clicks a featured corridor card */
  onCorridorPress?: (corridor: FeaturedCorridor) => void;
  /** Whether waggle flight paths and mascots animate. Defaults to true. */
  animated?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

export const getCorridorTestId = (from: string, to: string): string => {
  const slug = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `featured-corridor-${slug(from)}-${slug(to)}`;
};

export const FEATURED_CORRIDORS: FeaturedCorridor[] = [
  {
    from: 'București Nord',
    to: 'Brașov',
    operator: 'CFR IR / Astra Trans Carpatic',
    duration: '2h 15m direct',
    price: 'from 48 lei (~€9.60)',
  },
  {
    from: 'București Nord',
    to: 'Constanța',
    operator: 'CFR IR Sun Train',
    duration: '2h 00m direct',
    price: 'from 65 lei (~€13.00)',
  },
  {
    from: 'Cluj-Napoca',
    to: 'București Nord',
    operator: 'InterRegio Nightjet / Sleeper',
    duration: '8h 30m',
    price: 'from 115 lei (~€23.00)',
  },
  {
    from: 'București Nord',
    to: 'Viena Hbf',
    operator: 'Dacia EuroNight 346',
    duration: '18h 45m direct',
    price: 'from €39.00',
  },
];

export interface WaggleFlightPathProps {
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const WaggleFlightPath: React.FC<WaggleFlightPathProps> = ({
  animated = true,
  style,
  testID = 'waggle-flight-path',
}) => {
  const { theme, isDark } = useTheme();
  const waggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      waggleAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waggleAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(waggleAnim, {
          toValue: -1,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    // Safeguard for test environment to avoid lingering timers
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      loop.stop();
      return;
    }

    return () => {
      loop.stop();
    };
  }, [animated, waggleAnim]);

  const waggleRotate = waggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  const waggleY = waggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-1.5, 1.5],
  });

  return (
    <View testID={testID} style={[styles.waggleContainer, style]}>
      {/* Leading line */}
      <View
        testID="waggle-line-leading"
        style={[
          styles.waggleLine,
          { backgroundColor: isDark ? theme.colors.brandHoneyDark : theme.colors.honeyBorder },
        ]}
      />
      {/* Waggle Bee & flight wave trail */}
      <Animated.View
        testID="waggle-bee-trail"
        style={[
          styles.waggleBeeWrapper,
          {
            transform: [{ translateY: waggleY }, { rotate: waggleRotate }],
          },
        ]}
      >
        <Text style={styles.waggleBee}>🐝</Text>
        <Text
          style={[
            styles.waggleTrail,
            { color: isDark ? theme.colors.brandHoney : '#92400E' },
          ]}
        >
          ~ ~
        </Text>
      </Animated.View>
      {/* Trailing line */}
      <View
        testID="waggle-line-trailing"
        style={[
          styles.waggleLine,
          { backgroundColor: isDark ? theme.colors.brandHoneyDark : theme.colors.honeyBorder },
        ]}
      />
    </View>
  );
};

export const MarketingShowcase: React.FC<MarketingShowcaseProps> = ({
  onExplorePress,
  onCorridorPress,
  animated = true,
  style,
  testID = 'marketing-showcase',
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 520;

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* 1. Hero Showcase Card in Warm Honey Palette */}
      <BaseCard
        variant="elevated"
        padding="lg"
        testID="marketing-hero-card"
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
            borderColor: isDark ? '#D97706' : theme.colors.honeyBorder,
          },
        ]}
      >
        <View style={styles.heroBadgeRow}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                borderColor: isDark ? '#D97706' : '#FDE68A',
              },
            ]}
          >
            <MascotBee name="barnaby" size="sm" animated={animated} />
            <Text
              style={[
                styles.heroBadgeText,
                { color: isDark ? theme.colors.brandHoney : '#92400E' },
              ]}
            >
              Beeline High-Speed Transit
            </Text>
          </View>
        </View>

        <Text
          accessibilityRole="header"
          aria-level={3}
          style={[
            styles.heroPreTitle,
            { color: isDark ? theme.colors.brandHoney : '#92400E' },
          ]}
        >
          Plan Your European Rail Journey
        </Text>

        <Text
          accessibilityRole="header"
          aria-level={2}
          style={[
            styles.heroTitle,
            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
          ]}
        >
          Make a beeline across Romania & Europe
        </Text>

        <Text
          style={[
            styles.heroSubtitle,
            { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
          ]}
        >
          Fast, sweet, stress-free rail journeys. High-speed corridors, live status tracking, stop-by-stop itineraries, and transparent eco-impact data.
        </Text>

        {/* Primary CTA */}
        <BaseButton
          variant="primary"
          size="lg"
          title="Explore /trains Route"
          onPress={onExplorePress}
          iconLeft={<Ionicons name="train" size={20} color="#1C1917" />}
          iconRight={<Ionicons name="arrow-forward" size={16} color="#1C1917" />}
          style={[
            styles.heroButton,
            {
              backgroundColor: theme.colors.brandHoney,
              borderColor: theme.colors.brandHoneyDark,
            },
          ]}
          textStyle={{ color: '#1C1917', fontWeight: '800' }}
          accessibilityLabel="Explore /trains Route"
          testID="marketing-explore-btn"
        />
      </BaseCard>

      {/* 2. Three Pillars Showcase: Curated Trifecta Mascots */}
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
      >
        Why Plan With Beeline?
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
        Meet the Mascot Trifecta — engineered for speed, smart value intelligence, and reliable Romanian transfer protection.
      </Text>

      <View style={styles.pillarsGrid}>
        {/* Pillar 1: Speed (Barnaby the Scout) */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="pillar-speed-card"
          style={[
            styles.pillarCard,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={styles.pillarMascotWrapper}>
              <MascotBee name="barnaby" size="md" animated={animated} />
              <View style={styles.pillarMascotInfo}>
                <Text style={[styles.pillarMascotName, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}>
                  Barnaby the Scout
                </Text>
                <Text style={[styles.pillarMascotRole, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
                  Direct High-Speed
                </Text>
              </View>
            </View>
            <BaseBadge label="SPEED" variant="warning" size="sm" />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.pillarTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            300+ km/h High-Speed
          </Text>
          <Text style={[styles.pillarDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            City-center to city-center corridors engineered for maximum velocity with Barnaby. Direct Romanian & European rail connections up to 4x faster than air.
          </Text>
          <Text style={[styles.pillarMetric, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
            ⚡ Instant timetable routing
          </Text>
        </BaseCard>

        {/* Pillar 2: Value (Honey the Hive Saver) */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="pillar-coverage-card"
          style={[
            styles.pillarCard,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={styles.pillarMascotWrapper}>
              <MascotBee name="honey" size="md" animated={animated} />
              <View style={styles.pillarMascotInfo}>
                <Text style={[styles.pillarMascotName, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}>
                  Honey the Hive Saver
                </Text>
                <Text style={[styles.pillarMascotRole, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
                  15+ European Countries
                </Text>
              </View>
            </View>
            <BaseBadge label="VALUE" variant="info" size="sm" />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.pillarTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            Smart €10/Hour Value Engine
          </Text>
          <Text style={[styles.pillarDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Honey evaluates every journey against the smart €10/hour rule (~50 lei/hr). Faster trains outrank buses unless road savings beat the threshold.
          </Text>
          <Text style={[styles.pillarMetric, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
            💰 Honey's Nectar Jar savings
          </Text>
        </BaseCard>

        {/* Pillar 3: Reliability (Bumble the Buffer Guard) */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="pillar-capabilities-card"
          style={[
            styles.pillarCard,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={styles.pillarMascotWrapper}>
              <MascotBee name="bumble" size="md" animated={animated} />
              <View style={styles.pillarMascotInfo}>
                <Text style={[styles.pillarMascotName, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}>
                  Bumble the Buffer Guard
                </Text>
                <Text style={[styles.pillarMascotRole, { color: isDark ? theme.colors.success : '#15803D' }]}>
                  Multi-Modal & Live Sync
                </Text>
              </View>
            </View>
            <BaseBadge label="RELIABILITY" variant="success" size="sm" />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.pillarTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            Romanian Transfer Shield (25–35 min buffers)
          </Text>
          <Text style={[styles.pillarDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Bumble safeguards your trip with generous 25–35 min buffers at key Romanian junctions to safeguard against CFR delay vulnerabilities.
          </Text>
          <Text style={[styles.pillarMetric, { color: isDark ? theme.colors.success : '#15803D' }]}>
            🛡️ Bumble's safe transfer shield guarantee
          </Text>
        </BaseCard>
      </View>

      {/* 3. High-Impact Feature Highlights (Curated Trifecta Value Propositions) */}
      <View style={styles.featureGrid} testID="marketing-feature-grid">
        <View
          testID="feature-card-direct-corridors"
          style={[
            styles.featureItem,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#EFF6FF' }]}>
            <Ionicons name="flash" size={20} color={isDark ? theme.colors.brandYellow : '#2563EB'} />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={4}
            style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            ⚡ High-Speed & Direct Romanian Corridors
          </Text>
          <Text style={[styles.featureDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Direct InterRegio and Astra Trans Carpatic corridors connecting Bucharest, Brașov, Constanța, and Cluj.
          </Text>
        </View>

        <View
          testID="feature-card-value-engine"
          style={[
            styles.featureItem,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#FEF3C7' }]}>
            <Ionicons name="cash-outline" size={20} color={isDark ? theme.colors.brandYellow : '#B45309'} />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={4}
            style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            💰 Smart €10/Hour Value Engine
          </Text>
          <Text style={[styles.featureDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Time saved valued at €10/hr (~50 RON/hr); faster rail outranks buses unless road savings exceed the threshold.
          </Text>
        </View>

        <View
          testID="feature-card-transfer-shield"
          style={[
            styles.featureItem,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#EFF6FF' }]}>
            <Ionicons name="shield-checkmark" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={4}
            style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            🛡️ Romanian Transfer Shield (25–35 min buffers)
          </Text>
          <Text style={[styles.featureDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Generous 25–35 min buffer protection at key Romanian junctions to safeguard against network delay vulnerabilities.
          </Text>
        </View>

        <View
          testID="feature-card-eco-savings"
          style={[
            styles.featureItem,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#DCFCE7' }]}>
            <Ionicons name="leaf" size={20} color={isDark ? '#34D399' : '#166534'} />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={4}
            style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            🌿 Eco CO₂ Savings over DN1 and regional flights
          </Text>
          <Text style={[styles.featureDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Up to 85% lower carbon footprint than congested DN1 road traffic and regional short-haul air corridors.
          </Text>
        </View>
      </View>

      {/* 4. Cross-Border European Metrics Bar */}
      <BaseCard
        variant="flat"
        padding="md"
        testID="marketing-metrics-card"
        style={[
          styles.metricsCard,
          {
            backgroundColor: isDark ? '#18181B' : theme.colors.surfaceWarm,
            borderColor: theme.colors.honeyBorder,
          },
        ]}
      >
        <View style={[styles.metricItem, isNarrow && styles.metricItemNarrow]}>
          <Text style={[styles.metricNumber, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>300+</Text>
          <Text style={[styles.metricLabel, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            km/h Speed
          </Text>
        </View>
        {!isNarrow && <View style={[styles.metricDivider, { backgroundColor: theme.colors.honeyBorder }]} />}
        <View style={[styles.metricItem, isNarrow && styles.metricItemNarrow]}>
          <Text style={[styles.metricNumber, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>15+</Text>
          <Text style={[styles.metricLabel, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            EU Countries
          </Text>
        </View>
        {!isNarrow && <View style={[styles.metricDivider, { backgroundColor: theme.colors.honeyBorder }]} />}
        <View style={[styles.metricItem, isNarrow && styles.metricItemNarrow]}>
          <Text style={[styles.metricNumber, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>10k+</Text>
          <Text style={[styles.metricLabel, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Stations
          </Text>
        </View>
        {!isNarrow && <View style={[styles.metricDivider, { backgroundColor: theme.colors.honeyBorder }]} />}
        <View style={[styles.metricItem, isNarrow && styles.metricItemNarrow]}>
          <Text style={[styles.metricNumber, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>85%</Text>
          <Text style={[styles.metricLabel, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Less CO₂
          </Text>
        </View>
      </BaseCard>

      {/* 5. Featured High-Speed Corridors & Waggle Flight Paths */}
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
      >
        Featured High-Speed Corridors
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
        Direct routes connecting major Romanian metropolitan hubs and European gateways.
      </Text>

      {FEATURED_CORRIDORS.map((corridor, idx) => (
        <BaseCard
          key={`${corridor.from}-${corridor.to}-${idx}`}
          variant="outlined"
          padding="md"
          onPress={onCorridorPress ? () => onCorridorPress(corridor) : undefined}
          accessibilityRole={onCorridorPress ? 'button' : undefined}
          accessibilityLabel={`Explore route from ${corridor.from} to ${corridor.to}, ${corridor.operator}, ${corridor.duration}, ${corridor.price}`}
          testID={getCorridorTestId(corridor.from, corridor.to)}
          style={[
            styles.corridorCard,
            {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceWarm,
              borderColor: theme.colors.honeyBorder,
            },
          ]}
        >
          <View style={styles.corridorRoute}>
            <Text
              numberOfLines={1}
              style={[styles.corridorCity, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
            >
              {corridor.from}
            </Text>
            <WaggleFlightPath testID="waggle-flight-path" animated={animated} />
            <Text
              numberOfLines={1}
              style={[styles.corridorCity, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
            >
              {corridor.to}
            </Text>
          </View>
          <Text style={[styles.corridorMeta, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            {corridor.operator} • {corridor.duration} • {corridor.price}
          </Text>
        </BaseCard>
      ))}

      {/* 6. Multi-Operator Trust Banner */}
      <BaseCard
        variant="flat"
        padding="md"
        testID="marketing-trust-card"
        style={[
          styles.trustCard,
          {
            backgroundColor: isDark ? '#141416' : theme.colors.surfaceWarm,
            borderColor: theme.colors.honeyBorder,
          },
        ]}
      >
        <View style={styles.trustHeader}>
          <Ionicons name="shield-checkmark" size={18} color={isDark ? theme.colors.brandHoney : '#92400E'} />
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.trustTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            Unified European Rail Booking with Beeline
          </Text>
        </View>
        <Text style={[styles.trustSubtitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
          Aggregating CFR Călători, Astra Trans Carpatic, Transferoviar Călători, ÖBB, and European operators into one unified experience.
        </Text>
      </BaseCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroPreTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  pillarCard: {
    flexBasis: 280,
    flexGrow: 1,
    minWidth: 220,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pillarMascotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillarMascotInfo: {
    flexDirection: 'column',
  },
  pillarMascotName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillarMascotRole: {
    fontSize: 11,
    fontWeight: '600',
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  pillarDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  pillarMetric: {
    fontSize: 12,
    fontWeight: '700',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  featureItem: {
    flexBasis: 260,
    flexGrow: 1,
    minWidth: 200,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricsCard: {
    borderRadius: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  metricItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 64,
    flexGrow: 1,
  },
  metricItemNarrow: {
    flexBasis: '44%',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  corridorCard: {
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  corridorRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  corridorCity: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  corridorMeta: {
    fontSize: 12,
  },
  waggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    flexShrink: 1,
  },
  waggleLine: {
    width: 12,
    minWidth: 4,
    flexShrink: 1,
    height: 2,
    borderRadius: 1,
  },
  waggleBeeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waggleBee: {
    fontSize: 13,
  },
  waggleTrail: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -1,
  },
  trustCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trustSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
