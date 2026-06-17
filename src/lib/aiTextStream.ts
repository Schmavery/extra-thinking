import { aiStreamPhases } from '../game/streamSchedule';

export type AiTextStreamOpts = {
  /** Override lead-in before first chunk (ms). */
  leadInMs?: number;
  /** Override pause after the final chunk (ms). */
  afterMs?: number;
  afterUserReply?: boolean;
  skipSpinner?: boolean;
};

/**
 * Token-chunk AI text reveal — same pacing as `useStreamingLog` (chunks from
 * `split(/(\s+)/)`, trailing `|`, {@link STREAMING.charMs} per word).
 */
export function runAiTextStream(
  fullText: string,
  onUpdate: (partial: string) => void,
  onDone: () => void,
  defer: (fn: () => void, ms: number) => void,
  opts: AiTextStreamOpts = {},
): void {
  const phases = aiStreamPhases(opts.afterUserReply ?? false, {
    skipSpinner: opts.skipSpinner ?? true,
  });
  const leadInMs = opts.leadInMs ?? phases.leadInMs;
  const afterMs = opts.afterMs ?? phases.afterMs;
  const chunks = fullText.split(/(\s+)/);
  let i = 0;

  const tick = () => {
    if (i >= chunks.length) {
      onUpdate(fullText);
      defer(onDone, afterMs);
      return;
    }
    i++;
    onUpdate(chunks.slice(0, i).join('') + '|');
    const isSpace = chunks[i - 1]!.trim() === '';
    defer(tick, isSpace ? 0 : phases.tokenDelayMs);
  };

  defer(tick, leadInMs);
}
