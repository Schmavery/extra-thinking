import { ACCOUNTS } from '../game/data';
import type { AccountDef } from '../types';
import { accountTooltip } from '../lib/genLabel';
import { fmtLoc } from './traceAnalyze';

export const GEN_BY_ID = new Map<string, AccountDef>(ACCOUNTS.map((g) => [g.id, g]));

export function genHoverTitle(g: AccountDef): string {
  return [
    accountTooltip(g),
    `shop ${fmtLoc(g.unlockAt)} · base ${fmtLoc(g.baseCost)} · ×${g.costMult} per owned`,
  ].join('\n');
}
