import { FakeProcess, LabState, VNode } from "./types";

export function normalizePath(input: string, cwd = "/home/analyst") {
  const expanded = input === "~" ? "/home/analyst" : input.startsWith("~/") ? `/home/analyst/${input.slice(2)}` : input;
  const raw = expanded.startsWith("/") ? expanded : `${cwd}/${expanded}`;
  const parts = raw.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return `/${out.join("/")}` || "/";
}

export function parentPath(path: string) {
  if (path === "/") return "/";
  const chunks = path.split("/").filter(Boolean);
  chunks.pop();
  return chunks.length ? `/${chunks.join("/")}` : "/";
}

function node(path: string, type: "file" | "dir", mode: number, owner = "root", group = "root", content?: string): VNode {
  const clean = normalizePath(path, "/");
  return {
    type,
    path: clean,
    name: clean === "/" ? "/" : clean.split("/").pop() || clean,
    mode,
    owner,
    group,
    content,
  };
}

function add(fs: Record<string, VNode>, n: VNode) {
  fs[n.path] = n;
}

export function createInitialState(): LabState {
  const fs: Record<string, VNode> = {};

  [
    "/", "/home", "/home/analyst", "/home/analyst/cases", "/home/analyst/cases/alpha",
    "/srv", "/srv/app", "/var", "/var/log", "/usr", "/usr/bin", "/usr/local", "/usr/local/bin",
    "/tmp", "/tmp/.cache", "/opt", "/opt/incident", "/etc", "/etc/cron.d",
    "/home/analyst/training", "/home/analyst/training/logs", "/home/analyst/training/scripts", "/home/analyst/training/archive"
  ].forEach((p) => add(fs, node(p, "dir", p === "/home/analyst" ? 0o750 : 0o755, p.startsWith("/home/analyst") ? "analyst" : "root", p.startsWith("/home/analyst") ? "analyst" : "root")));

  add(fs, node("/home/analyst/README.txt", "file", 0o644, "analyst", "analyst",
`LinuxLab Cyber training host\n\nThis environment is a browser simulation. No host commands are executed.\nStart with: pwd, ls -la, cd, cat, help\n`));

  add(fs, node("/home/analyst/training/notes.txt", "file", 0o644, "analyst", "analyst",
`Linux basics checklist\n1. Navigate with pwd, ls, and cd\n2. Manage files with mkdir, touch, cp, mv, and rm\n3. Read text with cat, head, tail, and less\n4. Search with grep and find\n5. Understand permissions before changing them\n6. Inspect processes before taking action\n`));
  add(fs, node("/home/analyst/training/logs/access.log", "file", 0o644, "analyst", "analyst",
`2026-09-22T08:00:01Z INFO GET / 200\n2026-09-22T08:00:04Z INFO GET /login 200\n2026-09-22T08:00:08Z ERROR POST /login 401 user=admin\n2026-09-22T08:00:12Z WARN GET /admin 403\n2026-09-22T08:00:15Z ERROR POST /login 401 user=root\n`));
  add(fs, node("/home/analyst/training/logs/system.log", "file", 0o644, "analyst", "analyst",
`INFO service started\nWARN disk usage 71%\nINFO backup completed\nERROR demo service timeout\n`));
  add(fs, node("/home/analyst/training/scripts/deploy.sh", "file", 0o644, "analyst", "analyst",
`#!/bin/sh\necho "Deploying training application"\n`));
  add(fs, node("/home/analyst/training/secret.key", "file", 0o644, "analyst", "analyst",
`TRAINING-KEY-ONLY\n`));

  add(fs, node("/home/analyst/cases/alpha/timeline.txt", "file", 0o640, "analyst", "soc",
`09:07 Alert generated for repeated SSH failures\n09:12 Unusual process CPU usage observed\n09:16 Application secret permission review requested\n`));
  add(fs, node("/home/analyst/cases/alpha/.ioc-note", "file", 0o600, "analyst", "analyst",
`Suspected source: 10.10.14.23\nReview /var/log/auth.log\n`));

  add(fs, node("/srv/app/.env", "file", 0o644, "deploy", "app",
`APP_ENV=production\nDB_USER=app_user\nDB_PASSWORD=TRAINING_ONLY_secret42\nAPI_TOKEN=LAB-DEMO-9f31\n`));
  add(fs, node("/srv/app/app.conf", "file", 0o640, "deploy", "app",
`listen=127.0.0.1:8080\nlog=/var/log/app.log\n`));

  add(fs, node("/var/log/auth.log", "file", 0o640, "root", "adm",
`Sep 22 09:01:13 training sshd[1901]: Accepted publickey for analyst from 10.10.14.8 port 51221 ssh2\nSep 22 09:04:07 training sshd[2018]: Failed password for invalid user admin from 10.10.14.23 port 44102 ssh2\nSep 22 09:04:10 training sshd[2020]: Failed password for invalid user admin from 10.10.14.23 port 44111 ssh2\nSep 22 09:04:14 training sshd[2024]: Failed password for root from 10.10.14.23 port 44119 ssh2\nSep 22 09:05:02 training sshd[2077]: Failed password for invalid user oracle from 10.10.14.23 port 44201 ssh2\nSep 22 09:06:18 training sshd[2140]: Accepted publickey for deploy from 10.10.14.8 port 51418 ssh2\nSep 22 09:07:54 training sudo[2201]: analyst : TTY=pts/0 ; PWD=/home/analyst ; USER=root ; COMMAND=/usr/bin/journalctl -u ssh\n`));
  add(fs, node("/var/log/app.log", "file", 0o640, "deploy", "adm",
`2026-09-22T09:10:03Z INFO request id=a91 status=200\n2026-09-22T09:11:27Z WARN auth token retry id=b17\n2026-09-22T09:12:41Z INFO request id=b18 status=200\n`));

  add(fs, node("/usr/bin/passwd", "file", 0o4755, "root", "root", "ELF binary (simulated)"));
  add(fs, node("/usr/bin/sudo", "file", 0o4755, "root", "root", "ELF binary (simulated)"));
  add(fs, node("/usr/local/bin/backup-helper", "file", 0o4755, "root", "root",
`#!/bin/sh\n# Training helper: legacy backup utility\n/bin/tar -czf /tmp/app-backup.tgz /srv/app\n`));
  add(fs, node("/usr/local/bin/health-check", "file", 0o755, "root", "root", "#!/bin/sh\necho healthy\n"));

  add(fs, node("/opt/incident/briefing.txt", "file", 0o640, "root", "soc",
`INCIDENT IR-2026-0922\n\n1. Suspected SSH brute-force source: 10.10.14.23\n2. Review application secret permissions at /srv/app/.env\n3. Investigate high CPU process; SOC notes mention PID 31337\n4. Apply containment only after confirming evidence\n`));

  add(fs, node("/etc/hostname", "file", 0o644, "root", "root", "training-web-01\n"));
  add(fs, node("/etc/os-release", "file", 0o644, "root", "root", `NAME="LinuxLab OS"\nVERSION="1.0 Training"\nID=linuxlab\n`));

  add(fs, node("/etc/cron.d/system-update", "file", 0o644, "root", "root",
`*/5 * * * * root /tmp/.cache/.sync-agent --silent >/dev/null 2>&1\n`));
  add(fs, node("/tmp/.cache/.sync-agent", "file", 0o755, "www-data", "www-data",
`ELF binary (simulated suspicious persistence payload)\n`));

  const processes: FakeProcess[] = [
    { pid: 1, user: "root", cpu: 0.0, mem: 0.1, command: "/sbin/init", alive: true },
    { pid: 812, user: "root", cpu: 0.1, mem: 0.4, command: "/usr/sbin/sshd -D", alive: true },
    { pid: 1432, user: "deploy", cpu: 0.4, mem: 2.2, command: "/usr/bin/node /srv/app/server.js", alive: true },
    { pid: 2861, user: "analyst", cpu: 0.0, mem: 0.2, command: "-bash", alive: true },
    { pid: 31337, user: "www-data", cpu: 88.7, mem: 6.4, command: "/tmp/.cache/kworker-update --pool mine.example", alive: true },
  ];

  return { cwd: "/home/analyst", fs, history: [], killedPids: [], processes };
}

export function listChildren(fs: Record<string, VNode>, path: string) {
  const p = normalizePath(path, "/");
  return Object.values(fs)
    .filter((n) => n.path !== p && parentPath(n.path) === p)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function octal(mode: number) {
  return (mode & 0o7777).toString(8).padStart(mode > 0o777 ? 4 : 3, "0");
}

export function permissionString(n: VNode) {
  const type = n.type === "dir" ? "d" : "-";
  const bits = [0o400,0o200,0o100,0o040,0o020,0o010,0o004,0o002,0o001];
  const chars = ["r","w","x","r","w","x","r","w","x"];
  const out = bits.map((bit, i) => (n.mode & bit) ? chars[i] : "-");
  if (n.mode & 0o4000) out[2] = out[2] === "x" ? "s" : "S";
  return type + out.join("");
}
