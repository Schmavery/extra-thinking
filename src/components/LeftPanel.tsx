import { useEffect, useMemo, useState, type Ref } from 'react';
import type { DerivedGame } from '../game/derive';
import { UI } from '../game/data';
import { TICK_MS } from '../game/constants';
import { getMove, rechargeProgress } from '../game/availability';
import type { GameState } from '../types';
import { Button } from './Button';
import { IntroHeader } from './IntroHeader';
import { ActionBar } from './ActionBar';
import { ResourcePanel } from './ResourcePanel';
import { AccountsInstalledList, Generators } from './Generators';
import { Upgrades, InstalledList } from './Upgrades';
import { McMinis } from './McMinis';
import type { McMiniLane } from '../game/investor';
import {
  lowerTabBadges,
  type LowerTab,
  type LowerTabBadge,
} from '../game/leftPanelBadges';

const PHASES = UI.phases;

type Handlers = {
  prompt: () => void;
  pasteError: () => void;
  writeTest: () => void;
  kickAgent: () => void;
  runTests: () => void;
  clearContext: () => void;
  launch: () => void;
  lobstagramPost: () => void;
  runBugBounty: () => void;
  buyGen: (id: string) => void;
  buyUpgrade: (id: string) => void;
  raiseRound: () => void;
  adjustMcMiniLane: (lane: McMiniLane, delta: 1 | -1) => void;
};

interface Props {
  scrollRef: Ref<HTMLDivElement>;
  isMobile: boolean;
  phase: number;
  state: GameState;
  derived: DerivedGame;
  fundingRoundOpen: boolean;
  showPromptButton: boolean;
  showResources: boolean;
  promptLabel: string;
  introHeaderStreaming: boolean;
  showIntroHeader: boolean;
  onIntroStreamComplete: () => void;
  handlers: Handlers;
}

function visibleLowerTabs(
  state: GameState,
  derived: DerivedGame,
  fundingRoundOpen: boolean,
  showResources: boolean,
): LowerTab[] {
  const { ui } = derived;
  const tabs: LowerTab[] = [];
  if (showResources) tabs.push('status');
  if (ui.showMcMinis) tabs.push('fleet');
  if (ui.showGenSection) tabs.push('accounts');
  if (ui.showUpgSection || fundingRoundOpen) tabs.push('upgrades');
  return tabs;
}

function PromptButton({
  state,
  label,
  onPrompt,
}: {
  state: GameState;
  label: string;
  onPrompt: () => void;
}) {
  const t = Date.now();
  const promptMove = getMove(state, 'prompt', t)!;
  const onCooldown = promptMove.cooldownProgress < 1;
  return (
    <div className="intro-button-in">
      <Button
        variant="primary"
        off={!promptMove.legal}
        onClick={promptMove.legal ? onPrompt : undefined}
        progress={rechargeProgress(promptMove)}
        progressEaseMs={TICK_MS}
        progressClassName={onCooldown ? 'bg-green/10' : undefined}
      >
        {label}
      </Button>
    </div>
  );
}

function TabBadgeMark({ badge }: { badge?: LowerTabBadge }) {
  if (!badge) return null;
  if (badge.kind === 'urgent') {
    return <span className="w-[5px] h-[5px] rounded-full bg-yellow shrink-0" aria-hidden />;
  }
  return <span className="text-[9px] text-dim">({badge.n})</span>;
}

function LowerTabBar({
  tabs,
  active,
  onSelect,
  badges,
}: {
  tabs: LowerTab[];
  active: LowerTab;
  onSelect: (tab: LowerTab) => void;
  badges: Partial<Record<LowerTab, LowerTabBadge>>;
}) {
  if (tabs.length <= 1) return null;
  return (
    <nav className="shrink-0 py-2 border-b border-border">
      <div className="inline-flex flex-wrap gap-[3px] p-[3px] border border-border max-w-full">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={[
              'font-mono text-[11px] px-[10px] py-[4px] border-0 cursor-pointer flex items-center gap-[5px]',
              active === id ? 'bg-card-bg text-title' : 'bg-transparent text-dimmer hover:text-dim',
            ].join(' ')}
          >
            <TabBadgeMark badge={badges[id]} />
            {id}
          </button>
        ))}
      </div>
    </nav>
  );
}

function LegacyScrollBody({
  state,
  derived,
  fundingRoundOpen,
  showGenSection,
  showUpgSection,
  showPromptButton,
  showResources,
  promptLabel,
  handlers,
}: {
  state: GameState;
  derived: DerivedGame;
  fundingRoundOpen: boolean;
  showGenSection: boolean;
  showUpgSection: boolean;
  showPromptButton: boolean;
  showResources: boolean;
  promptLabel: string;
  handlers: Handlers;
}) {
  return (
    <>
      {showPromptButton && (
        <PromptButton state={state} label={promptLabel} onPrompt={handlers.prompt} />
      )}

      <ActionBar
        state={state}
        onPasteError={handlers.pasteError}
        onWriteTest={handlers.writeTest}
        onKickAgent={handlers.kickAgent}
        onRunTests={handlers.runTests}
        onClearContext={handlers.clearContext}
        onLaunch={handlers.launch}
        onLobstagramPost={handlers.lobstagramPost}
        onRunBugBounty={handlers.runBugBounty}
      />

      {showResources && <ResourcePanel state={state} />}
      {showResources && <AccountsInstalledList state={state} />}

      {derived.ui.showMcMinis && (
        <McMinis state={state} onAdjustLane={handlers.adjustMcMiniLane} />
      )}

      {showGenSection && <Generators state={state} onBuyGen={handlers.buyGen} />}

      {(showUpgSection || fundingRoundOpen) && (
        <Upgrades
          state={state}
          onBuyUpgrade={handlers.buyUpgrade}
          onRaiseRound={handlers.raiseRound}
        />
      )}

      <InstalledList ids={state.upgrades} />
    </>
  );
}

function TabbedBody({
  state,
  derived,
  fundingRoundOpen,
  showGenSection,
  showUpgSection,
  activeTab,
  showResources,
  handlers,
}: {
  state: GameState;
  derived: DerivedGame;
  fundingRoundOpen: boolean;
  showGenSection: boolean;
  showUpgSection: boolean;
  activeTab: LowerTab;
  showResources: boolean;
  handlers: Handlers;
}) {
  return (
    <>
      {activeTab === 'status' && showResources && <ResourcePanel state={state} />}
      {activeTab === 'accounts' && (
        <>
          {showGenSection && (
            <Generators state={state} onBuyGen={handlers.buyGen} hideHeader />
          )}
          <AccountsInstalledList state={state} />
        </>
      )}
      {activeTab === 'fleet' && derived.ui.showMcMinis && (
        <McMinis state={state} onAdjustLane={handlers.adjustMcMiniLane} hideHeader />
      )}
      {activeTab === 'upgrades' && (
        <>
          {(showUpgSection || fundingRoundOpen) && (
            <Upgrades
              state={state}
              onBuyUpgrade={handlers.buyUpgrade}
              onRaiseRound={handlers.raiseRound}
              hideHeader
            />
          )}
          <InstalledList ids={state.upgrades} />
        </>
      )}
    </>
  );
}

export function LeftPanel({
  scrollRef,
  isMobile,
  phase,
  state,
  derived,
  fundingRoundOpen,
  showPromptButton,
  showResources,
  promptLabel,
  introHeaderStreaming,
  showIntroHeader,
  onIntroStreamComplete,
  handlers,
}: Props) {
  const useTabs = derived.hasFlag('agent_dashboard');
  const { showGenSection, showUpgSection } = derived.ui;
  const lowerTabs = useMemo(
    () => visibleLowerTabs(state, derived, fundingRoundOpen, showResources),
    [state, derived, fundingRoundOpen, showResources],
  );
  const [activeTab, setActiveTab] = useState<LowerTab>('status');

  useEffect(() => {
    if (!lowerTabs.includes(activeTab)) {
      setActiveTab(lowerTabs[0] ?? 'status');
    }
  }, [lowerTabs, activeTab]);

  const tabBadges = useMemo(
    () => (useTabs ? lowerTabBadges(state, derived, fundingRoundOpen) : {}),
    [useTabs, state, derived, fundingRoundOpen],
  );

  const shellClass = isMobile
    ? 'flex flex-col flex-1 min-h-0 min-w-0'
    : 'flex flex-col min-w-0 h-full';

  if (!useTabs) {
    return (
      <div
        ref={scrollRef}
        className={[
          shellClass,
          isMobile
            ? 'overflow-y-auto overflow-x-hidden hairline-scrollbar pb-6'
            : 'overflow-y-auto overflow-x-hidden hairline-scrollbar pb-6',
        ].join(' ')}
      >
        {!isMobile && showIntroHeader && (
          <IntroHeader
            phaseLabel={PHASES[phase]}
            streaming={introHeaderStreaming}
            onStreamComplete={onIntroStreamComplete}
          />
        )}
        <LegacyScrollBody
          state={state}
          derived={derived}
          fundingRoundOpen={fundingRoundOpen}
          showGenSection={showGenSection}
          showUpgSection={showUpgSection}
          showPromptButton={showPromptButton}
          showResources={showResources}
          promptLabel={promptLabel}
          handlers={handlers}
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={[
        shellClass,
        'overflow-y-auto overflow-x-hidden hairline-scrollbar pb-6',
      ].join(' ')}
    >
      <div className="border-b border-border pb-3">
        {!isMobile && showIntroHeader && (
          <IntroHeader
            phaseLabel={PHASES[phase]}
            streaming={introHeaderStreaming}
            onStreamComplete={onIntroStreamComplete}
            subtitleClassName="text-dimmer text-[12px] mb-4"
          />
        )}
        {showPromptButton && (
          <PromptButton state={state} label={promptLabel} onPrompt={handlers.prompt} />
        )}
        <ActionBar
          state={state}
          onPasteError={handlers.pasteError}
          onWriteTest={handlers.writeTest}
          onKickAgent={handlers.kickAgent}
          onRunTests={handlers.runTests}
          onClearContext={handlers.clearContext}
          onLaunch={handlers.launch}
          onLobstagramPost={handlers.lobstagramPost}
          onRunBugBounty={handlers.runBugBounty}
        />
      </div>

      <LowerTabBar
        tabs={lowerTabs}
        active={activeTab}
        onSelect={setActiveTab}
        badges={tabBadges}
      />

      <div className="pt-3">
        <TabbedBody
          state={state}
          derived={derived}
          fundingRoundOpen={fundingRoundOpen}
          showGenSection={showGenSection}
          showUpgSection={showUpgSection}
          activeTab={activeTab}
          showResources={showResources}
          handlers={handlers}
        />
      </div>
    </div>
  );
}
