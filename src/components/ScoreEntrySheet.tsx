import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../types';
import { Sheet } from './ui';

export type DraftScores = Record<string, number | null>;

/**
 * The score pad's hot path. Everything is typed on an in-app keypad rather
 * than a native field, which means the OS keyboard never opens, the page never
 * zooms on focus, and the whole table stays visible while you enter a hand.
 */
export function ScoreEntrySheet(props: {
  open: boolean;
  title: string;
  subtitle?: string;
  players: Player[];
  /** Totals before this round, shown beside each name for context. */
  runningTotals: Record<string, number>;
  /** Hidden on the very first round, when every total is still the same. */
  showRunningTotals: boolean;
  initial: DraftScores;
  allowNegative: boolean;
  saveLabel: string;
  onSave: (scores: DraftScores) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { open, players, initial } = props;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string>('');
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Reset every time the sheet opens so a reopened round starts from its
  // saved values, not whatever was half-typed last time.
  useEffect(() => {
    if (!open) return;
    const seeded: Record<string, string> = {};
    for (const player of players) {
      const value = initial[player.id];
      seeded[player.id] = value === null || value === undefined ? '' : String(value);
    }
    setDrafts(seeded);
    setActiveId(players[0]?.id ?? '');
  }, [open, players, initial]);

  const activeIndex = players.findIndex((player) => player.id === activeId);

  const focusRow = useCallback((id: string) => {
    setActiveId(id);
    rowRefs.current[id]?.scrollIntoView({ block: 'nearest' });
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (players.length === 0) return;
      const from = activeIndex === -1 ? 0 : activeIndex;
      const next = players[(from + delta + players.length) % players.length];
      focusRow(next.id);
    },
    [activeIndex, focusRow, players],
  );

  const edit = useCallback(
    (transform: (current: string) => string) => {
      if (!activeId) return;
      setDrafts((current) => ({ ...current, [activeId]: transform(current[activeId] ?? '') }));
    },
    [activeId],
  );

  const press = useCallback(
    (key: string) => {
      if (key === 'clear') return edit(() => '');
      if (key === 'back') return edit((value) => value.slice(0, -1));
      if (key === 'sign') {
        if (!props.allowNegative) return;
        return edit((value) => (value.startsWith('-') ? value.slice(1) : `-${value}`));
      }
      // Cap the digit count so a stuck finger cannot produce a nonsense total.
      edit((value) => (digitCount(value) >= 7 ? value : value + key));
    },
    [edit, props.allowNegative],
  );

  const collect = useCallback((): DraftScores => {
    const result: DraftScores = {};
    for (const player of players) result[player.id] = parseDraft(drafts[player.id] ?? '');
    return result;
  }, [drafts, players]);

  const entered = players.filter((player) => parseDraft(drafts[player.id] ?? '') !== null).length;
  const canSave = entered > 0;

  const save = useCallback(() => {
    if (!canSave) return;
    props.onSave(collect());
  }, [canSave, collect, props]);

  // Desktop courtesy: the same keypad, on a real keyboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key)) {
        press(event.key);
      } else if (event.key === 'Backspace') {
        press('back');
      } else if (event.key === '-' || event.key === '_') {
        press('sign');
      } else if (event.key === 'Tab' || event.key === 'ArrowDown') {
        step(1);
      } else if (event.key === 'ArrowUp') {
        step(-1);
      } else if (event.key === 'Enter') {
        save();
      } else {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, press, save, step]);

  const keys = useMemo(
    () => [
      { key: '7', label: '7' },
      { key: '8', label: '8' },
      { key: '9', label: '9' },
      { key: 'back', label: '⌫', util: true },
      { key: '4', label: '4' },
      { key: '5', label: '5' },
      { key: '6', label: '6' },
      { key: 'sign', label: '±', util: true, disabled: !props.allowNegative },
      { key: '1', label: '1' },
      { key: '2', label: '2' },
      { key: '3', label: '3' },
      { key: 'next', label: 'Next', util: true },
      { key: '0', label: '0' },
      { key: '00', label: '00' },
      { key: 'clear', label: 'C', util: true },
      { key: 'save', label: props.saveLabel, go: true },
    ],
    [props.allowNegative, props.saveLabel],
  );

  return (
    <Sheet
      open={open}
      bare
      title={props.title}
      subtitle={props.subtitle}
      closeLabel="Cancel"
      onClose={props.onCancel}
    >
      <div className="entrylist" ref={listRef}>
        {players.map((player) => {
          const draft = drafts[player.id] ?? '';
          const isActive = player.id === activeId;
          return (
            <button
              key={player.id}
              type="button"
              ref={(element) => {
                rowRefs.current[player.id] = element;
              }}
              className={isActive ? 'entry entry--active' : 'entry'}
              onClick={() => focusRow(player.id)}
            >
              <span className="entry__name">
                {player.name}
                {props.showRunningTotals ? (
                  <span className="entry__running"> · {props.runningTotals[player.id] ?? 0} so far</span>
                ) : null}
              </span>
              <span className={draft === '' ? 'entry__value entry__value--empty' : 'entry__value'}>
                {draft === '' ? '–' : draft}
              </span>
            </button>
          );
        })}
        {props.onDelete ? (
          <button type="button" className="btn btn--danger" onClick={props.onDelete}>
            Delete this round
          </button>
        ) : null}
      </div>

      <div className="keypad" role="group" aria-label="Score keypad">
        {keys.map((entry) => {
          const className = entry.go ? 'key key--go' : entry.util ? 'key key--util' : 'key';
          const onClick =
            entry.key === 'next' ? () => step(1) : entry.key === 'save' ? save : () => press(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              className={className}
              disabled={entry.disabled || (entry.key === 'save' && !canSave)}
              onClick={onClick}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** '' and a lone '-' both mean "nothing entered yet". */
export function parseDraft(draft: string): number | null {
  if (draft === '' || draft === '-') return null;
  const parsed = Number.parseInt(draft, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function digitCount(value: string): number {
  return value.replace('-', '').length;
}
