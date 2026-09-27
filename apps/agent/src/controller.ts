import {
  drillCardsForProblem,
  evaluateAnswer,
  formatDuration,
  getCard,
  getProblem,
  heuristicEvaluation,
  isNonAnswer,
  isWithinActiveHours,
  LINK_FAILURE_WINDOW_MS,
  localDayKey,
  localHour,
  normalizeHandle,
  normalizeTapback,
  parseTextGrade,
  shiftDayKey,
  tagLabel,
  tapbackToGrade,
  WEAKNESS_WEIGHTS,
  type ActiveHours,
  type Evaluation,
  type EvaluationInput,
  type Grade,
  type GradeOutcome,
  type NextCardPick,
  type PendingProbe,
  type Problem,
  type ReviewCard,
  type SpaceIdentity,
  type SynapseConfig,
  type SynapseStore,
  type Tag,
  type TapbackKind,
  type User,
} from "@synapse/core";
import { parseCommand, textAsTapback, type Command } from "./commands";
import * as M from "./messages";
import { maskHandle, redact } from "./redact";
import { AgentState, spaceScope, userScope } from "./state";
import { activeMsBetween } from "./timing";

/** The slice of a Spectrum `Space` the controller needs (keeps it testable with a fake). */
export interface ChatSpace {
  readonly id: string;
  /** iMessage spaces are "dm" or "group"; other providers leave it unset. */
  readonly type?: string;
  /** The iMessage line (Synapse number) the chat is on; needed to rebuild the space when a project has several lines. */
  readonly phone?: string;
  send(text: string): Promise<{ id?: string } | undefined | void>;
  /** Shows a typing indicator while `fn` runs. */
  responding?<T>(fn: () => Promise<T>): Promise<T>;
}

/** Who sent an inbound message, when the platform tells us. */
export interface SenderInfo {
  handle?: string | null;
  displayName?: string | null;
  platform?: string | null;
}

/**
 * Group chats are never served: any member could answer, rate or pause
 * someone else's cards, and the answer key would leak to the group. iMessage
 * group chat ids contain ";+;" (the provider's own dm/group rule).
 */
export function isGroupSpaceId(spaceId: string): boolean {
  return spaceId.includes(";+;");
}

export function isGroupSpace(space: { readonly id: string; readonly type?: string }): boolean {
  return space.type === "group" || isGroupSpaceId(space.id);
}

/** The other party of an iMessage DM ("iMessage;-;+13145550101" → "+13145550101"). */
export function dmPeer(spaceId: string): string | undefined {
  return /;-;(.+)$/.exec(spaceId)?.[1];
}

export interface AgentPolicy {
  activeHours: ActiveHours;
  maxDailyPushes: number;
  /** Outstanding probes idle for this long (in active-hours time) expire; answered-but-unrated ones get the evaluator's grade. */
  probeTtlMs: number;
  /** Minimum quiet time after a push or an inbound message before the next proactive push. */
  pushGapMs: number;
  webUserId: string;
  webUrl: string;
  /** Recorded on users created from this agent ("imessage", "terminal", …). */
  platform: string;
  /** SYNAPSE_OWNER_HANDLE: the only texter whose 'start' may link the web user without a code. */
  ownerHandle: string | null;
}

/**
 * Real-time floor for probe expiry. The spec's dayMs / 4 is 15 s at demo scale
 * (SYNAPSE_DAY_MS=60000), too short for a person to read, answer and tap.
 */
export const MIN_PROBE_TTL_MS = 3 * 60_000;

/**
 * Real-time floor for the push cooldown. dayMs / 48 is 30 min at real scale but
 * 1.25 s at demo scale, which pushed a fresh card within one tick of every rating.
 */
export const MIN_PUSH_GAP_MS = 30_000;

/** A changed tapback on the feedback re-grades the card for this long. */
export const REGRADE_WINDOW_MS = 10 * 60_000;

/** At most one "I can only read text" notice per chat in this window. */
const TEXT_ONLY_NOTICE_GAP_MS = 10 * 60_000;
/** Probes older than this (wall clock) are stale whatever the active hours. */
const STALE_WALL_CAP_MS = 14 * 86_400_000;
/** The morning briefing's "☕ Morning" label ends at noon (or an hour after a late SYNAPSE_MORNING_HOUR). */
const MORNING_LABEL_UNTIL_HOUR = 12;

/** Fills policy defaults from the store's scheduling policy (SRS day length). */
export function resolveAgentPolicy(store: SynapseStore, overrides: Partial<AgentPolicy> = {}): AgentPolicy {
  const { dayMs } = store.policy;
  return {
    activeHours: overrides.activeHours ?? { startHour: 8, endHour: 22 },
    maxDailyPushes: overrides.maxDailyPushes ?? 12,
    probeTtlMs: overrides.probeTtlMs ?? Math.max(Math.round(dayMs / 4), MIN_PROBE_TTL_MS),
    pushGapMs: overrides.pushGapMs ?? Math.max(Math.round(dayMs / 48), MIN_PUSH_GAP_MS),
    webUserId: overrides.webUserId ?? "me",
    webUrl: overrides.webUrl ?? "http://localhost:3000",
    platform: overrides.platform ?? "imessage",
    ownerHandle: overrides.ownerHandle ?? null,
  };
}

/** Agent policy from the validated env config. */
export function agentPolicyFromConfig(config: SynapseConfig, platform = "imessage"): Partial<AgentPolicy> {
  return {
    activeHours: config.activeHours,
    maxDailyPushes: config.maxDailyPushes,
    probeTtlMs: Math.max(config.probeTtlMs, MIN_PROBE_TTL_MS),
    webUserId: config.webUserId,
    webUrl: config.webUrl,
    platform,
    ownerHandle: config.ownerHandle ?? null,
  };
}

export type Evaluator = (input: EvaluationInput) => Promise<Evaluation>;

export interface StudyControllerDeps<S extends ChatSpace> {
  store: SynapseStore;
  policy?: Partial<AgentPolicy>;
  /** Defaults to core's evaluateAnswer (LLM with heuristic fallback). */
  evaluate?: Evaluator;
  now?: () => number;
  /**
   * Rebuilds a Space for proactive sends when it was not seen inbound since
   * startup. `hints.phone` is the line the chat last arrived on (persisted).
   */
  resolveSpace?: (spaceId: string, user: User, hints: SpaceHints) => Promise<S | undefined> | S | undefined;
  /** Receives redacted lines (phone numbers and emails masked). */
  log?: (line: string) => void;
  /** Log message text (SYNAPSE_VERBOSE). Off by default: texts are answers and chat content. */
  logText?: boolean;
  /** Pause before retrying a send that failed after a grade was saved. */
  sendRetryDelayMs?: number;
}

/** What the controller remembers about a chat for rebuilding it after a restart. */
export interface SpaceHints {
  phone?: string;
}

export type TickSkipReason =
  | "unlinked"
  | "not-started"
  | "paused"
  | "busy"
  | "outstanding"
  | "quiet-hours"
  | "daily-cap"
  | "cooldown"
  | "drill-soon"
  | "no-space"
  | "group-chat"
  | "nothing-due"
  | "error";

export interface TickResult {
  userId: string;
  action: "sent" | "skipped";
  reason?: TickSkipReason;
  cardId?: string;
  /** A briefing ("☕ Morning Synapse" or an afternoon "🧠 Synapse check-in") preceded the probe. */
  morning?: boolean;
  /** Card whose unanswered probe expired during this tick. */
  expiredCardId?: string;
  /** Card whose answered-but-unrated probe went stale and got the evaluator's grade. */
  gradedCardId?: string;
  /** Unanswered card set aside so a due IDE drill could go out. */
  preemptedCardId?: string;
}

export interface TickReport {
  at: number;
  results: TickResult[];
}

type DeliveryMode = "push" | "pull" | "link";

interface Delivery {
  sent: boolean;
  cardId?: string;
  morning?: boolean;
}

/** The last card shown, so 'why' and ❓/‼️ on its messages still work after it is graded. */
interface LastCard {
  cardId: string;
  messageIds: string[];
}

/** The last rating applied from feedback, so a changed tapback on that feedback can replace it. */
interface GradeMemo {
  cardId: string;
  grade: Grade;
  reviewId: number;
  /** The `now` the review was graded with. */
  at: number;
  /** Tapbacks on these messages (the feedback, or the message that was tapped) re-grade the card. */
  messageIds: string[];
  answer: string | null;
  verdict: Evaluation | null;
}

interface LockEntry {
  tail: Promise<void>;
  depth: number;
}

/** A send failed after the grade was already saved: reply with `fallback`, not "try again". */
class CommittedSendError extends Error {
  constructor(
    readonly fallback: string,
    cause: unknown,
  ) {
    super(`send failed after the grade was saved: ${describeError(cause)}`);
    this.name = "CommittedSendError";
  }
}

const SUPPORTED_RATINGS: ReadonlySet<TapbackKind> = new Set(["love", "like", "dislike"]);
const LAST_CARD_MAX_IDS = 12;

/**
 * The iMessage study loop: probes, Socratic grading, tapback ratings, commands
 * and the proactive scheduler. Platform-agnostic: it only needs ChatSpace.
 * Every inbound message and every per-user tick runs under a per-space lock,
 * so a tick and a 'more' can never both send a probe. State that must survive
 * a restart lives in the agent_state table (see state.ts).
 */
export class StudyController<S extends ChatSpace = ChatSpace> {
  readonly store: SynapseStore;
  readonly policy: AgentPolicy;
  private readonly evaluate: Evaluator;
  private readonly clock: () => number;
  private readonly log: (line: string) => void;
  private readonly logText: boolean;
  private readonly retryDelayMs: number;
  private readonly state: AgentState;
  private readonly spaces = new Map<string, S>();
  private readonly locks = new Map<string, LockEntry>();
  private readonly inflight = new Set<Promise<unknown>>();

  constructor(private readonly deps: StudyControllerDeps<S>) {
    this.store = deps.store;
    this.policy = resolveAgentPolicy(deps.store, deps.policy);
    this.evaluate = deps.evaluate ?? ((input) => evaluateAnswer(input));
    this.clock = deps.now ?? Date.now;
    const sink = deps.log ?? ((line: string) => console.info(`[synapse-agent] ${line}`));
    this.log = (line) => sink(redact(line));
    this.logText = deps.logText ?? false;
    this.retryDelayMs = deps.sendRetryDelayMs ?? 750;
    this.state = new AgentState(deps.store);
  }

  // ── Public entry points ──────────────────────────────────────────────────

  /** Caches a Space seen inbound so proactive sends can reuse it. */
  rememberSpace(space: S): void {
    if (isGroupSpace(space)) return;
    this.spaces.set(space.id, space);
    const phone = typeof space.phone === "string" ? space.phone.trim() : "";
    if (phone && this.spaceHints(space.id).phone !== phone) {
      const now = this.clock();
      this.state.set(spaceScope(space.id), "phone", phone, now);
    }
  }

  handleText(space: S, text: string, sender: SenderInfo = {}): Promise<void> {
    if (isGroupSpace(space)) return Promise.resolve();
    this.rememberSpace(space);
    return this.exclusive(space.id, () => this.guard(space, "text", () => this.onText(space, text, sender)));
  }

  /**
   * Tapbacks resolve the texter by chat only: a reaction never re-binds an
   * account to another chat (the provider reports reactions on every message
   * in every chat the line is in).
   */
  handleReaction(space: S, emoji: string, targetId?: string | null, _sender: SenderInfo = {}): Promise<void> {
    if (isGroupSpace(space)) return Promise.resolve();
    this.rememberSpace(space);
    return this.exclusive(space.id, () =>
      this.guard(space, "reaction", async () => {
        const user = this.store.findUserBySpace(space.id);
        const kind = normalizeTapback(emoji);
        if (!user || !kind) return;
        const now = this.clock();
        this.touch(user.id, now);
        await this.onTapback(space, user, kind, targetId ?? undefined, now);
      }),
    );
  }

  /** Voice memos, photos and other non-text messages from a known texter get one short "text only" notice. */
  handleUnsupported(space: S): Promise<void> {
    if (isGroupSpace(space)) return Promise.resolve();
    this.rememberSpace(space);
    return this.exclusive(space.id, () =>
      this.guard(space, "unsupported", async () => {
        const user = this.store.findUserBySpace(space.id);
        if (!user) return;
        const now = this.clock();
        this.touch(user.id, now);
        const scope = spaceScope(space.id);
        const noticed = this.state.get<number>(scope, "textOnlyNoticeAt");
        if (noticed !== undefined && now - noticed < TEXT_ONLY_NOTICE_GAP_MS) return;
        this.state.set(scope, "textOnlyNoticeAt", now, now);
        await this.say(space, M.textOnly());
      }),
    );
  }

  /**
   * SYNAPSE_OWNER_HANDLE at startup: binds the owner's DM to the unlinked web
   * user, says hello and delivers the first card right away (so the first tick
   * does not race a "reply 'more'" instruction). Null when already linked.
   */
  linkOwner(space: S, handle: string): Promise<User | null> {
    this.rememberSpace(space);
    return this.exclusive(space.id, async () => {
      const now = this.clock();
      const linked = this.linkWebUser({ spaceId: space.id, handle, platform: this.policy.platform }, now);
      if (!linked) return null;
      this.log(`linked owner ${maskHandle(handle)} → ${linked.id} (space ${space.id})`);
      await this.say(space, M.ownerHello(this.policy.webUrl));
      await this.deliverOrCaughtUp(space, linked.id, now, "link");
      return linked;
    });
  }

  /**
   * One scheduler pass: for each linked, unpaused user, retire a stale probe,
   * then (inside active hours, under the daily cap, with nothing outstanding
   * and past the cooldown) send the briefing and/or the next due card.
   */
  async tick(now: number = this.clock()): Promise<TickReport> {
    const jobs = this.store.listUsers().map((user): Promise<TickResult> => {
      if (!user.spaceId) return Promise.resolve({ userId: user.id, action: "skipped", reason: "unlinked" });
      if (this.locks.has(user.spaceId)) return Promise.resolve({ userId: user.id, action: "skipped", reason: "busy" });
      return this.exclusive(user.spaceId, async () => {
        try {
          return await this.pushForUser(user.id, now);
        } catch (error) {
          this.log(`tick failed for ${user.id}: ${describeError(error)}`);
          return { userId: user.id, action: "skipped", reason: "error" } satisfies TickResult;
        }
      });
    });
    return { at: now, results: await Promise.all(jobs) };
  }

  /** Resolves once every queued message/tick has finished (tests, shutdown). */
  async idle(): Promise<void> {
    while (this.inflight.size > 0) await Promise.allSettled([...this.inflight]);
  }

  // ── Concurrency ──────────────────────────────────────────────────────────

  private exclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
    const entry = this.locks.get(key) ?? { tail: Promise.resolve(), depth: 0 };
    entry.depth += 1;
    this.locks.set(key, entry);
    const run = entry.tail.then(work).finally(() => {
      entry.depth -= 1;
      if (entry.depth === 0 && this.locks.get(key) === entry) this.locks.delete(key);
    });
    entry.tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.inflight.add(run);
    void entry.tail.then(() => this.inflight.delete(run));
    return run;
  }

  private async guard(space: S, what: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.log(`${what} handler failed in ${space.id}: ${describeError(error)}`);
      const reply = error instanceof CommittedSendError ? error.fallback : M.glitch();
      await space.send(reply).catch(() => undefined);
    }
  }

  // ── Identity ─────────────────────────────────────────────────────────────

  private identity(space: S, sender: SenderInfo): SpaceIdentity {
    return {
      spaceId: space.id,
      // The platform's own dm/group flag, so core's group guard does not rely only on the iMessage ";+;" GUID.
      spaceType: isGroupSpace(space) ? "group" : space.type === "dm" ? "dm" : null,
      handle: sender.handle ?? null,
      displayName: sender.displayName ?? null,
      platform: sender.platform ?? this.policy.platform,
    };
  }

  /**
   * The sender's handle when it can vouch for this chat: never in a group, and
   * in an iMessage DM only if it is the DM's other party.
   */
  private trustedHandle(space: S, identity: SpaceIdentity): string | null {
    const handle = identity.handle?.trim();
    if (!handle || isGroupSpace(space)) return null;
    const peer = dmPeer(space.id);
    return peer === undefined || normalizeHandle(peer) === normalizeHandle(handle) ? handle : null;
  }

  /** The texter's user by chat, then by trusted handle (re-binding the chat). Never creates one. */
  private findUser(space: S, identity: SpaceIdentity, now: number): User | null {
    const bySpace = this.store.findUserBySpace(identity.spaceId);
    if (bySpace) return bySpace;
    const handle = this.trustedHandle(space, identity);
    if (handle && this.store.findUserByHandle(handle)) {
      return this.store.ensureUserForSpace(identity, now).user;
    }
    return null;
  }

  /** `identity` without a handle that cannot vouch for this chat, so it never ends up on (or re-binds) an account. */
  private safeIdentity(space: S, identity: SpaceIdentity): SpaceIdentity {
    return this.trustedHandle(space, identity) ? identity : { ...identity, handle: null };
  }

  /** A placeholder user for an unknown chat. */
  private createPlaceholder(space: S, identity: SpaceIdentity, now: number): User {
    return this.store.ensureUserForSpace(this.safeIdentity(space, identity), now).user;
  }

  private isOwner(space: S, identity: SpaceIdentity): boolean {
    const handle = this.trustedHandle(space, identity);
    const owner = this.policy.ownerHandle?.trim();
    return Boolean(handle && owner && normalizeHandle(handle) === normalizeHandle(owner));
  }

  /** Binds `identity` to the web user when it is unlinked. Null otherwise. */
  private linkWebUser(identity: SpaceIdentity, now: number): User | null {
    const web = this.store.getUser(this.policy.webUserId);
    if (!web || web.spaceId) return null;
    return this.store.linkByCode(this.store.createOrGetLinkCode(web.id, now), identity, now);
  }

  /** The web user, or a texter who has engaged (studied at least once or has a card open). */
  private isStarted(user: User): boolean {
    return (
      user.id === this.policy.webUserId || this.store.getPending(user.id) !== null || this.store.listProgress(user.id).length > 0
    );
  }

  // ── Inbound text ─────────────────────────────────────────────────────────

  private async onText(space: S, text: string, sender: SenderInfo): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = this.clock();
    const identity = this.identity(space, sender);
    const command = parseCommand(trimmed);

    if (command?.type === "link") return this.onLink(space, identity, command.code, now);
    if (command?.type === "start") return this.onStart(space, identity, now);

    const user = this.findUser(space, identity, now);
    if (!user) {
      const created = this.createPlaceholder(space, identity, now);
      this.log(`new texter ${created.id} in ${space.id}`);
      await this.say(space, M.onboarding(this.policy.webUrl));
      return;
    }
    this.touch(user.id, now);

    if (command) return this.onCommand(space, user, command, trimmed, now);

    const tapback = textAsTapback(trimmed);
    if (tapback) return this.onTapback(space, user, tapback, undefined, now);

    const pending = this.store.getPending(user.id);
    if (pending?.phase === "awaiting_answer") return this.onAnswer(space, user, pending, trimmed, now);
    if (pending?.phase === "awaiting_grade") {
      const card = getCard(pending.cardId);
      if (!card) return this.retire(space, user);
      const grade = parseTextGrade(trimmed);
      if (grade !== undefined) return this.applyGrade(space, user, pending, card, grade, now);
      await this.say(space, M.rateFirst(card));
      return;
    }
    await this.say(space, this.isStarted(user) ? M.idle() : M.notStarted(this.policy.webUrl));
  }

  private async onCommand(space: S, user: User, command: Command, text: string, now: number): Promise<void> {
    switch (command.type) {
      case "help":
        await this.say(space, M.help());
        return;
      case "greeting":
        await this.say(space, this.isStarted(user) ? M.greeting() : M.notStarted(this.policy.webUrl));
        return;
      case "more":
        return this.onMore(space, user, now);
      case "skip":
        return this.onSkip(space, user, now);
      case "hint":
        return this.onHint(space, user);
      case "reveal":
        return this.onReveal(space, user, text, now);
      case "why":
        return this.onWhy(space, user);
      case "stats":
        await this.say(space, M.stats(this.store.stats(user.id, now), this.policy.webUrl));
        return;
      case "pause":
        if (!user.paused) this.store.setPaused(user.id, true, now);
        await this.say(space, M.paused());
        return;
      case "resume":
        if (user.paused) this.store.setPaused(user.id, false, now);
        await this.say(space, M.resumed());
        return;
      case "link":
      case "start":
        return; // handled before user resolution
    }
  }

  /**
   * "link 482193". Wrong codes are counted by the store (per chat and per handle,
   * persisted in SQLite); after MAX_LINK_FAILURES_PER_SENDER misses in the
   * window it refuses, and the chat hears "too many wrong codes" once.
   */
  private async onLink(space: S, identity: SpaceIdentity, code: string | null, now: number): Promise<void> {
    if (!code) {
      await this.say(space, M.linkUsage(this.policy.webUrl));
      return;
    }
    const safe = this.safeIdentity(space, identity);
    if (this.store.isLinkLocked(safe, now)) {
      this.log(`link attempt ignored in ${space.id}: locked out`);
      await this.noticeLinkLock(space, now);
      return;
    }
    const user = this.store.linkByCode(code, safe, now);
    if (!user) {
      if (!this.findUser(space, identity, now)) this.createPlaceholder(space, identity, now);
      const locked = this.store.isLinkLocked(safe, now);
      this.log(`link code rejected in ${space.id}${locked ? " (now locked out)" : ""}`);
      if (locked) await this.noticeLinkLock(space, now);
      else await this.say(space, M.linkFailed(this.policy.webUrl));
      return;
    }
    this.log(`linked ${space.id} → ${user.id} by code`);
    this.touch(user.id, now);
    await this.say(space, M.linked());
    await this.deliverOrCaughtUp(space, user.id, now, "link");
  }

  private async onStart(space: S, identity: SpaceIdentity, now: number): Promise<void> {
    const existing = this.findUser(space, identity, now);
    if (existing && this.isStarted(existing)) {
      this.touch(existing.id, now);
      if (existing.paused) this.store.setPaused(existing.id, false, now);
      const pending = this.store.getPending(existing.id);
      if (pending) {
        const card = getCard(pending.cardId);
        if (card) {
          await this.say(space, pending.phase === "awaiting_answer" ? M.stillOpen(card) : M.rateFirst(card));
          return;
        }
      }
      await this.say(space, M.welcomeBack());
      await this.deliverOrCaughtUp(space, existing.id, now, "link");
      return;
    }

    // Only SYNAPSE_OWNER_HANDLE (vouched for by its own DM) may claim the web user without a code;
    // anyone else starts a solo account and links the dashboard with 'link <code>'.
    if (this.isOwner(space, identity)) {
      const owned = this.linkWebUser(this.safeIdentity(space, identity), now);
      if (owned) {
        this.log(`linked owner ${space.id} → ${owned.id} via 'start'`);
        this.touch(owned.id, now);
        await this.say(space, M.linked());
        await this.deliverOrCaughtUp(space, owned.id, now, "link");
        return;
      }
      if (this.store.isLinkLocked(this.safeIdentity(space, identity), now)) {
        await this.noticeLinkLock(space, now);
        return;
      }
    }

    const user = existing ?? this.createPlaceholder(space, identity, now);
    if (user.paused) this.store.setPaused(user.id, false, now);
    this.touch(user.id, now);
    this.log(`solo start for ${user.id} in ${space.id}`);
    await this.say(space, M.startedSolo(this.policy.webUrl));
    await this.deliverOrCaughtUp(space, user.id, now, "link");
  }

  /** Says "too many wrong codes" once per lockout window, then stays silent. */
  private async noticeLinkLock(space: S, now: number): Promise<void> {
    const scope = spaceScope(space.id);
    const noticed = this.state.get<number>(scope, "linkLockNoticeAt");
    if (typeof noticed === "number" && now - noticed < LINK_FAILURE_WINDOW_MS) return;
    this.state.set(scope, "linkLockNoticeAt", now, now);
    await this.say(space, M.linkLocked());
  }

  // ── Probe lifecycle ──────────────────────────────────────────────────────

  private async onAnswer(space: S, user: User, pending: PendingProbe, answer: string, now: number): Promise<void> {
    const card = getCard(pending.cardId);
    if (!card) return this.retire(space, user);
    if (isNonAnswer(answer)) return this.revealAndRelearn(space, user, pending, card, answer, now);

    const input: EvaluationInput = { question: card.prompt, answerKey: card.answerKey, keyPoints: card.keyPoints, answer };
    const evaluation = await this.withTyping(space, () => this.evaluateSafely(input));
    const at = this.clock();
    const preview = this.store.previewCard(user.id, card.id, at);
    const sent = await this.say(space, M.feedback(card, evaluation, preview));
    this.store.updatePending(
      user.id,
      { phase: "awaiting_grade", feedbackMessageId: sent?.id ?? null, answer, verdict: evaluation },
      at,
    );
    this.remember(user.id, card.id, [pending.questionMessageId, sent?.id], at);
    this.log(`graded ${card.id} for ${user.id}: ${evaluation.verdict} (${evaluation.source})`);
  }

  private async revealAndRelearn(
    space: S,
    user: User,
    pending: PendingProbe,
    card: ReviewCard,
    answer: string,
    now: number,
  ): Promise<void> {
    const verdict = heuristicEvaluation({ question: card.prompt, answerKey: card.answerKey, keyPoints: card.keyPoints, answer });
    const outcome = this.store.gradeCard({ userId: user.id, cardId: card.id, grade: 1, source: "imessage", now, answer, verdict });
    this.remember(user.id, card.id, [pending.questionMessageId], now);
    const sent = await this.sayAfterCommit(space, M.reveal(outcome), M.revealSaved(outcome));
    this.remember(user.id, card.id, [sent?.id], now);
    this.log(`revealed ${card.id} for ${user.id} → relearn in ${outcome.nextLabel}`);
  }

  /**
   * Grades an answered probe and remembers how to undo it, so a changed tapback
   * on `ratedMessageIds` (the feedback, or the message tapped) can re-grade it.
   */
  private gradeFromFeedback(
    userId: string,
    pending: PendingProbe,
    card: ReviewCard,
    grade: Grade,
    now: number,
    ratedMessageIds: (string | null | undefined)[],
  ): GradeOutcome {
    const outcome = this.store.gradeCard({
      userId,
      cardId: card.id,
      grade,
      source: "imessage",
      now,
      answer: pending.answer,
      verdict: pending.verdict,
    });
    const messageIds = [...new Set(ratedMessageIds.filter((id): id is string => Boolean(id)))];
    this.setGradeMemo(userId, {
      cardId: card.id,
      grade,
      reviewId: outcome.reviewId,
      at: now,
      messageIds,
      answer: pending.answer,
      verdict: pending.verdict,
    });
    this.remember(userId, card.id, [pending.questionMessageId, pending.feedbackMessageId], now);
    return outcome;
  }

  private async applyGrade(
    space: S,
    user: User,
    pending: PendingProbe,
    card: ReviewCard,
    grade: Grade,
    now: number,
    targetId?: string,
  ): Promise<void> {
    const outcome = this.gradeFromFeedback(user.id, pending, card, grade, now, [pending.feedbackMessageId, targetId]);
    const streak = this.store.stats(user.id, now).streakDays;
    const text = grade >= 3 ? M.lockedIn(outcome, streak) : M.relearn(outcome, streak);
    const sent = await this.sayAfterCommit(space, text, M.gradeSaved(outcome, M.ratingForGrade(grade)));
    this.remember(user.id, card.id, [sent?.id], now);
    this.log(`rated ${card.id} for ${user.id}: grade ${grade} → ${outcome.nextLabel}`);
  }

  private async onTapback(space: S, user: User, kind: TapbackKind, targetId: string | undefined, now: number): Promise<void> {
    if (kind === "laugh") return;
    const pending = this.store.getPending(user.id);
    const pendingCard = pending ? getCard(pending.cardId) : undefined;
    const onPending = Boolean(pending && pendingCard && this.targetsProbe(pending, targetId));

    if (kind === "question") {
      if (pending && pendingCard && onPending) {
        await this.say(space, pending.phase === "awaiting_answer" ? M.hint(pendingCard) : M.explanation(pendingCard));
        return;
      }
      const last = this.lastCardTargeted(user.id, targetId);
      if (last) await this.say(space, M.explanation(last));
      return;
    }

    if (kind === "emphasize") {
      const card = onPending ? pendingCard : this.lastCardTargeted(user.id, targetId);
      if (!card) return;
      this.store.flagWeakness(user.id, card.tags, "tapback", WEAKNESS_WEIGHTS.emphasize, now);
      await this.say(space, M.flagged(card, card.tags.map(tagLabel)));
      return;
    }

    if (!SUPPORTED_RATINGS.has(kind)) return;
    const grade = tapbackToGrade(kind);
    if (grade === undefined) return;
    if (targetId && (await this.tryRegrade(space, user, pending, grade, targetId, now))) return;
    if (!pending || !pendingCard) return;
    if (pending.phase === "awaiting_answer") {
      if (onPending) await this.say(space, M.answerFirst());
      return;
    }
    if (!onPending) {
      this.log(`ignored ${kind} on ${targetId ?? "?"}: not this probe's message`);
      return;
    }
    await this.applyGrade(space, user, pending, pendingCard, grade, now, targetId);
  }

  /**
   * A rating tapback on feedback that was already rated (the user changed ❤️
   * to 👎): replace that review. True when the tapback was consumed.
   */
  private async tryRegrade(
    space: S,
    user: User,
    pending: PendingProbe | null,
    grade: Grade,
    targetId: string,
    now: number,
  ): Promise<boolean> {
    const memo = this.gradeMemo(user.id);
    if (!memo || !memo.messageIds.includes(targetId)) return false;
    if (now - memo.at > REGRADE_WINDOW_MS) return false;
    if (memo.grade === grade) return true; // the same rating again: nothing changes
    if (pending?.cardId === memo.cardId) return true; // the card is already back as a new probe
    // Core restores the card's pre-review state and grades again (same answer and verdict); null if the card
    // was reviewed again since. memo.reviewId is this user's latest review of memo.cardId.
    const outcome = this.store.regradeReview(memo.reviewId, grade, now);
    if (!outcome) {
      this.clearGradeMemo(user.id);
      return false;
    }
    this.setGradeMemo(user.id, { ...memo, grade, reviewId: outcome.reviewId, at: now });
    this.log(`re-rated ${memo.cardId} for ${user.id}: grade ${memo.grade} → ${grade} (${outcome.nextLabel})`);
    await this.sayAfterCommit(space, M.regraded(outcome, M.ratingForGrade(grade)), M.gradeSaved(outcome, M.ratingForGrade(grade)));
    return true;
  }

  /**
   * A tapback counts for the open probe when it targets the feedback or the
   * question message, or carries no target id (relayed/legacy tapbacks).
   */
  private targetsProbe(pending: PendingProbe, targetId: string | undefined): boolean {
    if (!targetId) return true;
    const known = [pending.questionMessageId, pending.feedbackMessageId].filter((id): id is string => Boolean(id));
    if (known.length === 0) return true;
    if (pending.phase === "awaiting_grade" && !pending.feedbackMessageId) return true;
    return known.includes(targetId);
  }

  private lastCardTargeted(userId: string, targetId: string | undefined): ReviewCard | undefined {
    const last = this.lastCard(userId);
    if (last && (!targetId || last.messageIds.includes(targetId))) return getCard(last.cardId);
    if (!last && !targetId) return this.lastReviewedCard(userId);
    return undefined;
  }

  // ── Commands on the current card ─────────────────────────────────────────

  private async onMore(space: S, user: User, now: number): Promise<void> {
    let pending = this.store.getPending(user.id);
    if (pending?.phase === "awaiting_answer" && this.isStale(pending, now)) {
      this.expire(user.id, pending, now);
      pending = null;
    }
    if (pending) {
      const card = getCard(pending.cardId);
      if (!card) {
        this.store.clearPending(user.id);
      } else if (pending.phase === "awaiting_answer") {
        await this.say(space, M.stillOpen(card));
        return;
      } else {
        // Answered but never rated (stale or not): the evaluator's grade is applied.
        const grade = pending.verdict?.suggestedGrade ?? 3;
        const outcome = this.gradeFromFeedback(user.id, pending, card, grade, now, [pending.feedbackMessageId]);
        const rating = M.ratingForGrade(grade);
        await this.sayAfterCommit(space, M.autoGraded(outcome, rating), M.gradeSaved(outcome, rating));
      }
    }
    await this.deliverOrCaughtUp(space, user.id, now, "pull");
  }

  private async onSkip(space: S, user: User, now: number): Promise<void> {
    const pending = this.store.getPending(user.id);
    if (!pending) {
      await this.say(space, M.nothingToSkip());
      return;
    }
    this.store.clearPending(user.id);
    this.snooze(user.id, pending.cardId, now);
    const card = getCard(pending.cardId);
    if (card) await this.say(space, M.skipped(card));
    await this.deliverOrCaughtUp(space, user.id, now, "pull");
  }

  private async onHint(space: S, user: User): Promise<void> {
    const pending = this.store.getPending(user.id);
    const card = pending ? getCard(pending.cardId) : undefined;
    if (!pending || !card) {
      await this.say(space, M.noOpenCard());
      return;
    }
    await this.say(space, pending.phase === "awaiting_answer" ? M.hint(card) : M.explanation(card));
  }

  private async onReveal(space: S, user: User, text: string, now: number): Promise<void> {
    const pending = this.store.getPending(user.id);
    const card = pending ? getCard(pending.cardId) : undefined;
    if (!pending || !card) {
      await this.say(space, M.noOpenCard());
      return;
    }
    if (pending.phase === "awaiting_answer") return this.revealAndRelearn(space, user, pending, card, text, now);
    await this.say(space, M.explanation(card));
  }

  private async onWhy(space: S, user: User): Promise<void> {
    const pending = this.store.getPending(user.id);
    const card = pending ? getCard(pending.cardId) : undefined;
    if (pending && card) {
      await this.say(space, pending.phase === "awaiting_answer" ? M.noSpoilers(card) : M.explanation(card));
      return;
    }
    const last = this.lastCardTargeted(user.id, undefined);
    await this.say(space, last ? M.explanation(last) : M.noOpenCard());
  }

  private async retire(space: S, user: User): Promise<void> {
    this.store.clearPending(user.id);
    await this.say(space, M.cardRetired());
  }

  // ── Delivery (probes & briefings) ────────────────────────────────────────

  private async pushForUser(userId: string, now: number): Promise<TickResult> {
    const skip = (reason: TickSkipReason, extra: Partial<TickResult> = {}): TickResult => ({
      userId,
      action: "skipped",
      reason,
      ...extra,
    });
    const user = this.store.getUser(userId);
    if (!user?.spaceId) return skip("unlinked");
    if (isGroupSpaceId(user.spaceId)) return skip("group-chat");
    if (!this.isStarted(user)) return skip("not-started");
    if (user.paused) return skip("paused");

    const extra: Partial<TickResult> = {};
    let preempted: PendingProbe | undefined;
    let carried: PendingProbe | undefined;
    const pending = this.store.getPending(userId);
    if (pending) {
      if (this.isStale(pending, now)) Object.assign(extra, this.retireStale(userId, pending, now));
      else if (pending.phase === "awaiting_answer" && this.drillPreempts(userId, pending, now)) preempted = pending;
      else if (pending.phase === "awaiting_answer" && this.carriedOvernight(userId, pending, now)) carried = pending;
      else return skip("outstanding");
    }

    const { timezone } = this.store.policy;
    if (!this.store.demoScale && !isWithinActiveHours(now, timezone, this.policy.activeHours)) {
      return skip(preempted || carried ? "outstanding" : "quiet-hours", extra);
    }
    // At demo scale the store counts one SRS day, not the calendar day, so an early link cannot hit the cap before the drill.
    if (this.store.pushesToday(userId, now) >= this.policy.maxDailyPushes) return skip("daily-cap", extra);
    if (carried) return this.briefWithOpenCard(user, carried, now);

    const exclude = this.snoozedIds(userId, now);
    if (preempted) exclude.push(preempted.cardId);
    const pick = this.store.nextCard(userId, now, { excludeCardIds: exclude });
    if (!pick) return skip("nothing-due", extra);
    if (preempted && pick.reason !== "drill") return skip("outstanding", extra);

    const gap = this.pushGapFor(pick);
    const lastTouch = Math.max(this.store.lastPushAt(userId) ?? -Infinity, this.lastInboundAt(userId) ?? -Infinity);
    if (gap > 0 && now - lastTouch < gap) return skip("cooldown", extra);
    if (!preempted && this.drillDueSoon(userId, pick, now)) return skip("drill-soon", extra);

    const space = await this.resolveSpace(user);
    if (!space) return skip("no-space", extra);
    if (preempted) {
      this.store.clearPending(userId);
      this.snooze(userId, preempted.cardId, now);
      extra.preemptedCardId = preempted.cardId;
      this.log(`set aside unanswered ${preempted.cardId} for ${userId}: a drill is due`);
    }
    const delivery = await this.deliver(space, userId, now, "push", pick);
    if (!delivery.sent) return skip("nothing-due", extra);
    return { userId, action: "sent", cardId: delivery.cardId, morning: delivery.morning, ...extra };
  }

  /**
   * Yesterday's card is still unanswered this morning (quiet hours do not count
   * toward expiry) and the day's briefing is due. Real scale only.
   */
  private carriedOvernight(userId: string, pending: PendingProbe, now: number): boolean {
    if (this.store.demoScale) return false;
    const { timezone, morningHour } = this.store.policy;
    return (
      localDayKey(pending.askedAt, timezone) !== localDayKey(now, timezone) &&
      !this.store.morningSentToday(userId, now) &&
      localHour(now, timezone) >= morningHour
    );
  }

  /**
   * The day's briefing, then a pointer at the card still open from yesterday
   * instead of a new probe, so an answer typed over breakfast still grades the
   * card it answers.
   */
  private async briefWithOpenCard(user: User, pending: PendingProbe, now: number): Promise<TickResult> {
    const skip = (reason: TickSkipReason): TickResult => ({ userId: user.id, action: "skipped", reason });
    const card = getCard(pending.cardId);
    if (!card) return skip("outstanding");
    const lastTouch = Math.max(this.store.lastPushAt(user.id) ?? -Infinity, this.lastInboundAt(user.id) ?? -Infinity);
    if (this.policy.pushGapMs > 0 && now - lastTouch < this.policy.pushGapMs) return skip("cooldown");
    const space = await this.resolveSpace(user);
    if (!space) return skip("no-space");
    const morning = this.isMorning(now);
    await this.say(space, M.morningBriefing({ ...this.briefingFacts(user.id, now, card), checkIn: !morning }));
    this.store.recordPush(user.id, "morning", now);
    this.state.set(userScope(user.id), "lastBriefingAt", now, now);
    await this.say(space, M.stillOpen(card));
    this.log(`briefing for ${user.id} with ${card.id} still open from yesterday`);
    return { userId: user.id, action: "sent", cardId: card.id, morning: true };
  }

  /**
   * Relearns and IDE drills were promised "back in 10m" / "next morning", so
   * they wait at most one relearn step after the last text instead of the full
   * push gap. Brand-new and ordinary due cards keep the whole gap.
   */
  private pushGapFor(pick: NextCardPick): number {
    const { pushGapMs } = this.policy;
    return pick.reason === "drill" || isRetry(pick) ? Math.min(pushGapMs, this.store.scheduler.relearnMs) : pushGapMs;
  }

  /**
   * A queued IDE drill that came due (or whose struggle happened) after the
   * unanswered probe on the phone was sent: the drill goes out now instead of
   * waiting behind a card the user has not touched. A drill never sets aside
   * another drill.
   */
  private drillPreempts(userId: string, pending: PendingProbe, now: number): boolean {
    if (this.store.getProgress(userId, pending.cardId)?.boostReason === "drill") return false;
    const pick = this.store.nextCard(userId, now, {
      excludeCardIds: [...this.snoozedIds(userId, now), pending.cardId],
      includeNew: false,
    });
    if (pick?.reason !== "drill") return false;
    const dueAt = this.store.getProgress(userId, pick.card.id)?.dueAt ?? now;
    const struggle = this.struggleForCard(userId, pick.card);
    return dueAt > pending.askedAt || (struggle !== undefined && struggle.at > pending.askedAt);
  }

  /**
   * Holds a brand-new or ordinary due card when a queued IDE drill comes due
   * within one probe TTL: the card could still be open by then and the drill,
   * promised for a set time ("Synapse will text you a drill in 1 min"), would
   * have to push it aside. Relearns and drills are never held.
   */
  private drillDueSoon(userId: string, pick: NextCardPick, now: number): boolean {
    if (pick.reason === "drill" || isRetry(pick)) return false;
    const horizon = now + this.policy.probeTtlMs;
    const snoozed = new Set(this.snoozedIds(userId, now));
    return this.store
      .listProgress(userId)
      .some((entry) => entry.boostReason === "drill" && entry.dueAt > now && entry.dueAt <= horizon && !snoozed.has(entry.cardId));
  }

  private async resolveSpace(user: User): Promise<S | undefined> {
    const spaceId = user.spaceId;
    if (!spaceId) return undefined;
    const cached = this.spaces.get(spaceId);
    if (cached) return cached;
    try {
      const resolved = await this.deps.resolveSpace?.(spaceId, user, this.spaceHints(spaceId));
      if (resolved && isGroupSpace(resolved)) return undefined;
      if (resolved) this.spaces.set(spaceId, resolved);
      return resolved ?? undefined;
    } catch (error) {
      this.log(`could not resolve space ${spaceId}: ${describeError(error)}`);
      return undefined;
    }
  }

  private spaceHints(spaceId: string): SpaceHints {
    const phone = this.state.get<string>(spaceScope(spaceId), "phone");
    return typeof phone === "string" && phone ? { phone } : {};
  }

  private async deliverOrCaughtUp(space: S, userId: string, now: number, mode: DeliveryMode): Promise<void> {
    const delivery = await this.deliver(space, userId, now, mode);
    if (!delivery.sent) await this.say(space, M.caughtUp(this.caughtUpInfo(userId, now)));
  }

  /**
   * Sends the next card (preceded by the day's briefing when one is due) and
   * records the outstanding probe. Proactive sends ("push", "link") count
   * toward the daily cap; user-requested ones ("pull") do not.
   */
  private async deliver(space: S, userId: string, now: number, mode: DeliveryMode, chosen?: NextCardPick): Promise<Delivery> {
    const pick = chosen ?? this.store.nextCard(userId, now, { excludeCardIds: this.snoozedIds(userId, now) });
    if (!pick) return { sent: false };

    const withinHours = this.store.demoScale || isWithinActiveHours(now, this.store.policy.timezone, this.policy.activeHours);
    const briefing = mode !== "pull" && withinHours && this.briefingDue(userId, pick, now);
    const morning = briefing && this.isMorning(now);
    if (briefing) {
      await this.say(space, M.morningBriefing({ ...this.briefingFacts(userId, now, pick.card), checkIn: !morning }));
      this.store.recordPush(userId, "morning", now);
      this.state.set(userScope(userId), "lastBriefingAt", now, now);
    }

    const sent = await this.say(space, M.probe({ card: pick.card, morning, drillNote: this.drillNote(userId, pick), retry: isRetry(pick) }));
    this.store.setPending(userId, { cardId: pick.card.id, phase: "awaiting_answer", questionMessageId: sent?.id ?? null }, now);
    if (mode !== "pull") this.store.recordPush(userId, "probe", now, pick.card.id);
    this.remember(userId, pick.card.id, [sent?.id], now);
    this.log(`probe ${pick.card.id} (${pick.reason}${briefing ? (morning ? ", morning" : ", check-in") : ""}) → ${userId}`);
    return { sent: true, cardId: pick.card.id, morning: briefing };
  }

  /** "☕ Morning Synapse" before noon; later in the day the same briefing is a "🧠 Synapse check-in". */
  private isMorning(now: number): boolean {
    if (this.store.demoScale) return true;
    const { timezone, morningHour } = this.store.policy;
    return localHour(now, timezone) < Math.max(MORNING_LABEL_UNTIL_HOUR, morningHour + 1);
  }

  /**
   * First push of the local day at/after SYNAPSE_MORNING_HOUR. At demo scale the
   * hour is ignored, and an IDE-struggle drill gets its own "next morning"
   * briefing (one SRS day after the struggle), so the sync story shows live.
   */
  private briefingDue(userId: string, pick: NextCardPick, now: number): boolean {
    const { timezone, morningHour } = this.store.policy;
    if (!this.store.morningSentToday(userId, now)) {
      return this.store.demoScale || localHour(now, timezone) >= morningHour;
    }
    if (!this.store.demoScale || pick.reason !== "drill") return false;
    const struggle = this.struggleForCard(userId, pick.card);
    return struggle !== undefined && struggle.at > this.lastBriefing(userId);
  }

  private lastBriefing(userId: string): number {
    const remembered = this.state.get<number>(userScope(userId), "lastBriefingAt");
    if (typeof remembered === "number") return remembered;
    const event = this.store.recentEvents(userId, 50).find((entry) => entry.kind === "push_morning");
    return event?.createdAt ?? 0;
  }

  private briefingFacts(userId: string, now: number, firstCard: ReviewCard): M.BriefingCopy {
    const { newPerDay } = this.store.policy;
    const stats = this.store.stats(userId, now);
    // Name the weak spot the first probe drills (its primary tag first); otherwise the weakest tag overall.
    const weak =
      firstCard.tags.map((tag) => stats.weakTags.find((entry) => entry.tag === tag)).find((entry) => entry !== undefined) ??
      stats.weakTags[0];
    let weakSpot: M.BriefingCopy["weakSpot"];
    if (weak) {
      const struggle = this.latestStruggle(userId, [weak.tag]);
      const context = struggle
        ? `you struggled on ${struggle.problem.title} ${this.describeWhen(struggle.at, now)}`
        : weak.source === "tapback"
          ? "you flagged it"
          : weak.source === "review"
            ? "it slipped in recent reviews"
            : undefined;
      weakSpot = { label: weak.label, context };
    }
    return {
      due: stats.dueNow,
      newCards: Math.max(0, newPerDay - this.store.newCardsIntroduced(userId, now)),
      weakSpot,
      streak: stats.streakDays,
    };
  }

  private drillNote(userId: string, pick: NextCardPick): string | undefined {
    if (pick.reason !== "drill") return undefined;
    const struggle = this.struggleForCard(userId, pick.card);
    const tags =
      pick.weakTags.length > 0
        ? pick.weakTags
        : struggle
          ? struggle.problem.weakTags.slice(0, 2)
          : pick.card.tags.slice(0, 1);
    return M.drillNote(tags.map(tagLabel), struggle?.problem.title);
  }

  /** The IDE struggle that queued this drill: the card is one of the problem's drills, or shares a tag. */
  private struggleForCard(userId: string, card: ReviewCard): { problem: Problem; at: number } | undefined {
    for (const attempt of this.store.listIdeAttempts(userId, undefined, 25)) {
      if (!attempt.struggled) continue;
      const problem = getProblem(attempt.problemId);
      if (!problem) continue;
      const related =
        drillCardsForProblem(problem).some((drill) => drill.id === card.id) ||
        card.tags.some((tag) => problem.weakTags.includes(tag) || problem.tags.includes(tag));
      if (related) return { problem, at: attempt.createdAt };
    }
    return undefined;
  }

  /** Most recent IDE struggle on a problem related to any of `tags`. */
  private latestStruggle(userId: string, tags: readonly Tag[]): { problem: Problem; at: number } | undefined {
    for (const attempt of this.store.listIdeAttempts(userId, undefined, 25)) {
      if (!attempt.struggled) continue;
      const problem = getProblem(attempt.problemId);
      if (problem && tags.some((tag) => problem.weakTags.includes(tag) || problem.tags.includes(tag))) {
        return { problem, at: attempt.createdAt };
      }
    }
    return undefined;
  }

  /** "earlier today", "last night", "yesterday" — in SRS days at demo scale. */
  private describeWhen(at: number, now: number): string {
    const { timezone, dayMs } = this.store.policy;
    if (this.store.demoScale) {
      const days = Math.floor((now - at) / dayMs);
      if (days <= 0) return "earlier today";
      return days === 1 ? "last night" : `${days} days ago`;
    }
    const today = localDayKey(now, timezone);
    const day = localDayKey(at, timezone);
    if (day === today) return "earlier today";
    if (day === shiftDayKey(today, -1)) return localHour(at, timezone) >= 17 ? "last night" : "yesterday";
    return "recently";
  }

  private caughtUpInfo(userId: string, now: number): M.CaughtUpCopy {
    const upcoming = this.store
      .listProgress(userId)
      .map((entry) => entry.dueAt)
      .filter((dueAt) => dueAt > now);
    const nextDue = upcoming.length > 0 ? Math.min(...upcoming) : undefined;
    return {
      nextLabel: nextDue === undefined ? undefined : formatDuration(nextDue - now, this.store.policy.dayMs),
      newCapReached: this.store.newCardsIntroduced(userId, now) >= this.store.policy.newPerDay,
    };
  }

  // ── Probe expiry & snoozing ──────────────────────────────────────────────

  /**
   * Unanswered for probeTtlMs since asked, or unrated for probeTtlMs since the
   * feedback. At real scale only active hours count, so a card texted at 21:30
   * is still open when the user answers over breakfast.
   */
  private isStale(pending: PendingProbe, now: number): boolean {
    const since = pending.phase === "awaiting_grade" ? pending.updatedAt : pending.askedAt;
    const ttl = this.policy.probeTtlMs;
    if (now - since < ttl) return false;
    if (this.store.demoScale || now - since >= STALE_WALL_CAP_MS) return true;
    return activeMsBetween(since, now, this.store.policy.timezone, this.policy.activeHours, ttl) >= ttl;
  }

  /** A stale answered-but-unrated probe keeps the evaluator's grade; an unanswered one expires ungraded. */
  private retireStale(userId: string, pending: PendingProbe, now: number): Partial<TickResult> {
    const card = pending.phase === "awaiting_grade" && pending.verdict ? getCard(pending.cardId) : undefined;
    if (card && pending.verdict) {
      const grade = pending.verdict.suggestedGrade;
      const outcome = this.gradeFromFeedback(userId, pending, card, grade, now, [pending.feedbackMessageId]);
      this.log(`auto-graded unrated ${card.id} for ${userId}: grade ${grade} → ${outcome.nextLabel}`);
      return { gradedCardId: card.id };
    }
    this.expire(userId, pending, now);
    return { expiredCardId: pending.cardId };
  }

  private expire(userId: string, pending: PendingProbe, now: number): void {
    this.store.clearPending(userId);
    this.snooze(userId, pending.cardId, now);
    this.log(`expired stale probe ${pending.cardId} for ${userId}`);
  }

  /** Keeps a skipped/expired card out of selection for one probe TTL. */
  private snooze(userId: string, cardId: string, now: number): void {
    const cards = this.liveSnoozes(userId, now);
    cards[cardId] = now + this.policy.probeTtlMs;
    this.state.set(userScope(userId), "snoozes", cards, now);
  }

  private snoozedIds(userId: string, now: number): string[] {
    return Object.keys(this.liveSnoozes(userId, now));
  }

  private liveSnoozes(userId: string, now: number): Record<string, number> {
    const stored = this.state.get<Record<string, number>>(userScope(userId), "snoozes") ?? {};
    return Object.fromEntries(Object.entries(stored).filter(([, until]) => typeof until === "number" && until > now));
  }

  // ── Persisted per-user memory ────────────────────────────────────────────

  private touch(userId: string, now: number): void {
    this.state.set(userScope(userId), "lastInboundAt", now, now);
  }

  private lastInboundAt(userId: string): number | undefined {
    const at = this.state.get<number>(userScope(userId), "lastInboundAt");
    return typeof at === "number" ? at : undefined;
  }

  private lastCard(userId: string): LastCard | undefined {
    const last = this.state.get<LastCard>(userScope(userId), "lastCard");
    return last && typeof last.cardId === "string" && Array.isArray(last.messageIds) ? last : undefined;
  }

  private remember(userId: string, cardId: string, messageIds: (string | null | undefined)[], now: number): void {
    const current = this.lastCard(userId);
    const ids = current?.cardId === cardId ? [...current.messageIds] : [];
    for (const id of messageIds) if (id && !ids.includes(id)) ids.push(id);
    this.state.set(userScope(userId), "lastCard", { cardId, messageIds: ids.slice(-LAST_CARD_MAX_IDS) } satisfies LastCard, now);
  }

  private gradeMemo(userId: string): GradeMemo | undefined {
    const memo = this.state.get<GradeMemo>(userScope(userId), "lastGrade");
    return memo && typeof memo.cardId === "string" && typeof memo.reviewId === "number" && Array.isArray(memo.messageIds)
      ? memo
      : undefined;
  }

  private setGradeMemo(userId: string, memo: GradeMemo): void {
    this.state.set(userScope(userId), "lastGrade", memo, memo.at);
  }

  private clearGradeMemo(userId: string): void {
    this.state.delete(userScope(userId), "lastGrade");
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** The most recently graded card, from the activity log (survives restarts). */
  private lastReviewedCard(userId: string): ReviewCard | undefined {
    for (const event of this.store.recentEvents(userId, 30)) {
      const cardId = event.kind === "review" ? event.detail?.cardId : undefined;
      if (typeof cardId === "string") return getCard(cardId);
    }
    return undefined;
  }

  private async evaluateSafely(input: EvaluationInput): Promise<Evaluation> {
    try {
      return await this.evaluate(input);
    } catch (error) {
      this.log(`evaluator failed, using heuristic: ${describeError(error)}`);
      return heuristicEvaluation(input);
    }
  }

  private async withTyping<T>(space: S, work: () => Promise<T>): Promise<T> {
    if (!space.responding) return work();
    let finished = false;
    let result: T | undefined;
    try {
      return await space.responding(async () => {
        result = await work();
        finished = true;
        return result;
      });
    } catch (error) {
      if (finished) return result as T;
      this.log(`typing indicator failed: ${describeError(error)}`);
      return work();
    }
  }

  private async say(space: S, text: string): Promise<{ id?: string } | undefined> {
    const sent = await space.send(text);
    this.log(`→ ${space.id}: ${this.logText ? preview(text) : `(${text.length} chars)`}`);
    return sent && typeof sent === "object" && typeof sent.id === "string" ? { id: sent.id } : undefined;
  }

  /**
   * For confirmations sent after a grade is already saved: retries once, then
   * fails with `fallback` so the user learns the rating stuck (and, for 'idk',
   * still sees the answer) instead of a misleading "try that again".
   */
  private async sayAfterCommit(space: S, text: string, fallback: string): Promise<{ id?: string } | undefined> {
    try {
      return await this.say(space, text);
    } catch (first) {
      this.log(`send failed after saving, retrying once: ${describeError(first)}`);
      if (this.retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      try {
        return await this.say(space, text);
      } catch (second) {
        throw new CommittedSendError(fallback, second);
      }
    }
  }
}

function isRetry(pick: NextCardPick): boolean {
  return pick.reason !== "new" && (pick.state.phase === "learning" || pick.state.phase === "relearning");
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function preview(text: string, max = 90): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}
