// Typed, SSR-safe localStorage helpers.
import type { LogEntry, Profile } from "./types";

const PROFILE_KEY = "makanlens:v1:profile";
const ENTRIES_KEY = "makanlens:v1:entries";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: ignore */
  }
}

export function getProfile(): Profile | null {
  return read<Profile>(PROFILE_KEY);
}
export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, profile);
}
export function getEntries(): LogEntry[] {
  const v = read<LogEntry[]>(ENTRIES_KEY);
  return Array.isArray(v) ? v : [];
}
export function saveEntries(entries: LogEntry[]): void {
  write(ENTRIES_KEY, entries);
}
export function addEntry(entry: LogEntry): void {
  saveEntries([...getEntries(), entry]);
}
export function updateEntry(entry: LogEntry): void {
  saveEntries(getEntries().map((e) => (e.id === entry.id ? entry : e)));
}
export function deleteEntry(id: string): void {
  saveEntries(getEntries().filter((e) => e.id !== id));
}
export function clearAll(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(ENTRIES_KEY);
  } catch {
    /* ignore */
  }
}

/** Local (not UTC) date as YYYY-MM-DD. */
export function localDateString(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
