import { describe, expect, it, vi } from 'vitest';
import { getMove } from '../src/game/availability';
import { pasteErrorAction } from '../src/game/actions';
import { action, UPGRADES } from '../src/game/data';
import { defaultState } from '../src/game/state';
import {
  calcKickAgentTokenCost,
  calcLobstagramTokenCost,
  calcPasteErrorFixChance,
  calcPasteErrorTokenCost,
  calcPromptTokenCost,
  calcPromptBugGain,
  calcRunTestsTokenCost,
  runnableTests,
  formatPasteErrorLog,
  pasteErrorButtonLabel,
} from '../src/game/rates';

function upg(id: string) {
  return UPGRADES.find((u) => u.id === id)!;
}

describe('action token costs', () => {
  it('prompt cost stacks upgrade bonuses on action base', () => {
    const base = action('prompt').tokenCost ?? 0;
    expect(calcPromptTokenCost([])).toBe(base);
    expect(calcPromptTokenCost(['model_update_1'])).toBe(
      base + (upg('model_update_1').promptTokenCostBonus ?? 0),
    );
    expect(calcPromptTokenCost(['better_prompts'])).toBe(
      base + (upg('better_prompts').promptTokenCostBonus ?? 0),
    );
    expect(calcPromptTokenCost(['model_update_1', 'better_prompts'])).toBe(
      base +
        (upg('model_update_1').promptTokenCostBonus ?? 0) +
        (upg('better_prompts').promptTokenCostBonus ?? 0),
    );
  });

  it('paste_error cost stacks upgrade bonus on action base', () => {
    const base = action('paste_error').tokenCost ?? 0;
    expect(calcPasteErrorTokenCost([])).toBe(base);
    expect(calcPasteErrorTokenCost(['fix_bug_skill'])).toBe(
      base + (upg('fix_bug_skill').pasteErrorTokenCostBonus ?? 0),
    );
  });

  it('kick_agent cost stacks harness bonus on action base', () => {
    const base = action('kick_agent').tokenCost ?? 0;
    expect(calcKickAgentTokenCost([])).toBe(base);
    expect(calcKickAgentTokenCost(['subagent_harness'])).toBe(
      base + (upg('subagent_harness').kickAgentTokenCostBonus ?? 0),
    );
  });

  it('run_tests costs perTestTokenCost × whole tests written', () => {
    const perTest = action('run_tests').perTestTokenCost ?? 1;
    expect(calcRunTestsTokenCost(0)).toBe(0);
    expect(calcRunTestsTokenCost(5)).toBe(5 * perTest);
    expect(calcRunTestsTokenCost(12)).toBe(12 * perTest);
    expect(calcRunTestsTokenCost(5.9)).toBe(5 * perTest);
    expect(runnableTests(3.2)).toBe(3);
  });

  it('run_tests gates on 30s cooldown', () => {
    const t = Date.now();
    const state = {
      ...defaultState(),
      started: true,
      tests: 5,
      tokens: 100,
      actionCooldowns: { run_tests: t },
    };
    const move = getMove(state, 'run_tests', t)!;
    expect(move.legal).toBe(false);
    expect(move.waitMs).toBeGreaterThan(0);
    expect(move.waitMs).toBeLessThanOrEqual(30000);
  });

  it('lobstagram post cost escalates linearly with prior posts', () => {
    const a = action('lobstagram_post');
    const base = (a.tokenCost ?? 0) * (a.tokenCostMult ?? 1);
    const step = a.tokenCostStep ?? 0;
    expect(calcLobstagramTokenCost(0)).toBe(base);
    expect(calcLobstagramTokenCost(1)).toBe(base + step);
    expect(calcLobstagramTokenCost(3)).toBe(base + 3 * step);
  });
});

describe('paste_error fix chance', () => {
  it('stacks fix chance bonus on action base', () => {
    const base = action('paste_error').fixChance ?? 0;
    expect(calcPasteErrorFixChance([])).toBe(base);
    expect(calcPasteErrorFixChance(['fix_bug_skill'])).toBe(
      Math.min(1, base + (upg('fix_bug_skill').pasteErrorFixChanceBonus ?? 0)),
    );
  });
});

describe('paste_error button label', () => {
  it('says paste the error before the skill', () => {
    expect(pasteErrorButtonLabel([])).toBe('paste the error');
  });

  it('says /fix-bug after the skill is installed', () => {
    expect(pasteErrorButtonLabel(['fix_bug_skill'])).toBe('/fix-bug');
  });
});

describe('paste_error log format', () => {
  const sample = "> here's the error\nI see the issue — fixed.";
  const meta = '[Pasted text #2 · 5 lines]';

  it('appends pasted-text meta only before the skill', () => {
    expect(formatPasteErrorLog(sample, [], meta)).toBe(
      "> here's the error [Pasted text #2 · 5 lines]\nI see the issue — fixed.",
    );
  });

  it('prepends /fix-bug on the user line after the skill', () => {
    expect(formatPasteErrorLog(sample, ['fix_bug_skill'], meta)).toBe(
      "> /fix-bug here's the error [Pasted text #2 · 5 lines]\nI see the issue — fixed.",
    );
  });
});

describe('paste_error log cooldown', () => {
  it('fixes bugs silently within logCooldownMs', () => {
    const t0 = 1_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    const base = { ...defaultState(), bugs: 3, tokens: 100, lifetimeBugs: 3 };
    const first = pasteErrorAction(base);
    expect(first.log.length).toBeGreaterThan(base.log.length);

    vi.spyOn(Date, 'now').mockReturnValue(t0 + 2000);
    const second = pasteErrorAction({ ...first, bugs: 3, tokens: 100 });
    expect(second.log.length).toBe(first.log.length);

    vi.restoreAllMocks();
  });
});
