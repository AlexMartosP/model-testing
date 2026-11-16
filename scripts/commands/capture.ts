/**
 * `capture <model> <task> [harness]` — pull a finished task out of the harness's own transcript.
 *
 * Reading the saved session beats copying off the screen on every count: the text is verbatim, the
 * reasoning comes across separately, and every assistant turn carries the model id, so a run can
 * be proved to be the model the folder claims.
 *
 * It finds the session by matching the first user message against `prompt.md`, never by taking the
 * newest file, because "newest" silently files one task's answer under another's name. Sessions
 * that produced nothing (aborted before any output) are skipped as false starts, and more than one
 * live session for a task is reported, since that is a retry and the rules forbid those.
 *
 * The raw `.jsonl` is copied into the run folder, so the evidence survives pi pruning its own
 * session directory.
 */
import { copyFileSync, existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { inRoot, workspaceDir } from "../lib/paths.ts";
import { loadTasks, readPrompt } from "../lib/tasks.ts";
import { findSessions, piSessionDir } from "../lib/transcripts.ts";

const localTime = (ms: number | null) =>
  ms === null ? "?" : new Date(ms).toLocaleTimeString([], { hour12: false });

export function capture(args: string[]): void {
  const [model, taskId, harness = "pi"] = args;
  if (args.length < 2 || args.length > 3) throw new Error("usage: capture <model> <task> [harness]");

  const task = loadTasks().find((t) => t.id.toLowerCase() === taskId.toLowerCase());
  if (!task) throw new Error(`Unknown task "${taskId}"`);

  const runDir = inRoot("runs", model, harness);
  if (!existsSync(runDir)) throw new Error(`No run at runs/${model}/${harness}`);

  const dir = piSessionDir(workspaceDir());
  const matches = findSessions(dir, readPrompt(task));
  if (!matches.length) {
    throw new Error(
      `No session in ${dir} whose prompt matches tasks/${task.folder}/prompt.md.\n` +
        `Either the task hasn't been run, or the prompt was altered before pasting.`,
    );
  }

  const live = matches.filter((t) => !t.dead);
  const dead = matches.length - live.length;
  if (!live.length) throw new Error(`${matches.length} session(s) for ${task.id}, all aborted with no output.`);
  if (dead) console.log(`Ignored ${dead} aborted session(s) for ${task.id} that produced nothing.`);
  if (live.length > 1) {
    console.warn(
      `! ${live.length} completed sessions for ${task.id}. That is a retry, which FRAMEWORK.md forbids.\n` +
        `  Using the most recent. Note it when grading, or re-run the task clean.`,
    );
  }

  const t = live.at(-1);
  if (!t) throw new Error("unreachable: live sessions checked above");

  writeFileSync(join(runDir, `${task.id}.md`), t.answer + "\n");
  copyFileSync(t.file, join(runDir, `${task.id}.session.jsonl`));

  const header = [
    `# ${task.id} · reasoning`,
    "",
    "Not part of the answer and **not** scored. Never paste this into a grading prompt: FRAMEWORK.md",
    "scores the answer, not the effort, and models that emit no reasoning would be penalised.",
    "Kept for diagnosing near-misses and for the restraint caps.",
    "",
    `Model \`${t.models.join(", ")}\`, ${t.thinking.length} block(s) across ${t.turns} turns.`,
    "",
  ];
  const body = t.thinking.flatMap((b) => [`## Turn ${b.turn}`, "", b.text.trim(), ""]);
  writeFileSync(join(runDir, `${task.id}.thinking.md`), [...header, ...body].join("\n"));

  const secs = t.startedAt && t.finishedAt ? (t.finishedAt - t.startedAt) / 1000 : 0;
  const writers = t.toolCalls.filter((c) => c.writes);

  console.log(`\n${task.id} · ${task.title}`);
  console.log(`  model     ${t.models.join(", ")}`);
  console.log(`  ran       ${localTime(t.startedAt)} → ${localTime(t.finishedAt)}  (${secs.toFixed(1)}s)`);
  console.log(`  turns     ${t.turns}, ending ${t.stopReasons.at(-1)}`);
  const genSecs = t.generationMs / 1000;
  const rate = genSecs > 0 ? `${(t.usage.output / genSecs).toFixed(0)} tok/s` : "n/a";
  console.log(`  generating ${genSecs.toFixed(1)}s of the ${secs.toFixed(1)}s  (${rate})`);
  console.log(`  tokens    ${t.usage.output} out, ${t.usage.input} in, ${t.usage.cacheRead} cached  ($${t.usage.cost.toFixed(5)})`);
  console.log(`  tools     ${t.toolCalls.length} calls: ${[...new Set(t.toolCalls.map((c) => c.name))].join(", ") || "none"}`);
  console.log(`  can write ${writers.length ? `${writers.length} call(s) COULD have changed files` : "none — nothing capable of writing was invoked"}`);
  console.log(`\n  wrote ${task.id}.md, ${task.id}.thinking.md, ${task.id}.session.jsonl`);

  if (task.requires.length && !existsSync(join(runDir, `${task.id}.diff`))) {
    console.log(`\n! No ${task.id}.diff yet. If the sandbox still holds this task's work:`);
    console.log(`    node scripts/eval.ts workspace save runs/${model}/${harness} ${task.id}`);
    console.log(`  If it was already reset, the diff is gone; the tool-call audit above is the evidence.`);
  }
}
