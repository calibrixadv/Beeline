import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTripPlanner } from '../src/context/TripContext';
import { useTheme } from '../src/context/ThemeContext';
import { useScreenTransition } from '../src/context/ScreenTransitionContext';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';
import { RouteFinderCard, RouteSearchParams } from '../src/components/RouteFinderCard';
import { MarketingShowcase, FeaturedCorridor } from '../src/components/MarketingShowcase';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { getTripItemCount } = useTripPlanner();
  const { navigateWithTransition } = useScreenTransition();
  const tripCount = getTripItemCount();

  const handleNavigate = (path: string, message?: string) => {
    navigateWithTransition(path, { message: message || 'Switching screen...' });
  };

  // Submission handler prepared for the route finder shorthand:
  // Strictly without actual route redirection (as explicitly specified: "do not implement the feature redirect")
  const handleRouteFinderSubmit = (_params: RouteSearchParams) => {
    // Intentionally no navigation/redirection executed here.
    // The RouteFinderCard internally renders prepared submission feedback.
  };

  const handleExploreTrains = () => {
    handleNavigate('/trains', 'Exploring Romanian & European rail corridors...');
  };

  const handleCorridorExplore = (corridor: FeaturedCorridor) => {
    const routeMsg = corridor?.from && corridor?.to
      ? `Loading ${corridor.from} to ${corridor.to} timetable...`
      : 'Loading timetable...';
    handleNavigate('/trains', routeMsg);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Role 1: Shorthand 2-point route finder with transport filters & prepared submission (No Redirect) */}
        <RouteFinderCard
          testID="home-route-finder-card"
          onSubmitRoute={handleRouteFinderSubmit}
        />

        {/* Active Trip Status Indicator (if trips exist in itinerary) */}
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
            testID="home-active-trip-banner"
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

        {/* Role 2: Clean marketing showcase placeholders promoting Beeline capabilities, speed, and cross-border coverage */}
        <MarketingShowcase
          testID="home-marketing-showcase"
          onExplorePress={handleExploreTrains}
          onCorridorPress={handleCorridorExplore}
        />
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
    paddingBottom: 32,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  tripStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
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
});
