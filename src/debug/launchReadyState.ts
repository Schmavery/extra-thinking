import { LAUNCH_LOC } from '../game/constants';
import { DEBUG_BOTS, type DebugBotId } from '../sim/bots';
import { Sim } from '../sim/Sim';
import type { GameState } from '../types';

/** Default trace column — adaptive progress bot with 30s patience. */
export const LAUNCH_READY_BOT: DebugBotId = 'progress_30s';
export const LAUNCH_READY_SEED = 42;

const PROGRESS_FIELDS = [
  'loc',
  'totalLoc',
  'accountCounts',
  'totalTokensSpent',
  'totalClicks',
  'tokens',
  'minTokensSeen',
  'bugs',
  'lifetimeBugs',
  'tests',
  'actionCooldowns',
  'actionsIntroduced',
  'upgrades',
] as const satisfies readonly (keyof GameState)[];

function pickProgressFields(state: GameState): Partial<GameState> {
  const out: Partial<GameState> = {};
  for (const key of PROGRESS_FIELDS) {
    const v = state[key];
    if (v === undefined) continue;
    if (key === 'accountCounts' || key === 'actionCooldowns') {
      out[key] = { ...(v as Record<string, number>) };
    } else if (key === 'actionsIntroduced' || key === 'upgrades') {
      out[key] = [...(v as string[])];
    } else {
      (out as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

let cached: Partial<GameState> | null = null;

/**
 * Snapshot progression fields from a bot run stopped at launch readiness
 * (`totalLoc >= LAUNCH_LOC`, not yet launched). Cached — deterministic for a
 * fixed bot + seed.
 */
export function captureLaunchReadyProgress(
  botId: DebugBotId = LAUNCH_READY_BOT,
  seed: number = LAUNCH_READY_SEED,
): Partial<GameState> {
  if (cached && botId === LAUNCH_READY_BOT && seed === LAUNCH_READY_SEED) {
    return {
      ...cached,
      accountCounts: { ...cached.accountCounts },
      actionCooldowns: { ...cached.actionCooldowns },
      upgrades: [...(cached.upgrades ?? [])],
    };
  }

  const bot = DEBUG_BOTS[botId].make(seed);
  const sim = new Sim({ seed });
  try {
    sim.runEventDriven(bot, 10 * 3600000, {
      stopWhen: (s) => !s.launched && s.totalLoc >= LAUNCH_LOC,
    });
    const picked = pickProgressFields(sim.state);
    picked.totalLoc = Math.max(picked.totalLoc ?? 0, LAUNCH_LOC);
    if (botId === LAUNCH_READY_BOT && seed === LAUNCH_READY_SEED) {
      cached = picked;
    }
    return {
      ...picked,
      accountCounts: { ...picked.accountCounts },
      actionCooldowns: { ...picked.actionCooldowns },
      upgrades: [...(picked.upgrades ?? [])],
    };
  } finally {
    Sim.teardown();
  }
}

/** Reset cached snapshot (tests only). */
export function resetLaunchReadyCache(): void {
  cached = null;
}
