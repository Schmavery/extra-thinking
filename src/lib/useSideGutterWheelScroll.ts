import { useEffect, type RefObject } from 'react';

function canScroll(el: HTMLElement, deltaY: number): boolean {
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (deltaY < 0) return scrollTop > 0;
  if (deltaY > 0) return scrollTop + clientHeight < scrollHeight - 1;
  return false;
}

function forwardWheel(el: HTMLElement, e: WheelEvent): void {
  if (!canScroll(el, e.deltaY)) return;
  e.preventDefault();
  el.scrollTop += e.deltaY;
  el.dispatchEvent(new WheelEvent('wheel', { deltaY: e.deltaY, bubbles: false }));
}

function pickScrollTarget(
  clientX: number,
  left: HTMLElement,
  right: HTMLElement | null,
): HTMLElement {
  if (!right) return left;
  const leftRect = left.getBoundingClientRect();
  const rightRect = right.getBoundingClientRect();
  const midpoint = (leftRect.right + rightRect.left) / 2;
  return clientX < midpoint ? left : right;
}

/** Forward wheel events from side gutters / column gap to the nearest scroll panel. */
export function useSideGutterWheelScroll(opts: {
  enabled: boolean;
  /** Element that receives wheel events (e.g. full game root). */
  captureRef: RefObject<HTMLElement | null>;
  /** Vertical band where gutter scroll applies (excludes footer, etc.). */
  boundsRef: RefObject<HTMLElement | null>;
  leftRef: RefObject<HTMLElement | null>;
  rightRef: RefObject<HTMLElement | null>;
}) {
  const { enabled, captureRef, boundsRef, leftRef, rightRef } = opts;

  useEffect(() => {
    if (!enabled) return;
    const capture = captureRef.current;
    if (!capture) return;

    const onWheel = (e: WheelEvent) => {
      const bounds = boundsRef.current;
      const left = leftRef.current;
      if (!bounds || !left) return;
      if (!capture.contains(e.target as Node)) return;

      const boundsRect = bounds.getBoundingClientRect();
      if (e.clientY < boundsRect.top || e.clientY > boundsRect.bottom) return;

      const scrollEl = pickScrollTarget(e.clientX, left, rightRef.current);
      if (scrollEl.contains(e.target as Node)) return;

      forwardWheel(scrollEl, e);
    };

    capture.addEventListener('wheel', onWheel, { passive: false });
    return () => capture.removeEventListener('wheel', onWheel);
  }, [enabled, captureRef, boundsRef, leftRef, rightRef]);
}
