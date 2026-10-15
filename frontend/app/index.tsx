import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTripPlanner } from '../src/context/TripContext';
import { useTheme } from '../src/context/ThemeContext';
import { useScreenTransition } from '../src/context/ScreenTransitionContext';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';
import { BaseCard } from '../src/components/BaseCard';
import { BaseButton } from '../src/components/BaseButton';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();

  const { getTripItemCount } = useTripPlanner();
  const { navigateWithTransition } = useScreenTransition();
  const tripCount = getTripItemCount();

  const [fromCity, setFromCity] = useState('Paris');
  const [toCity, setToCity] = useState('Lyon');

  const handleNavigate = (path: string, message?: string) => {
    navigateWithTransition(path, { message: message || 'Switching screen...' });
  };

  const handleInstantAction = () => {
    handleNavigate('/trains', `Finding fastest Beeline trains from ${fromCity} to ${toCity}...`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Direct Action Terminal - Immediate Jump Into Action */}
        <BaseCard
          variant="elevated"
          padding="md"
          testID="direct-action-card"
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark ? '#141416' : '#FFFFFF',
              borderColor: isDark ? theme.colors.brandYellow : '#000000',
            },
          ]}
        >
          <View style={styles.actionHeader}>
            <View
              style={[
                styles.actionBadge,
                {
                  backgroundColor: theme.colors.brandYellow,
                },
              ]}
            >
              <Ionicons name="flash" size={14} color="#000000" />
              <Text style={styles.actionBadgeText}>DIRECT ACTION</Text>
            </View>
            <Text
              style={[
                styles.actionSubtitle,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Jump directly into booking
            </Text>
          </View>

          <Text
            style={[
              styles.actionTitle,
              {
                color: theme.colors.textPrimary,
              },
            ]}
          >
            Instant Rail Route Finder
          </Text>

          <View style={styles.inputsRow}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#1F1F23' : '#F4F4F5',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>FROM</Text>
              <TextInput
                value={fromCity}
                onChangeText={setFromCity}
                style={[styles.textInput, { color: theme.colors.textPrimary }]}
                placeholder="Departure station"
                placeholderTextColor={theme.colors.textMuted}
                accessibilityLabel="Departure station"
              />
            </View>

            <View style={styles.arrowBetween}>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.brandYellow} />
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#1F1F23' : '#F4F4F5',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>TO</Text>
              <TextInput
                value={toCity}
                onChangeText={setToCity}
                style={[styles.textInput, { color: theme.colors.textPrimary }]}
                placeholder="Destination station"
                placeholderTextColor={theme.colors.textMuted}
                accessibilityLabel="Destination station"
              />
            </View>
          </View>

          {/* Instant Action CTA Button */}
          <BaseButton
            variant="primary"
            size="lg"
            title="⚡ Instant Departure — Find & Book Now"
            onPress={handleInstantAction}
            style={[
              styles.instantActionBtn,
              {
                backgroundColor: theme.colors.brandYellow,
                borderColor: theme.colors.brandYellow,
              },
            ]}
            textStyle={{ color: '#000000', fontWeight: '800' }}
            accessibilityLabel="Instant Departure Find and Book Now"
          />

          {/* Quick One-Tap Jump Chips */}
          <View style={styles.quickChipsRow}>
            <Text style={[styles.quickChipsLabel, { color: theme.colors.textMuted }]}>
              Quick corridors:
            </Text>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.colors.border },
              ]}
              onPress={() => handleNavigate('/trains', 'Loading Paris to Lyon corridor...')}
            >
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>Paris ➔ Lyon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.colors.border },
              ]}
              onPress={() => handleNavigate('/trains', 'Loading London to Paris corridor...')}
            >
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>London ➔ Paris</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.colors.border },
              ]}
              onPress={() => handleNavigate('/trains', 'Loading Milano to Roma corridor...')}
            >
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>Milano ➔ Roma</Text>
            </TouchableOpacity>
          </View>
        </BaseCard>

        {/* Hero Section */}
        <View
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
            <Text style={[styles.heroBadgeText, { color: '#FFC700' }]}>Next-Gen Rail Planner</Text>
          </View>
          <Text style={styles.heroTitle}>Plan Your European Rail Journey</Text>
          <Text style={styles.heroSubtitle}>
            Fast high-speed corridors, live status tracking, stop-by-stop itineraries, and transparent eco-impact data.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.brandYellow }]}
            onPress={() => handleNavigate('/trains')}
            accessibilityRole="button"
            accessibilityLabel="Explore Train Routes"
          >
            <Ionicons name="train" size={20} color="#000000" />
            <Text style={[styles.primaryBtnText, { color: '#000000' }]}>Explore /trains Route</Text>
            <Ionicons name="arrow-forward" size={16} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Trip Status Card */}
        {tripCount > 0 ? (
          <TouchableOpacity
            style={[
              styles.tripStatusCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FEF9C3',
                borderColor: isDark ? theme.colors.brandYellow : '#FDE047',
              },
            ]}
            onPress={() => handleNavigate('/my-trip')}
            accessibilityRole="button"
            accessibilityLabel="View Active Trip Itinerary"
          >
            <View style={styles.tripStatusContent}>
              <Ionicons name="briefcase" size={24} color={isDark ? theme.colors.brandYellow : '#854D0E'} />
              <View style={styles.tripStatusText}>
                <Text
                  style={[
                    styles.tripStatusTitle,
                    { color: isDark ? '#FFFFFF' : '#854D0E' },
                  ]}
                >
                  Active Trip in Progress
                </Text>
                <Text
                  style={[
                    styles.tripStatusSubtitle,
                    { color: isDark ? theme.colors.brandYellow : '#A16207' },
                  ]}
                >
                  {tripCount} {tripCount === 1 ? 'train journey' : 'train journeys'} currently selected
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? theme.colors.brandYellow : '#854D0E'} />
          </TouchableOpacity>
        ) : null}

        {/* Feature Highlights */}
        <Text
          style={[
            styles.sectionHeader,
            {
              color: theme.colors.textPrimary,
            },
          ]}
        >
          Why Plan With VoyageRail?
        </Text>
        <View style={styles.featureGrid}>
          <View
            style={[
              styles.featureItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#EFF6FF' }]}>
              <Ionicons name="speedometer" size={22} color={isDark ? theme.colors.brandYellow : '#2563EB'} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Live Status</Text>
            <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
              Real-time delay tracking, platform assignments, and boarding updates.
            </Text>
          </View>

          <View
            style={[
              styles.featureItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#DCFCE7' }]}>
              <Ionicons name="leaf" size={22} color={isDark ? '#34D399' : '#166534'} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Eco Impact</Text>
            <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
              Detailed CO₂ footprint analytics demonstrating cleaner travel than flights.
            </Text>
          </View>

          <View
            style={[
              styles.featureItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#FEF3C7' }]}>
              <Ionicons name="map" size={22} color={isDark ? theme.colors.brandYellow : '#B45309'} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Stop Details</Text>
            <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
              Inspect intermediate stops, arrival timetables, and platform numbers.
            </Text>
          </View>

          <View
            style={[
              styles.featureItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#27272A' : '#F3E8FF' }]}>
              <Ionicons name="card" size={22} color={isDark ? '#A78BFA' : '#7E22CE'} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>Tiered Fares</Text>
            <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
              Standard, First, Business, and Sleeper compartments with seat counts.
            </Text>
          </View>
        </View>

        {/* Popular Corridors */}
        <Text
          style={[
            styles.sectionHeader,
            {
              color: theme.colors.textPrimary,
            },
          ]}
        >
          Featured High-Speed Corridors
        </Text>
        <TouchableOpacity
          style={[
            styles.corridorCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => handleNavigate('/trains', 'Loading Paris to Lyon timetable...')}
        >
          <View style={styles.corridorRoute}>
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>Paris</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.brandYellow} />
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>Lyon</Text>
          </View>
          <Text style={[styles.corridorMeta, { color: theme.colors.textSecondary }]}>
            TGV INOUI • 1h 56m direct • from €49.00
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.corridorCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => handleNavigate('/trains', 'Loading London to Paris timetable...')}
        >
          <View style={styles.corridorRoute}>
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>London</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.brandYellow} />
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>Paris</Text>
          </View>
          <Text style={[styles.corridorMeta, { color: theme.colors.textSecondary }]}>
            Eurostar • 2h 23m direct • from €92.00
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.corridorCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => handleNavigate('/trains', 'Loading Milano to Roma timetable...')}
        >
          <View style={styles.corridorRoute}>
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>Milano</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.brandYellow} />
            <Text style={[styles.corridorCity, { color: theme.colors.textPrimary }]}>Roma</Text>
          </View>
          <Text style={[styles.corridorMeta, { color: theme.colors.textSecondary }]}>
            Frecciarossa • 3h 05m direct • from €54.90
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Trip Summary if items exist */}
      <TripSummaryBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  actionCard: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  textInput: {
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  arrowBetween: {
    paddingHorizontal: 2,
  },
  instantActionBtn: {
    borderRadius: 10,
    marginBottom: 12,
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChipsLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tripStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  tripStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tripStatusText: {
    flex: 1,
  },
  tripStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tripStatusSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 12,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  featureItem: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  featureIconBox: {
    width: 38,
    height: 38,
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
  corridorCard: {
    borderRadius: 12,
    padding: 14,
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
});
