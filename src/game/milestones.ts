import type { GameState, LogEntry } from '../types';
import { isLogEntryFullyDisplayed } from '../lib/logQueue';
import { MAX_LOG } from './constants';
import { MILESTONES } from './data';
import { render } from '../lib/template';

export const STARTUP_MILESTONE_LOC = MILESTONES[0]?.loc ?? 10;

/** Milestone `loc` keys the player has passed at `totalLoc` (same rule as the tick loop). */
export function milestoneLocsReached(totalLoc: number): number[] {
  return MILESTONES.filter((m) => totalLoc >= m.loc).map((m) => m.loc);
}

/**
 * Mark all milestones at or below `totalLoc` as seen without appending log lines.
 * Marks milestones at or below `totalLoc` without log lines.
 */
export function syncMilestonesSeen(state: GameState): GameState {
  const reached = milestoneLocsReached(state.totalLoc);
  if (reached.length === 0) return state;

  const prevSet = new Set(state.milestonesSeen);
  const added = reached.filter((loc) => !prevSet.has(loc));
  if (added.length === 0) return state;

  const milestonesSeen = [...new Set([...state.milestonesSeen, ...reached])].sort(
    (a, b) => a - b,
  );
  return {
    ...state,
    milestonesSeen,
  };
}

/**
 * True once the loc-10 milestone has finished streaming (or is no longer in log).
 * Game.tsx sets `introSequenceComplete` when this flips true.
 */
export function shouldCompleteIntroSequence(
  state: Pick<GameState, 'introSequenceComplete' | 'milestonesSeen' | 'log'>,
  displayLog: LogEntry[],
): boolean {
  if (state.introSequenceComplete) return false;
  if (!state.milestonesSeen.includes(STARTUP_MILESTONE_LOC)) return false;
  const entry = state.log.find((e) => e.type === 'milestone');
  if (!entry) return true;
  return isLogEntryFullyDisplayed(entry.id, state.log, displayLog);
}

/**
 * After a dev fast-forward with an empty log, the game still expects a milestone
 * entry for the post-startup prompt label. Inserts the first milestone only.
 */
export function ensureStartupMilestoneLog(state: GameState): GameState {
  if (!state.milestonesSeen.includes(STARTUP_MILESTONE_LOC)) return state;
  if (state.log.some((e) => e.type === 'milestone')) return state;

  const m = MILESTONES[0];
  if (!m) return state;

  const entry: LogEntry = {
    id: state.logId + 1,
    text: render(m.text, { loc: m.loc }),
    type: 'milestone',
    streamMs: 0,
  };
  return {
    ...state,
    logId: entry.id,
    log: [...state.log, entry].slice(-MAX_LOG),
  };
}

/** Sync `milestonesSeen` from `totalLoc`, then seed startup log if needed. */
export function prepareSaveProgressMarkers(state: GameState): GameState {
  let next = ensureStartupMilestoneLog(syncMilestonesSeen(state));
  if (!next.introSequenceComplete && next.milestonesSeen.includes(STARTUP_MILESTONE_LOC)) {
    next = { ...next, introSequenceComplete: true };
  }
  return next;
}
