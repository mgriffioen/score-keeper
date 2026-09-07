import { describe, expect, it } from 'vitest';
import type { BlindLevel, Blinds } from '../types';
import {
  IDLE_CLOCK,
  defaultLevels,
  describeLevel,
  formatClock,
  nextLevelAfter,
  pauseClock,
  readClock,
  restartLevel,
  skipLevel,
  startClock,
} from './blinds';

const MINUTE = 60_000;

function level(smallBlind: number, minutes = 15): BlindLevel {
  return { smallBlind, bigBlind: smallBlind * 2, ante: 0, minutes, isBreak: false };
}

const ladder: Blinds = {
  enabled: true,
  alert: true,
  levels: [level(25, 15), level(50, 15), level(100, 20)],
};

const T0 = 1_700_000_000_000;

describe('reading the clock', () => {
  it('sits at the top of level one before anyone starts it', () => {
    const reading = readClock(ladder, undefined, T0);
    expect(reading.level).toBe(0);
    expect(reading.running).toBe(false);
    expect(reading.remainingMs).toBe(15 * MINUTE);
    expect(reading.next?.smallBlind).toBe(50);
  });

  it('counts down from when it was started', () => {
    const clock = startClock(IDLE_CLOCK, T0);
    expect(readClock(ladder, clock, T0 + 4 * MINUTE).remainingMs).toBe(11 * MINUTE);
    expect(readClock(ladder, clock, T0 + 4 * MINUTE).running).toBe(true);
  });

  it('rolls forward through levels the phone slept through', () => {
    // Started, then locked in a pocket for half an hour: two levels gone.
    const clock = startClock(IDLE_CLOCK, T0);
    const reading = readClock(ladder, clock, T0 + 32 * MINUTE);
    expect(reading.level).toBe(2);
    expect(reading.remainingMs).toBe(18 * MINUTE);
  });

  it('stops at the end of the last level instead of running negative', () => {
    const clock = startClock(IDLE_CLOCK, T0);
    const reading = readClock(ladder, clock, T0 + 10 * 60 * MINUTE);
    expect(reading.finished).toBe(true);
    expect(reading.remainingMs).toBe(0);
    expect(reading.level).toBe(2);
    expect(reading.next).toBeNull();
  });

  it('holds still while paused, however long that is', () => {
    const started = startClock(IDLE_CLOCK, T0);
    const paused = pauseClock(ladder, started, T0 + 5 * MINUTE);
    expect(paused.runningSince).toBeNull();
    expect(readClock(ladder, paused, T0 + 90 * MINUTE).remainingMs).toBe(10 * MINUTE);
  });

  it('picks up where the pause left off', () => {
    const paused = pauseClock(ladder, startClock(IDLE_CLOCK, T0), T0 + 5 * MINUTE);
    const resumed = startClock(paused, T0 + 90 * MINUTE);
    expect(readClock(ladder, resumed, T0 + 92 * MINUTE).remainingMs).toBe(8 * MINUTE);
  });

  it('folds a rolled-forward level into the clock when paused', () => {
    // Paused during level two, having slept through level one.
    const paused = pauseClock(ladder, startClock(IDLE_CLOCK, T0), T0 + 20 * MINUTE);
    expect(paused.level).toBe(1);
    expect(paused.elapsedMs).toBe(5 * MINUTE);
  });

  it('has nothing to show without a ladder', () => {
    const reading = readClock({ enabled: true, alert: true, levels: [] }, undefined, T0);
    expect(reading.current).toBeNull();
    expect(reading.remainingMs).toBe(0);
  });
});

describe('driving the clock by hand', () => {
  it('skips to the next level with a full countdown', () => {
    const clock = skipLevel(ladder, startClock(IDLE_CLOCK, T0), T0 + 3 * MINUTE, 1);
    const reading = readClock(ladder, clock, T0 + 3 * MINUTE);
    expect(reading.level).toBe(1);
    expect(reading.remainingMs).toBe(15 * MINUTE);
    expect(reading.running).toBe(true);
  });

  it('will not skip off either end of the ladder', () => {
    expect(skipLevel(ladder, undefined, T0, -1).level).toBe(0);
    const last = skipLevel(ladder, undefined, T0, 5);
    expect(skipLevel(ladder, last, T0, 1).level).toBe(2);
  });

  it('keeps a paused clock paused when skipping', () => {
    expect(skipLevel(ladder, undefined, T0, 1).runningSince).toBeNull();
  });

  it('puts the current level back to full', () => {
    const clock = restartLevel(ladder, startClock(IDLE_CLOCK, T0), T0 + 9 * MINUTE);
    expect(readClock(ladder, clock, T0 + 9 * MINUTE).remainingMs).toBe(15 * MINUTE);
  });

  it('starting an already-running clock changes nothing', () => {
    const running = startClock(IDLE_CLOCK, T0);
    expect(startClock(running, T0 + MINUTE)).toEqual(running);
  });
});

describe('presentation', () => {
  it('shows minutes and seconds, and hours only when there are some', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9_000)).toBe('0:09');
    expect(formatClock(15 * MINUTE)).toBe('15:00');
    expect(formatClock(75 * MINUTE)).toBe('1:15:00');
  });

  it('never shows a negative countdown', () => {
    expect(formatClock(-5000)).toBe('0:00');
  });

  it('reads out blinds, antes and breaks', () => {
    expect(describeLevel(level(50))).toBe('50 / 100');
    expect(describeLevel({ ...level(50), ante: 25 })).toBe('50 / 100 · ante 25');
    expect(describeLevel({ ...level(0), isBreak: true })).toBe('Break');
    expect(describeLevel(null)).toBe('—');
  });
});

describe('building a ladder', () => {
  it('starts with a playable structure and a break in it', () => {
    const levels = defaultLevels();
    expect(levels.length).toBeGreaterThan(4);
    expect(levels.some((entry) => entry.isBreak)).toBe(true);
    expect(levels[0]).toMatchObject({ smallBlind: 25, bigBlind: 50, minutes: 15 });
  });

  it('doubles the last playing level, looking past a break', () => {
    const levels = [level(50), { ...level(0), isBreak: true, minutes: 10 }];
    expect(nextLevelAfter(levels)).toMatchObject({ smallBlind: 100, bigBlind: 200 });
  });

  it('has somewhere to start from an empty ladder', () => {
    expect(nextLevelAfter([])).toMatchObject({ smallBlind: 25, bigBlind: 50 });
  });
});
