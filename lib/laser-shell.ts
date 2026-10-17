import { normalizePath, parentPath, listChildren, permissionString } from "./fs";
import { laserLevels } from "./laser-levels";
import { laserChecksums } from "./laser-checksums";
import { laserVmNodes, laserVmAccounts } from "./laser-vm-fixtures";
import type { LabState, VNode } from "./types";
import { completeTerminal, ctfCommands } from "./terminal-completion";

export interface LaserState extends LabState { level: number; root: boolean; pendingSu?: number; pendingLogin?: boolean; pendingSudo?: string[]; sudoUntil?: number }
export const laserHome = (level: number) => `/home/level${level}`;
export function formatVmDate(timestamp?: number) {
  if (timestamp === undefined) return "—";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset" }).formatToParts(new Date(timestamp * 1000));
  const value = (name: string) => parts.find(p => p.type === name)?.value || "";
  return value("year") + "-" + value("month") + "-" + value("day") + " " + value("hour") + ":" + value("minute") + ":" + value("second") + " " + value("timeZoneName").replace("GMT", "").replace(":", "");
}

export class MissingVmFile extends Error { constructor(public path: string) { super(path); } }
function accessBits(s: LaserState, node: VNode) { return s.root ? 7 : (node.mode >> (node.owner === `level${s.level}` ? 6 : node.group === `level${s.level}` ? 3 : 0)) & 7; }
function canTraverse(s: LaserState, path: string, includeTarget = false): boolean {
  if (s.root) return true;
  let current = includeTarget ? path : parentPath(path);
  while (true) {
    const node = s.fs[current];
    if (!node || node.type !== "dir" || !(accessBits(s, node) & 1)) return false;
    if (current === "/") return true;
    current = parentPath(current);
  }
}

function put(s: LaserState, path: string, content?: string, mode = 0o644, owner = `level${s.level}`, group = owner) {
  path = normalizePath(path, s.cwd);
  if (path !== "/" && !s.fs[parentPath(path)]) put(s, parentPath(path));
  s.fs[path] = { path, name: path.split("/").pop() || "/", type: content === undefined ? "dir" : "file", content, mode: content === undefined ? 0o755 : mode, owner, group };
}

export function createLaserState(level: number): LaserState {
  const s: LaserState = { level, root: false, cwd: laserHome(level), fs: Object.fromEntries(laserVmNodes.map(n => [n.path, { ...n }])), history: [], processes: [], killedPids: [] };
  put(s, "/etc", undefined, 0o755, "root", "root");
  put(s, "/etc/hostname", "Laser\n", 0o644, "root", "root");
  put(s, "/etc/os-release", 'NAME="Ubuntu"\nVERSION="16.04.4 LTS (Xenial Xerus)"\nID=ubuntu\nID_LIKE=debian\nPRETTY_NAME="Ubuntu 16.04.4 LTS"\nVERSION_ID="16.04"\nHOME_URL="http://www.ubuntu.com/"\nSUPPORT_URL="http://help.ubuntu.com/"\nBUG_REPORT_URL="http://bugs.launchpad.net/ubuntu/"\nVERSION_CODENAME=xenial\nUBUNTU_CODENAME=xenial\n', 0o644, "root", "root");
  return s;
}

// A small lexer keeps spaces, quotes, escapes and operators distinct.
function lex(line: string): { value: string; operator: boolean; glob: boolean }[] {
  const out: ReturnType<typeof lex> = [];
  let value = "", quote = "", started = false, glob = false;
  const push = () => { if (started) out.push({ value, operator: false, glob }); value = ""; started = false; glob = false; };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && quote !== "'") { if (++i >= line.length) throw new Error("bash: escape belum lengkap"); value += line[i]; started = true; }
    else if (quote) { if (c === quote) quote = ""; else value += c; }
    else if (c === '"' || c === "'") { quote = c; started = true; }
    else if (/\s/.test(c)) push();
    else if (c === "|" || c === ">") { push(); const op = c === ">" && line[i+1] === ">" ? (i++, ">>") : c; out.push({ value: op, operator: true, glob: false }); }
    else { value += c; started = true; glob ||= c === "*" || c === "?"; }
  }
  if (quote) throw new Error("bash: tanda kutip belum ditutup");
  push(); return out;
}

function expand(s: LaserState, word: ReturnType<typeof lex>[number]) {
  const value = word.value === "~" ? laserHome(s.level) : word.value.replace(/^~\//, laserHome(s.level) + "/");
  if (!word.glob) return [value];
  const path = normalizePath(value, s.cwd), dir = parentPath(path);
  const pattern = path.split("/").pop()!.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  const matches = listChildren(s.fs, dir).filter(n => !n.name.startsWith(".") && new RegExp(`^${pattern}$`).test(n.name)).map(n => n.path).sort();
  return matches.length ? matches : [value];
}

function run(s: LaserState, args: string[], stdin: string): { state: LaserState; output: string; clear?: boolean } {
  const [cmd, ...a] = args;
  const ok = (output: string, clear?: boolean) => ({ state: s, output, clear });
  const path = (v: string) => normalizePath(v, s.cwd);
  const get = (v: string) => s.fs[path(v)];
  const readable = (n: VNode) => s.root || !!(n.mode & (n.owner === `level${s.level}` ? 0o400 : n.group === `level${s.level}` ? 0o040 : 0o004));
  const error = (v: string) => !get(v) ? `${cmd}: ${v}: No such file or directory` : get(v).type === "dir" ? `${cmd}: ${v}: Is a directory` : !canTraverse(s, path(v)) || !readable(get(v)) ? `${cmd}: ${v}: Permission denied` : "";
  const read = (v: string) => { const failure = error(v); if (failure) return failure; const n = get(v); if (n.blob && n.content === undefined) throw new MissingVmFile(n.path); return n.content || ""; };
  if (!cmd) return ok(stdin);
  if (cmd === "help" || cmd === "man") return ok("Simulasi Linux Laser — subset perintah Linux\nNavigasi: pwd, ls [-la], cd, stat, whoami, id, chmod u+r FILE\nTeks: cat, head -n N, tail -n N, grep [-in], more, less, strings\nPencarian: find / -name 'pola', locate nama\nArsip: unzip, tar -xvf, unrar x\nLainnya: python, ./flag, base64 -d, md5sum, sha1sum, sha256sum, sha512sum, curl, gpg, sudo -l, sudo cat, history, clear\nOperator: |, >, >> dan wildcard * / ?\nTab melengkapi nama berkas. Panah atas/bawah membuka riwayat.\nPager menampilkan teks ke scrollback terminal. Arsip, interpreter, GPG dan HTTP dimodelkan, bukan program atau jaringan sungguhan.\nKetik su levelN untuk mengganti akun (contoh: su level1 dari level0). Saat Password: muncul, masukkan isi flag level saat ini tanpa Cakgup{}. Password tidak ditampilkan. Ctrl+C membatalkan. Plain su mempertahankan direktori kerja; gunakan cd atau su - levelN untuk membuka home. Sudo level30 meminta password akun saat ini. File tantangan dan checksum berasal dari VM asli; interpreter/arsip/HTTP tetap dimodelkan. Keluaran terminal dibatasi; gunakan head/tail/grep untuk log besar. Level30 adalah level akhir: dapatkan root dengan sudo su dan cari GoldenTiket.txt. Tidak ada akun level31.");
  if (cmd === "clear") return ok("", true);
  if (cmd === "pwd") return ok(s.cwd);
  if (cmd === "echo") return ok((a[0] === "-n" ? a.slice(1) : a).join(" "));
  if (cmd === "history") return ok(s.history.map((v, i) => `${i+1}  ${v}`).join("\n"));
  if (cmd === "hostname") return ok("Laser");
  if (cmd === "uname") return ok(a.includes("-a") ? "Linux Laser 4.4.0-116-generic #140-Ubuntu SMP Mon Feb 12 21:22:43 UTC 2018 i686 i686 i686 GNU/Linux" : "Linux");
  if (cmd === "getent" && a[0] === "passwd") return ok(laserVmAccounts.filter(user => !a[1] || user.name === a[1]).map(user => `${user.name}:x:${user.uid}:${user.gid}::${user.home}:${user.shell}`).join("\n"));
  if (cmd === "whoami") return ok(s.root ? "root" : `level${s.level}`);
  if (cmd === "id") return ok(s.root ? "uid=0(root) gid=0(root) groups=0(root)" : `uid=${1001+s.level}(level${s.level}) gid=${1001+s.level}(level${s.level}) groups=${1001+s.level}(level${s.level})`);
  if (cmd === "sudo") {
    if (s.level < 30) return ok("sudo: pengguna ini tidak memiliki hak sudo dalam level ini.");
    if (a[0] === "-l") return ok("User level30 may run the following commands on Laser:\n    (ALL : ALL) ALL");
    if (a.length === 1 && a[0] === "su") return { state: { ...s, root: true }, output: "Sekarang kamu root. Baca flag.txt, lalu cari GoldenTiket.txt." };
    if (!a.length) return ok("usage: sudo COMMAND");
    const result = run({ ...s, root: true }, a, stdin);
    return { ...result, state: { ...result.state, root: s.root } };
  }
  if (cmd === "chmod") {
    if (a.length !== 2) return ok("Penggunaan: chmod u+r FILE atau chmod 600 FILE");
    const n = get(a[1]);
    if (!n) return ok(`chmod: ${a[1]}: No such file or directory`);
    if (!s.root && n.owner !== `level${s.level}`) return ok(`chmod: ${a[1]}: Operation not permitted`);
    const mode = /^[0-7]{3}$/.test(a[0]) ? parseInt(a[0], 8) : a[0] === "u+r" ? n.mode | 0o400 : a[0] === "+r" || a[0] === "a+r" ? n.mode | 0o444 : undefined;
    if (mode === undefined) return ok("chmod: mode belum didukung; gunakan u+r atau mode numerik seperti 600");
    s.fs[n.path] = { ...n, mode }; return ok("");
  }
  if (cmd === "cd") {
    const dest = a[0] || (s.root ? "/root" : laserHome(s.level));
    if (get(dest)?.type !== "dir") return ok(`cd: ${dest}: No such directory`);
    if (!canTraverse(s, path(dest), true)) return ok(`cd: ${dest}: Permission denied`);
    return { state: { ...s, cwd: path(dest) }, output: "" };
  }
  if (cmd === "ls" || cmd === "stat") {
    const operands = a.filter(v => !v.startsWith("-"));
    const lines: string[] = [];
    for (const name of operands.length ? operands : ["."]) {
      const n = get(name);
      if (!n) { lines.push(`${cmd}: ${name}: No such file or directory`); continue; }
      if (!canTraverse(s, path(name)) || (cmd === "ls" && n.type === "dir" && (!(accessBits(s, n) & 4) || !canTraverse(s, path(name), true)))) { lines.push(`${cmd}: ${name}: Permission denied`); continue; }
      if (cmd === "stat") { lines.push(`  File: ${n.name}\n  Size: ${n.size ?? n.content?.length ?? 0}\nAccess: (${n.mode.toString(8)}/${permissionString(n)})  Uid: (${n.owner}) Gid: (${n.group})\nModify: ${formatVmDate(n.modified)}`); continue; }
      const nodes = n.type === "dir" ? listChildren(s.fs, n.path).filter(v => a.some(x => /^-.*a/.test(x)) || !v.name.startsWith(".")) : [n];
      lines.push(nodes.map(v => a.some(x => /^-.*l/.test(x)) ? `${permissionString(v)} 1 ${v.owner} ${v.group} ${v.type === "dir" ? 4096 : v.size ?? v.content?.length ?? 0} ${formatVmDate(v.modified)} ${v.name}` : v.name).join("\n"));
    }
    return ok(lines.join("\n"));
  }
  if (cmd === "cat" || cmd === "more" || cmd === "less") {
    const operands = a[0] === "--" ? a.slice(1) : a;
    if (a[0] !== "--" && operands.some(v => v.startsWith("-"))) return ok(`${cmd}: invalid option; gunakan ./nama atau -- sebelum nama berkas yang diawali tanda minus`);
    return ok(operands.length ? operands.map(read).join("") : stdin);
  }
  if (cmd === "strings") return ok((a.length ? a.map(read).join("") : stdin).match(/[\x20-\x7e]{4,}/g)?.join("\n") || "");
  if (cmd === "head" || cmd === "tail") {
    let count = 10;
    const files: string[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "-n") count = Number(a[++i]);
      else if (/^-n\d+$/.test(a[i])) count = Number(a[i].slice(2));
      else files.push(a[i]);
    }
    if (!Number.isInteger(count) || count < 0) return ok(`${cmd}: invalid line count`);
    const slice = (text: string) => { const lines = text.replace(/\n$/, "").split("\n"); return (count === 0 ? [] : cmd === "head" ? lines.slice(0, count) : lines.slice(-count)).join("\n"); };
    return ok(files.length ? files.map(v => error(v) || slice(read(v))).join("\n") : slice(stdin));
  }
  if (cmd === "grep") {
    const options = a.filter(v => /^-[in]+$/.test(v));
    const operands = a.filter(v => !options.includes(v));
    const pattern = operands.shift();
    if (pattern === undefined) return ok("Usage: grep [-in] PATTERN [FILE...]");
    let regex: RegExp;
    try { regex = new RegExp(pattern, options.some(v => v.includes("i")) ? "i" : ""); }
    catch { return ok("grep: invalid regular expression"); }
    const filter = (text: string) => text.split("\n").flatMap((v, i) => regex.test(v) ? [(options.some(v => v.includes("n")) ? `${i + 1}:` : "") + v] : []).join("\n");
    return ok(operands.length ? operands.map(v => error(v) || filter(read(v))).filter(Boolean).join("\n") : filter(stdin));
  }
  if (cmd === "wc") {
    const file = a.find(v => !v.startsWith("-"));
    if (file && error(file)) return ok(error(file));
    const text = file ? read(file) : stdin;
    const count = (text.match(/\n/g) || []).length;
    return ok((a.includes("-l") ? `${count}` : `${count} ${text.trim() ? text.trim().split(/\s+/).length : 0} ${new TextEncoder().encode(text).length}`) + (file ? ` ${file}` : ""));
  }
  if (cmd === "find") {
    const root = path(a[0] && !a[0].startsWith("-") ? a[0] : ".");
    if (!s.fs[root]) return ok(`find: ${root}: No such file or directory`);
    let nodes = Object.values(s.fs).filter(n => n.path === root || n.path.startsWith(root === "/" ? root : root + "/"));
    const name = a.indexOf("-name");
    if (name >= 0) {
      if (!a[name + 1]) return ok("find: missing argument to -name");
      const pattern = a[name + 1].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
      nodes = nodes.filter(n => new RegExp(`^${pattern}$`).test(n.name));
    }
    const user = a.indexOf("-user"), type = a.indexOf("-type");
    if (user >= 0) nodes = nodes.filter(n => n.owner === a[user + 1]);
    if (type >= 0) nodes = nodes.filter(n => n.type === (a[type + 1] === "f" ? "file" : "dir"));
    return ok(nodes.filter(n => canTraverse(s, n.path)).map(n => n.path).join("\n"));
  }
  if (cmd === "locate") return ok(Object.keys(s.fs).filter(p => p.includes(a[0] || "\u0000")).join("\n"));
  if (cmd === "base64") {
    if (!a.includes("-d") && !a.includes("--decode")) return ok("Penggunaan: base64 -d FILE");
    const name = a.find(v => !v.startsWith("-"));
    if (name && error(name)) return ok(error(name));
    try { return ok(atob((name ? read(name) : stdin).replace(/\s/g, ""))); } catch { return ok("base64: invalid input"); }
  }
  if (["md5sum", "sha1sum", "sha256sum", "sha512sum"].includes(cmd)) {
    return ok(a.length ? a.map(v => {
      if (error(v)) return error(v);
      const digest = get(v).digests?.[cmd] || laserChecksums[read(v)]?.[cmd];
      return digest ? `${digest}  ${v}` : `${cmd}: checksum untuk konten ini belum tersedia dalam simulator`;
    }).join("\n") : `${cmd}: missing file operand`);
  }
  if (cmd === "python" || cmd === "python3" || cmd === "./flag") {
    if (a[0] === "--version" || a[0] === "-V") return ok(cmd === "python" ? "Python 2.7.12" : "Python 3.5.2");
    const name = cmd === "./flag" ? "./flag" : a[0];
    if (!name) return ok(`${cmd}: missing file operand`);
    if (s.level === 15 && cmd === "python3") return ok("RuntimeError: Bad magic number in .pyc file (bytecode ini memerlukan Python 2.7)");
    if (error(name)) return ok(error(name));
    if ((s.level === 15 && get(name).name === "flag.pyc" && cmd !== "./flag") || (s.level === 16 && cmd === "./flag" && (get(name).mode & 0o111))) return ok(laserLevels[s.level].flag);
    return ok(`${cmd}: berkas ini tidak dapat dijalankan oleh simulator`);
  }
  if (["unzip", "tar", "unrar"].includes(cmd)) {
    const expected = s.level === 19 ? "flag.zip" : s.level === 20 ? "flag.tar.xz" : s.level === 21 ? "flag.rar" : "";
    const name = a.find(v => get(v)?.name === expected);
    const valid = s.level === 19 && cmd === "unzip" || s.level === 20 && cmd === "tar" && a.some(v => /^-.*x/.test(v)) || s.level === 21 && cmd === "unrar" && a[0] === "x";
    if (!expected || !name || !valid) return ok(`${cmd}: arsip atau opsi ekstraksi tidak sesuai; lihat help`);
    put(s, "flag.txt", laserLevels[s.level].flag + "\n"); return ok("Ekstraksi simulasi: flag.txt");
  }
  if (cmd === "curl") return ok(s.level === 28 && a.includes("http://localhost/flag.txt") ? laserLevels[28].flag : "curl: URL tidak tersedia dalam layanan HTTP simulasi");
  if (cmd === "gpg") {
    const name = a.find(v => get(v)?.name === "flag.txt.gpg");
    if (s.level !== 29 || !name || !a.includes("--decrypt")) return ok("Penggunaan: gpg --batch --passphrase 12345678 --output flag.txt --decrypt flag.txt.gpg");
    if (a[a.indexOf("--passphrase") + 1] !== "12345678" || !a.includes("--passphrase")) return ok("gpg: decryption failed: Bad session key");
    const target = a.includes("--output") ? a[a.indexOf("--output")+1] : undefined;
    if (!target) return ok(laserLevels[29].flag);
    if (get(target)?.owner === "root" || s.fs[parentPath(path(target))]?.type !== "dir") return ok("gpg: output tidak dapat ditulis");
    put(s, target, laserLevels[29].flag + "\n"); return ok(`Dekripsi simulasi selesai: ${target}`);
  }
  return ok(`${cmd}: perintah belum didukung. Ketik help untuk panduan simulator.`);
}

export function cancelLaserAuthentication(input: LaserState): LaserState {
  const state = { ...input };
  delete state.pendingSu;
  delete state.pendingLogin;
  delete state.pendingSudo;
  return state;
}

export function executeLaser(input: LaserState, line: string): { state: LaserState; output: string; clear: boolean; switchLevel?: number; password?: boolean; passwordPrompt?: string; needsFile?: string } {
  let state: LaserState = { ...input, fs: { ...input.fs }, history: [...input.history] };
  let output = "", clear = false;
  const accountPassword = (target: number) => target === 0 ? "level0" : laserLevels[target - 1].flag.slice("Cakgup{".length, -1);
  if (state.pendingSudo) {
    const args = state.pendingSudo;
    state = cancelLaserAuthentication(state);
    if (line !== accountPassword(state.level)) return { state, output: "sudo: 1 incorrect password attempt", clear };
    state.sudoUntil = Date.now() + 5 * 60 * 1000;
    try {
      const result = run(state, ["sudo", ...args], "");
      return { ...result, clear: !!result.clear };
    } catch (error) {
      if (error instanceof MissingVmFile) return { state: input, output: "", clear: false, needsFile: error.path };
      throw error;
    }
  }
  if (state.pendingSu !== undefined) {
    const target = state.pendingSu;
    const login = state.pendingLogin;
    state = cancelLaserAuthentication(state);
    const expected = accountPassword(target);
    if (line !== expected) return { state, output: "su: Authentication failure", clear };
    return { state: { ...state, level: target, root: false, cwd: login ? laserHome(target) : state.cwd, history: [], sudoUntil: undefined }, output: `Berpindah ke level${target}.${login ? "" : " Direktori kerja tetap; ketik cd untuk masuk home akun ini."}`, clear: true, switchLevel: target };
  }
  if (!line.trim()) return { state, output, clear };
  state.history.push(line);
  try {
    const tokens = lex(line);
    if (tokens[0]?.value === "sudo" && state.level === 30 && !state.root && !(state.sudoUntil && state.sudoUntil > Date.now())) {
      if (tokens.some(t => t.operator)) return { state, output: "Jalankan autentikasi sudo sebagai perintah tersendiri terlebih dahulu.", clear };
      state.pendingSudo = tokens.slice(1).map(t => t.value);
      return { state, output: "", clear, password: true, passwordPrompt: "[sudo] password for level30: " };
    }
    if (tokens[0]?.value === "su") {
      const args = tokens.slice(1);
      const target = args[0]?.value === "-" ? args[1]?.value : args[0]?.value;
      if (tokens.some(v => v.operator) || args.length !== (args[0]?.value === "-" ? 2 : 1) || !/^level\d+$/.test(target || "")) return { state, output: "Penggunaan: su levelN (contoh: su level1). Jalankan sebagai perintah tersendiri.", clear };
      const index = Number(target!.slice(5));
      if (index >= laserLevels.length) return { state, output: `su: user ${target} does not exist`, clear };
      if (state.root) return { state: { ...state, level: index, root: false, cwd: args[0]?.value === "-" ? laserHome(index) : state.cwd, history: [], sudoUntil: undefined }, output: `Berpindah ke level${index}.`, clear: true, switchLevel: index };
      state.pendingSu = index;
      state.pendingLogin = args[0]?.value === "-";
      return { state, output: "", clear, password: true };
    }
    let stage: typeof tokens = [];
    let redirect: { append: boolean; target: string } | undefined;
    const flush = () => {
      if (!stage.length) throw new Error("bash: perintah pipeline kosong");
      const stdin = output && !output.endsWith("\n") ? output + "\n" : output;
      const result = run(state, stage.flatMap(v => expand(state, v)), stdin);
      state = result.state; output = result.output; clear ||= !!result.clear; stage = [];
    };
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      if (!word.operator) stage.push(word);
      else if (word.value === "|") flush();
      else {
        const next = tokens[++i];
        if (!next || next.operator || i !== tokens.length - 1) throw new Error("bash: tujuan redirection tidak valid");
        redirect = { append: word.value === ">>", target: next.value };
      }
    }
    flush();
    if (redirect) {
      const target = normalizePath(redirect.target, state.cwd), old = state.fs[target];
      const parent = state.fs[parentPath(target)];
      if (parent?.type !== "dir" || old?.type === "dir" || !canTraverse(state, target) || (!state.root && (old ? !(accessBits(state, old) & 2) : !(accessBits(state, parent) & 2)))) output = `bash: ${redirect.target}: Permission denied`;
      else { put(state, target, (redirect.append ? old?.content || "" : "") + output + (output.endsWith("\n") ? "" : "\n")); output = ""; }
    }
  } catch (e) { if (e instanceof MissingVmFile) return { state: input, output: "", clear: false, needsFile: e.path }; output = e instanceof Error ? e.message : "Perintah tidak dapat diproses."; }
  return { state, output, clear };
}

export function completeLaser(s: LaserState, line: string): string {
  return completeTerminal(line, s.fs, s.cwd, s.root ? "/root" : laserHome(s.level), ctfCommands,
    directory => canTraverse(s, directory, true) && !!(s.fs[directory] && (accessBits(s, s.fs[directory]) & 4)));
}
