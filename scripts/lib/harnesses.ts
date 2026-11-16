/**
 * The harness registry: one `harnesses/<name>.yaml` per harness.
 *
 * Registering a harness is what makes a run reproducible. The entry records how the harness
 * is launched, how to read its version, what it can do, and how an MCP server is attached to
 * it, so a run folder is never just a name with no way to recreate it.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { Capability } from "./capabilities.ts";
import { CAPABILITIES, CAPABILITY_HELP, parseCapabilities } from "./capabilities.ts";
import { inRoot } from "./paths.ts";
import { asList, parseFlatYaml } from "./yaml.ts";

export type Harness = {
  name: string;
  /** Command that starts the harness interactively, run with the workspace as cwd. */
  launch: string;
  /** Command that prints the harness version, recorded into meta.yaml. */
  version_command: string;
  capabilities: Capability[];
  /** Command that registers the eval MCP server. `{server}` is the installed server path. */
  mcp_setup: string;
  notes: string;
  /** Path of the yaml this came from, for error messages. */
  file: string;
};

/** Stand-in for the model under test inside a `launch` command, filled from the run's model_ref. */
export const MODEL_PLACEHOLDER = "{model}";

const dir = () => inRoot("harnesses");

export function loadHarnesses(): Harness[] {
  if (!existsSync(dir())) return [];
  return readdirSync(dir())
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => parseHarness(join(dir(), f)));
}

function parseHarness(file: string): Harness {
  const y = parseFlatYaml(readFileSync(file, "utf8"));
  const expected = basename(file, ".yaml");
  const name = y.name || expected;
  if (name !== expected) throw new Error(`${file}: name is "${name}" but the file is ${expected}.yaml`);
  if (!y.launch) throw new Error(`${file}: "launch" is required (the command that starts the harness)`);

  const capabilities = parseCapabilities(asList(y.capabilities), file);
  if (capabilities.includes("mcp") && !y.mcp_setup) {
    throw new Error(`${file}: declares the "mcp" capability, so it needs an "mcp_setup" command`);
  }
  return {
    name,
    launch: y.launch,
    version_command: y.version_command ?? "",
    capabilities,
    mcp_setup: y.mcp_setup ?? "",
    notes: y.notes ?? "",
    file,
  };
}

export function requireHarness(name: string): Harness {
  const all = loadHarnesses();
  const found = all.find((h) => h.name === name);
  if (found) return found;
  const known = all.length ? all.map((h) => h.name).join(", ") : "none registered yet";
  throw new Error(
    `Unknown harness "${name}". Registered: ${known}.\n` +
      `Add it with:  node scripts/eval.ts harness add ${name}`,
  );
}

export const harnessTemplate = (name: string) => `# How to run ${name}, so a run in this harness can be recreated.
name: ${name}
# Command that starts it; cwd is the eval workspace. Include ${MODEL_PLACEHOLDER} and it is filled
# from the run's model_ref, so the harness's own default model can never decide what you test.
launch: ${name} --model ${MODEL_PLACEHOLDER}
version_command: ${name} --version
# What it can do. Tasks needing a capability it lacks are scored n/a, not 0.
# ${CAPABILITIES.map((c) => `${c}: ${CAPABILITY_HELP[c]}`).join("\n# ")}
capabilities: chat, files, shell
# Command that registers the eval MCP server. {server} is substituted with its path.
# Required when "mcp" is in capabilities. See mcp/README.md.
mcp_setup:
notes:
`;
