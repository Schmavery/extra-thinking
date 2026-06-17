import { describe, expect, it } from 'vitest';
import { ACCOUNTS } from '../src/game/data';
import { hasProPlan } from '../src/game/rates';
import { accountTooltip, formatAccountTok } from '../src/lib/genLabel';

describe('genLabel', () => {
  it('formatAccountTok shows free tier tok', () => {
    const codepilot = ACCOUNTS.find((a) => a.id === 'codepilot')!;
    expect(formatAccountTok(codepilot, false)).toBe('+30 max · +1.5/s regen');
  });

  it('accountTooltip separates mechanics from tagline', () => {
    const opengpt = ACCOUNTS.find((a) => a.id === 'opengpt')!;
    expect(accountTooltip(opengpt, [], false)).toContain('brainstorming');
    expect(accountTooltip(opengpt, [], false)).toMatch(/^\+50 max/);
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
    expect(formatAccountTok(claudius, true)).toContain('+220 max');
    expect(hasProPlan(['pro_plan'])).toBe(true);
  });
});
