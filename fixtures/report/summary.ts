export type Row = { label: string; value: number };

/** Sum of every row's value. */
export function total(rows: Row[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}

/** One row's share of the total, as a percentage. */
export function share(rows: Row[], label: string): number {
  const whole = total(rows);
  if (whole === 0) return 0;
  const row = rows.find((r) => r.label === label);
  return row ? row.value / whole : 0;
}

/** Rows ordered by value, largest first. */
export function ranked(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.value - b.value);
}
