/**
 * What a harness can do, and therefore which tasks it can be scored on.
 *
 * A harness declares its capabilities in `harnesses/<name>.yaml`; a task declares what it
 * needs in the `requires` column of `tasks/index.csv`. A task the harness can't do is
 * marked `n/a` rather than 0, so a chat-only harness isn't punished for a missing feature.
 */

export type Capability = "chat" | "files" | "shell" | "mcp";

export const CAPABILITIES: Capability[] = ["chat", "files", "shell", "mcp"];

export const CAPABILITY_HELP: Record<Capability, string> = {
  chat: "takes a prompt and answers (every harness has this)",
  files: "can read and write files in the working directory",
  shell: "can run shell commands and read their output",
  mcp: "can connect to an MCP server and call its tools",
};

const isCapability = (value: string): value is Capability => CAPABILITIES.some((c) => c === value);

/** Validate a capability list, naming the file it came from so a typo is easy to find. */
export function parseCapabilities(values: string[], source: string): Capability[] {
  const bad = values.filter((v) => !isCapability(v));
  if (bad.length) {
    throw new Error(
      `${source}: unknown capability ${bad.map((b) => `"${b}"`).join(", ")}. ` +
        `Known capabilities: ${CAPABILITIES.join(", ")}.`,
    );
  }
  return values.filter(isCapability);
}

export const missingCapabilities = (required: Capability[], available: Capability[]) =>
  required.filter((r) => !available.includes(r));
