import { LabState, VNode } from "./types";
import { listChildren, normalizePath, octal, parentPath, permissionString } from "./fs";

export interface ShellResult {
  state: LabState;
  output: string;
  clear?: boolean;
}

function tokenize(input: string) {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
  return tokens;
}

function cloneState(state: LabState): LabState {
  return {
    ...state,
    fs: Object.fromEntries(Object.entries(state.fs).map(([k, v]) => [k, { ...v }])),
    history: [...state.history],
    killedPids: [...state.killedPids],
    processes: state.processes.map((p) => ({ ...p })),
  };
}

function resolveExisting(state: LabState, raw: string) {
  const path = normalizePath(raw || ".", state.cwd);
  return { path, node: state.fs[path] };
}

function longLine(n: VNode) {
  const size = n.type === "dir" ? 4096 : (n.content?.length ?? 0);
  return `${permissionString(n)} 1 ${n.owner.padEnd(8)} ${n.group.padEnd(8)} ${String(size).padStart(5)} Sep 22 09:10 ${n.name}`;
}

function grepText(pattern: string, text: string, ignoreCase = false, lineNumbers = false) {
  const flags = ignoreCase ? "i" : "";
  let rx: RegExp;
  try { rx = new RegExp(pattern, flags); } catch { rx = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags); }
  return text.split("\n")
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => rx.test(line))
    .map(({ line, i }) => lineNumbers ? `${i + 1}:${line}` : line)
    .join("\n");
}

function globToRegex(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

function applySymbolicMode(current: number, spec: string) {
  let mode = current;
  for (const clause of spec.split(",")) {
    const m = clause.match(/^([ugoa]*)([+=-])([rwxst]+)$/);
    if (!m) return undefined;
    const whoRaw = m[1] || "a";
    const op = m[2];
    const perms = m[3];
    const who = whoRaw.includes("a") ? "ugo" : whoRaw;

    let bits = 0;
    for (const w of who) {
      const shift = w === "u" ? 6 : w === "g" ? 3 : 0;
      if (perms.includes("r")) bits |= 0o4 << shift;
      if (perms.includes("w")) bits |= 0o2 << shift;
      if (perms.includes("x")) bits |= 0o1 << shift;
      if (w === "u" && perms.includes("s")) bits |= 0o4000;
    }

    if (op === "+") mode |= bits;
    else if (op === "-") mode &= ~bits;
    else {
      let clearBits = 0;
      for (const w of who) {
        clearBits |= w === "u" ? 0o700 : w === "g" ? 0o070 : 0o007;
        if (w === "u") clearBits |= 0o4000;
      }
      mode = (mode & ~clearBits) | bits;
    }
  }
  return mode;
}

function commandHelp() {
  return [
    "LinuxLab Cyber shell — safe browser simulator",
    "",
    "Navigation:  pwd  ls  cd",
    "Files:       cat  less  head  tail  mkdir  touch  cp  mv  rm  rmdir  stat",
    "Search:      grep  find  wc",
    "Security:    chmod  id  groups  whoami",
    "Processes:   ps  kill",
    "Network:     ip  ss",
    "System:      hostname  uname  history  echo  clear  help  man",
    "Streams:     |  >  >>  tee",
    "",
    "Useful examples:",
    "  ls -la /home/analyst/training",
    "  chmod +x /home/analyst/training/scripts/deploy.sh",
    "  grep -n \"ERROR\" /home/analyst/training/logs/access.log",
    "  find /usr -perm -4000",
    "  ps aux | grep 31337",
    "  echo \"case opened\" > /home/analyst/case.txt",
  ].join("\n");
}

function writeFile(state: LabState, rawPath: string, content: string, append = false) {
  const path = normalizePath(rawPath, state.cwd);
  const parent = state.fs[parentPath(path)];
  if (!parent || parent.type !== "dir") return `bash: ${rawPath}: No such file or directory`;
  const existing = state.fs[path];
  if (existing?.type === "dir") return `bash: ${rawPath}: Is a directory`;
  state.fs[path] = existing
    ? { ...existing, content: append ? `${existing.content || ""}${content}` : content }
    : { type: "file", path, name: path.split("/").pop() || path, owner: "analyst", group: "analyst", mode: 0o644, content };
  return "";
}

function runStage(state: LabState, stage: string, stdin = ""): { state: LabState; output: string; clear?: boolean } {
  const tokens = tokenize(stage.trim());
  const command = tokens.shift() || "";
  let s = state;

  if (!command) return { state: s, output: stdin };

  switch (command) {
    case "help": return { state: s, output: commandHelp() };
    case "man": return { state: s, output: tokens[0] ? `LINUXLAB(1) ${tokens[0]}\n\nTraining manual: run 'help' for supported syntax and examples.` : "What manual page do you want?" };
    case "clear": return { state: s, output: "", clear: true };
    case "pwd": return { state: s, output: s.cwd };
    case "whoami": return { state: s, output: "analyst" };
    case "hostname": return { state: s, output: "training-web-01" };
    case "uname": return { state: s, output: tokens.includes("-a") ? "Linux training-web-01 6.8.0-linuxlab #1 SMP x86_64 GNU/Linux" : "Linux" };
    case "id": return { state: s, output: "uid=1001(analyst) gid=1001(analyst) groups=1001(analyst),1002(soc),4(adm)" };
    case "groups": return { state: s, output: "analyst soc adm" };
    case "ip": {
      if (tokens[0] === "addr" || tokens[0] === "a" || tokens.length === 0) return { state: s, output: [
        "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN",
        "    inet 127.0.0.1/8 scope host lo",
        "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP",
        "    inet 10.20.30.15/24 brd 10.20.30.255 scope global eth0",
      ].join("\n") };
      return { state: s, output: `Object "${tokens[0]}" is unknown in this simulator. Try: ip addr` };
    }
    case "ss": return { state: s, output: [
      "State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process",
      "LISTEN 0      128    0.0.0.0:22          0.0.0.0:*     users:((\"sshd\",pid=812,fd=3))",
      "LISTEN 0      511    127.0.0.1:8080      0.0.0.0:*     users:((\"node\",pid=1432,fd=18))",
      "LISTEN 0      16     0.0.0.0:4444        0.0.0.0:*     users:((\"kworker-update\",pid=31337,fd=7))",
    ].join("\n") };
    case "history": return { state: s, output: s.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n") };
    case "echo": return { state: s, output: tokens.join(" ") };

    case "cd": {
      const target = normalizePath(tokens[0] || "~", s.cwd);
      const n = s.fs[target];
      if (!n) return { state: s, output: `bash: cd: ${tokens[0] || ""}: No such file or directory` };
      if (n.type !== "dir") return { state: s, output: `bash: cd: ${tokens[0]}: Not a directory` };
      return { state: { ...s, cwd: target }, output: "" };
    }

    case "ls": {
      const flags = tokens.filter((t) => t.startsWith("-"));
      const targetArg = tokens.find((t) => !t.startsWith("-")) || ".";
      const long = flags.some((f) => f.includes("l"));
      const all = flags.some((f) => f.includes("a"));

      if (targetArg.includes("*") || targetArg.includes("?")) {
        const normalizedPattern = normalizePath(targetArg, s.cwd);
        const dir = parentPath(normalizedPattern);
        const basePattern = normalizedPattern.split("/").pop() || "*";
        const parent = s.fs[dir];
        if (!parent || parent.type !== "dir") return { state: s, output: `ls: cannot access '${targetArg}': No such file or directory` };
        const rx = globToRegex(basePattern);
        const matches = listChildren(s.fs, dir).filter((n) => rx.test(n.name) && (all || !n.name.startsWith(".")));
        return { state: s, output: long ? matches.map(longLine).join("\n") : matches.map((n) => n.name).join("  ") };
      }

      const { path, node } = resolveExisting(s, targetArg);
      if (!node) return { state: s, output: `ls: cannot access '${targetArg}': No such file or directory` };
      if (node.type === "file") return { state: s, output: long ? longLine(node) : node.name };
      const children = listChildren(s.fs, path).filter((n) => all || !n.name.startsWith("."));
      if (long) {
        const entries: VNode[] = [];
        if (all) {
          entries.push({ ...node, name: "." });
          const parent = s.fs[parentPath(path)] || node;
          entries.push({ ...parent, name: ".." });
        }
        entries.push(...children);
        return { state: s, output: `total ${entries.length * 4}\n${entries.map(longLine).join("\n")}` };
      }
      return { state: s, output: [...(all ? [".", ".."] : []), ...children.map((n) => n.name)].join("  ") };
    }

    case "cat":
    case "less": {
      if (!tokens.length && stdin) return { state: s, output: stdin };
      const outputs: string[] = [];
      for (const arg of tokens) {
        const { node } = resolveExisting(s, arg);
        if (!node) outputs.push(`${command}: ${arg}: No such file or directory`);
        else if (node.type === "dir") outputs.push(`${command}: ${arg}: Is a directory`);
        else outputs.push(node.content || "");
      }
      return { state: s, output: outputs.join("\n") };
    }

    case "head":
    case "tail": {
      let count = 10;
      const nIndex = tokens.indexOf("-n");
      if (nIndex >= 0 && tokens[nIndex + 1]) count = Number(tokens[nIndex + 1]) || 10;
      const fileArg = tokens.filter((t, i) => t !== "-n" && i !== nIndex + 1).find((t) => !t.startsWith("-"));
      let text = stdin;
      if (fileArg) {
        const { node } = resolveExisting(s, fileArg);
        if (!node || node.type !== "file") return { state: s, output: `${command}: cannot open '${fileArg}' for reading` };
        text = node.content || "";
      }
      const lines = text.split("\n").filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ""));
      return { state: s, output: (command === "head" ? lines.slice(0, count) : lines.slice(-count)).join("\n") };
    }

    case "grep": {
      const ignoreCase = tokens.includes("-i") || tokens.some((t) => t.startsWith("-") && t.includes("i"));
      const lineNumbers = tokens.includes("-n") || tokens.some((t) => t.startsWith("-") && t.includes("n"));
      const clean = tokens.filter((t) => !t.startsWith("-"));
      const pattern = clean.shift();
      if (!pattern) return { state: s, output: "Usage: grep [OPTION] PATTERN [FILE]" };
      let text = stdin;
      const fileArg = clean[0];
      if (fileArg) {
        const { node } = resolveExisting(s, fileArg);
        if (!node || node.type !== "file") return { state: s, output: `grep: ${fileArg}: No such file or directory` };
        text = node.content || "";
      }
      return { state: s, output: grepText(pattern, text, ignoreCase, lineNumbers) };
    }

    case "find": {
      const rootArg = tokens[0] && !tokens[0].startsWith("-") ? tokens[0] : ".";
      const root = normalizePath(rootArg, s.cwd);
      if (!s.fs[root]) return { state: s, output: `find: '${rootArg}': No such file or directory` };
      let results = Object.values(s.fs).filter((n) => n.path === root || n.path.startsWith(root === "/" ? "/" : `${root}/`));
      const nameIdx = tokens.indexOf("-name");
      if (nameIdx >= 0 && tokens[nameIdx + 1]) {
        const rx = globToRegex(tokens[nameIdx + 1]);
        results = results.filter((n) => rx.test(n.name));
      }
      const permIdx = tokens.indexOf("-perm");
      if (permIdx >= 0 && tokens[permIdx + 1]) {
        const raw = tokens[permIdx + 1];
        const minimum = raw.startsWith("-");
        const wanted = parseInt(raw.replace(/^-/, ""), 8);
        if (!Number.isNaN(wanted)) results = results.filter((n) => minimum ? (n.mode & wanted) === wanted : n.mode === wanted);
      }
      const typeIdx = tokens.indexOf("-type");
      if (typeIdx >= 0 && tokens[typeIdx + 1]) {
        const t = tokens[typeIdx + 1];
        results = results.filter((n) => t === "f" ? n.type === "file" : t === "d" ? n.type === "dir" : true);
      }
      return { state: s, output: results.map((n) => n.path).join("\n") };
    }

    case "wc": {
      const textArg = tokens.find((t) => !t.startsWith("-"));
      let text = stdin;
      if (textArg) {
        const { node } = resolveExisting(s, textArg);
        if (!node || node.type !== "file") return { state: s, output: `wc: ${textArg}: No such file or directory` };
        text = node.content || "";
      }
      const lines = text ? text.split("\n").filter((_, i, a) => !(i === a.length - 1 && a[i] === "")).length : 0;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const bytes = text.length;
      if (tokens.includes("-l")) return { state: s, output: `${lines}${textArg ? ` ${textArg}` : ""}` };
      return { state: s, output: `${lines} ${words} ${bytes}${textArg ? ` ${textArg}` : ""}` };
    }

    case "stat": {
      const arg = tokens[0];
      if (!arg) return { state: s, output: "stat: missing operand" };
      const { node } = resolveExisting(s, arg);
      if (!node) return { state: s, output: `stat: cannot statx '${arg}': No such file or directory` };
      return { state: s, output: [
        `  File: ${node.path}`,
        `  Size: ${node.type === "dir" ? 4096 : (node.content?.length ?? 0)}\tType: ${node.type}`,
        `Access: (${octal(node.mode)}/${permissionString(node).slice(1)})  Uid: (${node.owner})   Gid: (${node.group})`,
        "Modify: 2026-09-22 09:10:00 +0700",
      ].join("\n") };
    }

    case "chmod": {
      const modeArg = tokens[0];
      const fileArg = tokens[1];
      if (!modeArg || !fileArg) return { state: s, output: "chmod: missing operand" };
      const path = normalizePath(fileArg, s.cwd);
      const existing = s.fs[path];
      if (!existing) return { state: s, output: `chmod: cannot access '${fileArg}': No such file or directory` };
      const mode = /^[0-7]{3,4}$/.test(modeArg) ? parseInt(modeArg, 8) : applySymbolicMode(existing.mode, modeArg);
      if (mode === undefined) return { state: s, output: `chmod: unsupported mode '${modeArg}' in this training simulator` };
      s.fs[path] = { ...existing, mode };
      return { state: s, output: "" };
    }

    case "mkdir": {
      if (!tokens.length) return { state: s, output: "mkdir: missing operand" };
      const outputs: string[] = [];
      for (const arg of tokens.filter((t) => !t.startsWith("-"))) {
        const path = normalizePath(arg, s.cwd);
        if (s.fs[path]) { outputs.push(`mkdir: cannot create directory '${arg}': File exists`); continue; }
        const parent = s.fs[parentPath(path)];
        if (!parent || parent.type !== "dir") { outputs.push(`mkdir: cannot create directory '${arg}': No such file or directory`); continue; }
        s.fs[path] = { type: "dir", path, name: path.split("/").pop() || path, owner: "analyst", group: "analyst", mode: 0o755 };
      }
      return { state: s, output: outputs.join("\n") };
    }

    case "touch": {
      if (!tokens.length) return { state: s, output: "touch: missing file operand" };
      const outputs: string[] = [];
      for (const arg of tokens) {
        const path = normalizePath(arg, s.cwd);
        const parent = s.fs[parentPath(path)];
        if (!parent || parent.type !== "dir") { outputs.push(`touch: cannot touch '${arg}': No such file or directory`); continue; }
        if (!s.fs[path]) s.fs[path] = { type: "file", path, name: path.split("/").pop() || path, owner: "analyst", group: "analyst", mode: 0o644, content: "" };
      }
      return { state: s, output: outputs.join("\n") };
    }

    case "cp": {
      const [srcArg, dstArg] = tokens.filter((t) => !t.startsWith("-"));
      if (!srcArg || !dstArg) return { state: s, output: "cp: missing file operand" };
      const srcPath = normalizePath(srcArg, s.cwd);
      const src = s.fs[srcPath];
      if (!src) return { state: s, output: `cp: cannot stat '${srcArg}': No such file or directory` };
      if (src.type === "dir") return { state: s, output: "cp: omitting directory (recursive copy not enabled in this lab)" };
      let dstPath = normalizePath(dstArg, s.cwd);
      if (s.fs[dstPath]?.type === "dir") dstPath = normalizePath(`${dstPath}/${src.name}`, "/");
      if (!s.fs[parentPath(dstPath)]) return { state: s, output: `cp: cannot create regular file '${dstArg}': No such file or directory` };
      s.fs[dstPath] = { ...src, path: dstPath, name: dstPath.split("/").pop() || dstPath, owner: "analyst", group: "analyst" };
      return { state: s, output: "" };
    }

    case "mv": {
      const [srcArg, dstArg] = tokens;
      if (!srcArg || !dstArg) return { state: s, output: "mv: missing file operand" };
      const srcPath = normalizePath(srcArg, s.cwd);
      const src = s.fs[srcPath];
      if (!src) return { state: s, output: `mv: cannot stat '${srcArg}': No such file or directory` };
      let dstPath = normalizePath(dstArg, s.cwd);
      if (s.fs[dstPath]?.type === "dir") dstPath = normalizePath(`${dstPath}/${src.name}`, "/");
      if (!s.fs[parentPath(dstPath)]) return { state: s, output: `mv: cannot move '${srcArg}' to '${dstArg}': No such file or directory` };
      s.fs[dstPath] = { ...src, path: dstPath, name: dstPath.split("/").pop() || dstPath };
      delete s.fs[srcPath];
      return { state: s, output: "" };
    }

    case "rm": {
      const recursive = tokens.includes("-r") || tokens.includes("-rf") || tokens.includes("-fr");
      const args = tokens.filter((t) => !t.startsWith("-"));
      if (!args.length) return { state: s, output: "rm: missing operand" };
      const outputs: string[] = [];
      for (const arg of args) {
        const path = normalizePath(arg, s.cwd);
        const n = s.fs[path];
        if (!n) { outputs.push(`rm: cannot remove '${arg}': No such file or directory`); continue; }
        if (n.type === "dir" && !recursive) { outputs.push(`rm: cannot remove '${arg}': Is a directory`); continue; }
        Object.keys(s.fs).filter((p) => p === path || (recursive && p.startsWith(`${path}/`))).forEach((p) => delete s.fs[p]);
      }
      return { state: s, output: outputs.join("\n") };
    }

    case "rmdir": {
      const arg = tokens[0];
      if (!arg) return { state: s, output: "rmdir: missing operand" };
      const path = normalizePath(arg, s.cwd);
      const node = s.fs[path];
      if (!node) return { state: s, output: `rmdir: failed to remove '${arg}': No such file or directory` };
      if (node.type !== "dir") return { state: s, output: `rmdir: failed to remove '${arg}': Not a directory` };
      if (listChildren(s.fs, path).length) return { state: s, output: `rmdir: failed to remove '${arg}': Directory not empty` };
      delete s.fs[path];
      return { state: s, output: "" };
    }

    case "tee": {
      const append = tokens.includes("-a");
      const fileArg = tokens.find((t) => !t.startsWith("-"));
      if (!fileArg) return { state: s, output: "tee: missing file operand" };
      const error = writeFile(s, fileArg, stdin + (stdin && !stdin.endsWith("\n") ? "\n" : ""), append);
      return { state: s, output: error || stdin };
    }

    case "ps": {
      const alive = s.processes.filter((p) => p.alive);
      return { state: s, output: ["USER       PID %CPU %MEM COMMAND", ...alive.map((p) => `${p.user.padEnd(10)} ${String(p.pid).padStart(5)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.command}`)].join("\n") };
    }

    case "kill": {
      const clean = tokens.filter((t) => !t.startsWith("-"));
      const pid = Number(clean[0]);
      if (!pid) return { state: s, output: "kill: usage: kill [-SIGNAL] pid" };
      const proc = s.processes.find((p) => p.pid === pid && p.alive);
      if (!proc) return { state: s, output: `bash: kill: (${pid}) - No such process` };
      s.processes = s.processes.map((p) => p.pid === pid ? { ...p, alive: false, cpu: 0 } : p);
      if (!s.killedPids.includes(pid)) s.killedPids.push(pid);
      return { state: s, output: "" };
    }

    default:
      return { state: s, output: `bash: ${command}: command not found\nType 'help' to see commands implemented by LinuxLab.` };
  }
}

function splitPipeline(line: string) {
  const stages: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && (!quote || quote === ch)) quote = quote ? null : ch;
    if (ch === "|" && !quote) { stages.push(current.trim()); current = ""; }
    else current += ch;
  }
  if (current.trim()) stages.push(current.trim());
  return stages;
}

function extractRedirection(line: string) {
  let quote: string | null = null;
  for (let i = line.length - 1; i >= 0; i--) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && (!quote || quote === ch)) quote = quote ? null : ch;
    if (!quote && ch === ">") {
      const append = i > 0 && line[i - 1] === ">";
      const opStart = append ? i - 1 : i;
      const command = line.slice(0, opStart).trim();
      const file = line.slice(i + 1).trim();
      if (command && file && !file.includes(" ")) return { command, file, append };
    }
  }
  return null;
}

export function executeLine(inputState: LabState, rawLine: string): ShellResult {
  const line = rawLine.trim();
  let state = cloneState(inputState);
  if (!line) return { state, output: "" };
  state.history.push(line);

  const redirection = extractRedirection(line);
  const commandLine = redirection?.command || line;
  const pipeline = splitPipeline(commandLine);
  let output = "";
  let clear = false;
  for (const stage of pipeline) {
    const result = runStage(state, stage, output);
    state = result.state;
    output = result.output;
    clear = clear || Boolean(result.clear);
  }

  if (redirection) {
    const error = writeFile(state, redirection.file, output + (output && !output.endsWith("\n") ? "\n" : ""), redirection.append);
    return { state, output: error, clear };
  }
  return { state, output, clear };
}
