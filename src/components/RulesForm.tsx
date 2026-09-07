import type {
  DealPattern,
  EndConditionType,
  GameSettings,
  MissedBid,
  Player,
  TargetComparison,
} from '../types';
import { dealRoundCount, describeDeal } from '../lib/deal';
import { Field, Segmented, Stepper, SwitchRow, clamp } from './ui';

const ROUND_LABELS = ['Round', 'Hand', 'Deal', 'Turn', 'Hole', 'Leg', 'Frame'];

const DEAL_PATTERNS: Array<{ value: DealPattern; label: string }> = [
  { value: 'fixed', label: 'Same every hand' },
  { value: 'down', label: 'Down' },
  { value: 'up', label: 'Up' },
  { value: 'downUp', label: 'Down, then up' },
  { value: 'upDown', label: 'Up, then down' },
];

/**
 * The whole rule set for a game. Shared by new-game setup and the in-game
 * settings sheet, so anything you can choose up front you can also change
 * halfway through a game night.
 */
export function RulesForm(props: {
  settings: GameSettings;
  players: Player[];
  firstDealerIndex: number;
  onChange: (settings: GameSettings) => void;
  onFirstDealerChange: (index: number) => void;
}) {
  const { settings } = props;
  const patch = (changes: Partial<GameSettings>) => props.onChange({ ...settings, ...changes });
  const patchEnd = (changes: Partial<GameSettings['endCondition']>) =>
    patch({ endCondition: { ...settings.endCondition, ...changes } });
  const patchStakes = (changes: Partial<GameSettings['stakes']>) =>
    patch({ stakes: { ...settings.stakes, ...changes } });
  const patchBids = (changes: Partial<GameSettings['bidScoring']>) =>
    patch({ bidScoring: { ...settings.bidScoring, ...changes } });

  // The deal decides how many hands there are, so keep the two in step
  // instead of letting a stale round count contradict the pattern.
  const patchDeal = (changes: Partial<GameSettings['deal']>) => {
    const deal = { ...settings.deal, ...changes };
    const rounds = dealRoundCount(deal);
    patch({
      deal,
      endCondition:
        settings.endCondition.type === 'rounds' && rounds !== null
          ? { ...settings.endCondition, rounds }
          : settings.endCondition,
    });
  };

  const dealtRounds = dealRoundCount(settings.deal);

  // A worked example beats explaining the formula in prose.
  const example = {
    bid: 3,
    made: settings.bidScoring.exactBonus + settings.bidScoring.perTrickMade * 3,
    missBy: 2,
    penalty: settings.bidScoring.penaltyPerTrick,
  };

  const unit = settings.roundLabel.toLowerCase();

  return (
    <>
      <section className="card">
        <div className="section-title">Scoring</div>

        <Field label="Who wins">
          <Segmented
            ariaLabel="Who wins"
            value={settings.direction}
            onChange={(direction) => patch({ direction })}
            options={[
              { value: 'high', label: 'Highest score' },
              { value: 'low', label: 'Lowest score' },
            ]}
          />
        </Field>

        <Field label="Everyone starts on" hint="Usually 0. Set it higher for countdown games.">
          <Stepper
            ariaLabel="Starting score"
            value={settings.startingScore}
            onChange={(startingScore) => patch({ startingScore })}
            min={-100000}
            max={100000}
            step={stepFor(settings.startingScore)}
          />
        </Field>

        <Field label="What one entry is called">
          <input
            className="input"
            type="text"
            aria-label="What one entry is called"
            value={settings.roundLabel}
            maxLength={16}
            onChange={(event) => patch({ roundLabel: event.target.value })}
          />
        </Field>
        <div className="chiprow" style={{ marginTop: 8 }}>
          {ROUND_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className="chip"
              aria-pressed={settings.roundLabel === label}
              onClick={() => patch({ roundLabel: label })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-title">The deal</div>
        <div className="chiprow">
          {DEAL_PATTERNS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={settings.deal.pattern === option.value}
              onClick={() => patchDeal({ pattern: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
        {settings.deal.pattern === 'fixed' ? (
          <p className="hint">
            Every {unit} is the same size, so the app does not track how many cards are out.
          </p>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Field label="Biggest hand">
              <Stepper
                ariaLabel="Biggest hand dealt"
                value={settings.deal.maxCards}
                onChange={(maxCards) => patchDeal({ maxCards: clamp(maxCards, 1, 60) })}
                min={1}
                max={60}
              />
            </Field>
            <p className="hint">
              {describeDeal(settings.deal)}
              {dealtRounds !== null ? ` — ${dealtRounds} ${unit.toLowerCase()}s` : ''}
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-title">How it ends</div>
        <Segmented
          ariaLabel="How the game ends"
          value={settings.endCondition.type}
          onChange={(type: EndConditionType) => patchEnd({ type })}
          options={[
            { value: 'manual', label: 'We decide' },
            { value: 'rounds', label: 'Set count' },
            { value: 'target', label: 'Target' },
          ]}
        />

        {settings.endCondition.type === 'manual' ? (
          <p className="hint">
            Play as long as you like — end the game yourself from the game menu.
          </p>
        ) : null}

        {settings.endCondition.type === 'rounds' ? (
          <div style={{ marginTop: 12 }}>
            {dealtRounds === null ? (
              <Field label={`Number of ${unit}s`}>
                <Stepper
                  ariaLabel="Number of rounds"
                  value={settings.endCondition.rounds}
                  onChange={(rounds) => patchEnd({ rounds: clamp(rounds, 1, 200) })}
                  min={1}
                  max={200}
                />
              </Field>
            ) : (
              <p className="hint" style={{ marginTop: 0 }}>
                {dealtRounds} {unit.toLowerCase()}s — set by the deal above.
              </p>
            )}
          </div>
        ) : null}

        {settings.endCondition.type === 'target' ? (
          <div style={{ marginTop: 12 }}>
            <Field label="The game ends when a player">
              <Segmented
                ariaLabel="Target comparison"
                value={settings.endCondition.comparison}
                onChange={(comparison: TargetComparison) => patchEnd({ comparison })}
                options={[
                  { value: 'atLeast', label: 'Reaches' },
                  { value: 'atMost', label: 'Falls to' },
                ]}
              />
            </Field>
            <Field label="Target score">
              <Stepper
                ariaLabel="Target score"
                value={settings.endCondition.target}
                onChange={(target) => patchEnd({ target })}
                min={-100000}
                max={1000000}
                step={stepFor(settings.endCondition.target)}
              />
            </Field>
            <p className="hint">
              {settings.direction === 'high'
                ? 'Highest total at that point wins.'
                : 'Lowest total at that point wins — handy for games where hitting the target knocks you out.'}
            </p>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="section-title">Bidding</div>
        <SwitchRow
          title="Call your tricks"
          sub="Enter a bid and the tricks won; the points work themselves out."
          checked={settings.bidScoring.enabled}
          onChange={(enabled) => patchBids({ enabled })}
        />
        {settings.bidScoring.enabled ? (
          <div style={{ marginTop: 12 }}>
            <Field label="Points for calling it exactly">
              <Stepper
                ariaLabel="Bonus for an exact bid"
                value={settings.bidScoring.exactBonus}
                onChange={(exactBonus) => patchBids({ exactBonus })}
                min={0}
                max={1000}
              />
            </Field>
            <Field
              label="Plus, per trick won"
              hint={`Calling ${example.bid} and taking ${example.bid} is worth ${example.made}.`}
            >
              <Stepper
                ariaLabel="Points per trick when the bid is made"
                value={settings.bidScoring.perTrickMade}
                onChange={(perTrickMade) => patchBids({ perTrickMade })}
                min={0}
                max={1000}
              />
            </Field>
            <Field label="Miss your bid and you get">
              <Segmented
                ariaLabel="What a missed bid scores"
                value={settings.bidScoring.missed}
                onChange={(missed: MissedBid) => patchBids({ missed })}
                options={[
                  { value: 'nothing', label: 'Nothing' },
                  { value: 'tricks', label: 'Your tricks' },
                  { value: 'penalty', label: 'A penalty' },
                ]}
              />
            </Field>
            {settings.bidScoring.missed === 'penalty' ? (
              <Field
                label="Points off per trick over or under"
                hint={`Calling ${example.bid} and taking ${example.missBy} costs ${example.penalty}.`}
              >
                <Stepper
                  ariaLabel="Penalty per trick out"
                  value={settings.bidScoring.penaltyPerTrick}
                  onChange={(penaltyPerTrick) => patchBids({ penaltyPerTrick })}
                  min={0}
                  max={1000}
                />
              </Field>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="section-title">Pot</div>
        <SwitchRow
          title="Buy-in and pot"
          sub="Track what everyone put in and who takes it."
          checked={settings.stakes.enabled}
          onChange={(enabled) => patchStakes({ enabled })}
        />
        {settings.stakes.enabled ? (
          <div style={{ marginTop: 12 }}>
            <Field label="Currency symbol">
              <input
                className="input"
                type="text"
                aria-label="Currency symbol"
                maxLength={3}
                value={settings.stakes.currency}
                onChange={(event) => patchStakes({ currency: event.target.value })}
              />
            </Field>
            <Field label="Buy-in per player">
              <Stepper
                ariaLabel="Buy-in per player"
                value={settings.stakes.ante}
                onChange={(ante) => patchStakes({ ante })}
                min={0}
                max={100000}
              />
            </Field>
            <Field
              label={`Added to the pot each ${unit}, per player`}
              hint="Leave at 0 if the buy-in is the whole pot."
            >
              <Stepper
                ariaLabel="Per round contribution"
                value={settings.stakes.perRound}
                onChange={(perRound) => patchStakes({ perRound })}
                min={0}
                max={100000}
              />
            </Field>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="section-title">Table</div>
        {settings.bidScoring.enabled ? null : (
          <SwitchRow
            title="Allow negative scores"
            sub={`Show the ± key when entering a ${unit}.`}
            checked={settings.allowNegative}
            onChange={(allowNegative) => patch({ allowNegative })}
          />
        )}
        <SwitchRow
          title="Track the deal"
          sub="Show whose turn it is to deal and pass it along each round."
          checked={settings.trackDealer}
          onChange={(trackDealer) => patch({ trackDealer })}
        />
        {settings.trackDealer && props.players.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div className="label" style={{ marginBottom: 8 }}>
              First dealer
            </div>
            <div className="chiprow">
              {props.players.map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  className="chip"
                  aria-pressed={props.firstDealerIndex === index}
                  onClick={() => props.onFirstDealerChange(index)}
                >
                  {player.name || `Seat ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="section-title">Notes</div>
        <textarea
          className="input"
          aria-label="Notes"
          placeholder="House rules, who brought the snacks, anything you want to remember."
          value={settings.notes}
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </section>
    </>
  );
}

/** Bigger numbers deserve bigger nudges from the +/- buttons. */
function stepFor(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude >= 5000) return 500;
  if (magnitude >= 500) return 50;
  if (magnitude >= 100) return 10;
  return 1;
}
