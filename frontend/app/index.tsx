import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTripPlanner } from '../src/context/TripContext';
import { useTheme } from '../src/context/ThemeContext';
import { useScreenTransition } from '../src/context/ScreenTransitionContext';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';
import { RouteFinderCard, RouteSearchParams } from '../src/components/RouteFinderCard';
import { MarketingShowcase, FeaturedCorridor } from '../src/components/MarketingShowcase';
import { CozyHoneyBackground } from '../src/components/CozyHoneyBackground';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { getTripItemCount } = useTripPlanner();
  const { navigateWithTransition } = useScreenTransition();
  const tripCount = getTripItemCount();

  const [isTripHovered, setIsTripHovered] = useState(false);
  const [isTripFocused, setIsTripFocused] = useState(false);
  const [isTripPressed, setIsTripPressed] = useState(false);

  const handleNavigate = (path: string, message?: string) => {
    navigateWithTransition(path, { message: message || 'Buzzing to destination...' });
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
    <View style={[styles.screen, { backgroundColor: theme.colors.brandCream }]}>
      <CozyHoneyBackground testID="home-cozy-background" style={styles.cozyBackground}>
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
            <Pressable
              style={[
                styles.tripStatusCard,
                {
                  backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
                  borderColor: isDark ? theme.colors.brandHoneyDark : theme.colors.honeyBorder,
                },
                isTripHovered && styles.tripStatusCardHovered,
                isTripPressed && styles.tripStatusCardPressed,
                isTripFocused && [
                  styles.tripStatusCardFocused,
                  Platform.OS === 'web'
                    ? ({
                        outlineColor: theme.colors.brandHoney,
                        outlineStyle: 'solid',
                        outlineWidth: 2,
                        outlineOffset: 2,
                        cursor: 'pointer',
                      } as any)
                    : { borderColor: theme.colors.brandHoney, borderWidth: 2 },
                ],
              ]}
              focusable={true}
              onPress={() => handleNavigate('/my-trip', 'Buzzing to your active trip itinerary...')}
              onPressIn={() => setIsTripPressed(true)}
              onPressOut={() => setIsTripPressed(false)}
              onHoverIn={() => setIsTripHovered(true)}
              onHoverOut={() => setIsTripHovered(false)}
              onFocus={() => setIsTripFocused(true)}
              onBlur={() => setIsTripFocused(false)}
              accessibilityRole="button"
              accessibilityLabel="View Active Trip Itinerary"
              testID="home-active-trip-banner"
            >
              <View style={styles.tripStatusContent}>
                <View
                  style={[
                    styles.tripStatusBadge,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FDE68A',
                      borderColor: isDark ? '#D97706' : '#F59E0B',
                    },
                  ]}
                >
                  <Ionicons
                    name="briefcase"
                    size={20}
                    color={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
                  />
                </View>
                <View style={styles.tripStatusText}>
                  <Text
                    accessibilityRole="header"
                    aria-level={3}
                    style={[
                      styles.tripStatusTitle,
                      { color: isDark ? '#FFFFFF' : theme.colors.textCharcoal },
                    ]}
                  >
                    Active Trip in Progress
                  </Text>
                  <Text
                    style={[
                      styles.tripStatusSubtitle,
                      { color: isDark ? '#F59E0B' : '#92400E' },
                    ]}
                  >
                    {tripCount} {tripCount === 1 ? 'train journey' : 'train journeys'} currently selected
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDark ? theme.colors.brandHoney : theme.colors.brandHoneyDark}
              />
            </Pressable>
          ) : null}

          {/* Role 2: Clean marketing showcase placeholders promoting Beeline capabilities, speed, and cross-border coverage */}
          <MarketingShowcase
            testID="home-marketing-showcase"
            onExplorePress={handleExploreTrains}
            onCorridorPress={handleCorridorExplore}
          />
        </ScrollView>
      </CozyHoneyBackground>

      {/* Sticky Trip Summary if items exist */}
      <TripSummaryBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  cozyBackground: {
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
    borderWidth: 1.5,
  },
  tripStatusCardHovered: {
    transform: [{ translateY: -2 }],
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  tripStatusCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  tripStatusCardFocused: {
    borderColor: '#F59E0B',
  },
  tripStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tripStatusBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
    fontWeight: '600',
  },
});
