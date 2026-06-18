import { describe, expect, it } from 'vitest';
import { LAUNCH_LOC } from '../src/game/constants';
import { defaultState } from '../src/game/state';
import {
  assessNeeds,
  kickLocHelp,
  moveHelps,
  promptManualDecay,
  scoreMove,
  WEIGHTS_HYGIENE,
  WEIGHTS_LOC,
  WEIGHTS_PROGRESS,
} from '../src/game/moveIntent';
import type { Move } from '../src/game/availability';

function actionMove(id: string): Move {
  return {
    id,
    kind: 'action',
    actionId: id,
    visible: true,
    legal: true,
    waitMs: 0,
    apply: (s) => s,
  };
}

describe('assessNeeds', () => {
  it('raises token pressure when tokens are low', () => {
    const state = defaultState();
    state.tokens = 5;
    state.minTokensSeen = 5;
    state.totalLoc = 5000;
    const needs = assessNeeds(state, 0);
    expect(needs.tokens).toBeGreaterThan(0.5);
  });

  it('raises bugs pressure when many bugs', () => {
    const state = defaultState();
    state.bugs = 30;
    state.totalLoc = 5000;
    const needs = assessNeeds(state, 0);
    expect(needs.bugs).toBeGreaterThan(0.4);
  });
});

describe('scoreMove', () => {
  it('prefers clear_context when tokens are urgent', () => {
    const state = defaultState();
    state.launched = true;
    state.tokens = 8;
    state.minTokensSeen = 8;
    state.loc = 50_000;
    state.totalLoc = 50_000;
    const needs = assessNeeds(state, 0);
    expect(needs.tokens).toBeGreaterThan(needs.loc);
    const clear = scoreMove(actionMove('clear_context'), needs, WEIGHTS_LOC);
    const prompt = scoreMove(actionMove('prompt'), needs, WEIGHTS_LOC, 0, state, 0);
    expect(clear).toBeGreaterThan(prompt);
  });

  it('scores kick_agent at least as high as prompt when racing to launch', () => {
    const state = defaultState();
    state.totalLoc = 7500;
    state.loc = 2000;
    state.tokens = 120;
    state.upgrades = ['model_update_1'];
    state.totalClicks = 20;
    state.started = true;
    const needs = assessNeeds(state, 0);
    expect(kickLocHelp(state, 0)).toBeGreaterThan(0.5);
    const kick = scoreMove(actionMove('kick_agent'), needs, WEIGHTS_PROGRESS, 0, state, 0);
    const prompt = scoreMove(actionMove('prompt'), needs, WEIGHTS_PROGRESS, 0, state, 0);
    expect(kick).toBeGreaterThanOrEqual(prompt);
  });

  it('prefers run_tests over prompt when bugs are high', () => {
    const state = defaultState();
    state.bugs = 25;
    state.tests = 5;
    state.totalLoc = 8000;
    state.tokens = 80;
    const needs = assessNeeds(state, 0);
    const tests = scoreMove(actionMove('run_tests'), needs, WEIGHTS_HYGIENE);
    const prompt = scoreMove(actionMove('prompt'), needs, WEIGHTS_HYGIENE);
    expect(tests).toBeGreaterThan(prompt);
  });

  it('prefers bug fixes over kick when launch is blocked by reliability', () => {
    const state = defaultState();
    state.totalLoc = LAUNCH_LOC;
    state.loc = 5000;
    state.tokens = 120;
    state.bugs = 205;
    state.tests = 5;
    state.upgrades = ['model_update_1'];
    state.totalClicks = 20;
    state.started = true;
    const needs = assessNeeds(state, 0);
    expect(needs.launch).toBe(0);
    expect(needs.bugs).toBeGreaterThan(0.85);
    const tests = scoreMove(actionMove('run_tests'), needs, WEIGHTS_PROGRESS, 0, state, 0);
    const kick = scoreMove(actionMove('kick_agent'), needs, WEIGHTS_PROGRESS, 0, state, 0);
    expect(tests).toBeGreaterThan(kick);
  });
});

describe('moveHelps', () => {
  it('tags token and bug actions', () => {
    const buyAccount: Move = {
      id: 'buy_gen:opengpt',
      kind: 'buy_gen',
      target: 'opengpt',
      visible: true,
      gates: [],
      legal: true,
      affordProgress: 1,
      cooldownProgress: 1,
      waitMs: 0,
      apply: (s) => s,
    };
    expect(moveHelps(buyAccount).tokens).toBe(0.7);
    expect(moveHelps(actionMove('write_test')).tests).toBe(1);
  });

  it('decays prompt value after launch and passive upgrades', () => {
    const preLaunch = defaultState();
    preLaunch.totalLoc = 9000;
    const postLaunch = defaultState();
    postLaunch.totalLoc = 45_000;
    postLaunch.launched = true;
    postLaunch.mcMinis = 3;
    postLaunch.upgrades = ['chat_loop', 'cot'];
    expect(promptManualDecay(preLaunch)).toBe(1);
    expect(promptManualDecay(postLaunch)).toBeLessThan(0.35);
    expect(moveHelps(actionMove('prompt'), postLaunch).loc).toBeLessThan(
      moveHelps(actionMove('prompt'), preLaunch).loc ?? 0,
    );
  });
});
