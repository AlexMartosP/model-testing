/** The task index: `tasks/index.csv`. */
import type { Capability } from "./capabilities.ts";
import { parseCapabilities } from "./capabilities.ts";
import { parseCsv } from "./csv.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadScores } from "./scores.ts";
import { inRoot } from "./paths.ts";

export type Task = {
  id: string;
  category: string;
  title: string;
  folder: string;
  /** Capabilities the harness needs for this task to be runnable at all. */
  requires: Capability[];
};

export function loadTasks(): Task[] {
  const path = inRoot("tasks/index.csv");
  return parseCsv(readFileSync(path, "utf8")).map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    folder: r.folder,
    // Space separated, because the column lives in a CSV.
    requires: parseCapabilities((r.requires ?? "").split(/\s+/).filter(Boolean), `${path} (${r.id})`),
  }));
}

export const taskCategories = (tasks: Task[]) => Object.fromEntries(tasks.map((t) => [t.id, t.category]));

/** The prompt, verbatim, minus the file's trailing newline so pasting doesn't submit early. */
export function readPrompt(task: Task): string {
  return readFileSync(inRoot("tasks", task.folder, "prompt.md"), "utf8").replace(/\n+$/, "");
}

/** What has to be true before a task's prompt is pasted. */
export function setupHints(task: Task): string[] {
  const hints: string[] = [];
  if (task.requires.includes("files") || task.requires.includes("shell")) {
    hints.push("node scripts/eval.ts workspace reset    (start from clean fixtures)");
  }
  if (task.category === "build") {
    hints.push("node scripts/eval.ts workspace install  (web/ and be/ dependencies)");
  }
  if (task.requires.includes("mcp")) {
    hints.push("node scripts/eval.ts mcp config <harness>  (and reset, which empties the call log)");
  }
  return hints;
}

/**
 * The order the suite is worked through.
 *
 * Scored categories come before `build`, because build tasks cost hours and move no number.
 * Within a category, tasks are grouped by what they need set up, so the workspace and the MCP
 * server get prepared once per group instead of thrashing between task kinds. Order cannot bias
 * results: every task is a fresh session on a freshly reset workspace.
 */
const CATEGORY_ORDER = ["agent", "tech", "coding", "build"];

export function suiteOrder(tasks: Task[]): Task[] {
  const rank = (t: Task) => {
    const cat = CATEGORY_ORDER.indexOf(t.category);
    return [cat === -1 ? CATEGORY_ORDER.length : cat, t.requires.join(" "), t.id];
  };
  return [...tasks].sort((a, b) => {
    const [ca, ra, ia] = rank(a);
    const [cb, rb, ib] = rank(b);
    return Number(ca) - Number(cb) || String(ra).localeCompare(String(rb)) || String(ia).localeCompare(String(ib));
  });
}

/**
 * Tasks in a run that have not been run yet, i.e. no captured answer.
 *
 * Deliberately different from `ungradedTasks`: a task can be run and captured but not yet scored,
 * and the commands that *run* tasks must not offer those again.
 */
export function unrunTasks(runDir: string, tasks: Task[]): Task[] {
  const path = join(runDir, "scores.csv");
  const na = existsSync(path)
    ? new Set(loadScores(path).scores.filter((s) => !s.applicable).map((s) => s.task))
    : new Set<string>();
  return suiteOrder(tasks).filter((t) => !na.has(t.id) && !existsSync(join(runDir, `${t.id}.md`)));
}

/** Tasks in a run that still need a score: no number recorded and not marked n/a. */
export function ungradedTasks(runDir: string, tasks: Task[]): Task[] {
  const path = join(runDir, "scores.csv");
  if (!existsSync(path)) throw new Error(`${path} is missing. Create the run with: node scripts/eval.ts new-run ...`);
  const settled = new Set(
    loadScores(path).scores.filter((s) => s.score !== null || !s.applicable).map((s) => s.task),
  );
  return suiteOrder(tasks).filter((t) => !settled.has(t.id));
}
