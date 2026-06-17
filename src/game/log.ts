import type { GameState, LogEntry, LogEntryType } from '../types';
import { MAX_LOG } from './constants';
import { now } from './runtime';
import { computeEntryStreamMs } from './streamSchedule';

export { computeTextStreamMs as streamingDurationMs } from './streamSchedule';

/**
 * Append one or more log entries derived from `text` to `prev.log`. Lines
 * starting with `>` are detected automatically and their type is overridden
 * to `'user'` (they render right-aligned in the conversation panel). Empty
 * lines are dropped. The log is truncated to `MAX_LOG` entries.
 *
 * Each entry gets `streamMs` at enqueue for `useStreamingLog` playback only.
 */
export type AppendLogOpts = { priority?: boolean; ephemeral?: boolean };

export function appendLog(
  prev: GameState,
  text: string,
  type: LogEntryType,
  opts?: AppendLogOpts,
): GameState {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  let next = prev;
  const burstId = next.logId + 1;
  const last = prev.log[prev.log.length - 1];
  let prevWasUser = last?.type === 'user';
  for (const line of lines) {
    const isUser = line.trimStart().startsWith('>');
    const clean = isUser ? line.replace(/^\s*>\s*/, '') : line;
    const entryType: LogEntryType = isUser ? 'user' : type;
    const streamMs = computeEntryStreamMs(line, entryType, prevWasUser, {
      afterUserReply: prevWasUser && !isUser,
      skipSpinner: opts?.ephemeral || opts?.priority,
    });
    prevWasUser = isUser;
    const entry: LogEntry = {
      id: next.logId + 1,
      text: clean,
      type: entryType,
      streamMs,
      burstId,
      ...(opts?.priority ? { priority: true } : {}),
      ...(opts?.ephemeral ? { ephemeral: true } : {}),
    };
    next = {
      ...next,
      logId: next.logId + 1,
      log: [...next.log, entry].slice(-MAX_LOG),
    };
  }

  return next;
}

/** Approved MCP tool call — card in the log, not token-streamed. */
export function appendMcpToolLog(
  prev: GameState,
  toolText: string,
  ackText?: string,
): GameState {
  if (!toolText.trim() && !ackText?.trim()) return prev;
  const entry: LogEntry = {
    id: prev.logId + 1,
    text: toolText,
    type: 'tool',
    streamMs: 0,
    instant: true,
    toolAck: ackText?.trim() ? ackText : undefined,
  };
  return {
    ...prev,
    logId: prev.logId + 1,
    log: [...prev.log, entry].slice(-MAX_LOG),
  };
}

/** Live subagent card — spinner until `expiresAt`, then checkmark. */
export function appendSubagentLog(
  prev: GameState,
  headline: string,
  expiresAt: number,
): GameState {
  if (!headline.trim()) return prev;
  const startedAt = now();
  const entry: LogEntry = {
    id: prev.logId + 1,
    text: headline.trim(),
    type: 'subagent',
    streamMs: 0,
    instant: true,
    subagentStartedAt: startedAt,
    subagentExpiresAt: expiresAt,
  };
  return {
    ...prev,
    logId: prev.logId + 1,
    log: [...prev.log, entry].slice(-MAX_LOG),
  };
}

/** Append a line that jumps to the front of the pending queue (no token animation). */
export function appendLogInstant(
  prev: GameState,
  text: string,
  type: LogEntryType,
): GameState {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  let next = prev;
  const burstId = next.logId + 1;
  for (const line of lines) {
    const isUser = line.trimStart().startsWith('>');
    const clean = isUser ? line.replace(/^\s*>\s*/, '') : line;
    const entryType: LogEntryType = isUser ? 'user' : type;
    const entry: LogEntry = {
      id: next.logId + 1,
      text: clean,
      type: entryType,
      streamMs: 0,
      instant: true,
      burstId,
    };
    next = {
      ...next,
      logId: next.logId + 1,
      log: [...next.log, entry].slice(-MAX_LOG),
    };
  }
  return next;
}

/** Drop ephemeral log lines and align `logId` before writing a save. */
export function stateForPersist(state: GameState): GameState {
  const log = state.log.filter((e) => !e.ephemeral);
  if (log.length === state.log.length) return state;
  const logId = log.reduce((max, e) => Math.max(max, e.id), 0);
  return { ...state, log, logId };
}
