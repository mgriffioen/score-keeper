import { describe, expect, it } from 'vitest';
import type { Deal } from '../types';
import { cardsInRound, dealRoundCount, dealSequence, describeDeal } from './deal';
import { findPreset } from './presets';

const deal = (pattern: Deal['pattern'], maxCards: number): Deal => ({ pattern, maxCards });

describe('deal patterns', () => {
  it('counts a hand down to one', () => {
    expect(dealSequence(deal('down', 5))).toEqual([5, 4, 3, 2, 1]);
  });

  it('counts a hand up from one', () => {
    expect(dealSequence(deal('up', 5))).toEqual([1, 2, 3, 4, 5]);
  });

  it('goes down and back up without dealing the turn twice', () => {
    expect(dealSequence(deal('downUp', 4))).toEqual([4, 3, 2, 1, 2, 3, 4]);
  });

  it('goes up and back down without dealing the turn twice', () => {
    expect(dealSequence(deal('upDown', 4))).toEqual([1, 2, 3, 4, 3, 2, 1]);
  });

  it('tracks nothing when every hand is the same size', () => {
    expect(dealSequence(deal('fixed', 7))).toEqual([]);
    expect(dealRoundCount(deal('fixed', 7))).toBeNull();
    expect(cardsInRound(deal('fixed', 7), 0)).toBeNull();
  });

  it('is nineteen hands for ten down to one and back up', () => {
    expect(dealRoundCount(deal('downUp', 10))).toBe(19);
    expect(cardsInRound(deal('downUp', 10), 0)).toBe(10);
    expect(cardsInRound(deal('downUp', 10), 9)).toBe(1);
    expect(cardsInRound(deal('downUp', 10), 18)).toBe(10);
  });

  it('has nothing to deal past the end of the pattern', () => {
    expect(cardsInRound(deal('downUp', 10), 19)).toBeNull();
  });

  it('never deals a hand of zero', () => {
    expect(dealSequence(deal('down', 0))).toEqual([1]);
    expect(dealSequence(deal('downUp', 1))).toEqual([1]);
  });

  it('describes a pattern without listing every hand', () => {
    expect(describeDeal(deal('downUp', 10))).toBe('10, 9 … 1 … 10');
    expect(describeDeal(deal('up', 15))).toBe('1, 2, 3 … 15');
    expect(describeDeal(deal('fixed', 5))).toContain('same hand');
  });
});

describe('the deal each preset sets up', () => {
  it('deals Oh Hell ten down to one and back, for nineteen hands', () => {
    const ohHell = findPreset('oh-hell');
    const four = ohHell.dealFor?.(4);
    expect(four).toEqual({ pattern: 'downUp', maxCards: 10 });
    expect(dealRoundCount(four!)).toBe(19);
    expect(ohHell.settings.endCondition.rounds).toBe(19);
  });

  it('shrinks the opening hand when the deck will not stretch', () => {
    const ohHell = findPreset('oh-hell');
    // Six players cannot have ten each out of fifty-two.
    expect(ohHell.dealFor?.(6)).toEqual({ pattern: 'downUp', maxCards: 8 });
    expect(dealRoundCount(ohHell.dealFor!(6))).toBe(15);
    expect(ohHell.dealFor?.(8)).toEqual({ pattern: 'downUp', maxCards: 6 });
  });

  it('deals Wizard its whole deck, one card more each hand', () => {
    const wizard = findPreset('wizard');
    expect(wizard.dealFor?.(4)).toEqual({ pattern: 'up', maxCards: 15 });
    expect(dealRoundCount(wizard.dealFor!(4))).toBe(15);
    expect(wizard.dealFor?.(6)).toEqual({ pattern: 'up', maxCards: 10 });
  });
});
