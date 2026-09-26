import { randomInt, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  allCards,
  cardsByTag,
  drillCardsForProblem,
  getCard,
  getProblem,
  tagLabel,
  tagsWithContent,
  type CardKind,
  type ReviewCard,
  type Tag,
} from "../content";
import type { Evaluation } from "../grading";
import {
  formatInterval,
  gradeReview,
  isDemoScale,
  isPassingGrade,
  newReviewState,
  previewIntervals,
  schedulerOptions,
  type Grade,
  type IntervalPreview,
  type Rating,
  type ReviewPhase,
  type ReviewState,
  type SchedulerOptions,
} from "../sm2";
import type { BehavioralFeedback } from "../spar";
import {
  computeStreak,
  dayKeyStart,
  describeLocalTime,
  humanizeDuration,
  localDayKey,
  localParts,
  nextLocalTime,
  shiftDayKey,
  startOfLocalDay,
} from "../time";
import { LINK_CODE_PATTERN, normalizeHandle } from "./identity";
import { pickDue, pickNew, type DueCandidate } from "./selection";
import type {
  ActivityEvent,
  CardProgress,
  DayActivity,
  ForecastDay,
  GradeInput,
  GradeOutcome,
  IdeAttempt,
  IdeAttemptInput,
  IdeAttemptResult,
  IdeStage,
  LinkStatus,
  NextCardOptions,
  NextCardPick,
  PendingInput,
  PendingPatch,
  PendingPhase,
  PendingProbe,
  PushKind,
  ScheduledDrill,
  SpaceIdentity,
  SparSession,
  SparSessionInput,
  Stats,
  StorePolicy,
  TagMastery,
  User,
  WeakTag,
  WeaknessSource,
} from "./types";
import {
  decayScore,
  EFFORTLESS_RELIEF,
  WEAK_MAX_SCORE,
  WEAK_THRESHOLD,
  WEAKNESS_WEIGHTS,
} from "./weakness";

interface UserRow {
  id: string;
  display_name: string | null;
  handle: string | null;
  space_id: string | null;
  platform: string | null;
  link_code: string | null;
  paused: number;
  created_at: number;
}

interface ProgressRow {
  card_id: string;
  card_kind: CardKind;
  repetition: number;
  interval_days: number;
  ease_factor: number;
  due_at: number;
  lapses: number;
  phase: ReviewPhase;
  last_reviewed_at: number | null;
  boost_reason: string | null;
}

interface PendingRow {
  user_id: string;
  card_id: string;
  phase: PendingPhase;
  question_message_id: string | null;
  feedback_message_id: string | null;
  answer: string | null;
  verdict: string | null;
  asked_at: number;
  updated_at: number;
}

interface WeakRow {
  tag: Tag;
  score: number;
  last_flagged_at: number;
  source: WeaknessSource;
}

interface EventRow {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  detail: string | null;
  created_at: number;
}

interface IdeAttemptRow {
  id: number;
  user_id: string;
  problem_id: string;
  stage: IdeStage;
  language: IdeAttempt["language"];
  passed: number;
  tests_passed: number | null;
  tests_total: number | null;
  hints_used: number;
  attempt_number: number;
  gave_up: number;
  struggled: number;
  duration_ms: number | null;
  created_at: number;
}

interface SparRow {
  id: number;
  user_id: string;
  question_id: string;
  transcript: string;
  duration_ms: number;
  overall: number;
  feedback: string;
  created_at: number;
}

const MASTERED_INTERVAL_DAYS = 21;
const MAX_DRILLS_PER_STRUGGLE = 2;
const STREAK_LOOKBACK_MS = 400 * 86_400_000;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    spaceId: row.space_id,
    platform: row.platform,
    linkCode: row.link_code,
    paused: row.paused === 1,
    createdAt: row.created_at,
  };
}

function toProgress(row: ProgressRow): CardProgress {
  return {
    cardId: row.card_id,
    cardKind: row.card_kind,
    repetition: row.repetition,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    dueAt: row.due_at,
    lapses: row.lapses,
    phase: row.phase,
    lastReviewedAt: row.last_reviewed_at,
    boostReason: row.boost_reason,
  };
}

function toReviewState(progress: CardProgress): ReviewState {
  const { repetition, intervalDays, easeFactor, dueAt, lapses, phase, lastReviewedAt } = progress;
  return { repetition, intervalDays, easeFactor, dueAt, lapses, phase, lastReviewedAt };
}

function toPending(row: PendingRow): PendingProbe {
  return {
    userId: row.user_id,
    cardId: row.card_id,
    phase: row.phase,
    questionMessageId: row.question_message_id,
    feedbackMessageId: row.feedback_message_id,
    answer: row.answer,
    verdict: row.verdict ? (JSON.parse(row.verdict) as Evaluation) : null,
    askedAt: row.asked_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: EventRow): ActivityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    detail: row.detail ? (JSON.parse(row.detail) as Record<string, unknown>) : null,
    createdAt: row.created_at,
  };
}

function toIdeAttempt(row: IdeAttemptRow): IdeAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    problemId: row.problem_id,
    stage: row.stage,
    language: row.language,
    passed: row.passed === 1,
    testsPassed: row.tests_passed,
    testsTotal: row.tests_total,
    hintsUsed: row.hints_used,
    attemptNumber: row.attempt_number,
    gaveUp: row.gave_up === 1,
    struggled: row.struggled === 1,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

function toSparSession(row: SparRow): SparSession {
  const feedback = JSON.parse(row.feedback) as BehavioralFeedback;
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    transcript: row.transcript,
    durationMs: row.duration_ms,
    scores: feedback.scores,
    overall: row.overall,
    feedback,
    createdAt: row.created_at,
  };
}

const STAGE_LABELS: Record<IdeStage, string> = { invariant: "invariant", edgeCase: "edge case", code: "code" };

/** Default IDE struggle rule: failed, gave up, leaned on hints, or needed many tries. */
export function isIdeStruggle(input: Pick<IdeAttemptInput, "passed" | "gaveUp" | "hintsUsed" | "attemptNumber">): boolean {
  return Boolean(input.gaveUp) || !input.passed || (input.hintsUsed ?? 0) >= 2 || (input.attemptNumber ?? 1) >= 3;
}

/**
 * All persistent state. Synchronous (better-sqlite3); every time-dependent
 * method takes an injected `now` (epoch ms). Card ids come from the content
 * registry and progress rows are created lazily on first grade or schedule.
 */
export class SynapseStore {
  readonly scheduler: SchedulerOptions;
  readonly demoScale: boolean;
  private readonly statements = new Map<string, Database.Statement>();

  constructor(
    readonly db: Database.Database,
    readonly policy: StorePolicy,
  ) {
    this.scheduler = schedulerOptions(policy.dayMs);
    this.demoScale = isDemoScale(policy.dayMs);
  }

  close(): void {
    this.db.close();
  }

  private stmt(sql: string): Database.Statement {
    let statement = this.statements.get(sql);
    if (!statement) {
      statement = this.db.prepare(sql);
      this.statements.set(sql, statement);
    }
    return statement;
  }

  private transaction<T>(work: () => T): T {
    return this.db.transaction(work).immediate();
  }

  private localDay(now: number): string {
    return localDayKey(now, this.policy.timezone);
  }

  // ── Users & linking ──────────────────────────────────────────────────────

  /** Creates the user if missing (defaults apply only on creation) and returns it. */
  ensureUser(id: string, now: number, defaults: Omit<Partial<SpaceIdentity>, "spaceId"> = {}): User {
    this.stmt(
      `INSERT INTO users (id, display_name, handle, platform, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
    ).run(
      id,
      defaults.displayName ?? null,
      defaults.handle ? normalizeHandle(defaults.handle) : null,
      defaults.platform ?? null,
      now,
    );
    return this.getUser(id)!;
  }

  getUser(id: string): User | null {
    const row = this.stmt("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  findUserBySpace(spaceId: string): User | null {
    const row = this.stmt("SELECT * FROM users WHERE space_id = ?").get(spaceId) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  findUserByHandle(handle: string): User | null {
    const row = this.stmt("SELECT * FROM users WHERE handle = ? ORDER BY created_at LIMIT 1").get(normalizeHandle(handle)) as
      | UserRow
      | undefined;
    return row ? toUser(row) : null;
  }

  listUsers(): User[] {
    return (this.stmt("SELECT * FROM users ORDER BY created_at, id").all() as UserRow[]).map(toUser);
  }

  /** Resolves the texter's user by space, then handle (re-binding the space); otherwise creates one. */
  ensureUserForSpace(identity: SpaceIdentity, now: number): { user: User; created: boolean } {
    return this.transaction(() => {
      const bySpace = this.findUserBySpace(identity.spaceId);
      if (bySpace) return { user: bySpace, created: false };
      const byHandle = identity.handle ? this.findUserByHandle(identity.handle) : null;
      if (byHandle) return { user: this.bindSpace(byHandle.id, identity), created: false };
      const id = `u-${randomUUID().slice(0, 8)}`;
      this.stmt(
        `INSERT INTO users (id, display_name, handle, space_id, platform, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        identity.displayName ?? null,
        identity.handle ? normalizeHandle(identity.handle) : null,
        identity.spaceId,
        identity.platform ?? null,
        now,
      );
      return { user: this.getUser(id)!, created: true };
    });
  }

  /** The 4-digit code the dashboard shows; texting "link <code>" binds that iMessage space. */
  createOrGetLinkCode(userId: string): string {
    return this.transaction(() => {
      const user = this.getUser(userId);
      if (!user) throw new Error(`Unknown user: ${userId}`);
      if (user.linkCode) return user.linkCode;
      const taken = this.stmt("SELECT 1 FROM users WHERE link_code = ?");
      let code: string;
      do code = String(randomInt(1000, 10_000));
      while (taken.get(code));
      this.stmt("UPDATE users SET link_code = ? WHERE id = ?").run(code, userId);
      return code;
    });
  }

  /** Binds the space to the user holding `code` (merging any placeholder user for that space). Null if no match. */
  linkByCode(code: string, identity: SpaceIdentity, now: number): User | null {
    const normalized = code.trim();
    if (!LINK_CODE_PATTERN.test(normalized)) return null;
    return this.transaction(() => {
      const row = this.stmt("SELECT * FROM users WHERE link_code = ?").get(normalized) as UserRow | undefined;
      return row ? this.linkUser(row.id, identity, now) : null;
    });
  }

  /**
   * "start" from a new texter: links them when exactly one other user exists and
   * it is unlinked (the single-tenant web user). Null otherwise.
   */
  autoLinkSoleUser(identity: SpaceIdentity, now: number): User | null {
    return this.transaction(() => {
      const others = this.listUsers().filter((user) => user.spaceId !== identity.spaceId);
      const [only] = others;
      if (others.length !== 1 || !only || only.spaceId) return null;
      return this.linkUser(only.id, identity, now);
    });
  }

  setPaused(userId: string, paused: boolean, now: number): User {
    if (!this.getUser(userId)) throw new Error(`Unknown user: ${userId}`);
    this.stmt("UPDATE users SET paused = ? WHERE id = ?").run(paused ? 1 : 0, userId);
    this.logEvent(userId, paused ? "paused" : "resumed", paused ? "⏸️ Paused texts" : "▶️ Resumed texts", null, now);
    return this.getUser(userId)!;
  }

  private bindSpace(userId: string, identity: SpaceIdentity): User {
    this.stmt(
      `UPDATE users SET space_id = ?, handle = COALESCE(?, handle), platform = COALESCE(?, platform),
         display_name = COALESCE(display_name, ?)
       WHERE id = ?`,
    ).run(
      identity.spaceId,
      identity.handle ? normalizeHandle(identity.handle) : null,
      identity.platform ?? null,
      identity.displayName ?? null,
      userId,
    );
    return this.getUser(userId)!;
  }

  private linkUser(targetId: string, identity: SpaceIdentity, now: number): User {
    const holder = this.findUserBySpace(identity.spaceId);
    if (holder && holder.id !== targetId) this.mergeUserInto(holder.id, targetId);
    this.bindSpace(targetId, identity);
    this.stmt("UPDATE users SET link_code = NULL WHERE id = ?").run(targetId);
    this.logEvent(targetId, "linked", "📱 iMessage linked", { handle: identity.handle ?? null }, now);
    return this.getUser(targetId)!;
  }

  /** Moves a placeholder user's history onto `toId` (target wins on conflicts), then deletes it. */
  private mergeUserInto(fromId: string, toId: string): void {
    for (const table of ["card_progress", "weak_tags", "pending"]) {
      this.stmt(`UPDATE OR IGNORE ${table} SET user_id = ? WHERE user_id = ?`).run(toId, fromId);
      this.stmt(`DELETE FROM ${table} WHERE user_id = ?`).run(fromId);
    }
    for (const table of ["review_log", "push_log", "ide_attempts", "spar_sessions", "events"]) {
      this.stmt(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`).run(toId, fromId);
    }
    this.stmt("DELETE FROM users WHERE id = ?").run(fromId);
  }

  // ── Progress & grading ───────────────────────────────────────────────────

  getProgress(userId: string, cardId: string): CardProgress | null {
    const row = this.stmt("SELECT * FROM card_progress WHERE user_id = ? AND card_id = ?").get(userId, cardId) as
      | ProgressRow
      | undefined;
    return row ? toProgress(row) : null;
  }

  /** The card's scheduling state, or a fresh one if the user has never seen it. */
  cardState(userId: string, cardId: string, now: number): ReviewState {
    const progress = this.getProgress(userId, cardId);
    return progress ? toReviewState(progress) : newReviewState(now);
  }

  /** What each tapback would do to this card right now (for "❤️ 4d · 👍 1d · 👎 10m"). */
  previewCard(userId: string, cardId: string, now: number): Record<Rating, IntervalPreview> {
    return previewIntervals(this.cardState(userId, cardId, now), now, this.scheduler);
  }

  /** Progress rows whose card still exists in the content registry. */
  listProgress(userId: string): CardProgress[] {
    const rows = this.stmt("SELECT * FROM card_progress WHERE user_id = ?").all(userId) as ProgressRow[];
    return rows.map(toProgress).filter((progress) => getCard(progress.cardId));
  }

  private writeProgress(userId: string, card: ReviewCard, state: ReviewState, boostReason: string | null, now: number): void {
    this.stmt(
      `INSERT INTO card_progress
         (user_id, card_id, card_kind, repetition, interval_days, ease_factor, due_at, lapses, phase, last_reviewed_at, boost_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, card_id) DO UPDATE SET
         repetition = excluded.repetition, interval_days = excluded.interval_days, ease_factor = excluded.ease_factor,
         due_at = excluded.due_at, lapses = excluded.lapses, phase = excluded.phase,
         last_reviewed_at = excluded.last_reviewed_at, boost_reason = excluded.boost_reason`,
    ).run(
      userId,
      card.id,
      card.kind,
      state.repetition,
      state.intervalDays,
      state.easeFactor,
      state.dueAt,
      state.lapses,
      state.phase,
      state.lastReviewedAt,
      boostReason,
      now,
    );
  }

  /**
   * Applies SM-2, logs the review and an activity event, adjusts tag weakness
   * (failures flag, effortless recalls relieve), and clears the pending probe
   * if it was for this card.
   */
  gradeCard(input: GradeInput): GradeOutcome {
    const card = getCard(input.cardId);
    if (!card) throw new Error(`Unknown card: ${input.cardId}`);
    const { userId, grade, now } = input;

    return this.transaction(() => {
      const before = this.cardState(userId, card.id, now);
      const after = gradeReview(before, grade, now, this.scheduler);
      this.writeProgress(userId, card, after, null, now);

      const review = this.stmt(
        `INSERT INTO review_log
           (user_id, card_id, card_kind, grade, source, answer, verdict, phase_before, interval_before, interval_after, ease_after, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        userId,
        card.id,
        card.kind,
        grade,
        input.source,
        input.answer ?? null,
        input.verdict ? JSON.stringify(input.verdict) : null,
        before.phase,
        before.intervalDays,
        after.intervalDays,
        after.easeFactor,
        now,
      );

      if (!isPassingGrade(grade)) this.flagWeakness(userId, card.tags, "review", WEAKNESS_WEIGHTS.failedReview, now);
      else if (grade === 5) this.relieveWeakness(userId, card.tags);

      this.stmt("DELETE FROM pending WHERE user_id = ? AND card_id = ?").run(userId, card.id);

      const nextLabel = formatInterval((after.dueAt - now) / this.policy.dayMs);
      this.logEvent(
        userId,
        "review",
        `${isPassingGrade(grade) ? "🧠" : "🔁"} ${card.title} → ${nextLabel}`,
        { cardId: card.id, grade, source: input.source, verdict: input.verdict?.verdict ?? null, nextLabel },
        now,
      );

      return {
        card,
        before,
        after,
        wasNew: before.phase === "new",
        reviewId: Number(review.lastInsertRowid),
        nextLabel,
      };
    });
  }

  /**
   * Pulls cards forward to `dueAt` (never pushes an earlier due date back) and
   * marks them with `reason` so the agent can frame them ("🎯 drill").
   */
  scheduleCardsAt(userId: string, cardIds: readonly string[], dueAt: number, now: number, reason = "drill"): ScheduledDrill[] {
    return this.transaction(() =>
      cardIds.flatMap((cardId) => {
        const card = getCard(cardId);
        if (!card) return [];
        const existing = this.getProgress(userId, cardId);
        const state = existing ? toReviewState(existing) : newReviewState(now);
        const effectiveDueAt = existing ? Math.min(existing.dueAt, dueAt) : dueAt;
        this.writeProgress(userId, card, { ...state, dueAt: effectiveDueAt }, reason, now);
        return [{ cardId, title: card.title, dueAt: effectiveDueAt }];
      }),
    );
  }

  // ── Selection & forecast ─────────────────────────────────────────────────

  private newCardWindowStart(now: number): number {
    return this.demoScale ? now - this.policy.dayMs : startOfLocalDay(now, this.policy.timezone);
  }

  /** New cards introduced (first graded) in the current SRS day. */
  newCardsIntroduced(userId: string, now: number): number {
    const row = this.stmt(
      "SELECT COUNT(*) AS n FROM review_log WHERE user_id = ? AND phase_before = 'new' AND reviewed_at >= ?",
    ).get(userId, this.newCardWindowStart(now)) as { n: number };
    return row.n;
  }

  /**
   * Due cards first (drills, then overdue ratio × weak-tag boost); otherwise a
   * new card within the daily cap, preferring currently weak tags. Null when
   * nothing is due and no new card is allowed.
   */
  nextCard(userId: string, now: number, options: NextCardOptions = {}): NextCardPick | null {
    const excluded = new Set(options.excludeCardIds ?? []);
    const kinds = options.kinds ? new Set(options.kinds) : null;
    const eligible = (card: ReviewCard) => !excluded.has(card.id) && (!kinds || kinds.has(card.kind));
    const order = new Map(allCards().map((card, index) => [card.id, index]));
    const weakScores = this.weakScoreMap(userId, now);
    const weakTagsOf = (card: ReviewCard) => card.tags.filter((tag) => (weakScores.get(tag) ?? 0) >= WEAK_THRESHOLD);

    const progress = this.listProgress(userId);
    const due: DueCandidate[] = progress.flatMap((entry) => {
      const card = getCard(entry.cardId)!;
      return entry.dueAt <= now && eligible(card) ? [{ card, progress: entry, order: order.get(card.id)! }] : [];
    });
    const dueChoice = pickDue(due, now, weakScores, this.scheduler);
    if (dueChoice) {
      return {
        card: dueChoice.card,
        state: toReviewState(dueChoice.progress),
        reason: dueChoice.progress.boostReason === "drill" ? "drill" : "due",
        weakTags: weakTagsOf(dueChoice.card),
      };
    }

    if (options.includeNew === false || this.newCardsIntroduced(userId, now) >= this.policy.newPerDay) return null;
    const seen = new Set(progress.map((entry) => entry.cardId));
    const unseen = allCards()
      .filter((card) => !seen.has(card.id) && eligible(card))
      .map((card) => ({ card, order: order.get(card.id)! }));
    const fresh = pickNew(unseen, weakScores);
    return fresh ? { card: fresh, state: newReviewState(now), reason: "new", weakTags: weakTagsOf(fresh) } : null;
  }

  dueCount(userId: string, now: number): number {
    return this.listProgress(userId).filter((entry) => entry.dueAt <= now).length;
  }

  /** Start of each forecast bucket: local calendar days, or dayMs windows from now at demo scale. */
  private bucketStarts(now: number, days: number): number[] {
    if (this.demoScale) return Array.from({ length: days + 1 }, (_, i) => now + i * this.policy.dayMs);
    const today = this.localDay(now);
    return Array.from({ length: days + 1 }, (_, i) => dayKeyStart(shiftDayKey(today, i), this.policy.timezone));
  }

  private bucketLabel(offset: number, startsAt: number): string {
    if (offset === 0) return "Today";
    if (this.demoScale) return `+${offset}d`;
    if (offset === 1) return "Tmrw";
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][localParts(startsAt, this.policy.timezone).weekday]!;
  }

  /** Due counts per SRS day for the next `days` days; overdue cards count toward today. */
  forecast(userId: string, now: number, days = 14): ForecastDay[] {
    const starts = this.bucketStarts(now, days);
    const buckets: ForecastDay[] = starts.slice(0, days).map((startsAt, offset) => ({
      offset,
      label: this.bucketLabel(offset, startsAt),
      startsAt: offset === 0 ? now : startsAt,
      count: 0,
    }));
    for (const entry of this.listProgress(userId)) {
      if (entry.dueAt >= starts[days]!) continue;
      let index = 0;
      while (index + 1 < days && entry.dueAt >= starts[index + 1]!) index++;
      buckets[index]!.count += 1;
    }
    return buckets;
  }

  // ── Pending probe (one outstanding question per user) ───────────────────

  getPending(userId: string): PendingProbe | null {
    const row = this.stmt("SELECT * FROM pending WHERE user_id = ?").get(userId) as PendingRow | undefined;
    return row ? toPending(row) : null;
  }

  /** Replaces the user's outstanding probe (asked_at is kept when the card is unchanged). */
  setPending(userId: string, input: PendingInput, now: number): PendingProbe {
    this.stmt(
      `INSERT INTO pending (user_id, card_id, phase, question_message_id, feedback_message_id, answer, verdict, asked_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         asked_at = CASE WHEN pending.card_id = excluded.card_id THEN pending.asked_at ELSE excluded.asked_at END,
         card_id = excluded.card_id, phase = excluded.phase, question_message_id = excluded.question_message_id,
         feedback_message_id = excluded.feedback_message_id, answer = excluded.answer, verdict = excluded.verdict,
         updated_at = excluded.updated_at`,
    ).run(
      userId,
      input.cardId,
      input.phase,
      input.questionMessageId ?? null,
      input.feedbackMessageId ?? null,
      input.answer ?? null,
      input.verdict ? JSON.stringify(input.verdict) : null,
      now,
      now,
    );
    return this.getPending(userId)!;
  }

  /** Patches the outstanding probe; fields not in `patch` are kept. Null when none is pending. */
  updatePending(userId: string, patch: PendingPatch, now: number): PendingProbe | null {
    const current = this.getPending(userId);
    if (!current) return null;
    return this.setPending(
      userId,
      {
        cardId: current.cardId,
        phase: patch.phase ?? current.phase,
        questionMessageId: patch.questionMessageId !== undefined ? patch.questionMessageId : current.questionMessageId,
        feedbackMessageId: patch.feedbackMessageId !== undefined ? patch.feedbackMessageId : current.feedbackMessageId,
        answer: patch.answer !== undefined ? patch.answer : current.answer,
        verdict: patch.verdict !== undefined ? patch.verdict : current.verdict,
      },
      now,
    );
  }

  clearPending(userId: string): void {
    this.stmt("DELETE FROM pending WHERE user_id = ?").run(userId);
  }

  /** Deletes (without grading) probes asked more than `ttlMs` ago; returns what expired. */
  expireStalePending(now: number, ttlMs: number): PendingProbe[] {
    return this.transaction(() => {
      const rows = this.stmt("SELECT * FROM pending WHERE asked_at <= ?").all(now - ttlMs) as PendingRow[];
      this.stmt("DELETE FROM pending WHERE asked_at <= ?").run(now - ttlMs);
      return rows.map(toPending);
    });
  }

  // ── Push accounting ──────────────────────────────────────────────────────

  recordPush(userId: string, kind: PushKind, now: number, cardId?: string): void {
    this.stmt("INSERT INTO push_log (user_id, kind, card_id, local_day, sent_at) VALUES (?, ?, ?, ?, ?)").run(
      userId,
      kind,
      cardId ?? null,
      this.localDay(now),
      now,
    );
    const card = cardId ? getCard(cardId) : undefined;
    const title = kind === "morning" ? "☕ Morning Synapse sent" : card ? `📲 Texted: ${card.title}` : "📲 Nudge sent";
    this.logEvent(userId, `push_${kind}`, title, cardId ? { cardId } : null, now);
  }

  /** Proactive texts sent during the user's current local day. */
  pushesToday(userId: string, now: number): number {
    const row = this.stmt("SELECT COUNT(*) AS n FROM push_log WHERE user_id = ? AND local_day = ?").get(
      userId,
      this.localDay(now),
    ) as { n: number };
    return row.n;
  }

  morningSentToday(userId: string, now: number): boolean {
    return Boolean(
      this.stmt("SELECT 1 FROM push_log WHERE user_id = ? AND local_day = ? AND kind = 'morning'").get(userId, this.localDay(now)),
    );
  }

  lastPushAt(userId: string): number | null {
    const row = this.stmt("SELECT MAX(sent_at) AS at FROM push_log WHERE user_id = ?").get(userId) as { at: number | null };
    return row.at;
  }

  // ── Weakness ─────────────────────────────────────────────────────────────

  private weakRows(userId: string): WeakRow[] {
    return this.stmt("SELECT tag, score, last_flagged_at, source FROM weak_tags WHERE user_id = ?").all(userId) as WeakRow[];
  }

  private weakScoreMap(userId: string, now: number): Map<Tag, number> {
    return new Map(
      this.weakRows(userId).map((row) => [row.tag, decayScore(row.score, row.last_flagged_at, now, this.policy.dayMs)]),
    );
  }

  /** Adds `weight` to each tag's decayed weakness (capped). */
  flagWeakness(userId: string, tags: readonly Tag[], source: WeaknessSource, weight: number, now: number): WeakTag[] {
    const unique = [...new Set(tags)];
    if (unique.length === 0) return [];
    return this.transaction(() => {
      const current = this.weakScoreMap(userId, now);
      const updated = unique.map((tag): WeakTag => {
        const score = Math.min(WEAK_MAX_SCORE, (current.get(tag) ?? 0) + weight);
        this.stmt(
          `INSERT INTO weak_tags (user_id, tag, score, last_flagged_at, source) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, tag) DO UPDATE SET score = excluded.score, last_flagged_at = excluded.last_flagged_at, source = excluded.source`,
        ).run(userId, tag, score, now, source);
        return { tag, label: tagLabel(tag), score: Math.round(score * 100) / 100, lastFlaggedAt: now, source };
      });
      if (source !== "review") {
        this.logEvent(userId, "weak_flag", `⚠️ Weak spot: ${unique.map(tagLabel).join(", ")}`, { tags: unique, source }, now);
      }
      return updated;
    });
  }

  private relieveWeakness(userId: string, tags: readonly Tag[]): void {
    const relieve = this.stmt("UPDATE weak_tags SET score = score * ? WHERE user_id = ? AND tag = ?");
    for (const tag of new Set(tags)) relieve.run(EFFORTLESS_RELIEF, userId, tag);
  }

  /** Current weak spots (decayed score >= WEAK_THRESHOLD), weakest first. */
  weakTags(userId: string, now: number): WeakTag[] {
    return this.weakRows(userId)
      .map((row) => ({
        tag: row.tag,
        label: tagLabel(row.tag),
        score: Math.round(decayScore(row.score, row.last_flagged_at, now, this.policy.dayMs) * 100) / 100,
        lastFlaggedAt: row.last_flagged_at,
        source: row.source,
      }))
      .filter((weak) => weak.score >= WEAK_THRESHOLD)
      .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag));
  }

  // ── IDE (sync to iMessage) ───────────────────────────────────────────────

  /** When a struggle's drills arrive: next local morning, or one SRS day later at demo scale. */
  nextDrillTime(now: number): number {
    return this.demoScale ? now + this.policy.dayMs : nextLocalTime(now, this.policy.timezone, this.policy.morningHour);
  }

  private describeDrillTime(now: number, at: number): string {
    return this.demoScale ? `in ${humanizeDuration(at - now)}` : describeLocalTime(now, at, this.policy.timezone);
  }

  /**
   * Records a stage submission. A struggle (see isIdeStruggle) flags the
   * problem's weakTags and schedules up to 2 related micro-cards for the next
   * morning — once per problem per SRS day; repeats report the existing drills.
   * Finishing the code stage (pass or give up) also grades the problem card.
   */
  recordIdeAttempt(input: IdeAttemptInput): IdeAttemptResult {
    const problem = getProblem(input.problemId);
    if (!problem) throw new Error(`Unknown problem: ${input.problemId}`);
    const { userId, now } = input;
    const struggled = input.struggled ?? isIdeStruggle(input);

    return this.transaction(() => {
      const alreadyStruggledToday = Boolean(
        this.stmt(
          "SELECT 1 FROM ide_attempts WHERE user_id = ? AND problem_id = ? AND struggled = 1 AND created_at >= ?",
        ).get(userId, problem.id, this.newCardWindowStart(now)),
      );

      const inserted = this.stmt(
        `INSERT INTO ide_attempts
           (user_id, problem_id, stage, language, passed, tests_passed, tests_total, hints_used, attempt_number, gave_up, struggled, duration_ms, code, answer, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        userId,
        problem.id,
        input.stage,
        input.language ?? null,
        input.passed ? 1 : 0,
        input.testsPassed ?? null,
        input.testsTotal ?? null,
        input.hintsUsed ?? 0,
        input.attemptNumber ?? 1,
        input.gaveUp ? 1 : 0,
        struggled ? 1 : 0,
        input.durationMs ?? null,
        input.code ?? null,
        input.answer ?? null,
        now,
      );

      let flaggedTags: Tag[] = [];
      let drills: ScheduledDrill[] = [];
      if (struggled) {
        const candidates = drillCardsForProblem(problem).slice(0, MAX_DRILLS_PER_STRUGGLE);
        if (alreadyStruggledToday) {
          drills = candidates.flatMap((card) => {
            const progress = this.getProgress(userId, card.id);
            return progress?.boostReason === "drill" ? [{ cardId: card.id, title: card.title, dueAt: progress.dueAt }] : [];
          });
        } else {
          flaggedTags = this.flagWeakness(userId, problem.weakTags, "ide", WEAKNESS_WEIGHTS.ideStruggle, now).map((weak) => weak.tag);
          drills = this.scheduleCardsAt(userId, candidates.map((card) => card.id), this.nextDrillTime(now), now, "drill");
          if (drills.length > 0) {
            this.logEvent(
              userId,
              "drill_scheduled",
              `🎯 Drill queued: ${drills.map((drill) => drill.title).join(" + ")}`,
              { problemId: problem.id, cardIds: drills.map((drill) => drill.cardId) },
              now,
            );
          }
        }
      }

      const finishedCode = input.stage === "code" && (input.passed || Boolean(input.gaveUp));
      const grade: Grade = input.passed ? (struggled ? 3 : 5) : 1;
      const graded = finishedCode
        ? this.gradeCard({ userId, cardId: problem.id, grade, source: "ide", now, answer: input.code ?? null })
        : null;

      this.logEvent(
        userId,
        "ide_attempt",
        `${input.passed ? "✅" : "🧩"} ${problem.title} · ${STAGE_LABELS[input.stage]}`,
        { problemId: problem.id, stage: input.stage, passed: input.passed, struggled },
        now,
      );

      const drillAt = drills.length > 0 ? Math.min(...drills.map((drill) => drill.dueAt)) : null;
      return {
        attemptId: Number(inserted.lastInsertRowid),
        struggled,
        flaggedTags,
        drills,
        drillAt,
        drillLabel: drillAt === null ? null : this.describeDrillTime(now, drillAt),
        graded,
      };
    });
  }

  listIdeAttempts(userId: string, problemId?: string, limit = 50): IdeAttempt[] {
    const rows = (
      problemId
        ? this.stmt("SELECT * FROM ide_attempts WHERE user_id = ? AND problem_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(
            userId,
            problemId,
            limit,
          )
        : this.stmt("SELECT * FROM ide_attempts WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(userId, limit)
    ) as IdeAttemptRow[];
    return rows.map(toIdeAttempt);
  }

  // ── Voice sparring ───────────────────────────────────────────────────────

  recordSparSession(input: SparSessionInput): SparSession {
    const inserted = this.stmt(
      `INSERT INTO spar_sessions (user_id, question_id, transcript, duration_ms, overall, feedback, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.userId,
      input.questionId,
      input.transcript,
      input.durationMs,
      input.feedback.overall,
      JSON.stringify(input.feedback),
      input.now,
    );
    const id = Number(inserted.lastInsertRowid);
    this.logEvent(
      input.userId,
      "spar",
      `🎙️ Sparring round · ${input.feedback.overall}/100`,
      { sessionId: id, questionId: input.questionId },
      input.now,
    );
    return toSparSession(this.stmt("SELECT * FROM spar_sessions WHERE id = ?").get(id) as SparRow);
  }

  listSparSessions(userId: string, limit = 20): SparSession[] {
    const rows = this.stmt("SELECT * FROM spar_sessions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(
      userId,
      limit,
    ) as SparRow[];
    return rows.map(toSparSession);
  }

  // ── Activity feed ────────────────────────────────────────────────────────

  logEvent(userId: string, kind: string, title: string, detail: Record<string, unknown> | null, now: number): number {
    const result = this.stmt("INSERT INTO events (user_id, kind, title, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(
      userId,
      kind,
      title,
      detail ? JSON.stringify(detail) : null,
      now,
    );
    return Number(result.lastInsertRowid);
  }

  recentEvents(userId: string, limit = 15): ActivityEvent[] {
    const rows = this.stmt("SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(
      userId,
      limit,
    ) as EventRow[];
    return rows.map(toEvent);
  }

  // ── Dashboard stats ──────────────────────────────────────────────────────

  private reviewsByDay(userId: string, now: number, days: number): DayActivity[] {
    const today = this.localDay(now);
    const keys = Array.from({ length: days }, (_, i) => shiftDayKey(today, i - days + 1));
    const byKey = new Map(keys.map((dayKey) => [dayKey, { dayKey, reviews: 0, passed: 0 }]));
    const rows = this.stmt(
      "SELECT grade, reviewed_at FROM review_log WHERE user_id = ? AND reviewed_at >= ? AND reviewed_at <= ?",
    ).all(userId, dayKeyStart(keys[0]!, this.policy.timezone), now) as { grade: number; reviewed_at: number }[];
    for (const row of rows) {
      const bucket = byKey.get(this.localDay(row.reviewed_at));
      if (!bucket) continue;
      bucket.reviews += 1;
      if (isPassingGrade(row.grade)) bucket.passed += 1;
    }
    return keys.map((dayKey) => byKey.get(dayKey)!);
  }

  private activeDayKeys(userId: string, now: number): Set<string> {
    const since = now - STREAK_LOOKBACK_MS;
    const rows = this.stmt(
      `SELECT reviewed_at AS at FROM review_log WHERE user_id = @userId AND reviewed_at >= @since
       UNION ALL SELECT created_at FROM ide_attempts WHERE user_id = @userId AND created_at >= @since
       UNION ALL SELECT created_at FROM spar_sessions WHERE user_id = @userId AND created_at >= @since`,
    ).all({ userId, since }) as { at: number }[];
    return new Set(rows.filter((row) => row.at <= now).map((row) => this.localDay(row.at)));
  }

  private masteryByTag(progressById: ReadonlyMap<string, CardProgress>, weakScores: ReadonlyMap<Tag, number>): TagMastery[] {
    return tagsWithContent().map((tag) => {
      const cards = cardsByTag(tag);
      const states = cards.map((card) => progressById.get(card.id));
      const progressSum = states.reduce(
        (sum, state) => sum + (state ? Math.min(state.intervalDays / MASTERED_INTERVAL_DAYS, 1) : 0),
        0,
      );
      return {
        tag,
        label: tagLabel(tag),
        cards: cards.length,
        learned: states.filter((state) => state?.phase === "review").length,
        mastered: states.filter((state) => (state?.intervalDays ?? 0) >= MASTERED_INTERVAL_DAYS).length,
        progress: Math.round((progressSum / cards.length) * 100) / 100,
        weakScore: Math.round((weakScores.get(tag) ?? 0) * 100) / 100,
      };
    });
  }

  /** Everything the dashboard renders. Ensures the user row (and, while unlinked, a link code) exists. */
  stats(userId: string, now: number): Stats {
    const user = this.ensureUser(userId, now);
    const linked = Boolean(user.spaceId);
    const link: LinkStatus = {
      linked,
      spaceId: user.spaceId,
      handle: user.handle,
      platform: user.platform,
      linkCode: linked ? null : this.createOrGetLinkCode(userId),
      paused: user.paused,
    };

    const progress = this.listProgress(userId);
    const progressById = new Map(progress.map((entry) => [entry.cardId, entry]));
    const reviewsByDay = this.reviewsByDay(userId, now, 30);
    const totals = reviewsByDay.reduce(
      (sum, day) => ({ reviews: sum.reviews + day.reviews, passed: sum.passed + day.passed }),
      { reviews: 0, passed: 0 },
    );

    return {
      userId,
      generatedAt: now,
      dueNow: progress.filter((entry) => entry.dueAt <= now).length,
      reviewedToday: reviewsByDay[reviewsByDay.length - 1]!.reviews,
      streakDays: computeStreak(this.activeDayKeys(userId, now), this.localDay(now)),
      retention30d: totals.reviews > 0 ? Math.round((totals.passed / totals.reviews) * 1000) / 1000 : null,
      cardsLearned: progress.filter((entry) => entry.phase === "review").length,
      totalCards: allCards().length,
      forecast14: this.forecast(userId, now, 14),
      reviewsByDay,
      masteryByTag: this.masteryByTag(progressById, this.weakScoreMap(userId, now)),
      weakTags: this.weakTags(userId, now),
      recentActivity: this.recentEvents(userId, 12),
      link,
      demoScale: this.demoScale,
    };
  }
}
