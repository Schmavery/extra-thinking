import type { AccountDef } from '../types';
import { calcAccountMarginalBurn } from '../game/rates';
import { fmtTokRate, fmtUnit } from './format';

export function formatAccountTok(
  a: Pick<AccountDef, 'freeMaxTokens' | 'freeTokenRegen' | 'paidMaxTokens' | 'paidTokenRegen'>,
  paid: boolean,
): string {
  const max = paid ? a.paidMaxTokens : a.freeMaxTokens;
  const regen = paid ? a.paidTokenRegen : a.freeTokenRegen;
  return `+${fmtUnit(String(max), 'max tok')} · +${fmtTokRate(regen)}`;
}

export function accountTooltip(a: AccountDef, upgrades: string[] = [], paid = false): string {
  const tok = formatAccountTok(a, paid);
  const burn = calcAccountMarginalBurn(a.id, upgrades);
  const burnLine = burn > 0 ? `+${fmtUnit(`$${burn}/s`, 'burn per signup')}` : '';
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
