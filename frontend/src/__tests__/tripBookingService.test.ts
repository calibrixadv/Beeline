import { 
  generateTripsForCorridor, 
  filterAndSortTrips, 
  convertRoutePlanToTrainJourney,
  DEFAULT_TRIP_FILTERS 
} from '../services/tripBookingService';

describe('tripBookingService', () => {
  it('generates trips for Galati to Bucharest corridor', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].legs.length).toBeGreaterThan(0);
    expect(trips[0].fare.totalAmountLei).toBeGreaterThan(0);
  });

  it('generates trips for Bucharest to Brasov corridor', () => {
    const trips = generateTripsForCorridor('București Nord', 'Brașov');
    expect(trips.length).toBeGreaterThan(0);
  });

  it('filters trips by pillar', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const filtered = filterAndSortTrips(trips, {
      ...DEFAULT_TRIP_FILTERS,
      pillar: 'FASTEST',
    });
    expect(filtered.every((t) => t.curatedPillar === 'FASTEST')).toBe(true);
  });

  it('converts a TransitRoutePlan into a TrainJourney for TripContext', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const journey = convertRoutePlanToTrainJourney(trips[0]);
    expect(journey.id).toBe(trips[0].id);
    expect(journey.fares.length).toBeGreaterThan(0);
    expect(journey.origin.name).toBeDefined();
    expect(journey.destination.name).toBeDefined();
  });
});
