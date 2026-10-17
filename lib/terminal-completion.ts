import { listChildren, normalizePath } from "./fs";
import type { VNode } from "./types";

export { labCommands } from "./command-catalog";
export const ctfCommands = "help man clear pwd echo history hostname uname getent whoami id sudo chmod cd ls stat cat more less strings head tail grep wc find locate base64 md5sum sha1sum sha256sum sha512sum python python3 unzip tar unrar curl gpg su".split(" ");

/** Complete the shell token immediately before the cursor, preserving shell quoting. */
export function completeTerminal(line: string, fs: Record<string, VNode>, cwd: string, home: string, commands: string[], canList: (directory: string) => boolean = () => true): string {
  let start = 0, quote = "", escaped = false, value = "", command = true;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (escaped) { value += ch; escaped = false; continue; }
    if (ch === "\\" && quote !== "'") { escaped = true; continue; }
    if (quote) { if (ch === quote) quote = ""; else value += ch; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (/\s/.test(ch) || "|;<>".includes(ch)) {
      if (value) command = false;
      if (ch === "|" || ch === ";") command = true;
      start = i + 1; value = "";
    } else value += ch;
  }
  if (escaped) return line;
  const raw = line.slice(start);
  let candidates: string[];
  if (command && !value.includes("/") && !value.startsWith(".")) {
    candidates = commands.filter(c => c.startsWith(value));
  } else {
    const slash = value.lastIndexOf("/");
    const leading = slash < 0 ? "" : value.slice(0, slash + 1);
    const basename = value.slice(slash + 1);
    const expanded = leading === "~/" ? home + "/" : leading.startsWith("~/") ? home + leading.slice(1) : leading;
    const directory = normalizePath(expanded || ".", cwd);
    if (!canList(directory)) return line;
    candidates = listChildren(fs, directory)
      .filter(n => n.name.startsWith(basename) && (!n.name.startsWith(".") || basename.startsWith(".")))
      .filter(n => !/^\s*cd\s/.test(line) || n.type === "dir")
      .map(n => leading + n.name + (n.type === "dir" ? "/" : ""));
  }
  if (!candidates.length) return line;
  let completed = candidates[0];
  for (const candidate of candidates.slice(1)) {
    while (!candidate.startsWith(completed)) completed = completed.slice(0, -1);
  }
  if (!completed || (candidates.length > 1 && completed === value)) return line;
  const opening = raw[0] === "'" || raw[0] === '"' ? raw[0] : "";
  const encoded = opening === "'" ? completed.replace(/'/g, "'\\''") : opening === '"' ? completed.replace(/[\\"$`]/g, "\\$&") : completed.replace(/[^a-zA-Z0-9_./~{}-]/g, "\\$&");
  const finished = candidates.length === 1 && !completed.endsWith("/");
  return line.slice(0, start) + opening + encoded + (finished ? opening + " " : "");
}
