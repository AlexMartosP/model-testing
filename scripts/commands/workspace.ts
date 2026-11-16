/**
 * `workspace reset` / `workspace save` — the sandbox a run happens in.
 *
 * The agent never works inside this repo, because it could read `tasks/*\/rubric.md`. Instead
 * `reset` builds a throwaway git repo from `fixtures/` and installs the eval MCP server next
 * to it, and `save` records what the model did: the diff it left behind, plus the MCP calls it
 * made (the only evidence for whether an MCP task was really done with the tools).
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseCsv } from "../lib/csv.ts";
import { ROOT, inRoot, mcpDir, mcpLogPath, mcpServerPath, workspaceDir } from "../lib/paths.ts";
import { capture, git } from "../lib/proc.ts";

const EVAL_IDENTITY = ["-c", "user.name=eval", "-c", "user.email=eval@local"];

/** Commit that adds the fixtures the history layers don't cover. Fixed, so a reset is reproducible. */
const WORKING_FILES = { message: "Add working files", date: "2026-11-01T09:00:00+01:00" };

function commit(ws: string, message: string, date: string, author?: string): void {
  git(["add", "-A"], ws);
  const args = [...EVAL_IDENTITY, "commit", "-q", "-m", message];
  if (author) args.push(`--author=${author}`);
  git(args, ws, { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
}

/**
 * Replay `fixtures/history/` into real commits, so tasks can ask questions about the history.
 * Each layer holds only the files its commit touches, copied over the tree built so far, which
 * keeps the fixture small and readable. Deleting a file in a layer is not supported; add that
 * to the manifest if a task ever needs it.
 */
function replayHistory(ws: string): number {
  const manifest = inRoot("fixtures/history/manifest.csv");
  if (!existsSync(manifest)) return 0;
  const rows = parseCsv(readFileSync(manifest, "utf8"));
  for (const row of rows) {
    const layer = inRoot("fixtures/history/commits", row.layer);
    if (!existsSync(layer)) throw new Error(`${manifest}: no such layer "${row.layer}"`);
    cpSync(layer, ws, { recursive: true });
    commit(ws, row.message, row.date, row.author);
  }
  return rows.length;
}

/** Build output and installed packages belong to a run, not to the fixture. */
const BUILD_ARTEFACTS = new Set(["node_modules", "dist", ".vite"]);

/** Everything in fixtures/ except the git history fixture, which reset replays instead of copying. */
function copyWorkingFiles(ws: string): string[] {
  const copied: string[] = [];
  for (const entry of readdirSync(inRoot("fixtures")).sort()) {
    if (entry === "history") continue;
    cpSync(inRoot("fixtures", entry), join(ws, entry), {
      recursive: true,
      filter: (src) => !BUILD_ARTEFACTS.has(basename(src)),
    });
    copied.push(entry);
  }
  return copied;
}

/** Workspace projects that have dependencies to install, i.e. a package.json next to a lockfile. */
function projectsNeedingInstall(ws: string): string[] {
  return readdirSync(ws, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(ws, name, "package-lock.json")))
    .sort();
}

function installMcpServer(): void {
  rmSync(mcpDir(), { recursive: true, force: true });
  mkdirSync(mcpDir(), { recursive: true });
  cpSync(inRoot("mcp"), mcpDir(), { recursive: true });
  writeFileSync(mcpLogPath(), ""); // a fresh call log for each task
}

export function reset(): void {
  const ws = workspaceDir();
  if (ws === ROOT || ROOT.startsWith(ws + "/") || ws.startsWith(ROOT + "/")) {
    throw new Error(`refusing to use ${ws} as the workspace: it overlaps this repo, so the model could read the rubrics.\nSet EVAL_WS to a path outside ${ROOT}.`);
  }

  rmSync(ws, { recursive: true, force: true });
  mkdirSync(ws, { recursive: true });
  git(["init", "-q", "-b", "main"], ws);

  const commits = replayHistory(ws);
  const copied = copyWorkingFiles(ws);
  commit(ws, WORKING_FILES.message, WORKING_FILES.date);
  installMcpServer();

  console.log(`Workspace ready: ${ws}`);
  console.log(`  ${copied.join(", ")}${commits ? `, plus ${commits} commits of history` : ""}`);
  console.log(`MCP server:      ${mcpServerPath()}`);
  console.log(`MCP call log:    ${mcpLogPath()} (empty)`);

  const needInstall = projectsNeedingInstall(ws);
  if (needInstall.length) {
    console.log(`\nBuild tasks also need:  node scripts/eval.ts workspace install   (${needInstall.join(", ")})`);
  }
  console.log(`\nStart the harness there with:  node scripts/eval.ts start <harness>`);
}

/**
 * Install dependencies for the workspace projects that have them. Only build tasks need this, so
 * it is a separate step: the other tasks shouldn't wait on npm, or need a network at all.
 */
export function install(): void {
  const ws = workspaceDir();
  if (!existsSync(join(ws, ".git"))) {
    throw new Error(`${ws} is not an eval workspace. Run: node scripts/eval.ts workspace reset`);
  }
  const projects = projectsNeedingInstall(ws);
  if (!projects.length) {
    console.log("Nothing to install: no workspace project has a package-lock.json.");
    return;
  }
  for (const project of projects) {
    process.stdout.write(`npm ci in ${project}... `);
    const result = capture("npm ci --no-audit --no-fund", join(ws, project));
    console.log(result.ok ? "ok" : "FAILED");
    if (!result.ok) throw new Error(result.stderr || result.stdout || "npm ci failed");
  }
  console.log(`\nInstalled ${projects.join(", ")}. These are gitignored, so they stay out of the saved diff.`);
}

/**
 * The saved-diff format: porcelain status, then the patch.
 *
 * Exported because `go`'s guard has to rebuild this byte-for-byte to decide whether what's in the
 * sandbox is already on disk. Two copies of this formatting drifted apart once already (one
 * trimmed, one didn't), so there is deliberately only one.
 */
export function buildWorkspaceDiff(ws: string): string {
  git(["add", "-A", "-N", "."], ws); // -N so new files show up in the diff
  return [
    "## git status --porcelain",
    git(["status", "--porcelain"], ws),
    "## git diff",
    git(["diff"], ws),
  ].join("\n");
}

export function save(args: string[]): void {
  const [runDir, taskId] = args;
  if (args.length !== 2) throw new Error("usage: workspace save <run-dir> <task-id>");

  const ws = workspaceDir();
  if (!existsSync(join(ws, ".git"))) {
    throw new Error(`${ws} is not an eval workspace. Run: node scripts/eval.ts workspace reset`);
  }
  const out = resolve(runDir);
  mkdirSync(out, { recursive: true });

  const diffPath = join(out, `${taskId}.diff`);
  writeFileSync(diffPath, buildWorkspaceDiff(ws));
  console.log(`Saved ${diffPath}`);

  const log = mcpLogPath();
  if (existsSync(log) && statSync(log).size > 0) {
    const calls = join(out, `${taskId}.mcp.jsonl`);
    copyFileSync(log, calls);
    const n = readFileSync(log, "utf8").trim().split("\n").length;
    console.log(`Saved ${calls} (${n} MCP call${n === 1 ? "" : "s"})`);
  }
}
