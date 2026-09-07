import { describe, expect, it } from 'vitest';
import { PRESETS, findPreset } from './presets';
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

  it('deals a 52-card deck out evenly, one hand per size down to one', () => {
    expect(ohHell.roundsFor?.(3)).toBe(17);
    expect(ohHell.roundsFor?.(4)).toBe(13);
    expect(ohHell.roundsFor?.(5)).toBe(10);
    expect(ohHell.roundsFor?.(6)).toBe(8);
    expect(ohHell.roundsFor?.(8)).toBe(6);
  });
});

describe('Wizard', () => {
  const wizard = findPreset('wizard');

  it('uses its own 60-card deck for the hand count', () => {
    expect(wizard.roundsFor?.(3)).toBe(20);
    expect(wizard.roundsFor?.(4)).toBe(15);
    expect(wizard.roundsFor?.(6)).toBe(10);
  });

  it('never derives fewer than one hand, however big the table', () => {
    for (const preset of PRESETS) {
      for (let players = 2; players <= 8; players += 1) {
        const rounds = preset.roundsFor?.(players);
        if (rounds !== undefined) expect(rounds).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
