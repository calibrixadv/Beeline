import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Animated,
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
  /** Optional corridor press callback (kept for backward compatibility) */
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
  animated = true,
  style,
  testID = 'marketing-showcase',
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* 1. Hero Showcase Card */}
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
              Beeline Rail Transit
            </Text>
          </View>
        </View>

        <Text
          accessibilityRole="header"
          aria-level={2}
          style={[
            styles.heroTitle,
            { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
          ]}
        >
          Plan your European rail journey
        </Text>

        <Text
          style={[
            styles.heroSubtitle,
            { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted },
          ]}
        >
          Search direct train corridors, check schedules, and explore routes across Romania and Europe.
        </Text>

        {/* Primary CTA */}
        <BaseButton
          variant="primary"
          size="lg"
          title="Explore Trains"
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
          accessibilityLabel="Explore Trains"
          testID="marketing-explore-btn"
        />
      </BaseCard>

      {/* 2. Three Pillars Showcase: Companion Guides */}
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
      >
        Why Beeline?
      </Text>
      <Text style={[styles.sectionSubtitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
        Thoughtful rail travel planning with our companion guides.
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
              backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
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
                  Direct Routes
                </Text>
              </View>
            </View>
            <BaseBadge
              label="SPEED"
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
            accessibilityRole="header"
            aria-level={3}
            style={[styles.pillarTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            Direct Rail Connections
          </Text>
          <Text style={[styles.pillarDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Fast point-to-point connections prioritizing direct travel and minimal station stops.
          </Text>
          <Text style={[styles.pillarMetric, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
            ⚡ Direct corridor routing
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
              backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
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
                  Transparent Pricing
                </Text>
              </View>
            </View>
            <BaseBadge
              label="VALUE"
              variant="warning"
              size="sm"
              style={{
                backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#FEF9C3',
                borderColor: isDark ? '#CA8A04' : '#FDE047',
                borderWidth: 1,
              }}
              textStyle={{ color: isDark ? '#FDE047' : '#854D0E' }}
            />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.pillarTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            Clear Fares & Schedules
          </Text>
          <Text style={[styles.pillarDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Upfront pricing with no hidden booking fees, helping you compare and find the best value for your trip.
          </Text>
          <Text style={[styles.pillarMetric, { color: isDark ? theme.colors.brandHoney : '#92400E' }]}>
            💰 Upfront fare comparisons
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
              backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
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
                  Comfortable Transfers
                </Text>
              </View>
            </View>
            <BaseBadge
              label="RELIABILITY"
              variant="success"
              size="sm"
              style={{
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
                borderColor: isDark ? '#059669' : '#86EFAC',
                borderWidth: 1,
              }}
              textStyle={{ color: isDark ? '#34D399' : '#15803D' }}
            />
          </View>
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.pillarTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
          >
            Protected Transfer Buffers
          </Text>
          <Text style={[styles.pillarDescription, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
            Sensible connection windows at major transfer stations so you can switch trains without rushing.
          </Text>
          <Text style={[styles.pillarMetric, { color: isDark ? theme.colors.success : '#15803D' }]}>
            🛡️ Generous connection buffers
          </Text>
        </BaseCard>
      </View>

      {/* 3. Featured Corridors (Static Informational Cards) */}
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal }]}
      >
        Featured Corridors
      </Text>
      <Text style={[styles.sectionSubtitle, { color: isDark ? theme.colors.textSecondary : theme.colors.textCharcoalMuted }]}>
        Direct routes connecting major Romanian metropolitan hubs and European gateways.
      </Text>

      {FEATURED_CORRIDORS.map((corridor, idx) => (
        <BaseCard
          key={`${corridor.from}-${corridor.to}-${idx}`}
          variant="outlined"
          padding="md"
          accessibilityLabel={`${corridor.from} to ${corridor.to}, ${corridor.operator}, ${corridor.duration}, ${corridor.price}`}
          testID={getCorridorTestId(corridor.from, corridor.to)}
          style={[
            styles.corridorCard,
            {
              backgroundColor: isDark ? '#1C1917' : theme.colors.surfaceWarm,
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
    flexWrap: 'wrap',
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
    lineHeight: 16,
    flexShrink: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
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
    lineHeight: 26,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 19,
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pillarMascotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  pillarMascotInfo: {
    flexDirection: 'column',
    flexShrink: 1,
  },
  pillarMascotName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    flexShrink: 1,
  },
  pillarMascotRole: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    flexShrink: 1,
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  pillarDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  pillarMetric: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
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
    gap: 8,
    marginBottom: 6,
  },
  corridorCity: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    flexShrink: 1,
  },
  corridorMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  waggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  waggleLine: {
    width: 14,
    minWidth: 4,
    flexShrink: 1,
    height: 2,
    borderRadius: 1,
  },
  waggleBeeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  waggleBee: {
    fontSize: 13,
    lineHeight: 16,
  },
  waggleTrail: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 15,
  },
});
