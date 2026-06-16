import { describe, expect, it, afterEach } from 'vitest';
import { NEWS } from '../src/game/data';
import { maybeFireEvent, applyGuaranteedNews, weightedPick } from '../src/game/events';
import { appendLog } from '../src/game/log';
import { defaultState } from '../src/game/state';
import { setClock, setRandom, resetClock, resetRandom } from '../src/game/runtime';

describe('weightedPick', () => {
  const pool = [
    { minLoc: 100, label: 'early' },
    { minLoc: 10_000, label: 'late' },
  ] as const;

  it('favors higher minLoc when roll is high', () => {
    expect(weightedPick(pool, 0.99).label).toBe('late');
    expect(weightedPick(pool, 0.001).label).toBe('early');
  });
});

describe('maybeFireEvent news', () => {
  afterEach(() => {
    resetClock();
    resetRandom();
  });

  it('does not pick guaranteed headlines from the random pool', () => {
    const headline = NEWS.find((n) => n.id === 'codepilot-todo-roadmap')!;
    expect(headline.guaranteed).toBe(true);
    let r = 0;
    setRandom(() => {
      const seq = [0, 0, 0, 0];
      return seq[r++ % seq.length] ?? 0;
    });
    setClock(() => 0);

    const base = {
      ...defaultState(),
      totalLoc: headline.minLoc,
      lastEventTime: -60_000,
      usedNewsIds: [],
    };

    const out = maybeFireEvent(base, 1, appendLog);
    expect(out.usedNewsIds).not.toContain(headline.id);
    expect(out.log.some((e) => e.type === 'news')).toBe(false);
  });

  it('records headline id and does not fire the same headline twice', () => {
    const headline = NEWS.find((n) => n.id === 'gnoogle-ai-mode-search')!;
    let r = 0;
    setRandom(() => {
      // cooldown pass, fire pass, pick news, weighted pick first item
      const seq = [0, 0, 0, 0];
      return seq[r++ % seq.length] ?? 0;
    });
    let t = 0;
    setClock(() => t);

    const base = {
      ...defaultState(),
      totalLoc: headline.minLoc,
      lastEventTime: -60_000,
      usedNewsIds: [],
    };

    const once = maybeFireEvent(base, 1, appendLog);
    expect(once.usedNewsIds).toContain(headline.id);
    expect(once.log.some((e) => e.type === 'news')).toBe(true);

    t += 60_000;
    const twice = maybeFireEvent(once, 1, appendLog);
    expect(twice.usedNewsIds.filter((id) => id === headline.id)).toHaveLength(1);
  });
});

describe('applyGuaranteedNews', () => {
  it('fires guaranteed headline once totalLoc reaches minLoc', () => {
    const headline = NEWS.find((n) => n.id === 'codepilot-todo-roadmap')!;
    const prev = { ...defaultState(), totalLoc: 55, usedNewsIds: [] };
    const next = { ...prev, totalLoc: 65 };
    const out = applyGuaranteedNews(prev, next);
    expect(out.usedNewsIds).toContain(headline.id);
    expect(out.log.some((e) => e.type === 'news' && e.text.includes('CodePilot'))).toBe(true);
    expect(out.log.some((e) => e.type === 'news' && e.text.startsWith('Industry:'))).toBe(false);

    const again = applyGuaranteedNews(out, out);
    expect(again.usedNewsIds.filter((id) => id === headline.id)).toHaveLength(1);
  });
});
