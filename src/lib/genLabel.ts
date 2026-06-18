import type { AccountDef } from '../types';
import { calcAccountMarginalBurn } from '../game/rates';

function fmtTokPerSec(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1) return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + ' tok/s';
  if (abs < 10) return n.toFixed(1) + ' tok/s';
  return Math.round(n) + ' tok/s';
}

export function formatAccountTok(
  a: Pick<AccountDef, 'freeMaxTokens' | 'freeTokenRegen' | 'paidMaxTokens' | 'paidTokenRegen'>,
  paid: boolean,
): string {
  const max = paid ? a.paidMaxTokens : a.freeMaxTokens;
  const regen = paid ? a.paidTokenRegen : a.freeTokenRegen;
  return `+${max} max tok · +${fmtTokPerSec(regen)}`;
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
