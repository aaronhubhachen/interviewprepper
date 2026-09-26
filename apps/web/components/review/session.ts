/**
 * The web review loop as a pure reducer (same flow as the iMessage agent):
 *
 *   loading → answering → evaluating → rating → grading → graded → loading …
 *                                                   └──────────→ done (queue empty)
 *
 * Each card is a "turn" in a chat-style thread. Network calls live in the
 * ReviewSession component; this module only decides what the UI shows.
 */
import type { IntervalPreview, Rating } from "@synapse/core/sm2";
import type { QueueCounts, ReviewEvaluateResponse, ReviewGradeResponse, ReviewNextCard, ReviewNextEmpty } from "@/lib/types";

export type SessionMode = "due" | "bonus";

export type SessionPhase = "loading" | "answering" | "evaluating" | "rating" | "grading" | "graded" | "done" | "error";

export interface Turn {
  /** Unique per turn (a card can come back in the same session). */
  key: string;
  next: ReviewNextCard;
  hintShown: boolean;
  /** Submitted answer (null while answering). */
  answer: string | null;
  /** "I don't know": reveal without an attempt. */
  gaveUp: boolean;
  evaluation: ReviewEvaluateResponse | null;
  /** Tapback in flight or applied. */
  rating: Rating | null;
  result: ReviewGradeResponse | null;
  /** Client clock when the grade landed (for demo-time hints). */
  gradedAt: number | null;
  skipped: boolean;
}

export interface SessionError {
  scope: "next" | "evaluate" | "grade";
  message: string;
}

export interface SessionState {
  mode: SessionMode;
  phase: SessionPhase;
  turns: Turn[];
  /** Why the queue is empty (phase "done"). */
  empty: ReviewNextEmpty | null;
  /** Bonus mode found no unseen cards left. */
  exhausted: boolean;
  error: SessionError | null;
  /** Card ids skipped this session (sent as `exclude`). */
  skipped: string[];
  tally: Record<Rating, number>;
  queue: QueueCounts | null;
  seq: number;
}

export type SessionAction =
  | { type: "load" }
  | { type: "card"; next: ReviewNextCard }
  | { type: "empty"; empty: ReviewNextEmpty }
  | { type: "hint" }
  | { type: "submit"; answer: string; gaveUp: boolean }
  | { type: "evaluated"; evaluation: ReviewEvaluateResponse }
  | { type: "rate"; rating: Rating }
  | { type: "graded"; result: ReviewGradeResponse; at: number }
  | { type: "skip" }
  | { type: "error"; scope: SessionError["scope"]; message: string }
  | { type: "dismissError" }
  | { type: "bonus" };

export function initialSession(mode: SessionMode = "due"): SessionState {
  return {
    mode,
    phase: "loading",
    turns: [],
    empty: null,
    exhausted: false,
    error: null,
    skipped: [],
    tally: { love: 0, like: 0, dislike: 0 },
    queue: null,
    seq: 0,
  };
}

export function currentTurn(state: SessionState): Turn | undefined {
  const last = state.turns[state.turns.length - 1];
  return last && !last.skipped && !last.result ? last : undefined;
}

function patchCurrent(state: SessionState, patch: Partial<Turn>): Turn[] {
  const index = state.turns.length - 1;
  if (index < 0) return state.turns;
  return state.turns.map((turn, i) => (i === index ? { ...turn, ...patch } : turn));
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const turn = currentTurn(state);
  switch (action.type) {
    case "load":
      return { ...state, phase: "loading", error: null };

    case "card": {
      const seq = state.seq + 1;
      const next: Turn = {
        key: `${action.next.card.id}#${seq}`,
        next: action.next,
        hintShown: false,
        answer: null,
        gaveUp: false,
        evaluation: null,
        rating: null,
        result: null,
        gradedAt: null,
        skipped: false,
      };
      return {
        ...state,
        seq,
        phase: "answering",
        turns: [...state.turns, next],
        queue: action.next.queue,
        empty: null,
        error: null,
      };
    }

    case "empty":
      return {
        ...state,
        phase: "done",
        empty: action.empty,
        exhausted: state.mode === "bonus",
        queue: action.empty.queue,
        error: null,
      };

    case "hint":
      if (!turn || state.phase !== "answering" || turn.hintShown) return state;
      return { ...state, turns: patchCurrent(state, { hintShown: true }) };

    case "submit":
      if (!turn || state.phase !== "answering") return state;
      return {
        ...state,
        phase: "evaluating",
        error: null,
        turns: patchCurrent(state, { answer: action.answer, gaveUp: action.gaveUp }),
      };

    case "evaluated":
      if (!turn || state.phase !== "evaluating" || action.evaluation.cardId !== turn.next.card.id) return state;
      return { ...state, phase: "rating", turns: patchCurrent(state, { evaluation: action.evaluation }) };

    case "rate":
      if (!turn || state.phase !== "rating") return state;
      return { ...state, phase: "grading", error: null, turns: patchCurrent(state, { rating: action.rating }) };

    case "graded": {
      if (!turn || state.phase !== "grading" || action.result.cardId !== turn.next.card.id) return state;
      const rating = action.result.rating;
      return {
        ...state,
        phase: "graded",
        queue: action.result.queue,
        tally: { ...state.tally, [rating]: state.tally[rating] + 1 },
        turns: patchCurrent(state, { result: action.result, rating, gradedAt: action.at }),
      };
    }

    case "skip":
      if (!turn || state.phase !== "answering") return state;
      return {
        ...state,
        phase: "loading",
        skipped: state.skipped.includes(turn.next.card.id) ? state.skipped : [...state.skipped, turn.next.card.id],
        turns: patchCurrent(state, { skipped: true }),
      };

    case "error": {
      const error = { scope: action.scope, message: action.message };
      if (action.scope === "evaluate" && turn) {
        // Back to the composer; the component restores the draft.
        return { ...state, error, phase: "answering", turns: patchCurrent(state, { answer: null, gaveUp: false }) };
      }
      if (action.scope === "grade" && turn) {
        return { ...state, error, phase: "rating", turns: patchCurrent(state, { rating: null }) };
      }
      return { ...state, error, phase: "error" };
    }

    case "dismissError":
      return { ...state, error: null };

    case "bonus":
      return { ...state, mode: "bonus", phase: "loading", empty: null, exhausted: false, error: null };

    default:
      return state;
  }
}

/** Cards graded this session. */
export function reviewedCount(state: SessionState): number {
  return state.tally.love + state.tally.like + state.tally.dislike;
}

/**
 * Real milliseconds per SRS day, inferred from a card's interval preview
 * (preview.like.delayMs / its interval). Used to explain demo time
 * ("returns in 4d · about 4 min in demo time"). Null when it can't be inferred.
 */
export function inferDayMs(preview: Partial<Record<Rating, IntervalPreview>> | null | undefined): number | null {
  if (!preview) return null;
  for (const rating of ["love", "like"] as const) {
    const entry = preview[rating];
    const days = entry?.next.intervalDays ?? 0;
    if (entry && days > 0 && entry.delayMs > 0) return entry.delayMs / days;
  }
  return null;
}

/** dayMs below an hour: SRS days pass in minutes (SYNAPSE_DAY_MS demo scale). */
export function isDemoDayMs(dayMs: number | null): boolean {
  return dayMs !== null && dayMs < 3_600_000;
}

export const REASON_META: Record<
  ReviewNextCard["reason"],
  { label: string; icon: string; tone: "warning" | "cyan" | "violet" | "neutral"; description: string }
> = {
  drill: { label: "Drill", icon: "🎯", tone: "warning", description: "Queued after you struggled in the IDE" },
  due: { label: "Due", icon: "🔁", tone: "cyan", description: "Scheduled review" },
  new: { label: "New", icon: "✨", tone: "violet", description: "A new card for today" },
  extra: { label: "Bonus practice", icon: "➕", tone: "neutral", description: "Practice ahead of schedule" },
};

/** Confirmation after a tapback, iMessage-voice. */
export function gradedMessage(rating: Rating, nextLabel: string): string {
  switch (rating) {
    case "love":
      return `❤️ Effortless. Locked in: returns in ${nextLabel}.`;
    case "like":
      return `👍 Solid. Returns in ${nextLabel} to firm it up.`;
    default:
      return `👎 No worries. It comes back in ${nextLabel} for another rep.`;
  }
}
