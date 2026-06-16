import { describe, expect, it } from 'vitest';
import { NEWS } from '../src/game/data';
import { formatNewsText, newsBody } from '../src/game/newsFormat';

describe('formatNewsText', () => {
  it('wraps yaml body in an AI-voice lead-in', () => {
    const item = NEWS.find((n) => n.id === 'codepilot-todo-roadmap')!;
    const line = formatNewsText(item);
    expect(line).toContain('CodePilot');
    expect(line).not.toMatch(/^Industry:/);
    expect(line.length).toBeGreaterThan(item.text.length);
  });

  it('strips legacy Industry prefix from yaml bodies', () => {
    expect(newsBody('Industry: Gnoogle shipped a thing.')).toBe('Gnoogle shipped a thing.');
  });

  it('picks a stable lead-in per headline id', () => {
    const item = NEWS[0]!;
    expect(formatNewsText(item)).toBe(formatNewsText(item));
  });
});
