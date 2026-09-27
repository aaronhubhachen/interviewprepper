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
  isWithinActiveHours,
  localDayKey,
  localParts,
  nextLocalTime,
  shiftDayKey,
  startOfLocalDay,
} from "../time";
import { isGroupSpace, LINK_CODE_LENGTH, LINK_CODE_PATTERN, normalizeHandle } from "./identity";
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
  ReviewSource,
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
  link_code_issued_at: number | null;
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

interface ReviewLogRow {
  id: number;
  user_id: string;
  card_id: string;
  grade: number;
  source: string;
  answer: string | null;
  verdict: string | null;
  reviewed_at: number;
}

/** What a review overwrote (review_undo), so regradeReview can put it back. */
interface UndoSnapshot {
  progress: (ProgressRow & { created_at: number }) | null;
  weak: WeakRow[];
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

/** Wrong "link <code>" guesses are remembered this long (wall clock, at any SRS scale). */
export const LINK_FAILURE_WINDOW_MS = 60 * 60_000;
/** A chat (or handle) with this many wrong codes inside the window is locked out of linking until they age out. */
export const MAX_LINK_FAILURES_PER_SENDER = 5;
/**
 * Once this many wrong codes arrive inside the window across all chats, every further
 * miss rotates the outstanding link codes, so a spray of guesses from many chats can
 * never walk the code space. Nobody is locked out: the dashboard shows the new code.
 */
export const LINK_CODE_ROTATE_AFTER_FAILURES = 20;
/**
 * The spray rotation spares codes younger than this, so a guesser cannot keep
 * invalidating the code the owner just loaded on the dashboard.
 */
export const LINK_CODE_ROTATE_MIN_AGE_MS = 2 * 60_000;
/** A link code works this long after it is issued (wall clock, at any SRS scale); the dashboard then shows a new one. */
export const LINK_CODE_TTL_MS = 10 * 60_000;

function isFreshLinkCode(row: Pick<UserRow, "link_code" | "link_code_issued_at">, now: number): boolean {
  return (
    row.link_code !== null &&
    LINK_CODE_PATTERN.test(row.link_code) &&
    row.link_code_issued_at !== null &&
    now - row.link_code_issued_at < LINK_CODE_TTL_MS
  );
}

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

  /**
   * The texter's user without creating one. In a DM: by space, then by handle
   * (re-binding the user's home space to this DM). In a group chat: by handle
   * only, never re-binding, so other members can't act as a linked user and
   * probes never move to the group.
   */
  findUserForIdentity(identity: SpaceIdentity): User | null {
    return this.transaction(() => this.resolveIdentity(identity));
  }

  /** Resolves the texter's user as findUserForIdentity does; otherwise creates one. */
  ensureUserForSpace(identity: SpaceIdentity, now: number): { user: User; created: boolean } {
    return this.transaction(() => {
      const existing = this.resolveIdentity(identity);
      if (existing) return { user: existing, created: false };
      // A group sender with a handle gets an account with no home space (a later DM binds one).
      // Without a handle the members can't be told apart, so the chat gets one placeholder.
      const homeSpace = isGroupSpace(identity) && identity.handle ? null : identity.spaceId;
      const id = `u-${randomUUID().slice(0, 8)}`;
      this.stmt(
        `INSERT INTO users (id, display_name, handle, space_id, platform, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        identity.displayName ?? null,
        identity.handle ? normalizeHandle(identity.handle) : null,
        homeSpace,
        identity.platform ?? null,
        now,
      );
      return { user: this.getUser(id)!, created: true };
    });
  }

  private resolveIdentity(identity: SpaceIdentity): User | null {
    if (isGroupSpace(identity)) {
      return identity.handle ? this.findUserByHandle(identity.handle) : this.findUserBySpace(identity.spaceId);
    }
    const bySpace = this.findUserBySpace(identity.spaceId);
    if (bySpace) return bySpace;
    const byHandle = identity.handle ? this.findUserByHandle(identity.handle) : null;
    return byHandle ? this.bindSpace(byHandle.id, identity) : null;
  }

  /**
   * The 6-digit code the dashboard shows; texting "link <code>" binds that iMessage
   * space. Returns the current code while it is fresh (LINK_CODE_TTL_MS), otherwise
   * issues a new one, so a code that leaked (a screenshot, a shoulder) soon stops working.
   */
  createOrGetLinkCode(userId: string, now: number): string {
    return this.transaction(() => {
      const row = this.stmt("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
      if (!row) throw new Error(`Unknown user: ${userId}`);
      if (isFreshLinkCode(row, now)) return row.link_code!;
      return this.issueLinkCode(userId, now);
    });
  }

  /** Replaces the user's link code with a new one right away (the dashboard's "new code" while unlinked). */
  rotateLinkCode(userId: string, now: number): string {
    return this.transaction(() => {
      if (!this.getUser(userId)) throw new Error(`Unknown user: ${userId}`);
      return this.issueLinkCode(userId, now);
    });
  }

  private issueLinkCode(userId: string, now: number): string {
    const taken = this.stmt("SELECT 1 FROM users WHERE link_code = ? AND id != ?");
    const low = 10 ** (LINK_CODE_LENGTH - 1);
    let code: string;
    do code = String(randomInt(low, low * 10));
    while (taken.get(code, userId));
    this.stmt("UPDATE users SET link_code = ?, link_code_issued_at = ? WHERE id = ?").run(code, now, userId);
    return code;
  }

  /**
   * Binds the DM space to the user holding `code` (merging any placeholder user
   * for that space). Null if no match, if the code has expired (LINK_CODE_TTL_MS),
   * if the chat is a group, or while the sender is locked out after too many wrong
   * codes (see isLinkLocked). Wrong and expired codes are recorded; enough of them
   * across all senders rotates the outstanding codes, so the space can't be enumerated.
   */
  linkByCode(code: string, identity: SpaceIdentity, now: number): User | null {
    const normalized = code.trim();
    if (!LINK_CODE_PATTERN.test(normalized) || isGroupSpace(identity)) return null;
    return this.transaction(() => {
      if (this.isLinkLocked(identity, now)) return null;
      const row = this.stmt("SELECT * FROM users WHERE link_code = ?").get(normalized) as UserRow | undefined;
      if (row && isFreshLinkCode(row, now)) return this.linkUser(row.id, identity, now);
      this.recordLinkFailure(identity, now);
      return null;
    });
  }

  /**
   * True after MAX_LINK_FAILURES_PER_SENDER wrong codes from this chat or handle
   * in the last LINK_FAILURE_WINDOW_MS. linkByCode already refuses while locked;
   * callers use this to explain why.
   */
  isLinkLocked(identity: SpaceIdentity, now: number): boolean {
    const since = now - LINK_FAILURE_WINDOW_MS;
    const handle = identity.handle ? normalizeHandle(identity.handle) : null;
    const row = this.stmt(
      `SELECT COUNT(*) AS n FROM link_failures
       WHERE failed_at > ? AND failed_at <= ? AND (space_id = ? OR (? IS NOT NULL AND handle = ?))`,
    ).get(since, now, identity.spaceId, handle, handle) as { n: number };
    return row.n >= MAX_LINK_FAILURES_PER_SENDER;
  }

  private recordLinkFailure(identity: SpaceIdentity, now: number): void {
    const handle = identity.handle ? normalizeHandle(identity.handle) : null;
    const since = now - LINK_FAILURE_WINDOW_MS;
    this.stmt("DELETE FROM link_failures WHERE failed_at <= ?").run(since);
    this.stmt("INSERT INTO link_failures (space_id, handle, failed_at) VALUES (?, ?, ?)").run(identity.spaceId, handle, now);
    const recent = this.stmt("SELECT COUNT(*) AS n FROM link_failures WHERE failed_at > ? AND failed_at <= ?").get(since, now) as {
      n: number;
    };
    // Under a spray of guesses from many chats, every further miss invalidates the codes that have been
    // out for a while (new ones are issued lazily). A just-issued code survives, so the owner can still link.
    if (recent.n >= LINK_CODE_ROTATE_AFTER_FAILURES) {
      this.stmt(
        `UPDATE users SET link_code = NULL, link_code_issued_at = NULL
         WHERE link_code IS NOT NULL AND (link_code_issued_at IS NULL OR link_code_issued_at <= ?)`,
      ).run(now - LINK_CODE_ROTATE_MIN_AGE_MS);
    }
  }

  /**
   * "start" from a new DM: links it to the sole other user when that user is
   * unlinked (the single-tenant web user), but only when the sender's handle
   * proves who they are: it equals the configured owner handle, or (with no
   * owner configured) the handle already on record for that user. Anyone else
   * gets null and must use the link code, so a stranger who texts "start"
   * first cannot claim the dashboard.
   */
  autoLinkSoleUser(identity: SpaceIdentity, now: number): User | null {
    if (isGroupSpace(identity) || !identity.handle?.trim()) return null;
    const sender = normalizeHandle(identity.handle);
    const owner = this.policy.ownerHandle?.trim() ? normalizeHandle(this.policy.ownerHandle) : null;
    if (owner && sender !== owner) return null;
    return this.transaction(() => {
      const others = this.listUsers().filter((user) => user.spaceId !== identity.spaceId);
      const [only] = others;
      if (others.length !== 1 || !only || only.spaceId) return null;
      if (only.handle ? only.handle !== sender : !owner) return null;
      return this.linkUser(only.id, identity, now);
    });
  }

  /**
   * Undoes a link (e.g. the wrong chat claimed the dashboard): clears the home
   * space and handle, drops the open probe, and issues a fresh link code so the
   * right chat can link again. Returns the updated user.
   */
  unlinkUser(userId: string, now: number): User {
    return this.transaction(() => {
      const user = this.getUser(userId);
      if (!user) throw new Error(`Unknown user: ${userId}`);
      if (!user.spaceId && !user.handle) return user;
      this.stmt("UPDATE users SET space_id = NULL, handle = NULL WHERE id = ?").run(userId);
      this.clearPending(userId);
      this.logEvent(userId, "unlinked", "🔌 iMessage unlinked", null, now);
      this.issueLinkCode(userId, now);
      return this.getUser(userId)!;
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
    this.stmt("UPDATE users SET link_code = NULL, link_code_issued_at = NULL WHERE id = ?").run(targetId);
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
    // A placeholder's undo snapshots don't describe the target's rows (the target wins on conflicts).
    this.stmt("DELETE FROM review_undo WHERE user_id = ?").run(fromId);
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
    return this.applyGrade(input, true);
  }

  /**
   * gradeCard's body. `flagFailure: false` skips the failed-review weakness flag
   * when the caller has already flagged this miss (an IDE struggle), so the
   * weak spot keeps its IDE provenance and is not counted twice.
   */
  private applyGrade(input: GradeInput, flagFailure: boolean): GradeOutcome {
    const card = getCard(input.cardId);
    if (!card) throw new Error(`Unknown card: ${input.cardId}`);
    const { userId, grade, now } = input;

    return this.transaction(() => {
      const undo = this.undoSnapshot(userId, card);
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

      const reviewId = Number(review.lastInsertRowid);
      this.stmt("DELETE FROM review_undo WHERE user_id = ? AND card_id = ?").run(userId, card.id);
      this.stmt("INSERT INTO review_undo (review_id, user_id, card_id, progress, weak, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        reviewId,
        userId,
        card.id,
        undo.progress ? JSON.stringify(undo.progress) : null,
        JSON.stringify(undo.weak),
        now,
      );

      if (!isPassingGrade(grade)) {
        if (flagFailure) this.flagWeakness(userId, card.tags, "review", WEAKNESS_WEIGHTS.failedReview, now);
      } else if (grade === 5) {
        this.relieveWeakness(userId, card.tags);
      }

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
        reviewId,
        nextLabel,
      };
    });
  }

  /** The rows a review of `card` overwrites: its progress row and its tags' weak_tags rows. */
  private undoSnapshot(userId: string, card: ReviewCard): UndoSnapshot {
    const progress = this.stmt(
      `SELECT card_id, card_kind, repetition, interval_days, ease_factor, due_at, lapses, phase, last_reviewed_at, boost_reason, created_at
       FROM card_progress WHERE user_id = ? AND card_id = ?`,
    ).get(userId, card.id) as UndoSnapshot["progress"] | undefined;
    const tags = new Set<string>(card.tags);
    const weak = this.weakRows(userId).filter((row) => tags.has(row.tag));
    return { progress: progress ?? null, weak };
  }

  /**
   * Replaces review `reviewId` with `grade` (a changed tapback: ❤️ → 👎), as if
   * the first rating had never happened: restores the card's progress and its
   * tags' weak spots from before that review, deletes the review and its
   * activity event, then grades again at `now` with the same source, answer and
   * verdict. A weak spot re-flagged since by something else (an IDE struggle, a
   * ‼️) is left alone. Returns null, changing nothing, when the review is
   * unknown or the card has been reviewed again since.
   */
  regradeReview(reviewId: number, grade: Grade, now: number): GradeOutcome | null {
    return this.transaction(() => {
      const review = this.stmt("SELECT * FROM review_log WHERE id = ?").get(reviewId) as ReviewLogRow | undefined;
      if (!review || !getCard(review.card_id)) return null;
      const latest = this.stmt("SELECT MAX(id) AS id FROM review_log WHERE user_id = ? AND card_id = ?").get(review.user_id, review.card_id) as {
        id: number | null;
      };
      if (latest.id !== reviewId) return null;
      const undo = this.stmt("SELECT progress, weak FROM review_undo WHERE review_id = ?").get(reviewId) as
        | { progress: string | null; weak: string }
        | undefined;
      if (!undo) return null;

      const card = getCard(review.card_id)!;
      this.stmt("DELETE FROM review_log WHERE id = ?").run(reviewId);
      this.stmt("DELETE FROM review_undo WHERE review_id = ?").run(reviewId);
      this.stmt(
        "DELETE FROM events WHERE user_id = ? AND kind = 'review' AND created_at = ? AND json_extract(detail, '$.cardId') = ?",
      ).run(review.user_id, review.reviewed_at, card.id);
      this.restoreProgress(review.user_id, card.id, undo.progress ? (JSON.parse(undo.progress) as UndoSnapshot["progress"]) : null);
      this.restoreWeak(review.user_id, card.tags, JSON.parse(undo.weak) as WeakRow[], review.reviewed_at);

      return this.applyGrade(
        {
          userId: review.user_id,
          cardId: card.id,
          grade,
          source: review.source as ReviewSource,
          now,
          answer: review.answer,
          verdict: review.verdict ? (JSON.parse(review.verdict) as Evaluation) : null,
        },
        true,
      );
    });
  }

  private restoreProgress(userId: string, cardId: string, prior: UndoSnapshot["progress"]): void {
    if (!prior) {
      this.stmt("DELETE FROM card_progress WHERE user_id = ? AND card_id = ?").run(userId, cardId);
      return;
    }
    this.stmt(
      `UPDATE card_progress SET repetition = ?, interval_days = ?, ease_factor = ?, due_at = ?, lapses = ?, phase = ?,
         last_reviewed_at = ?, boost_reason = ?
       WHERE user_id = ? AND card_id = ?`,
    ).run(
      prior.repetition,
      prior.interval_days,
      prior.ease_factor,
      prior.due_at,
      prior.lapses,
      prior.phase,
      prior.last_reviewed_at,
      prior.boost_reason,
      userId,
      cardId,
    );
  }

  /**
   * Puts back weak-tag rows the review flagged (a fail) or relieved (❤️),
   * leaving alone any tag something else re-flagged since the review.
   */
  private restoreWeak(userId: string, tags: readonly Tag[], prior: readonly WeakRow[], reviewedAt: number): void {
    const current = this.stmt("SELECT last_flagged_at FROM weak_tags WHERE user_id = ? AND tag = ?");
    for (const tag of new Set(tags)) {
      const row = current.get(userId, tag) as { last_flagged_at: number } | undefined;
      const before = prior.find((weak) => weak.tag === tag);
      if (before) {
        if (!row || (row.last_flagged_at !== before.last_flagged_at && row.last_flagged_at !== reviewedAt)) continue;
        this.stmt("UPDATE weak_tags SET score = ?, last_flagged_at = ?, source = ? WHERE user_id = ? AND tag = ?").run(
          before.score,
          before.last_flagged_at,
          before.source,
          userId,
          tag,
        );
      } else if (row && row.last_flagged_at === reviewedAt) {
        this.stmt("DELETE FROM weak_tags WHERE user_id = ? AND tag = ?").run(userId, tag);
      }
    }
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

  /**
   * Proactive texts sent during the user's current day, the window the daily
   * push cap applies to: the local calendar day, or (at demo scale) the last SRS
   * day, like the new-card window. Otherwise a one-minute demo day would hit the
   * cap after a dozen texts and stay silent until midnight.
   */
  pushesToday(userId: string, now: number): number {
    const row = this.demoScale
      ? (this.stmt("SELECT COUNT(*) AS n FROM push_log WHERE user_id = ? AND sent_at > ? AND sent_at <= ?").get(
          userId,
          now - this.policy.dayMs,
          now,
        ) as { n: number })
      : (this.stmt("SELECT COUNT(*) AS n FROM push_log WHERE user_id = ? AND local_day = ?").get(userId, this.localDay(now)) as {
          n: number;
        });
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
    // rowid order = first-flagged order, so ties keep a problem's primary weak tag first.
    return this.stmt("SELECT tag, score, last_flagged_at, source FROM weak_tags WHERE user_id = ? ORDER BY rowid").all(userId) as WeakRow[];
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

  /** Current weak spots (decayed score >= WEAK_THRESHOLD), weakest first; ties: most recent, then first flagged. */
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
      .sort((a, b) => b.score - a.score || b.lastFlaggedAt - a.lastFlaggedAt);
  }

  // ── IDE (sync to iMessage) ───────────────────────────────────────────────

  /**
   * When a struggle's drills arrive: the next local SYNAPSE_MORNING_HOUR, moved
   * to the start of the next active window when that hour is outside
   * SYNAPSE_ACTIVE_HOURS (the agent can't text then), or one SRS day later at demo scale.
   */
  nextDrillTime(now: number): number {
    if (this.demoScale) return now + this.policy.dayMs;
    return this.deliverableAt(nextLocalTime(now, this.policy.timezone, this.policy.morningHour));
  }

  /** The first moment at or after `at` when the agent may text: `at` unless it falls in quiet hours (real scale only). */
  private deliverableAt(at: number): number {
    const hours = this.policy.activeHours;
    if (this.demoScale || !hours || isWithinActiveHours(at, this.policy.timezone, hours)) return at;
    return nextLocalTime(at, this.policy.timezone, hours.startHour);
  }

  private describeDrillTime(now: number, at: number): string {
    if (at <= now) return "shortly";
    return this.demoScale ? `in ${humanizeDuration(at - now)}` : describeLocalTime(now, at, this.policy.timezone);
  }

  /** True when the card has a review_log row at or after `since`. */
  private gradedSince(userId: string, cardId: string, since: number): boolean {
    const row = this.stmt("SELECT 1 FROM review_log WHERE user_id = ? AND card_id = ? AND reviewed_at >= ? LIMIT 1").get(
      userId,
      cardId,
      since,
    );
    return Boolean(row);
  }

  /**
   * Records a stage submission. A struggle (see isIdeStruggle) flags the
   * problem's weakTags and schedules up to 2 related micro-cards for the next
   * morning — once per problem per SRS day; repeats report the existing drills.
   * Finishing the code stage (pass or give up) also grades the problem card,
   * at most once per SRS day while it is not due: re-solving a problem minutes
   * later is not fresh evidence of recall and must not push it out 4d → 8d → 28d.
   * drillAt/drillLabel describe when the first drill will actually be texted
   * ("shortly" when a drill card is already overdue).
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
      const problemDueAt = this.getProgress(userId, problem.id)?.dueAt ?? now;
      const alreadyGraded = problemDueAt > now && this.gradedSince(userId, problem.id, this.newCardWindowStart(now));
      // A struggle already flagged problem.weakTags as an IDE weak spot above (or earlier today).
      const graded =
        finishedCode && !alreadyGraded
          ? this.applyGrade({ userId, cardId: problem.id, grade, source: "ide", now, answer: input.code ?? null }, !struggled)
          : null;

      this.logEvent(
        userId,
        "ide_attempt",
        `${input.passed ? "✅" : "🧩"} ${problem.title} · ${STAGE_LABELS[input.stage]}`,
        { problemId: problem.id, stage: input.stage, passed: input.passed, struggled },
        now,
      );

      // An overdue drill card keeps its past due date; report when it will really be texted.
      const earliestDrill = drills.length > 0 ? Math.min(...drills.map((drill) => drill.dueAt)) : null;
      const drillAt = earliestDrill === null ? null : this.deliverableAt(Math.max(now, earliestDrill));
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
      linkCode: linked ? null : this.createOrGetLinkCode(userId, now),
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
