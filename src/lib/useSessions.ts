import { useSyncExternalStore } from 'react';
import type { GameSession } from '../types';
import { getSessions, subscribe } from './storage';

/** Live view of everything saved on this device, newest activity first. */
export function useSessions(): GameSession[] {
  return useSyncExternalStore(subscribe, getSessions, getSessions);
}

export function useSession(id: string | null): GameSession | null {
  const sessions = useSessions();
  if (!id) return null;
  return sessions.find((session) => session.id === id) ?? null;
}
