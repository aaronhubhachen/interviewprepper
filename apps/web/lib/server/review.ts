import "server-only";

import {
  allCards,
  evaluateAnswer,
  getCard,
  humanizeDuration,
  newReviewState,
  VERDICT_GRADE,
  WEAK_THRESHOLD,
  type CardKind,
  type Evaluation,
  type ReviewCard,
  type SynapseStore,
  type Tag,
  type TextGrade,
} from "@synapse/core";
import type {
  QueueCounts,
  ReviewEvaluateResponse,
  ReviewGradeResponse,
  ReviewNextResponse,
} from "@/lib/types";
import { badRequest, notFound } from "./http";
import { withLlmBudget } from "./llm-budget";
import { ratingForGrade, tagRefs, toClientCard, toClientState } from "./serialize";

export interface NextQuery {
  tag?: Tag;
  exclude?: string[];
  kind?: CardKind;
}

export function queueCounts(store: SynapseStore, userId: string, now: number): QueueCounts {
  const progress = store.listProgress(userId);
  let dueNow = 0;
  let nextDueAt: number | null = null;
  for (const entry of progress) {
    if (entry.dueAt <= now) dueNow += 1;
    else if (nextDueAt === null || entry.dueAt < nextDueAt) nextDueAt = entry.dueAt;
  }
  const newToday = store.newCardsIntroduced(userId, now);
  const newPerDay = store.policy.newPerDay;
  const unseen = Math.max(0, allCards().length - progress.length);
  return {
    dueNow,
    newToday,
    newPerDay,
    newRemaining: Math.min(Math.max(0, newPerDay - newToday), unseen),
    nextDueAt,
  };
}

/**
 * With ?tag= and nothing due/new in that tag (e.g. the daily new-card cap is
 * spent), the user still asked to drill it: offer an unseen card from the tag,
 * else the one due soonest (reviewed ahead of schedule). Cards graded within
 * the relearn step are skipped, so the card just rated (a 👎 is due soonest)
 * does not come straight back; it returns through the due path once due.
 */
function extraPracticeCard(
  store: SynapseStore,
  userId: string,
  now: number,
  candidates: ReviewCard[],
): ReviewCard | undefined {
  if (candidates.length === 0) return undefined;
  const progress = new Map(store.listProgress(userId).map((entry) => [entry.cardId, entry]));
  const unseen = candidates.filter((card) => !progress.has(card.id)).sort((a, b) => a.difficulty - b.difficulty);
  if (unseen[0]) return unseen[0];
  const restedBefore = now - store.scheduler.relearnMs;
  return candidates
    .filter((card) => {
      const reviewedAt = progress.get(card.id)!.lastReviewedAt;
      return reviewedAt === null || reviewedAt <= restedBefore;
    })
    .sort((a, b) => progress.get(a.id)!.dueAt - progress.get(b.id)!.dueAt)[0];
}

export function nextReview(store: SynapseStore, userId: string, now: number, query: NextQuery = {}): ReviewNextResponse {
  const excluded = new Set(query.exclude ?? []);
  const inScope = (card: ReviewCard) =>
    !excluded.has(card.id) && (!query.tag || card.tags.includes(query.tag)) && (!query.kind || card.kind === query.kind);
  const excludeCardIds = allCards()
    .filter((card) => !inScope(card))
    .map((card) => card.id);

  const pick = store.nextCard(userId, now, { excludeCardIds });
  const queue = queueCounts(store, userId, now);

  if (pick) {
    return {
      card: toClientCard(pick.card),
      reason: pick.reason,
      weakTags: tagRefs(pick.weakTags),
      state: toClientState(pick.state),
      preview: store.previewCard(userId, pick.card.id, now),
      queue,
    };
  }

  if (query.tag) {
    const extra = extraPracticeCard(store, userId, now, allCards().filter(inScope));
    if (extra) {
      const weak = new Set(store.weakTags(userId, now).filter((w) => w.score >= WEAK_THRESHOLD).map((w) => w.tag));
      const progress = store.getProgress(userId, extra.id);
      return {
        card: toClientCard(extra),
        reason: "extra",
        weakTags: tagRefs(extra.tags.filter((tag) => weak.has(tag))),
        state: toClientState(progress ?? newReviewState(now)),
        preview: store.previewCard(userId, extra.id, now),
        queue,
      };
    }
  }

  return {
    card: null,
    nextDueAt: queue.nextDueAt,
    nextDueIn: queue.nextDueAt === null ? null : humanizeDuration(queue.nextDueAt - now),
    queue,
  };
}

function requireCard(cardId: string): ReviewCard {
  const card = getCard(cardId);
  if (!card) throw notFound(`Unknown card "${cardId}".`);
  return card;
}

export async function evaluateReview(
  store: SynapseStore,
  userId: string,
  now: number,
  input: { cardId: string; answer: string },
): Promise<ReviewEvaluateResponse> {
  const card = requireCard(input.cardId);
  const evaluation = await withLlmBudget(now, (useLlm) =>
    evaluateAnswer(
      { question: card.prompt, answerKey: card.answerKey, keyPoints: card.keyPoints, answer: input.answer },
      { useLlm },
    ),
  );
  return {
    cardId: card.id,
    evaluation,
    answerKey: card.answerKey,
    explanation: card.explanation,
    keyPoints: card.keyPoints.map((point) => point.label),
    ...(card.relatedProblem ? { relatedProblem: { ...card.relatedProblem } } : {}),
    ...(card.problemId ? { problemId: card.problemId } : {}),
    preview: store.previewCard(userId, card.id, now),
    suggestedRating: ratingForGrade(evaluation.suggestedGrade),
  };
}

/** Validates an Evaluation echoed back by the client (lenient on optional parts, strict on shape). */
export function parseVerdict(raw: unknown): Evaluation | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) throw badRequest("verdict must be an evaluation object.", { verdict: "must be an object" });
  const value = raw as Record<string, unknown>;
  const verdict = value.verdict;
  if (verdict !== "correct" && verdict !== "partial" && verdict !== "incorrect") {
    throw badRequest("verdict.verdict must be correct, partial, or incorrect.", { verdict: "invalid verdict" });
  }
  const labels = (list: unknown) =>
    Array.isArray(list) ? list.filter((item): item is string => typeof item === "string").slice(0, 8).map((item) => item.slice(0, 120)) : [];
  const grade = value.suggestedGrade;
  return {
    verdict,
    nailed: labels(value.nailed),
    missed: labels(value.missed),
    feedback: typeof value.feedback === "string" ? value.feedback.slice(0, 600) : "",
    suggestedGrade: grade === 1 || grade === 3 || grade === 5 ? grade : VERDICT_GRADE[verdict],
    source: value.source === "llm" ? "llm" : "heuristic",
  };
}

export function gradeReviewCard(
  store: SynapseStore,
  userId: string,
  now: number,
  input: { cardId: string; grade: TextGrade; answer?: string; verdict?: Evaluation },
): ReviewGradeResponse {
  const card = requireCard(input.cardId);
  store.ensureUser(userId, now);
  const outcome = store.gradeCard({
    userId,
    cardId: card.id,
    grade: input.grade,
    source: "web",
    now,
    answer: input.answer ?? null,
    verdict: input.verdict ?? null,
  });
  const stats = store.stats(userId, now);
  return {
    cardId: card.id,
    grade: input.grade,
    rating: ratingForGrade(input.grade),
    nextLabel: outcome.nextLabel,
    dueAt: outcome.after.dueAt,
    intervalDays: outcome.after.intervalDays,
    easeFactor: outcome.after.easeFactor,
    phase: outcome.after.phase,
    lapses: outcome.after.lapses,
    wasNew: outcome.wasNew,
    reviewId: outcome.reviewId,
    queue: queueCounts(store, userId, now),
    stats: {
      dueNow: stats.dueNow,
      reviewedToday: stats.reviewedToday,
      streakDays: stats.streakDays,
      cardsLearned: stats.cardsLearned,
      retention30d: stats.retention30d,
    },
  };
}
