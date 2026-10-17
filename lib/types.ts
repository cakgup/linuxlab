export type Difficulty = "Easy" | "Medium" | "Hard";
export type LearningPath = "Linux Basics" | "Linux Administration" | "Linux for Cybersecurity" | "Digital Forensics" | "Incident Response";

export type TaskCheck =
  | { type: "all"; checks: TaskCheck[] }
  | { type: "any"; checks: TaskCheck[] }
  | { type: "command-ran"; command: string }
  | { type: "cwd"; path: string }
  | { type: "file-exists"; path: string }
  | { type: "file-not-exists"; path: string }
  | { type: "file-mode"; path: string; mode: number }
  | { type: "file-content-contains"; path: string; text: string }
  | { type: "history-contains"; fragments: string[] }
  | { type: "process-killed"; pid: number }
  | { type: "environment"; key: string; value: string }
  | { type: "session"; key: "sshVerified" | "mysqlVerified" | "database"; value: string | boolean };

export interface RoomTask {
  id: string;
  title: string;
  objective: string;
  context: string;
  hint: string;
  xp: number;
  check: TaskCheck;
}

export interface RoomDefinition {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  path: LearningPath;
  difficulty: Difficulty;
  duration: string;
  icon: "terminal" | "shield" | "file" | "search" | "activity" | "flag";
  tags: string[];
  learning: string[];
  prerequisites?: string[];
  environment?: "warm-up" | "forensics";
  commands?: string[];
  notes?: { title:string; body:string }[];
  badge?: string;
  tasks: RoomTask[];
}

export interface VNode {
  type: "file" | "dir";
  name: string;
  path: string;
  owner: string;
  group: string;
  mode: number;
  content?: string;
  size?: number;
  modified?: number;
  digests?: Record<string, string>;
  blob?: string;
  binary?: boolean;
  linkTarget?: string;
  archive?: { kind: "tar" | "zip" | "gzip"; entries: Record<string, { content: string; mode: number }> };
}

export interface FakeProcess {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
  alive: boolean;
}

export interface LabState {
  cwd: string;
  fs: Record<string, VNode>;
  history: string[];
  killedPids: number[];
  processes: FakeProcess[];
  env?: Record<string,string>;
}
