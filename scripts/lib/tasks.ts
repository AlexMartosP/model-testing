/** The task index: `tasks/index.csv`. */
import type { Capability } from "./capabilities.ts";
import { parseCapabilities } from "./capabilities.ts";
import { parseCsv } from "./csv.ts";
import { readFileSync } from "node:fs";
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
