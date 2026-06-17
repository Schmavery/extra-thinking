import { describe, expect, it } from 'vitest';
import { defaultState } from '../src/game/state';
import { deriveGame } from '../src/game/derive';
import { lowerTabBadges } from '../src/game/leftPanelBadges';

describe('leftPanelBadges', () => {
  it('shop urgent when an affordable upgrade is visible', () => {
    const state = {
      ...defaultState(),
      started: true,
      launched: true,
      totalLoc: 50_000,
      loc: 20_000,
      unlockedUpgrades: ['model_update_1'],
      upgrades: [],
    };
    const derived = deriveGame(state);
    const badges = lowerTabBadges(state, derived, false, 0);
    expect(badges.shop).toEqual({ kind: 'urgent' });
  });

  it('status urgent when uptime is in fire band', () => {
    const state = {
      ...defaultState(),
      started: true,
      launched: true,
      bugs: 5000,
      upgrades: [],
    };
    const derived = deriveGame(state);
    const badges = lowerTabBadges(state, derived, false, 0);
    expect(badges.status).toEqual({ kind: 'urgent' });
  });
});
