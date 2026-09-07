import type { BlindClock, BlindLevel, Blinds } from '../types';

export const IDLE_CLOCK: BlindClock = { level: 0, runningSince: null, elapsedMs: 0 };

/** A serviceable home-game ladder: fifteen minutes a level, a break in the middle. */
export function defaultLevels(): BlindLevel[] {
  const level = (smallBlind: number, ante = 0): BlindLevel => ({
    smallBlind,
    bigBlind: smallBlind * 2,
    ante,
    minutes: 15,
    isBreak: false,
  });
  return [
    level(25),
    level(50),
    level(75),
    level(100),
    { smallBlind: 0, bigBlind: 0, ante: 0, minutes: 10, isBreak: true },
    level(150, 25),
    level(200, 50),
    level(300, 75),
    level(500, 100),
  ];
}

export function nextLevelAfter(levels: BlindLevel[]): BlindLevel {
  const last = [...levels].reverse().find((entry) => !entry.isBreak);
  if (!last) return { smallBlind: 25, bigBlind: 50, ante: 0, minutes: 15, isBreak: false };
  return {
    smallBlind: last.smallBlind * 2,
    bigBlind: last.bigBlind * 2,
    ante: last.ante * 2,
    minutes: last.minutes,
    isBreak: false,
  };
}

export function levelDurationMs(level: BlindLevel): number {
  return Math.max(0, Math.round(level.minutes * 60_000));
}

export interface ClockReading {
  /** The level actually in play right now. */
  level: number;
  current: BlindLevel | null;
  next: BlindLevel | null;
  remainingMs: number;
  running: boolean;
  /** True once the last level has run out. */
  finished: boolean;
  /** 0–1 through the current level. */
  progress: number;
}

/**
 * Where the clock stands at `now`. Elapsed time is rolled forward through as
 * many levels as it covers, so a phone left locked through two whole levels
 * comes back showing the right one instead of a stale countdown.
 */
export function readClock(blinds: Blinds, clock: BlindClock | undefined, now: number): ClockReading {
  const levels = blinds.levels;
  const idle: ClockReading = {
    level: 0,
    current: levels[0] ?? null,
    next: levels[1] ?? null,
    remainingMs: levels[0] ? levelDurationMs(levels[0]) : 0,
    running: false,
    finished: false,
    progress: 0,
  };
  if (levels.length === 0) return { ...idle, current: null, next: null };
  if (!clock) return idle;

  const running = clock.runningSince !== null;
  let elapsed = clock.elapsedMs + (clock.runningSince !== null ? now - clock.runningSince : 0);
  let index = Math.max(0, Math.min(clock.level, levels.length - 1));

  while (index < levels.length) {
    const duration = levelDurationMs(levels[index]);
    if (elapsed < duration || duration === 0) {
      return {
        level: index,
        current: levels[index],
        next: levels[index + 1] ?? null,
        remainingMs: Math.max(0, duration - elapsed),
        running,
        finished: false,
        progress: duration === 0 ? 1 : Math.min(1, elapsed / duration),
      };
    }
    elapsed -= duration;
    index += 1;
  }

  const last = levels.length - 1;
  return {
    level: last,
    current: levels[last],
    next: null,
    remainingMs: 0,
    running: false,
    finished: true,
    progress: 1,
  };
}

/** Start, or pick up from where a pause left off. */
export function startClock(clock: BlindClock | undefined, now: number): BlindClock {
  const base = clock ?? IDLE_CLOCK;
  if (base.runningSince !== null) return base;
  return { ...base, runningSince: now };
}

/** Freeze the countdown, folding the rolled-forward level back into the clock. */
export function pauseClock(blinds: Blinds, clock: BlindClock | undefined, now: number): BlindClock {
  const reading = readClock(blinds, clock, now);
  const duration = reading.current ? levelDurationMs(reading.current) : 0;
  return {
    level: reading.level,
    runningSince: null,
    elapsedMs: Math.max(0, duration - reading.remainingMs),
  };
}

/** Jump a level in either direction, keeping the clock's running state. */
export function skipLevel(
  blinds: Blinds,
  clock: BlindClock | undefined,
  now: number,
  delta: number,
): BlindClock {
  const reading = readClock(blinds, clock, now);
  const level = Math.max(0, Math.min(blinds.levels.length - 1, reading.level + delta));
  return { level, elapsedMs: 0, runningSince: reading.running ? now : null };
}

/** Put the current level back to full, without changing level. */
export function restartLevel(
  blinds: Blinds,
  clock: BlindClock | undefined,
  now: number,
): BlindClock {
  const reading = readClock(blinds, clock, now);
  return { level: reading.level, elapsedMs: 0, runningSince: reading.running ? now : null };
}

/** mm:ss, or h:mm:ss for the rare very long level. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** "50 / 100" or "50 / 100 · ante 25". */
export function describeLevel(level: BlindLevel | null): string {
  if (!level) return '—';
  if (level.isBreak) return 'Break';
  const blinds = `${level.smallBlind} / ${level.bigBlind}`;
  return level.ante > 0 ? `${blinds} · ante ${level.ante}` : blinds;
}
