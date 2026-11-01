/**
 * A run's `scores.csv`. The score column means one of three things:
 *
 *   0 | 1 | 2 | 3   graded
 *   n/a             the harness can't do this task, so it is left out of the maths
 *   (empty)         not graded yet
 */
import { readFileSync } from "node:fs";
import { parseCsv } from "./csv.ts";

export const NA = "n/a";

export type Score = { task: string; score: number | null; applicable: boolean; notes: string };

export function loadScores(path: string): { scores: Score[]; warnings: string[] } {
  const scores: Score[] = [];
  const warnings: string[] = [];
  for (const row of parseCsv(readFileSync(path, "utf8"))) {
    if (!row.task) continue;
    const raw = (row.score ?? "").toLowerCase();
    const notes = row.notes ?? "";
    if (raw === NA) {
      scores.push({ task: row.task, score: null, applicable: false, notes });
    } else if (raw === "") {
      scores.push({ task: row.task, score: null, applicable: true, notes });
    } else if (/^[0-3]$/.test(raw)) {
      scores.push({ task: row.task, score: Number(raw), applicable: true, notes });
    } else {
      warnings.push(`${path}: ${row.task} has score "${row.score}"; expected 0-3, "${NA}" or empty`);
      scores.push({ task: row.task, score: null, applicable: true, notes });
    }
  }
  return { scores, warnings };
}
