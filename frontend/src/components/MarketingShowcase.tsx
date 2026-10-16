import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BaseCard } from './BaseCard';
import { BaseButton } from './BaseButton';
import { BaseBadge } from './BaseBadge';

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

export const MarketingShowcase: React.FC<MarketingShowcaseProps> = ({
  onExplorePress,
  onCorridorPress,
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
            backgroundColor: isDark ? '#141416' : '#0F172A',
            borderColor: isDark ? '#27272A' : '#1E293B',
          },
        ]}
      >
        <View
          style={[
            styles.heroBadge,
            {
              backgroundColor: 'rgba(255, 199, 0, 0.15)',
            },
          ]}
        >
          <Ionicons name="sparkles" size={14} color="#FFC700" />
          <Text style={[styles.heroBadgeText, { color: '#FFC700' }]}>Beeline High-Speed Transit</Text>
        </View>

        <Text style={styles.heroTitle}>Plan Your European Rail Journey</Text>
        <Text style={styles.heroSubtitle}>
          Fast high-speed corridors, live status tracking, stop-by-stop itineraries, and transparent eco-impact data.
        </Text>

        {/* Primary CTA */}
        <BaseButton
          variant="primary"
          size="lg"
          title="Explore /trains Route"
          onPress={onExplorePress}
          iconLeft={<Ionicons name="train" size={20} color="#000000" />}
          iconRight={<Ionicons name="arrow-forward" size={16} color="#000000" />}
          style={[
            styles.heroButton,
            {
              backgroundColor: theme.colors.brandYellow,
              borderColor: theme.colors.brandYellow,
            },
          ]}
          textStyle={{ color: '#000000', fontWeight: '800' }}
          accessibilityLabel="Explore /trains Route"
          testID="marketing-explore-btn"
        />
      </BaseCard>

      {/* 2. Three Pillars Showcase: Speed, Cross-Border Coverage, App Capabilities */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        Why Plan With Beeline?
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
        Engineered for speed, cross-border European reach, and modern mobility intelligence.
      </Text>

      <View style={styles.pillarsGrid}>
        {/* Pillar 1: Speed */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="pillar-speed-card"
          style={[
            styles.pillarCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#3E3204' : '#FEF3C7' }]}>
              <Ionicons name="flash" size={20} color={theme.colors.brandYellowDark} />
            </View>
            <BaseBadge label="SPEED" variant="warning" size="sm" />
          </View>
          <Text style={[styles.pillarTitle, { color: theme.colors.textPrimary }]}>
            300+ km/h High-Speed
          </Text>
          <Text style={[styles.pillarDescription, { color: theme.colors.textSecondary }]}>
            City-center to city-center corridors engineered for maximum velocity. Up to 4x faster than air travel door-to-door.
          </Text>
          <Text style={[styles.pillarMetric, { color: theme.colors.brandYellowDark }]}>
            ⚡ Instant timetable routing
          </Text>
        </BaseCard>

        {/* Pillar 2: Cross-Border European Coverage */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="pillar-coverage-card"
          style={[
            styles.pillarCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
              <Ionicons name="globe-outline" size={20} color="#3B82F6" />
            </View>
            <BaseBadge label="COVERAGE" variant="info" size="sm" />
          </View>
          <Text style={[styles.pillarTitle, { color: theme.colors.textPrimary }]}>
            15+ European Countries
          </Text>
          <Text style={[styles.pillarDescription, { color: theme.colors.textSecondary }]}>
            Frictionless cross-border transit across France, Germany, the UK, Italy, Spain, Austria, and Switzerland.
          </Text>
          <Text style={[styles.pillarMetric, { color: '#3B82F6' }]}>
            🌍 10,000+ connected stations
          </Text>
        </BaseCard>

        {/* Pillar 3: Advanced App Capabilities */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="pillar-capabilities-card"
          style={[
            styles.pillarCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
              <Ionicons name="layers-outline" size={20} color="#10B981" />
            </View>
            <BaseBadge label="CAPABILITIES" variant="success" size="sm" />
          </View>
          <Text style={[styles.pillarTitle, { color: theme.colors.textPrimary }]}>
            Multi-Modal & Live Sync
          </Text>
          <Text style={[styles.pillarDescription, { color: theme.colors.textSecondary }]}>
            Integrated Trains, Metro, and Busses with live delay tracking, platform assignments, and compartment availability.
          </Text>
          <Text style={[styles.pillarMetric, { color: '#10B981' }]}>
            🌱 85% lower CO₂ emissions
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
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#EFF6FF' }]}>
            <Ionicons name="flash" size={20} color={isDark ? theme.colors.brandYellow : '#2563EB'} />
          </View>
          <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
            ⚡ High-Speed & Direct Romanian Corridors
          </Text>
          <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
            Direct InterRegio and Astra Trans Carpatic corridors connecting Bucharest, Brașov, Constanța, and Cluj.
          </Text>
        </View>

        <View
          testID="feature-card-value-engine"
          style={[
            styles.featureItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#FEF3C7' }]}>
            <Ionicons name="cash-outline" size={20} color={isDark ? theme.colors.brandYellow : '#B45309'} />
          </View>
          <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
            💰 Smart €10/Hour Value Engine
          </Text>
          <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
            Time saved valued at €10/hr (~50 RON/hr); faster rail outranks buses unless road savings exceed the threshold.
          </Text>
        </View>

        <View
          testID="feature-card-transfer-shield"
          style={[
            styles.featureItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#EFF6FF' }]}>
            <Ionicons name="shield-checkmark" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
          </View>
          <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
            🛡️ Romanian Transfer Shield (25–35 min buffers)
          </Text>
          <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
            Generous 25–35 min buffer protection at key Romanian junctions to safeguard against network delay vulnerabilities.
          </Text>
        </View>

        <View
          testID="feature-card-eco-savings"
          style={[
            styles.featureItem,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#DCFCE7' }]}>
            <Ionicons name="leaf" size={20} color={isDark ? '#34D399' : '#166534'} />
          </View>
          <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
            🌿 Eco CO₂ Savings over DN1 and regional flights
          </Text>
          <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
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
            backgroundColor: isDark ? '#18181B' : '#F4F4F5',
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.metricItem}>
          <Text style={[styles.metricNumber, { color: theme.colors.brandYellow }]}>300+</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>km/h Speed</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricNumber, { color: theme.colors.brandYellow }]}>15+</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>EU Countries</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricNumber, { color: theme.colors.brandYellow }]}>10k+</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Stations</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricNumber, { color: theme.colors.brandYellow }]}>85%</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Less CO₂</Text>
        </View>
      </BaseCard>

      {/* 5. Featured High-Speed Corridors */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
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
          accessibilityLabel={`Explore route from ${corridor.from} to ${corridor.to}`}
          testID={getCorridorTestId(corridor.from, corridor.to)}
          style={[
            styles.corridorCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.corridorRoute}>
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>
              {corridor.from}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.brandYellow} />
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>
              {corridor.to}
            </Text>
          </View>
          <Text style={[styles.corridorMeta, { color: theme.colors.textSecondary }]}>
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
            backgroundColor: isDark ? '#141416' : '#FAFAFA',
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.trustHeader}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.brandYellow} />
          <Text style={[styles.trustTitle, { color: theme.colors.textPrimary }]}>
            Unified European Rail Booking with Beeline
          </Text>
        </View>
        <Text style={[styles.trustSubtitle, { color: theme.colors.textSecondary }]}>
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
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 20,
  },
  heroButton: {
    borderRadius: 12,
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
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  pillarCard: {
    borderRadius: 14,
    borderWidth: 1,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexBasis: '47%',
    flexGrow: 1,
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
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
    paddingVertical: 6,
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
    gap: 8,
    marginBottom: 4,
  },
  corridorCity: {
    fontSize: 15,
    fontWeight: '700',
  },
  corridorMeta: {
    fontSize: 12,
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
