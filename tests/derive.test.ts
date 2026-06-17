import { describe, expect, it } from 'vitest';
import { deriveGame } from '../src/game/derive';
import { TOKENS } from '../src/game/constants';
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
