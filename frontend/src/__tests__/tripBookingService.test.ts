import { 
  generateTripsForCorridor, 
  filterAndSortTrips, 
  convertRoutePlanToTrainJourney,
  fetchDayTripsFromBackend,
  DEFAULT_TRIP_FILTERS 
} from '../services/tripBookingService';
import { apiClient } from '../services/apiClient';

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

  it('filters trips by maxTransfers (direct only vs multiple transfers)', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    // Verify corridor has both 0-transfer and >0-transfer trips
    const hasDirect = trips.some((t) => t.transfersCount === 0);
    const hasTransfer = trips.some((t) => t.transfersCount > 0);
    expect(hasDirect).toBe(true);
    expect(hasTransfer).toBe(true);

    // Direct only (0 transfers)
    const directOnly = filterAndSortTrips(trips, {
      ...DEFAULT_TRIP_FILTERS,
      maxTransfers: 0,
    });
    expect(directOnly.length).toBeGreaterThan(0);
    expect(directOnly.every((t) => t.transfersCount === 0)).toBe(true);

    // Max 1 transfer
    const maxOne = filterAndSortTrips(trips, {
      ...DEFAULT_TRIP_FILTERS,
      maxTransfers: 1,
    });
    expect(maxOne.every((t) => t.transfersCount <= 1)).toBe(true);
    expect(maxOne.length).toBeGreaterThanOrEqual(directOnly.length);

    // Any transfers (undefined)
    const allTrips = filterAndSortTrips(trips, {
      ...DEFAULT_TRIP_FILTERS,
      maxTransfers: undefined,
    });
    expect(allTrips.length).toBe(trips.length);
  });

  it('fetchDayTripsFromBackend passes maxTransfers to apiClient.planRoute', async () => {
    const planRouteSpy = jest.spyOn(apiClient, 'planRoute').mockResolvedValueOnce({
      plans: [],
      recommendedPlanId: '',
      query: {} as any,
      generatedAt: '',
    });
    const getTrainsSpy = jest.spyOn(apiClient, 'getTrains').mockResolvedValueOnce({
      items: [],
      total: 0,
    } as any);

    await fetchDayTripsFromBackend('Galați', 'București Nord', '2026-11-20', 'ALL', 0);

    expect(planRouteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTransfers: 0,
      })
    );

    planRouteSpy.mockRestore();
    getTrainsSpy.mockRestore();
  });
});
