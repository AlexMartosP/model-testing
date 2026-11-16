/**
 * `prompt <task-id>` — put one task's prompt on the clipboard, ready to paste.
 *
 * Prompts have to be pasted verbatim, so retyping or hand-selecting them in a terminal is the step
 * in the workflow most likely to quietly alter a run.
 */
import { existsSync } from "node:fs";
import { copyToClipboard } from "../lib/clipboard.ts";
import { inRoot } from "../lib/paths.ts";
import { loadTasks, readPrompt, setupHints } from "../lib/tasks.ts";

export function prompt(args: string[]): void {
  const [id] = args;
  if (args.length !== 1) throw new Error("usage: prompt <task-id>");

  const tasks = loadTasks();
  const task = tasks.find((t) => t.id.toLowerCase() === id.toLowerCase());
  if (!task) throw new Error(`Unknown task "${id}". Known: ${tasks.map((t) => t.id).join(", ")}`);
  if (!existsSync(inRoot("tasks", task.folder, "prompt.md"))) {
    throw new Error(`tasks/${task.folder}/prompt.md is missing`);
  }

  const text = readPrompt(task);
  const tool = copyToClipboard(text);

  console.log(`${task.id} · ${task.title}  [${task.category}${task.requires.length ? `, needs ${task.requires.join(" ")}` : ""}]`);
  console.log(tool ? `Copied to the clipboard via ${tool}.` : `No clipboard tool found; copy it from below.`);
  console.log(`\n${"─".repeat(78)}\n${text}\n${"─".repeat(78)}`);

  const hints = setupHints(task);
  if (hints.length) {
    console.log(`\nBefore you paste it:`);
    for (const hint of hints) console.log(`  ${hint}`);
  }
  console.log(`\nSave the answer as runs/<model>/<harness>/${task.id}.md`);
}
