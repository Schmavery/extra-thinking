import { useEffect, useState } from 'react';
import type { LogEntry } from '../types';
import { subagentJunkLine } from '../game/subagent';
import { SubagentStatusIcon } from './SubagentStatusIcon';

const COLLAPSE_MS = 280;

interface Props {
  entry: LogEntry;
}

export function SubagentBlock({ entry }: Props) {
  const expiresAt = entry.subagentExpiresAt ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const active = expiresAt > now;
  const done = expiresAt <= 0 || now >= expiresAt;

  const [showJunk, setShowJunk] = useState(() => expiresAt > Date.now());
  const [closing, setClosing] = useState(false);
  const [wasActive, setWasActive] = useState(() => expiresAt > Date.now());

  useEffect(() => {
    if (!active) return;
    setWasActive(true);
    const tickId = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tickId);
  }, [active, expiresAt]);

  useEffect(() => {
    if (active) {
      setShowJunk(true);
      setClosing(false);
      return;
    }
    if (!showJunk) return;
    setClosing(true);
    const t = window.setTimeout(() => setShowJunk(false), COLLAPSE_MS);
    return () => window.clearTimeout(t);
  }, [active, showJunk]);

  const compact = closing || (!showJunk && done);
  const elapsedMs = Math.max(0, now - (entry.subagentStartedAt ?? expiresAt - 30_000));
  const junk = subagentJunkLine(entry.id, elapsedMs);

  return (
    <div
      className={[
        'subagent-card-close mb-[11px] border rounded-sm px-[10px] bg-card-bg relative',
        compact ? 'border-border/80 py-[7px]' : 'border-card-border pt-2 pb-2',
      ].join(' ')}
    >
      <div
        className={[
          'subagent-header-gap flex items-center gap-[10px]',
          compact ? 'mb-0' : 'mb-[6px]',
        ].join(' ')}
      >
        <div className="text-dimmer text-[10px] tracking-[0.12em] uppercase shrink-0">subagent</div>
        <div
          className={[
            'text-[11px] leading-[1.45] flex-1 min-w-0 truncate transition-colors duration-200',
            done ? 'text-dim' : 'text-log-info',
          ].join(' ')}
        >
          {entry.text}
        </div>
        <SubagentStatusIcon
          complete={done}
          animateComplete={wasActive}
          className="w-[13px] h-[13px] text-dim"
        />
      </div>
      {showJunk && (
        <div
          className={[
            'subagent-junk-shell',
            closing ? 'is-closing' : 'is-open',
          ].join(' ')}
        >
          <div className="overflow-hidden min-h-0">
            <div className="text-[11px] text-dimmer leading-[1.45]">{junk}</div>
          </div>
        </div>
      )}
    </div>
  );
}
