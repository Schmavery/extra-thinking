import { describe, expect, it } from 'vitest';
import { defaultState } from '../src/game/state';
import { INVESTOR } from '../src/game/constants';
import { calcCodeMachines, calcInfraBurnPerSec, calcRates } from '../src/game/rates';
import { tickReducer } from '../src/game/tick';
import { raiseRoundAction } from '../src/game/actions';
import {
  adjustMcMiniLane,
  grantMcMinis,
  idleMcMinis,
  normalizeMcMiniLanes,
} from '../src/game/investor';

describe('McMini lanes', () => {
  it('new boxes stay idle until assigned', () => {
    const s = grantMcMinis(defaultState(), 2);
    expect(s.mcMiniLanes).toEqual({ code: 0, growth: 0, tests: 0 });
    expect(idleMcMinis(s.mcMinis!, s.mcMiniLanes)).toBe(2);
  });

  it('can assign zero to every lane', () => {
    const base = grantMcMinis(defaultState(), 1);
    expect(normalizeMcMiniLanes(1, { code: 0, growth: 0, tests: 0 })).toEqual({
      code: 0,
      growth: 0,
      tests: 0,
    });
    const onGrowth = adjustMcMiniLane(base, 'growth', 1);
    expect(onGrowth.mcMiniLanes).toEqual({ code: 0, growth: 1, tests: 0 });
    const backToIdle = adjustMcMiniLane(onGrowth, 'growth', -1);
    expect(backToIdle.mcMiniLanes).toEqual({ code: 0, growth: 0, tests: 0 });
  });

  it('clamps over-assigned lanes on load', () => {
    expect(normalizeMcMiniLanes(1, { code: 2, growth: 1, tests: 0 })).toEqual({
      code: 1,
      growth: 0,
      tests: 0,
    });
  });

  it('code lane machines match assigned boxes only', () => {
    const lanes = { code: 0, growth: 1, tests: 0 };
    expect(calcCodeMachines(0, lanes)).toBe(1);
    expect(calcCodeMachines(2, lanes)).toBe(0);
    expect(calcCodeMachines(2, { code: 2, growth: 0, tests: 0 })).toBe(2);
  });

  it('no passive loc from fleet until code boxes are assigned', () => {
    const harness = ['autocomplete'];
    expect(calcRates({}, harness, 0, 2, { code: 0, growth: 2, tests: 0 }).locRate).toBe(0);
    expect(calcRates({}, harness, 0, 2, { code: 1, growth: 1, tests: 0 }).locRate).toBe(2);
    expect(calcRates({}, harness, 0, 2, { code: 2, growth: 0, tests: 0 }).locRate).toBe(4);
  });

  it('seed close grants three McMinis', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      buzzMeter: INVESTOR.buzzMax,
      fundingRound: 0,
      upgrades: ['pro_plan', 'autocomplete'],
      bugs: 0,
    };
    const next = raiseRoundAction(prev);
    expect(next.mcMinis).toBe(3);
    expect(next.mcMiniLanes).toEqual({ code: 0, growth: 0, tests: 0 });
    expect(idleMcMinis(next.mcMinis!, next.mcMiniLanes)).toBe(3);
  });
});

describe('account burn', () => {
  it('is zero before pro_plan', () => {
    const s = {
      ...defaultState(),
      accountCounts: { codepilot: 5, opengpt: 2 },
      upgrades: [] as string[],
    };
    expect(calcInfraBurnPerSec(s)).toBe(0);
  });

  it('sums owned account moneyPerSec after pro_plan', () => {
    const s = {
      ...defaultState(),
      accountCounts: { codepilot: 5, opengpt: 2 },
      upgrades: ['pro_plan'],
    };
    expect(calcInfraBurnPerSec(s)).toBeCloseTo(5 * 0.18 + 2 * 0.45, 2);
  });

  it('team_plan multiplies account burn', () => {
    const base = {
      ...defaultState(),
      accountCounts: { codepilot: 4 },
      upgrades: ['pro_plan'],
    };
    const scaled = { ...base, upgrades: ['pro_plan', 'team_plan'] };
    expect(calcInfraBurnPerSec(scaled)).toBeCloseTo(calcInfraBurnPerSec(base) * 2.5, 2);
  });
});

describe('agent_dashboard shop gate', () => {
  it('unlocks after seed round closes', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      fundingRound: 1,
      loc: 12_000,
      totalLoc: 50_000,
    };
    const next = tickReducer(prev, 1);
    expect(next.unlockedUpgrades).toContain('agent_dashboard');
  });

  it('stays hidden before seed round', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      fundingRound: 0,
      loc: 50_000,
      totalLoc: 50_000,
    };
    const next = tickReducer(prev, 1);
    expect(next.unlockedUpgrades).not.toContain('agent_dashboard');
  });
});

describe('pro_plan shop gate', () => {
  it('unlocks after seed round without LOC unlock progress', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      fundingRound: 1,
      loc: 0,
      totalLoc: 12_000,
    };
    const next = tickReducer(prev, 1);
    expect(next.unlockedUpgrades).toContain('pro_plan');
  });

  it('stays hidden before seed round', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      fundingRound: 0,
      loc: 500_000,
      totalLoc: 500_000,
    };
    const next = tickReducer(prev, 1);
    expect(next.unlockedUpgrades).not.toContain('pro_plan');
  });
});
