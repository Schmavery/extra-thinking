import { afterEach, describe, expect, it } from 'vitest';
import { action } from '../src/game/data';
import { kickAgentAction } from '../src/game/actions';
import { maybeFireEvent } from '../src/game/events';
import { appendLog } from '../src/game/log';
import { defaultState } from '../src/game/state';
import { hasActiveSubagent, logKickSubagent, subagentJunkLine } from '../src/game/subagent';
import { EVENT_MIX } from '../src/game/constants';
import { resetClock, resetRandom, setClock, setRandom } from '../src/game/runtime';

describe('subagent log cards', () => {
  afterEach(() => {
    resetClock();
    resetRandom();
  });

  it('kick logs user line and subagent card with task heading', () => {
    setClock(() => 1_000);
    setRandom(() => 0);
    const prev = {
      ...defaultState(),
      tokens: 200,
      totalClicks: 20,
      agentBuffExpires: 0,
    };
    const next = kickAgentAction(prev);
    expect(next.agentBuffExpires).toBeGreaterThan(1_000);
    const types = next.log.map((e) => e.type);
    expect(types).toContain('user');
    expect(types).toContain('subagent');
    const card = next.log.find((e) => e.type === 'subagent');
    expect(card?.subagentExpiresAt).toBe(next.agentBuffExpires);
    expect(card?.instant).toBe(true);
    expect(card?.text).not.toMatch(/\{\{/);
    expect(card?.text).toMatch(/investigating|reviewing|searching|reproducing|checking|tracing|gathering|auditing|fixing|responding|cross-referencing/i);
  });

  it('logKickSubagent uses subagentTasks for the card heading', () => {
    setClock(() => 0);
    setRandom(() => 0);
    const prev = defaultState();
    const tasks = action('kick_agent').subagentTasks!;
    const next = logKickSubagent(prev, '> kick off a subagent', 30_000, tasks);
    expect(next.log.some((e) => e.type === 'user' && e.text.includes('kick off'))).toBe(true);
    const card = next.log.find((e) => e.type === 'subagent');
    expect(card?.text).toMatch(/investigating|reviewing|searching|reproducing|checking|tracing|gathering|auditing|fixing|responding|cross-referencing/i);
    expect(card?.text).not.toMatch(/Subagent initialized/i);
  });

  it('subagentJunkLine advances slowly', () => {
    const a = subagentJunkLine(1, 0);
    const b = subagentJunkLine(1, 5000);
    const c = subagentJunkLine(1, 5999);
    const d = subagentJunkLine(1, 6000);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(d).not.toBe(a);
  });

  it('kick still logs subagent card when user lines are exhausted', () => {
    setClock(() => 2_000);
    setRandom(() => 0);
    const messages = action('kick_agent').messages!;
    const prev = {
      ...defaultState(),
      tokens: 200,
      totalClicks: 20,
      agentBuffExpires: 0,
      log: messages.map((m, i) => ({
        id: i + 1,
        text: m.replace(/^\s*>\s*/, ''),
        type: 'user' as const,
      })),
      logId: messages.length,
    };
    const next = kickAgentAction(prev);
    expect(next.log.some((e) => e.type === 'subagent')).toBe(true);
  });
});

describe('maybeFireEvent subagent pool', () => {
  afterEach(() => {
    resetClock();
    resetRandom();
  });

  it('spawns a subagent card from events.yaml when McMinis are active', () => {
    setClock(() => 10_000);
    let r = 0;
    setRandom(() => {
      const seq = [0, EVENT_MIX.subagentShare * 0.5, 0];
      return seq[r++ % seq.length] ?? 0;
    });
    const base = {
      ...defaultState(),
      started: true,
      launched: true,
      totalLoc: 20_000,
      mcMinis: 2,
      lastEventTime: 0,
    };
    const out = maybeFireEvent(base, 1, appendLog);
    expect(out.log.some((e) => e.type === 'subagent')).toBe(true);
    expect(hasActiveSubagent(out.log)).toBe(true);
    expect(out.lastEventTime).toBe(10_000);
    const card = out.log.find((e) => e.type === 'subagent');
    expect(card?.text).toMatch(/investigating|reviewing|searching|reproducing|checking|tracing|gathering|auditing|fixing|responding|cross-referencing/i);
  });

  it('does not spawn subagent cards without McMinis', () => {
    setClock(() => 0);
    setRandom(() => 0);
    const base = {
      ...defaultState(),
      started: true,
      launched: true,
      totalLoc: 20_000,
      mcMinis: 0,
      lastEventTime: 0,
    };
    const out = maybeFireEvent(base, 1, appendLog);
    expect(out.log.some((e) => e.type === 'subagent')).toBe(false);
  });
});
