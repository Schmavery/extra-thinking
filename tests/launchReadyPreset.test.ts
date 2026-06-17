import { afterEach, describe, expect, it } from 'vitest';
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
  it('shows service accounts in generators section', () => {
    const state = applyPreset('jump_launch', defaultState())!;
    const codepilot = getMove(state, 'buy_gen:codepilot', 0);
    expect(codepilot?.visible).toBe(true);
  });

  it('matches progress-bot wallet and fleet at launch readiness', () => {
    const bot = captureLaunchReadyProgress();
    const state = applyPreset('jump_launch', defaultState())!;

    expect(state.upgrades).toEqual(
      expect.arrayContaining(['model_update_1', 'fix_bug_skill', 'subagent_harness', 'autocomplete']),
    );
    expect(state.unlockedUpgrades).toEqual(bot.unlockedUpgrades);
    expect(state.unlockedUpgrades).not.toContain('cicd');
    expect(state.accountCounts).toEqual(bot.accountCounts);
    expect(state.totalClicks).toBe(bot.totalClicks);
    expect(state.loc).toBeCloseTo(bot.loc ?? 0, 0);
    expect(state.launched).toBe(false);
    expect(state.totalLoc).toBeGreaterThanOrEqual(10_000);
  });
});
