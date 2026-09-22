import { LabState, RoomTask } from "./types";
import { normalizePath } from "./fs";

export function isTaskComplete(task: RoomTask, state: LabState): boolean {
  const check = task.check;
  const history = state.history.map((h) => h.trim());
  switch (check.type) {
    case "all":
      return check.checks.every((nested) => isTaskComplete({ ...task, check: nested }, state));
    case "any":
      return check.checks.some((nested) => isTaskComplete({ ...task, check: nested }, state));
    case "command-ran":
      return history.some((h) => h === check.command || h.startsWith(`${check.command} `));
    case "cwd":
      return normalizePath(state.cwd, "/") === normalizePath(check.path, "/");
    case "file-exists":
      return Boolean(state.fs[normalizePath(check.path, state.cwd)]);
    case "file-not-exists":
      return !state.fs[normalizePath(check.path, state.cwd)];
    case "file-content-contains": {
      const item = state.fs[normalizePath(check.path, state.cwd)];
      return Boolean(item && item.type === "file" && (item.content || "").includes(check.text));
    }
    case "file-mode": {
      const item = state.fs[normalizePath(check.path, state.cwd)];
      return Boolean(item && item.mode === check.mode);
    }
    case "history-contains":
      return history.some((h) => check.fragments.every((fragment) => h.toLowerCase().includes(fragment.toLowerCase())));
    case "process-killed":
      return state.killedPids.includes(check.pid);
    default:
      return false;
  }
}
