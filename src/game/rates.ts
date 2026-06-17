/**
 * Pure rate / cost calculations. None of these touch React or persistence —
 * they take game state (or relevant slices of it) and return derived values.
 */

import { ACCOUNTS, UPGRADES } from './data';
import type { AccountDef, GameState, McMiniLanes, UpgDef } from '../types';
import {
  AGENT_BUFF,
  BUG_GENERATION,
  NEGLIGIBLE_RATE,
  PROMPT_EVENT,
  TOKENS,
  UPTIME,
} from './constants';
import { action } from './data';

// ─── helpers ───────────────────────────────────────────────────────────────

function ownedDefs(upgrades: string[]): UpgDef[] {
  return UPGRADES.filter((u) => upgrades.includes(u.id));
}

function ownedHarnesses(upgrades: string[]): UpgDef[] {
  return ownedDefs(upgrades).filter((u) => u.locPerSec !== undefined || (u.bugsPerSec ?? 0) > 0);
}

export function canStackAccounts(upgrades: string[]): boolean {
  return upgrades.includes('rotate_accounts');
}

/** Code machines running the harness: 1 pre-fleet, else boxes assigned to the code lane. */
export function calcCodeMachines(mcMinis: number, lanes: McMiniLanes): number {
  return mcMinis > 0 ? lanes.code : 1;
}

// ─── accounts / clicks ─────────────────────────────────────────────────────

export function accountCost(a: AccountDef, owned: number): number {
  return Math.ceil(a.baseCost * Math.pow(a.costMult, owned));
}

/** @deprecated Use `accountCost`. */
export const genCost = accountCost;

export function calcClickPower(upgrades: string[]): number {
  let mult = 1;
  for (const u of ownedDefs(upgrades)) if (u.clickMult) mult *= u.clickMult;
  return mult;
}

export function calcClickBonus(upgrades: string[]): number {
  let bonus = 0;
  for (const u of ownedDefs(upgrades)) if (u.clickBonus) bonus += u.clickBonus;
  return bonus;
}

export function calcPromptCooldownMs(upgrades: string[]): number {
  const base = action('prompt').cooldownMs ?? 4000;
  let cd = base;
  for (const u of ownedDefs(upgrades)) {
    if (u.promptCooldownMs != null) cd = Math.min(cd, u.promptCooldownMs);
  }
  return cd;
}

export function calcPromptEventProbability(
  baseProbability: number,
  clicksPastScripted: number,
): number {
  const { decayClicks } = PROMPT_EVENT;
  const t = Math.max(0, clicksPastScripted);
  if (t >= decayClicks) return baseProbability;
  return baseProbability + (1 - baseProbability) * ((decayClicks - t) / decayClicks);
}

export function calcAgentLocMult(upgrades: string[]): number {
  let mult = 1;
  for (const u of ownedDefs(upgrades)) if (u.agentLocMult !== undefined) mult = u.agentLocMult;
  return mult;
}

export function calcKickAgentLocPerSec(upgrades: string[]): number {
  let rate = AGENT_BUFF.locPerSec;
  for (const u of ownedDefs(upgrades)) {
    if (u.kickAgentLocPerSec) rate += u.kickAgentLocPerSec;
  }
  return snapRate(rate);
}

export function kickAgentBuffActive(
  state: Pick<GameState, 'agentBuffExpires' | 'mcMinis'>,
  t: number,
): boolean {
  return (state.mcMinis ?? 0) === 0 && t < (state.agentBuffExpires ?? 0);
}

export function calcKickAgentTokenCost(upgrades: string[]): number {
  const base = action('kick_agent').tokenCost ?? 0;
  let bonus = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.kickAgentTokenCostBonus) bonus += u.kickAgentTokenCostBonus;
  }
  return base + bonus;
}

export function calcRunTestsTokenCost(tests: number): number {
  if (tests <= 0) return 0;
  const perTest = action('run_tests').perTestTokenCost ?? 1;
  return tests * perTest;
}

export function calcLobstagramTokenCost(posts: number): number {
  const a = action('lobstagram_post');
  const base = (a.tokenCost ?? 0) * (a.tokenCostMult ?? 1);
  const step = a.tokenCostStep ?? 0;
  return base + posts * step;
}

export function calcPromptTokenCost(upgrades: string[]): number {
  const base = action('prompt').tokenCost ?? 0;
  let bonus = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.promptTokenCostBonus) bonus += u.promptTokenCostBonus;
  }
  return base + bonus;
}

export function calcPasteErrorTokenCost(upgrades: string[]): number {
  const base = action('paste_error').tokenCost ?? 0;
  let bonus = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.pasteErrorTokenCostBonus) bonus += u.pasteErrorTokenCostBonus;
  }
  return base + bonus;
}

export function calcPasteErrorFixChance(upgrades: string[]): number {
  const base = action('paste_error').fixChance ?? 0;
  let bonus = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.pasteErrorFixChanceBonus) bonus += u.pasteErrorFixChanceBonus;
  }
  return Math.min(1, base + bonus);
}

export function hasFixBugSkill(upgrades: string[]): boolean {
  return upgrades.includes('fix_bug_skill');
}

export function pasteErrorButtonLabel(upgrades: string[]): string {
  return hasFixBugSkill(upgrades) ? '/fix-bug' : 'paste the error';
}

export function formatPasteErrorLog(rendered: string, upgrades: string[], pasteMeta: string): string {
  let text = rendered;
  if (hasFixBugSkill(upgrades)) {
    text = text.replace(/^(>)( ?)([^\n]*)/, '$1 /fix-bug $3');
  }
  return text.replace(/^(>[^\n]*)/, `$1 ${pasteMeta}`);
}

// ─── rates ─────────────────────────────────────────────────────────────────

export function snapRate(rate: number): number {
  return Math.abs(rate) < NEGLIGIBLE_RATE ? 0 : rate;
}

export function calcTestFixRate(upgrades: string[]): number {
  let testFixRate = 0;
  for (const u of ownedDefs(upgrades)) if (u.testFixRate) testFixRate += u.testFixRate;
  return testFixRate;
}

function harnessLocPerUnit(harnessId: string, baseLocPerSec: number, upgrades: string[]): number {
  let mult = 1;
  let bonus = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.harnessLocMult?.[harnessId]) mult *= u.harnessLocMult[harnessId];
    if (u.harnessLocBonus?.[harnessId]) bonus += u.harnessLocBonus[harnessId];
    if (u.genLocMult?.[harnessId]) mult *= u.genLocMult[harnessId];
    if (u.genLocBonus?.[harnessId]) bonus += u.genLocBonus[harnessId];
  }
  return baseLocPerSec * mult + bonus;
}

/** Effective LOC/s from one owned harness (global/review/agent mults included). */
export function calcHarnessLocRate(harnessId: string, upgrades: string[]): number {
  const h = UPGRADES.find((x) => x.id === harnessId);
  if (!h?.locPerSec) return 0;
  let globalMult = 1;
  let reviewLocMult = 1;
  let agentMult = 1;
  for (const u of ownedDefs(upgrades)) {
    if (u.globalMult) globalMult *= u.globalMult;
    if (u.reviewLocMult !== undefined) reviewLocMult = u.reviewLocMult;
    if (u.agentLocMult !== undefined) agentMult = u.agentLocMult;
  }
  return snapRate(
    harnessLocPerUnit(harnessId, h.locPerSec, upgrades) * globalMult * reviewLocMult * agentMult,
  );
}

/** @deprecated Use `calcHarnessLocRate`. */
export function calcGenUnitLocRate(harnessId: string, upgrades: string[]): number {
  return calcHarnessLocRate(harnessId, upgrades);
}

export function calcHarnessBaseRates(
  upgrades: string[],
  tests: number,
): { locRate: number; bugRate: number; fixRate: number; tokenDrain: number } {
  let locRate = 0;
  let bugRate = 0;
  let fixRate = 0;
  let tokenDrain = 0;

  let globalMult = 1;
  let bugMult = 1;
  let reviewLocMult = 1;
  let reviewBugMult = 1;
  const testFixRate = calcTestFixRate(upgrades);

  for (const u of ownedDefs(upgrades)) {
    if (u.globalMult) globalMult *= u.globalMult;
    if (u.bugMult) bugMult *= u.bugMult;
    if (u.reviewLocMult !== undefined) reviewLocMult = u.reviewLocMult;
    if (u.reviewBugMult !== undefined) reviewBugMult = u.reviewBugMult;
  }

  const writeTestDamping = action('write_test').bugDamping ?? 0;
  if (tests > 0) bugMult *= 1 / (1 + tests * writeTestDamping);

  const { genCountExponent, throughputScale, throughputExponent } = BUG_GENERATION;
  const harnesses = ownedHarnesses(upgrades);
  const harnessCount = harnesses.length;

  for (const h of harnesses) {
    if (!h.locPerSec) continue;
    const unitLoc = harnessLocPerUnit(h.id, h.locPerSec, upgrades);
    locRate += unitLoc * globalMult * reviewLocMult;
    if ((h.bugsPerSec ?? 0) > 0) {
      bugRate += (h.bugsPerSec ?? 0) * bugMult * reviewBugMult;
    }
    if ((h.fixPerSec ?? 0) > 0) fixRate += h.fixPerSec ?? 0;
    if ((h.tokenDrainPerSec ?? 0) > 0) tokenDrain += h.tokenDrainPerSec ?? 0;
  }

  if (harnessCount > 1 && genCountExponent !== 1) {
    bugRate *= Math.pow(harnessCount, genCountExponent - 1);
  }

  locRate *= calcAgentLocMult(upgrades);

  if (bugRate > 0 && locRate > 0 && throughputExponent > 0) {
    bugRate *= Math.pow(1 + locRate / throughputScale, throughputExponent);
  }

  if (testFixRate > 0 && tests > 0) fixRate += tests * testFixRate;

  return {
    locRate: snapRate(locRate),
    bugRate: snapRate(bugRate),
    fixRate: snapRate(fixRate),
    tokenDrain: snapRate(tokenDrain),
  };
}

export function calcRates(
  accountCounts: Record<string, number>,
  upgrades: string[],
  tests: number,
  mcMinis: number = 0,
  lanes?: McMiniLanes,
): { locRate: number; bugRate: number; fixRate: number } {
  void accountCounts;
  const codeLanes = lanes ?? { code: 0, growth: 0, tests: 0 };
  const machines = calcCodeMachines(mcMinis, codeLanes);
  const base = calcHarnessBaseRates(upgrades, tests);
  return {
    locRate: snapRate(base.locRate * machines),
    bugRate: base.bugRate,
    fixRate: base.fixRate,
  };
}

export function calcHarnessTokenDrainPerSec(
  upgrades: string[],
  mcMinis: number = 0,
  lanes?: McMiniLanes,
): number {
  const codeLanes = lanes ?? { code: 0, growth: 0, tests: 0 };
  const machines = calcCodeMachines(mcMinis, codeLanes);
  return snapRate(calcHarnessBaseRates(upgrades, 0).tokenDrain * machines);
}

function accountStackTok(
  a: AccountDef,
  stacks: number,
  paid: boolean,
): { max: number; regen: number } {
  if (stacks <= 0) return { max: 0, regen: 0 };
  const tierMax = paid ? a.paidMaxTokens : a.freeMaxTokens;
  const tierRegen = paid ? a.paidTokenRegen : a.freeTokenRegen;
  return {
    max: tierMax + Math.max(0, stacks - 1) * a.extraMaxTokens,
    regen: tierRegen + Math.max(0, stacks - 1) * a.extraTokenRegen,
  };
}

export function calcTokenConfig(
  upgrades: string[],
  accountCounts: Record<string, number> = {},
): { maxTokens: number; tokenRegen: number } {
  let maxTokens = TOKENS.baseMax;
  let tokenRegen = TOKENS.baseRegen;
  const paid = hasProPlan(upgrades);

  for (const a of ACCOUNTS) {
    const stacks = accountCounts[a.id] ?? 0;
    const { max, regen } = accountStackTok(a, stacks, paid);
    maxTokens += max;
    tokenRegen += regen;
  }

  for (const u of ownedDefs(upgrades)) {
    if (u.maxTokensBonus) maxTokens += u.maxTokensBonus;
    if (u.tokenRegenBonus) tokenRegen += u.tokenRegenBonus;
  }
  return { maxTokens, tokenRegen: snapRate(tokenRegen) };
}

export function totalAccountStacks(accountCounts: Record<string, number>): number {
  return ACCOUNTS.reduce((n, a) => n + (accountCounts[a.id] ?? 0), 0);
}

export function calcNinesRate(upgrades: string[], bugs: number): number {
  let rate = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.ninesPerSec) rate += u.ninesPerSec;
    if (u.ninesPerBugSec) rate += bugs * u.ninesPerBugSec;
  }
  return snapRate(rate);
}

export function calcAutoBugDrainRate(upgrades: string[]): number {
  let rate = 0;
  for (const u of ownedDefs(upgrades)) {
    if (u.autoBugDrainRate && u.autoBugDrainRate > rate) rate = u.autoBugDrainRate;
  }
  return snapRate(rate);
}

export interface Uptime {
  fraction: number;
  nines: number;
  pct: string;
  label: string;
}

function formatUptimePct(fraction: number): string {
  const pct =
    fraction >= 0.9999
      ? (fraction * 100).toFixed(3)
      : fraction >= 0.999
        ? (fraction * 100).toFixed(2)
        : fraction >= 0.9
          ? (fraction * 100).toFixed(1)
          : (fraction * 100).toFixed(0);
  return pct + '%';
}

export function countNinesInPct(pct: string): number {
  return (pct.replace('%', '').match(/9/g) ?? []).length;
}

function uptimeNinesLabel(nines: number): string {
  if (nines <= 0) return 'no nines';
  return nines === 1 ? '1 nine' : `${nines} nines`;
}

export function calcUptime(bugs: number): Uptime {
  const fraction = Math.min(
    UPTIME.fractionMax,
    Math.max(UPTIME.fractionMin, 1 - bugs * UPTIME.bugFractionRate),
  );
  const pct = formatUptimePct(fraction);
  const nines = Math.min(5, countNinesInPct(pct));
  const label = uptimeNinesLabel(nines);
  return { fraction, nines, pct, label };
}

export function formatNinesPct(n: number): string {
  const i = Math.floor(n);
  if (i < 2) return '90%';
  if (i === 2) return '99%';
  return '99.' + '9'.repeat(i - 2) + '%';
}

// ─── burn (investor overlay) ───────────────────────────────────────────────

export function calcAccountBurnBase(accountCounts: Record<string, number>): number {
  let burn = 0;
  for (const a of ACCOUNTS) {
    const n = accountCounts[a.id] ?? 0;
    if (n > 0 && a.moneyPerSec) burn += n * a.moneyPerSec;
  }
  return burn;
}

export function calcHarnessBurnBase(upgrades: string[], mcMinis: number, lanes: McMiniLanes): number {
  const machines = calcCodeMachines(mcMinis, lanes);
  let burn = 0;
  for (const h of ownedHarnesses(upgrades)) {
    if (h.moneyPerSec) burn += h.moneyPerSec * machines;
  }
  return burn;
}

/** @deprecated Use `calcAccountBurnBase`. */
export function calcGenBurnBase(accountCounts: Record<string, number>): number {
  return calcAccountBurnBase(accountCounts);
}

export function calcGenBurnMult(upgrades: string[]): number {
  let mult = 1;
  for (const u of ownedDefs(upgrades)) {
    if (u.genBurnMult) mult *= u.genBurnMult;
  }
  return mult;
}

export function hasProPlan(upgrades: string[]): boolean {
  return upgrades.includes('pro_plan');
}

export function calcInfraBurnPerSec(
  state: Pick<GameState, 'accountCounts' | 'upgrades' | 'mcMinis' | 'mcMiniLanes'>,
): number {
  if (!hasProPlan(state.upgrades)) return 0;
  const lanes = state.mcMiniLanes ?? { code: 0, growth: 0, tests: 0 };
  const base =
    calcAccountBurnBase(state.accountCounts) +
    calcHarnessBurnBase(state.upgrades, state.mcMinis ?? 0, lanes);
  return snapRate(base * calcGenBurnMult(state.upgrades));
}

export function calcAccountMarginalBurn(accountId: string, upgrades: string[]): number {
  if (!hasProPlan(upgrades)) return 0;
  const a = ACCOUNTS.find((x) => x.id === accountId);
  if (!a?.moneyPerSec) return 0;
  return snapRate(a.moneyPerSec * calcGenBurnMult(upgrades));
}

/** @deprecated Use `calcAccountMarginalBurn`. */
export function calcGenMarginalBurn(accountId: string, upgrades: string[]): number {
  return calcAccountMarginalBurn(accountId, upgrades);
}

/** @deprecated Harness LOC is included in `calcRates`; McMinis multiply machines only. */
export function calcMcMiniCodeLocRate(_codeMinis: number, _upgrades: string[]): number {
  return 0;
}

export function calcBugPenalty(bugs: number): number {
  const penalized = Math.max(0, bugs - UPTIME.locPenaltyFreeBugs);
  return Math.max(UPTIME.minOutputFraction, 1 / (1 + penalized * UPTIME.bugPenaltyRate));
}
