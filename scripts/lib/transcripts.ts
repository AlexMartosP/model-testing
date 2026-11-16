/**
 * Reading a harness's saved session, so a task can be captured from the transcript rather than
 * from whatever happens to be on screen.
 *
 * Only pi's format is implemented. It stores one JSONL file per session, per project directory,
 * under `~/.pi/agent/sessions/<mangled-cwd>/`. Another harness means another reader here plus a
 * field in its `harnesses/*.yaml`; nothing else should need to change.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ToolCall = { name: string; args: unknown; writes: boolean };

export type Transcript = {
  file: string;
  prompt: string;
  /** Final assistant text: the answer. */
  answer: string;
  thinking: { turn: number; text: string }[];
  toolCalls: ToolCall[];
  turns: number;
  stopReasons: string[];
  models: string[];
  usage: { input: number; output: number; cacheRead: number; cost: number };
  startedAt: number | null;
  /** Includes the last turn's durationMs: an assistant timestamp marks when a message *started*. */
  finishedAt: number | null;
  /** Sum of every turn's durationMs: generation time, excluding time spent in tools. */
  generationMs: number;
  /** Nothing was produced: an aborted or empty session, not a real attempt. */
  dead: boolean;
};

/** Tools that can change files, plus shell commands that can. Used to audit read-only tasks. */
const MUTATING_TOOLS = ["edit", "write", "create", "apply_patch", "multi_edit", "str_replace"];
const WRITING_SHELL = [" > ", " >> ", "sed -i", "tee ", "mv ", "rm ", "cp ", "truncate",
  "git checkout", "git apply", "git reset", "git restore", "npm install", "npm ci"];

/** pi derives its session folder from the cwd: every "/" becomes "-", wrapped in dashes. */
export function piSessionDir(workspace: string): string {
  const override = process.env.EVAL_SESSION_DIR;
  if (override) return override;
  return join(homedir(), ".pi/agent/sessions", `-${workspace.replaceAll("/", "-")}--`);
}

const partText = (parts: unknown): string =>
  Array.isArray(parts)
    ? parts.filter((p): p is { type: string; text: string } =>
        typeof p === "object" && p !== null && "type" in p && (p as { type: unknown }).type === "text")
        .map((p) => p.text).join("")
    : typeof parts === "string" ? parts : "";

function writesFiles(name: string, args: unknown): boolean {
  if (MUTATING_TOOLS.includes(name.toLowerCase())) return true;
  if (name !== "bash") return false;
  const command = typeof args === "object" && args !== null && "command" in args
    ? String((args as { command: unknown }).command) : "";
  return WRITING_SHELL.some((t) => command.includes(t));
}

export function readTranscript(file: string): Transcript {
  type Row = { type?: string; message?: Record<string, unknown> };
  const rows: Row[] = readFileSync(file, "utf8").split("\n").filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const msgs = rows.filter((r) => r.type === "message" && r.message).map((r) => r.message ?? {});

  const users = msgs.filter((m) => m.role === "user");
  const asst = msgs.filter((m) => m.role === "assistant");

  const thinking: { turn: number; text: string }[] = [];
  const toolCalls: ToolCall[] = [];
  for (const [i, m] of asst.entries()) {
    const parts = Array.isArray(m.content) ? m.content : [];
    for (const p of parts) {
      if (typeof p !== "object" || p === null) continue;
      const part = p as { type?: string; thinking?: string; name?: string; arguments?: unknown };
      if (part.type === "thinking" && part.thinking) thinking.push({ turn: i + 1, text: part.thinking });
      if (part.type === "toolCall" && part.name) {
        toolCalls.push({ name: part.name, args: part.arguments, writes: writesFiles(part.name, part.arguments) });
      }
    }
  }

  const usage = { input: 0, output: 0, cacheRead: 0, cost: 0 };
  for (const m of asst) {
    const u = (m.usage ?? {}) as Record<string, unknown>;
    usage.input += Number(u.input ?? 0);
    usage.output += Number(u.output ?? 0);
    usage.cacheRead += Number(u.cacheRead ?? 0);
    const c = (u.cost ?? {}) as Record<string, unknown>;
    usage.cost += Number(c.total ?? 0);
  }

  const stamps = (list: Record<string, unknown>[]) =>
    list.map((m) => Number(m.timestamp)).filter((n) => Number.isFinite(n));
  const userStamps = stamps(users);
  const asstStamps = stamps(asst);

  // An assistant message's timestamp is when it began, so the last turn's own generation time has
  // to be added or every task looks faster than it was, and a single-turn task looks instant.
  const lastStamp = asstStamps.length ? Math.max(...asstStamps) : null;
  const lastTurn = asst.find((m) => Number(m.timestamp) === lastStamp);
  const lastDuration = Number(lastTurn?.durationMs ?? 0);
  const generationMs = asst.reduce((total, m) => total + Number(m.durationMs ?? 0), 0);
  const answer = asst.length ? partText(asst.at(-1)?.content).trim() : "";
  const stopReasons = asst.map((m) => String(m.stopReason ?? ""));

  return {
    file,
    prompt: users.length ? partText(users[0].content).trim() : "",
    answer,
    thinking,
    toolCalls,
    turns: asst.length,
    stopReasons,
    models: [...new Set(asst.map((m) => `${m.provider}/${m.model}`))],
    usage,
    startedAt: userStamps.length ? Math.min(...userStamps) : null,
    finishedAt: lastStamp === null ? null : lastStamp + lastDuration,
    generationMs,
    dead: answer === "" && toolCalls.length === 0,
  };
}

/** Every session in a directory whose prompt matches, oldest first. */
export function findSessions(dir: string, prompt: string): Transcript[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort()
    .map((f) => readTranscript(join(dir, f)))
    .filter((t) => t.prompt === prompt);
}
