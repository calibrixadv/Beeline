import { SAMPLE_TRAINS } from '../src/data/sampleTrains';

describe('sampleTrains dataset integrity', () => {
  it('contains at least 10 journeys', () => {
    expect(SAMPLE_TRAINS.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique journey IDs', () => {
    const ids = SAMPLE_TRAINS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('contains valid ISO 8601 departure and arrival timestamps', () => {
    SAMPLE_TRAINS.forEach((train) => {
      const depTime = new Date(train.departureTime).getTime();
      const arrTime = new Date(train.arrivalTime).getTime();
      expect(isNaN(depTime)).toBe(false);
      expect(isNaN(arrTime)).toBe(false);
      expect(arrTime).toBeGreaterThan(depTime);
    });
  });

  it('has positive durationMinutes matching difference or reasonable bound', () => {
    SAMPLE_TRAINS.forEach((train) => {
      expect(train.durationMinutes).toBeGreaterThan(0);
      expect(train.durationFormatted).toMatch(/\d+h|\d+m/);
    });
  });

  it('has at least 2 stops for each journey (origin & destination)', () => {
    SAMPLE_TRAINS.forEach((train) => {
      expect(train.stops.length).toBeGreaterThanOrEqual(2);
      expect(train.stops[0].station.city).toBe(train.origin.city);
      expect(train.stops[train.stops.length - 1].station.city).toBe(train.destination.city);
    });
  });

  it('contains at least one fare tier with positive price for each journey', () => {
    SAMPLE_TRAINS.forEach((train) => {
      expect(train.fares.length).toBeGreaterThanOrEqual(1);
      train.fares.forEach((fare) => {
        expect(fare.price).toBeGreaterThan(0);
        expect(fare.currency).toBe('EUR');
        expect(fare.seatsAvailable).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('contains amenities for each journey', () => {
    SAMPLE_TRAINS.forEach((train) => {
      expect(train.amenities.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('contains non-negative delayMinutes and positive delay when DELAYED', () => {
    SAMPLE_TRAINS.forEach((train) => {
      expect(train.delayMinutes).toBeGreaterThanOrEqual(0);
      if (train.status === 'DELAYED') {
        expect(train.delayMinutes).toBeGreaterThan(0);
      }
    });
  });

  it('has valid carbon footprint value', () => {
    SAMPLE_TRAINS.forEach((train) => {
      expect(train.carbonFootprintKg).toBeGreaterThan(0);
    });
  });
});
