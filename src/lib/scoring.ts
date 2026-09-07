import type { GameSession, Player, Round, Standing } from '../types';

/** Points a player scored in one round (a blank entry counts as 0). */
export function roundScore(round: Round, playerId: string): number {
  return round.scores[playerId] ?? 0;
}

/** Running total for every player: starting score plus every round entered. */
export function totals(session: GameSession): Record<string, number> {
  const result: Record<string, number> = {};
  for (const player of session.players) {
    result[player.id] = session.settings.startingScore;
  }
  for (const round of session.rounds) {
    for (const player of session.players) {
      result[player.id] += roundScore(round, player.id);
    }
  }
  return result;
}

/** Totals as they stood after each round, oldest first. Used by the table. */
export function cumulativeTotals(session: GameSession): Array<Record<string, number>> {
  const running: Record<string, number> = {};
  for (const player of session.players) {
    running[player.id] = session.settings.startingScore;
  }
  return session.rounds.map((round) => {
    for (const player of session.players) {
      running[player.id] += roundScore(round, player.id);
    }
    return { ...running };
  });
}

/**
 * Players ordered best-first for the game's direction. Ties share a rank, so
 * two players on 40 are both rank 1 and the next player is rank 3.
 */
export function standings(session: GameSession): Standing[] {
  const totalByPlayer = totals(session);
  const sorted = [...session.players].sort((a, b) => {
    const diff = totalByPlayer[a.id] - totalByPlayer[b.id];
    return session.settings.direction === 'high' ? -diff : diff;
  });

  const leaderTotal = sorted.length > 0 ? totalByPlayer[sorted[0].id] : 0;
  let previousTotal: number | null = null;
  let previousRank = 0;

  return sorted.map((player, index) => {
    const total = totalByPlayer[player.id];
    const rank = total === previousTotal ? previousRank : index + 1;
    previousTotal = total;
    previousRank = rank;
    return {
      player,
      total,
      rank,
      behind: Math.abs(total - leaderTotal),
    };
  });
}

/** Everyone sharing the best score. Empty only if the game has no players. */
export function leaders(session: GameSession): Player[] {
  const table = standings(session);
  return table.filter((entry) => entry.rank === 1).map((entry) => entry.player);
}

export interface EndCheck {
  /** True when the configured end condition has been satisfied. */
  reached: boolean;
  /** Human-readable reason, e.g. "Nadia reached 500". */
  reason: string;
}

/** Has the game's end condition been met on the current totals? */
export function checkEnd(session: GameSession): EndCheck {
  const { endCondition, direction } = session.settings;
  const notReached: EndCheck = { reached: false, reason: '' };

  // A game cannot be over before a single hand is played, however the
  // starting score and target happen to line up.
  if (session.rounds.length === 0) return notReached;

  if (endCondition.type === 'rounds') {
    if (session.rounds.length >= endCondition.rounds) {
      return {
        reached: true,
        reason: `All ${endCondition.rounds} ${session.settings.roundLabel.toLowerCase()}s have been played.`,
      };
    }
    return notReached;
  }

  if (endCondition.type === 'target') {
    const totalByPlayer = totals(session);
    const hit = session.players.filter((player) =>
      endCondition.comparison === 'atLeast'
        ? totalByPlayer[player.id] >= endCondition.target
        : totalByPlayer[player.id] <= endCondition.target,
    );
    if (hit.length > 0) {
      const verb = endCondition.comparison === 'atLeast' ? 'reached' : 'dropped to';
      return {
        reached: true,
        reason: `${listNames(hit)} ${verb} ${endCondition.target}. ${
          direction === 'high' ? 'Highest' : 'Lowest'
        } total wins.`,
      };
    }
    return notReached;
  }

  return notReached;
}

/** How far along the game is, 0–1, or null when there is nothing to measure. */
export function progress(session: GameSession): number | null {
  const { endCondition, startingScore } = session.settings;
  if (endCondition.type === 'rounds') {
    if (endCondition.rounds <= 0) return null;
    return clamp01(session.rounds.length / endCondition.rounds);
  }
  if (endCondition.type === 'target') {
    const span = endCondition.target - startingScore;
    if (span === 0) return null;
    const totalByPlayer = totals(session);
    const closest = session.players.reduce((best, player) => {
      const travelled = (totalByPlayer[player.id] - startingScore) / span;
      return Math.max(best, travelled);
    }, 0);
    return clamp01(closest);
  }
  return null;
}

/** Total money in the pot: buy-ins plus any per-round contributions. */
export function potTotal(session: GameSession): number {
  const { stakes } = session.settings;
  if (!stakes.enabled) return 0;
  const buyIns = session.players.reduce(
    (sum, player) => sum + (player.ante ?? stakes.ante),
    0,
  );
  const perRound = stakes.perRound * session.players.length * session.rounds.length;
  return buyIns + perRound;
}

/** Who deals the given (0-based) round. */
export function dealerForRound(session: GameSession, roundIndex: number): Player | null {
  if (!session.settings.trackDealer || session.players.length === 0) return null;
  const index = (session.firstDealerIndex + roundIndex) % session.players.length;
  return session.players[index] ?? null;
}

/** True when at least one player has a number entered for this round. */
export function roundHasEntries(round: Round, players: Player[]): boolean {
  return players.some((player) => {
    const value = round.scores[player.id];
    return value !== null && value !== undefined;
  });
}

export function listNames(players: Player[]): string {
  const names = players.map((player) => player.name);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
