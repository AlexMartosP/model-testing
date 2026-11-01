/** `harness list` / `harness add <name>` — the registry of harnesses a model can be tried in. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { CAPABILITIES, CAPABILITY_HELP } from "../lib/capabilities.ts";
import { harnessTemplate, loadHarnesses } from "../lib/harnesses.ts";
import { inRoot } from "../lib/paths.ts";
import { capture } from "../lib/proc.ts";
import { loadTasks } from "../lib/tasks.ts";

export function list(): void {
  const harnesses = loadHarnesses();
  if (!harnesses.length) {
    console.log("No harnesses registered. Add one with: node scripts/eval.ts harness add <name>");
    return;
  }
  const tasks = loadTasks();
  const pad = Math.max(...harnesses.map((h) => h.name.length));

  console.log(`${"harness".padEnd(pad)}  installed  tasks  capabilities`);
  for (const h of harnesses) {
    const runnable = tasks.filter((t) => t.requires.every((r) => h.capabilities.includes(r))).length;
    const installed = capture(`command -v ${h.launch.split(/\s+/)[0]}`).ok ? "yes" : "no";
    console.log(
      `${h.name.padEnd(pad)}  ${installed.padEnd(9)}  ${String(runnable).padStart(2)}/${tasks.length}  ${h.capabilities.join(", ")}`,
    );
    if (h.notes) console.log(`${" ".repeat(pad)}  ${h.notes}`);
  }
  console.log(`\nCapabilities:`);
  for (const c of CAPABILITIES) console.log(`  ${c.padEnd(6)} ${CAPABILITY_HELP[c]}`);
}

export function add(args: string[]): void {
  const [name] = args;
  if (args.length !== 1) throw new Error("usage: harness add <name>");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`"${name}" should be lowercase letters, digits and dashes`);

  const file = inRoot("harnesses", `${name}.yaml`);
  if (existsSync(file)) throw new Error(`${file} already exists`);
  mkdirSync(inRoot("harnesses"), { recursive: true });
  writeFileSync(file, harnessTemplate(name));

  console.log(`Created ${file}`);
  console.log(`Fill in launch, capabilities and (if it speaks MCP) mcp_setup, then:`);
  console.log(`  node scripts/eval.ts new-run <model> ${name}`);
}
