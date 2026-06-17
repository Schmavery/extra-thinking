/**
 * Burn pacing helpers.
 *
 * Burn is unbounded in theory (autocomplete has no purchase cap), but in practice
 * `moneyPerSec` is tuned against generator `costMult` escalation and typical LOC
 * banks at Seed close / pro_plan unlock. Greedy-bot traces + `burnIfAllInOnGen`
 * in `tests/burnPacing.test.ts` assert the next raise gate is not instant-cleared.
 */
import { INVESTOR } from './constants';
import { ACCOUNTS } from './data';
import {
  calcAccountBurnBase,
  calcGenBurnMult,
  calcHarnessBurnBase,
  calcInfraBurnPerSec,
  accountCost,
} from './rates';
import type { GameState } from '../types';

/** Burn must stay below this fraction of the next raise gate at funding milestones. */
export const BURN_GATE_HEADROOM = 0.85;

export function minBurnForFundingRound(fundingRound: number): number {
  return INVESTOR.fundingRounds[fundingRound]?.minBurnPerSec ?? 0;
}

/** Burn if `pro_plan` flipped on with this fleet (no plan multipliers). */
export function burnAtProPlanUnlock(
  accountCounts: Record<string, number>,
  upgrades: string[] = [],
  mcMinis = 0,
  lanes = { code: 0, growth: 0, tests: 0 },
): number {
  const base =
    calcAccountBurnBase(accountCounts) + calcHarnessBurnBase(upgrades, mcMinis, lanes);
  return base * calcGenBurnMult(['pro_plan']);
}

export function burnBelowNextGate(state: GameState, headroom = BURN_GATE_HEADROOM): boolean {
  const nextMin = minBurnForFundingRound(state.fundingRound ?? 0);
  if (nextMin <= 0) return true;
  return calcInfraBurnPerSec(state) < nextMin * headroom;
}

/** How many more units of `genId` affordable from `locBudget` given current `owned`. */
export function maxPurchasesWithBudget(
  accountId: string,
  owned: number,
  locBudget: number,
): number {
  const a = ACCOUNTS.find((x) => x.id === accountId);
  if (!a || locBudget <= 0) return 0;
  let n = owned;
  let remaining = locBudget;
  let bought = 0;
  while (remaining > 0) {
    const cost = accountCost(a, n);
    if (cost > remaining) break;
    remaining -= cost;
    n += 1;
    bought += 1;
  }
  return bought;
}

export function burnIfAllInOnAccount(
  accountCounts: Record<string, number>,
  accountId: string,
  locBudget: number,
  upgrades: string[] = ['pro_plan'],
): number {
  const owned = accountCounts[accountId] ?? 0;
  const extra = maxPurchasesWithBudget(accountId, owned, locBudget);
  const nextCounts = { ...accountCounts, [accountId]: owned + extra };
  return calcAccountBurnBase(nextCounts) * calcGenBurnMult(upgrades);
}

/** @deprecated Use `burnIfAllInOnAccount`. */
export function burnIfAllInOnGen(
  accountCounts: Record<string, number>,
  accountId: string,
  locBudget: number,
  upgrades: string[] = ['pro_plan'],
): number {
  return burnIfAllInOnAccount(accountCounts, accountId, locBudget, upgrades);
}

