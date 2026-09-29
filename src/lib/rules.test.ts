import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets';
import { GAME_RULES, rulesFor } from './rules';

describe('how-to-play rules', () => {
  it('covers every preset except the blank custom game', () => {
    for (const preset of PRESETS) {
      if (preset.id === 'custom') expect(rulesFor(preset.id)).toBeNull();
      else expect(rulesFor(preset.id), preset.id).not.toBeNull();
    }
  });

  it('has no rules for a game that is not a preset', () => {
    const ids = new Set(PRESETS.map((preset) => preset.id));
    for (const id of Object.keys(GAME_RULES)) expect(ids.has(id), id).toBe(true);
  });

  it('gives every game a goal and at least one section with points', () => {
    for (const rules of Object.values(GAME_RULES)) {
      expect(rules.goal.length).toBeGreaterThan(0);
      expect(rules.sections.length).toBeGreaterThan(0);
      for (const section of rules.sections) expect(section.points.length).toBeGreaterThan(0);
    }
  });
});
