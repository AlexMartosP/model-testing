/** Running things: user-supplied harness commands (via a shell) and git (never via a shell). */
import { spawnSync } from "node:child_process";

export type Captured = { ok: boolean; status: number | null; stdout: string; stderr: string };

/** Run a shell command and capture its output. Never throws; check `ok`. */
export function capture(command: string, cwd?: string): Captured {
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf8" });
  return {
    ok: !r.error && r.status === 0,
    status: r.status,
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
  };
}

/** Hand the terminal over to an interactive command and return its exit code. */
export function runInteractive(command: string, cwd: string): number {
  const r = spawnSync(command, { cwd, shell: true, stdio: "inherit" });
  if (r.error) throw new Error(`could not run "${command}": ${r.error.message}`);
  return r.status ?? 1;
}

/** Feed `input` to a command's stdin. Used for clipboard tools, which all read stdin. */
export function pipeTo(command: string, args: string[], input: string): boolean {
  const r = spawnSync(command, args, { input, encoding: "utf8" });
  return !r.error && r.status === 0;
}

/** Run git with an argv array, so fixture content can never be read as shell syntax. */
export function git(args: string[], cwd: string, env?: Record<string, string>): string {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (r.error) throw new Error(`git ${args.join(" ")}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return r.stdout ?? "";
}
