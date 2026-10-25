import {
  getLowestFare,
  getHighestFare,
  filterAndSortTrains,
  formatTimeOnly,
  formatCurrency,
  getStatusTheme,
  calculateTotalDuration,
} from '../src/utils/trainFilters';
import { SAMPLE_TRAINS } from '../src/data/sampleTrains';
import { TrainFilterState } from '../src/types/train';

describe('trainFilters utilities', () => {
  const baseFilters: TrainFilterState = {
    searchQuery: '',
    statusFilter: 'ALL',
    operatorFilter: 'ALL',
    sortBy: 'departure',
    sortOrder: 'asc',
  };

  describe('getLowestFare & getHighestFare', () => {
    it('returns lowest fare among tiers', () => {
      const train = SAMPLE_TRAINS[0]; // TGV: fares 49, 79, 115
      expect(getLowestFare(train)).toBe(49);
    });

    it('returns highest fare among tiers', () => {
      const train = SAMPLE_TRAINS[0];
      expect(getHighestFare(train)).toBe(115);
    });

    it('handles empty fares array gracefully', () => {
      const dummy = { ...SAMPLE_TRAINS[0], fares: [] };
      expect(getLowestFare(dummy)).toBe(0);
      expect(getHighestFare(dummy)).toBe(0);
    });
  });

  describe('formatTimeOnly', () => {
    it('formats ISO datetime to HH:mm', () => {
      const time = formatTimeOnly('2026-10-15T08:14:00');
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('falls back to string if already formatted or invalid', () => {
      expect(formatTimeOnly('invalid-date')).toBe('invalid-date');
    });
  });

  describe('formatCurrency', () => {
    it('formats EUR with symbol', () => {
      expect(formatCurrency(49)).toBe('€49.00');
    });

    it('formats USD with dollar sign', () => {
      expect(formatCurrency(50, 'USD')).toBe('$50.00');
    });

    it('formats GBP with pound sign', () => {
      expect(formatCurrency(35, 'GBP')).toBe('£35.00');
    });

    it('formats unknown currencies with code suffix', () => {
      expect(formatCurrency(120, 'RON')).toBe('120.00 RON');
    });
  });

  describe('getStatusTheme', () => {
    it('returns green theme for ON_TIME', () => {
      const theme = getStatusTheme('ON_TIME');
      expect(theme.label).toBe('On Time');
      expect(theme.textColor).toBe('#166534');
    });

    it('returns yellow theme for DELAYED', () => {
      const theme = getStatusTheme('DELAYED');
      expect(theme.label).toBe('Delayed');
      expect(theme.textColor).toBe('#92400E');
    });

    it('returns red theme for CANCELLED', () => {
      const theme = getStatusTheme('CANCELLED');
      expect(theme.label).toBe('Cancelled');
      expect(theme.textColor).toBe('#991B1B');
    });

    it('returns blue theme for BOARDING', () => {
      const theme = getStatusTheme('BOARDING');
      expect(theme.label).toBe('Boarding');
      expect(theme.textColor).toBe('#1E40AF');
    });
  });

  describe('calculateTotalDuration', () => {
    it('calculates total minutes and formatted string', () => {
      const trains = [SAMPLE_TRAINS[0], SAMPLE_TRAINS[1]]; // 116 + 195 = 311m = 5h 11m
      const result = calculateTotalDuration(trains);
      expect(result.totalMinutes).toBe(311);
      expect(result.formatted).toBe('5h 11m');
    });

    it('handles empty journey array', () => {
      const result = calculateTotalDuration([]);
      expect(result.totalMinutes).toBe(0);
      expect(result.formatted).toBe('0m');
    });
  });

  describe('filterAndSortTrains', () => {
    it('returns all trains when filters are default', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, baseFilters);
      expect(result.length).toBe(SAMPLE_TRAINS.length);
    });

    it('filters by search query matching city (Paris)', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        searchQuery: 'Paris',
      });
      // Should match TGV (origin Paris) and Eurostar (origin London, dest Paris)
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((t) => {
        const matches =
          t.origin.city.toLowerCase().includes('paris') ||
          t.destination.city.toLowerCase().includes('paris') ||
          t.operator.toLowerCase().includes('paris') ||
          t.trainNumber.toLowerCase().includes('paris');
        expect(matches).toBe(true);
      });
    });

    it('filters by operator (Deutsche Bahn)', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        operatorFilter: 'Deutsche Bahn',
      });
      expect(result.length).toBe(1);
      expect(result[0].operator).toBe('Deutsche Bahn');
    });

    it('filters by status (DELAYED)', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        statusFilter: 'DELAYED',
      });
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach((t) => {
        expect(t.status).toBe('DELAYED');
      });
    });

    it('filters by maxPrice', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        maxPrice: 20,
      });
      // CFR is 12.5, RegioJet is 14.0
      expect(result.length).toBe(2);
      result.forEach((t) => {
        expect(getLowestFare(t)).toBeLessThanOrEqual(20);
      });
    });

    it('sorts by price ascending', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        sortBy: 'price',
        sortOrder: 'asc',
      });
      for (let i = 0; i < result.length - 1; i++) {
        expect(getLowestFare(result[i])).toBeLessThanOrEqual(getLowestFare(result[i + 1]));
      }
    });

    it('sorts by price descending', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        sortBy: 'price',
        sortOrder: 'desc',
      });
      for (let i = 0; i < result.length - 1; i++) {
        expect(getLowestFare(result[i])).toBeGreaterThanOrEqual(getLowestFare(result[i + 1]));
      }
    });

    it('sorts by duration ascending', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        sortBy: 'duration',
        sortOrder: 'asc',
      });
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].durationMinutes).toBeLessThanOrEqual(result[i + 1].durationMinutes);
      }
    });

    it('sorts by departure time ascending', () => {
      const result = filterAndSortTrains(SAMPLE_TRAINS, {
        ...baseFilters,
        sortBy: 'departure',
        sortOrder: 'asc',
      });
      for (let i = 0; i < result.length - 1; i++) {
        const timeA = new Date(result[i].departureTime).getTime();
        const timeB = new Date(result[i + 1].departureTime).getTime();
        expect(timeA).toBeLessThanOrEqual(timeB);
      }
    });
  });
});
