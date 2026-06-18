import { describe, expect, it } from 'vitest';
import { deriveGame } from '../src/game/derive';
import { THRESHOLDS, TOKENS } from '../src/game/constants';
import { defaultState } from '../src/game/state';

describe('derive: showTokens', () => {
  it('hides tokens until minTokensSeen drops to the reveal threshold', () => {
    const state = defaultState();
    expect(deriveGame(state).ui.showTokens).toBe(false);

    state.minTokensSeen = TOKENS.showMinTokensSeen + 1;
    expect(deriveGame(state).ui.showTokens).toBe(false);

    state.minTokensSeen = TOKENS.showMinTokensSeen;
    expect(deriveGame(state).ui.showTokens).toBe(false);

    state.minTokensSeen = TOKENS.showMinTokensSeen - 1;
    expect(deriveGame(state).ui.showTokens).toBe(true);
  });
});

describe('derive: hygiene action visibility', () => {
  it('hides fix-bug once write test unlocks', () => {
    const state = defaultState();
    state.lifetimeBugs = THRESHOLDS.showPasteErrorBugs;
    state.bugs = 10;
    const early = deriveGame(state).ui;
    expect(early.showPasteError).toBe(true);
    expect(early.showWriteTests).toBe(false);

    state.bugs = THRESHOLDS.showWriteTestsBugs;
    state.totalLoc = THRESHOLDS.showWriteTestsMinLoc;
    const testsEra = deriveGame(state).ui;
    expect(testsEra.showPasteError).toBe(false);
    expect(testsEra.showWriteTests).toBe(true);
  });

  it('hides manual test actions once McMinis are granted', () => {
    const state = defaultState();
    state.lifetimeBugs = THRESHOLDS.showWriteTestsBugs;
    state.bugs = THRESHOLDS.showWriteTestsBugs;
    state.totalLoc = THRESHOLDS.showWriteTestsMinLoc;
    state.tests = THRESHOLDS.showRunTestsTests;
    state.totalLoc = THRESHOLDS.showClearContextLoc;
    state.minTokensSeen = 0;
    const before = deriveGame(state).ui;
    expect(before.showPasteError).toBe(false);
    expect(before.showWriteTests).toBe(true);
    expect(before.showRunTests).toBe(true);
    expect(before.showClearContext).toBe(true);

    state.mcMinis = 3;
    const after = deriveGame(state).ui;
    expect(after.showPasteError).toBe(false);
    expect(after.showWriteTests).toBe(false);
    expect(after.showRunTests).toBe(false);
    expect(after.showClearContext).toBe(false);
    expect(after.showMcMinis).toBe(true);
  });

  it('hides run tests once post-tool hook is owned', () => {
    const state = defaultState();
    state.tests = THRESHOLDS.showRunTestsTests;
    expect(deriveGame(state).ui.showRunTests).toBe(true);
    state.upgrades = ['cicd'];
    expect(deriveGame(state).ui.showRunTests).toBe(false);
  });

  it('gates lobstagram post behind the account upgrade', () => {
    const state = defaultState();
    state.launched = true;
    state.totalLoc = 25_000;
    expect(deriveGame(state).ui.showLobstagramPost).toBe(false);

    state.upgrades = ['lobstagram_account'];
    expect(deriveGame(state).ui.showLobstagramPost).toBe(true);
  });

  it('keeps write test hidden until minLoc even with enough bugs', () => {
    const state = defaultState();
    state.bugs = THRESHOLDS.showWriteTestsBugs;
    state.lifetimeBugs = THRESHOLDS.showWriteTestsBugs;
    state.totalLoc = THRESHOLDS.showWriteTestsMinLoc - 500;
    expect(deriveGame(state).ui.showWriteTests).toBe(false);
    expect(deriveGame(state).ui.showPasteError).toBe(true);
  });
});
