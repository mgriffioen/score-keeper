import { useState } from 'react';
import { PRESETS, findPreset } from '../lib/presets';
import {
  createSession,
  defaultPlayers,
  makePlayer,
  settingsFromPreset,
  suggestName,
} from '../lib/session';
import { upsertSession } from '../lib/storage';
import type { GamePreset, GameSettings, Player } from '../types';
import { PlayersForm } from '../components/PlayersForm';
import { RulesForm } from '../components/RulesForm';
import { BarButton, Field, TopBar } from '../components/ui';

export function SetupScreen(props: { onCancel: () => void; onStarted: (id: string) => void }) {
  const [presetId, setPresetId] = useState('custom');
  const [name, setName] = useState(() => suggestName('custom'));
  const [nameTouched, setNameTouched] = useState(false);
  const [players, setPlayers] = useState<Player[]>(() => defaultPlayers(4));
  const [playersTouched, setPlayersTouched] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => settingsFromPreset('custom'));
  const [firstDealerIndex, setFirstDealerIndex] = useState(0);

  const preset = findPreset(presetId);

  const choosePreset = (id: string) => {
    const chosen = findPreset(id);
    // Only resize the table if nobody has edited it by hand yet.
    const nextPlayers =
      !playersTouched && chosen.suggestedPlayers
        ? resize(players, chosen.suggestedPlayers)
        : players;
    setPresetId(id);
    if (nextPlayers !== players) {
      setPlayers(nextPlayers);
      setFirstDealerIndex(0);
    }
    setSettings(
      withDerivedRounds(settingsFromPreset(id, settings.notes), chosen, nextPlayers.length),
    );
    if (!nameTouched) setName(suggestName(id));
  };

  const updatePlayers = (next: Player[]) => {
    setPlayersTouched(true);
    setPlayers(next);
    if (firstDealerIndex >= next.length) setFirstDealerIndex(0);
    setSettings((current) => withDerivedRounds(current, preset, next.length));
  };

  const start = () => {
    const named = players.map((player, index) => ({
      ...player,
      name: player.name.trim() || `Player ${index + 1}`,
    }));
    const session = createSession({
      name: name.trim() || suggestName(presetId),
      presetId,
      players: named,
      settings,
      firstDealerIndex,
    });
    upsertSession(session);
    props.onStarted(session.id);
  };

  return (
    <>
      <TopBar
        title="New game"
        left={<BarButton onClick={props.onCancel} muted>Cancel</BarButton>}
      />

      <main className="screen screen--with-dock">
        <section className="card">
          <div className="section-title">Game</div>
          <div className="chiprow chiprow--rail">
            {PRESETS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="chip"
                aria-pressed={presetId === entry.id}
                onClick={(event) => {
                  choosePreset(entry.id);
                  event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' });
                }}
              >
                {entry.name}
              </button>
            ))}
          </div>
          <p className="hint">{preset.blurb} Swipe for more — everything below stays editable.</p>
        </section>

        <section className="card">
          <Field label="Session name" hint="Shows up in your history.">
            <input
              className="input"
              type="text"
              value={name}
              maxLength={60}
              aria-label="Session name"
              autoComplete="off"
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
            />
          </Field>
        </section>

        <PlayersForm players={players} onChange={updatePlayers} />

        <RulesForm
          settings={settings}
          players={players}
          firstDealerIndex={firstDealerIndex}
          onChange={setSettings}
          onFirstDealerChange={setFirstDealerIndex}
        />
      </main>

      <div className="dock">
        <button type="button" className="btn btn--primary btn--block" onClick={start}>
          Start game
        </button>
      </div>
    </>
  );
}

/**
 * Oh Hell and Wizard deal the whole deck out, so the number of hands is a
 * consequence of how many people are playing. Re-derive it whenever the table
 * changes — but never overwrite a round count the game no longer uses.
 */
function withDerivedRounds(
  settings: GameSettings,
  preset: GamePreset,
  playerCount: number,
): GameSettings {
  if (!preset.roundsFor || settings.endCondition.type !== 'rounds') return settings;
  return {
    ...settings,
    endCondition: { ...settings.endCondition, rounds: preset.roundsFor(playerCount) },
  };
}

/** Grow or shrink the table to `count`, keeping any names already typed. */
function resize(players: Player[], count: number): Player[] {
  if (players.length === count) return players;
  if (players.length > count) return players.slice(0, count);
  const extra = Array.from({ length: count - players.length }, (_, offset) =>
    makePlayer(players.length + offset),
  );
  return [...players, ...extra];
}
