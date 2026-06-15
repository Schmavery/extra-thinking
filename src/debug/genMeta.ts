import { GENS } from '../game/data';
import type { GenDef } from '../types';
import { genTooltip } from '../lib/genLabel';
import { fmtLoc } from './traceAnalyze';

export const GEN_BY_ID = new Map<string, GenDef>(GENS.map((g) => [g.id, g]));

export function genHoverTitle(g: GenDef): string {
  return [
    genTooltip(g),
    `shop ${fmtLoc(g.unlockAt)} · base ${fmtLoc(g.baseCost)} · ×${g.costMult} per owned`,
  ].join('\n');
}
