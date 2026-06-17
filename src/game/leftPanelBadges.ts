/**
 * Tab alert badges for the agent-dashboard left panel (variant E semantics).
 */

import { ACCOUNTS, UPGRADES } from './data';
import { THRESHOLDS } from './constants';
import type { DerivedGame } from './derive';
import { getMove } from './availability';
import { idleMcMinis } from './investor';
import { calcUptime, canStackAccounts } from './rates';
import type { GameState } from '../types';

export type LowerTab = 'status' | 'fleet' | 'accounts' | 'upgrades';

export type LowerTabBadge = { kind: 'urgent' } | { kind: 'count'; n: number };

export function lowerTabBadges(
  state: GameState,
  derived: DerivedGame,
  fundingRoundOpen: boolean,
  now = Date.now(),
): Partial<Record<LowerTab, LowerTabBadge>> {
  const { ui } = derived;
  const out: Partial<Record<LowerTab, LowerTabBadge>> = {};

  if (state.started) {
    const { nines } = calcUptime(state.bugs);
    if (ui.showUptime && !ui.ninesTracking && nines < THRESHOLDS.warnUptimeFireNines) {
      out.status = { kind: 'urgent' };
    }
  }

  if (ui.showGenSection) {
    let accountsCount = 0;
    const canStack = canStackAccounts(state.upgrades);
    for (const a of ACCOUNTS) {
      const owned = state.accountCounts[a.id] ?? 0;
      const move = getMove(state, `buy_gen:${a.id}`, now);
      if (move?.visible && move.legal && (owned === 0 || canStack)) accountsCount += 1;
    }
    if (accountsCount > 0) out.accounts = { kind: 'count', n: accountsCount };
  }

  if (ui.showMcMinis) {
    const mcMinis = state.mcMinis ?? 0;
    const lanes = state.mcMiniLanes ?? { code: 0, growth: 0, tests: 0 };
    const idle = idleMcMinis(mcMinis, lanes);
    if (idle > 0) out.fleet = { kind: 'count', n: idle };
  }

  if (ui.showUpgSection || fundingRoundOpen) {
    const affordableUpgrade = UPGRADES.some((u) => {
      const move = getMove(state, `buy_upgrade:${u.id}`, now);
      return move?.visible && move.legal;
    });
    const raiseMove = getMove(state, 'raise_round', now);
    const raiseReady = raiseMove?.visible && raiseMove.legal;
    if (affordableUpgrade || raiseReady) out.upgrades = { kind: 'urgent' };
  }

  return out;
}
