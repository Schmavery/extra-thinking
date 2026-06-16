import { describe, expect, it } from 'vitest';
import { calcPromptCooldownMs } from '../src/game/rates';
import { getMove } from '../src/game/availability';
import { promptAction } from '../src/game/actions';
import {
  activePromptCooldownMs,
  firstPromptStreamMs,
  promptCooldownForClick,
} from '../src/game/prompt';
import { defaultState } from '../src/game/state';
import { action, MILESTONES } from '../src/game/data';
import { computeEntryStreamMs, computeTextStreamMs } from '../src/game/streamSchedule';
import { render } from '../src/lib/template';

describe('prompt cooldown', () => {
  it('starts at 5s before Faster Inference (post-script)', () => {
    expect(calcPromptCooldownMs([])).toBe(5000);
  });

  it('drops to 1s with Faster Inference (post-script)', () => {
    expect(calcPromptCooldownMs(['model_update_1'])).toBe(1000);
  });

  it('first prompt cooldown includes opening beat and loc-10 milestone', () => {
    const scripted = action('prompt').earlyPromptMsgs![0]!;
    const beatMs = computeTextStreamMs(render(scripted), 'info');
    const milestone = MILESTONES[0]!;
    const milestoneMs = computeEntryStreamMs(
      render(milestone.text, { loc: milestone.loc }),
      'milestone',
      false,
    );
    const expected = beatMs + 100 + milestoneMs;
    expect(firstPromptStreamMs()).toBe(expected);
    expect(promptCooldownForClick(0, [])).toBe(expected);
    expect(milestoneMs).toBeGreaterThan(0);
    expect(expected).toBeGreaterThan(beatMs);
  });

  it('second scripted prompt uses normal yaml cooldown', () => {
    expect(promptCooldownForClick(1, [])).toBe(5000);
  });

  it('gates first prompt on stream-ms cooldown after opening click', () => {
    const cd = firstPromptStreamMs();
    const t = Date.now();
    const cooling = {
      ...defaultState(),
      started: true,
      totalClicks: 1,
      actionCooldowns: { prompt: t - (cd - 50) },
    };
    const move = getMove(cooling, 'prompt', t)!;
    expect(move.legal).toBe(false);
    expect(move.waitMs).toBeGreaterThan(0);
    expect(move.waitMs).toBeLessThanOrEqual(50);
    expect(activePromptCooldownMs(cooling)).toBe(cd);
  });

  it('gates the prompt move on yaml cooldown after scripted beats', () => {
    const state = {
      ...defaultState(),
      started: true,
      totalClicks: 10,
      actionCooldowns: { prompt: Date.now() },
    };
    const move = getMove(state, 'prompt', Date.now())!;
    expect(move.legal).toBe(false);
    expect(move.waitMs).toBeGreaterThan(0);
    expect(move.waitMs).toBeLessThanOrEqual(5000);
  });

  it('promptAction applies stream cooldown only on first click', () => {
    const prev = { ...defaultState(), tokens: 120 };
    const next = promptAction(prev);
    const cd = firstPromptStreamMs();
    expect(next.totalClicks).toBe(1);
    expect(next.actionCooldowns.prompt).toBeDefined();
    const elapsed = Date.now() - next.actionCooldowns.prompt!;
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(50);
    expect(promptCooldownForClick(0, [])).toBe(cd);
    expect(getMove(next, 'prompt', Date.now())!.legal).toBe(false);

    const second = promptAction({ ...next, actionCooldowns: {}, tokens: 120 });
    expect(promptCooldownForClick(1, [])).toBe(5000);
    expect(activePromptCooldownMs(second)).toBe(5000);
  });
});
