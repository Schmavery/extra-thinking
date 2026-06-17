import type { GameState } from '../types';
import { UPGRADES } from '../game/data';
import { fmt } from '../lib/format';
import { getMove, rechargeProgress } from '../game/availability';
import {
  nextFundingRound,
  raiseBlockReason,
  raiseRoundRequirementsLabel,
} from '../game/investor';
import {
  ShopButton,
  ShopMeta,
  ShopName,
  ShopNameText,
  ShopRow,
  ShopSectionHeader,
} from './ShopRow';

interface Props {
  state: GameState;
  onBuyUpgrade: (id: string) => void;
  onRaiseRound: () => void;
}

export function Upgrades({ state, onBuyUpgrade, onRaiseRound }: Props) {
  const now = Date.now();
  const round = nextFundingRound(state);
  const raiseMove = round ? getMove(state, 'raise_round', now)! : null;
  const showRaise = raiseMove?.visible ?? false;

  const visible = UPGRADES.map((u) => ({
    u,
    move: getMove(state, `buy_upgrade:${u.id}`, now)!,
  }))
    .filter(({ move }) => move.visible)
    .sort((a, b) => a.u.cost - b.u.cost);

  if (visible.length === 0 && !showRaise) return null;

  return (
    <div className="min-w-0">
      <ShopSectionHeader>upgrades</ShopSectionHeader>

      {showRaise && round && raiseMove && (() => {
        const blockReason = raiseMove.legal ? null : raiseBlockReason(state);
        return (
          <ShopRow>
            <ShopName>
              <ShopNameText>Close {round.label}</ShopNameText>
            </ShopName>
            <ShopButton
              variant={raiseMove.legal ? 'launch' : 'default'}
              off={!raiseMove.legal}
              onClick={raiseMove.legal ? onRaiseRound : undefined}
              title={raiseMove.legal ? `Close ${round.label}` : blockReason ?? undefined}
            >
              close
            </ShopButton>
            <ShopMeta>
              <span className="text-dimmer">
                {raiseRoundRequirementsLabel(round)}
                {raiseMove.legal ? (
                  <span className="text-purple ml-[10px]">(ready)</span>
                ) : (
                  blockReason && <span className="ml-[10px]">({blockReason})</span>
                )}
                {round.mcMinisGrant > 0 && (
                  <span className="ml-[10px]">+{round.mcMinisGrant} McMini</span>
                )}
              </span>
            </ShopMeta>
          </ShopRow>
        );
      })()}

      {visible.map(({ u, move }) => (
        <ShopRow key={u.id}>
            <ShopName>
              <ShopNameText>{u.name}</ShopNameText>
            </ShopName>
          <ShopButton
            off={!move.legal}
            onClick={() => onBuyUpgrade(u.id)}
            title={u.desc}
            progress={rechargeProgress(move)}
          >
            buy
          </ShopButton>
          <ShopMeta>
            <span
              className={`whitespace-nowrap shrink-0 ${move.legal ? 'text-dim' : 'text-dimmer'}`}
            >
              {fmt(u.cost)} loc
            </span>
            <span className="text-dimmer min-w-0">{u.desc}</span>
          </ShopMeta>
        </ShopRow>
      ))}
    </div>
  );
}

export function InstalledList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="mt-[10px] text-dimmer text-[11px] min-w-0 break-words">
      installed: {ids.map((id) => UPGRADES.find((u) => u.id === id)?.name).join(', ')}
    </div>
  );
}
