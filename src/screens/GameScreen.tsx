import { useMemo, useState } from 'react';
import type { GameSession, GameSettings, Player, Round } from '../types';
import {
  addRound,
  finishGame,
  removeRound,
  rematch as makeRematch,
  reopenGame,
  replaceRound,
} from '../lib/session';
import { deleteSession, upsertSession } from '../lib/storage';
import {
  checkEnd,
  cumulativeTotals,
  dealerForRound,
  openRound,
  scoredRoundCount,
  listNames,
  potTotal,
  progress,
  standings,
  totals,
} from '../lib/scoring';
import { formatMoney, formatSigned, joinParts, pluralize } from '../lib/format';
import { cardsInRound } from '../lib/deal';
import { PlayersForm } from '../components/PlayersForm';
import { RulesForm } from '../components/RulesForm';
import { ScoreEntrySheet, type DraftScores, type EntryResult } from '../components/ScoreEntrySheet';
import { BarButton, ConfirmSheet, Field, Segmented, Sheet, TopBar, toast } from '../components/ui';

type Dialog =
  | { kind: 'none' }
  | { kind: 'menu' }
  | { kind: 'rename' }
  | { kind: 'settings' }
  | { kind: 'addRound' }
  | { kind: 'editRound'; round: Round }
  | { kind: 'player'; player: Player }
  | { kind: 'confirmEnd' }
  | { kind: 'confirmUndo' }
  | { kind: 'confirmDelete' };

export function GameScreen(props: {
  session: GameSession;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const { session } = props;
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [endDismissedAt, setEndDismissedAt] = useState(-1);
  const [tableMode, setTableMode] = useState<'round' | 'running'>('round');

  const close = () => setDialog({ kind: 'none' });
  const save = (next: GameSession) => upsertSession(next);

  const table = useMemo(() => standings(session), [session]);
  const totalByPlayer = useMemo(() => totals(session), [session]);
  const running = useMemo(() => cumulativeTotals(session), [session]);
  const end = useMemo(() => checkEnd(session), [session]);
  const done = session.status === 'completed';
  const unit = session.settings.roundLabel;
  const bidMode = session.settings.bidScoring.enabled;
  // A bid game saves the hand as soon as everyone has called, so the bids are
  // on screen while it is played. That hand is still the one in progress.
  const pending = openRound(session);
  const playedCount = scoredRoundCount(session);
  const roundNumber = playedCount + 1;
  const nextDealer = dealerForRound(session, playedCount);
  const pct = progress(session);
  const pot = potTotal(session);
  const cardsNow = cardsInRound(session.settings.deal, playedCount);

  // Totals as they stand before the round being entered, for on-screen context.
  const totalsBefore = (roundId?: string): Record<string, number> => {
    if (!roundId) return totalByPlayer;
    const index = session.rounds.findIndex((round) => round.id === roundId);
    if (index <= 0) {
      const base: Record<string, number> = {};
      for (const player of session.players) base[player.id] = session.settings.startingScore;
      return base;
    }
    return running[index - 1];
  };

  const showEndPrompt = !done && end.reached && endDismissedAt !== session.rounds.length;

  const commitRound = (result: EntryResult) => {
    save(addRound(session, result));
    setEndDismissedAt(-1);
    close();
  };

  /** Everything the entry sheet needs to reopen a round exactly as saved. */
  const entryFor = (round: Round | null): {
    scores: DraftScores;
    bids?: DraftScores;
    tricks?: DraftScores;
  } =>
    round
      ? { scores: round.scores, bids: round.bids, tricks: round.tricks }
      : { scores: blankScores(session.players) };

  const winners = session.players.filter((player) => session.winnerIds?.includes(player.id));

  return (
    <>
      <TopBar
        title={session.name}
        subtitle={joinParts(
          done ? 'Finished' : `${unit} ${roundNumber}`,
          !done && cardsNow !== null ? `${cardsNow} cards` : null,
          describeRule(session.settings),
        )}
        left={
          <BarButton onClick={props.onBack} muted label="Back to games">
            ‹ Games
          </BarButton>
        }
        right={
          <BarButton onClick={() => setDialog({ kind: 'menu' })} muted label="Game menu">
            •••
          </BarButton>
        }
      />

      <main className={done ? 'screen' : 'screen screen--with-dock'}>
        {done ? (
          <section className="card winner">
            <div className="winner__crown" aria-hidden="true">
              🏆
            </div>
            <div className="winner__name">
              {winners.length > 0 ? listNames(winners) : 'No winner recorded'}
            </div>
            <div className="winner__sub">
              {winners.length > 1 ? 'share the win' : 'wins'}
              {winners.length > 0 ? ` on ${totalByPlayer[winners[0].id]}` : ''}
              {pot > 0 ? ` · pot ${formatMoney(pot, session.settings.stakes.currency)}` : ''}
            </div>
          </section>
        ) : null}

        {showEndPrompt ? (
          <section className="card">
            <div className="section-title">That&apos;s the game</div>
            <p style={{ margin: '0 0 12px' }}>{end.reason}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn--ghost btn--grow"
                onClick={() => setEndDismissedAt(session.rounds.length)}
              >
                Keep playing
              </button>
              <button
                type="button"
                className="btn btn--primary btn--grow"
                onClick={() => save(finishGame(session))}
              >
                End game
              </button>
            </div>
          </section>
        ) : null}

        <section className="card card--flush">
          <div className={session.players.length > 5 ? 'standings standings--dense' : 'standings'}>
            {table.map((entry) => {
              // While a hand is called but unplayed, show what they called
              // rather than the score of the hand before it.
              const called = pending?.bids?.[entry.player.id];
              const lastPlayed = pending ? session.rounds.at(-2) : session.rounds.at(-1);
              const last = lastPlayed?.scores[entry.player.id];
              return (
                <button
                  key={entry.player.id}
                  type="button"
                  className={entry.rank === 1 ? 'standing standing--leader' : 'standing'}
                  onClick={() => setDialog({ kind: 'player', player: entry.player })}
                >
                  <span className="standing__rank">{entry.rank}</span>
                  <span>
                    <span className="standing__name">{entry.player.name}</span>
                    <span className="standing__meta">
                      {entry.rank === 1
                        ? playedCount === 0
                          ? 'level'
                          : 'leading'
                        : `${entry.behind} behind`}
                      {nextDealer?.id === entry.player.id && !done ? ' · deals next' : ''}
                    </span>
                  </span>
                  <span>
                    <span className="standing__total tabular">{entry.total}</span>
                    {called !== null && called !== undefined ? (
                      <span className="standing__last">called {called}</span>
                    ) : last !== null && last !== undefined ? (
                      <span className="standing__last">last {formatSigned(last)}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {pct !== null && !done ? (
          <div className="progress" role="presentation">
            <div className="progress__fill" style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
        ) : null}

        <section className="summary">
          <div className="stat">
            <div className="stat__label">{unit}s played</div>
            <div className="stat__value">{playedCount}</div>
          </div>
          {session.settings.endCondition.type === 'rounds' ? (
            <div className="stat">
              <div className="stat__label">Remaining</div>
              <div className="stat__value">
                {Math.max(0, session.settings.endCondition.rounds - playedCount)}
              </div>
            </div>
          ) : null}
          {session.settings.endCondition.type === 'target' ? (
            <div className="stat">
              <div className="stat__label">Target</div>
              <div className="stat__value">{session.settings.endCondition.target}</div>
            </div>
          ) : null}
          {session.settings.stakes.enabled ? (
            <div className="stat">
              <div className="stat__label">Pot</div>
              <div className="stat__value">
                {formatMoney(pot, session.settings.stakes.currency)}
              </div>
            </div>
          ) : null}
          {nextDealer && !done ? (
            <div className="stat">
              <div className="stat__label">Deals next</div>
              <div className="stat__value" style={{ fontSize: 17 }}>
                {nextDealer.name}
              </div>
            </div>
          ) : null}
        </section>

        {session.settings.notes.trim() ? (
          <section className="card">
            <div className="section-title">Notes</div>
            <p className="selectable" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {session.settings.notes}
            </p>
          </section>
        ) : null}

        {session.rounds.length > 0 ? (
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div className="section-title" style={{ marginBottom: 0 }}>
                Every {unit.toLowerCase()}
              </div>
              <div style={{ width: 168 }}>
                <Segmented
                  ariaLabel="Table mode"
                  value={tableMode}
                  onChange={setTableMode}
                  options={[
                    { value: 'round', label: 'Each' },
                    { value: 'running', label: 'Running' },
                  ]}
                />
              </div>
            </div>
            <div className="card card--flush">
              <div className="tablewrap">
                <table className="rounds">
                  <thead>
                    <tr>
                      <th scope="col">{unit}</th>
                      {session.players.map((player) => (
                        <th key={player.id} scope="col">
                          {player.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session.rounds.map((round, index) => (
                      <tr
                        key={round.id}
                        onClick={() => setDialog({ kind: 'editRound', round })}
                        style={{ cursor: 'pointer' }}
                      >
                        <th scope="row">
                          {index + 1}
                          {cardsInRound(session.settings.deal, index) !== null ? (
                            <span className="cell__called">
                              {cardsInRound(session.settings.deal, index)} cards
                            </span>
                          ) : null}
                        </th>
                        {session.players.map((player) => {
                          const value = round.scores[player.id];
                          const shown =
                            tableMode === 'running' ? running[index][player.id] : value;
                          const blank = tableMode === 'round' && (value === null || value === undefined);
                          const bid = round.bids?.[player.id];
                          const won = round.tricks?.[player.id];
                          return (
                            <td
                              key={player.id}
                              className={blank ? 'cell--blank' : shown === 0 ? 'cell--zero' : undefined}
                            >
                              {blank ? '–' : shown}
                              {bidMode && tableMode === 'round' && bid !== null && bid !== undefined ? (
                                <span className="cell__called">
                                  {bid} → {won ?? '–'}
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Total</th>
                      {session.players.map((player) => (
                        <td key={player.id}>{totalByPlayer[player.id]}</td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <p className="hint">Tap any row to fix a {unit.toLowerCase()}.</p>
          </section>
        ) : null}
      </main>

      {!done ? (
        <div className="dock">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() =>
              setDialog(pending ? { kind: 'editRound', round: pending } : { kind: 'addRound' })
            }
          >
            {pending
              ? `Score ${unit.toLowerCase()} ${roundNumber}`
              : `+ Add ${unit.toLowerCase()} ${roundNumber}`}
          </button>
        </div>
      ) : (
        <div className="dock">
          <button
            type="button"
            className="btn btn--ghost btn--grow"
            onClick={() => save(reopenGame(session))}
          >
            Reopen
          </button>
          <button
            type="button"
            className="btn btn--primary btn--grow"
            onClick={() => {
              const next = makeRematch(session);
              upsertSession(next);
              props.onOpen(next.id);
            }}
          >
            Rematch
          </button>
        </div>
      )}

      {/* ------------------------------------------------------- entry -- */}
      <ScoreEntrySheet
        open={dialog.kind === 'addRound'}
        title={`${unit} ${roundNumber}`}
        subtitle={[
          cardsNow !== null ? `${cardsNow} cards each` : null,
          nextDealer ? `${nextDealer.name} deals` : null,
          bidMode ? 'call first, scores follow' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        players={session.players}
        runningTotals={totalByPlayer}
        showRunningTotals={playedCount > 0}
        initial={entryFor(null)}
        allowNegative={session.settings.allowNegative}
        bidScoring={session.settings.bidScoring}
        cardsThisRound={cardsNow}
        saveLabel="Save"
        onSave={commitRound}
        onCancel={close}
      />

      <ScoreEntrySheet
        open={dialog.kind === 'editRound'}
        title={
          dialog.kind === 'editRound'
            ? `${unit} ${session.rounds.findIndex((round) => round.id === dialog.round.id) + 1}`
            : unit
        }
        subtitle={
          dialog.kind === 'editRound' && dialog.round === pending
            ? 'Everyone has called — enter the tricks won'
            : 'Fix a mis-typed score'
        }
        players={session.players}
        runningTotals={dialog.kind === 'editRound' ? totalsBefore(dialog.round.id) : totalByPlayer}
        showRunningTotals={playedCount > 1}
        initial={entryFor(dialog.kind === 'editRound' ? dialog.round : null)}
        allowNegative={session.settings.allowNegative}
        bidScoring={session.settings.bidScoring}
        cardsThisRound={
          dialog.kind === 'editRound'
            ? cardsInRound(
                session.settings.deal,
                session.rounds.findIndex((round) => round.id === dialog.round.id),
              )
            : cardsNow
        }
        saveLabel={dialog.kind === 'editRound' && dialog.round === pending ? 'Save' : 'Update'}
        onSave={(result) => {
          if (dialog.kind !== 'editRound') return;
          save(replaceRound(session, dialog.round.id, result));
          setEndDismissedAt(-1);
          close();
        }}
        onDelete={() => {
          if (dialog.kind !== 'editRound') return;
          save(removeRound(session, dialog.round.id));
          close();
          toast(`${unit} deleted.`);
        }}
        onCancel={close}
      />

      {/* -------------------------------------------------------- menu -- */}
      <Sheet open={dialog.kind === 'menu'} title={session.name} onClose={close}>
        <button
          type="button"
          className="btn btn--block"
          onClick={() => setDialog({ kind: 'rename' })}
        >
          Rename game
        </button>
        <button
          type="button"
          className="btn btn--block"
          onClick={() => setDialog({ kind: 'settings' })}
        >
          Players &amp; rules
        </button>
        {!done ? (
          <button
            type="button"
            className="btn btn--block"
            disabled={session.rounds.length === 0}
            onClick={() => setDialog({ kind: 'confirmUndo' })}
          >
            Undo last {unit.toLowerCase()}
          </button>
        ) : null}
        {!done ? (
          <button
            type="button"
            className="btn btn--block"
            onClick={() => setDialog({ kind: 'confirmEnd' })}
          >
            End game now
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--block"
            onClick={() => {
              save(reopenGame(session));
              close();
            }}
          >
            Reopen game
          </button>
        )}
        <button
          type="button"
          className="btn btn--block"
          onClick={() => {
            const next = makeRematch(session);
            upsertSession(next);
            close();
            props.onOpen(next.id);
          }}
        >
          Rematch with the same table
        </button>
        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => setDialog({ kind: 'confirmDelete' })}
        >
          Delete this game
        </button>
      </Sheet>

      {/* ------------------------------------------------------ rename -- */}
      <RenameSheet
        open={dialog.kind === 'rename'}
        value={session.name}
        onCancel={close}
        onSave={(name) => {
          save({ ...session, name });
          close();
        }}
      />

      {/* ---------------------------------------------------- settings -- */}
      <Sheet
        open={dialog.kind === 'settings'}
        title="Players & rules"
        subtitle="Changes apply from here on"
        onClose={close}
      >
        <PlayersForm
          players={session.players}
          onChange={(players) => save({ ...session, players })}
          onRemoveBlocked={(player) =>
            session.rounds.some((round) => {
              const value = round.scores[player.id];
              return value !== null && value !== undefined;
            })
          }
          onBlockedRemove={(player) =>
            toast(`${player.name} already has scores — clear their rounds first.`)
          }
        />
        <RulesForm
          settings={session.settings}
          players={session.players}
          firstDealerIndex={session.firstDealerIndex}
          onChange={(settings: GameSettings) => save({ ...session, settings })}
          onFirstDealerChange={(firstDealerIndex) => save({ ...session, firstDealerIndex })}
        />
      </Sheet>

      {/* -------------------------------------------------- player row -- */}
      <RenameSheet
        open={dialog.kind === 'player'}
        title={dialog.kind === 'player' ? `Rename ${dialog.player.name}` : 'Rename'}
        value={dialog.kind === 'player' ? dialog.player.name : ''}
        onCancel={close}
        onSave={(name) => {
          if (dialog.kind !== 'player') return;
          save({
            ...session,
            players: session.players.map((player) =>
              player.id === dialog.player.id ? { ...player, name } : player,
            ),
          });
          close();
        }}
      />

      {/* ---------------------------------------------------- confirms -- */}
      <ConfirmSheet
        open={dialog.kind === 'confirmUndo'}
        title={`Undo the last ${unit.toLowerCase()}?`}
        message={`${unit} ${session.rounds.length} will be removed and everyone's total goes back.`}
        confirmLabel="Undo it"
        destructive
        onCancel={close}
        onConfirm={() => {
          const last = session.rounds.at(-1);
          if (last) save(removeRound(session, last.id));
          close();
        }}
      />

      <ConfirmSheet
        open={dialog.kind === 'confirmEnd'}
        title="End the game here?"
        message={`${
          table.length > 0 ? listNames(table.filter((entry) => entry.rank === 1).map((entry) => entry.player)) : 'Nobody'
        } wins on the current totals. You can reopen the game afterwards.`}
        confirmLabel="End game"
        onCancel={close}
        onConfirm={() => {
          save(finishGame(session));
          close();
        }}
      />

      <ConfirmSheet
        open={dialog.kind === 'confirmDelete'}
        title="Delete this game?"
        message={`${session.name} and its ${pluralize(
          session.rounds.length,
          unit.toLowerCase(),
        )} will be gone for good.`}
        confirmLabel="Delete"
        destructive
        onCancel={close}
        onConfirm={() => {
          deleteSession(session.id);
          props.onBack();
        }}
      />
    </>
  );
}

function RenameSheet(props: {
  open: boolean;
  title?: string;
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.value);
  // Re-seed whenever the sheet is opened for a different subject.
  const [seed, setSeed] = useState(props.value);
  if (props.open && seed !== props.value) {
    setSeed(props.value);
    setDraft(props.value);
  }

  return (
    <Sheet open={props.open} title={props.title ?? 'Rename game'} onClose={props.onCancel}>
      <Field label="Name">
        <input
          className="input"
          type="text"
          value={draft}
          maxLength={60}
          aria-label="Name"
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
        />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn--ghost btn--grow" onClick={props.onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary btn--grow"
          disabled={draft.trim().length === 0}
          onClick={() => props.onSave(draft.trim())}
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}

function blankScores(players: Player[]): DraftScores {
  const scores: DraftScores = {};
  for (const player of players) scores[player.id] = null;
  return scores;
}

function describeRule(settings: GameSettings): string {
  if (settings.endCondition.type === 'rounds') {
    return `${settings.endCondition.rounds} ${settings.roundLabel.toLowerCase()}s`;
  }
  if (settings.endCondition.type === 'target') {
    return `${settings.endCondition.comparison === 'atLeast' ? 'to' : 'down to'} ${
      settings.endCondition.target
    }`;
  }
  return settings.direction === 'high' ? 'highest wins' : 'lowest wins';
}
