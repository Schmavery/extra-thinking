/**
 * Single place to derive flags, effective UI thresholds, and visibility rules
 * from raw `GameState`. Components import `deriveGame(state)` instead of
 * re-deriving ad hoc.
 */

import type { GameState } from '../types';
import { LAUNCH_LOC, TOKENS, INVESTOR } from './constants';
import { calcInfraBurnPerSec, calcTokenConfig, hasProPlan } from './rates';
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
  /** Post on Lobstagram action — requires `lobstagram_account` upgrade. */
  showLobstagramPost: boolean;
  /** Buzz meter (and raise row) in the resource panel. */
  showInvestorHud: boolean;
  /** Burn rate row — only once a sub tier is paying. */
  showBurnRate: boolean;
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
  const fleetEra = (state.mcMinis ?? 0) > 0;
  const hasCicd = state.upgrades.includes('cicd');
  const writeTestsUnlocked =
    !flag('ai_review') &&
    ((state.tests ?? 0) > 0 ||
      (state.bugs >= thresholds.showWriteTestsBugs &&
        state.totalLoc >= thresholds.showWriteTestsMinLoc));

  const ui: DerivedUi = {
    showTokens: (state.minTokensSeen ?? TOKENS.baseMax) < TOKENS.showMinTokensSeen,
    showPasteError:
      (state.lifetimeBugs ?? 0) >= thresholds.showPasteErrorBugs &&
      !writeTestsUnlocked &&
      !fleetEra,
    showWriteTests: writeTestsUnlocked && !fleetEra,
    showRunTests:
      (state.tests ?? 0) >= thresholds.showRunTestsTests &&
      !flag('ai_review') &&
      !hasCicd &&
      !fleetEra,
    showClearContext:
      ((state.minTokensSeen ?? 9999) < thresholds.showClearContextMinTokens ||
        state.totalLoc >= thresholds.showClearContextLoc) &&
      !fleetEra,
    showLaunchBtn: state.totalLoc >= LAUNCH_LOC && !state.launched,
    showMcpApproval: mcpApprovalPending(state),
    showBugBounty:
      flag('nines_tracking') &&
      state.bugs > thresholds.showBugBountyBugs &&
      !flag('auto_bug_bounty'),
    showInvestor: state.launched,
    showLobstagramPost: state.launched && flag('lobstagram'),
    showBurnRate: hasProPlan(state.upgrades) && calcInfraBurnPerSec(state) > 0,
    showInvestorHud:
      state.launched &&
      ((state.buzzMeter ?? 0) > 0 ||
        (state.fundingRound ?? 0) > 0 ||
        (state.mcMinis ?? 0) > 0),
    showRaiseRound:
      state.launched &&
      ((state.buzzMeter ?? 0) > 0 ||
        (state.fundingRound ?? 0) > 0 ||
        (state.mcMinis ?? 0) > 0),
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
