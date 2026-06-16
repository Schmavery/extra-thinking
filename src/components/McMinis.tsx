import type { GameState } from '../types';
import { adjustMcMiniLane, idleMcMinis, normalizeMcMiniLanes } from '../game/investor';
import type { McMiniLane } from '../game/investor';
import { INVESTOR } from '../game/constants';
import { calcMcMiniCodeLocRate } from '../game/rates';

interface Props {
  state: GameState;
  onAdjustLane: (lane: McMiniLane, delta: 1 | -1) => void;
}

const LANES: { id: McMiniLane; label: string; hint: string }[] = [
  { id: 'code', label: 'code', hint: 'LOC/s · −tokens/s' },
  { id: 'growth', label: 'growth', hint: 'buzz/s · −tokens/s' },
  { id: 'tests', label: 'tests', hint: 'tests/s · −tokens/s' },
];

export function McMinis({ state, onAdjustLane }: Props) {
  const mcMinis = state.mcMinis ?? 0;
  if (mcMinis <= 0) return null;

  const lanes = normalizeMcMiniLanes(mcMinis, state.mcMiniLanes);
  const idle = idleMcMinis(mcMinis, lanes);
  const codeLoc = calcMcMiniCodeLocRate(1, state.upgrades);

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="text-dim text-[12px] mb-2">
        McMinis <span className="text-fg">{mcMinis}</span>
        <span className="text-dimmer"> — assign boxes to lanes</span>
      </div>
      {idle > 0 && (
        <div className="text-dimmer text-[11px] mb-2">
          {idle} unassigned — use + on a lane. Code replaces kick off an agent.
        </div>
      )}
      {LANES.map(({ id, label, hint }) => (
        <div key={id} className="flex gap-[10px] items-baseline mb-[4px] text-[13px]">
          <span className="text-dim w-[80px]">{label}</span>
          <span className="text-fg w-[20px] text-right">{lanes[id]}</span>
          <button
            type="button"
            className="text-dimmer hover:text-fg px-1 disabled:opacity-30"
            disabled={lanes[id] <= 0}
            onClick={() => onAdjustLane(id, -1)}
            title={`unassign one from ${label}`}
          >
            −
          </button>
          <button
            type="button"
            className="text-dimmer hover:text-fg px-1 disabled:opacity-30"
            disabled={idle <= 0}
            onClick={() => onAdjustLane(id, 1)}
            title={`assign one to ${label}`}
          >
            +
          </button>
          <span className="text-dimmer text-[11px]">{hint}</span>
        </div>
      ))}
      <div className="text-dimmer text-[11px] mt-1 leading-relaxed">
        Per box: code +{codeLoc} LOC/s, −{INVESTOR.tokenDrainPerCodeMini} tokens/s · growth +
        {INVESTOR.buzzPerSecPerGrowthMini} buzz/s, −{INVESTOR.tokenDrainPerGrowthMini} tokens/s ·
        tests +{INVESTOR.testsPerSecPerTestsMini} tests/s, −{INVESTOR.tokenDrainPerTestsMini}{' '}
        tokens/s
      </div>
    </div>
  );
}
