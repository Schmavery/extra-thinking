import type { GameState, LogEntry } from '../types';
import { appendLogInstant, appendSubagentLog } from './log';
import { pickFromPool } from '../lib/logTemplateMatch';
import { render } from '../lib/template';
import { now } from './runtime';

const JUNK_LINES = [
  'Reading related files…',
  'Checking test output…',
  'Scanning recent changes…',
  'Reviewing build logs…',
  'Tracing call sites…',
  'Summarizing context…',
] as const;

const DEFAULT_TASK = 'Investigating reported codebase issue';

export function hasActiveSubagent(log: LogEntry[], t: number = now()): boolean {
  return log.some((e) => e.type === 'subagent' && (e.subagentExpiresAt ?? 0) > t);
}

/** One calm status line; advances every ~6s while the card is active. */
export function subagentJunkLine(entryId: number, elapsedMs: number): string {
  const pool = JUNK_LINES.map((line) => render(line));
  const slot = Math.floor(elapsedMs / 6000);
  return pool[(entryId + slot) % pool.length]!;
}

function pickTaskHeadline(prev: GameState, taskPool: readonly string[] | undefined): string {
  if (!taskPool?.length) return DEFAULT_TASK;
  const source = pickFromPool(taskPool, prev.log);
  return source ? render(source) : render(taskPool[0]!);
}

/** User `>` line (instant) + subagent card for a kick. */
export function logKickSubagent(
  prev: GameState,
  userLine: string,
  expiresAt: number,
  taskPool: readonly string[] | undefined,
): GameState {
  let next = prev;
  const line = userLine.trim();
  if (line) next = appendLogInstant(next, render(line), 'info');
  return appendSubagentLog(next, pickTaskHeadline(next, taskPool), expiresAt);
}
