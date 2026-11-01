/**
 * A deliberately tiny YAML subset, which is all `meta.yaml` and `harnesses/*.yaml` use:
 *
 *   key: value            one pair per line, value is always read as a string
 *   key: a, b, c          lists are comma separated on one line (read with `asList`)
 *   key: "has: a colon"   surrounding quotes are stripped
 *   # comment             a `#` at line start or after whitespace ends the line
 *
 * Nesting, block scalars and multi-line lists are not supported on purpose: if a file
 * here ever needs them, reach for a real parser rather than growing this one.
 */

export type FlatYaml = Record<string, string>;

function stripComment(line: string): string {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = ""; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function unquote(value: string): string {
  const q = value[0];
  return (q === '"' || q === "'") && value.length > 1 && value.at(-1) === q ? value.slice(1, -1) : value;
}

export function parseFlatYaml(text: string): FlatYaml {
  const out: FlatYaml = {};
  for (const raw of text.split("\n")) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    if (key) out[key] = unquote(line.slice(colon + 1).trim());
  }
  return out;
}

/** `a, b, c` -> ["a", "b", "c"]; empty or missing -> []. */
export const asList = (value: string | undefined) =>
  (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
