/**
 * JSON contract between the route handlers (app/api/**) and the client
 * fetchers (lib/api.ts). Type-only imports, so this file is safe in client
 * components. Every timestamp is epoch milliseconds.
 */
import type { RawTestResult, RunFailure } from "@synapse/core/judge";
import type { BehavioralFeedback, BotEvent, BotMessage, BotReport, CodeLanguage, NativeLanguage, GrillQuestion, GrillReport, GrillTurn, IdeStage, PickReason, Stats } from "@synapse/core";
import type {
  BehavioralQuestion,
  CardDifficulty,
  CardKind,
  CodeTest,
  CompareMode,
  Evaluation,
  IntervalPreview,
  JudgeLanguage,
  ProblemDifficulty,
  ProblemExample,
  ProblemRef,
  Rating,
  ReviewPhase,
  SparScores,
  Tag,
  TextGrade,
  TranscriptAnalysis,
} from "@synapse/core/browser";

export type { BehavioralFeedback, CodeLanguage, Evaluation, IdeStage, IntervalPreview, Rating, Stats, Tag, TextGrade };

/** Every non-2xx response has this body. */
export interface ApiErrorBody {
  error: {
    /** Machine-readable: "invalid_request" | "invalid_json" | "not_found" | "forbidden" | "payload_too_large" | "internal" … */
    code: string;
    message: string;
    /** Per-field validation messages. */
    details?: Record<string, string>;
  };
}

export interface TagRef {
  tag: Tag;
  label: string;
}

/** Projected outcome per tapback: `preview.love.label` → "4d". */
export type IntervalPreviews = Record<Rating, IntervalPreview>;

export interface TimeScale {
  /** Real ms per SRS day (SYNAPSE_DAY_MS). */
  dayMs: number;
  relearnMs: number;
  /** dayMs < 1 hour: cards come back live during a demo. */
  demoScale: boolean;
  timezone: string;
  /** "1 SRS day = 1 min" or "Real time". */
  description: string;
}

export interface LlmInfo {
  configured: boolean;
  provider?: string;
  model?: string;
}

// ── /api/stats ─────────────────────────────────────────────────────────────

export interface StatsResponse extends Stats {
  llmConfigured: boolean;
  llm: LlmInfo;
  timeScale: TimeScale;
  /** Due-queue summary (same as /api/review/due). */
  queue: QueueCounts;
}

// ── /api/review/* ──────────────────────────────────────────────────────────

export interface QueueCounts {
  /** Cards due right now (already seen at least once, or drills scheduled for now). */
  dueNow: number;
  /** New cards introduced in the current SRS day. */
  newToday: number;
  newPerDay: number;
  /** New cards still allowed today (capped by unseen cards left). */
  newRemaining: number;
  /** Next future due time (null when nothing is scheduled). */
  nextDueAt: number | null;
}

export type DueResponse = QueueCounts;

/** A review card as sent to the browser: never includes the answer key, key points, or explanation. */
export interface ClientCard {
  id: string;
  kind: CardKind;
  title: string;
  prompt: string;
  hint: string;
  tags: Tag[];
  difficulty: CardDifficulty;
  relatedProblem?: ProblemRef;
  /** For kind "problem": open /practice/{problemId}. */
  problemId?: string;
}

export interface ClientReviewState {
  phase: ReviewPhase;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: number;
  lapses: number;
  lastReviewedAt: number | null;
}

/** "extra" = tag-focused practice ahead of schedule (only with ?tag= when nothing in that tag is due/new). */
export type ReviewReason = PickReason | "extra";

export interface ReviewNextCard {
  card: ClientCard;
  reason: ReviewReason;
  /** The card's tags that are currently weak for this user. */
  weakTags: TagRef[];
  state: ClientReviewState;
  preview: IntervalPreviews;
  queue: QueueCounts;
}

export interface ReviewNextEmpty {
  card: null;
  nextDueAt: number | null;
  /** Real-time countdown, e.g. "3 min" (null when nothing is scheduled). */
  nextDueIn: string | null;
  queue: QueueCounts;
}

export type ReviewNextResponse = ReviewNextCard | ReviewNextEmpty;

export interface ReviewNextQuery {
  /** Only cards with this tag (e.g. drill a weak spot). */
  tag?: Tag;
  /** Card ids to skip (e.g. cards skipped this session). */
  exclude?: string[];
  kind?: CardKind;
}

export interface ReviewEvaluateRequest {
  cardId: string;
  /** Free-text answer (max 4000 chars; may be "idk"). */
  answer: string;
}

export interface ReviewEvaluateResponse {
  cardId: string;
  evaluation: Evaluation;
  /** Revealed only after answering. */
  answerKey: string;
  explanation: string;
  /** Key point labels (what a complete answer covers). */
  keyPoints: string[];
  relatedProblem?: ProblemRef;
  problemId?: string;
  preview: IntervalPreviews;
  /** evaluation.suggestedGrade as a rating (5 → love, 3 → like, 1 → dislike). */
  suggestedRating: Rating;
}

export interface ReviewGradeRequest {
  cardId: string;
  grade: TextGrade;
  answer?: string;
  /** The evaluation returned by /api/review/evaluate, stored with the review. */
  verdict?: Evaluation;
}

export interface StatsSnippet {
  dueNow: number;
  reviewedToday: number;
  streakDays: number;
  cardsLearned: number;
  retention30d: number | null;
}

export interface ReviewGradeResponse {
  cardId: string;
  grade: TextGrade;
  rating: Rating;
  /** SRS-unit label of the new interval: "4d", "10m". */
  nextLabel: string;
  dueAt: number;
  intervalDays: number;
  easeFactor: number;
  phase: ReviewPhase;
  lapses: number;
  wasNew: boolean;
  reviewId: number;
  queue: QueueCounts;
  stats: StatsSnippet;
}

// ── /api/link ──────────────────────────────────────────────────────────────

export interface LinkResponse {
  linked: boolean;
  handle: string | null;
  platform: string | null;
  /** 6-digit code to text as "link 482193" (null once linked). Codes expire after 10 minutes; this card refreshes it. */
  code: string | null;
  paused: boolean;
  /** The Prepr iMessage number/email if configured (SYNAPSE_AGENT_HANDLE), for an sms: link. */
  agentHandle: string | null;
  /** Human instructions, e.g. "Text “link 482193” to Prepr on iMessage." */
  instructions: string;
}

export interface LinkUpdateRequest {
  /** Pause or resume proactive iMessage probes. */
  paused: boolean;
}

// ── /api/problems ──────────────────────────────────────────────────────────

export interface ProblemCardProgress {
  phase: ReviewPhase;
  dueAt: number | null;
  due: boolean;
  /** Current interval in SRS units ("6d"), null before the first grade. */
  intervalLabel: string | null;
}

export interface ProblemProgress {
  attempts: number;
  lastAttemptAt: number | null;
  /** Stages passed at least once. */
  stagesPassed: IdeStage[];
  /** Code stage accepted at least once. */
  solved: boolean;
  /** Any attempt flagged as a struggle. */
  struggled: boolean;
  card: ProblemCardProgress;
}

export interface ProblemSummary {
  id: string;
  title: string;
  leetcodeSlug: string;
  difficulty: ProblemDifficulty;
  tags: Tag[];
  weakTags: Tag[];
  progress: ProblemProgress;
}

export interface ProblemsResponse {
  problems: ProblemSummary[];
}

export interface ClientStagePrompt {
  prompt: string;
  hint: string;
}

/** Compatible with core's judgeResults(stage, raw) (needs tests + compare). */
export interface ClientCodeStage {
  functionName: string;
  params: string[];
  starter: Record<CodeLanguage, string>;
  /** All tests, hidden ones included (args + expected), because the judge runs in the browser. */
  tests: CodeTest[];
  compare: CompareMode;
}

/** A problem as sent to the browser: no reference solutions, no stage answer keys or key points. */
export interface ClientProblem {
  id: string;
  title: string;
  leetcodeSlug: string;
  difficulty: ProblemDifficulty;
  tags: Tag[];
  /** Markdown. */
  statement: string;
  examples: ProblemExample[];
  constraints: string[];
  stages: {
    invariant: ClientStagePrompt;
    edgeCase: ClientStagePrompt;
    code: ClientCodeStage;
  };
  weakTags: TagRef[];
  /** Micro-cards drilled over iMessage after a struggle. */
  relatedCards: { id: string; title: string }[];
}

export interface IdeAttemptSummary {
  id: number;
  stage: IdeStage;
  passed: boolean;
  struggled: boolean;
  gaveUp: boolean;
  language: CodeLanguage | null;
  testsPassed: number | null;
  testsTotal: number | null;
  createdAt: number;
}

export interface ProblemResponse {
  problem: ClientProblem;
  progress: ProblemProgress;
  recentAttempts: IdeAttemptSummary[];
  /** True once the code stage has been attempted (the solution endpoint unlocks). */
  solutionAvailable: boolean;
}

export interface ProblemSolutionResponse {
  problemId: string;
  reference: Record<JudgeLanguage, string>;
  invariantAnswer: string;
  edgeCaseAnswer: string;
}

// ── /api/practice/* ────────────────────────────────────────────────────────

export type TextStage = Exclude<IdeStage, "code">;

export interface PracticeEvaluateRequest {
  problemId: string;
  stage: TextStage;
  answer: string;
}

export interface PracticeEvaluateResponse {
  problemId: string;
  stage: TextStage;
  evaluation: Evaluation;
  /** Revealed after answering. */
  answerKey: string;
  keyPoints: string[];
  suggestedRating: Rating;
}

export interface PracticeAttemptRequest {
  problemId: string;
  stage: IdeStage;
  /** Stage grade (e.g. evaluation.suggestedGrade). Implies passed = grade >= 3 when `passed` is omitted. */
  grade?: TextGrade;
  /** Stage outcome (code: all tests accepted). Default: derived from grade, else false. */
  passed?: boolean;
  /** Failed runs/submissions BEFORE this one in the session (attemptNumber = failedRuns + 1; 3+ tries = struggle). */
  failedRuns?: number;
  /** Shorthand for hintsUsed = 1. */
  usedHint?: boolean;
  /** Hints revealed so far on this problem (2+ = struggle). Overrides usedHint. */
  hintsUsed?: number;
  /** The user revealed the answer / gave up (always a struggle; ends the code stage). */
  gaveUp?: boolean;
  durationMs?: number;
  language?: CodeLanguage;
  testsPassed?: number;
  testsTotal?: number;
  /** Submitted code (max 50k chars). */
  code?: string;
  /** Free-text stage answer (max 4000 chars). */
  answer?: string;
}

export interface ScheduledDrills {
  cardIds: string[];
  titles: string[];
  /** When the iMessage agent will surface them. */
  dueAt: number | null;
  /** "tomorrow at 9:00 AM" (or "in 1 min" at demo scale). */
  dueLabel: string | null;
}

export interface PracticeAttemptResponse {
  attemptId: number;
  problemId: string;
  stage: IdeStage;
  passed: boolean;
  struggled: boolean;
  /** Tags newly flagged as weak (empty if already flagged for this problem today). */
  flaggedTags: TagRef[];
  /** Drills queued for iMessage; null when nothing was scheduled. */
  scheduled: ScheduledDrills | null;
  /** SM-2 update of the problem card when the code stage ends (pass or give up). */
  graded: { grade: TextGrade; nextLabel: string; dueAt: number } | null;
  /** Ready-to-show sentence, e.g. "Flagged Bitmask DP. Prepr will text you a drill tomorrow at 9:00 AM." */
  message: string | null;
}

// ── /api/behavioral, /api/spar/* ───────────────────────────────────────────

export interface BehavioralResponse {
  questions: BehavioralQuestion[];
}

export interface SparEvaluateRequest {
  questionId: string;
  /** Web Speech API transcript (max 20k chars). */
  transcript: string;
  /** Speaking time in ms (1 s .. 30 min). */
  durationMs: number;
  /** 1 = main answer (default), 2 = answer to the EM's follow-up. */
  round?: 1 | 2;
  /** Round 2: the follow-up question being answered (feedback.followUp from round 1). */
  followUpOf?: string;
}

export interface SparEvaluateResponse {
  sessionId: number;
  createdAt: number;
  questionId: string;
  round: 1 | 2;
  /** The prompt the answer was graded against. */
  question: string;
  feedback: BehavioralFeedback;
  /** Transcript metrics (same as feedback.analysis). */
  metrics: TranscriptAnalysis;
  source: "llm" | "heuristic";
}

export interface SparSessionSummary {
  id: number;
  questionId: string;
  questionPrompt: string | null;
  competency: string | null;
  round: 1 | 2;
  followUpOf: string | null;
  durationMs: number;
  overall: number;
  scores: SparScores;
  transcript: string;
  feedback: BehavioralFeedback;
  createdAt: number;
}

export interface SparSessionsResponse {
  sessions: SparSessionSummary[];
}

// ── /api/grill/* ───────────────────────────────────────────────────────────

export type { GrillQuestion, GrillReport, GrillTurn };

export interface GrillResumeResponse {
  text: string;
  pages: number | null;
}

export interface GrillSessionRequest {
  resume: string;
  turns: GrillTurn[];
}

export interface GrillNextResponse extends GrillQuestion {
  /** 1-based number of this question. */
  number: number;
  total: number;
}

// ── /api/judge/* ───────────────────────────────────────────────────────────

export interface JudgeLanguagesResponse {
  /** Server-compiled languages that are enabled and have a toolchain installed. */
  available: NativeLanguage[];
  /** False when the server judge is switched off (production without SYNAPSE_NATIVE_JUDGE=1). */
  enabled: boolean;
}

export interface JudgeRunRequest {
  problemId: string;
  language: NativeLanguage;
  code: string;
  /** JSON list of positional-argument lists (core's testArgsJson). */
  argsJson: string;
}

export interface JudgeRunResponse {
  raw: RawTestResult[] | RunFailure;
}

// ── /api/bot/* ─────────────────────────────────────────────────────────────

export type { BotEvent, BotMessage, BotReport };

export interface BotChatRequest {
  problemId: string;
  language: CodeLanguage;
  code: string;
  messages: BotMessage[];
  trapMode: boolean;
  trapsUsed: number;
}

export interface BotChatResponse {
  reply: string;
  source: "llm" | "heuristic";
  /** Sealed note about a planted bug (opaque to the browser; sent back with the report). */
  trapToken: string | null;
}

export interface BotReportRequest {
  problemId: string;
  language: CodeLanguage;
  finalCode: string;
  durationMs: number;
  messages: BotMessage[];
  events: BotEvent[];
  traps: Array<{ messageIndex: number; token: string }>;
  lastResult: { status: string; passed: number; total: number } | null;
}

export type BotReportResponse = BotReport;
