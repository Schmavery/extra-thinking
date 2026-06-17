import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, LogEntry } from './types';
import { SAVE_INTERVAL_MS, STREAMING } from './game/constants';
import { mcpExecuting } from './game/mcpApproval';
import { MILESTONES, UI, mcpToolIsSafe } from './game/data';
import { deriveGame } from './game/derive';
import { getPhase } from './game/phases';
import { advanceTick } from './game/foregroundTick';
import { loadStateWithCatchup } from './game/snapshotPlay';
import { clearSave, defaultState, saveState } from './game/state';
import {
  isSaveEditorTabOpen,
  isSaveStorageKey,
  readSaveDiskSnapshot,
  shouldFollowDiskSnapshot,
  type SaveDiskSnapshot,
} from './game/saveSync';
import {
  getOrCreateHmrWriterSessionId,
  isHmrEnabled,
  loadGameBootState,
  registerHmrGameFlush,
  stashHmrState,
} from './lib/hmrGameSession';
import { appendLog } from './game/log';
import {
  buyGenAction,
  buyUpgradeAction,
  clearContextAction,
  kickAgentAction,
  launchAction,
  lobstagramPostAction,
  raiseRoundAction,
  pasteErrorAction,
  promptAction,
  runTestsAction,
  bugBountyAction,
  writeTestAction,
} from './game/actions';
import { mcpAllowAction, mcpAlwaysAllowAction, mcpDenyAction } from './game/mcpApproval';
import {
  computeQueuedUserEntries,
  queuedUserEntries as getQueuedUserEntries,
  syncQueuedUserFlags,
} from './lib/queuedUserLog';
import { isLogEntryFullyDisplayed, useStreamingLog } from './lib/useStreamingLog';
import { useForegroundGame } from './lib/useForegroundGame';
import { useGameActive } from './lib/useGameActive';
import { useRevealScrollbar } from './lib/useRevealScrollbar';
import { useSideGutterWheelScroll } from './lib/useSideGutterWheelScroll';
import { useIsMobile } from './lib/useWindowWidth';
import { FooterBarrel } from './components/FooterBarrel';
import { adjustMcMiniLane, nextFundingRound } from './game/investor';
import type { McMiniLane } from './game/investor';
import { LeftPanel } from './components/LeftPanel';
import { ConversationLog } from './components/ConversationLog';
import { Settings } from './components/Settings';
import { PauseOverlay } from './components/PauseOverlay';
import { debugToast } from './lib/debugToast';
import { applyPreset } from './debug/saveTools';
import { isDevUnlocked, subscribeDevUnlock } from './lib/devUnlock';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { GameIntro, introExitMs } from './components/GameIntro';
import { IntroHeader } from './components/IntroHeader';

const PHASES = UI.phases;
const FIRST_MILESTONE_LOC = MILESTONES[0]?.loc ?? 10;
/** After claiming writer, ignore foreign re-block for this long (ms). */
const CLAIM_GRACE_MS = 1_000;

export function Game() {
  const isMobile = useIsMobile();

  const sessionIdRef = useRef(getOrCreateHmrWriterSessionId());
  const bootFreshRef = useRef<boolean | null>(null);
  const [state, setState] = useState<GameState>(() => {
    const boot = loadGameBootState(sessionIdRef.current);
    bootFreshRef.current = boot.totalClicks === 0 && boot.log.length === 0;
    return boot;
  });
  const [introPhase, setIntroPhase] = useState<'splash' | 'exiting' | 'streaming' | 'ready'>(() =>
    bootFreshRef.current ? 'splash' : 'ready',
  );
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [blockedByOtherTab, setBlockedByOtherTab] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const persistedDiskRef = useRef<SaveDiskSnapshot>(readSaveDiskSnapshot());
  const pausedAtRef = useRef<number | null>(null);
  const gameRootRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  useRevealScrollbar(leftScrollRef);
  useSideGutterWheelScroll({
    enabled: !isMobile,
    captureRef: gameRootRef,
    boundsRef: mainAreaRef,
    leftRef: leftScrollRef,
    rightRef: logScrollRef,
  });

  const resetStreamRef = useRef<(syncLog?: LogEntry[]) => void>(() => {});

  const sessionLabel = useCallback(
    () => sessionIdRef.current.slice(0, 8),
    [],
  );

  const snapshotToDisk = useCallback((reason: string, snapshotState?: GameState) => {
    if (isSaveEditorTabOpen()) {
      debugToast(`save skipped · ${reason} · editor open`);
      return;
    }
    const toSave = snapshotState ?? stateRef.current;
    saveState(toSave, 'game', sessionIdRef.current);
    const disk = readSaveDiskSnapshot();
    persistedDiskRef.current = disk;
    setBlockedByOtherTab(false);
    debugToast(
      `save · ${reason} · rev=${disk.rev} · session=${disk.writerSessionId?.slice(0, 8) ?? '?'}`,
    );
  }, []);

  const snapshotToDiskRef = useRef(snapshotToDisk);
  snapshotToDiskRef.current = snapshotToDisk;

  const claimGraceUntilRef = useRef(0);

  const reloadFromDisk = useCallback(
    (reason: string, opts?: { blockOtherTab?: boolean }): GameState => {
      pausedAtRef.current = null;
      const disk = readSaveDiskSnapshot();
      persistedDiskRef.current = disk;
      const next = loadStateWithCatchup();
      stateRef.current = next;
      setState(next);
      resetStreamRef.current(next.log);
      const foreign =
        disk.writerSessionId != null && disk.writerSessionId !== sessionIdRef.current;
      if (
        opts?.blockOtherTab &&
        foreign &&
        Date.now() >= claimGraceUntilRef.current
      ) {
        setBlockedByOtherTab(true);
        debugToast('blocked · running in another tab');
      }
      debugToast(
        `reload · ${reason} · rev=${disk.rev} · ${foreign ? 'foreign' : 'own'} session · queued=${getQueuedUserEntries(next).length}`,
      );
      return next;
    },
    [],
  );

  const { isActive, isForeground } = useGameActive();
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const skipNextActivateRef = useRef(false);
  const blockedRef = useRef(blockedByOtherTab);
  blockedRef.current = blockedByOtherTab;

  const claimWriter = useCallback(() => {
    if (!blockedRef.current) return;
    setBlockedByOtherTab(false);
    const adopted = reloadFromDisk('claim writer', { blockOtherTab: false });
    skipNextActivateRef.current = true;
    snapshotToDisk('focus claim', adopted);
    claimGraceUntilRef.current = Date.now() + CLAIM_GRACE_MS;
    debugToast(`claim writer · adopted disk · session=${sessionLabel()}`);
  }, [reloadFromDisk, sessionLabel, snapshotToDisk]);

  const claimWriterRef = useRef(claimWriter);
  claimWriterRef.current = claimWriter;

  /** Another tab or the save editor wrote localStorage — adopt only via storage events. */
  const syncFromDisk = useCallback(
    (reason: string) => {
      const disk = readSaveDiskSnapshot();
      if (!shouldFollowDiskSnapshot(persistedDiskRef.current, disk, sessionIdRef.current)) {
        return;
      }
      const foreign =
        disk.writerSessionId != null && disk.writerSessionId !== sessionIdRef.current;

      if (foreign && (isActiveRef.current || Date.now() < claimGraceUntilRef.current)) {
        setBlockedByOtherTab(false);
        const adopted = reloadFromDisk(`${reason} · steal`, { blockOtherTab: false });
        snapshotToDisk(`${reason} steal`, adopted);
        claimGraceUntilRef.current = Date.now() + CLAIM_GRACE_MS;
        return;
      }

      reloadFromDisk(reason, { blockOtherTab: foreign });
    },
    [reloadFromDisk, snapshotToDisk],
  );

  const syncFromDiskRef = useRef(syncFromDisk);
  syncFromDiskRef.current = syncFromDisk;

  /** Tab refocused — catch up in memory only; never reload disk in the same tab. */
  const resumeGameplay = useCallback(() => {
    if (skipNextActivateRef.current) {
      skipNextActivateRef.current = false;
      debugToast(`resume · after claim · session=${sessionLabel()}`);
      return;
    }

    setBlockedByOtherTab(false);
    if (pausedAtRef.current == null) return;

    const elapsed = Date.now() - pausedAtRef.current;
    pausedAtRef.current = null;
    setState((prev) => {
      const next = elapsed > 0 ? advanceTick(prev, elapsed) : prev;
      requestAnimationFrame(() => snapshotToDisk('focus catchup', next));
      return next;
    });
    debugToast(`focus · catchup ${elapsed}ms · session=${sessionLabel()}`);
  }, [sessionLabel, snapshotToDisk]);

  const isGameplayActive = isActive && !blockedByOtherTab;

  // Blocked while still window-active: focus/click must claim — isGameplayActive won't flip.
  useEffect(() => {
    const tryClaim = () => {
      if (!blockedRef.current || !isActiveRef.current) return;
      claimWriterRef.current();
    };

    window.addEventListener('focus', tryClaim);
    window.addEventListener('pointerdown', tryClaim, true);
    const onVisibility = () => {
      if (!document.hidden) tryClaim();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', tryClaim);
      window.removeEventListener('pointerdown', tryClaim, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    return registerHmrGameFlush(() => {
      if (isSaveEditorTabOpen()) return undefined;
      const toSave = stateRef.current;
      saveState(toSave, 'game', sessionIdRef.current);
      stashHmrState(toSave, sessionIdRef.current);
      const disk = readSaveDiskSnapshot();
      persistedDiskRef.current = disk;
      return disk;
    });
  }, []);

  useEffect(() => {
    const disk = readSaveDiskSnapshot();
    debugToast(
      `mount · ${isHmrEnabled() ? 'hmr' : 'load'}+catchup · rev=${disk.rev} · session=${sessionLabel()} · writer=${disk.writerSessionId?.slice(0, 8) ?? '?'}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wasActiveDebugRef = useRef(isActive);
  useEffect(() => {
    if (wasActiveDebugRef.current === isActive) return;
    wasActiveDebugRef.current = isActive;
    debugToast(
      `active → ${isActive ? 'yes' : 'no'} · tab ${isForeground ? 'visible' : 'hidden'}`,
    );
  }, [isActive, isForeground]);

  // Snapshot on blur / tab hide. Pause time is recorded immediately; disk write
  // is deferred one frame so the last React commit is included.
  useEffect(() => {
    const snapshot = (reason: string) => {
      if (pausedAtRef.current == null) pausedAtRef.current = Date.now();
      requestAnimationFrame(() => snapshotToDisk(reason));
    };
    const onBlur = () => snapshot('blur');
    const onVisibility = () => {
      if (document.hidden) snapshot('tab hide');
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [snapshotToDisk]);

  useEffect(() => {
    const onUnload = () => snapshotToDisk('unload');
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [snapshotToDisk]);

  useForegroundGame({
    isActive: isGameplayActive,
    setState,
    onActivate: resumeGameplay,
  });

  const { displayLog, showThinking, isAnimating, spinTick, reset: resetStream } =
    useStreamingLog(state.log, state.logId, !isGameplayActive);
  resetStreamRef.current = resetStream;

  useEffect(() => {
    setState((prev) => syncQueuedUserFlags(prev, displayLog, isAnimating));
  }, [displayLog, isAnimating]);

  const [mcpSpinTick, setMcpSpinTick] = useState(0);
  const mcpRunning = mcpExecuting(state);
  useEffect(() => {
    if (!isGameplayActive || !mcpRunning) return;
    const id = setInterval(() => setMcpSpinTick((t) => t + 1), STREAMING.spinnerMs);
    return () => clearInterval(id);
  }, [isGameplayActive, mcpRunning, state.mcpExecutingUntil]);

  // Periodic backup while active. Memory is authoritative — never reload here.
  useEffect(() => {
    const id = setInterval(() => {
      if (!isGameplayActive) return;
      if (isSaveEditorTabOpen()) return;
      snapshotToDisk('autosave');
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isGameplayActive, snapshotToDisk]);

  // Another tab wrote or reset the save — reload without refresh.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!isSaveStorageKey(e.key)) return;
      syncFromDiskRef.current('storage event');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Dev unlock toggle — ephemeral AI lines (stream normally, omitted from saves).
  useEffect(() => {
    return subscribeDevUnlock(() => {
      const text = isDevUnlocked() ? 'debug mode enabled.' : 'debug mode disabled.';
      setState((prev) => appendLog(prev, text, 'info', { ephemeral: true }));
    });
  }, []);

  // Wrap each pure action in a setState. The argument signature ensures
  // accidentally calling an action with stale state is impossible.
  const dispatch = useCallback(
    <Args extends unknown[]>(fn: (s: GameState, ...args: Args) => GameState) =>
      (...args: Args) =>
        setState((prev) => {
          const next = fn(prev, ...args);
          requestAnimationFrame(() => snapshotToDiskRef.current('action', next));
          return next;
        }),
    [],
  );

  const handlers = useMemo(
    () => ({
      prompt: dispatch(promptAction),
      kickAgent: dispatch(kickAgentAction),
      pasteError: dispatch(pasteErrorAction),
      clearContext: dispatch(clearContextAction),
      runTests: dispatch(runTestsAction),
      runBugBounty: dispatch(bugBountyAction),
      launch: dispatch(launchAction),
      lobstagramPost: dispatch(lobstagramPostAction),
      raiseRound: dispatch(raiseRoundAction),
      adjustMcMiniLane: (lane: McMiniLane, delta: 1 | -1) =>
        setState((prev) => adjustMcMiniLane(prev, lane, delta)),
      mcpAllow: dispatch(mcpAllowAction),
      mcpAlwaysAllow: dispatch(mcpAlwaysAllowAction),
      mcpDeny: dispatch(mcpDenyAction),
      writeTest: dispatch(writeTestAction),
      buyGen: dispatch(buyGenAction),
      buyUpgrade: dispatch(buyUpgradeAction),
    }),
    [dispatch],
  );

  const handleResetConfirm = useCallback(() => {
    clearSave();
    const fresh = defaultState();
    saveState(fresh, 'game', sessionIdRef.current);
    persistedDiskRef.current = readSaveDiskSnapshot();
    setState(fresh);
    resetStream();
    setIntroPhase('splash');
  }, [resetStream]);

  const handleIntroRegister = useCallback(() => {
    if (introPhase !== 'splash') return;
    setIntroPhase('exiting');
    window.setTimeout(() => setIntroPhase('streaming'), introExitMs());
  }, [introPhase]);

  const handleIntroStreamComplete = useCallback(() => {
    setIntroPhase((p) => (p === 'streaming' ? 'ready' : p));
  }, []);

  const handleJumpToLaunch = useCallback(() => {
    const next = applyPreset('jump_launch', stateRef.current);
    if (!next) return;
    stateRef.current = next;
    setState(next);
    resetStream(next.log);
    snapshotToDisk('jump to launch', next);
    const hasAutocomplete = next.upgrades.includes('autocomplete');
    debugToast(`jump to launch · ${hasAutocomplete ? 'autocomplete' : 'no harness'} · launch ready`);
  }, [resetStream, snapshotToDisk]);

  // ── derived ──
  const derived = deriveGame(state);
  const mcpPendingUnsafe =
    state.mcpActiveToolId != null && !mcpToolIsSafe(state.mcpActiveToolId);
  const mcpUnsafePolicyBlocked =
    state.mcpApprovalPending != null &&
    state.mcpAutoApproveAt == null &&
    mcpPendingUnsafe &&
    derived.hasFlag('mcp_auto_approve');
  const phase = getPhase(state);
  const showLog = state.log.length >= 1;
  const { showRaiseRound } = derived.ui;
  const fundingRoundOpen = showRaiseRound && nextFundingRound(state) !== undefined;

  const queuedUserEntries = useMemo(
    () => computeQueuedUserEntries(state.log, displayLog, isAnimating),
    [displayLog, state.log, isAnimating],
  );

  const showResources = useMemo(() => {
    if (!state.started) return false;
    const firstReply = state.log.find((e) => e.type === 'info');
    if (!firstReply) return true;
    return isLogEntryFullyDisplayed(firstReply.id, state.log, displayLog);
  }, [state.started, state.log, displayLog]);

  const postStartupUi = useMemo(() => {
    if (!state.milestonesSeen.includes(FIRST_MILESTONE_LOC)) return false;
    const entry = state.log.find((e) => e.type === 'milestone');
    if (!entry) return false;
    return isLogEntryFullyDisplayed(entry.id, state.log, displayLog);
  }, [state.log, state.milestonesSeen, displayLog]);

  const promptLabel = !postStartupUi
    ? 'build me a startup'
    : state.totalClicks < 20
      ? 'prompt the AI'
      : 'keep going';

  const showResetButton = postStartupUi && state.totalLoc > 0;
  const showPromptButton = introPhase === 'ready';
  const introHeaderStreaming = introPhase === 'streaming';
  const showIntroHeader = introPhase === 'ready' || introHeaderStreaming;
  const splashPhase =
    introPhase === 'splash' ? 'splash' : introPhase === 'exiting' ? 'exiting' : 'done';
  const introBlockClass = introPhase === 'splash' ? 'pointer-events-none' : '';

  return (
    <div
      ref={gameRootRef}
      className={[
        'h-screen bg-bg text-fg font-mono text-[14px] leading-[1.65] flex flex-col relative overflow-x-hidden overflow-y-visible',
        isMobile ? 'px-[14px] pt-[14px] pb-2' : 'px-6 pt-7 pb-2',
      ].join(' ')}
    >
      <Settings onJumpToLaunch={handleJumpToLaunch} />

      {!isForeground && <PauseOverlay message="processing in background…" />}
      {isForeground && blockedByOtherTab && (
        <PauseOverlay message="running in another tab…" blockInput />
      )}

      <GameIntro phase={splashPhase} onRegister={handleIntroRegister} />

      {isMobile && showIntroHeader && (
        <div className={['flex-shrink-0 mb-2', introBlockClass].join(' ')}>
          <IntroHeader
            phaseLabel={PHASES[phase]}
            streaming={introHeaderStreaming}
            onStreamComplete={handleIntroStreamComplete}
            subtitleClassName="text-dimmer text-[12px]"
          />
        </div>
      )}

      <div
        ref={mainAreaRef}
        className={[
          isMobile
            ? 'w-full flex-1 min-h-0 flex flex-col overflow-hidden'
            : 'w-full flex-1 min-h-0 overflow-hidden',
          introBlockClass,
        ].join(' ')}
      >
        <div
          className={
            isMobile
              ? 'w-full h-full flex flex-col overflow-hidden'
              : 'max-w-[940px] w-full mx-auto h-full grid grid-rows-[1fr] gap-10 overflow-hidden ' +
                (showLog ? 'grid-cols-[420px_1fr]' : 'grid-cols-[420px]')
          }
        >
        {/* ── Left ── */}
        <LeftPanel
          scrollRef={leftScrollRef}
          isMobile={isMobile}
          phase={phase}
          state={state}
          derived={derived}
          fundingRoundOpen={fundingRoundOpen}
          showPromptButton={showPromptButton}
          showResetButton={showResetButton}
          showResources={showResources}
          promptLabel={promptLabel}
          introHeaderStreaming={introHeaderStreaming}
          showIntroHeader={showIntroHeader}
          onIntroStreamComplete={handleIntroStreamComplete}
          handlers={handlers}
          onResetClick={() => setResetConfirmOpen(true)}
        />

        {/* ── Right (or top, on mobile) ── */}
        {showLog && (
          <ConversationLog
            displayLog={displayLog}
            queuedUserEntries={queuedUserEntries}
            isMobile={isMobile}
            scrollContainerRef={logScrollRef}
            mcpApprovalMessage={state.mcpApprovalPending}
            mcpShowAlwaysAllow={derived.hasFlag('mcp_auto_approve')}
            mcpUnsafePolicyBlocked={mcpUnsafePolicyBlocked}
            mcpPendingUnsafe={mcpPendingUnsafe}
            mcpExecutingMessage={mcpRunning ? state.mcpExecutingLine : null}
            showThinking={showThinking || mcpRunning}
            phase={phase}
            spinTick={mcpRunning ? mcpSpinTick : spinTick}
            onMcpAllow={handlers.mcpAllow}
            onMcpAlwaysAllow={handlers.mcpAlwaysAllow}
            onMcpDeny={handlers.mcpDeny}
          />
        )}
        </div>
      </div>

      <div className={introBlockClass}>
        <FooterBarrel />
      </div>

      {resetConfirmOpen && (
        <ResetConfirmModal
          onConfirm={handleResetConfirm}
          onClose={() => setResetConfirmOpen(false)}
        />
      )}
    </div>
  );
}

// Keep `appendLog` exported via the module so test suites / consoles can reach it.
export { appendLog };
