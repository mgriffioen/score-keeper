import type { Deal } from '../types';

/**
 * The hand sizes a game deals, in order. Oh Hell's classic pattern is
 * "10, 9, 8 … 1, and back up to 10" — nineteen hands from a max of ten.
 */
export function dealSequence(deal: Deal): number[] {
  const max = Math.max(1, Math.floor(deal.maxCards));
  const down = Array.from({ length: max }, (_, index) => max - index);
  const up = Array.from({ length: max }, (_, index) => index + 1);

  switch (deal.pattern) {
    case 'down':
      return down;
    case 'up':
      return up;
    // The turn is played once, not twice, so the pivot hand is not repeated.
    case 'downUp':
      return [...down, ...up.slice(1)];
    case 'upDown':
      return [...up, ...down.slice(1)];
    case 'fixed':
      return [];
  }
}

/** How many rounds the pattern lasts, or null when it isn't tracked. */
export function dealRoundCount(deal: Deal): number | null {
  if (deal.pattern === 'fixed') return null;
  return dealSequence(deal).length;
}

/** Cards dealt for a given (0-based) round, or null past the end of the deal. */
export function cardsInRound(deal: Deal, roundIndex: number): number | null {
  const sequence = dealSequence(deal);
  return sequence[roundIndex] ?? null;
}

/** "10, 9, 8 … 1, 2 … 10" — a readable preview of the pattern. */
export function describeDeal(deal: Deal): string {
  const sequence = dealSequence(deal);
  if (sequence.length === 0) return 'The same hand every round.';
  if (sequence.length <= 6) return sequence.join(', ');

  const turn = sequence.indexOf(Math.min(...sequence));
  const isTwoLegged = deal.pattern === 'downUp' || deal.pattern === 'upDown';
  if (!isTwoLegged) {
    return `${sequence.slice(0, 3).join(', ')} … ${sequence[sequence.length - 1]}`;
  }
  const pivot = deal.pattern === 'downUp' ? sequence[turn] : Math.max(...sequence);
  return `${sequence.slice(0, 2).join(', ')} … ${pivot} … ${sequence[sequence.length - 1]}`;
}
