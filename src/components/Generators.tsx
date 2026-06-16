import type { GameState } from '../types';
import { action, GENS } from '../game/data';
import { calcGenUnitLocRate, calcGenMarginalBurn, genCost, hasProPlan } from '../game/rates';
import { fmt, fmtRate } from '../lib/format';
import { genTooltip } from '../lib/genLabel';
import { snapRate } from '../game/rates';
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
  onNewFreeAccount: () => void;
}

export function Generators({ state, onBuyGen, onNewFreeAccount }: Props) {
  const now = Date.now();
  const newAccount = getMove(state, 'new_free_account', now)!;
  const newAccountData = action('new_free_account');
  const showGenBurn = hasProPlan(state.upgrades);

  return (
    <div className="min-w-0">
      <ShopSectionHeader>generators</ShopSectionHeader>

      {newAccount.visible && (
        <ShopRow>
          <ShopName>
            <ShopNameText>Free Account</ShopNameText>
            {state.freeAccounts > 1 && (
              <span className="text-blue shrink-0"> [{state.freeAccounts}]</span>
            )}
          </ShopName>
          <ShopButton
            off={!newAccount.legal}
            onClick={newAccount.legal ? onNewFreeAccount : undefined}
            title={`+${newAccountData.maxTokensPerExtra} max tokens, +${newAccountData.tokenRegenPerExtra}/s regen · ${state.freeAccounts} account${
              state.freeAccounts !== 1 ? 's' : ''
            } active`}
            progress={rechargeProgress(newAccount)}
            progressClassName="bg-green/10"
          >
            create
          </ShopButton>
          <ShopMeta>
            <span className="text-dimmer">a different email. still free. just this once.</span>
          </ShopMeta>
        </ShopRow>
      )}

      {GENS.map((g) => {
        const move = getMove(state, `buy_gen:${g.id}`, now)!;
        if (!move.visible) return null;
        const owned = state.genCounts[g.id] ?? 0;
        const cost = genCost(g, owned);
        const unitLoc = calcGenUnitLocRate(g.id, state.upgrades);
        const marginalBurn = showGenBurn ? calcGenMarginalBurn(g.id, state.upgrades) : 0;
        const genLocRate = snapRate(unitLoc * owned);
        const rateLabel =
          owned > 0
            ? fmtRate(genLocRate)
            : `+${fmtRate(unitLoc)}/each`;
        return (
          <ShopRow key={g.id}>
            <ShopName>
              <ShopNameText>{g.name}</ShopNameText>
              {owned > 0 && <span className="text-green shrink-0"> [{owned}]</span>}
            </ShopName>
            <ShopButton
              off={!move.legal}
              onClick={() => onBuyGen(g.id)}
              title={genTooltip(g, state.upgrades)}
              progress={rechargeProgress(move)}
            >
              buy
            </ShopButton>
            <ShopMeta>
              <span className={`whitespace-nowrap shrink-0 ${move.legal ? 'text-dim' : 'text-dimmer'}`}>
                {fmt(cost)} loc
              </span>
              {marginalBurn > 0 && (
                <span className="text-dimmer whitespace-nowrap shrink-0">+${marginalBurn}/s burn</span>
              )}
              <span
                className={`whitespace-nowrap shrink-0 ${owned > 0 ? 'text-green-dim' : 'text-dimmer'}`}
              >
                {rateLabel}
              </span>
              <span className="text-dimmer min-w-0">{g.desc}</span>
            </ShopMeta>
          </ShopRow>
        );
      })}
    </div>
  );
}
