/**
 * Pricing helpers.
 *
 * Money in this module is always an integer number of cents. Percentages are whole numbers,
 * so 20 means 20%.
 */

export type Tier = { minQty: number; pct: number };

/**
 * Bulk discount tiers, lowest quantity first.
 *
 * The last tier whose `minQty` a quantity reaches is the one that applies.
 */
export const BULK_TIERS: Tier[] = [
  { minQty: 1, pct: 0 },
  { minQty: 10, pct: 10 },
  { minQty: 50, pct: 20 },
];

/**
 * The discount percentage that applies to a quantity.
 *
 * @param qty how many units are being bought
 * @returns a whole-number percentage, 0 if no tier applies
 */
export function tierFor(qty: number): number {
  let pct = 0;
  for (const tier of BULK_TIERS) if (qty >= tier.minQty) pct = tier.pct;
  return pct;
}

/**
 * Price after a percentage discount.
 *
 * @param cents the undiscounted price, in cents
 * @param pct the discount as a whole-number percentage
 * @returns the discounted price, in whole cents
 */
export function applyDiscount(cents: number, pct: number): number {
  // Prices have to land on a whole cent.
  return Math.ceil(cents * (1 - pct / 100));
}
