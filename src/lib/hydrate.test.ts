import { describe, expect, it } from 'vitest';
import type { GameSession } from '../types';
import { hydrateSession } from './session';

/**
 * Games saved by earlier builds are missing whole settings blocks. The screens
 * read those without guarding, so anything that reaches them must be brought
 * up to the current shape first.
 */
function ancient(): GameSession {
  return {
    id: 'old',
    name: 'Rummy at Sam’s',
    presetId: 'rummy',
    createdAt: 1,
    updatedAt: 1,
    status: 'active',
    players: [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Bo' },
    ],
    rounds: [{ id: 'r1', createdAt: 1, scores: { a: 30, b: 12 } }],
    firstDealerIndex: 0,
    settings: {
      direction: 'high',
      startingScore: 0,
      allowNegative: true,
      roundLabel: 'Hand',
      trackDealer: false,
      endCondition: { type: 'target', rounds: 10, target: 500, comparison: 'atLeast' },
      notes: '',
      // No stakes, no bidScoring, no deal — this build predates all three.
    } as GameSession['settings'],
  };
}

describe('opening a game saved by an older build', () => {
  it('fills in settings blocks that did not exist yet', () => {
    const session = hydrateSession(ancient());
    expect(session.settings.bidScoring.enabled).toBe(false);
    expect(session.settings.stakes.enabled).toBe(false);
    expect(session.settings.deal.pattern).toBe('fixed');
  });

  it('leaves everything the old build did record alone', () => {
    const session = hydrateSession(ancient());
    expect(session.name).toBe('Rummy at Sam’s');
    expect(session.settings.roundLabel).toBe('Hand');
    expect(session.settings.endCondition.target).toBe(500);
    expect(session.rounds[0].scores).toEqual({ a: 30, b: 12 });
  });

  it('survives a session missing its lists entirely', () => {
    const broken = { ...ancient(), players: undefined, rounds: undefined } as unknown as GameSession;
    const session = hydrateSession(broken);
    expect(session.players).toEqual([]);
    expect(session.rounds).toEqual([]);
  });
});
