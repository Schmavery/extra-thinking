import type { GameState } from '../types';
import { withBugs } from './state';
import { effectiveThresholds } from './flags';
import { calcDebugBugGainForLoc } from './rates';
import { applyProgressThresholds } from './tick';

/** Dev-only: grant LOC and matching bugs without spending tokens or cooldowns. */
export function addDebugLocAction(prev: GameState, amount: number): GameState {
  const locGain = Math.floor(amount);
  if (!Number.isFinite(locGain) || locGain <= 0) return prev;

  const thresholds = effectiveThresholds(prev.upgrades);
  const bugGain = calcDebugBugGainForLoc(prev, locGain, thresholds);

  const next: GameState = {
    ...prev,
    started: true,
    loc: prev.loc + locGain,
    totalLoc: prev.totalLoc + locGain,
    ...withBugs(prev, prev.bugs + bugGain),
  };

  return applyProgressThresholds(prev, next);
}
