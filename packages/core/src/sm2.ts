export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export type ReviewPhase = "new" | "learning" | "review" | "relearning";

export interface ReviewState {
  /** Consecutive successful reviews since the last lapse. */
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  /** Epoch ms. */
  dueAt: number;
  lapses: number;
  phase: ReviewPhase;
  lastReviewedAt: number | null;
}

export interface SchedulerOptions {
  /** Real milliseconds per SRS day (SYNAPSE_DAY_MS). */
  dayMs: number;
  /** Delay before a failed card comes back. */
  relearnMs: number;
}

/** The three confidence ratings a user gives with a tapback. */
export type Rating = "love" | "like" | "dislike";

export const RATING_GRADES: Readonly<Record<Rating, Grade>> = { love: 5, like: 3, dislike: 1 };

export const DEFAULT_DAY_MS = 86_400_000;
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const EASY_BONUS = 1.3;
/** Anki's "easy" graduating interval: a first review rated Effortless jumps straight to 4 days. */
export const EASY_GRADUATING_DAYS = 4;
export const PASSING_GRADE = 3;

const MIN_RELEARN_MS = 15_000;

/** 10 minutes at real scale (dayMs / 144), never below 15 s so demo-scale cards stay answerable. */
export function relearnMs(dayMs: number): number {
  return Math.max(Math.round(dayMs / 144), MIN_RELEARN_MS);
}

export function schedulerOptions(dayMs: number = DEFAULT_DAY_MS): SchedulerOptions {
  return { dayMs, relearnMs: relearnMs(dayMs) };
}

/** An SRS day shorter than an hour means a live demo: wall-clock policies (active hours, mornings) relax. */
export function isDemoScale(dayMs: number): boolean {
  return dayMs < 3_600_000;
}

export function newReviewState(now: number): ReviewState {
  return {
    repetition: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE,
    dueAt: now,
    lapses: 0,
    phase: "new",
    lastReviewedAt: null,
  };
}

export function isDue(state: ReviewState, now: number): boolean {
  return state.dueAt <= now;
}

export function isPassingGrade(grade: number): boolean {
  return grade >= PASSING_GRADE;
}

function nextEase(easeFactor: number, grade: Grade): number {
  const miss = 5 - grade;
  const ease = easeFactor + (0.1 - miss * (0.08 + miss * 0.02));
  // Every SM-2 delta has two decimals; rounding strips float drift.
  return Math.max(MIN_EASE, Math.round(ease * 100) / 100);
}

function passingInterval(state: ReviewState, grade: Grade): number {
  const effortless = grade === 5;
  if (state.repetition === 0) return effortless ? EASY_GRADUATING_DAYS : 1;
  if (state.repetition === 1) return effortless ? Math.round(6 * EASY_BONUS) : 6;
  const scaled = state.intervalDays * state.easeFactor;
  return Math.round(effortless ? scaled * EASY_BONUS : scaled);
}

/** Pure SM-2 step: the same (state, grade, now, opts) always yields the same result. */
export function gradeReview(
  state: ReviewState,
  grade: Grade,
  now: number,
  opts: SchedulerOptions = schedulerOptions(),
): ReviewState {
  const easeFactor = nextEase(state.easeFactor, grade);

  if (isPassingGrade(grade)) {
    const intervalDays = passingInterval(state, grade);
    return {
      repetition: state.repetition + 1,
      intervalDays,
      easeFactor,
      dueAt: now + intervalDays * opts.dayMs,
      lapses: state.lapses,
      phase: "review",
      lastReviewedAt: now,
    };
  }

  const wasLearned = state.phase === "review";
  const neverLearned = state.phase === "new" || state.phase === "learning";
  return {
    repetition: 0,
    intervalDays: 0,
    easeFactor,
    dueAt: now + opts.relearnMs,
    lapses: wasLearned ? state.lapses + 1 : state.lapses,
    phase: neverLearned ? "learning" : "relearning",
    lastReviewedAt: now,
  };
}

const MINUTES_PER_DAY = 1440;

/**
 * Human label for an interval measured in SRS days (fractions allowed):
 * "10m", "6h", "4d", "1.5mo", "1.2y". Scale-independent by design.
 */
export function formatInterval(days: number): string {
  const minutes = days * MINUTES_PER_DAY;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < MINUTES_PER_DAY) return `${Math.round(minutes / 60)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${trimDecimal(days / 30)}mo`;
  return `${trimDecimal(days / 365)}y`;
}

function trimDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** Converts a real-ms duration into an SRS-unit label at the given scale. */
export function formatDuration(ms: number, dayMs: number): string {
  return formatInterval(ms / dayMs);
}

export interface IntervalPreview {
  rating: Rating;
  grade: Grade;
  next: ReviewState;
  /** Milliseconds until the card is due again after this rating. */
  delayMs: number;
  label: string;
}

/** What each tapback would do to this card, e.g. ❤️ → 4d · 👍 → 1d · 👎 → 10m. */
export function previewIntervals(
  state: ReviewState,
  now: number,
  opts: SchedulerOptions = schedulerOptions(),
): Record<Rating, IntervalPreview> {
  const preview = (rating: Rating): IntervalPreview => {
    const grade = RATING_GRADES[rating];
    const next = gradeReview(state, grade, now, opts);
    const delayMs = next.dueAt - now;
    return { rating, grade, next, delayMs, label: formatDuration(delayMs, opts.dayMs) };
  };
  return { love: preview("love"), like: preview("like"), dislike: preview("dislike") };
}
