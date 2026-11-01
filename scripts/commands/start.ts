/**
 * `start <harness>` — launch a harness in the eval workspace.
 *
 * This exists so the workspace rule can't be forgotten: the harness is always started with the
 * sandbox as its working directory, never this repo. Prompts are still pasted in by hand, one
 * fresh session per task, which is what keeps runs comparable.
 */
import { existsSync } from "node:fs";
import { requireHarness } from "../lib/harnesses.ts";
import { mcpServerPath, workspaceDir } from "../lib/paths.ts";
import { runInteractive } from "../lib/proc.ts";
import { resolveMcpSetup } from "./mcp.ts";

export function start(args: string[]): never {
  const [name] = args;
  if (args.length !== 1) throw new Error("usage: start <harness>");

  const harness = requireHarness(name);
  const ws = workspaceDir();
  if (!existsSync(ws)) {
    throw new Error(`No workspace at ${ws}. Run: node scripts/eval.ts workspace reset`);
  }

  console.log(`${harness.name} in ${ws}`);
  if (harness.notes) console.log(`  ${harness.notes}`);
  if (harness.capabilities.includes("mcp")) {
    console.log(`  MCP: ${existsSync(mcpServerPath()) ? resolveMcpSetup(harness) : "server not installed; run workspace reset"}`);
  }
  console.log(`  Paste one prompt per fresh session. Don't clarify, retry or nudge.\n`);

  process.exit(runInteractive(harness.launch, ws));
}
