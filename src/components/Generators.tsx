import type { GameState } from '../types';
import { ACCOUNTS } from '../game/data';
import {
  accountCost,
  calcAccountMarginalBurn,
  canStackAccounts,
  hasProPlan,
} from '../game/rates';
import { fmt } from '../lib/format';
import { accountTooltip, formatAccountTok } from '../lib/genLabel';
import { getMove, rechargeProgress } from '../game/availability';
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
  onBuyGen: (id: string) => void;
  hideHeader?: boolean;
}

export function AccountsInstalledList({ state }: { state: GameState }) {
  if (canStackAccounts(state.upgrades)) return null;
  const accountIds = ACCOUNTS.filter((a) => (state.accountCounts[a.id] ?? 0) > 0).map(
    (a) => a.id,
  );
  if (accountIds.length === 0) return null;
  return (
    <div className="mt-[10px] text-dimmer text-[11px] min-w-0 break-words">
      registered:{' '}
      {accountIds.map((id) => ACCOUNTS.find((a) => a.id === id)?.name).join(', ')}
    </div>
  );
}

export function Generators({ state, onBuyGen, hideHeader }: Props) {
  const now = Date.now();
  const paid = hasProPlan(state.upgrades);
  const showBurn = paid;
  const canStack = canStackAccounts(state.upgrades);

  const buyable = ACCOUNTS.map((a) => ({
    a,
    move: getMove(state, `buy_gen:${a.id}`, now)!,
    owned: state.accountCounts[a.id] ?? 0,
  }))
    .filter(({ move, owned }) => move.visible && (owned === 0 || canStack));

  if (buyable.length === 0) return null;

  return (
    <div className="min-w-0">
      {!hideHeader && <ShopSectionHeader>accounts</ShopSectionHeader>}

      {buyable.map(({ a, move, owned }) => {
        const cost = accountCost(a, owned);
        const marginalBurn = showBurn ? calcAccountMarginalBurn(a.id, state.upgrades) : 0;
        const label = paid ? 'buy' : 'get';
        return (
          <ShopRow key={a.id}>
            <ShopName>
              <ShopNameText>{a.name}</ShopNameText>
              {owned > 0 && <span className="text-blue shrink-0"> [{owned}]</span>}
            </ShopName>
            <ShopButton
              off={!move.legal}
              onClick={() => onBuyGen(a.id)}
              title={accountTooltip(a, state.upgrades, paid)}
              progress={rechargeProgress(move)}
            >
              {label}
            </ShopButton>
            <ShopMeta>
              <span className={`whitespace-nowrap shrink-0 ${move.legal ? 'text-dim' : 'text-dimmer'}`}>
                {fmt(cost)} loc
              </span>
              {marginalBurn > 0 && (
                <span className="text-dimmer whitespace-nowrap shrink-0">+${marginalBurn}/s burn</span>
              )}
              <span className="text-dimmer whitespace-nowrap shrink-0">
                {formatAccountTok(a, paid)}
              </span>
              <span className="text-dimmer min-w-0">{a.desc}</span>
            </ShopMeta>
          </ShopRow>
        );
      })}
    </div>
  );
}
