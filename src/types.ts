export interface AccountDef {
  id: string;
  name: string;
  /** Flavor line for logs and shop — parody marketing, not mechanics. */
  desc: string;
  baseCost: number;
  costMult: number;
  unlockAt: number;
  /** Tok capacity for the first signup (free tier). */
  freeMaxTokens: number;
  freeTokenRegen: number;
  /** Tok capacity per stack after `pro_plan` (paid tier). */
  paidMaxTokens: number;
  paidTokenRegen: number;
  /** Per extra signup after the first (requires `rotate_accounts`). */
  extraMaxTokens: number;
  extraTokenRegen: number;
  /** $/s burn per owned stack once `pro_plan` is active. */
  moneyPerSec?: number;
}

/** @deprecated Alias — generators.yaml holds service accounts only. */
export type GenDef = AccountDef;

/**
 * Definition of an upgrade. Effect fields are optional and combine with
 * different semantics depending on the field — see comments inline.
 */
export interface UpgDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  unlockAt: number;

  // ── click effects ──
  /** Multiplied across all owned upgrades. */
  clickMult?: number;
  /** Summed across all owned upgrades. */
  clickBonus?: number;

  // ── harness effects (owned once; LOC/s × code machines) ──
  /** Passive LOC/s while owned. */
  locPerSec?: number;
  /** Context drained per second per code machine while owned. */
  tokenDrainPerSec?: number;
  /** Bug spawn/s while owned. */
  bugsPerSec?: number;
  /** Passive fix/s while owned. */
  fixPerSec?: number;
  /** Per-harness id: multiplicative LOC/s. */
  harnessLocMult?: Record<string, number>;
  /** Per-harness id: additive LOC/s. */
  harnessLocBonus?: Record<string, number>;
  /** $/s burn per code machine once `pro_plan` is active. */
  moneyPerSec?: number;

  // ── legacy generator effects (deprecated — use harness* fields) ──
  /** @deprecated Use `harnessLocMult`. */
  genLocMult?: Record<string, number>;
  /** @deprecated Use `harnessLocBonus`. */
  genLocBonus?: Record<string, number>;
  /** Multiplied across all owned upgrades. */
  globalMult?: number;
  /** Multiplied across all owned upgrades. */
  bugMult?: number;
  /** Last-owned-wins (later upgrades override earlier ones). */
  reviewLocMult?: number;
  /** Last-owned-wins (later upgrades override earlier ones). */
  reviewBugMult?: number;
  /** Multiplies McMini code LOC/s. Last-owned-wins. */
  agentLocMult?: number;
  /** Additive flat LOC/s while `kick_agent` buff is active (independent of generators). */
  kickAgentLocPerSec?: number;
  /** Additive tokens spent per `kick_agent` (stacks across owned upgrades). */
  kickAgentTokenCostBonus?: number;
  /** Additive tokens spent per `prompt` (stacks across owned upgrades). */
  promptTokenCostBonus?: number;
  /** Additive tokens spent per `paste_error` (stacks across owned upgrades). */
  pasteErrorTokenCostBonus?: number;
  /** Additive fix chance for `paste_error` (stacks; capped at 1). */
  pasteErrorFixChanceBonus?: number;
  /** Per-test bug-fix rate from CI. Summed across owned upgrades. */
  testFixRate?: number;

  // ── token effects (additive across owned upgrades) ──
  maxTokensBonus?: number;
  tokenRegenBonus?: number;

  // ── nines & bug bounty (additive across owned upgrades) ──
  /** Constant nines-per-second bleed. */
  ninesPerSec?: number;
  /** Nines-per-second per outstanding bug. */
  ninesPerBugSec?: number;
  /**
   * Auto-drains bugs at `bugs * rate` per second. Max-wins across owned
   * upgrades — a later upgrade with a larger rate replaces an earlier one
   * rather than stacking.
   */
  autoBugDrainRate?: number;

  // ── money / burn ──
  /** Multiplies generator burn ($/s). Stacks multiplicatively across owned upgrades. */
  genBurnMult?: number;
  /** @deprecated Flat $/s burn — use `genBurnMult` + generator `moneyPerSec`. */
  moneyCostPerSec?: number;
  /** When set true and owned, enables money revenue/cost flow. */
  enablesMoney?: boolean;

  // ── meta / gating ──
  /** Required upgrade ids that must be owned to unlock this one. */
  requires?: string[];
  /** Player must have launched (`state.launched === true`). */
  requiresLaunch?: boolean;
  /** Minimum closed funding rounds before this appears in the shop (`fundingRound` counter). */
  requiresMinFundingRound?: number;
  /** When purchased, raises the nines counter to at least this value. */
  ninesFloor?: number;
  /** Flavor line shown in the conversation log when this upgrade is bought. */
  purchaseMsg?: string;
  /** Prompt action cooldown (ms). Min-wins across owned upgrades vs `actions.yaml` base. */
  promptCooldownMs?: number;

  /**
   * Feature flags this upgrade grants while owned. See `GAME_FLAGS` in
   * `src/game/flags.ts` for the vocabulary.
   */
  flags?: string[];
  /**
   * While this upgrade is not yet owned, it only enters the unlock shop when
   * uptime nines (from bugs) are at least this value.
   */
  unlockMinUptimeNines?: number;
  /**
   * Shop unlock only when uptime nines (from current bugs) are at most this
   * value — crisis upgrades when reliability has collapsed.
   */
  unlockMaxUptimeNines?: number;
  /**
   * Overrides entries in `THRESHOLDS` while this upgrade is owned (e.g. lower
   * `showBugBountyBugs` once nines meta is in play). Later upgrades in
   * `upgrades.yaml` win on duplicate keys.
   */
  thresholdOverrides?: Partial<
    Record<
      | 'showGeneratorsLoc'
      | 'showUpgradesLoc'
      | 'showPasteErrorBugs'
      | 'showKickAgentClicks'
      | 'showWriteTestsBugs'
      | 'showWriteTestsMinLoc'
      | 'showRunTestsTests'
      | 'showClearContextLoc'
      | 'showClearContextMinTokens'
      | 'showBugBountyBugs'
      | 'showNewFreeAccountTokens',
      number
    >
  >;
}

export interface EventDef {
  text: string;
  locMult?: number;
  locDelta?: number;
  type: 'info' | 'bad' | 'event';
  minLoc: number;
  requiresLaunch?: boolean;
  requires?: string[];
  /** McMinis era: spawns a subagent log card instead of a dialogue line. */
  subagent?: boolean;
}

/** Industry headlines in `data/news.yaml` — never repeat; keyed by `id`. */
export interface NewsDef {
  id: string;
  text: string;
  minLoc: number;
  /** When true, fires once on tick when `totalLoc` reaches `minLoc` (not random pool only). */
  guaranteed?: boolean;
  requiresLaunch?: boolean;
  requires?: string[];
}

/** One fake tool invocation in `data/mcp.yaml` (`tools` pool). */
export type McpToolDef = {
  id: string;
  /** When true, `always_allow` may auto-approve; unsafe beats need Allow/Deny. */
  safe: boolean;
  /** Log line after the tool card is approved (per tool). */
  onAllow: string;
  /** Log line when the player denies this tool; required when `safe: false`. */
  onDeny?: string;
} & (
  | {
      tool: 'CallMcpTool';
      server: string;
      toolName: string;
      args: string;
    }
  | { tool: 'Shell'; command: string; output?: string }
  /** `snippet` — fake bytes the agent “read” (not a meta caption). */
  | { tool: 'Read'; path: string; snippet?: string }
  | { tool: 'Write'; path: string; preview?: string; output?: string }
);

/** MCP tool-call definitions in `data/mcp.yaml`. */
export interface McpCopy {
  /** Extra ack line after unsafe `onAllow` (non-YOLO). */
  unsafeAllowLeakAck: string[];
  tools: McpToolDef[];
}

export type LogEntryType =
  | 'info'
  | 'bad'
  | 'event'
  | 'news'
  | 'milestone'
  | 'system'
  | 'tool'
  | 'subagent'
  | 'user';

/**
 * Per-action data record — see `data/actions.yaml`. All numeric fields are
 * optional because each action only uses a subset; required fields are
 * enforced at use-sites by the corresponding action reducer.
 */
export interface ActionDef {
  id: string;

  // Common knobs
  tokenCost?: number;
  cooldownMs?: number;
  eventProbability?: number;
  /** Min ms between flavor log lines (bug-fix actions share `lastBugFixLogTime`). */
  logCooldownMs?: number;

  // Random message pools (Handlebars-templated)
  messages?: string[];

  // prompt — scripted log beats before `eventProbability` / random events
  earlyPromptMsgs?: string[];

  // kick_agent
  buffMs?: number;
  /** Task headings on subagent cards (Handlebars-templated). */
  subagentTasks?: string[];

  // paste_error
  fixChance?: number;
  baseLocGain?: number;
  extraLocRange?: number;
  goodMessages?: string[];
  badMessages?: string[];
  neutralMessages?: string[];

  // run_tests
  /** Min bugs fixed per run ≈ `floor(tests × this)`. */
  fixesMinPerTest?: number;
  /** Max bugs fixed per run ≈ `floor(tests × this)`. */
  fixesMaxPerTest?: number;
  /** Tokens spent = `tests * this` (replaces legacy LOC cost). */
  perTestTokenCost?: number;

  // bug_bounty
  maxConvertedPerRun?: number;
  ninesPerBug?: number;
  runMsg?: string;

  // new_free_account
  maxTokensPerExtra?: number;
  tokenRegenPerExtra?: number;

  // write_test
  baseCost?: number;
  costMult?: number;
  /** Per-test bug-rate damping factor (`1 / (1 + tests * this)`). */
  bugDamping?: number;
  milestones?: { count: number; text: string }[];
  /** One-shot AI line when this action first becomes available. */
  introMsg?: string;

  // buy_gen
  firstPurchaseMsg?: string;

  // lobstagram_post
  buzzGain?: number;
  /** First post costs `tokenCost * this`; each prior post adds `tokenCostStep`. */
  tokenCostMult?: number;
  tokenCostStep?: number;
}

/** Per-McMini lane assignment; counts must sum to `mcMinis`. */
export interface McMiniLanes {
  code: number;
  growth: number;
  tests: number;
}

export interface LogEntry {
  id: number;
  text: string;
  type: LogEntryType;
  /** User line waiting behind earlier log playback; cleared once streamed in. */
  queued?: boolean;
  /** Id of the first entry from the same `appendLog` call (multi-line events). */
  burstId?: number;
  /** Ms for `useStreamingLog` to drain this entry; fixed in `appendLog`. */
  streamMs?: number;
  /** Jump to front of pending queue once the current line finishes. */
  priority?: boolean;
  /** Front of queue + no token animation (MCP tool cards, etc.). */
  instant?: boolean;
  /** Short post-approve line under an MCP `tool` entry body. */
  toolAck?: string;
  /** Dev/session-only line — stripped before persisting to localStorage. */
  ephemeral?: boolean;
  /** Wall-clock ms when a `subagent` card shows ✓ instead of the spinner. */
  subagentExpiresAt?: number;
  /** Wall-clock ms when the subagent card was enqueued. */
  subagentStartedAt?: number;
}

export interface GameState {
  loc: number;
  bugs: number;
  /** Cumulative bugs ever gained; sticky `showBugs` once `lifetimeBugs > 1`. */
  lifetimeBugs: number;
  tests: number;
  accountCounts: Record<string, number>;
  /** @deprecated Migrated to `accountCounts` on load. */
  genCounts?: Record<string, number>;
  /** @deprecated Migrated to `accountCounts` on load. */
  freeAccounts?: number;
  totalLoc: number;
  totalClicks: number;
  totalTokensSpent: number;
  minTokensSeen: number;
  upgrades: string[];
  log: LogEntry[];
  logId: number;
  lastEventTime: number;
  lastBugFixLogTime: number;
  actionCooldowns: Record<string, number>;
  milestonesSeen: number[];
  started: boolean;
  /** Loc-10 milestone streamed; post-opening prompt label and UI. */
  introSequenceComplete: boolean;
  launched: boolean;
  /** Legacy save field; random pools dedupe from the recent log window now. */
  usedEventIds: string[];
  /** Action ids whose `introMsg` has been shown (one-shot per save). */
  actionsIntroduced?: string[];
  /** Stable ids from `data/news.yaml`; each headline fires at most once per save. */
  usedNewsIds: string[];
  tokens: number;
  /** 0–100; resets on fundraise. */
  buzzMeter: number;
  /** Lobstagram posts this save; escalates `lobstagram_post` token cost. */
  lobstagramPosts?: number;
  /** Index into `INVESTOR.fundingRounds`; 0 = next round is seed. */
  fundingRound: number;
  mcMinis: number;
  mcMiniLanes: McMiniLanes;
  /** Legacy `kick_agent` buff; unused once McMinis are deployed. */
  agentBuffExpires: number;
  unlockedUpgrades: string[];
  nines: number;
  /** MCP tool-call line awaiting Allow/Deny; null when idle. */
  mcpApprovalPending: string | null;
  /** Always-allow: fire `mcpAllow` after this timestamp (card still shown first). */
  mcpAutoApproveAt: number | null;
  /** While set, prompt/actions blocked and UI shows post-allow spinner until ack. */
  mcpExecutingUntil: number | null;
  /** Tool-call text kept visible during the post-allow spinner. */
  mcpExecutingLine: string | null;
  /** `data/mcp.yaml` tool `id` for pending/execute (per-tool onAllow/onDeny). */
  mcpActiveToolId: string | null;
}
