import { afterEach, describe, expect, it } from 'vitest';
import { THRESHOLDS } from '../src/game/constants';
import { getMove } from '../src/game/availability';
import { defaultState } from '../src/game/state';
import { applyPreset } from '../src/debug/saveTools';
import {
  captureLaunchReadyProgress,
  resetLaunchReadyCache,
} from '../src/debug/launchReadyState';
import { Sim } from '../src/sim/Sim';

afterEach(() => {
  Sim.teardown();
  resetLaunchReadyCache();
});

describe('jump_launch preset', () => {
  it('shows Free Account (totalTokensSpent gate)', () => {
    const state = applyPreset('jump_launch', defaultState())!;
    expect(state.totalTokensSpent).toBeGreaterThanOrEqual(
      THRESHOLDS.showNewFreeAccountTokens,
    );
    const freeAcct = getMove(state, 'new_free_account', 0);
    expect(freeAcct?.visible).toBe(true);
  });

  it('matches progress-bot wallet and fleet at launch readiness', () => {
    const bot = captureLaunchReadyProgress();
    const state = applyPreset('jump_launch', defaultState())!;

    expect(state.upgrades).toEqual(
      expect.arrayContaining(['model_update_1', 'fix_bug_skill', 'subagent_harness']),
    );
    expect(state.genCounts.autocomplete).toBe(bot.genCounts?.autocomplete);
    expect(state.freeAccounts).toBe(bot.freeAccounts);
    expect(state.totalClicks).toBe(bot.totalClicks);
    expect(state.loc).toBeCloseTo(bot.loc ?? 0, 0);
    expect(state.launched).toBe(false);
    expect(state.totalLoc).toBeGreaterThanOrEqual(10_000);
  });
});
