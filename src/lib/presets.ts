import type { Deal, DealPattern, GamePreset, GameSettings } from '../types';

const base: Omit<GameSettings, 'notes'> = {
  direction: 'high',
  startingScore: 0,
  allowNegative: true,
  roundLabel: 'Round',
  trackDealer: false,
  endCondition: { type: 'manual', rounds: 10, target: 500, comparison: 'atLeast' },
  stakes: { enabled: false, currency: '$', ante: 5, perRound: 0 },
  bidScoring: {
    enabled: false,
    exactBonus: 10,
    perTrickMade: 1,
    missed: 'nothing',
    penaltyPerTrick: 10,
  },
  deal: { pattern: 'fixed', maxCards: 10 },
};

function preset(
  id: string,
  name: string,
  blurb: string,
  overrides: Partial<Omit<GameSettings, 'notes'>>,
  extras: Pick<GamePreset, 'suggestedPlayers' | 'dealFor'> = {},
): GamePreset {
  return {
    id,
    name,
    blurb,
    ...extras,
    settings: {
      ...base,
      ...overrides,
      endCondition: { ...base.endCondition, ...overrides.endCondition },
      stakes: { ...base.stakes, ...overrides.stakes },
      bidScoring: { ...base.bidScoring, ...overrides.bidScoring },
      deal: { ...base.deal, ...overrides.deal },
    },
  };
}

/**
 * Trick-taking games share one deck out, so the biggest hand anyone can be
 * dealt is the deck divided by the table — capped, because most groups do not
 * want a twelve-card opening hand even when the deck allows it.
 */
function dealFromDeck(deckSize: number, pattern: DealPattern, cap = Infinity) {
  return (playerCount: number): Deal => ({
    pattern,
    maxCards: Math.max(1, Math.min(cap, Math.floor(deckSize / playerCount))),
  });
}

/**
 * Starting points, not rules lawyers. Every value a preset sets is editable on
 * the setup screen, and house rules differ everywhere.
 */
export const PRESETS: GamePreset[] = [
  preset('custom', 'Custom game', 'Blank slate — set every rule yourself.', {}),

  preset('rummy', 'Rummy', 'Highest score wins, first to 500 ends it.', {
    direction: 'high',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'target', rounds: 10, target: 500, comparison: 'atLeast' },
  }),

  preset('gin-rummy', 'Gin Rummy', 'Head-to-head, race to 100.', {
    direction: 'high',
    roundLabel: 'Hand',
    endCondition: { type: 'target', rounds: 10, target: 100, comparison: 'atLeast' },
  }, { suggestedPlayers: 2 }),

  preset('hearts', 'Hearts', 'Lowest score wins; the game ends at 100.', {
    direction: 'low',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'target', rounds: 10, target: 100, comparison: 'atLeast' },
  }, { suggestedPlayers: 4 }),

  preset('spades', 'Spades', 'Bid and make it. Highest score at 500 wins.', {
    direction: 'high',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'target', rounds: 10, target: 500, comparison: 'atLeast' },
  }, { suggestedPlayers: 4 }),

  preset('skull-king', 'Skull King', 'Ten hands, bonuses and penalties both count.', {
    direction: 'high',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'rounds', rounds: 10, target: 500, comparison: 'atLeast' },
  }),

  preset(
    'oh-hell',
    'Oh Hell',
    'Call your tricks exactly: a point a trick, plus 10 for getting it right. Best at four or five.',
    {
      direction: 'high',
      roundLabel: 'Hand',
      trackDealer: true,
      allowNegative: false,
      endCondition: { type: 'rounds', rounds: 19, target: 500, comparison: 'atLeast' },
      deal: { pattern: 'downUp', maxCards: 10 },
      // officialgamerules.org: a point a trick, plus 10 for calling it
      // exactly. Bid 3 and take 3 is 13; bid 3 and take 4 is just 4.
      bidScoring: {
        enabled: true,
        exactBonus: 10,
        perTrickMade: 1,
        missed: 'tricks',
        penaltyPerTrick: 1,
      },
    },
    // Ten cards each down to one and back up: nineteen hands. Bigger tables
    // cannot spare ten each from one deck, so the opening hand shrinks.
    { dealFor: dealFromDeck(52, 'downUp', 10), suggestedPlayers: 4 },
  ),

  preset(
    'wizard',
    'Wizard',
    'Call your tricks; wizards and jesters bend the trumps. Its own 60-card deck sets the hand count.',
    {
      direction: 'high',
      roundLabel: 'Hand',
      trackDealer: true,
      endCondition: { type: 'rounds', rounds: 15, target: 500, comparison: 'atLeast' },
      deal: { pattern: 'up', maxCards: 15 },
      bidScoring: {
        enabled: true,
        exactBonus: 20,
        perTrickMade: 10,
        missed: 'penalty',
        penaltyPerTrick: 10,
      },
    },
    { dealFor: dealFromDeck(60, 'up') },
  ),

  preset('golf', 'Golf', 'Nine holes, lowest total takes it.', {
    direction: 'low',
    roundLabel: 'Hole',
    trackDealer: true,
    endCondition: { type: 'rounds', rounds: 9, target: 100, comparison: 'atLeast' },
  }),

  preset('five-crowns', 'Five Crowns', 'Eleven deals, threes through kings, lowest wins.', {
    direction: 'low',
    roundLabel: 'Deal',
    trackDealer: true,
    endCondition: { type: 'rounds', rounds: 11, target: 100, comparison: 'atLeast' },
  }),

  preset('phase-10', 'Phase 10', 'Lowest score wins once someone finishes phase ten.', {
    direction: 'low',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'manual', rounds: 10, target: 100, comparison: 'atLeast' },
  }),

  preset('uno', 'Uno', 'Score the cards left in hand; first to 500 wins.', {
    direction: 'high',
    roundLabel: 'Hand',
    endCondition: { type: 'target', rounds: 10, target: 500, comparison: 'atLeast' },
  }),

  preset('canasta', 'Canasta', 'Partnerships to 5000 — add each side as a player.', {
    direction: 'high',
    roundLabel: 'Hand',
    endCondition: { type: 'target', rounds: 10, target: 5000, comparison: 'atLeast' },
  }, { suggestedPlayers: 2 }),

  preset('cribbage', 'Cribbage', 'First to peg out at 121.', {
    direction: 'high',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'target', rounds: 10, target: 121, comparison: 'atLeast' },
  }, { suggestedPlayers: 2 }),

  preset('farkle', 'Farkle', 'Dice, greed, and a 10,000 point finish line.', {
    direction: 'high',
    roundLabel: 'Turn',
    endCondition: { type: 'target', rounds: 10, target: 10000, comparison: 'atLeast' },
  }),

  preset('countdown', 'Countdown', 'Everyone starts on 501 and races down to zero.', {
    direction: 'low',
    startingScore: 501,
    roundLabel: 'Leg',
    endCondition: { type: 'target', rounds: 10, target: 0, comparison: 'atMost' },
  }),

  preset('poker-night', 'Poker night', 'Chip counts with a buy-in and a pot.', {
    direction: 'high',
    roundLabel: 'Hand',
    trackDealer: true,
    endCondition: { type: 'manual', rounds: 10, target: 500, comparison: 'atLeast' },
    stakes: { enabled: true, currency: '$', ante: 20, perRound: 0 },
  }),
];

export function findPreset(id: string): GamePreset {
  return PRESETS.find((entry) => entry.id === id) ?? PRESETS[0];
}
