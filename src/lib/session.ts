import type { GameSession, GameSettings, Player, Round } from '../types';
import { uid } from './id';
import { findPreset } from './presets';
import { leaders } from './scoring';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

const DEFAULT_NAMES = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Player 5',
  'Player 6',
  'Player 7',
  'Player 8',
];

export function makePlayer(index: number, name?: string): Player {
  return { id: uid('p'), name: name ?? DEFAULT_NAMES[index] ?? `Player ${index + 1}` };
}

export function defaultPlayers(count = 4): Player[] {
  return Array.from({ length: count }, (_, index) => makePlayer(index));
}

export function settingsFromPreset(presetId: string, notes = ''): GameSettings {
  const preset = findPreset(presetId);
  return {
    ...preset.settings,
    endCondition: { ...preset.settings.endCondition },
    stakes: { ...preset.settings.stakes },
    bidScoring: { ...preset.settings.bidScoring },
    deal: { ...preset.settings.deal },
    blinds: {
      ...preset.settings.blinds,
      levels: preset.settings.blinds.levels.map((level) => ({ ...level })),
    },
    notes,
  };
}

/** "Rummy — Sep 7" style, so the history list is scannable without typing. */
export function suggestName(presetId: string, at = new Date()): string {
  const preset = findPreset(presetId);
  const stem = preset.id === 'custom' ? 'Game night' : preset.name;
  const when = at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${stem} — ${when}`;
}

export function createSession(input: {
  name: string;
  presetId: string;
  players: Player[];
  settings: GameSettings;
  firstDealerIndex?: number;
}): GameSession {
  const now = Date.now();
  return {
    id: uid('g'),
    name: input.name.trim() || suggestName(input.presetId),
    presetId: input.presetId,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    players: input.players,
    settings: input.settings,
    rounds: [],
    firstDealerIndex: input.firstDealerIndex ?? 0,
  };
}

/**
 * Bring a session saved by an older build up to the current shape. Settings
 * gain new blocks over time (stakes, bidding, the deal) and screens read them
 * without guarding, so a game saved before a block existed would otherwise
 * throw the moment it was opened.
 */
export function hydrateSession(session: GameSession): GameSession {
  const fallback = settingsFromPreset('custom');
  const stored = session.settings ?? fallback;
  return {
    ...session,
    players: session.players ?? [],
    rounds: session.rounds ?? [],
    firstDealerIndex: session.firstDealerIndex ?? 0,
    settings: {
      ...fallback,
      ...stored,
      endCondition: { ...fallback.endCondition, ...stored.endCondition },
      stakes: { ...fallback.stakes, ...stored.stakes },
      bidScoring: { ...fallback.bidScoring, ...stored.bidScoring },
      deal: { ...fallback.deal, ...stored.deal },
      blinds: { ...fallback.blinds, ...stored.blinds, levels: stored.blinds?.levels ?? [] },
    },
  };
}

export function emptyRound(players: Player[]): Round {
  const scores: Record<string, number | null> = {};
  for (const player of players) scores[player.id] = null;
  return { id: uid('r'), createdAt: Date.now(), scores };
}

/** What one round's entry produces: points, plus the bids behind them. */
export interface RoundEntry {
  scores: Record<string, number | null>;
  bids?: Record<string, number | null>;
  tricks?: Record<string, number | null>;
}

function roundFrom(entry: RoundEntry): Omit<Round, 'id' | 'createdAt'> {
  const round: Omit<Round, 'id' | 'createdAt'> = { scores: { ...entry.scores } };
  if (entry.bids) round.bids = { ...entry.bids };
  if (entry.tricks) round.tricks = { ...entry.tricks };
  return round;
}

export function addRound(session: GameSession, entry: RoundEntry): GameSession {
  const round: Round = { id: uid('r'), createdAt: Date.now(), ...roundFrom(entry) };
  return { ...session, rounds: [...session.rounds, round] };
}

export function replaceRound(
  session: GameSession,
  roundId: string,
  entry: RoundEntry,
): GameSession {
  return {
    ...session,
    rounds: session.rounds.map((round) =>
      round.id === roundId
        ? { id: round.id, createdAt: round.createdAt, ...roundFrom(entry) }
        : round,
    ),
  };
}

export function removeRound(session: GameSession, roundId: string): GameSession {
  return { ...session, rounds: session.rounds.filter((round) => round.id !== roundId) };
}

export function finishGame(session: GameSession): GameSession {
  return {
    ...session,
    status: 'completed',
    completedAt: Date.now(),
    winnerIds: leaders(session).map((player) => player.id),
  };
}

export function reopenGame(session: GameSession): GameSession {
  const { completedAt: _completedAt, winnerIds: _winnerIds, ...rest } = session;
  return { ...rest, status: 'active' };
}

/** Same players, same rules, clean sheet. */
export function rematch(session: GameSession): GameSession {
  return createSession({
    name: nextRematchName(session.name),
    presetId: session.presetId,
    players: session.players.map((player) => ({ ...player, id: uid('p') })),
    settings: {
      ...session.settings,
      endCondition: { ...session.settings.endCondition },
      stakes: { ...session.settings.stakes },
      bidScoring: { ...session.settings.bidScoring },
      deal: { ...session.settings.deal },
      blinds: {
        ...session.settings.blinds,
        levels: session.settings.blinds.levels.map((level) => ({ ...level })),
      },
    },
    // Pass the deal along to the next player, the way a real table would.
    firstDealerIndex:
      session.players.length > 0
        ? (session.firstDealerIndex + session.rounds.length) % session.players.length
        : 0,
  });
}

function nextRematchName(name: string): string {
  const match = /^(.*?)\s\((\d+)\)$/.exec(name);
  if (match) return `${match[1]} (${Number(match[2]) + 1})`;
  return `${name} (2)`;
}
