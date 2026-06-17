import { useEffect, useState, type CSSProperties } from 'react';

const LOADER_EXIT_MS = 240;
const CHECK_DRAW_DELAY_MS = 100;
const CHECK_DRAW_MS = 380;

/** Circle arc via dash gap — rotates cleanly around center. */
const LOADER_R = 9;
const LOADER_CIRC = 2 * Math.PI * LOADER_R;
/** Visible arc length (~55% of circumference). */
const LOADER_ARC = LOADER_CIRC * 0.55;
const LOADER_GAP = LOADER_CIRC - LOADER_ARC;

interface Props {
  complete: boolean;
  /** False when the card mounted already complete (skip loader→check sequence). */
  animateComplete?: boolean;
  className?: string;
}

/**
 * Loader arc spins, then snaps out while the check stroke draws in.
 * SVG stroke-dash animation — not a crossfade between two icons.
 */
export function SubagentStatusIcon({
  complete,
  animateComplete = true,
  className,
}: Props) {
  const [loaderVisible, setLoaderVisible] = useState(!complete);

  useEffect(() => {
    if (!complete) {
      setLoaderVisible(true);
      return;
    }
    if (!animateComplete) {
      setLoaderVisible(false);
      return;
    }
    const t = window.setTimeout(() => setLoaderVisible(false), LOADER_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [complete, animateComplete]);

  const drawCheck = complete;
  const checkClass =
    complete && animateComplete
      ? 'subagent-check-draw'
      : 'subagent-check-static';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={['shrink-0', className].filter(Boolean).join(' ')}
      style={
        drawCheck && animateComplete
          ? ({ '--subagent-check-delay': `${CHECK_DRAW_DELAY_MS}ms` } as CSSProperties)
          : undefined
      }
    >
      {loaderVisible && (
        <g transform="translate(12 12)">
          <g
            className={
              complete && animateComplete ? 'subagent-loader-exit' : 'subagent-loader-spin'
            }
          >
            <circle
              cx={0}
              cy={0}
              r={LOADER_R}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${LOADER_ARC} ${LOADER_GAP}`}
            />
          </g>
        </g>
      )}
      {drawCheck && (
        <path
          pathLength={1}
          d="M20 6 9 17l-5-5"
          className={['text-green', checkClass].join(' ')}
        />
      )}
    </svg>
  );
}

export const SUBAGENT_STATUS_ANIM_MS = LOADER_EXIT_MS + CHECK_DRAW_DELAY_MS + CHECK_DRAW_MS;
