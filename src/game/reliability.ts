/**
 * Reliability gates for milestone moves (launch, raise). Launch: bug cap only.
 * Raise: two nines from real bug load — launching at ~150 still blocks raises.
 */

import type { GameState } from '../types';
import { THRESHOLDS } from './constants';
import { calcUptime } from './rates';

/** Uptime nines from current bugs (empty prod counts as healthy). */
export function realUptimeNines(bugs: number): number {
  if (bugs <= 0) return THRESHOLDS.minUptimeNinesToRaise;
  return calcUptime(bugs).nines;
}

export function launchBlockReason(state: GameState): string | null {
  const bugs = state.bugs;
  const maxBugs = THRESHOLDS.maxBugsToLaunch;
  if (bugs > maxBugs) {
    return `too many bugs (${Math.floor(bugs)} open — need ≤${maxBugs})`;
  }
  return null;
}

export function raiseReliabilityBlockReason(state: GameState): string | null {
  const nines = realUptimeNines(state.bugs);
  if (nines < THRESHOLDS.warnUptimeFireNines) {
    return 'production is on fire — fix bugs first';
  }
  if (nines < THRESHOLDS.minUptimeNinesToRaise) {
    return 'reliability too low for investors — fix bugs first';
  }
  return null;
}

export function canLaunchWithReliability(state: GameState): boolean {
  return launchBlockReason(state) === null;
}

export function canRaiseWithReliability(state: GameState): boolean {
  return raiseReliabilityBlockReason(state) === null;
}
