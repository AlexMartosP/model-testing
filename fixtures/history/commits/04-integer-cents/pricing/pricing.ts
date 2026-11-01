/** Money in this module is always an integer number of cents. */

export type Tier = { minQty: number; pct: number };

/** Bulk discount tiers, lowest quantity first. */
export const BULK_TIERS: Tier[] = [
  { minQty: 1, pct: 0 },
  { minQty: 10, pct: 10 },
  { minQty: 50, pct: 20 },
];

/** The discount percentage that applies to a quantity. */
export function tierFor(qty: number): number {
  let pct = 0;
  for (const tier of BULK_TIERS) if (qty >= tier.minQty) pct = tier.pct;
  return pct;
}

/** Price after a percentage discount. */
export function applyDiscount(cents: number, pct: number): number {
  // Prices have to land on a whole cent.
  return Math.ceil(cents * (1 - pct / 100));
}
