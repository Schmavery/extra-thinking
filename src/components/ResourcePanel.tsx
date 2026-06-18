import { useEffect, useState } from 'react';
import type { GameState } from '../types';
import { fmt, fmtQty, fmtRate, fmtRateQty, fmtUnit } from '../lib/format';
import { now } from '../game/runtime';
import { WarningIcon } from './WarningIcon';
import {
  calcBugPenalty,
  calcHarnessTokenDrainPerSec,
  calcInfraBurnPerSec,
  calcKickAgentLocPerSec,
  calcSpawnBugRate,
  kickAgentBuffActive,
  calcNinesRate,
  calcRates,
  calcTestFixRate,
  calcTokenConfig,
  calcUptime,
  formatNinesPct,
  snapRate,
} from '../game/rates';
import { AGENT_BUFF, INVESTOR, THRESHOLDS, TOKENS } from '../game/constants';
import { deriveGame } from '../game/derive';
import { mcMiniTokenDrainPerSec, normalizeMcMiniLanes } from '../game/investor';
import { action } from '../game/data';

function testBugRateReductionPct(tests: number): number {
  const d = action('write_test').bugDamping ?? 0;
  if (tests <= 0 || d <= 0) return 0;
  return Math.round(100 * (1 - 1 / (1 + tests * d)));
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}
function Row({ label, children }: RowProps) {
  return (
    <div className="contents">
      <span className="text-dim whitespace-nowrap">{label}</span>
      <div className="min-w-0 flex flex-wrap items-baseline gap-x-[8px] [&_.metric]:whitespace-nowrap">{children}</div>
    </div>
  );
}

interface Props {
  state: GameState;
}

export function ResourcePanel({ state }: Props) {
  const [, setBuffTick] = useState(0);
  const buffExpiry = state.agentBuffExpires ?? 0;

  useEffect(() => {
    if ((state.mcMinis ?? 0) !== 0 || buffExpiry <= now()) return;
    const id = setInterval(() => setBuffTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [buffExpiry, state.mcMinis]);

  const t = now();
  const derived = deriveGame(state);
  const { ui, thresholds, hasFlag } = derived;
  const { locRate } = calcRates(
    state.accountCounts,
    state.upgrades,
    state.tests ?? 0,
    state.mcMinis ?? 0,
    state.mcMiniLanes,
  );
  const spawnBugRate = calcSpawnBugRate(state, t);
  const bugPenalty = calcBugPenalty(state.bugs);
  const bugOutputPct = Math.round(bugPenalty * 100);
  const bugLoadSevere = bugOutputPct <= thresholds.warnBugsSevereOutputPct;
  const uptime = calcUptime(state.bugs);
  const { maxTokens, tokenRegen } = calcTokenConfig(state.upgrades, state.accountCounts);
  const ninesRate = calcNinesRate(state.upgrades, state.bugs);
  const currentNines = ui.ninesTracking
    ? Math.max(state.nines || 0, AGENT_BUFF.ninesFloorFallback)
    : 0;
  const ninesInt = Math.floor(currentNines);
  const showAsCounter = ninesInt >= 8;

  const lanes = normalizeMcMiniLanes(state.mcMinis ?? 0, state.mcMiniLanes);
  const harnessDrain = calcHarnessTokenDrainPerSec(
    state.upgrades,
    state.mcMinis ?? 0,
    lanes,
  );
  const tokenDrain = harnessDrain + mcMiniTokenDrainPerSec(lanes);
  const netTokenRegen = snapRate(tokenRegen - tokenDrain);
  const kickAgentLoc = kickAgentBuffActive(state, t)
    ? calcKickAgentLocPerSec(state.upgrades) * bugPenalty
    : 0;
  const displayLocRate = snapRate(locRate * bugPenalty + kickAgentLoc);
  const burnRate = calcInfraBurnPerSec(state);
  const buzz = state.buzzMeter ?? 0;

  const hasMadePurchase =
    state.upgrades.length > 0 ||
    Object.values(state.accountCounts ?? {}).some((n) => (n ?? 0) > 0);

  const uptimeColorClass =
    uptime.nines >= 4
      ? 'text-green'
      : uptime.nines >= 3
        ? 'text-green-dim'
        : uptime.nines >= 2
          ? 'text-yellow'
          : 'text-red';

  return (
    <div className="mt-[18px]">
      <div className="grid grid-cols-[fit-content(7rem)_minmax(0,1fr)] gap-x-[10px] gap-y-[3px] items-baseline">
      {ui.showTokens && (
        <Row label="tokens">
          <span className={`metric ${state.tokens < TOKENS.lowWarnThreshold ? 'text-red' : 'text-fg'}`}>
            {fmtUnit(String(Math.floor(state.tokens)), `/ ${maxTokens}`)}
          </span>
          {state.tokens < maxTokens && netTokenRegen !== 0 && (
            <span className="metric text-dimmer text-[12px]">
              ({netTokenRegen > 0 ? '+' : ''}
              {fmtRate(netTokenRegen)}
              {tokenDrain > 0 ? `, ${fmtUnit(`−${fmtRate(tokenDrain)}`, 'drain')}` : ''})
            </span>
          )}
        </Row>
      )}

      {/* loc — wallet (spendable) + rate; lifetime produced gates unlocks / launch */}
      <Row label={state.totalLoc < 100 ? 'lines of code' : 'loc'}>
        <span className="metric text-green">{fmt(state.loc)}</span>
        {displayLocRate !== 0 && (
          <span className="metric text-green-dim text-[12px]">({fmtRate(displayLocRate)})</span>
        )}
        {hasMadePurchase && (
          <>
            <span className="text-dimmer text-[12px]">·</span>
            <span className="metric text-dim text-[12px]">{fmtQty(state.totalLoc, 'lifetime')}</span>
          </>
        )}
      </Row>

      {/* bugs */}
      {ui.showBugs && (
        <Row label="bugs">
          <span className={`metric ${state.bugs > 0 ? 'text-red' : 'text-green'}`}>{fmt(state.bugs)}</span>
          {spawnBugRate !== 0 && (
            <span className={`metric ${(spawnBugRate > 0 ? 'text-red-dim' : 'text-green-dim') + ' text-[12px]'}`}>
              (+{fmtRate(spawnBugRate)})
            </span>
          )}
        </Row>
      )}

      {/* tests */}
      {(state.tests ?? 0) > 0 && !hasFlag('ai_review') && (() => {
        const tests = state.tests ?? 0;
        const dampPct = testBugRateReductionPct(tests);
        const ciFix = snapRate(tests * calcTestFixRate(state.upgrades));
        return (
          <Row label="tests">
            <span className="metric text-dim">{fmt(tests)}</span>
            {(dampPct > 0 || ciFix !== 0) && (
              <span className="metric text-dimmer text-[12px]">
                (
                {[
                  dampPct > 0 && `−${dampPct}% bug rate`,
                  ciFix !== 0 && fmtUnit(`CI +${fmtRate(ciFix)}`, 'fix'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                )
              </span>
            )}
          </Row>
        );
      })()}

      {/* uptime / nines */}
      {ui.showUptime && !ui.ninesTracking && (
        <Row label="uptime">
          <span className={uptimeColorClass}>{uptime.pct}</span>
          {uptime.nines >= 4 && (
            <span className={uptimeColorClass + ' text-[12px]'}>({uptime.label})</span>
          )}
        </Row>
      )}
      {ui.ninesTracking && !showAsCounter && (
        <Row label="uptime">
          <span className="text-green">{formatNinesPct(ninesInt)}</span>
          {ninesRate > 0 && (
            <span className="text-green-dim text-[12px]">(+{ninesRate.toFixed(4)}/s)</span>
          )}
        </Row>
      )}
      {showAsCounter && (
        <Row label="nines">
          <span className="text-green">{ninesInt}</span>
          {ninesRate > 0 && <span className="text-green-dim text-[12px]">(+{ninesRate.toFixed(4)}/s)</span>}
        </Row>
      )}

      {/* investor overlay */}
      {ui.showInvestorHud && (
        <>
          {ui.showBurnRate && (
            <Row label="burn rate">
              <span className="metric text-green">${burnRate}/s</span>
            </Row>
          )}
          <Row label="buzz">
            <span className={buzz >= INVESTOR.buzzMax ? 'text-purple' : 'text-dim'}>
              {Math.floor(buzz)}%
            </span>
            <span className="text-dimmer text-[12px] w-[72px] inline-block h-[6px] bg-border align-middle">
              <span
                className="block h-full bg-purple/60"
                style={{ width: `${Math.min(100, buzz)}%` }}
              />
            </span>
          </Row>
        </>
      )}

      </div>

      {/* warnings */}
      {state.bugs > thresholds.warnBugsElevated && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-[12px] leading-none ${bugLoadSevere ? 'text-red-dim' : 'text-yellow'}`}
        >
          <WarningIcon className="w-3 h-3 shrink-0" />
          <span>
            {state.bugs > thresholds.warnBugsCritical ? 'critical' : 'elevated'} bug load
            {bugOutputPct < 100 ? ` — output at ${bugOutputPct}%` : ''}
            {ui.showUptime && !ui.ninesTracking && uptime.nines < THRESHOLDS.warnUptimeDegradedNines
              ? ' — uptime degraded'
              : ''}
          </span>
        </div>
      )}
      {ui.showUptime && !ui.ninesTracking && uptime.nines < THRESHOLDS.warnUptimeFireNines && (
        <div className="mt-1 inline-flex items-center gap-1 text-red text-[12px] leading-none">
          <WarningIcon className="w-3 h-3 shrink-0" />
          <span>production is on fire</span>
        </div>
      )}
    </div>
  );
}
