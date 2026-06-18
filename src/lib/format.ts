function trimFixed(fixed: string): string {
  return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

/** Non-breaking space between a formatted number and its unit. */
export const METRIC_SEP = '\u00A0';

/** Join value and unit so they stay on one line (`3 tok/s`, `8.4K lifetime`). */
export function fmtUnit(value: string, unit: string): string {
  return value + METRIC_SEP + unit;
}

/** Format an absolute number compactly (1.2K / 3.45M / 67.8B / 1.23T). */
export function fmt(n: number): string {
  if (n < 0) return '−' + fmt(-n);
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1e6) return (n / 1000).toFixed(1) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(2) + 'B';
  return (n / 1e12).toFixed(2) + 'T';
}

/** `fmt(n)` + unit, e.g. `8.4K lifetime` or `500 loc`. */
export function fmtQty(n: number, unit: string): string {
  return fmtUnit(fmt(n), unit);
}

/**
 * Format a non-zero per-second rate (call only when `rate !== 0`).
 * Pass `unit` for labeled rates (`fmtRate(3, 'tok')` → `3 tok/s`).
 */
export function fmtRate(n: number, unit?: string): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  let core: string;
  if (abs >= 10) {
    core = String(Math.round(abs));
  } else {
    const digits = abs < 0.1 ? 3 : abs < 1 ? 2 : 1;
    core = trimFixed(abs.toFixed(digits));
  }
  const rate = sign + core;
  return unit ? fmtUnit(rate, `${unit}/s`) : `${rate}/s`;
}

/** Rate + trailing unit label, e.g. `3/s loc`. */
export function fmtRateQty(n: number, unit: string): string {
  return fmtUnit(fmtRate(n), unit);
}

/** Token regen/drain — same rules as `fmtRate`, with unit suffix. */
export function fmtTokRate(n: number): string {
  return fmtRate(n, 'tok');
}
