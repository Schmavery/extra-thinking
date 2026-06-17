import { describe, expect, it } from 'vitest';
import { computeFlags, hasFlag } from '../src/game/flags';

describe('agent_dashboard flag', () => {
  it('grants agent_dashboard while owned', () => {
    const flags = computeFlags(['agent_dashboard']);
    expect(hasFlag(flags, 'agent_dashboard')).toBe(true);
  });
});
