import { useEffect, useRef, useState } from 'react';
import type { BlindClock, Blinds } from '../types';
import {
  describeLevel,
  formatClock,
  pauseClock,
  readClock,
  restartLevel,
  skipLevel,
  startClock,
} from '../lib/blinds';

/**
 * Re-renders on a beat while the countdown is running. The clock itself is
 * wall-clock arithmetic, so this only decides how often the digits refresh —
 * missing ticks in a backgrounded tab costs nothing.
 */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    // Coming back to the tab should snap to the truth immediately.
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active]);
  return now;
}

/** A short chime, built on the fly so there is no audio file to ship. */
function chime(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const context = new Ctor();
    const play = (frequency: number, at: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.0001, context.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + 0.45);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + at);
      oscillator.stop(context.currentTime + at + 0.5);
    };
    play(880, 0);
    play(1320, 0.22);
    window.setTimeout(() => void context.close(), 1200);
  } catch {
    // A browser that will not make noise is not a reason to stop the game.
  }
}

export function BlindsClock(props: {
  blinds: Blinds;
  clock: BlindClock | undefined;
  onChange: (clock: BlindClock) => void;
}) {
  const { blinds, clock } = props;
  const running = clock?.runningSince != null;
  const now = useTick(running);
  const reading = readClock(blinds, clock, now);
  const lastLevel = useRef<number | null>(null);

  // Announce a level change, but never on first paint — reopening a game
  // hours later should not set the phone off.
  useEffect(() => {
    const previous = lastLevel.current;
    lastLevel.current = reading.level;
    if (previous === null || previous === reading.level) return;
    if (!blinds.alert || !running) return;
    chime();
    navigator.vibrate?.([200, 100, 200]);
  }, [reading.level, blinds.alert, running]);

  if (blinds.levels.length === 0) return null;

  const urgent = running && reading.remainingMs > 0 && reading.remainingMs <= 60_000;
  // Breaks are not levels, so neither the count nor the position counts them:
  // the first rung after a break is level 5 of 8, not level 6 of 9.
  const playingLevels = blinds.levels.filter((entry) => !entry.isBreak).length;
  const levelOrdinal = blinds.levels
    .slice(0, reading.level + 1)
    .filter((entry) => !entry.isBreak).length;
  // A clock stopped part-way through a level is resumed, not started.
  const partway = (clock?.elapsedMs ?? 0) > 0 || reading.progress > 0;
  const atLevel = (delta: number) => props.onChange(skipLevel(blinds, clock, Date.now(), delta));

  return (
    <section
      className={[
        'clock',
        reading.current?.isBreak ? 'clock--break' : '',
        urgent ? 'clock--urgent' : '',
        reading.finished ? 'clock--done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="clock__head">
        <span className="clock__level">
          {reading.current?.isBreak ? (
            'Break'
          ) : (
            <>
              Level {levelOrdinal}
              <span className="clock__of"> of {playingLevels}</span>
            </>
          )}
        </span>
        <span className="clock__blinds">{describeLevel(reading.current)}</span>
      </div>

      <div className="clock__time tabular" role="timer" aria-live="off">
        {reading.finished ? 'Done' : formatClock(reading.remainingMs)}
      </div>

      <div className="progress">
        <div className="progress__fill" style={{ width: `${Math.round(reading.progress * 100)}%` }} />
      </div>

      <div className="clock__next">
        {reading.next ? `Next: ${describeLevel(reading.next)}` : 'Last level'}
      </div>

      <div className="clock__controls">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => atLevel(-1)}
          disabled={reading.level === 0}
          aria-label="Previous level"
        >
          ‹
        </button>
        <button
          type="button"
          className="btn btn--primary btn--grow"
          onClick={() =>
            props.onChange(
              running
                ? pauseClock(blinds, clock, Date.now())
                : reading.finished
                  ? restartLevel(blinds, clock, Date.now())
                  : startClock(clock, Date.now()),
            )
          }
        >
          {running ? 'Pause' : reading.finished ? 'Restart level' : partway ? 'Resume' : 'Start'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => props.onChange(restartLevel(blinds, clock, Date.now()))}
          aria-label="Restart this level"
        >
          ↺
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => atLevel(1)}
          disabled={reading.level >= blinds.levels.length - 1}
          aria-label="Next level"
        >
          ›
        </button>
      </div>
    </section>
  );
}
