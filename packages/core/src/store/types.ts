import type { CardKind, ReviewCard, Tag } from "../content/types";
import type { CodeLanguage } from "../judge/native";
import type { Evaluation } from "../grading";
import type { Grade, ReviewState } from "../sm2";
import type { BehavioralFeedback } from "../spar";
import type { ActiveHours } from "../time";
import type { SparScores } from "../transcript";

export type ReviewSource = "imessage" | "web" | "ide" | "voice";

export type WeaknessSource = "ide" | "tapback" | "review" | "manual";

export type PushKind = "probe" | "morning" | "nudge";

export interface StorePolicy {
  timezone: string;
  dayMs: number;
  /** Local hour at which IDE-struggle drills are scheduled. */
  morningHour: number;
  newPerDay: number;
  /**
   * SYNAPSE_OWNER_HANDLE. When set, "start" auto-links the web user only for a
   * texter with this handle; everyone else must use the link code.
   */
  ownerHandle?: string | null;
  /**
   * SYNAPSE_ACTIVE_HOURS. When set (and not at demo scale), drill times that fall
   * in quiet hours move to the start of the next active window, so the promised
   * time is when the agent can actually text.
   */
  activeHours?: ActiveHours | null;
}

export interface User {
  id: string;
  displayName: string | null;
  handle: string | null;
  spaceId: string | null;
  platform: string | null;
  linkCode: string | null;
  paused: boolean;
  createdAt: number;
}

/** Who is texting: the iMessage space plus the sender's handle when known. */
export interface SpaceIdentity {
  spaceId: string;
  /**
   * The platform's space type (spectrum-ts iMessage spaces are "dm" | "group").
   * Group chats never become a user's home space; their senders resolve by handle.
   * When omitted, the iMessage chat GUID is used to tell ("iMessage;+;…" is a group).
   */
  spaceType?: "dm" | "group" | null;
  handle?: string | null;
  platform?: string | null;
  displayName?: string | null;
}

export interface CardProgress extends ReviewState {
  cardId: string;
  cardKind: CardKind;
  /** "drill" while an IDE struggle has pulled this card forward; cleared when graded. */
  boostReason: string | null;
}

export interface GradeInput {
  userId: string;
  cardId: string;
  grade: Grade;
  source: ReviewSource;
  now: number;
  answer?: string | null;
  verdict?: Evaluation | null;
}

export interface GradeOutcome {
  card: ReviewCard;
  before: ReviewState;
  after: ReviewState;
  wasNew: boolean;
  reviewId: number;
  /** SRS-unit label of the new interval, e.g. "6d" or "10m". */
  nextLabel: string;
}

export interface NextCardOptions {
  excludeCardIds?: string[];
  kinds?: CardKind[];
  /** Set false to only consider cards that are already due. Default true. */
  includeNew?: boolean;
}

export type PickReason = "drill" | "due" | "new";

export interface NextCardPick {
  card: ReviewCard;
  /** Current scheduling state (a fresh state for never-seen cards). */
  state: ReviewState;
  reason: PickReason;
  /** The card's tags that are currently weak for this user. */
  weakTags: Tag[];
}

export type PendingPhase = "awaiting_answer" | "awaiting_grade";

export interface PendingProbe {
  userId: string;
  cardId: string;
  phase: PendingPhase;
  questionMessageId: string | null;
  feedbackMessageId: string | null;
  answer: string | null;
  verdict: Evaluation | null;
  askedAt: number;
  updatedAt: number;
}

export interface PendingInput {
  cardId: string;
  phase: PendingPhase;
  questionMessageId?: string | null;
  feedbackMessageId?: string | null;
  answer?: string | null;
  verdict?: Evaluation | null;
}

export type PendingPatch = Partial<Omit<PendingInput, "cardId">>;

export interface WeakTag {
  tag: Tag;
  label: string;
  /** Decayed score; >= WEAK_THRESHOLD to be listed. */
  score: number;
  lastFlaggedAt: number;
  source: WeaknessSource;
}

export interface ForecastDay {
  offset: number;
  /** "Today", "Tmrw", then weekday ("Wed") — or "+2d" at demo scale. */
  label: string;
  startsAt: number;
  count: number;
}

export interface DayActivity {
  dayKey: string;
  reviews: number;
  passed: number;
}

export interface TagMastery {
  tag: Tag;
  label: string;
  cards: number;
  learned: number;
  /** Cards with an interval of at least 21 SRS days. */
  mastered: number;
  /** 0..1: mean of min(interval / 21, 1) across the tag's cards. */
  progress: number;
  weakScore: number;
}

export interface LinkStatus {
  linked: boolean;
  spaceId: string | null;
  handle: string | null;
  platform: string | null;
  /** Code to text as "link 1234" (present only while unlinked). */
  linkCode: string | null;
  paused: boolean;
}

export interface ActivityEvent {
  id: number;
  userId: string;
  kind: string;
  title: string;
  detail: Record<string, unknown> | null;
  createdAt: number;
}

export interface Stats {
  userId: string;
  generatedAt: number;
  dueNow: number;
  reviewedToday: number;
  streakDays: number;
  /** Today is one of the streak's active days (a review, IDE attempt or spar session today). */
  activeToday: boolean;
  /** Pass rate (grade >= 3) over the last 30 days; null without reviews. */
  retention30d: number | null;
  cardsLearned: number;
  totalCards: number;
  forecast14: ForecastDay[];
  reviewsByDay: DayActivity[];
  masteryByTag: TagMastery[];
  weakTags: WeakTag[];
  recentActivity: ActivityEvent[];
  link: LinkStatus;
  demoScale: boolean;
  /** Recent scores per interview round type (oldest first). */
  trends: InterviewTrends;
}

export type IdeStage = "invariant" | "edgeCase" | "code";

export interface IdeAttemptInput {
  userId: string;
  problemId: string;
  stage: IdeStage;
  passed: boolean;
  now: number;
  language?: CodeLanguage;
  testsPassed?: number;
  testsTotal?: number;
  hintsUsed?: number;
  /** 1-based submission count for this stage in the current session. */
  attemptNumber?: number;
  /** The user revealed the answer / gave up. */
  gaveUp?: boolean;
  durationMs?: number;
  code?: string;
  answer?: string;
  /** Overrides the default struggle rule. */
  struggled?: boolean;
}

export interface ScheduledDrill {
  cardId: string;
  title: string;
  dueAt: number;
}

export interface IdeAttemptResult {
  attemptId: number;
  struggled: boolean;
  flaggedTags: Tag[];
  drills: ScheduledDrill[];
  drillAt: number | null;
  /** "tomorrow at 9:00 AM" (or "in 1 min" at demo scale). */
  drillLabel: string | null;
  /** SM-2 update of the problem card when the code stage ends (pass or give up). */
  graded: GradeOutcome | null;
}

export interface IdeAttempt {
  id: number;
  userId: string;
  problemId: string;
  stage: IdeStage;
  language: CodeLanguage | null;
  passed: boolean;
  testsPassed: number | null;
  testsTotal: number | null;
  hintsUsed: number;
  attemptNumber: number;
  gaveUp: boolean;
  struggled: boolean;
  durationMs: number | null;
  createdAt: number;
}

/** Scored interview rounds stored in practice_sessions. */
export type PracticeSessionKind = "grill" | "bot" | "mock" | "design";

export interface PracticeSessionInput {
  userId: string;
  kind: PracticeSessionKind;
  /** What the round was about: a problem id, "Resume", a design prompt id. */
  subject: string | null;
  /** 0..100. */
  score: number;
  /** The full report (JSON-serializable). */
  report: unknown;
  now: number;
}

export interface PracticeSession {
  id: number;
  userId: string;
  kind: PracticeSessionKind;
  subject: string | null;
  score: number;
  report: unknown;
  createdAt: number;
}

export interface TrendPoint {
  score: number;
  at: number;
  subject: string | null;
}

/** Last scores per round type, oldest first, for the dashboard's trend card. */
export type InterviewTrends = Record<PracticeSessionKind | "spar", TrendPoint[]>;

export interface SparSessionInput {
  userId: string;
  questionId: string;
  transcript: string;
  durationMs: number;
  feedback: BehavioralFeedback;
  now: number;
}

export interface SparSession {
  id: number;
  userId: string;
  questionId: string;
  transcript: string;
  durationMs: number;
  scores: SparScores;
  overall: number;
  feedback: BehavioralFeedback;
  createdAt: number;
}
