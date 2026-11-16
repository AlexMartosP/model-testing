/** Putting text on the clipboard, on whichever platform this is. */
import { platform } from "node:os";
import { pipeTo } from "./proc.ts";

/** Clipboard tools by platform, in order of preference. All of them read stdin. */
const TOOLS: Record<string, string[][]> = {
  darwin: [["pbcopy"]],
  linux: [["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]],
  win32: [["clip"]],
};

/** Returns the tool that worked, or null if nothing is available. */
export function copyToClipboard(text: string): string | null {
  for (const [command, ...args] of TOOLS[platform()] ?? []) {
    if (pipeTo(command, args, text)) return command;
  }
  return null;
}
