/**
 * `summarize` — collect every run's scores.csv into the leaderboard.
 *
 * Writes results/summary.csv (one row per run), results/tasks.csv (task x run matrix) and the
 * README table between the leaderboard markers.
 *
 * Two things keep the numbers honest:
 *
 *   n/a         A task the harness can't do is left out of the maths entirely, so a harness is
 *               never penalised for a missing feature. The cost is that two overall scores only
 *               compare when both runs cover the same categories, which is what `scope` records
 *               and what keeps a reduced-scope run out of the chart.
 *   unweighted  Build tasks are graded and kept, but never reach the overall score, because
 *               their fixture repos change over time.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "../lib/csv.ts";
import { loadHarnesses } from "../lib/harnesses.ts";
import { inRoot } from "../lib/paths.ts";
import { loadScores } from "../lib/scores.ts";
import type { Task } from "../lib/tasks.ts";
import { loadTasks } from "../lib/tasks.ts";
import { asList, parseFlatYaml } from "../lib/yaml.ts";

/** Categories that make up the overall score. Keep in sync with FRAMEWORK.md. */
const WEIGHTS: Record<string, number> = { agent: 0.4, coding: 0.35, tech: 0.25 };

/** Categories that are run and recorded, but deliberately kept out of the overall score. */
const UNWEIGHTED: Record<string, string> = {
  build: "the web and backend fixtures evolve, so build scores aren't comparable between runs",
};

const START = "<!-- leaderboard:start -->";
const END = "<!-- leaderboard:end -->";

type Run = {
  model: string;
  harness: string;
  meta: Record<string, string>;
  scores: Record<string, number>;
  /** The notes column, per task. The one-line "why this score"; the long form is <task>.grade.md. */
  notes: Record<string, string>;
  notApplicable: string[];
  /** Percentage per category, for every category that has at least one graded task. */
  cats: Record<string, number>;
  overall: number | null;
  /** Graded and applicable task counts, per category. */
  counts: Record<string, { scored: number; applicable: number }>;
  /** Totals over the weighted categories only, which is what "complete" means here. */
  scored: number;
  applicable: number;
  /** Every weighted category has a score, so this overall compares with any other full-scope run. */
  fullScope: boolean;
  complete: boolean;
};

const fmt = (x: number | null | undefined) => (x == null ? "" : x.toFixed(0));
const titleCase = (s: string) => s[0].toUpperCase() + s.slice(1);

const subdirs = (p: string) =>
  existsSync(p)
    ? readdirSync(p).filter((d) => !d.startsWith(".") && statSync(join(p, d)).isDirectory()).sort()
    : [];

/** A task in a category nobody weighted or excluded is a typo, not a silent zero. */
function checkCategories(tasks: Task[]): void {
  const known = new Set([...Object.keys(WEIGHTS), ...Object.keys(UNWEIGHTED)]);
  const unknown = tasks.filter((t) => !known.has(t.category));
  if (unknown.length) {
    throw new Error(
      `tasks/index.csv: unknown category ${[...new Set(unknown.map((t) => `"${t.category}"`))].join(", ")} ` +
        `(${unknown.map((t) => t.id).join(", ")}). Add it to WEIGHTS or UNWEIGHTED in scripts/commands/summarize.ts.`,
    );
  }
}

function collect(tasks: Task[], warnings: string[]): Run[] {
  const category = Object.fromEntries(tasks.map((t) => [t.id, t.category]));
  const registered = new Set(loadHarnesses().map((h) => h.name));
  const runs: Run[] = [];

  for (const model of subdirs(inRoot("runs"))) {
    if (model.startsWith("_")) continue;
    for (const harness of subdirs(inRoot("runs", model))) {
      const dir = inRoot("runs", model, harness);
      const scoresPath = join(dir, "scores.csv");
      if (!existsSync(scoresPath)) continue;
      if (!registered.has(harness)) {
        warnings.push(`runs/${model}/${harness}: harness is not in harnesses/, so the run can't be reproduced`);
      }

      const loaded = loadScores(scoresPath);
      warnings.push(...loaded.warnings);

      const scores: Record<string, number> = {};
      const notes: Record<string, string> = {};
      const notApplicable: string[] = [];
      for (const row of loaded.scores) {
        if (!(row.task in category)) continue;
        if (row.notes) notes[row.task] = row.notes;
        if (!row.applicable) notApplicable.push(row.task);
        else if (row.score !== null) scores[row.task] = row.score;
      }

      const naSet = new Set(notApplicable);
      const applicable = tasks.filter((t) => !naSet.has(t.id));

      const cats: Record<string, number> = {};
      const counts: Record<string, { scored: number; applicable: number }> = {};
      for (const cat of [...Object.keys(WEIGHTS), ...Object.keys(UNWEIGHTED)]) {
        const inCat = applicable.filter((t) => t.category === cat);
        const got = inCat.filter((t) => t.id in scores).map((t) => scores[t.id]);
        counts[cat] = { scored: got.length, applicable: inCat.length };
        if (got.length) cats[cat] = (100 * got.reduce((a, b) => a + b, 0)) / (3 * got.length);
      }

      // Renormalise over the weighted categories present, so a reduced-scope run still gets a number.
      const present = Object.keys(WEIGHTS).filter((c) => c in cats);
      const weightSum = present.reduce((a, c) => a + WEIGHTS[c], 0);
      const overall = weightSum ? present.reduce((a, c) => a + cats[c] * WEIGHTS[c], 0) / weightSum : null;

      const weightedCats = Object.keys(WEIGHTS);
      const scored = weightedCats.reduce((a, c) => a + counts[c].scored, 0);
      const applicableScored = weightedCats.reduce((a, c) => a + counts[c].applicable, 0);
      const metaPath = join(dir, "meta.yaml");
      runs.push({
        model,
        harness,
        meta: existsSync(metaPath) ? parseFlatYaml(readFileSync(metaPath, "utf8")) : {},
        scores,
        notes,
        notApplicable,
        cats,
        counts,
        overall,
        scored,
        applicable: applicableScored,
        fullScope: weightedCats.every((c) => c in cats),
        complete: applicableScored > 0 && scored === applicableScored,
      });
    }
  }
  runs.sort((a, b) => Number(b.complete) - Number(a.complete) || (b.overall ?? -1) - (a.overall ?? -1));
  return runs;
}

function leaderboard(runs: Run[], tasks: Task[]): string {
  const scoredCats = Object.keys(WEIGHTS);
  const extraCats = Object.keys(UNWEIGHTED);
  const lines = [START, ""];

  if (!runs.length) {
    lines.push("_No runs yet. Create one with `node scripts/eval.ts new-run <model> <harness>`._", "", END);
    return lines.join("\n");
  }

  const header = ["#", "Model", "Harness", "Quant", "**Overall**", ...scoredCats.map(titleCase),
    ...extraCats.map((c) => `${titleCase(c)} ‡`), "Tasks", "tok/s"];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push("|---".repeat(header.length) + "|");

  for (const [i, run] of runs.entries()) {
    const cell = (c: string) => (c in run.cats ? fmt(run.cats[c]) : "n/a");
    const extraCell = (c: string) =>
      c in run.cats ? `${fmt(run.cats[c])} (${run.counts[c].scored}/${run.counts[c].applicable})` : "—";
    lines.push(`| ${[
      String(i + 1),
      `[${run.model}](runs/${run.model}/${run.harness})`,
      run.harness,
      run.meta.quant ?? "",
      `**${fmt(run.overall)}**${run.fullScope ? "" : " †"}`,
      ...scoredCats.map(cell),
      ...extraCats.map(extraCell),
      `${run.scored}/${run.applicable}${run.complete ? "" : " ⚠️"}`,
      run.meta.tok_per_s ?? "",
    ].join(" | ")} |`);
  }

  // Only full-scope, fully graded runs go in the chart: anything else isn't comparable as one bar.
  const charted = runs.filter((r) => r.complete && r.fullScope);
  if (charted.length) {
    lines.push("", "```mermaid", "xychart-beta", '    title "Overall score"',
      `    x-axis [${charted.map((r) => `"${r.model} (${r.harness})"`).join(", ")}]`,
      '    y-axis "Score" 0 --> 100',
      `    bar [${charted.map((r) => fmt(r.overall)).join(", ")}]`, "```");
  }

  lines.push("", `‡ Graded and kept, but **not in Overall**: ` +
    extraCats.map((c) => `${c} — ${UNWEIGHTED[c]}`).join("; ") + ".");

  const reduced = runs.filter((r) => !r.fullScope);
  if (reduced.length) {
    lines.push("", "† Covers fewer categories than the full suite, so this Overall is not directly " +
      "comparable with the others: " +
      reduced.map((r) => `**${r.model}/${r.harness}** (no ${scoredCats.filter((c) => !(c in r.cats)).join(", ")})`)
        .join(", ") + ".");
  }

  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const withNa = runs.filter((r) => r.notApplicable.length);
  if (withNa.length) {
    lines.push("", "Left out because the harness can't do them:", "");
    for (const run of withNa) {
      const needs = [...new Set(run.notApplicable.flatMap((id) => byId[id]?.requires ?? []))];
      lines.push(`- \`${run.model}/${run.harness}\` — ${run.notApplicable.join(", ")} (needs ${needs.join(", ")})`);
    }
  }

  lines.push("", "Per-task scores: [results/tasks.csv](results/tasks.csv) · All runs: " +
    "[results/summary.csv](results/summary.csv) · Why each score: [results/notes.md](results/notes.md)", "", END);
  return lines.join("\n");
}

/**
 * results/notes.md — every grading note, in one place.
 *
 * The notes column is where a score stops being a number and starts being useful, so it should not
 * only exist inside a CSV nobody opens. Reasoning too long for one line goes in <task>.grade.md,
 * which this links to when it exists.
 */
function gradingNotes(runs: Run[], tasks: Task[]): string {
  const lines = [
    "# Grading notes",
    "",
    "Generated by `node scripts/eval.ts summarize`. One line per task, from the `notes` column of",
    "each run's `scores.csv`. Longer reasoning lives in `runs/<model>/<harness>/<task>.grade.md`.",
    "",
  ];

  const withNotes = runs.filter((r) => Object.keys(r.notes).length);
  if (!withNotes.length) {
    lines.push("_No notes recorded yet._");
    return lines.join("\n") + "\n";
  }

  for (const run of withNotes) {
    lines.push(`## ${run.model} / ${run.harness}`, "");
    for (const task of tasks) {
      const note = run.notes[task.id];
      if (!note) continue;
      const score = run.notApplicable.includes(task.id)
        ? "n/a"
        : task.id in run.scores
          ? String(run.scores[task.id])
          : "ungraded";
      const gradePath = `runs/${run.model}/${run.harness}/${task.id}.grade.md`;
      const link = existsSync(inRoot(gradePath)) ? ` · [reasoning](${gradePath})` : "";
      lines.push(`- **${task.id}** · ${score} · ${task.title} — ${note.replaceAll("|", "\\|")}${link}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function summarize(): void {
  const tasks = loadTasks();
  checkCategories(tasks);

  const warnings: string[] = [];
  const runs = collect(tasks, warnings);
  const scoredCats = Object.keys(WEIGHTS);
  const extraCats = Object.keys(UNWEIGHTED);

  mkdirSync(inRoot("results"), { recursive: true });
  writeFileSync(inRoot("results/summary.csv"), toCsv([
    ["model", "harness", "quant", "overall", ...scoredCats, ...extraCats.map((c) => `${c}_unweighted`),
      "scope", "tasks_scored", "tasks_applicable", "tasks_na",
      ...extraCats.flatMap((c) => [`${c}_scored`, `${c}_applicable`]),
      "capabilities", "tok_per_s", "host", "date"],
    ...runs.map((r) => [
      r.model, r.harness, r.meta.quant ?? "", fmt(r.overall),
      ...[...scoredCats, ...extraCats].map((c) => (c in r.cats ? fmt(r.cats[c]) : "n/a")),
      r.fullScope ? "full" : scoredCats.filter((c) => c in r.cats).join("+"),
      String(r.scored), String(r.applicable), String(r.notApplicable.length),
      ...extraCats.flatMap((c) => [String(r.counts[c].scored), String(r.counts[c].applicable)]),
      asList(r.meta.harness_capabilities).join(" "),
      r.meta.tok_per_s ?? "", r.meta.host ?? "", r.meta.date ?? "",
    ]),
  ]));

  writeFileSync(inRoot("results/tasks.csv"), toCsv([
    ["task", "category", "title", "requires", "in_overall", ...runs.map((r) => `${r.model}/${r.harness}`)],
    ...tasks.map((t) => [
      t.id, t.category, t.title, t.requires.join(" "), t.category in WEIGHTS ? "yes" : "no",
      ...runs.map((r) => (r.notApplicable.includes(t.id) ? "n/a" : fmt(r.scores[t.id]))),
    ]),
  ]));

  writeFileSync(inRoot("results/notes.md"), gradingNotes(runs, tasks));

  const readmePath = inRoot("README.md");
  const readme = readFileSync(readmePath, "utf8");
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 || end === -1) throw new Error("README.md is missing the leaderboard markers");
  writeFileSync(readmePath, readme.slice(0, start) + leaderboard(runs, tasks) + readme.slice(end + END.length));

  for (const warning of warnings) console.warn(`! ${warning}`);
  console.log(`${runs.length} run${runs.length === 1 ? "" : "s"} summarized over ${tasks.length} tasks`);
}
