import type { GameState } from '../types';
import { render } from '../lib/template';
import { action, MILESTONES } from './data';
import { TICK_MS } from './constants';
import { calcPromptCooldownMs } from './rates';
import { computeEntryStreamMs, computeTextStreamMs } from './streamSchedule';

export function scriptedPromptCount(): number {
  return action('prompt').earlyPromptMsgs?.length ?? 0;
}

/** True while cycling through `earlyPromptMsgs`. */
export function inEarlyPromptScript(state: GameState): boolean {
  return state.totalClicks < scriptedPromptCount();
}

/** Stream playback ms for the opening beat plus the loc-10 milestone on the next tick. */
export function firstPromptStreamMs(): number {
  const source = action('prompt').earlyPromptMsgs?.[0];
  if (!source) return calcPromptCooldownMs([]);

  const beatMs = computeTextStreamMs(render(source), 'info');
  const m = MILESTONES[0];
  const milestoneMs = m
    ? computeEntryStreamMs(render(m.text, { loc: m.loc }), 'milestone', false)
    : 0;
  // Milestone log appends on the next tick after the prompt grants enough totalLoc.
  return beatMs + TICK_MS + milestoneMs;
}

/** Cooldown applied when firing the prompt at `clickIndex` (pre-increment `totalClicks`). */
export function promptCooldownForClick(clickIndex: number, upgrades: string[]): number {
  if (clickIndex === 0) return firstPromptStreamMs();
  return calcPromptCooldownMs(upgrades);
}

/** Cooldown duration for the in-flight prompt gate. */
export function activePromptCooldownMs(state: GameState): number {
  if (state.totalClicks === 1) return firstPromptStreamMs();
  return calcPromptCooldownMs(state.upgrades);
}
