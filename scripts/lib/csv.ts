/** CSV read/write. Handles quoted fields containing commas, quotes and newlines. */

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { record.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field); records.push(record); field = ""; record = [];
    } else field += c;
  }
  if (field || record.length) { record.push(field); records.push(record); }

  const rows = records.filter((r) => r.some((f) => f.trim()));
  const header = rows.shift();
  if (!header) return [];
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const toCsv = (rows: string[][]) => rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
