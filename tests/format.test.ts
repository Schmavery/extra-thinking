import { describe, expect, it } from 'vitest';
import {
  fmtQty,
  fmtRate,
  fmtRateQty,
  fmtTokRate,
  fmtUnit,
  METRIC_SEP,
} from '../src/lib/format';

describe('fmtRate', () => {
  it('drops trailing zeros on whole numbers', () => {
    expect(fmtRate(3)).toBe('3/s');
    expect(fmtRate(25)).toBe('25/s');
    expect(fmtTokRate(3)).toBe(`3${METRIC_SEP}tok/s`);
  });

  it('keeps meaningful fractions', () => {
    expect(fmtRate(1.5)).toBe('1.5/s');
    expect(fmtRate(0.026)).toBe('0.026/s');
    expect(fmtTokRate(2.5)).toBe(`2.5${METRIC_SEP}tok/s`);
  });

  it('formats negatives', () => {
    expect(fmtRate(-2)).toBe('−2/s');
    expect(fmtTokRate(-3)).toBe(`−3${METRIC_SEP}tok/s`);
  });
});

describe('fmtUnit', () => {
  it('joins number and unit with a non-breaking space', () => {
    expect(fmtQty(8400, 'lifetime')).toBe(`8.4K${METRIC_SEP}lifetime`);
    expect(fmtRateQty(3, 'loc')).toBe(`3/s${METRIC_SEP}loc`);
    expect(fmtUnit('42', '/ 90')).toBe(`42${METRIC_SEP}/ 90`);
  });
});
