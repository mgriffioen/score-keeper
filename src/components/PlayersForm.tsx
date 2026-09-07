import type { Player } from '../types';
import { MAX_PLAYERS, MIN_PLAYERS, makePlayer } from '../lib/session';

/** Add, rename, reorder and remove the people at the table. */
export function PlayersForm(props: {
  players: Player[];
  onChange: (players: Player[]) => void;
  /** Names of players who already have scores, so removal can warn. */
  onRemoveBlocked?: (player: Player) => boolean;
  onBlockedRemove?: (player: Player) => void;
}) {
  const { players } = props;

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

  return (
    <section className="card">
      <div className="section-title">
        Players · {players.length} of {MAX_PLAYERS}
      </div>

      {players.map((player, index) => (
        <div className="playerrow" key={player.id}>
          <span className="playerrow__seat" aria-hidden="true">
            {index + 1}
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
      ))}

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
