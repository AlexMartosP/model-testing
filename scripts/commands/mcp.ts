/**
 * `mcp config <harness>` / `mcp check` — the MCP side of a run.
 *
 * MCP tasks need two things to be true before a score means anything: the harness is pointed at
 * the eval server, and the server itself works. `config` prints the first, `check` proves the
 * second by speaking the protocol to it.
 */
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import type { Writable } from "node:stream";
import { existsSync } from "node:fs";
import type { Harness } from "../lib/harnesses.ts";
import { requireHarness } from "../lib/harnesses.ts";
import { ROOT, inRoot, mcpLogPath, mcpServerPath } from "../lib/paths.ts";

/** A harness's `mcp_setup` with `{server}` filled in. */
export function resolveMcpSetup(harness: Harness): string {
  if (!harness.mcp_setup) return `${harness.name} has no mcp_setup command in ${harness.file}`;
  return harness.mcp_setup.replaceAll("{server}", mcpServerPath());
}

export function config(args: string[]): void {
  const [name] = args;
  if (args.length !== 1) throw new Error("usage: mcp config <harness>");

  const harness = requireHarness(name);
  if (!harness.capabilities.includes("mcp")) {
    console.log(`${harness.name} does not declare the "mcp" capability, so MCP tasks are scored n/a.`);
    console.log(`If that is wrong, add "mcp" to capabilities in ${harness.file}.`);
    return;
  }
  if (!existsSync(mcpServerPath())) {
    console.log(`! The server is not installed yet. Run: node scripts/eval.ts workspace reset\n`);
  }
  console.log(`Register the eval MCP server with ${harness.name}:\n`);
  console.log(`  ${resolveMcpSetup(harness)}\n`);
  console.log(`server:   ${mcpServerPath()}`);
  console.log(`call log: ${mcpLogPath()}`);
}

/** Line-delimited JSON-RPC 2.0 over a child process's stdio: enough to talk to one MCP server. */
class StdioClient {
  #child: ChildProcess;
  #stdin: Writable;
  #pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  #buffer = "";
  #nextId = 1;
  stderr = "";

  constructor(command: string, args: string[]) {
    // An empty log path tells the server not to record these calls as part of a run.
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, EVAL_MCP_LOG: "" } });
    if (!child.stdin || !child.stdout || !child.stderr) throw new Error("could not open pipes to the MCP server");

    this.#child = child;
    this.#stdin = child.stdin;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.#onData(chunk));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { this.stderr += chunk; });
    child.on("exit", (code) => this.#failAll(new Error(`server exited with code ${code}`)));
    child.on("error", (err) => this.#failAll(err));
  }

  #onData(chunk: string): void {
    this.#buffer += chunk;
    let newline = this.#buffer.indexOf("\n");
    while (newline !== -1) {
      const line = this.#buffer.slice(0, newline).trim();
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line) this.#dispatch(line);
      newline = this.#buffer.indexOf("\n");
    }
  }

  #dispatch(line: string): void {
    let message: { id?: number; result?: unknown; error?: { message?: string } };
    try {
      message = JSON.parse(line);
    } catch {
      this.stderr += `\nunparseable line from server: ${line}`;
      return;
    }
    if (typeof message.id !== "number") return; // a notification from the server
    const waiter = this.#pending.get(message.id);
    if (!waiter) return;
    this.#pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  }

  #failAll(error: Error): void {
    for (const waiter of this.#pending.values()) waiter.reject(error);
    this.#pending.clear();
  }

  #send(payload: Record<string, unknown>): void {
    this.#stdin.write(JSON.stringify(payload) + "\n");
  }

  request(method: string, params?: unknown): Promise<unknown> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#send({ jsonrpc: "2.0", id, method, params });
      setTimeout(() => {
        if (this.#pending.delete(id)) reject(new Error(`${method} timed out after 10s`));
      }, 10_000).unref();
    });
  }

  notify(method: string, params?: unknown): void {
    this.#send({ jsonrpc: "2.0", method, params });
  }

  close(): void {
    this.#stdin.end();
    this.#child.kill();
  }
}

type ToolList = { tools?: Array<{ name?: string; description?: string }> };
type ToolResult = { content?: Array<{ type?: string; text?: string }>; isError?: boolean };

export async function check(): Promise<void> {
  const installed = mcpServerPath();
  const server = existsSync(installed) ? installed : inRoot("mcp/server.ts");
  if (!existsSync(server)) throw new Error(`no MCP server at ${server}`);
  console.log(`Checking ${server}${server === installed ? " (installed)" : ` (source in ${ROOT})`}\n`);

  const client = new StdioClient(process.execPath, [server]);
  try {
    const init = await client.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "eval-check", version: "1" },
    });
    const info = init as { protocolVersion?: string; serverInfo?: { name?: string; version?: string } };
    console.log(`initialize  ok  ${info.serverInfo?.name} ${info.serverInfo?.version} (protocol ${info.protocolVersion})`);
    client.notify("notifications/initialized");

    const listed = await client.request("tools/list");
    const tools = (listed as ToolList).tools ?? [];
    console.log(`tools/list  ok  ${tools.length} tools`);
    for (const tool of tools) console.log(`              ${tool.name}  ${tool.description ?? ""}`);

    const first = tools[0]?.name;
    if (!first) throw new Error("the server exposes no tools");
    const called = await client.request("tools/call", { name: first, arguments: { service: "checkout", limit: 2 } });
    const result = called as ToolResult;
    const text = result.content?.find((c) => c.type === "text")?.text ?? "";
    console.log(`tools/call  ${result.isError ? "returned an error" : "ok"}  ${first} -> ${text.split("\n")[0].slice(0, 100)}`);

    const unknown = await client.request("tools/call", { name: "no_such_tool", arguments: {} })
      .then(() => "no error", (e: Error) => `rejected: ${e.message}`);
    console.log(`unknown tool  ${unknown}`);
    console.log(`\nServer is healthy.`);
  } catch (error) {
    if (client.stderr.trim()) console.error(`\nserver stderr:\n${client.stderr.trim()}`);
    throw error;
  } finally {
    client.close();
  }
}
