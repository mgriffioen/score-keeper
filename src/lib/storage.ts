import type { GameSession } from '../types';

/**
 * Sessions live in localStorage: the score pad keeps working with no signal in
 * someone's kitchen, and nobody has to make an account to play cards. Every
 * read and write goes through this module, so swapping in a hosted backend
 * later means reimplementing `read`/`write` and nothing else.
 */
const STORAGE_KEY = 'score-keeper/sessions/v1';

function read(): GameSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSession);
  } catch {
    // Private browsing, a full quota, or hand-edited junk — start clean rather
    // than crash the app on launch.
    return [];
  }
}

function write(sessions: GameSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn('Score Keeper could not save to this device.', error);
  }
}

function isSession(value: unknown): value is GameSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<GameSession>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.rounds) &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null
  );
}

let cache: GameSession[] | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getSessions(): GameSession[] {
  if (cache === null) cache = read();
  return cache;
}

export function setSessions(next: GameSession[]): void {
  cache = next;
  write(next);
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keep two tabs of the same game pad in step. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cache = read();
    emit();
  });
}

export function upsertSession(session: GameSession): void {
  const sessions = getSessions();
  const index = sessions.findIndex((entry) => entry.id === session.id);
  const stamped = { ...session, updatedAt: Date.now() };
  const next = index === -1 ? [stamped, ...sessions] : sessions.map((entry, i) => (i === index ? stamped : entry));
  setSessions(next);
}

export function deleteSession(id: string): void {
  setSessions(getSessions().filter((entry) => entry.id !== id));
}

export function exportSessions(): string {
  return JSON.stringify({ app: 'score-keeper', version: 1, sessions: getSessions() }, null, 2);
}

/** Merges an export back in, keeping whichever copy of a session is newer. */
export function importSessions(json: string): { added: number; updated: number } {
  const parsed: unknown = JSON.parse(json);
  const incoming = Array.isArray(parsed)
    ? parsed
    : (parsed as { sessions?: unknown }).sessions;
  if (!Array.isArray(incoming)) throw new Error('That file does not contain any saved games.');

  const valid = incoming.filter(isSession);
  if (valid.length === 0) throw new Error('That file does not contain any saved games.');

  const byId = new Map(getSessions().map((entry) => [entry.id, entry]));
  let added = 0;
  let updated = 0;
  for (const session of valid) {
    const existing = byId.get(session.id);
    if (!existing) {
      byId.set(session.id, session);
      added += 1;
    } else if ((session.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      byId.set(session.id, session);
      updated += 1;
    }
  }
  setSessions([...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt));
  return { added, updated };
}
