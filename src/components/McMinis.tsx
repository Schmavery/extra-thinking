import type { GameState, McMiniLanes } from '../types';
import { buzzGainPerSec, idleMcMinis, normalizeMcMiniLanes } from '../game/investor';
import type { McMiniLane } from '../game/investor';
import { INVESTOR } from '../game/constants';
import {
  calcBugPenalty,
  calcHarnessBaseRates,
  snapRate,
} from '../game/rates';
import { fmtRate } from '../lib/format';

interface Props {
  state: GameState;
  onAdjustLane: (lane: McMiniLane, delta: 1 | -1) => void;
  hideHeader?: boolean;
}

const LANES: { id: McMiniLane; label: string }[] = [
  { id: 'code', label: 'code' },
  { id: 'growth', label: 'growth' },
  { id: 'tests', label: 'tests' },
];

function laneContribution(
  lane: McMiniLane,
  state: GameState,
  lanes: McMiniLanes,
): string | null {
  const assigned = lanes[lane];

  if (lane === 'code') {
    if (assigned === 0) return null;
    const base = calcHarnessBaseRates(state.upgrades, state.tests ?? 0).locRate;
    const loc = snapRate(base * assigned * calcBugPenalty(state.bugs));
    const tok = snapRate(assigned * INVESTOR.tokenDrainPerCodeMini);
    return `+${fmtRate(loc)} loc · −${fmtRate(tok)} tokens`;
  }

  if (assigned === 0) return null;

  if (lane === 'growth') {
    const buzz = snapRate(buzzGainPerSec(lanes));
    const tok = snapRate(assigned * INVESTOR.tokenDrainPerGrowthMini);
    return `+${fmtRate(buzz)} buzz · −${fmtRate(tok)} tokens`;
  }

  const tests = snapRate(assigned * INVESTOR.testsPerSecPerTestsMini);
  const tok = snapRate(assigned * INVESTOR.tokenDrainPerTestsMini);
  return `+${fmtRate(tests)} tests · −${fmtRate(tok)} tokens`;
}

function LaneControls({
  count,
  canDec,
  canInc,
  onDec,
  onInc,
  label,
  expanded,
}: {
  count: number;
  canDec: boolean;
  canInc: boolean;
  onDec: () => void;
  onInc: () => void;
  label: string;
  expanded?: boolean;
}) {
  const btnClass = expanded
    ? 'text-dim hover:text-fg w-7 h-7 border border-border disabled:opacity-30 disabled:hover:text-dim'
    : 'text-dimmer hover:text-fg px-1 disabled:opacity-30';
  const countClass = expanded
    ? 'text-fg w-8 text-center text-[15px] tabular-nums'
    : 'text-fg w-[20px] text-right';

  return (
    <div className={['flex items-center', expanded ? 'gap-1' : 'gap-0'].join(' ')}>
      <button
        type="button"
        className={btnClass}
        disabled={!canDec}
        onClick={onDec}
        title={`unassign one from ${label}`}
      >
        −
      </button>
      <span className={countClass}>{count}</span>
      <button
        type="button"
        className={btnClass}
        disabled={!canInc}
        onClick={onInc}
        title={`assign one to ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function McMinis({ state, onAdjustLane, hideHeader }: Props) {
  const mcMinis = state.mcMinis ?? 0;
  if (mcMinis <= 0) return null;

  const lanes = normalizeMcMiniLanes(mcMinis, state.mcMiniLanes);
  const idle = idleMcMinis(mcMinis, lanes);

  if (hideHeader) {
    return (
      <div className="min-w-0">
        <div className="text-dim text-[12px] mb-4">
          <span className="text-fg">{mcMinis}</span> {mcMinis === 1 ? 'box' : 'boxes'}
          {idle > 0 && (
            <span className="text-dimmer">
              {' '}
              · <span className="text-yellow">{idle}</span> unassigned
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {LANES.map(({ id, label }) => {
            const contribution = laneContribution(id, state, lanes);
            return (
              <div
                key={id}
                className="border border-border px-3 py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 items-start"
              >
                <div className="text-fg text-[14px] capitalize">{label}</div>
                <LaneControls
                  expanded
                  label={label}
                  count={lanes[id]}
                  canDec={lanes[id] > 0}
                  canInc={idle > 0}
                  onDec={() => onAdjustLane(id, -1)}
                  onInc={() => onAdjustLane(id, 1)}
                />
                {contribution && (
                  <div className="col-span-2 text-dimmer text-[12px] leading-relaxed">
                    {contribution}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="text-dim text-[12px] mb-2">
        McMinis (<span className="text-fg">{mcMinis}</span>)
        <span className="text-dimmer"> — assign boxes to lanes</span>
      </div>
      {idle > 0 && (
        <div className="text-dimmer text-[11px] mb-2">
          {idle} unassigned — use + on a lane.
        </div>
      )}
      {LANES.map(({ id, label }) => {
        const contribution = laneContribution(id, state, lanes);
        return (
          <div key={id} className="flex gap-[10px] items-baseline mb-[4px] text-[13px]">
            <span className="text-dim w-[80px]">{label}</span>
            <LaneControls
              label={label}
              count={lanes[id]}
              canDec={lanes[id] > 0}
              canInc={idle > 0}
              onDec={() => onAdjustLane(id, -1)}
              onInc={() => onAdjustLane(id, 1)}
            />
            {contribution && (
              <span className="text-dimmer text-[11px] min-w-0">{contribution}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
