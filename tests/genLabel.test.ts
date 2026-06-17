import { describe, expect, it } from 'vitest';
import { ACCOUNTS } from '../src/game/data';
import { hasProPlan } from '../src/game/rates';
import { accountTooltip, formatAccountTok } from '../src/lib/genLabel';

describe('genLabel', () => {
  it('formatAccountTok uses free tier fields when unpaid', () => {
    const codepilot = ACCOUNTS.find((a) => a.id === 'codepilot')!;
    const label = formatAccountTok(codepilot, false);
    expect(label).toContain(`+${codepilot.freeMaxTokens} max`);
    expect(label).not.toContain(`+${codepilot.paidMaxTokens} max`);
  });

  it('accountTooltip separates mechanics from tagline', () => {
    const opengpt = ACCOUNTS.find((a) => a.id === 'opengpt')!;
    expect(accountTooltip(opengpt, [], false)).toContain('brainstorming');
    expect(accountTooltip(opengpt, [], false)).toContain(`+${opengpt.freeMaxTokens} max`);
  });

  it('account taglines avoid implying separate game systems', () => {
    const banned = /\b(expired trial|rate limit|200K|billing dashboard|computer use|\d+ sub-agents)\b/i;
    for (const a of ACCOUNTS) {
      expect(a.desc, a.id).not.toMatch(banned);
    }
  });

  it('paid tier uses paid tok numbers in tooltip', () => {
    const claudius = ACCOUNTS.find((a) => a.id === 'claudius')!;
    expect(accountTooltip(claudius, ['pro_plan'], true)).toContain('paid tier');
    expect(formatAccountTok(claudius, true)).toContain(`+${claudius.paidMaxTokens} max`);
    expect(hasProPlan(['pro_plan'])).toBe(true);
  });
});
