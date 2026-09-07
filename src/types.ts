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

export interface Stakes {
  enabled: boolean;
  /** Symbol only — this app never touches real money. */
  currency: string;
  /** Buy-in per player. */
  ante: number;
  /** Optional extra each player adds to the pot every round. */
  perRound: number;
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
  notes: string;
}

export interface Round {
  id: string;
  createdAt: number;
  /** playerId -> points scored this round. Missing/null means "not entered". */
  scores: Record<string, number | null>;
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
}

export interface Standing {
  player: Player;
  total: number;
  /** 1-based; players who are tied share a rank. */
  rank: number;
  /** Points behind the current leader (0 for the leader). */
  behind: number;
}
