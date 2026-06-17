import type { GameState } from '../types';
import { SAVE_KEY } from './constants';
import { EMPTY_MC_MINI_LANES, normalizeMcMiniLanes } from './investor';
import { STARTUP_MILESTONE_LOC } from './milestones';
import { stateForPersist } from './log';
import { clearSaveStorage, writeSaveWithMeta, type SaveSource } from './saveSync';

const HARNESS_FROM_OLD_GEN: Record<string, string> = {
  autocomplete: 'autocomplete',
  api: 'direct_api',
  agent: 'agent_runtime',
  swarm: 'swarm_orchestrator',
};

const ACCOUNT_FROM_OLD_GEN: Record<string, string> = {
  copilot: 'codepilot',
  chatgpt: 'opengpt',
  claude: 'claudius',
};

/** Map legacy saves (`genCounts`, `freeAccounts`) onto accounts + harness upgrades. */
export function migrateLoadedState(parsed: Partial<GameState>): Partial<GameState> {
  const accountCounts: Record<string, number> = { ...(parsed.accountCounts ?? {}) };
  const upgrades = [...(parsed.upgrades ?? [])];

  for (const [oldId, count] of Object.entries(parsed.genCounts ?? {})) {
    const harnessId = HARNESS_FROM_OLD_GEN[oldId];
    if (harnessId && count > 0 && !upgrades.includes(harnessId)) {
      upgrades.push(harnessId);
    }
    const accountId = ACCOUNT_FROM_OLD_GEN[oldId];
    if (accountId && count > 0) {
      accountCounts[accountId] = Math.max(accountCounts[accountId] ?? 0, count);
    }
  }

  const freeAccounts = parsed.freeAccounts ?? 1;
  if (freeAccounts > 1) {
    const extra = freeAccounts - 1;
    const target =
      (accountCounts.opengpt ?? 0) > 0
        ? 'opengpt'
        : (accountCounts.codepilot ?? 0) > 0
          ? 'codepilot'
          : (accountCounts.claudius ?? 0) > 0
            ? 'claudius'
            : 'opengpt';
    accountCounts[target] = (accountCounts[target] ?? 0) + extra;
  }

  return { accountCounts, upgrades };
}

function migrateBugFixLogTime(parsed: Partial<GameState>): Pick<GameState, 'lastBugFixLogTime'> {
  const legacy = (parsed as { lastTestLogTime?: number }).lastTestLogTime;
  return { lastBugFixLogTime: parsed.lastBugFixLogTime ?? legacy ?? 0 };
}

/** Apply a bug count and accrue positive deltas into `lifetimeBugs`. */
export function withBugs(prev: GameState, bugs: number): Pick<GameState, 'bugs' | 'lifetimeBugs'> {
  const b = Math.max(0, bugs);
  const gained = Math.max(0, b - prev.bugs);
  return {
    bugs: b,
    lifetimeBugs: (prev.lifetimeBugs ?? 0) + gained,
  };
}

export function defaultState(): GameState {
  return {
    loc: 0,
    bugs: 0,
    lifetimeBugs: 0,
    totalLoc: 0,
    totalClicks: 0,
    accountCounts: {},
    upgrades: [],
    log: [],
    logId: 0,
    lastEventTime: 0,
    lastBugFixLogTime: 0,
    actionCooldowns: {},
    tests: 0,
    totalTokensSpent: 0,
    minTokensSeen: 9999,
    milestonesSeen: [],
    started: false,
    introSequenceComplete: false,
    launched: false,
    usedEventIds: [],
    usedNewsIds: [],
    actionsIntroduced: [],
    tokens: 120,
    buzzMeter: 0,
    lobstagramPosts: 0,
    fundingRound: 0,
    mcMinis: 0,
    mcMiniLanes: { ...EMPTY_MC_MINI_LANES },
    agentBuffExpires: 0,
    unlockedUpgrades: [],
    nines: 0,
    mcpApprovalPending: null,
    mcpAutoApproveAt: null,
    mcpExecutingUntil: null,
    mcpExecutingLine: null,
    mcpActiveToolId: null,
  };
}

export function initState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      const base = defaultState();
      const migrated = migrateLoadedState(parsed);
      const bugFixLog = migrateBugFixLogTime(parsed);
      const mcMinis = parsed.mcMinis ?? base.mcMinis;
      const milestonesSeen = Array.isArray(parsed.milestonesSeen)
        ? parsed.milestonesSeen
        : base.milestonesSeen;
      const totalLoc = parsed.totalLoc ?? base.totalLoc;
      return {
        ...base,
        ...parsed,
        ...migrated,
        ...bugFixLog,
        mcMinis,
        mcMiniLanes: normalizeMcMiniLanes(mcMinis, parsed.mcMiniLanes ?? base.mcMiniLanes),
        buzzMeter: parsed.buzzMeter ?? base.buzzMeter,
        lobstagramPosts: parsed.lobstagramPosts ?? base.lobstagramPosts,
        fundingRound: parsed.fundingRound ?? base.fundingRound,
        milestonesSeen,
        introSequenceComplete:
          parsed.introSequenceComplete ??
          (milestonesSeen.includes(STARTUP_MILESTONE_LOC) ||
            totalLoc >= STARTUP_MILESTONE_LOC),
        usedEventIds: Array.isArray(parsed.usedEventIds) ? parsed.usedEventIds : base.usedEventIds,
        usedNewsIds: Array.isArray(parsed.usedNewsIds) ? parsed.usedNewsIds : base.usedNewsIds,
        actionsIntroduced: Array.isArray(parsed.actionsIntroduced)
          ? parsed.actionsIntroduced
          : base.actionsIntroduced,
      };
    }
  } catch {
    // ignored — bad save data falls back to default state
  }
  return defaultState();
}

export function saveState(
  s: GameState,
  source: SaveSource = 'game',
  writerSessionId?: string | null,
): number {
  return writeSaveWithMeta(stateForPersist(s), source, writerSessionId);
}

export function clearSave(): void {
  clearSaveStorage();
}
