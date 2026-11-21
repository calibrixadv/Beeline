import {
  roundPercent,
  formatPercent,
  probabilityToGuaranteePercent,
  formatCurrency,
  formatKgCO2,
} from '../utils/formatters';

describe('formatters utility (Clean Rounding & Formatting)', () => {
  describe('roundPercent', () => {
    it('cleanly rounds floating-point arithmetic artifacts like 100 - 82.4', () => {
      const unrounded = 100 - 82.4; // 17.599999999999994
      expect(roundPercent(unrounded)).toBe(18);
    });

    it('rounds standard decimals correctly', () => {
      expect(roundPercent(82.4)).toBe(82);
      expect(roundPercent(82.5)).toBe(83);
      expect(roundPercent(82.6)).toBe(83);
      expect(roundPercent(0.1)).toBe(0);
      expect(roundPercent(99.9)).toBe(100);
    });

    it('clamps values strictly between 0 and 100', () => {
      expect(roundPercent(-15)).toBe(0);
      expect(roundPercent(115)).toBe(100);
      expect(roundPercent(0)).toBe(0);
      expect(roundPercent(100)).toBe(100);
    });

    it('handles undefined, null, and NaN safely', () => {
      expect(roundPercent(undefined)).toBe(0);
      expect(roundPercent(null)).toBe(0);
      expect(roundPercent(NaN)).toBe(0);
    });
  });

  describe('formatPercent', () => {
    it('returns crisp integer percentage string without IEEE-754 trails', () => {
      const floatTrail = 17.599999999999994;
      const formatted = formatPercent(floatTrail);
      expect(formatted).toBe('18%');
      expect(formatted).not.toContain('99999');
      expect(formatted).not.toContain('.');
    });

    it('formats exact boundaries cleanly', () => {
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(100)).toBe('100%');
    });

    it('formats edge cases without crashing or leaking artifacts', () => {
      expect(formatPercent(undefined)).toBe('0%');
      expect(formatPercent(null)).toBe('0%');
      expect(formatPercent(NaN)).toBe('0%');
      expect(formatPercent(-5)).toBe('0%');
      expect(formatPercent(120)).toBe('100%');
    });
  });

  describe('probabilityToGuaranteePercent', () => {
    it('converts 0..1 probability into clean guarantee percentage', () => {
      expect(probabilityToGuaranteePercent(0.04)).toBe(96);
      expect(probabilityToGuaranteePercent(0.03)).toBe(97);
      expect(probabilityToGuaranteePercent(0.824)).toBe(18);
      expect(probabilityToGuaranteePercent(undefined)).toBe(100);
      expect(probabilityToGuaranteePercent(null)).toBe(100);
    });
  });

  describe('formatCurrency', () => {
    it('formats floating point values to 2 decimals', () => {
      expect(formatCurrency(29.5)).toBe('29.50');
      expect(formatCurrency(17.599999999999994)).toBe('17.60');
      expect(formatCurrency(0)).toBe('0.00');
    });

    it('handles negative zero and falsy numbers safely', () => {
      expect(formatCurrency(-0)).toBe('0.00');
      expect(formatCurrency(undefined)).toBe('0.00');
      expect(formatCurrency(null)).toBe('0.00');
      expect(formatCurrency(NaN)).toBe('0.00');
    });
  });

  describe('formatKgCO2', () => {
    it('rounds and formats kg CO2 values cleanly', () => {
      expect(formatKgCO2(25.4)).toBe('25');
      expect(formatKgCO2(25.8)).toBe('26');
      expect(formatKgCO2(-30)).toBe('30');
      expect(formatKgCO2(undefined)).toBe('0');
    });
  });
});
