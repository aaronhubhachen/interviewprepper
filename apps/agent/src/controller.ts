import {
  drillCardsForProblem,
  evaluateAnswer,
  formatDuration,
  getCard,
  getProblem,
  heuristicEvaluation,
  isNonAnswer,
  isWithinActiveHours,
  localDayKey,
  localHour,
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

/** The slice of a Spectrum `Space` the controller needs (keeps it testable with a fake). */
export interface ChatSpace {
  readonly id: string;
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

export interface AgentPolicy {
  activeHours: ActiveHours;
  maxDailyPushes: number;
  /** Outstanding probes idle for this long expire ungraded. */
  probeTtlMs: number;
  /** Minimum quiet time after a push or an inbound message before the next proactive push. */
  pushGapMs: number;
  webUserId: string;
  webUrl: string;
  /** Recorded on users created from this agent ("imessage", "terminal", …). */
  platform: string;
}

/**
 * Real-time floor for probe expiry. The spec's dayMs / 4 is 15 s at demo scale
 * (SYNAPSE_DAY_MS=60000), too short for a person to read, answer and tap.
 */
export const MIN_PROBE_TTL_MS = 3 * 60_000;

/** Fills policy defaults from the store's scheduling policy (SRS day length). */
export function resolveAgentPolicy(store: SynapseStore, overrides: Partial<AgentPolicy> = {}): AgentPolicy {
  const { dayMs } = store.policy;
  return {
    activeHours: overrides.activeHours ?? { startHour: 8, endHour: 22 },
    maxDailyPushes: overrides.maxDailyPushes ?? 12,
    probeTtlMs: overrides.probeTtlMs ?? Math.max(Math.round(dayMs / 4), MIN_PROBE_TTL_MS),
    pushGapMs: overrides.pushGapMs ?? Math.round(dayMs / 48),
    webUserId: overrides.webUserId ?? "me",
    webUrl: overrides.webUrl ?? "http://localhost:3000",
    platform: overrides.platform ?? "imessage",
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
  };
}

export type Evaluator = (input: EvaluationInput) => Promise<Evaluation>;

export interface StudyControllerDeps<S extends ChatSpace> {
  store: SynapseStore;
  policy?: Partial<AgentPolicy>;
  /** Defaults to core's evaluateAnswer (LLM with heuristic fallback). */
  evaluate?: Evaluator;
  now?: () => number;
  /** Rebuilds a Space for proactive sends when it was not seen inbound since startup. */
  resolveSpace?: (spaceId: string, user: User) => Promise<S | undefined> | S | undefined;
  log?: (line: string) => void;
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
  | "no-space"
  | "nothing-due"
  | "error";

export interface TickResult {
  userId: string;
  action: "sent" | "skipped";
  reason?: TickSkipReason;
  cardId?: string;
  morning?: boolean;
  /** Card whose stale probe expired during this tick. */
  expiredCardId?: string;
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

interface LastCard {
  cardId: string;
  messageIds: Set<string>;
}

interface LockEntry {
  tail: Promise<void>;
  depth: number;
}

const SUPPORTED_RATINGS: ReadonlySet<TapbackKind> = new Set(["love", "like", "dislike"]);

/**
 * The iMessage study loop: probes, Socratic grading, tapback ratings, commands
 * and the proactive scheduler. Platform-agnostic: it only needs ChatSpace.
 * Every inbound message and every per-user tick runs under a per-space lock,
 * so a tick and a 'more' can never both send a probe.
 */
export class StudyController<S extends ChatSpace = ChatSpace> {
  readonly store: SynapseStore;
  readonly policy: AgentPolicy;
  private readonly evaluate: Evaluator;
  private readonly clock: () => number;
  private readonly log: (line: string) => void;
  private readonly spaces = new Map<string, S>();
  private readonly locks = new Map<string, LockEntry>();
  private readonly inflight = new Set<Promise<unknown>>();
  private readonly snoozed = new Map<string, Map<string, number>>();
  private readonly lastCard = new Map<string, LastCard>();
  private readonly lastInboundAt = new Map<string, number>();
  private readonly lastBriefingAt = new Map<string, number>();

  constructor(private readonly deps: StudyControllerDeps<S>) {
    this.store = deps.store;
    this.policy = resolveAgentPolicy(deps.store, deps.policy);
    this.evaluate = deps.evaluate ?? ((input) => evaluateAnswer(input));
    this.clock = deps.now ?? Date.now;
    this.log = deps.log ?? ((line) => console.info(`[synapse-agent] ${line}`));
  }

  // ── Public entry points ──────────────────────────────────────────────────

  /** Caches a Space seen inbound so proactive sends can reuse it. */
  rememberSpace(space: S): void {
    this.spaces.set(space.id, space);
  }

  handleText(space: S, text: string, sender: SenderInfo = {}): Promise<void> {
    this.rememberSpace(space);
    return this.exclusive(space.id, () => this.guard(space, "text", () => this.onText(space, text, sender)));
  }

  handleReaction(space: S, emoji: string, targetId?: string | null, sender: SenderInfo = {}): Promise<void> {
    this.rememberSpace(space);
    return this.exclusive(space.id, () =>
      this.guard(space, "reaction", async () => {
        const user = this.findUser(this.identity(space, sender), this.clock());
        const kind = normalizeTapback(emoji);
        if (!user || !kind) return;
        const now = this.clock();
        this.lastInboundAt.set(user.id, now);
        await this.onTapback(space, user, kind, targetId ?? undefined, now);
      }),
    );
  }

  /**
   * One scheduler pass: for each linked, unpaused user, expire a stale probe,
   * then (inside active hours, under the daily cap, with nothing outstanding)
   * send the morning briefing and/or the next due card.
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
      await space.send(M.glitch()).catch(() => undefined);
    }
  }

  // ── Identity ─────────────────────────────────────────────────────────────

  private identity(space: S, sender: SenderInfo): SpaceIdentity {
    return {
      spaceId: space.id,
      handle: sender.handle ?? null,
      displayName: sender.displayName ?? null,
      platform: sender.platform ?? this.policy.platform,
    };
  }

  /** The texter's user by space, then by handle (re-binding the space). Never creates one. */
  private findUser(identity: SpaceIdentity, now: number): User | null {
    const bySpace = this.store.findUserBySpace(identity.spaceId);
    if (bySpace) return bySpace;
    if (identity.handle && this.store.findUserByHandle(identity.handle)) {
      return this.store.ensureUserForSpace(identity, now).user;
    }
    return null;
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

    const user = this.findUser(identity, now);
    if (!user) {
      const { user: created } = this.store.ensureUserForSpace(identity, now);
      this.log(`new texter ${created.id} in ${space.id}`);
      await this.say(space, M.onboarding(this.policy.webUrl));
      return;
    }
    this.lastInboundAt.set(user.id, now);

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

  private async onLink(space: S, identity: SpaceIdentity, code: string | null, now: number): Promise<void> {
    if (!code) {
      await this.say(space, M.linkUsage(this.policy.webUrl));
      return;
    }
    const user = this.store.linkByCode(code, identity, now);
    if (!user) {
      if (!this.findUser(identity, now)) this.store.ensureUserForSpace(identity, now);
      await this.say(space, M.linkFailed(this.policy.webUrl));
      return;
    }
    this.log(`linked ${space.id} → ${user.id} by code`);
    this.lastInboundAt.set(user.id, now);
    await this.say(space, M.linked());
    await this.deliverOrCaughtUp(space, user.id, now, "link");
  }

  private async onStart(space: S, identity: SpaceIdentity, now: number): Promise<void> {
    const existing = this.findUser(identity, now);
    if (existing && this.isStarted(existing)) {
      this.lastInboundAt.set(existing.id, now);
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

    const autoLinked = this.store.autoLinkSoleUser(identity, now);
    if (autoLinked) {
      this.log(`auto-linked ${space.id} → ${autoLinked.id} via 'start'`);
      this.lastInboundAt.set(autoLinked.id, now);
      await this.say(space, M.linked());
      await this.deliverOrCaughtUp(space, autoLinked.id, now, "link");
      return;
    }

    const user = existing ?? this.store.ensureUserForSpace(identity, now).user;
    if (user.paused) this.store.setPaused(user.id, false, now);
    this.lastInboundAt.set(user.id, now);
    this.log(`solo start for ${user.id} in ${space.id}`);
    await this.say(space, M.startedSolo(this.policy.webUrl));
    await this.deliverOrCaughtUp(space, user.id, now, "link");
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
    this.remember(user.id, card.id, [pending.questionMessageId, sent?.id]);
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
    const sent = await this.say(space, M.reveal(outcome));
    this.remember(user.id, card.id, [pending.questionMessageId, sent?.id]);
    this.log(`revealed ${card.id} for ${user.id} → relearn in ${outcome.nextLabel}`);
  }

  private async applyGrade(space: S, user: User, pending: PendingProbe, card: ReviewCard, grade: Grade, now: number): Promise<void> {
    const outcome = this.store.gradeCard({
      userId: user.id,
      cardId: card.id,
      grade,
      source: "imessage",
      now,
      answer: pending.answer,
      verdict: pending.verdict,
    });
    const streak = this.store.stats(user.id, now).streakDays;
    const sent = await this.say(space, grade >= 3 ? M.lockedIn(outcome, streak) : M.relearn(outcome, streak));
    this.remember(user.id, card.id, [pending.questionMessageId, pending.feedbackMessageId, sent?.id]);
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

    if (!SUPPORTED_RATINGS.has(kind) || !pending || !pendingCard) return;
    if (pending.phase === "awaiting_answer") {
      if (onPending) await this.say(space, M.answerFirst());
      return;
    }
    if (!onPending) {
      this.log(`ignored ${kind} on ${targetId ?? "?"}: not this probe's message`);
      return;
    }
    const grade = tapbackToGrade(kind);
    if (grade !== undefined) await this.applyGrade(space, user, pending, pendingCard, grade, now);
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
    const last = this.lastCard.get(userId);
    if (last && (!targetId || last.messageIds.has(targetId))) return getCard(last.cardId);
    if (!last && !targetId) return this.lastReviewedCard(userId);
    return undefined;
  }

  // ── Commands on the current card ─────────────────────────────────────────

  private async onMore(space: S, user: User, now: number): Promise<void> {
    let pending = this.store.getPending(user.id);
    if (pending && this.isStale(pending, now)) {
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
        const grade = pending.verdict?.suggestedGrade ?? 3;
        const outcome = this.store.gradeCard({
          userId: user.id,
          cardId: card.id,
          grade,
          source: "imessage",
          now,
          answer: pending.answer,
          verdict: pending.verdict,
        });
        await this.say(space, M.autoGraded(outcome, M.ratingForGrade(grade)));
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
    if (!this.isStarted(user)) return skip("not-started");
    if (user.paused) return skip("paused");

    let expiredCardId: string | undefined;
    const pending = this.store.getPending(userId);
    if (pending) {
      if (!this.isStale(pending, now)) return skip("outstanding");
      this.expire(userId, pending, now);
      expiredCardId = pending.cardId;
    }
    const extra = expiredCardId ? { expiredCardId } : {};

    const { timezone } = this.store.policy;
    if (!this.store.demoScale && !isWithinActiveHours(now, timezone, this.policy.activeHours)) {
      return skip("quiet-hours", extra);
    }
    if (this.store.pushesToday(userId, now) >= this.policy.maxDailyPushes) return skip("daily-cap", extra);
    const lastTouch = Math.max(this.store.lastPushAt(userId) ?? -Infinity, this.lastInboundAt.get(userId) ?? -Infinity);
    if (this.policy.pushGapMs > 0 && now - lastTouch < this.policy.pushGapMs) return skip("cooldown", extra);

    const space = await this.resolveSpace(user);
    if (!space) return skip("no-space", extra);
    const delivery = await this.deliver(space, userId, now, "push");
    if (!delivery.sent) return skip("nothing-due", extra);
    return { userId, action: "sent", cardId: delivery.cardId, morning: delivery.morning, ...extra };
  }

  private async resolveSpace(user: User): Promise<S | undefined> {
    const spaceId = user.spaceId;
    if (!spaceId) return undefined;
    const cached = this.spaces.get(spaceId);
    if (cached) return cached;
    try {
      const resolved = await this.deps.resolveSpace?.(spaceId, user);
      if (resolved) this.spaces.set(spaceId, resolved);
      return resolved ?? undefined;
    } catch (error) {
      this.log(`could not resolve space ${spaceId}: ${describeError(error)}`);
      return undefined;
    }
  }

  private async deliverOrCaughtUp(space: S, userId: string, now: number, mode: DeliveryMode): Promise<void> {
    const delivery = await this.deliver(space, userId, now, mode);
    if (!delivery.sent) await this.say(space, M.caughtUp(this.caughtUpInfo(userId, now)));
  }

  /**
   * Sends the next card (preceded by the morning briefing when one is due) and
   * records the outstanding probe. Proactive sends ("push", "link") count
   * toward the daily cap; user-requested ones ("pull") do not.
   */
  private async deliver(space: S, userId: string, now: number, mode: DeliveryMode): Promise<Delivery> {
    const pick = this.store.nextCard(userId, now, { excludeCardIds: this.snoozedIds(userId, now) });
    if (!pick) return { sent: false };

    const withinHours = this.store.demoScale || isWithinActiveHours(now, this.store.policy.timezone, this.policy.activeHours);
    const morning = mode !== "pull" && withinHours && this.briefingDue(userId, pick, now);
    if (morning) {
      await this.say(space, M.morningBriefing(this.briefingFacts(userId, now, pick)));
      this.store.recordPush(userId, "morning", now);
      this.lastBriefingAt.set(userId, now);
    }

    const sent = await this.say(space, M.probe({ card: pick.card, morning, drillNote: this.drillNote(userId, pick), retry: isRetry(pick) }));
    this.store.setPending(userId, { cardId: pick.card.id, phase: "awaiting_answer", questionMessageId: sent?.id ?? null }, now);
    if (mode !== "pull") this.store.recordPush(userId, "probe", now, pick.card.id);
    this.remember(userId, pick.card.id, [sent?.id]);
    this.log(`probe ${pick.card.id} (${pick.reason}${morning ? ", morning" : ""}) → ${userId}`);
    return { sent: true, cardId: pick.card.id, morning };
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
    const remembered = this.lastBriefingAt.get(userId);
    if (remembered !== undefined) return remembered;
    const event = this.store.recentEvents(userId, 50).find((entry) => entry.kind === "push_morning");
    return event?.createdAt ?? 0;
  }

  private briefingFacts(userId: string, now: number, pick: NextCardPick): M.BriefingCopy {
    const { newPerDay } = this.store.policy;
    const stats = this.store.stats(userId, now);
    // Name the weak spot the first probe drills (its primary tag first); otherwise the weakest tag overall.
    const weak =
      pick.card.tags.map((tag) => stats.weakTags.find((entry) => entry.tag === tag)).find((entry) => entry !== undefined) ??
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

  /** Unanswered for probeTtlMs since asked, or unrated for probeTtlMs since the feedback. */
  private isStale(pending: PendingProbe, now: number): boolean {
    const since = pending.phase === "awaiting_grade" ? pending.updatedAt : pending.askedAt;
    return now - since >= this.policy.probeTtlMs;
  }

  private expire(userId: string, pending: PendingProbe, now: number): void {
    this.store.clearPending(userId);
    this.snooze(userId, pending.cardId, now);
    this.log(`expired stale probe ${pending.cardId} for ${userId}`);
  }

  /** Keeps a skipped/expired card out of selection for one probe TTL (in memory). */
  private snooze(userId: string, cardId: string, now: number): void {
    const cards = this.snoozed.get(userId) ?? new Map<string, number>();
    cards.set(cardId, now + this.policy.probeTtlMs);
    this.snoozed.set(userId, cards);
  }

  private snoozedIds(userId: string, now: number): string[] {
    const cards = this.snoozed.get(userId);
    if (!cards) return [];
    for (const [cardId, until] of cards) if (until <= now) cards.delete(cardId);
    return [...cards.keys()];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private remember(userId: string, cardId: string, messageIds: (string | null | undefined)[]): void {
    const current = this.lastCard.get(userId);
    const ids = current?.cardId === cardId ? current.messageIds : new Set<string>();
    for (const id of messageIds) if (id) ids.add(id);
    this.lastCard.set(userId, { cardId, messageIds: ids });
  }

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
    this.log(`→ ${space.id}: ${preview(text)}`);
    return sent && typeof sent === "object" && typeof sent.id === "string" ? { id: sent.id } : undefined;
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
