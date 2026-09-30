import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { Player } from '../types';
import { MAX_PLAYERS, MIN_PLAYERS, makePlayer } from '../lib/session';

interface Drag {
  pointerId: number;
  from: number;
  over: number;
  startY: number;
  dy: number;
  /** Vertical midpoints of every row when the drag began. */
  mids: number[];
  /** Distance between neighbouring rows, used to slide the others aside. */
  pitch: number;
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Add, rename, reorder and remove the people at the table. */
export function PlayersForm(props: {
  players: Player[];
  onChange: (players: Player[]) => void;
  /** Names of players who already have scores, so removal can warn. */
  onRemoveBlocked?: (player: Player) => boolean;
  onBlockedRemove?: (player: Player) => void;
}) {
  const { players } = props;
  const rows = useRef(new Map<string, HTMLDivElement>());
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const [drag, setDrag] = useState<Drag | null>(null);

  const rename = (id: string, name: string) => {
    props.onChange(players.map((player) => (player.id === id ? { ...player, name } : player)));
  };

  const remove = (player: Player) => {
    if (players.length <= MIN_PLAYERS) return;
    if (props.onRemoveBlocked?.(player)) {
      props.onBlockedRemove?.(player);
      return;
    }
    props.onChange(players.filter((entry) => entry.id !== player.id));
  };

  const add = () => {
    if (players.length >= MAX_PLAYERS) return;
    props.onChange([...players, makePlayer(players.length)]);
  };

  const shuffle = () => {
    const next = [...players];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    props.onChange(next);
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (players.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rects = players.map((player) => rows.current.get(player.id)?.getBoundingClientRect());
    if (rects.some((rect) => !rect)) return;
    const mids = rects.map((rect) => rect!.top + rect!.height / 2);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setDrag({
      pointerId: event.pointerId,
      from: index,
      over: index,
      startY: event.clientY,
      dy: 0,
      mids,
      pitch: mids.length > 1 ? mids[1] - mids[0] : 0,
    });
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const first = drag.mids[0] - drag.mids[drag.from];
    const last = drag.mids[drag.mids.length - 1] - drag.mids[drag.from];
    const dy = Math.min(Math.max(event.clientY - drag.startY, first), last);
    const centre = drag.mids[drag.from] + dy;
    let over = 0;
    drag.mids.forEach((mid, index) => {
      if (index !== drag.from && centre > mid) over += 1;
    });
    setDrag({ ...drag, dy, over });
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.over !== drag.from) props.onChange(move(players, drag.from, drag.over));
    setDrag(null);
  };

  const nudge = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    const to = index + step;
    if (!step || to < 0 || to >= players.length) return;
    event.preventDefault();
    const id = players[index].id;
    props.onChange(move(players, index, to));
    requestAnimationFrame(() => handles.current.get(id)?.focus());
  };

  /** Where each row should sit while another is being dragged. */
  const offset = (index: number): number => {
    if (!drag) return 0;
    if (index === drag.from) return drag.dy;
    if (drag.from < index && index <= drag.over) return -drag.pitch;
    if (drag.over <= index && index < drag.from) return drag.pitch;
    return 0;
  };

  return (
    <section className="card">
      <div className="section-title">
        Players · {players.length} of {MAX_PLAYERS}
      </div>

      {players.map((player, index) => {
        const dragging = drag?.from === index;
        const shownSeat = drag ? move(players, drag.from, drag.over).indexOf(player) + 1 : index + 1;
        return (
          <div
            className={`playerrow${dragging ? ' playerrow--dragging' : ''}${drag ? ' playerrow--sorting' : ''}`}
            key={player.id}
            ref={(node) => {
              if (node) rows.current.set(player.id, node);
              else rows.current.delete(player.id);
            }}
            style={drag ? { transform: `translateY(${offset(index)}px)` } : undefined}
          >
            <button
              type="button"
              className="playerrow__handle"
              aria-label={`Move ${player.name || `player ${index + 1}`}, seat ${index + 1} of ${players.length}. Use arrow keys to reorder.`}
              disabled={players.length < 2}
              ref={(node) => {
                if (node) handles.current.set(player.id, node);
                else handles.current.delete(player.id);
              }}
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(event) => nudge(event, index)}
            >
              <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
                {[4, 10, 16].map((y) => (
                  <g key={y}>
                    <circle cx="4" cy={y} r="1.6" />
                    <circle cx="10" cy={y} r="1.6" />
                  </g>
                ))}
              </svg>
            </button>
            <span className="playerrow__seat" aria-hidden="true">
              {shownSeat}
            </span>
            <input
              className="input"
              type="text"
              value={player.name}
              maxLength={24}
              aria-label={`Name of player ${index + 1}`}
              placeholder={`Player ${index + 1}`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => rename(player.id, event.target.value)}
            />
            <button
              type="button"
              className="playerrow__remove"
              aria-label={`Remove ${player.name || `player ${index + 1}`}`}
              disabled={players.length <= MIN_PLAYERS}
              onClick={() => remove(player)}
            >
              ×
            </button>
          </div>
        );
      })}

      <div className="chiprow" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="chip"
          onClick={add}
          disabled={players.length >= MAX_PLAYERS}
        >
          + Add player
        </button>
        <button type="button" className="chip" onClick={shuffle} disabled={players.length < 2}>
          ⇄ Shuffle seats
        </button>
      </div>
    </section>
  );
}
