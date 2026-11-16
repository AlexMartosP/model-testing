/**
 * `go <harness> <model> [task]` — reset the sandbox and start the harness in one step.
 *
 * This is the per-task command: it does the two things that have to happen before every task, in
 * the right order, and refuses to do them when that would destroy evidence.
 *
 * `workspace reset` is destructive. It wipes the diff and empties the MCP call log, and for A4,
 * A5, S1 and M3 that material *is* the grade. So this checks first: if the sandbox has
 * uncommitted changes or the call log has entries, something from the last task has not been
 * saved, and it stops rather than quietly deleting it. `--force` overrides.
 *
 * Give it a task id as well and it also installs build dependencies when the task needs them and
 * puts the prompt on the clipboard, so the next thing you do is paste. Pass `next` instead of an
 * id and it picks the first ungraded task in suite order, so working through the suite never
 * involves retyping an id or remembering where you stopped.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { copyToClipboard } from "../lib/clipboard.ts";
import { requireHarness } from "../lib/harnesses.ts";
import { inRoot, mcpLogPath, workspaceDir } from "../lib/paths.ts";
import { capture } from "../lib/proc.ts";
import { loadTasks, readPrompt, unrunTasks } from "../lib/tasks.ts";
import { start } from "./start.ts";
import { buildWorkspaceDiff, install, reset } from "./workspace.ts";

/**
 * Anything in the sandbox a reset would destroy that isn't already on disk.
 *
 * "There is evidence here" is not the same as "it is unsaved". After `workspace save`, the sandbox
 * still holds the changes and the call log still holds its entries, so a size check alone blocks
 * every reset after a file or MCP task and trains you to reach for --force. So this compares
 * content: if what's live already matches something captured in the run folder, it is safe to go.
 */
function savedAlready(runDir: string, suffix: string, live: string): boolean {
  if (!existsSync(runDir)) return false;
  return readdirSync(runDir)
    .filter((f) => f.endsWith(suffix))
    .some((f) => readFileSync(join(runDir, f), "utf8") === live);
}

function unsavedEvidence(runDir: string): string[] {
  const ws = workspaceDir();
  const found: string[] = [];

  if (existsSync(join(ws, ".git")) && capture("git status --porcelain", ws).stdout !== "") {
    // Built by the same function that writes the file, so the comparison is exact.
    if (!savedAlready(runDir, ".diff", buildWorkspaceDiff(ws))) {
      found.push("the sandbox has uncommitted changes that are not in any saved .diff");
    }
  }

  const log = mcpLogPath();
  if (existsSync(log) && statSync(log).size > 0) {
    if (!savedAlready(runDir, ".mcp.jsonl", readFileSync(log, "utf8"))) {
      found.push("the MCP call log has entries that are not in any saved .mcp.jsonl");
    }
  }
  return found;
}

export function go(args: string[]): never {
  const force = args.includes("--force");
  const [harnessName, model, taskId] = args.filter((a) => a !== "--force");
  if (!harnessName || !model) throw new Error("usage: go <harness> <model> [task|next] [--force]");

  const harness = requireHarness(harnessName);
  const runDir = inRoot("runs", model, harness.name);
  if (!existsSync(runDir)) {
    throw new Error(`No run at runs/${model}/${harness.name}.\nCreate it with: node scripts/eval.ts new-run ${model} ${harness.name}`);
  }

  // "next" resolves to the first ungraded task in suite order, so the id never has to be retyped.
  const tasks = loadTasks();
  let task;
  if (taskId?.toLowerCase() === "next") {
    const todo = unrunTasks(runDir, tasks);
    if (!todo.length) {
      throw new Error(`Nothing left to run for ${model}/${harness.name}. Run: node scripts/eval.ts summarize`);
    }
    task = todo[0];
    console.log(`next = ${task.id} · ${task.title}   (${todo.length} still to run, then ${todo.slice(1, 4).map((t) => t.id).join(" ") || "none"})\n`);
  } else if (taskId) {
    task = tasks.find((t) => t.id.toLowerCase() === taskId.toLowerCase());
    if (!task) throw new Error(`Unknown task "${taskId}"`);
  }

  const unsaved = unsavedEvidence(runDir);
  if (unsaved.length && !force) {
    throw new Error(
      `Refusing to reset: ${unsaved.join("; ")}.\n\n` +
        `Save it first, naming the task it belongs to:\n` +
        `  node scripts/eval.ts workspace save runs/${model}/${harness.name} <task-id>\n\n` +
        `Or pass --force if there is genuinely nothing worth keeping.`,
    );
  }
  if (unsaved.length) console.warn(`! --force: discarding unsaved evidence (${unsaved.join("; ")})\n`);

  reset();

  if (task?.category === "build") {
    console.log();
    install();
  }

  if (task) {
    const tool = copyToClipboard(readPrompt(task));
    console.log(`\n${task.id} · ${task.title}`);
    console.log(tool ? `Prompt copied to the clipboard via ${tool}. Paste it into a fresh session.` : readPrompt(task));
    console.log(`Save the answer as runs/${model}/${harness.name}/${task.id}.md\n`);
  }

  start([harness.name, model]);
}
