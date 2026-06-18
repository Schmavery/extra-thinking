import { describe, expect, it } from 'vitest';
import { calcDebugBugGainForLoc, calcPromptBugGain, calcRates } from '../src/game/rates';
import { THRESHOLDS } from '../src/game/constants';
import { defaultState } from '../src/game/state';
import { addDebugLocAction } from '../src/game/debugActions';

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

describe('calcDebugBugGainForLoc', () => {
  it('matches prompt ratio when harness output exists', () => {
    const state = {
      ...defaultState(),
      totalLoc: 1000,
      upgrades: ['autocomplete'],
    };
    const locGain = 500;
    expect(calcDebugBugGainForLoc(state, locGain, THRESHOLDS)).toBeCloseTo(
      calcPromptBugGain(state, locGain, THRESHOLDS, () => 0),
      8,
    );
  });

  it('scales promptBugChance across bulk gain without harness', () => {
    const state = { ...defaultState(), totalLoc: 200 };
    expect(calcDebugBugGainForLoc(state, 100, THRESHOLDS)).toBeCloseTo(
      100 * THRESHOLDS.promptBugChance,
      8,
    );
  });
});

describe('addDebugLocAction', () => {
  it('grants LOC and bugs together', () => {
    const prev = { ...defaultState(), totalLoc: 1000, upgrades: ['autocomplete'] };
    const next = addDebugLocAction(prev, 250);
    expect(next.totalLoc).toBe(prev.totalLoc + 250);
    expect(next.loc).toBe(prev.loc + 250);
    expect(next.bugs).toBeGreaterThan(prev.bugs);
  });
});
