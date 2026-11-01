/** Money in this module is always an integer number of cents. */

/** Price after a percentage discount. */
export function applyDiscount(cents: number, pct: number): number {
  return Math.round(cents * (1 - pct / 100));
}
