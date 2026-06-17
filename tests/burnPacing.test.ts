/**
 * Burn vs funding gates: owned accounts + harness bill once Pay for Access lands;
 * tuned `moneyPerSec` keeps greedy play below the next gate at each milestone.
 *
 * Greedy-bot traces (45 virtual min × seeds): `RUN_SLOW_SIMS=1 npm test -- tests/burnPacing.test.ts`
 */

import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/Sim';
import { greedyPlayer } from '../src/sim/bots';
import { INVESTOR } from '../src/game/constants';
import {
  BURN_GATE_HEADROOM,
  burnAtProPlanUnlock,
  burnBelowNextGate,
  burnIfAllInOnAccount,
  minBurnForFundingRound,
} from '../src/game/burnPacing';
import { calcInfraBurnPerSec } from '../src/game/rates';
import { buyUpgradeAction } from '../src/game/actions';
import { defaultState } from '../src/game/state';

afterEach(() => Sim.teardown());

const SEEDS = [1, 42, 99];
const BUDGET_MS = 45 * 60_000;

function traceFunding(sim: Sim) {
  let proPlanFirst: ReturnType<typeof defaultState> | null = null;
  let seedClosed: ReturnType<typeof defaultState> | null = null;
  let seriesAClosed: ReturnType<typeof defaultState> | null = null;
  let prevFr = 0;
  let prevHadPro = false;

  for (const { state } of sim.trace) {
    if (!state) continue;
    const fr = state.fundingRound ?? 0;
    const hasPro = state.upgrades.includes('pro_plan');
    if (fr > prevFr) {
      if (fr === 1) seedClosed = state;
      if (fr === 2) seriesAClosed = state;
    }
    if (hasPro && !prevHadPro) proPlanFirst = state;
    prevFr = fr;
    prevHadPro = hasPro;
  }

  return { proPlanFirst, seedClosed, seriesAClosed };
}

describe('burn on pro_plan', () => {
  it('existing fleet bills immediately at purchase', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      fundingRound: 1,
      loc: 500_000,
      upgrades: ['autocomplete', 'direct_api'],
      accountCounts: { codepilot: 5, opengpt: 2 },
    };
    const next = buyUpgradeAction(prev, 'pro_plan');
    expect(calcInfraBurnPerSec(next)).toBeCloseTo(5 * 0.18 + 2 * 0.45 + 2.2, 2);
  });
});

describe.skipIf(!process.env.RUN_SLOW_SIMS)('burn pacing: greedy bot', () => {
  for (const seed of SEEDS) {
    it(`seed=${seed}: pro_plan unlock leaves burn below Series A gate`, () => {
      const sim = new Sim({ seed, recordTrace: true });
      sim.runEventDriven(greedyPlayer, BUDGET_MS);
      const { proPlanFirst } = traceFunding(sim);
      if (!proPlanFirst) return;

      const seriesA = minBurnForFundingRound(1);
      expect(calcInfraBurnPerSec(proPlanFirst)).toBeLessThan(seriesA * BURN_GATE_HEADROOM);
      expect(burnBelowNextGate(proPlanFirst)).toBe(true);
    });

    it(`seed=${seed}: Seed-close fleet would not clear Series A on pro_plan`, () => {
      const sim = new Sim({ seed, recordTrace: true });
      sim.runEventDriven(greedyPlayer, BUDGET_MS);
      const { seedClosed } = traceFunding(sim);
      if (!seedClosed) return;

      const seriesA = minBurnForFundingRound(1);
      expect(
        burnAtProPlanUnlock(
          seedClosed.accountCounts,
          seedClosed.upgrades,
          seedClosed.mcMinis,
          seedClosed.mcMiniLanes,
        ),
      ).toBeLessThan(seriesA * BURN_GATE_HEADROOM);
    });

    it(`seed=${seed}: closing Series A leaves burn below Series B gate`, () => {
      const sim = new Sim({ seed, recordTrace: true });
      sim.runEventDriven(greedyPlayer, BUDGET_MS);
      const { seriesAClosed } = traceFunding(sim);
      if (!seriesAClosed) return;

      const seriesB = INVESTOR.fundingRounds[2]!.minBurnPerSec;
      expect(seriesAClosed.fundingRound).toBe(2);
      expect(calcInfraBurnPerSec(seriesAClosed)).toBeLessThan(seriesB * BURN_GATE_HEADROOM);
    });
  }
});

describe('burn pacing: analytical ceiling at launch', () => {
  it('typical pre-launch fleet stays under Series A on pro_plan', () => {
    const burn = burnAtProPlanUnlock(
      { codepilot: 4, opengpt: 1 },
      ['autocomplete'],
    );
    expect(burn).toBeLessThan(INVESTOR.fundingRounds[1]!.minBurnPerSec * BURN_GATE_HEADROOM);
  });

  it('heavy but realistic fleet still stays under Series A gate', () => {
    const burn = burnAtProPlanUnlock(
      { codepilot: 4, opengpt: 2, claudius: 1 },
      ['autocomplete', 'chat_loop'],
    );
    expect(burn).toBeLessThan(INVESTOR.fundingRounds[1]!.minBurnPerSec * BURN_GATE_HEADROOM);
  });
});

describe('burn pacing: LOC economy caps account spam', () => {
  const seriesACap = INVESTOR.fundingRounds[1]!.minBurnPerSec * BURN_GATE_HEADROOM;

  it('200k loc all-in opengpt signups still stays under Series A gate', () => {
    const accounts = { codepilot: 3 };
    const burn = burnIfAllInOnAccount(accounts, 'opengpt', 200_000);
    expect(burn).toBeLessThan(seriesACap);
  });

  for (const seed of SEEDS) {
    it.skipIf(!process.env.RUN_SLOW_SIMS)(
      `seed=${seed}: greedy Seed-close bank cannot opengpt-spam to Series A`,
      () => {
      const sim = new Sim({ seed, recordTrace: true });
      sim.runEventDriven(greedyPlayer, BUDGET_MS);
      const { seedClosed } = traceFunding(sim);
      if (!seedClosed) return;

      const burnActual = burnAtProPlanUnlock(
        seedClosed.accountCounts,
        seedClosed.upgrades,
        seedClosed.mcMinis,
        seedClosed.mcMiniLanes,
      );
      const burnSpam = burnIfAllInOnAccount(
        seedClosed.accountCounts,
        'opengpt',
        seedClosed.loc,
      );

      expect(burnActual).toBeLessThan(seriesACap);
      expect(burnSpam).toBeLessThan(seriesACap);
      expect(seedClosed.loc).toBeLessThan(800_000);
    });
  }
});
