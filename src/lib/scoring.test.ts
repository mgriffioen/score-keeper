import { describe, expect, it } from 'vitest';
import type { BidScoring, GameSession, GameSettings } from '../types';
import { createSession, addRound, rematch, replaceRound, settingsFromPreset } from './session';
import {
  checkEnd,
  cumulativeTotals,
  dealerForRound,
  leaders,
  potTotal,
  progress,
  standings,
  totals,
  bidRoundScore,
  scoresFromBids,
  scoredRoundCount,
  openRound,
} from './scoring';

function game(overrides: Partial<GameSettings> = {}, names = ['Ana', 'Bo', 'Cy']): GameSession {
  const settings: GameSettings = { ...settingsFromPreset('custom'), ...overrides };
  return createSession({
    name: 'Test',
    presetId: 'custom',
    players: names.map((name, index) => ({ id: `p${index}`, name })),
    settings,
  });
}

function withRounds(session: GameSession, rows: number[][]): GameSession {
  return rows.reduce((current, row) => {
    const scores: Record<string, number | null> = {};
    current.players.forEach((player, index) => {
      scores[player.id] = row[index] ?? null;
    });
    return addRound(current, { scores });
  }, session);
}

describe('totals', () => {
  it('adds every round on top of the starting score', () => {
    const session = withRounds(game({ startingScore: 10 }), [
      [5, 0, -3],
      [1, 2, 3],
    ]);
    expect(totals(session)).toEqual({ p0: 16, p1: 12, p2: 10 });
  });

  it('treats a blank entry as zero without losing the blank', () => {
    const session = withRounds(game(), [[7, null as unknown as number, 2]]);
    expect(totals(session).p1).toBe(0);
    expect(session.rounds[0].scores.p1).toBeNull();
  });

  it('reports the score after each round in order', () => {
    const session = withRounds(game(), [
      [3, 1, 0],
      [4, 1, 0],
    ]);
    expect(cumulativeTotals(session)).toEqual([
      { p0: 3, p1: 1, p2: 0 },
      { p0: 7, p1: 2, p2: 0 },
    ]);
  });
});

describe('standings', () => {
  it('puts the highest score first when high wins', () => {
    const session = withRounds(game({ direction: 'high' }), [[1, 9, 5]]);
    expect(standings(session).map((entry) => entry.player.name)).toEqual(['Bo', 'Cy', 'Ana']);
  });

  it('puts the lowest score first when low wins', () => {
    const session = withRounds(game({ direction: 'low' }), [[1, 9, 5]]);
    expect(standings(session).map((entry) => entry.player.name)).toEqual(['Ana', 'Cy', 'Bo']);
  });

  it('shares a rank between tied players and skips the next one', () => {
    const session = withRounds(game(), [[5, 5, 1]]);
    expect(standings(session).map((entry) => entry.rank)).toEqual([1, 1, 3]);
    expect(leaders(session).map((player) => player.name)).toEqual(['Ana', 'Bo']);
  });

  it('measures the gap back to the leader', () => {
    const session = withRounds(game({ direction: 'low' }), [[2, 10, 6]]);
    expect(standings(session).map((entry) => entry.behind)).toEqual([0, 4, 8]);
  });
});

describe('end conditions', () => {
  it('never ends a manual game on its own', () => {
    const session = withRounds(game(), [[999, 0, 0]]);
    expect(checkEnd(session).reached).toBe(false);
  });

  it('ends once the round count is played', () => {
    const base = game({ endCondition: { type: 'rounds', rounds: 2, target: 0, comparison: 'atLeast' } });
    expect(checkEnd(withRounds(base, [[1, 1, 1]])).reached).toBe(false);
    expect(checkEnd(withRounds(base, [[1, 1, 1], [1, 1, 1]])).reached).toBe(true);
  });

  it('ends when a player reaches the target', () => {
    const base = game({ endCondition: { type: 'target', rounds: 0, target: 100, comparison: 'atLeast' } });
    expect(checkEnd(withRounds(base, [[99, 0, 0]])).reached).toBe(false);
    const done = checkEnd(withRounds(base, [[100, 0, 0]]));
    expect(done.reached).toBe(true);
    expect(done.reason).toContain('Ana');
  });

  it('ends when a countdown player falls to the target', () => {
    const base = game({
      startingScore: 501,
      direction: 'low',
      endCondition: { type: 'target', rounds: 0, target: 0, comparison: 'atMost' },
    });
    expect(checkEnd(withRounds(base, [[-500, 0, 0]])).reached).toBe(false);
    expect(checkEnd(withRounds(base, [[-501, 0, 0]])).reached).toBe(true);
  });

  it('names everyone who crossed the line together', () => {
    const base = game({ endCondition: { type: 'target', rounds: 0, target: 10, comparison: 'atLeast' } });
    expect(checkEnd(withRounds(base, [[10, 10, 0]])).reason).toContain('Ana and Bo');
  });
});

describe('progress', () => {
  it('tracks rounds played against the limit', () => {
    const base = game({ endCondition: { type: 'rounds', rounds: 4, target: 0, comparison: 'atLeast' } });
    expect(progress(withRounds(base, [[1, 1, 1]]))).toBeCloseTo(0.25);
  });

  it('tracks the closest player to the target', () => {
    const base = game({ endCondition: { type: 'target', rounds: 0, target: 200, comparison: 'atLeast' } });
    expect(progress(withRounds(base, [[50, 10, 0]]))).toBeCloseTo(0.25);
  });

  it('has nothing to show for an open-ended game', () => {
    expect(progress(game())).toBeNull();
  });
});

describe('pot', () => {
  it('is zero unless stakes are switched on', () => {
    expect(potTotal(game())).toBe(0);
  });

  it('adds buy-ins and per-round contributions', () => {
    const base = game({ stakes: { enabled: true, currency: '$', ante: 10, perRound: 1 } });
    // 3 buy-ins of 10, plus 3 players x 1 per round x 2 rounds.
    expect(potTotal(withRounds(base, [[0, 0, 0], [0, 0, 0]]))).toBe(36);
  });
});

describe('the deal', () => {
  it('stays put when nobody asked to track it', () => {
    expect(dealerForRound(game(), 0)).toBeNull();
  });

  it('moves round the table and wraps', () => {
    const session = { ...game({ trackDealer: true }), firstDealerIndex: 1 };
    expect(dealerForRound(session, 0)?.name).toBe('Bo');
    expect(dealerForRound(session, 2)?.name).toBe('Ana');
  });
});

describe('rematch', () => {
  it('keeps the table and rules but clears the scores', () => {
    const played = withRounds(game({ trackDealer: true }), [[5, 5, 5]]);
    const next = rematch(played);
    expect(next.rounds).toHaveLength(0);
    expect(next.players.map((player) => player.name)).toEqual(['Ana', 'Bo', 'Cy']);
    expect(next.settings).toEqual(played.settings);
    expect(next.firstDealerIndex).toBe(1);
  });

  it('numbers repeat games instead of piling up suffixes', () => {
    const first = rematch(game());
    expect(first.name).toBe('Test (2)');
    expect(rematch(first).name).toBe('Test (3)');
  });
});

describe('before the first round', () => {
  it('does not end a game whose starting score already meets the target', () => {
    const base = game({
      direction: 'low',
      endCondition: { type: 'target', rounds: 0, target: 0, comparison: 'atMost' },
    });
    expect(checkEnd(base).reached).toBe(false);
    expect(checkEnd(withRounds(base, [[0, 0, 0]])).reached).toBe(true);
  });
});

describe('bid scoring', () => {
  const ohHell: BidScoring = {
    enabled: true,
    exactBonus: 10,
    perTrickMade: 1,
    missed: 'nothing',
    penaltyPerTrick: 1,
  };
  const wizard: BidScoring = {
    enabled: true,
    exactBonus: 20,
    perTrickMade: 10,
    missed: 'penalty',
    penaltyPerTrick: 10,
  };

  it('pays the bonus plus a trick rate for calling it exactly', () => {
    expect(bidRoundScore(3, 3, ohHell)).toBe(13);
    expect(bidRoundScore(0, 0, ohHell)).toBe(10);
    expect(bidRoundScore(2, 2, wizard)).toBe(40);
  });

  it('pays nothing for a miss, over or under', () => {
    expect(bidRoundScore(3, 2, ohHell)).toBe(0);
    expect(bidRoundScore(3, 5, ohHell)).toBe(0);
  });

  it('can pay the tricks won instead, when the house says so', () => {
    expect(bidRoundScore(3, 2, { ...ohHell, missed: 'tricks' })).toBe(2);
  });

  it('can dock a penalty per trick out, in either direction', () => {
    expect(bidRoundScore(3, 1, wizard)).toBe(-20);
    expect(bidRoundScore(1, 3, wizard)).toBe(-20);
  });

  it('scores nothing at all until the hand has been played', () => {
    expect(bidRoundScore(3, null, ohHell)).toBeNull();
    expect(bidRoundScore(null, 3, ohHell)).toBeNull();
  });

  it('builds a whole round from its bids and tricks', () => {
    const players = [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Bo' },
      { id: 'c', name: 'Cy' },
    ];
    const scores = scoresFromBids(
      players,
      { a: 2, b: 0, c: 4 },
      { a: 2, b: 1, c: null },
      ohHell,
    );
    expect(scores).toEqual({ a: 12, b: 0, c: null });
  });
});

describe('called but not yet played', () => {
  function bidGame(): GameSession {
    return game({
      bidScoring: {
        enabled: true,
        exactBonus: 10,
        perTrickMade: 1,
        missed: 'nothing',
        penaltyPerTrick: 1,
      },
      endCondition: { type: 'rounds', rounds: 2, target: 0, comparison: 'atLeast' },
    });
  }

  const called = { p0: 1, p1: 2, p2: 0 };

  it('does not count a round that only has bids on it', () => {
    const session = addRound(bidGame(), { scores: {}, bids: called });
    expect(session.rounds).toHaveLength(1);
    expect(scoredRoundCount(session)).toBe(0);
    expect(openRound(session)?.bids).toEqual(called);
  });

  it('counts the round once the tricks are in', () => {
    const withBids = addRound(bidGame(), { scores: {}, bids: called });
    const played = replaceRound(withBids, withBids.rounds[0].id, {
      scores: { p0: 11, p1: 0, p2: 10 },
      bids: called,
      tricks: { p0: 1, p1: 1, p2: 0 },
    });
    expect(scoredRoundCount(played)).toBe(1);
    expect(openRound(played)).toBeNull();
    expect(totals(played)).toEqual({ p0: 11, p1: 0, p2: 10 });
  });

  it('does not end a game on a round that has only been called', () => {
    let session = bidGame();
    for (const tricks of [{ p0: 1, p1: 2, p2: 0 }]) {
      session = addRound(session, {
        scores: scoresFromBids(session.players, called, tricks, session.settings.bidScoring),
        bids: called,
        tricks,
      });
    }
    // One hand played, one merely called: the two-hand game is not over.
    session = addRound(session, { scores: {}, bids: called });
    expect(checkEnd(session).reached).toBe(false);
    expect(progress(session)).toBeCloseTo(0.5);
  });
});
