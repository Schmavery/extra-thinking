import type { AccountDef } from '../types';
import { calcAccountMarginalBurn } from '../game/rates';

function fmtPerSec(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1) return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '/s';
  if (abs < 10) return n.toFixed(1) + '/s';
  return Math.round(n) + '/s';
}

export function formatAccountTok(
  a: Pick<AccountDef, 'freeMaxTokens' | 'freeTokenRegen' | 'paidMaxTokens' | 'paidTokenRegen'>,
  paid: boolean,
): string {
  const max = paid ? a.paidMaxTokens : a.freeMaxTokens;
  const regen = paid ? a.paidTokenRegen : a.freeTokenRegen;
  return `+${max} max · +${fmtPerSec(regen)} regen`;
}

export function accountTooltip(a: AccountDef, upgrades: string[] = [], paid = false): string {
  const tok = formatAccountTok(a, paid);
  const burn = calcAccountMarginalBurn(a.id, upgrades);
  const burnLine = burn > 0 ? `+$${burn}/s burn per signup` : '';
  const tier = paid ? 'paid tier' : 'free tier';
  const lines = [tok, tier, burnLine, a.desc].filter(Boolean);
  return lines.join('\n');
}

/** @deprecated Generators are service accounts now. */
export function formatGenMechanics(): string {
  return '';
}

/** @deprecated */
export function genTooltip(a: AccountDef, upgrades: string[] = [], paid = false): string {
  return accountTooltip(a, upgrades, paid);
}
