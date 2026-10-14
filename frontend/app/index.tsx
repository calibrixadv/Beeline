import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTripPlanner } from '../src/context/TripContext';
import { TripSummaryBanner } from '../src/components/TripSummaryBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { getTripItemCount } = useTripPlanner();
  const tripCount = getTripItemCount();

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color="#3B82F6" />
            <Text style={styles.heroBadgeText}>Next-Gen Rail Planner</Text>
          </View>
          <Text style={styles.heroTitle}>Plan Your European Rail Journey</Text>
          <Text style={styles.heroSubtitle}>
            Fast high-speed corridors, live status tracking, stop-by-stop itineraries, and transparent eco-impact data.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/trains')}
            accessibilityRole="button"
            accessibilityLabel="Explore Train Routes"
          >
            <Ionicons name="train" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Explore /trains Route</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Trip Status Card */}
        {tripCount > 0 ? (
          <TouchableOpacity
            style={styles.tripStatusCard}
            onPress={() => router.push('/my-trip')}
            accessibilityRole="button"
            accessibilityLabel="View Active Trip Itinerary"
          >
            <View style={styles.tripStatusContent}>
              <Ionicons name="briefcase" size={24} color="#2563EB" />
              <View style={styles.tripStatusText}>
                <Text style={styles.tripStatusTitle}>Active Trip in Progress</Text>
                <Text style={styles.tripStatusSubtitle}>
                  {tripCount} {tripCount === 1 ? 'train journey' : 'train journeys'} currently selected
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        ) : null}

        {/* Feature Highlights */}
        <Text style={styles.sectionHeader}>Why Plan With VoyageRail?</Text>
        <View style={styles.featureGrid}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="speedometer" size={22} color="#2563EB" />
            </View>
            <Text style={styles.featureTitle}>Live Status</Text>
            <Text style={styles.featureDescription}>
              Real-time delay tracking, platform assignments, and boarding updates.
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="leaf" size={22} color="#166534" />
            </View>
            <Text style={styles.featureTitle}>Eco Impact</Text>
            <Text style={styles.featureDescription}>
              Detailed CO₂ footprint analytics demonstrating cleaner travel than flights.
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="map" size={22} color="#B45309" />
            </View>
            <Text style={styles.featureTitle}>Stop Details</Text>
            <Text style={styles.featureDescription}>
              Inspect intermediate stops, arrival timetables, and platform numbers.
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="card" size={22} color="#7E22CE" />
            </View>
            <Text style={styles.featureTitle}>Tiered Fares</Text>
            <Text style={styles.featureDescription}>
              Standard, First, Business, and Sleeper compartments with seat counts.
            </Text>
          </View>
        </View>

        {/* Popular Corridors */}
        <Text style={styles.sectionHeader}>Featured High-Speed Corridors</Text>
        <TouchableOpacity
          style={styles.corridorCard}
          onPress={() => router.push('/trains')}
        >
          <View style={styles.corridorRoute}>
            <Text style={styles.corridorCity}>Paris</Text>
            <Ionicons name="arrow-forward" size={16} color="#64748B" />
            <Text style={styles.corridorCity}>Lyon</Text>
          </View>
          <Text style={styles.corridorMeta}>TGV INOUI • 1h 56m direct • from €49.00</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.corridorCard}
          onPress={() => router.push('/trains')}
        >
          <View style={styles.corridorRoute}>
            <Text style={styles.corridorCity}>London</Text>
            <Ionicons name="arrow-forward" size={16} color="#64748B" />
            <Text style={styles.corridorCity}>Paris</Text>
          </View>
          <Text style={styles.corridorMeta}>Eurostar • 2h 23m direct • from €92.00</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.corridorCard}
          onPress={() => router.push('/trains')}
        >
          <View style={styles.corridorRoute}>
            <Text style={styles.corridorCity}>Milano</Text>
            <Ionicons name="arrow-forward" size={16} color="#64748B" />
            <Text style={styles.corridorCity}>Roma</Text>
          </View>
          <Text style={styles.corridorMeta}>Frecciarossa • 3h 05m direct • from €54.90</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#60A5FA',
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
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
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
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
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
    color: '#1E40AF',
  },
  tripStatusSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  corridorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  corridorMeta: {
    fontSize: 12,
    color: '#64748B',
  },
});
