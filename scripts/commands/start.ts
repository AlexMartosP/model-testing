/**
 * `start <harness> [model]` — launch a harness in the eval workspace.
 *
 * Two things this exists to make impossible:
 *
 *   - Running the harness anywhere but the sandbox. It is always started with the workspace as
 *     its working directory, never this repo, where it could read the rubrics.
 *   - Testing a different model than the run folder claims. A harness usually has its own default
 *     model configured somewhere, and a bare launch silently uses it. So a harness whose `launch`
 *     contains `{model}` can only be started against a run, and the id comes from that run's
 *     `model_ref`. The thing you launch and the thing you record cannot drift apart.
 *
 * Prompts are still pasted in by hand, one fresh session per task, which is what keeps runs
 * comparable.
 */
import { existsSync, readFileSync } from "node:fs";
import type { Harness } from "../lib/harnesses.ts";
import { MODEL_PLACEHOLDER, requireHarness } from "../lib/harnesses.ts";
import { inRoot, mcpServerPath, workspaceDir } from "../lib/paths.ts";
import { runInteractive } from "../lib/proc.ts";
import { parseFlatYaml } from "../lib/yaml.ts";
import { resolveMcpSetup } from "./mcp.ts";

/** The launch command with `{model}` filled in from the run's `model_ref`. */
function resolveLaunch(harness: Harness, model: string | undefined): { command: string; ref: string | null } {
  if (!harness.launch.includes(MODEL_PLACEHOLDER)) {
    if (model) {
      console.warn(
        `! ${harness.file} has no ${MODEL_PLACEHOLDER} in its launch command, so "${model}" pins nothing.\n` +
          `  Whatever model ${harness.name} is configured with is what you will be testing.`,
      );
    }
    return { command: harness.launch, ref: null };
  }

  if (!model) {
    throw new Error(
      `${harness.name} launches with ${MODEL_PLACEHOLDER}, so it has to be started against a run:\n` +
        `  node scripts/eval.ts start ${harness.name} <model>\n` +
        `The id comes from model_ref in runs/<model>/${harness.name}/meta.yaml, so you can't launch\n` +
        `one model and record another.`,
    );
  }

  const metaPath = inRoot("runs", model, harness.name, "meta.yaml");
  if (!existsSync(metaPath)) {
    throw new Error(
      `No run at ${metaPath}.\nCreate it with: node scripts/eval.ts new-run ${model} ${harness.name}`,
    );
  }

  const ref = (parseFlatYaml(readFileSync(metaPath, "utf8")).model_ref ?? "").trim();
  if (!ref) {
    throw new Error(
      `${metaPath} has no model_ref, so there is nothing to launch ${harness.name} with.\n` +
        `Set it to the id ${harness.name} expects, for example:\n  model_ref: mistral/mistral-large-4-0`,
    );
  }
  return { command: harness.launch.replaceAll(MODEL_PLACEHOLDER, ref), ref };
}

export function start(args: string[]): never {
  const [name, model] = args;
  if (args.length < 1 || args.length > 2) throw new Error("usage: start <harness> [model]");

  const harness = requireHarness(name);
  const ws = workspaceDir();
  if (!existsSync(ws)) {
    throw new Error(`No workspace at ${ws}. Run: node scripts/eval.ts workspace reset`);
  }

  const { command, ref } = resolveLaunch(harness, model);

  console.log(`${harness.name} in ${ws}`);
  console.log(`  model:  ${ref ?? `whatever ${harness.name} defaults to (not pinned)`}`);
  console.log(`  launch: ${command}`);
  if (harness.notes) console.log(`  ${harness.notes}`);
  if (harness.capabilities.includes("mcp")) {
    console.log(`  MCP:    ${existsSync(mcpServerPath()) ? resolveMcpSetup(harness) : "server not installed; run workspace reset"}`);
  }
  console.log(`  Paste one prompt per fresh session. Don't clarify, retry or nudge.\n`);

  process.exit(runInteractive(command, ws));
}
