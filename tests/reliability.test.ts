import { describe, expect, it } from 'vitest';
import { INVESTOR, LAUNCH_LOC, THRESHOLDS } from '../src/game/constants';
import { launchAction, raiseRoundAction } from '../src/game/actions';
import { getMove } from '../src/game/availability';
import { canRaise, raiseBlockReason } from '../src/game/investor';
import { calcUptime } from '../src/game/rates';
import {
  canLaunchWithReliability,
  canRaiseWithReliability,
  launchBlockReason,
  raiseReliabilityBlockReason,
  realUptimeNines,
} from '../src/game/reliability';
import { defaultState } from '../src/game/state';

describe('reliability gates', () => {
  it('treats zero bugs as healthy for raises', () => {
    expect(realUptimeNines(0)).toBe(THRESHOLDS.minUptimeNinesToRaise);
    expect(canLaunchWithReliability({ ...defaultState(), bugs: 0 })).toBe(true);
    expect(canRaiseWithReliability({ ...defaultState(), bugs: 0 })).toBe(true);
  });

  it('blocks launch above 150 bugs', () => {
    const s = { ...defaultState(), bugs: 151 };
    expect(launchBlockReason(s)).toBe(
      `too many bugs (151 open — need ≤${THRESHOLDS.maxBugsToLaunch})`,
    );
    expect(canLaunchWithReliability(s)).toBe(false);
  });

  it('allows launch at 150 bugs (one nine — raise still blocked)', () => {
    const s = { ...defaultState(), bugs: 150, launched: true };
    expect(calcUptime(150).nines).toBe(1);
    expect(canLaunchWithReliability(s)).toBe(true);
    expect(canRaiseWithReliability(s)).toBe(false);
    expect(raiseReliabilityBlockReason(s)).toBe(
      'reliability too low for investors — fix bugs first',
    );
  });

  it('allows raise at two nines (~100 bugs)', () => {
    const s = { ...defaultState(), bugs: 100, launched: true };
    expect(calcUptime(100).nines).toBe(2);
    expect(canRaiseWithReliability(s)).toBe(true);
  });

  it('launch reducer no-ops when over bug cap', () => {
    const prev = {
      ...defaultState(),
      totalLoc: LAUNCH_LOC,
      bugs: 205,
    };
    expect(launchAction(prev)).toBe(prev);
  });

  it('launch is legal at launch LOC with light bug load', () => {
    const prev = {
      ...defaultState(),
      totalLoc: LAUNCH_LOC,
      bugs: 8,
    };
    const move = getMove(prev, 'launch', Date.now())!;
    expect(move.legal).toBe(true);
    expect(launchAction(prev).launched).toBe(true);
  });

  it('raise requires two nines after sloppy launch', () => {
    const prev = {
      ...defaultState(),
      launched: true,
      buzzMeter: INVESTOR.buzzMax,
      fundingRound: 0,
      upgrades: ['pro_plan'],
      genCounts: { autocomplete: 5 },
      bugs: 120,
    };
    expect(canLaunchWithReliability(prev)).toBe(true);
    expect(canRaise(prev)).toBe(false);
    expect(raiseBlockReason(prev)).toBe(
      'reliability too low for investors — fix bugs first',
    );
    expect(raiseRoundAction(prev)).toBe(prev);
  });
});
