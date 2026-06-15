import type { GenDef } from '../types';

function fmtPerSec(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1) return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '/s';
  if (abs < 10) return n.toFixed(1) + '/s';
  return Math.round(n) + '/s';
}

/** Per-owned-unit rates from generator data — the only mechanics generators affect. */
export function formatGenMechanics(g: Pick<GenDef, 'locPerSec' | 'bugsPerSec' | 'fixPerSec'>): string {
  const parts = [`${fmtPerSec(g.locPerSec)} LOC`, `${fmtPerSec(g.bugsPerSec)} bugs`];
  if (g.fixPerSec > 0) parts.push(`${fmtPerSec(g.fixPerSec)} fixes`);
  return parts.join(' · ');
}

export function genTooltip(g: GenDef): string {
  return g.desc ? `${formatGenMechanics(g)}\n${g.desc}` : formatGenMechanics(g);
}
