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

export type LowerTab = 'status' | 'capacity' | 'shop' | 'stack';

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

  if (ui.showGenSection || ui.showMcMinis) {
    let capacityCount = 0;
    if (ui.showGenSection) {
      const canStack = canStackAccounts(state.upgrades);
      for (const a of ACCOUNTS) {
        const owned = state.accountCounts[a.id] ?? 0;
        const move = getMove(state, `buy_gen:${a.id}`, now);
        if (move?.visible && (owned === 0 || canStack)) capacityCount += 1;
      }
    }
    if (ui.showMcMinis) {
      const mcMinis = state.mcMinis ?? 0;
      const lanes = state.mcMiniLanes ?? { code: 0, growth: 0, tests: 0 };
      capacityCount += idleMcMinis(mcMinis, lanes);
    }
    if (capacityCount > 0) out.capacity = { kind: 'count', n: capacityCount };
  }

  if (ui.showUpgSection || fundingRoundOpen) {
    const affordableUpgrade = UPGRADES.some((u) => {
      const move = getMove(state, `buy_upgrade:${u.id}`, now);
      return move?.visible && move.legal;
    });
    const raiseMove = getMove(state, 'raise_round', now);
    const raiseReady = raiseMove?.visible && raiseMove.legal;
    if (affordableUpgrade || raiseReady) out.shop = { kind: 'urgent' };
  }

  return out;
}
