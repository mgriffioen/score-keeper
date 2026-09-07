import { useMemo, useRef, useState } from 'react';
import type { GameSession } from '../types';
import { findPreset } from '../lib/presets';
import { exportSessions, importSessions, setSessions } from '../lib/storage';
import { useSessions } from '../lib/useSessions';
import { formatDate, joinParts, pluralize } from '../lib/format';
import { listNames, standings } from '../lib/scoring';
import { BarButton, ConfirmSheet, EmptyState, Sheet, TopBar, toast } from '../components/ui';

export function HomeScreen(props: { onNew: () => void; onOpen: (id: string) => void }) {
  const sessions = useSessions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { active, finished } = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      active: sorted.filter((session) => session.status === 'active'),
      finished: sorted.filter((session) => session.status !== 'active'),
    };
  }, [sessions]);

  const download = () => {
    const blob = new Blob([exportSessions()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `score-keeper-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    toast('Backup downloaded.');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = importSessions(await file.text());
      toast(`Imported ${result.added} new and updated ${result.updated} game${result.updated === 1 ? '' : 's'}.`);
      setMenuOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };

  return (
    <>
      <TopBar
        title="Score Keeper"
        right={
          <BarButton onClick={() => setMenuOpen(true)} muted label="More">
            •••
          </BarButton>
        }
      />

      <main className="screen screen--with-dock">
        {sessions.length === 0 ? (
          <EmptyState art="🂡" title="No games yet">
            <p className="hint">
              Set up a game once and every hand you enter is saved here — names, rules,
              running totals and all.
            </p>
          </EmptyState>
        ) : null}

        {active.length > 0 ? (
          <section>
            <div className="section-title">In progress</div>
            <div className="card card--flush list">
              {active.map((session) => (
                <SessionRow key={session.id} session={session} onOpen={props.onOpen} />
              ))}
            </div>
          </section>
        ) : null}

        {finished.length > 0 ? (
          <section>
            <div className="section-title">History</div>
            <div className="card card--flush list">
              {finished.map((session) => (
                <SessionRow key={session.id} session={session} onOpen={props.onOpen} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <div className="dock">
        <button type="button" className="btn btn--primary btn--block" onClick={props.onNew}>
          New game
        </button>
      </div>

      <Sheet open={menuOpen} title="Saved games" onClose={() => setMenuOpen(false)}>
        <p className="hint" style={{ marginTop: 0 }}>
          Games are stored on this device. Export a backup to move them to another phone
          or to keep them safe.
        </p>
        <button type="button" className="btn btn--block" onClick={download}>
          Export a backup
        </button>
        <button
          type="button"
          className="btn btn--block"
          onClick={() => fileInput.current?.click()}
        >
          Import from a backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn--danger btn--block"
          disabled={sessions.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          Delete all games
        </button>
      </Sheet>

      <ConfirmSheet
        open={confirmClear}
        title="Delete every saved game?"
        message="This clears the whole history on this device and cannot be undone."
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setSessions([]);
          setConfirmClear(false);
          setMenuOpen(false);
          toast('History cleared.');
        }}
      />
    </>
  );
}

function SessionRow(props: { session: GameSession; onOpen: (id: string) => void }) {
  const { session } = props;
  const table = standings(session);
  const preset = findPreset(session.presetId);
  const unit = session.settings.roundLabel.toLowerCase();

  const subtitle =
    session.status === 'active'
      ? joinParts(
          preset.id === 'custom' ? null : preset.name,
          pluralize(session.players.length, 'player'),
          `${session.rounds.length} ${session.rounds.length === 1 ? unit : `${unit}s`} in`,
          table.length > 0 && session.rounds.length > 0 ? `${table[0].player.name} leads` : null,
        )
      : joinParts(
          session.winnerIds && session.winnerIds.length > 0
            ? `Won by ${listNames(
                session.players.filter((player) => session.winnerIds?.includes(player.id)),
              )}`
            : 'Finished',
          formatDate(session.completedAt ?? session.updatedAt),
        );

  return (
    <button type="button" className="listitem" onClick={() => props.onOpen(session.id)}>
      <span className="listitem__body">
        <span className="listitem__title">{session.name}</span>
        <span className="listitem__sub">{subtitle}</span>
      </span>
      {session.status === 'active' ? <span className="badge badge--live">Live</span> : null}
      <span className="listitem__chev" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
