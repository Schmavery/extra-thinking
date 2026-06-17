import { describe, expect, it } from 'vitest';
import {
  milestoneLocsReached,
  prepareSaveProgressMarkers,
  shouldCompleteIntroSequence,
  syncMilestonesSeen,
} from '../src/game/milestones';
import { defaultState } from '../src/game/state';

describe('milestones', () => {
  it('milestoneLocsReached lists thresholds at or below totalLoc', () => {
    expect(milestoneLocsReached(0)).toEqual([]);
    expect(milestoneLocsReached(1000)).toContain(10);
    expect(milestoneLocsReached(1000)).toContain(1000);
    expect(milestoneLocsReached(1000)).not.toContain(2000);
  });

  it('syncMilestonesSeen marks passed thresholds once', () => {
    const once = syncMilestonesSeen({ ...defaultState(), totalLoc: 500 });
    expect(once.milestonesSeen).toContain(500);

    const again = syncMilestonesSeen({ ...once, totalLoc: 500 });
    expect(again.milestonesSeen).toEqual(once.milestonesSeen);
  });

  it('shouldCompleteIntroSequence when startup milestone rolled off MAX_LOG', () => {
    expect(
      shouldCompleteIntroSequence(
        {
          introSequenceComplete: false,
          milestonesSeen: [10],
          log: Array.from({ length: 80 }, (_, i) => ({
            id: i + 10,
            text: `line ${i}`,
            type: 'info' as const,
            streamMs: 0,
          })),
        },
        [],
      ),
    ).toBe(true);
  });

  it('shouldCompleteIntroSequence waits for startup milestone stream', () => {
    const milestone = {
      id: 3,
      text: '10 lines in',
      type: 'milestone' as const,
      streamMs: 100,
    };
    const base = {
      introSequenceComplete: false,
      milestonesSeen: [10],
      log: [milestone],
    };
    expect(shouldCompleteIntroSequence(base, [{ ...milestone, text: '10 lines|' }])).toBe(
      false,
    );
    expect(shouldCompleteIntroSequence(base, [milestone])).toBe(true);
    expect(
      shouldCompleteIntroSequence(
        { ...base, milestonesSeen: [] },
        [milestone],
      ),
    ).toBe(false);
    expect(
      shouldCompleteIntroSequence(
        { ...base, introSequenceComplete: true },
        [milestone],
      ),
    ).toBe(false);
  });

  it('prepareSaveProgressMarkers adds startup milestone log and introSequenceComplete', () => {
    const s = prepareSaveProgressMarkers({
      ...defaultState(),
      started: true,
      totalLoc: 12_000,
      milestonesSeen: milestoneLocsReached(12_000),
      log: [],
      logId: 0,
    });
    expect(s.log.some((e) => e.type === 'milestone')).toBe(true);
    expect(s.milestonesSeen).toContain(10);
    expect(s.introSequenceComplete).toBe(true);
  });
});
