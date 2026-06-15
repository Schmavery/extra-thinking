/**
 * Single place to derive flags, effective UI thresholds, and visibility rules
 * from raw `GameState`. Components import `deriveGame(state)` instead of
 * re-deriving ad hoc.
 */

import type { GameState } from '../types';
import { LAUNCH_LOC, TOKENS } from './constants';
import { calcInfraBurnPerSec, calcTokenConfig } from './rates';
import { mcpApprovalPending } from './mcpApproval';
import {
  computeFlags,
  effectiveThresholds,
  hasFlag,
  type EffectiveThresholds,
  type GameFlag,
} from './flags';
export interface DerivedUi {
  showTokens: boolean;
  showWriteTests: boolean;
  showRunTests: boolean;
  showBugBounty: boolean;
  showInvestor: boolean;
  /** Burn rate + buzz meter in the resource panel. */
  showInvestorHud: boolean;
  /** Close-round row in the upgrades panel. */
  showRaiseRound: boolean;
  showMcMinis: boolean;
  ninesTracking: boolean;
  showBugs: boolean;
  showUptime: boolean;
  showLaunchBtn: boolean;
  showMcpApproval: boolean;
  showPasteError: boolean;
  showKickAgent: boolean;
  showClearContext: boolean;
  showGenSection: boolean;
  showUpgSection: boolean;
}

export interface DerivedGame {
  flags: ReadonlySet<GameFlag>;
  thresholds: EffectiveThresholds;
  hasFlag: (flag: GameFlag) => boolean;
  ui: DerivedUi;
}

export function deriveGame(state: GameState): DerivedGame {
  const flags = computeFlags(state.upgrades);
  const thresholds = effectiveThresholds(state.upgrades);
  const flag = (f: GameFlag) => hasFlag(flags, f);

  const { maxTokens } = calcTokenConfig(state.upgrades, state.freeAccounts);
  const tokenShowThreshold = maxTokens * TOKENS.showAtMaxFillFraction;

  const ui: DerivedUi = {
    showTokens: (state.minTokensSeen ?? maxTokens) <= tokenShowThreshold,
    showPasteError: (state.lifetimeBugs ?? 0) >= thresholds.showPasteErrorBugs,
    showWriteTests:
      (state.bugs >= thresholds.showWriteTestsBugs || (state.tests ?? 0) > 0) &&
      !flag('ai_review'),
    showRunTests:
      (state.tests ?? 0) >= thresholds.showRunTestsTests && !flag('ai_review'),
    showClearContext:
      (state.minTokensSeen ?? 9999) < thresholds.showClearContextMinTokens ||
      state.totalLoc >= thresholds.showClearContextLoc,
    showLaunchBtn: state.totalLoc >= LAUNCH_LOC && !state.launched,
    showMcpApproval: mcpApprovalPending(state),
    showBugBounty:
      flag('nines_tracking') &&
      state.bugs > thresholds.showBugBountyBugs &&
      !flag('auto_bug_bounty'),
    showInvestor: state.launched,
    showInvestorHud:
      state.launched &&
      ((state.buzzMeter ?? 0) > 0 ||
        calcInfraBurnPerSec(state.upgrades) > 0 ||
        (state.fundingRound ?? 0) > 0),
    showRaiseRound:
      state.launched &&
      ((state.buzzMeter ?? 0) > 0 ||
        calcInfraBurnPerSec(state.upgrades) > 0 ||
        (state.fundingRound ?? 0) > 0),
    showMcMinis: (state.mcMinis ?? 0) > 0,
    ninesTracking: flag('nines_tracking'),
    showBugs: (state.lifetimeBugs ?? 0) >= thresholds.showPasteErrorBugs,
    showUptime: state.launched,
    showKickAgent:
      state.totalClicks >= thresholds.showKickAgentClicks && (state.mcMinis ?? 0) === 0,
    showGenSection: state.totalLoc >= thresholds.showGeneratorsLoc,
    showUpgSection: state.totalLoc >= thresholds.showUpgradesLoc,
  };

  return {
    flags,
    thresholds,
    hasFlag: (f) => flag(f),
    ui,
  };
}
