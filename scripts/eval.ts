#!/usr/bin/env node
/**
 * The eval CLI. Run `node scripts/eval.ts` for the command list.
 *
 * No dependencies and no build step: Node 22.18+ runs TypeScript directly.
 */
import * as harness from "./commands/harness.ts";
import * as mcp from "./commands/mcp.ts";
import * as workspace from "./commands/workspace.ts";
import { capture } from "./commands/capture.ts";
import { go } from "./commands/go.ts";
import { newRun } from "./commands/new-run.ts";
import { prompt } from "./commands/prompt.ts";
import { queue } from "./commands/queue.ts";
import { start } from "./commands/start.ts";
import { summarize } from "./commands/summarize.ts";

const USAGE = `Personal model + harness evals.

  node scripts/eval.ts <command> [args]

Setting up a harness
  harness list                      every registered harness, what it can do, whether it's installed
  harness add <name>                scaffold harnesses/<name>.yaml for a harness you want to try
  mcp config <harness>              the command that points a harness at the eval MCP server
  mcp check                         prove the eval MCP server works before blaming a model

Running a model
  new-run <model> <harness> [ref]   create runs/<model>/<harness>/ with meta.yaml and scores.csv
  prompt <task-id>                  copy a task's prompt to the clipboard, verbatim
  queue <model> [harness]           walk the ungraded tasks in order, enter for the next
  go <harness> <model> [task|next]  reset + start in one step; 'next' picks the first ungraded task
  workspace reset                   rebuild the sandbox from fixtures/ (run before every task)
  workspace install                 npm ci the sandbox's web/ and be/ projects (build tasks only)
  start <harness> <model>           launch the harness in the sandbox, pinned to the run's model
  workspace save <run-dir> <task>   record the diff and the MCP calls the model made
  capture <model> <task> [harness]  pull the answer, reasoning and transcript out of the session

Scoring
  summarize                         rebuild the README leaderboard and results/*.csv

Environment
  EVAL_WS         the agent's working directory  (default ~/llm-eval-ws)
  EVAL_MCP_DIR    where the eval MCP server is installed  (default ~/llm-eval-mcp)
`;

async function main(argv: string[]): Promise<void> {
  const [command, sub, ...rest] = argv;
  switch (command) {
    case "new-run":
      return newRun(argv.slice(1));
    case "capture":
      return capture(argv.slice(1));
    case "go":
      return go(argv.slice(1));
    case "start":
      return start(argv.slice(1));
    case "prompt":
      return prompt(argv.slice(1));
    case "queue":
      return queue(argv.slice(1));
    case "summarize":
      return summarize();

    case "workspace":
      if (sub === "reset") return workspace.reset();
      if (sub === "save") return workspace.save(rest);
      if (sub === "install") return workspace.install();
      throw new Error("usage: workspace reset | workspace install | workspace save <run-dir> <task-id>");

    case "harness":
      if (sub === "list" || sub === undefined) return harness.list();
      if (sub === "add") return harness.add(rest);
      throw new Error("usage: harness list | harness add <name>");

    case "mcp":
      if (sub === "config") return mcp.config(rest);
      if (sub === "check") return mcp.check();
      throw new Error("usage: mcp config <harness> | mcp check");

    case undefined:
    case "-h":
    case "--help":
    case "help":
      console.log(USAGE);
      return;
    default:
      throw new Error(`Unknown command "${command}".\n\n${USAGE}`);
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
