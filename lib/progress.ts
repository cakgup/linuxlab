export const PROGRESS_KEY = "linuxlab-cyber-progress-v2";

export interface StoredProgress {
  completedTaskIds: string[];
}

export function readProgress(): StoredProgress {
  if (typeof window === "undefined") return { completedTaskIds: [] };
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { completedTaskIds: [] };
    const parsed = JSON.parse(raw) as StoredProgress;
    return { completedTaskIds: Array.isArray(parsed.completedTaskIds) ? parsed.completedTaskIds : [] };
  } catch {
    return { completedTaskIds: [] };
  }
}

export function writeProgress(progress: StoredProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROGRESS_KEY);
}
