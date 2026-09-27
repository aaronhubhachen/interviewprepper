/** Pure view-model helpers for sparring results and history. */
import type { BehavioralQuestion, SparScores } from "@synapse/core/browser";
import type { BehavioralFeedback, SparEvaluateResponse, SparSessionSummary } from "@/lib/types";

/** Everything the results screen needs, from a fresh evaluation or a past session. */
export interface SparResultView {
  sessionId: number;
  questionId: string;
  /** The base question (not the follow-up). */
  questionPrompt: string;
  competency: string | null;
  round: 1 | 2;
  /** Round 2: the follow-up question that was answered. */
  followUpOf: string | null;
  feedback: BehavioralFeedback;
  transcript: string;
  durationMs: number;
  createdAt: number;
}

export interface SubmittedAnswer {
  transcript: string;
  durationMs: number;
}

export function resultFromResponse(
  response: SparEvaluateResponse,
  question: BehavioralQuestion,
  answer: SubmittedAnswer,
  followUpOf: string | null,
): SparResultView {
  return {
    sessionId: response.sessionId,
    questionId: response.questionId,
    questionPrompt: question.prompt,
    competency: question.competency,
    round: response.round,
    followUpOf: response.round === 2 ? followUpOf : null,
    feedback: response.feedback,
    transcript: answer.transcript,
    durationMs: answer.durationMs,
    createdAt: response.createdAt,
  };
}

export function resultFromSession(session: SparSessionSummary, questions: readonly BehavioralQuestion[] = []): SparResultView {
  const question = questions.find((candidate) => candidate.id === session.questionId);
  return {
    sessionId: session.id,
    questionId: session.questionId,
    questionPrompt: session.questionPrompt ?? question?.prompt ?? "Behavioral question",
    competency: session.competency ?? question?.competency ?? null,
    round: session.round,
    followUpOf: session.followUpOf,
    feedback: session.feedback,
    transcript: session.transcript,
    durationMs: session.durationMs,
    createdAt: session.createdAt,
  };
}

/** The history row for a fresh result (so the list updates without a refetch). */
export function sessionFromResult(view: SparResultView): SparSessionSummary {
  return {
    id: view.sessionId,
    questionId: view.questionId,
    questionPrompt: view.questionPrompt,
    competency: view.competency,
    round: view.round,
    followUpOf: view.followUpOf,
    durationMs: view.durationMs,
    overall: view.feedback.overall,
    scores: view.feedback.scores,
    transcript: view.transcript,
    feedback: view.feedback,
    createdAt: view.createdAt,
  };
}

/** Newest first, one row per session id. */
export function mergeSessions(sessions: readonly SparSessionSummary[], incoming: SparSessionSummary): SparSessionSummary[] {
  return [incoming, ...sessions.filter((session) => session.id !== incoming.id)].sort(
    (a, b) => b.createdAt - a.createdAt || b.id - a.id,
  );
}

export interface Comparison {
  label: string;
  scores: SparScores;
  overall: number;
  sessionId: number;
}

function isEarlier(session: SparSessionSummary, view: SparResultView): boolean {
  return session.id !== view.sessionId && (session.createdAt < view.createdAt || (session.createdAt === view.createdAt && session.id < view.sessionId));
}

/**
 * What to overlay on the radar: a follow-up (round 2) compares against the
 * main answer it followed; a main answer compares against the previous main
 * answer to the same question.
 */
export function comparisonFor(view: SparResultView, sessions: readonly SparSessionSummary[]): Comparison | null {
  const earlier = sessions
    .filter((session) => session.questionId === view.questionId && session.round === 1 && isEarlier(session, view))
    .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  const match = earlier[0];
  if (!match) return null;
  return {
    label: view.round === 2 ? "Main answer" : "Last attempt",
    scores: match.scores,
    overall: match.overall,
    sessionId: match.id,
  };
}

export interface PracticeStat {
  count: number;
  best: number;
  lastAt: number;
}

type PracticedSession = Pick<SparSessionSummary, "id" | "questionId" | "overall" | "createdAt">;

/** Sessions per question (main answers and follow-ups both count as practice). */
export function practiceStats(
  sessions: readonly Omit<PracticedSession, "id">[],
  base: ReadonlyMap<string, PracticeStat> = new Map(),
): Map<string, PracticeStat> {
  const stats = new Map(base);
  for (const session of sessions) {
    const current = stats.get(session.questionId);
    stats.set(session.questionId, {
      count: (current?.count ?? 0) + 1,
      best: Math.max(current?.best ?? 0, session.overall),
      lastAt: Math.max(current?.lastAt ?? 0, session.createdAt),
    });
  }
  return stats;
}

/**
 * Practice over EVERY session, computed on the server at page load. The history list only carries the latest
 * few dozen sessions, so stats built from it alone would forget older practice (a question answered 16
 * questions ago would read as "New to you" and lose its best score).
 */
export interface PracticeTotals {
  byQuestion: Record<string, PracticeStat>;
  /** Highest session id counted; client-side sessions above it are added on top. */
  throughId: number;
}

export function practiceTotals(sessions: readonly PracticedSession[]): PracticeTotals {
  return {
    byQuestion: Object.fromEntries(practiceStats(sessions)),
    throughId: sessions.reduce((max, session) => Math.max(max, session.id), 0),
  };
}

/** Page-load totals plus sessions recorded since (ids above throughId); just the list when there are no totals. */
export function mergePracticeStats(totals: PracticeTotals | null, sessions: readonly PracticedSession[]): Map<string, PracticeStat> {
  if (!totals) return practiceStats(sessions);
  return practiceStats(
    sessions.filter((session) => session.id > totals.throughId),
    new Map(Object.entries(totals.byQuestion)),
  );
}

/** Answers and best score across every question (for the history header). */
export function practiceSummary(stats: ReadonlyMap<string, PracticeStat>): { count: number; best: number | null } {
  let count = 0;
  let best: number | null = null;
  for (const stat of stats.values()) {
    count += stat.count;
    best = best === null ? stat.best : Math.max(best, stat.best);
  }
  return { count, best };
}

/** "Surprise me": a random question among the least-practiced ones (never the one just asked, when possible). */
export function pickSurprise<T extends { id: string }>(
  questions: readonly T[],
  stats: ReadonlyMap<string, PracticeStat>,
  random: () => number = Math.random,
  excludeId?: string,
): T | null {
  const pool = questions.length > 1 && excludeId ? questions.filter((question) => question.id !== excludeId) : [...questions];
  if (pool.length === 0) return null;
  const fewest = Math.min(...pool.map((question) => stats.get(question.id)?.count ?? 0));
  const candidates = pool.filter((question) => (stats.get(question.id)?.count ?? 0) === fewest);
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index] ?? null;
}

/** Overall scores oldest → newest for the trend sparkline (last `limit` sessions). */
export function scoreTrend(sessions: readonly SparSessionSummary[], limit = 12): Array<{ id: number; overall: number; createdAt: number }> {
  return [...sessions]
    .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
    .slice(-limit)
    .map((session) => ({ id: session.id, overall: session.overall, createdAt: session.createdAt }));
}
