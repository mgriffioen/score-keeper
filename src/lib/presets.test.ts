import { describe, expect, it } from 'vitest';
import { PRESETS, findPreset } from './presets';
import { bidRoundScore, scoresFromTrickTable, trickTableScore } from './scoring';
import { settingsFromPreset } from './session';

describe('presets', () => {
  it('has a unique id for every entry', () => {
    const ids = PRESETS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the custom game for an id it does not know', () => {
    expect(findPreset('no-such-game').id).toBe('custom');
  });

  it('hands out a fresh settings object each time', () => {
    const first = settingsFromPreset('oh-hell');
    const second = settingsFromPreset('oh-hell');
    first.endCondition.rounds = 99;
    expect(second.endCondition.rounds).not.toBe(99);
  });
});

describe('Oh Hell', () => {
  const ohHell = findPreset('oh-hell');

  it('is its own preset, separate from Wizard', () => {
    expect(ohHell.id).toBe('oh-hell');
    expect(ohHell.name).toBe('Oh Hell');
    expect(findPreset('wizard').name).toBe('Wizard');
  });

  it('scores highest-wins over a fixed number of hands, with the deal tracked', () => {
    expect(ohHell.settings.direction).toBe('high');
    expect(ohHell.settings.roundLabel).toBe('Hand');
    expect(ohHell.settings.trackDealer).toBe(true);
    expect(ohHell.settings.endCondition.type).toBe('rounds');
  });
});

describe('Oh Hell scoring, against the published rules', () => {
  // officialgamerules.org/game-rules/oh-hell: "1 point per trick taken.
  // +10 bonus points if the tricks taken exactly match your bid... If you bid
  // 3 and win 3, you score 13 points. If you bid 3 but win 4, you only score
  // 4 points."
  const rules = findPreset('oh-hell').settings.bidScoring;

  it('is switched on for the preset', () => {
    expect(rules.enabled).toBe(true);
  });

  it('scores 13 for bidding three and taking three', () => {
    expect(bidRoundScore(3, 3, rules)).toBe(13);
  });

  it('scores 4 — the tricks taken, not zero — for bidding three and taking four', () => {
    expect(bidRoundScore(3, 4, rules)).toBe(4);
  });

  it('pays the bonus for a made bid of zero', () => {
    expect(bidRoundScore(0, 0, rules)).toBe(10);
  });

  it('scores an undercall as the tricks taken too', () => {
    expect(bidRoundScore(5, 2, rules)).toBe(2);
  });
});

describe('Wizard scoring', () => {
  const rules = findPreset('wizard').settings.bidScoring;

  it('pays 20 plus 10 a trick, and docks 10 for every trick out', () => {
    expect(bidRoundScore(2, 2, rules)).toBe(40);
    expect(bidRoundScore(2, 0, rules)).toBe(-20);
    expect(bidRoundScore(0, 2, rules)).toBe(-20);
  });
});

describe('The Fox in the Forest scoring, against the rulebook', () => {
  const fox = findPreset('fox-in-the-forest');
  const rules = fox.settings.trickTable;

  it('is a two-player race to 21, highest wins, with no bidding', () => {
    expect(fox.suggestedPlayers).toBe(2);
    expect(fox.settings.direction).toBe('high');
    expect(fox.settings.endCondition).toMatchObject({ type: 'target', target: 21, comparison: 'atLeast' });
    expect(fox.settings.bidScoring.enabled).toBe(false);
    expect(rules.enabled).toBe(true);
    expect(rules.tricksPerHand).toBe(13);
  });

  it('pays every trick count from 0 to 13 per the table', () => {
    const expected = [6, 6, 6, 6, 1, 2, 3, 6, 6, 6, 0, 0, 0, 0];
    expected.forEach((points, tricks) => {
      expect(trickTableScore(tricks, null, rules), `${tricks} tricks`).toBe(points);
    });
  });

  it('adds a point per treasure on top of the table', () => {
    expect(trickTableScore(8, 2, rules)).toBe(8);
    // Greedy still keeps the treasure.
    expect(trickTableScore(11, 1, rules)).toBe(1);
  });

  it('scores nothing until the tricks are in', () => {
    expect(trickTableScore(null, 2, rules)).toBeNull();
  });

  it('scores a whole round, 9 tricks to 4', () => {
    const players = [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Bo' },
    ];
    expect(scoresFromTrickTable(players, { a: 9, b: 4 }, { a: 1, b: null }, rules)).toEqual({
      a: 7,
      b: 1,
    });
  });

  it('ignores the bonus when the table has the bonus column switched off', () => {
    expect(trickTableScore(2, 3, { ...rules, bonus: false })).toBe(6);
  });
});
