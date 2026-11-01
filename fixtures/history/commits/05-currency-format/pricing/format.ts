/** A cents amount as a human-readable price. */
export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
}
