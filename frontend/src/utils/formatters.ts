/**
 * Safe formatting utilities for percentages, currency, and numerical metrics.
 * Prevents IEEE-754 arithmetic precision leaks (e.g. 100 - 82.4 = 17.599999999999994%).
 */

/**
 * Clamps and rounds a numeric percentage to a clean integer between 0 and 100.
 * Eliminates floating-point precision artifacts (e.g. 17.599999999999994 -> 18).
 * Handles undefined, null, NaN, and out-of-bound numbers.
 */
export function roundPercent(value?: number | null): number {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return 0;
  }
  const num = Number(value);
  return Math.round(Math.max(0, Math.min(100, num)));
}

/**
 * Formats a percentage value cleanly as an integer string with '%' suffix.
 * e.g. formatPercent(17.599999999999994) => "18%"
 * e.g. formatPercent(82.4) => "82%"
 */
export function formatPercent(value?: number | null): string {
  return `${roundPercent(value)}%`;
}

/**
 * Converts a 0..1 missed connection probability into a clean connection guarantee percentage.
 * Guarantee = (1 - missedProbability) * 100.
 * e.g. probabilityToGuaranteePercent(0.04) => 96
 * e.g. probabilityToGuaranteePercent(0.824) => 18
 */
export function probabilityToGuaranteePercent(missedProb?: number | null): number {
  if (missedProb === undefined || missedProb === null || Number.isNaN(Number(missedProb))) {
    return 100;
  }
  return roundPercent((1 - Number(missedProb)) * 100);
}

/**
 * Formats a monetary currency value into a clean 2-decimal string.
 * Handles NaN, undefined, null, and -0.
 * e.g. formatCurrency(29.5) => "29.50"
 */
export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0.00';
  }
  const num = Number(value);
  const safe = Object.is(num, -0) || Math.abs(num) < 0.00001 ? 0 : num;
  return safe.toFixed(2);
}

/**
 * Formats CO2 weight in kilograms to a clean integer string.
 */
export function formatKgCO2(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0';
  }
  return Math.round(Math.abs(Number(value))).toString();
}
