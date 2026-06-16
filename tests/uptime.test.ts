import { describe, expect, it } from 'vitest';
import { calcUptime, countNinesInPct, formatNinesPct } from '../src/game/rates';

describe('countNinesInPct', () => {
  it('counts 9 digits in the percentage string', () => {
    expect(countNinesInPct('90%')).toBe(1);
    expect(countNinesInPct('99%')).toBe(2);
    expect(countNinesInPct('99.0%')).toBe(2);
    expect(countNinesInPct('98.5%')).toBe(1);
    expect(countNinesInPct('99.9%')).toBe(3);
    expect(countNinesInPct('99.99%')).toBe(4);
  });
});

describe('calcUptime', () => {
  it('99% uptime is two nines', () => {
    const u = calcUptime(100);
    expect(u.pct).toBe('99.0%');
    expect(u.nines).toBe(2);
    expect(u.label).toBe('2 nines');
  });

  it('does not round degraded uptime up to two nines', () => {
    const u = calcUptime(150);
    expect(u.pct).toBe('98.5%');
    expect(u.nines).toBe(1);
  });

  it('≈1000 bugs is at most one nine', () => {
    expect(calcUptime(1000).nines).toBeLessThanOrEqual(1);
  });
});

describe('formatNinesPct', () => {
  it('matches string nines count', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const pct = formatNinesPct(n);
      expect(countNinesInPct(pct), pct).toBe(n);
    }
  });
});
