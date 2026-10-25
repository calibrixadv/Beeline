import {
  generateTripsForCorridor,
  filterAndSortTrips,
  convertRoutePlanToTrainJourney,
  DEFAULT_TRIP_FILTERS,
} from '../src/services/tripBookingService';

describe('tripBookingService', () => {
  describe('generateTripsForCorridor', () => {
    it('generates multi-carrier options for Galati -> Bucuresti corridor', () => {
      const trips = generateTripsForCorridor('Galați Micro 19', 'Piața Unirii, București');

      expect(trips.length).toBeGreaterThanOrEqual(3);

      // Check Fastest Direct
      const fastest = trips.find((t) => t.curatedPillar === 'FASTEST');
      expect(fastest).toBeDefined();
      expect(fastest?.fare.totalAmountLei).toBe(63.0);
      expect(fastest?.fare.totalAmountEur).toBe(12.6);
      expect(fastest?.legs[0].names.operatorShortName).toBe('CFR Călători');

      // Check Best Value
      const bestValue = trips.find((t) => t.curatedPillar === 'BEST_VALUE');
      expect(bestValue).toBeDefined();
      expect(bestValue?.fare.totalAmountLei).toBe(42.0);
      expect(bestValue?.legs[0].names.operatorShortName).toBe('Transferoviar Călători');

      // Check Most Reliable Honey Shielded
      const mostReliable = trips.find((t) => t.curatedPillar === 'MOST_RELIABLE');
      expect(mostReliable).toBeDefined();
      expect(mostReliable?.riskAnalysis.bufferAdequacy).toBe('OPTIMAL');
      expect(mostReliable?.fare.totalAmountLei).toBe(69.0);
    });

    it('generates options for Bucuresti -> Brasov corridor', () => {
      const trips = generateTripsForCorridor('București Nord', 'Brașov');

      expect(trips.length).toBeGreaterThanOrEqual(3);

      const fastest = trips.find((t) => t.curatedPillar === 'FASTEST');
      expect(fastest).toBeDefined();
      expect(fastest?.fare.totalAmountLei).toBe(48.0);

      const bestValue = trips.find((t) => t.curatedPillar === 'BEST_VALUE');
      expect(bestValue).toBeDefined();
      expect(bestValue?.fare.totalAmountLei).toBe(29.0);

      const ecoHero = trips.find((t) => t.curatedPillar === 'ECO_HERO');
      expect(ecoHero).toBeDefined();
      expect(ecoHero?.legs[0].names.operatorShortName).toBe('Astra Trans Carpatic');
    });

    it('generates dynamic realistic options for arbitrary custom corridors', () => {
      const trips = generateTripsForCorridor('Cluj-Napoca', 'Timișoara Nord');

      expect(trips.length).toBe(3);
      expect(trips.some((t) => t.curatedPillar === 'FASTEST')).toBe(true);
      expect(trips.some((t) => t.curatedPillar === 'BEST_VALUE')).toBe(true);
      expect(trips.some((t) => t.curatedPillar === 'MOST_RELIABLE')).toBe(true);

      trips.forEach((trip) => {
        expect(trip.fare.totalAmountLei).toBeGreaterThan(0);
        expect(trip.fare.totalAmountEur).toBeGreaterThan(0);
        expect(trip.riskAnalysis.overallRiskScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('filterAndSortTrips', () => {
    const sampleTrips = generateTripsForCorridor('Galați', 'București');

    it('filters by Curated Pillar', () => {
      const filtered = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        pillar: 'FASTEST',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].curatedPillar).toBe('FASTEST');
    });

    it('filters by Transit Mode', () => {
      const trainsOnly = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        modes: ['TRAIN'],
      });
      expect(trainsOnly.length).toBeGreaterThan(0);
      trainsOnly.forEach((t) => {
        expect(t.legs.some((l) => l.transportType === 'TRAIN')).toBe(true);
      });
    });

    it('filters by Operator/Provider', () => {
      const tfcOnly = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        providers: ['Transferoviar Călători'],
      });
      expect(tfcOnly.length).toBe(1);
      expect(tfcOnly[0].legs.some((l) => l.names.operatorName?.includes('Transferoviar'))).toBe(true);
    });

    it('filters by Max Price in LEI', () => {
      const under50 = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        maxPriceLei: 50,
      });
      under50.forEach((t) => {
        expect(t.fare.totalAmountLei).toBeLessThanOrEqual(50);
      });
    });

    it('sorts by lowest price ascending', () => {
      const sorted = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        sortBy: 'price',
        sortOrder: 'asc',
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].fare.totalAmountLei).toBeLessThanOrEqual(sorted[i + 1].fare.totalAmountLei);
      }
    });

    it('sorts by shortest duration ascending', () => {
      const sorted = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        sortBy: 'duration',
        sortOrder: 'asc',
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].totalDurationMinutes).toBeLessThanOrEqual(
          sorted[i + 1].totalDurationMinutes
        );
      }
    });

    it('sorts by risk score (lowest risk first)', () => {
      const sorted = filterAndSortTrips(sampleTrips, {
        ...DEFAULT_TRIP_FILTERS,
        sortBy: 'risk',
        sortOrder: 'asc',
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].riskAnalysis.overallRiskScore).toBeLessThanOrEqual(
          sorted[i + 1].riskAnalysis.overallRiskScore
        );
      }
    });
  });

  describe('convertRoutePlanToTrainJourney', () => {
    it('converts multi-modal plan to TrainJourney compatible with TripContext', () => {
      const trips = generateTripsForCorridor('Galați', 'București');
      const plan = trips[0];

      const journey = convertRoutePlanToTrainJourney(plan);

      expect(journey.id).toBe(plan.id);
      expect(journey.origin.name).toBe(plan.query.origin.name);
      expect(journey.destination.name).toBe(plan.query.destination.name);
      expect(journey.durationMinutes).toBe(plan.totalDurationMinutes);
      expect(journey.fares[0].price).toBe(plan.fare.totalAmountLei);
      expect(journey.fares[0].currency).toBe('RON');
      expect(journey.stops.length).toBeGreaterThan(1);
      expect(journey.amenities.length).toBeGreaterThan(0);
    });
  });
});
