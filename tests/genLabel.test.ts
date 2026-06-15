import { describe, expect, it } from 'vitest';
import { GENS } from '../src/game/data';
import { formatGenMechanics, genTooltip } from '../src/lib/genLabel';

describe('genLabel', () => {
  it('formatGenMechanics lists only generator-owned rates', () => {
    const copilot = GENS.find((g) => g.id === 'copilot')!;
    expect(formatGenMechanics(copilot)).toBe('30/s LOC · 0.15/s bugs');

    const claude = GENS.find((g) => g.id === 'claude')!;
    expect(formatGenMechanics(claude)).toBe('250/s LOC · 0.8/s bugs · 0.3/s fixes');
  });

  it('genTooltip separates mechanics from tagline', () => {
    const copilot = GENS.find((g) => g.id === 'copilot')!;
    expect(genTooltip(copilot)).toContain('Meet CodePilot');
    expect(genTooltip(copilot)).toMatch(/^30\/s LOC/);
  });

  it('generator taglines avoid implying separate game systems', () => {
    const banned = /\b(expired trial|rate limit|200K|billing dashboard|computer use|\d+ sub-agents)\b/i;
    for (const g of GENS) {
      expect(g.desc, g.id).not.toMatch(banned);
    }
  });
});
