/** Who wins when the game ends. */
export type Direction = 'high' | 'low';

/** How a game finishes. */
export type EndConditionType = 'manual' | 'rounds' | 'target';

/** Whether the target score is a ceiling to reach or a floor to fall to. */
export type TargetComparison = 'atLeast' | 'atMost';

export interface Player {
  id: string;
  name: string;
  /** Optional per-player buy-in override, in the game's currency. */
  ante?: number;
}

export interface EndCondition {
  type: EndConditionType;
  /** Used when type === 'rounds'. */
  rounds: number;
  /** Used when type === 'target'. */
  target: number;
  /** Used when type === 'target'. */
  comparison: TargetComparison;
}

/**
 * Scoring for trick-taking games where you call your hand before playing it:
 * Oh Hell, Wizard and friends. The round's points are derived from the bid and
 * the tricks actually won rather than typed in directly.
 */
export interface BidScoring {
  enabled: boolean;
  /** Points for taking exactly what you called (10 in Oh Hell, 20 in Wizard). */
  exactBonus: number;
  /** Points per trick won, added only when the bid was exact. */
  perTrickMade: number;
  /** What a missed bid is worth. */
  missed: MissedBid;
  /** Points lost per trick over or under, when `missed` is 'penalty'. */
  penaltyPerTrick: number;
}

/** Nothing at all, the tricks you won anyway, or a penalty per trick off. */
export type MissedBid = 'nothing' | 'tricks' | 'penalty';

export interface Stakes {
  enabled: boolean;
  /** Symbol only — this app never touches real money. */
  currency: string;
  /** Buy-in per player. */
  ante: number;
  /** Optional extra each player adds to the pot every round. */
  perRound: number;
}

/**
 * How the hand size moves from round to round in a game that deals a
 * different number of cards each time. "10, 9, 8 … 1, then back up to 10" is
 * `downUp` with a max of 10.
 */
export type DealPattern = 'fixed' | 'down' | 'up' | 'downUp' | 'upDown';

export interface Deal {
  pattern: DealPattern;
  /** The biggest hand dealt. Ignored when the pattern is 'fixed'. */
  maxCards: number;
}

export interface GameSettings {
  direction: Direction;
  /** Score every player starts on (0 for most games, 501 for countdowns). */
  startingScore: number;
  /** Allow negative numbers to be entered for a round. */
  allowNegative: boolean;
  /** What one entry is called: "Round", "Hand", "Deal", "Leg"... */
  roundLabel: string;
  /** Show whose deal it is and rotate it each round. */
  trackDealer: boolean;
  endCondition: EndCondition;
  stakes: Stakes;
  bidScoring: BidScoring;
  deal: Deal;
  notes: string;
}

export interface Round {
  id: string;
  createdAt: number;
  /**
   * playerId -> points scored this round. Missing/null means "not entered".
   * In a bid-scoring game this is derived from `bids` and `tricks`, but it
   * stays the one value totals are built from, so a game that switches
   * scoring mode part-way keeps its history intact.
   */
  scores: Record<string, number | null>;
  /** Bid-scoring games: what each player called before the hand was played. */
  bids?: Record<string, number | null>;
  /** Bid-scoring games: how many tricks each player actually won. */
  tricks?: Record<string, number | null>;
}

export type GameStatus = 'active' | 'completed';

export interface GameSession {
  id: string;
  name: string;
  presetId: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  status: GameStatus;
  players: Player[];
  settings: GameSettings;
  rounds: Round[];
  /** Index into `players` of whoever dealt round 1. */
  firstDealerIndex: number;
  /** Frozen at the moment the game was ended. */
  winnerIds?: string[];
}

/** A named bundle of default settings for a well-known game. */
export interface GamePreset {
  id: string;
  name: string;
  blurb: string;
  suggestedPlayers?: number;
  settings: Omit<GameSettings, 'notes'>;
  /**
   * Games that deal a changing hand size. The deal — and so the number of
   * rounds — depends on how many people are sharing the deck, so setup
   * re-derives it whenever the table changes size.
   */
  dealFor?: (playerCount: number) => Deal;
}

export interface Standing {
  player: Player;
  total: number;
  /** 1-based; players who are tied share a rank. */
  rank: number;
  /** Points behind the current leader (0 for the leader). */
  behind: number;
}
