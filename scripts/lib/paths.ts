/** Where everything lives. The two workspace paths are overridable so a run can be sandboxed anywhere. */
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const inRoot = (...parts: string[]) => join(ROOT, ...parts);

/** The agent's working directory. Never inside ROOT, so a model can't read the rubrics. */
export const workspaceDir = () => resolve(process.env.EVAL_WS ?? join(homedir(), "llm-eval-ws"));

/**
 * Where the eval MCP server is installed for a run. Separate from the workspace so the
 * server path a harness has to be configured with never points back into this repo.
 */
export const mcpDir = () => resolve(process.env.EVAL_MCP_DIR ?? join(homedir(), "llm-eval-mcp"));

export const mcpServerPath = () => join(mcpDir(), "server.ts");

/** Every MCP tool call a run makes, so MCP tasks can be graded on evidence instead of claims. */
export const mcpLogPath = () => join(mcpDir(), "calls.jsonl");
