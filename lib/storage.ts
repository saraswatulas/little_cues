import type { BabyProfile, CareLog, PlanningActivityState, SavedAiSummary } from "./types";

const STORAGE_KEYS = {
  baby: "little-cues:baby",
  logs: "little-cues:logs",
  aiSummaries: "little-cues:ai-summaries",
  activityStates: "little-cues:activity-states"
};

export function loadBaby(): BabyProfile {
  const saved = readJson<BabyProfile>(STORAGE_KEYS.baby);
  if (saved) return saved;

  const today = new Date();
  today.setDate(today.getDate() - 14);

  return {
    id: "baby-local-1",
    name: "Baby",
    dateOfBirth: today.toISOString().slice(0, 10),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  };
}

export function saveBaby(baby: BabyProfile) {
  writeJson(STORAGE_KEYS.baby, baby);
}

export function loadLogs(): CareLog[] {
  return readJson<CareLog[]>(STORAGE_KEYS.logs) ?? [];
}

export function saveLogs(logs: CareLog[]) {
  writeJson(STORAGE_KEYS.logs, logs);
}

export function loadAiSummaries(): SavedAiSummary[] {
  return readJson<SavedAiSummary[]>(STORAGE_KEYS.aiSummaries) ?? [];
}

export function saveAiSummaries(summaries: SavedAiSummary[]) {
  writeJson(STORAGE_KEYS.aiSummaries, summaries);
}

export function loadActivityStates(): PlanningActivityState[] {
  return readJson<PlanningActivityState[]>(STORAGE_KEYS.activityStates) ?? [];
}

export function saveActivityStates(states: PlanningActivityState[]) {
  writeJson(STORAGE_KEYS.activityStates, states);
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
