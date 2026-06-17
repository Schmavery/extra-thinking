import { useEffect, useRef, useState } from 'react';
import { INTRO_HEADER, STREAMING } from '../game/constants';
import { runAiTextStream } from './aiTextStream';
import { computeEntryStreamMs } from '../game/streamSchedule';

export type IntroHeaderStreamPhase = 'idle' | 'spinner' | 'title' | 'subtitle' | 'done';

export interface IntroHeaderStreamState {
  phase: IntroHeaderStreamPhase;
  /** `>` visible after the opening spinner. */
  prefixVisible: boolean;
  titleText: string;
  subtitleText: string;
  spinTick: number;
  done: boolean;
}

/**
 * Opening header beat: spinner → `>` → log-style stream for title + subtitle.
 */
export function useIntroHeaderStream(
  titleText: string,
  subtitleText: string,
  active: boolean,
): IntroHeaderStreamState {
  const [phase, setPhase] = useState<IntroHeaderStreamPhase>(active ? 'spinner' : 'idle');
  const [prefixVisible, setPrefixVisible] = useState(!active);
  const [titleDisplay, setTitleDisplay] = useState(active ? '' : titleText);
  const [subtitleDisplay, setSubtitleDisplay] = useState(active ? '' : subtitleText);
  const [spinTick, setSpinTick] = useState(0);
  const [done, setDone] = useState(!active);
  const genRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      setPrefixVisible(true);
      setTitleDisplay(titleText);
      setSubtitleDisplay(subtitleText);
      setDone(true);
      return;
    }

    const gen = ++genRef.current;
    setPhase('spinner');
    setPrefixVisible(false);
    setTitleDisplay('');
    setSubtitleDisplay('');
    setSpinTick(0);
    setDone(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    const defer = (fn: () => void, ms: number) => {
      timers.push(
        setTimeout(() => {
          if (gen !== genRef.current) return;
          fn();
        }, ms),
      );
    };

    const spinId = setInterval(() => {
      if (gen !== genRef.current) return;
      setSpinTick((t) => t + 1);
    }, STREAMING.spinnerMs);

    defer(() => {
      setPrefixVisible(true);
      setPhase('title');
      runAiTextStream(
        titleText,
        setTitleDisplay,
        () => {
          setTitleDisplay(titleText);
          setPhase('subtitle');
          runAiTextStream(
            subtitleText,
            setSubtitleDisplay,
            () => {
              setSubtitleDisplay(subtitleText);
              setPhase('done');
              setDone(true);
            },
            defer,
            { skipSpinner: true },
          );
        },
        defer,
        { skipSpinner: true },
      );
    }, INTRO_HEADER.spinnerMs);

    return () => {
      genRef.current += 1;
      clearInterval(spinId);
      for (const t of timers) clearTimeout(t);
    };
  }, [active, titleText, subtitleText]);

  return {
    phase,
    prefixVisible,
    titleText: titleDisplay,
    subtitleText: subtitleDisplay,
    spinTick,
    done,
  };
}

/** Expected ms for intro header stream (spinner + two log-style lines). */
export function introHeaderStreamMs(title: string, subtitle: string): number {
  const line = (text: string) =>
    computeEntryStreamMs(text, 'info', false, { skipSpinner: true });
  return INTRO_HEADER.spinnerMs + line(title) + line(subtitle);
}
