import type { GameRules } from '../lib/rules';
import { Sheet } from './ui';

/** The printed rules for a preset, readable mid-game without leaving the table. */
export function HowToPlaySheet(props: {
  open: boolean;
  name: string;
  rules: GameRules | null;
  onClose: () => void;
}) {
  const { rules } = props;
  return (
    <Sheet
      open={props.open && rules !== null}
      title={`How to play ${props.name}`}
      subtitle={rules?.needs}
      onClose={props.onClose}
    >
      {rules ? (
        <div className="rules selectable">
          <p className="rules__goal">{rules.goal}</p>
          {rules.sections.map((section) => (
            <section key={section.heading}>
              <div className="section-title">{section.heading}</div>
              <ul className="rules__list">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
          <p className="hint">Common rules — house rules vary. Scoring is editable under the game’s rules.</p>
        </div>
      ) : null}
    </Sheet>
  );
}
