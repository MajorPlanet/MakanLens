// STUB — owned by frontend-builder. Typed, SSR-safe localStorage helpers.
import type { LogEntry, Profile } from "./types";

export function getProfile(): Profile | null { return null; }
export function saveProfile(profile: Profile): void { void profile; }
export function getEntries(): LogEntry[] { return []; }
export function saveEntries(entries: LogEntry[]): void { void entries; }
export function addEntry(entry: LogEntry): void { void entry; }
export function updateEntry(entry: LogEntry): void { void entry; }
export function deleteEntry(id: string): void { void id; }
export function clearAll(): void {}
