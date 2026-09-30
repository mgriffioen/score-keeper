import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BidScoring, Player, TrickTable } from '../types';
import {
  bidRoundScore,
  scoresFromBids,
  scoresFromTrickTable,
  trickTableScore,
} from '../lib/scoring';
import { formatSigned } from '../lib/format';
import { Sheet } from './ui';

export type DraftScores = Record<string, number | null>;

export interface EntryResult {
  scores: DraftScores;
  bids?: DraftScores;
  tricks?: DraftScores;
  bonus?: DraftScores;
}

/** Which box on a row the keypad is currently filling. */
type Field = 'score' | 'bid' | 'tricks' | 'bonus';

/**
 * The score pad's hot path. Everything is typed on an in-app keypad rather
 * than a native field, which means the OS keyboard never opens, the page never
 * zooms on focus, and the whole table stays visible while you enter a hand.
 *
 * In a bid-scoring game each player gets two boxes — what they called and what
 * they took — and the points are worked out for you. A trick-table game is the
 * same idea without the call: the tricks taken, plus any bonus, and the table
 * says what that is worth.
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
  initial: { scores: DraftScores; bids?: DraftScores; tricks?: DraftScores; bonus?: DraftScores };
  allowNegative: boolean;
  /** When enabled, the sheet collects bids and tricks instead of raw points. */
  bidScoring: BidScoring;
  /** When enabled (and bidding is not), the sheet collects tricks and bonuses. */
  trickTable: TrickTable;
  /** Tricks going in this round, when the deal is tracked. */
  cardsThisRound?: number | null;
  saveLabel: string;
  onSave: (result: EntryResult) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { open, players, initial, bidScoring, trickTable } = props;
  const bidMode = bidScoring.enabled;
  const tableMode = !bidMode && trickTable.enabled;
  // Both modes put two small counts on each row rather than one raw score.
  const pairMode = bidMode || tableMode;
  const [firstField, secondField]: [Field, Field] = bidMode ? ['bid', 'tricks'] : ['tricks', 'bonus'];
  const secondShown = bidMode || trickTable.bonus;

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState<string>('');
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Bids are called around the table first, then the hand is played and the
  // tricks counted — so walk every bid before any trick count. A trick table
  // walks the tricks first too, then the bonuses.
  const order = useMemo(
    () =>
      pairMode
        ? [
            ...players.map((player) => key(player.id, firstField)),
            ...(secondShown ? players.map((player) => key(player.id, secondField)) : []),
          ]
        : players.map((player) => key(player.id, 'score')),
    [pairMode, firstField, secondField, secondShown, players],
  );

  // Reset every time the sheet opens so a reopened round starts from its
  // saved values, not whatever was half-typed last time.
  useEffect(() => {
    if (!open) return;
    const seeded: Record<string, string> = {};
    for (const player of players) {
      if (bidMode) {
        seeded[key(player.id, 'bid')] = show(initial.bids?.[player.id]);
        seeded[key(player.id, 'tricks')] = show(initial.tricks?.[player.id]);
      } else if (tableMode) {
        seeded[key(player.id, 'tricks')] = show(initial.tricks?.[player.id]);
        seeded[key(player.id, 'bonus')] = show(initial.bonus?.[player.id]);
      } else {
        seeded[key(player.id, 'score')] = show(initial.scores[player.id]);
      }
    }
    setDrafts(seeded);
    // Land on the first box still waiting for a number: reopening a called
    // round puts you straight on the first trick count.
    const nextEmpty = order.find((entry) => seeded[entry] === '');
    setActiveKey(nextEmpty ?? order[0] ?? '');
  }, [open, players, initial, bidMode, tableMode, order]);

  const focusCell = useCallback((cellKey: string) => {
    setActiveKey(cellKey);
    cellRefs.current[cellKey]?.scrollIntoView({ block: 'nearest' });
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (order.length === 0) return;
      const from = Math.max(0, order.indexOf(activeKey));
      focusCell(order[(from + delta + order.length) % order.length]);
    },
    [activeKey, focusCell, order],
  );

  const edit = useCallback(
    (transform: (current: string) => string) => {
      if (!activeKey) return;
      setDrafts((current) => ({ ...current, [activeKey]: transform(current[activeKey] ?? '') }));
    },
    [activeKey],
  );

  const press = useCallback(
    (pressed: string) => {
      if (pressed === 'clear') return edit(() => '');
      if (pressed === 'back') return edit((value) => value.slice(0, -1));
      if (pressed === 'sign') {
        if (!props.allowNegative || pairMode) return;
        return edit((value) => (value.startsWith('-') ? value.slice(1) : `-${value}`));
      }
      // Trick counts are small; raw scores are not. Either way, cap the digits
      // so a stuck finger cannot produce a nonsense total.
      const cap = pairMode ? 2 : 7;
      edit((value) => (digitCount(value) >= cap ? value : value + pressed));
    },
    [pairMode, edit, props.allowNegative],
  );

  const valueAt = useCallback(
    (playerId: string, field: Field) => parseDraft(drafts[key(playerId, field)] ?? ''),
    [drafts],
  );

  const collect = useCallback((): EntryResult => {
    if (tableMode) {
      const tricks: DraftScores = {};
      const bonus: DraftScores = {};
      for (const player of players) {
        tricks[player.id] = valueAt(player.id, 'tricks');
        bonus[player.id] = valueAt(player.id, 'bonus');
      }
      return { scores: scoresFromTrickTable(players, tricks, bonus, trickTable), tricks, bonus };
    }
    if (!bidMode) {
      const scores: DraftScores = {};
      for (const player of players) scores[player.id] = valueAt(player.id, 'score');
      return { scores };
    }
    const bids: DraftScores = {};
    const tricks: DraftScores = {};
    for (const player of players) {
      bids[player.id] = valueAt(player.id, 'bid');
      tricks[player.id] = valueAt(player.id, 'tricks');
    }
    return { scores: scoresFromBids(players, bids, tricks, bidScoring), bids, tricks };
  }, [bidMode, bidScoring, tableMode, trickTable, players, valueAt]);

  const entered = order.filter((entry) => parseDraft(drafts[entry] ?? '') !== null).length;
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
      { key: 'sign', label: '±', util: true, disabled: !props.allowNegative || pairMode },
      { key: '1', label: '1' },
      { key: '2', label: '2' },
      { key: '3', label: '3' },
      { key: 'next', label: 'Next', util: true },
      { key: '0', label: '0' },
      { key: '00', label: '00', disabled: pairMode },
      { key: 'clear', label: 'C', util: true },
      { key: 'save', label: props.saveLabel, go: true },
    ],
    [pairMode, props.allowNegative, props.saveLabel],
  );

  const calledTotal = sumOf(players, (player) => valueAt(player.id, 'bid'));
  const wonTotal = sumOf(players, (player) => valueAt(player.id, 'tricks'));
  const available = props.cardsThisRound ?? null;

  const cell = (player: Player, field: Field) => {
    const cellKey = key(player.id, field);
    const draft = drafts[cellKey] ?? '';
    return (
      <button
        key={cellKey}
        type="button"
        ref={(element) => {
          cellRefs.current[cellKey] = element;
        }}
        className={[
          'cell',
          activeKey === cellKey ? 'cell--active' : '',
          draft === '' ? 'cell--empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={`${FIELD_NAMES[field]} for ${player.name}`}
        onClick={() => focusCell(cellKey)}
      >
        {draft === '' ? '–' : draft}
      </button>
    );
  };

  return (
    <Sheet
      open={open}
      bare
      title={props.title}
      subtitle={props.subtitle}
      closeLabel="Cancel"
      onClose={props.onCancel}
    >
      <div className="entrylist">
        {pairMode ? (
          <div
            className={secondShown ? 'entryhead' : 'entryhead entryhead--single'}
            aria-hidden="true"
          >
            <span />
            <span>{bidMode ? 'Bid' : 'Tricks'}</span>
            {secondShown ? <span>{bidMode ? 'Won' : 'Bonus'}</span> : null}
          </div>
        ) : null}

        {players.map((player) => {
          if (!pairMode) {
            const cellKey = key(player.id, 'score');
            const draft = drafts[cellKey] ?? '';
            return (
              <button
                key={player.id}
                type="button"
                ref={(element) => {
                  cellRefs.current[cellKey] = element;
                }}
                className={activeKey === cellKey ? 'entry entry--active' : 'entry'}
                onClick={() => focusCell(cellKey)}
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
          }

          const bid = valueAt(player.id, 'bid');
          const tricks = valueAt(player.id, 'tricks');
          const points = bidMode
            ? bidRoundScore(bid, tricks, bidScoring)
            : trickTableScore(tricks, valueAt(player.id, 'bonus'), trickTable);
          // Green means "you called it", not merely "you scored" — a missed
          // bid can still be worth something under some house rules. With no
          // bid to make, green is simply "this hand paid".
          const made = bidMode
            ? bid !== null && tricks !== null && bid === tricks
            : points !== null && points > 0;
          return (
            <div
              className={secondShown ? 'entry entry--bid' : 'entry entry--bid entry--single'}
              key={player.id}
            >
              <span className="entry__who">
                <span className="entry__name">{player.name}</span>
                <span className="entry__running">
                  {props.showRunningTotals ? `${props.runningTotals[player.id] ?? 0} so far` : ''}
                  {points !== null ? (
                    <>
                      {props.showRunningTotals ? ' · ' : ''}
                      <b className={made ? 'entry__made' : 'entry__missed'}>
                        {formatSigned(points)}
                      </b>
                    </>
                  ) : null}
                </span>
              </span>
              {cell(player, firstField)}
              {secondShown ? cell(player, secondField) : null}
            </div>
          );
        })}

        {bidMode ? (
          <p className="entrysum">
            {calledTotal} called
            {available !== null ? ` of ${available} · ${describeGap(calledTotal - available)}` : ''}
            {wonTotal > 0 ? ` · ${wonTotal} won` : ''}
          </p>
        ) : null}

        {tableMode && trickTable.tricksPerHand > 0 ? (
          <p className="entrysum">
            {wonTotal} of {trickTable.tricksPerHand} tricks
            {wonTotal > 0 && wonTotal !== trickTable.tricksPerHand
              ? ` · ${describeGap(wonTotal - trickTable.tricksPerHand)}`
              : ''}
          </p>
        ) : null}

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

const FIELD_NAMES: Record<Field, string> = {
  score: 'Score',
  bid: 'Bid',
  tricks: 'Tricks won',
  bonus: 'Bonus points',
};

function key(playerId: string, field: Field): string {
  return `${playerId}|${field}`;
}

function show(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Whether the table has called more tricks than exist. Groups playing the hook
 * rule need the dealer to leave it uneven; everyone else just likes knowing.
 */
function describeGap(difference: number): string {
  if (difference === 0) return 'even';
  return difference > 0 ? `${difference} over` : `${Math.abs(difference)} under`;
}

function sumOf(players: Player[], pick: (player: Player) => number | null): number {
  return players.reduce((total, player) => total + (pick(player) ?? 0), 0);
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
