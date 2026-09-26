import type { ReviewCard, Tag } from "../content/types";
import type { SchedulerOptions } from "../sm2";
import type { CardProgress } from "./types";
import { weakBoost } from "./weakness";

export interface DueCandidate {
  card: ReviewCard;
  progress: CardProgress;
  /** Position in the content registry, the final deterministic tie-break. */
  order: number;
}

/**
 * 1 when just due, growing with how overdue the card is relative to its own
 * interval (a 1-day card 1 day late outranks a 30-day card 1 day late).
 */
export function overdueRatio(progress: CardProgress, now: number, opts: SchedulerOptions): number {
  const span = progress.intervalDays > 0 ? progress.intervalDays * opts.dayMs : opts.relearnMs;
  return 1 + Math.max(0, now - progress.dueAt) / span;
}

/**
 * Explicit drills first (they were scheduled for exactly this moment), then by
 * overdue ratio boosted by weak-tag score, then earliest due, then registry order.
 */
export function pickDue(
  candidates: readonly DueCandidate[],
  now: number,
  weakScores: ReadonlyMap<Tag, number>,
  opts: SchedulerOptions,
): DueCandidate | undefined {
  const scored = candidates.map((candidate) => ({
    candidate,
    drill: candidate.progress.boostReason === "drill" ? 1 : 0,
    priority: overdueRatio(candidate.progress, now, opts) * (1 + weakBoost(candidate.card.tags, weakScores)),
  }));
  scored.sort(
    (a, b) =>
      b.drill - a.drill ||
      b.priority - a.priority ||
      a.candidate.progress.dueAt - b.candidate.progress.dueAt ||
      a.candidate.order - b.candidate.order,
  );
  return scored[0]?.candidate;
}

/** Never-seen cards: weakest tags first, micro-cards before problems, easier first, then registry order. */
export function pickNew(
  unseen: readonly { card: ReviewCard; order: number }[],
  weakScores: ReadonlyMap<Tag, number>,
): ReviewCard | undefined {
  const scored = unseen.map((entry) => ({
    ...entry,
    boost: weakBoost(entry.card.tags, weakScores),
    micro: entry.card.kind === "micro" ? 1 : 0,
  }));
  scored.sort(
    (a, b) => b.boost - a.boost || b.micro - a.micro || a.card.difficulty - b.card.difficulty || a.order - b.order,
  );
  return scored[0]?.card;
}
