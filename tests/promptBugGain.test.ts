import { describe, expect, it } from 'vitest';
import { calcPromptBugGain, calcRates } from '../src/game/rates';
import { THRESHOLDS } from '../src/game/constants';
import { defaultState } from '../src/game/state';

describe('calcPromptBugGain', () => {
  it('matches passive bug/loc ratio when harness output exists', () => {
    const state = {
      ...defaultState(),
      totalLoc: 1000,
      upgrades: ['autocomplete'],
    };
    const { locRate, bugRate } = calcRates(state.accountCounts, state.upgrades, 0);
    const locGain = 10;
    const expected = (bugRate / locRate) * locGain;

    expect(calcPromptBugGain(state, locGain, THRESHOLDS, () => 0)).toBeCloseTo(expected, 8);
    expect(expected).toBeLessThan(THRESHOLDS.promptBugChance);
  });

  it('uses promptBugChance fallback before passive loc exists', () => {
    const state = { ...defaultState(), totalLoc: 200 };
    expect(calcPromptBugGain(state, 10, THRESHOLDS, () => 0.9)).toBe(0);
    expect(calcPromptBugGain(state, 10, THRESHOLDS, () => 0.1)).toBe(1);
    expect(calcPromptBugGain(state, 10, THRESHOLDS, () => 0)).toBe(1);
  });

  it('returns zero below bugSpawnLoc', () => {
    const state = { ...defaultState(), totalLoc: 50, upgrades: ['autocomplete'] };
    expect(calcPromptBugGain(state, 10, THRESHOLDS, () => 0)).toBe(0);
  });
});
