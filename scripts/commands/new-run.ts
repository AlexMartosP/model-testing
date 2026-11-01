/** `new-run <model> <harness>` — create and pre-fill a run folder. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { missingCapabilities } from "../lib/capabilities.ts";
import { toCsv } from "../lib/csv.ts";
import { requireHarness } from "../lib/harnesses.ts";
import { inRoot } from "../lib/paths.ts";
import { capture } from "../lib/proc.ts";
import { NA } from "../lib/scores.ts";
import { loadTasks } from "../lib/tasks.ts";

export function newRun(args: string[]): void {
  const [model, harnessName] = args;
  if (args.length !== 2) throw new Error("usage: new-run <model-folder-name> <harness>");

  const harness = requireHarness(harnessName);
  const dir = inRoot("runs", model, harness.name);
  if (existsSync(dir)) throw new Error(`${dir} already exists (delete it to re-run this model)`);

  // Best effort: a harness may not be installed on this machine yet.
  const version = harness.version_command ? capture(harness.version_command) : null;
  if (version && !version.ok) {
    console.warn(`! could not read the harness version (${harness.version_command}); fill it in by hand`);
  }

  // A `#` after whitespace would read back as a yaml comment, so quote the value when needed.
  const versionLine = version?.ok ? version.stdout.split("\n")[0] : "";
  const safeVersion = /\s#/.test(versionLine) ? JSON.stringify(versionLine) : versionLine;

  const tasks = loadTasks();
  const skipped = tasks
    .map((t) => ({ task: t, missing: missingCapabilities(t.requires, harness.capabilities) }))
    .filter((t) => t.missing.length);

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "meta.yaml"), `model: ${model}
quant:                          # Q4_K_M, Q8_0, FP16...
harness: ${harness.name}
harness_version: ${safeVersion}
harness_capabilities: ${harness.capabilities.join(", ")}
host:                           # local / own server / provider name
region:                         # local, EU or US (never CN, see FRAMEWORK.md)
context_length:
temperature:
date: ${new Date().toISOString().slice(0, 10)}
tok_per_s:                      # rough generation speed
notes:
`);

  const bySkip = new Map(skipped.map((s) => [s.task.id, s.missing]));
  writeFileSync(join(dir, "scores.csv"), toCsv([
    ["task", "score", "notes"],
    ...tasks.map((t) => {
      const missing = bySkip.get(t.id);
      return missing
        ? [t.id, NA, `${harness.name} has no ${missing.join(", ")}`]
        : [t.id, "", ""];
    }),
  ]));

  console.log(`Created ${dir}`);
  if (skipped.length) {
    console.log(
      `\n${skipped.length} task(s) marked ${NA}, because ${harness.name} declares ` +
        `capabilities: ${harness.capabilities.join(", ") || "(none)"}`,
    );
    for (const { task, missing } of skipped) console.log(`  ${task.id}  ${task.title}  (needs ${missing.join(", ")})`);
  }
  console.log(`\nNext: node scripts/eval.ts workspace reset && node scripts/eval.ts start ${harness.name}`);
  console.log(`Save each answer as ${dir}/<task-id>.md.`);
}
