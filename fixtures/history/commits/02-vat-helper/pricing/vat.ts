/** Amount with VAT added, still in whole cents. */
export function addVat(cents: number, ratePct: number): number {
  return Math.round(cents * (1 + ratePct / 100));
}
