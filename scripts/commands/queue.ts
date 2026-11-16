/**
 * `queue <model> [harness]` — walk the suite one task at a time.
 *
 * Copies the current task's prompt to the clipboard, waits, and moves to the next one when you
 * press enter. It is resumable by construction: anything already carrying a score or `n/a` in
 * `scores.csv` is skipped, so closing the terminal and coming back tomorrow picks up where you
 * stopped.
 *
 * It deliberately does not touch the workspace. `reset` destroys the diff and the MCP call log,
 * which for several tasks *is* the grade, so that stays a decision you make rather than a side
 * effect of pressing enter. What this does instead is warn when the workspace is dirty and the
 * task you are leaving has no saved evidence.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { copyToClipboard } from "../lib/clipboard.ts";
import { loadHarnesses } from "../lib/harnesses.ts";
import { inRoot, mcpLogPath, workspaceDir } from "../lib/paths.ts";
import { capture } from "../lib/proc.ts";
import { loadScores } from "../lib/scores.ts";
import type { Task } from "../lib/tasks.ts";
import { loadTasks, readPrompt, setupHints, unrunTasks } from "../lib/tasks.ts";

const RULE = "─".repeat(78);

/** Tasks still to run, plus how the run stands overall. */
function remaining(runDir: string, tasks: Task[]): { todo: Task[]; done: number; na: number } {
  const path = join(runDir, "scores.csv");
  if (!existsSync(path)) throw new Error(`${path} is missing. Create the run with: node scripts/eval.ts new-run ...`);

  const { scores } = loadScores(path);
  return {
    todo: unrunTasks(runDir, tasks),
    done: scores.filter((s) => s.score !== null).length,
    na: scores.filter((s) => !s.applicable).length,
  };
}

/** Evidence that the task just finished actually got recorded, before anything can wipe it. */
function evidenceWarning(task: Task, runDir: string): string | null {
  if (!task.requires.length) return null;

  const ws = workspaceDir();
  const dirty = existsSync(join(ws, ".git")) && capture("git status --porcelain", ws).stdout !== "";
  const logged = existsSync(mcpLogPath()) && statSync(mcpLogPath()).size > 0;
  const savedDiff = existsSync(join(runDir, `${task.id}.diff`));
  const savedCalls = existsSync(join(runDir, `${task.id}.mcp.jsonl`));

  if (dirty && !savedDiff) {
    return `the workspace has uncommitted changes and ${task.id}.diff does not exist yet`;
  }
  if (logged && !savedCalls) {
    return `the MCP call log is not empty and ${task.id}.mcp.jsonl does not exist yet`;
  }
  return null;
}

export async function queue(args: string[]): Promise<void> {
  const [model, harnessArg] = args;
  if (args.length < 1 || args.length > 2) throw new Error("usage: queue <model> [harness]");

  const harnesses = loadHarnesses().map((h) => h.name);
  const harness = harnessArg ?? (harnesses.length === 1 ? harnesses[0] : "pi");
  const runDir = inRoot("runs", model, harness);
  if (!existsSync(runDir)) {
    throw new Error(`No run at runs/${model}/${harness}.\nCreate it with: node scripts/eval.ts new-run ${model} ${harness}`);
  }

  const tasks = loadTasks();
  const { todo, done, na } = remaining(runDir, tasks);
  const total = tasks.length;

  console.log(`${model} / ${harness} — ${done} graded${na ? `, ${na} n/a` : ""}, ${todo.length} to go of ${total}`);
  if (!todo.length) {
    console.log(`\nNothing left. Run: node scripts/eval.ts summarize`);
    return;
  }
  console.log(`Order: ${todo.map((t) => t.id).join(" → ")}`);
  console.log(`\nEnter for the next task, q to stop.`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const [i, task] of todo.entries()) {
      const text = readPrompt(task);
      const tool = copyToClipboard(text);

      console.log(`\n${RULE}`);
      console.log(`[${i + 1}/${todo.length}]  ${task.id} · ${task.title}`);
      console.log(`${task.category}${task.requires.length ? ` · needs ${task.requires.join(" ")}` : " · no setup"}` +
        `${tool ? ` · copied via ${tool}` : " · NO CLIPBOARD TOOL, copy below"}`);
      console.log(RULE);
      console.log(text);
      console.log(RULE);

      for (const hint of setupHints(task)) console.log(`  ${hint}`);
      console.log(`  save the answer as runs/${model}/${harness}/${task.id}.md`);

      const answer = (await rl.question(`\n[${task.id}] enter = next, q = stop > `)).trim().toLowerCase();
      if (answer === "q" || answer === "quit") {
        console.log(`\nStopped on ${task.id}. Run queue again to pick up here.`);
        return;
      }

      const warning = evidenceWarning(task, runDir);
      if (warning) {
        console.log(`\n!  ${task.id}: ${warning}.`);
        console.log(`   Save it before anything resets the workspace:`);
        console.log(`   node scripts/eval.ts workspace save runs/${model}/${harness} ${task.id}`);
      }
    }
    console.log(`\nEnd of the queue. Grade what's outstanding, then: node scripts/eval.ts summarize`);
  } finally {
    rl.close();
  }
}
