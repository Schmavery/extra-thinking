import { describe, expect, it } from 'vitest';
import { computeEntryStreamMs } from '../src/game/streamSchedule';
import { INTRO_HEADER } from '../src/game/constants';
import { introHeaderStreamMs } from '../src/lib/useIntroHeaderStream';

describe('introHeaderStreamMs', () => {
  it('matches spinner hold plus two log-style stream lines', () => {
    const title = 'extra thinking';
    const subtitle = 'a new conversation';
    const expected =
      INTRO_HEADER.spinnerMs +
      computeEntryStreamMs(title, 'info', false, { skipSpinner: true }) +
      computeEntryStreamMs(subtitle, 'info', false, { skipSpinner: true });
    expect(introHeaderStreamMs(title, subtitle)).toBe(expected);
  });
});
