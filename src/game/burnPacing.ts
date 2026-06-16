/**
 * Burn pacing helpers.
 *
 * Burn is unbounded in theory (autocomplete has no purchase cap), but in practice
 * `moneyPerSec` is tuned against generator `costMult` escalation and typical LOC
 * banks at Seed close / pro_plan unlock. Greedy-bot traces + `burnIfAllInOnGen`
 * in `tests/burnPacing.test.ts` assert the next raise gate is not instant-cleared.
 */
import { INVESTOR } from './constants';
import { GENS } from './data';
import { calcGenBurnBase, calcGenBurnMult, calcInfraBurnPerSec, genCost } from './rates';
import type { GameState } from '../types';

/** Burn must stay below this fraction of the next raise gate at funding milestones. */
export const BURN_GATE_HEADROOM = 0.85;

export function minBurnForFundingRound(fundingRound: number): number {
  return INVESTOR.fundingRounds[fundingRound]?.minBurnPerSec ?? 0;
}

/** Burn if `pro_plan` flipped on with this fleet (no plan multipliers). */
export function burnAtProPlanUnlock(genCounts: Record<string, number>): number {
  return calcGenBurnBase(genCounts) * calcGenBurnMult(['pro_plan']);
}

export function burnBelowNextGate(state: GameState, headroom = BURN_GATE_HEADROOM): boolean {
  const nextMin = minBurnForFundingRound(state.fundingRound ?? 0);
  if (nextMin <= 0) return true;
  return calcInfraBurnPerSec(state) < nextMin * headroom;
}

/** How many more units of `genId` affordable from `locBudget` given current `owned`. */
export function maxPurchasesWithBudget(
  genId: string,
  owned: number,
  locBudget: number,
): number {
  const g = GENS.find((x) => x.id === genId);
  if (!g || locBudget <= 0) return 0;
  let n = owned;
  let remaining = locBudget;
  let bought = 0;
  while (remaining > 0) {
    const cost = genCost(g, n);
    if (cost > remaining) break;
    remaining -= cost;
    n += 1;
    bought += 1;
  }
  return bought;
}

/**
 * Theoretical max burn if every LOC in `locBudget` went into one generator tier
 * (existing fleet still bills). Models the autocomplete-spam edge case.
 */
export function burnIfAllInOnGen(
  genCounts: Record<string, number>,
  genId: string,
  locBudget: number,
  upgrades: string[] = ['pro_plan'],
): number {
  const owned = genCounts[genId] ?? 0;
  const extra = maxPurchasesWithBudget(genId, owned, locBudget);
  const nextCounts = { ...genCounts, [genId]: owned + extra };
  return calcGenBurnBase(nextCounts) * calcGenBurnMult(upgrades);
}

