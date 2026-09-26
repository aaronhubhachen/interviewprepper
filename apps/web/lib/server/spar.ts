import "server-only";

import {
  evaluateBehavioral,
  getBehavioral,
  listBehavioral,
  type BehavioralFeedback,
  type BehavioralQuestion,
  type SynapseStore,
} from "@synapse/core";
import type { BehavioralResponse, SparEvaluateResponse, SparSessionSummary, SparSessionsResponse } from "@/lib/types";
import { notFound } from "./http";

export function listQuestions(): BehavioralResponse {
  return { questions: listBehavioral().map((question) => ({ ...question })) };
}

interface StoredContext {
  round?: 1 | 2;
  followUpOf?: string | null;
}

/** Feedback persisted with the round context (spar_sessions has no round column). */
type StoredFeedback = BehavioralFeedback & { context?: StoredContext };

export interface SparInput {
  questionId: string;
  transcript: string;
  durationMs: number;
  round?: 1 | 2;
  followUpOf?: string;
}

/** Round 2 grades the answer to the follow-up, keeping the original rubric. */
function questionForRound(question: BehavioralQuestion, round: 1 | 2, followUpOf?: string): BehavioralQuestion {
  if (round !== 2 || !followUpOf) return question;
  return {
    ...question,
    prompt: `${question.prompt} Follow-up question (the candidate is answering this): ${followUpOf}`,
    followUps: question.followUps.filter((followUp) => followUp !== followUpOf),
  };
}

export async function evaluateSpar(
  store: SynapseStore,
  userId: string,
  now: number,
  input: SparInput,
): Promise<SparEvaluateResponse> {
  const base = getBehavioral(input.questionId);
  if (!base) throw notFound(`Unknown behavioral question "${input.questionId}".`);
  const round = input.round ?? 1;
  const question = questionForRound(base, round, input.followUpOf);

  const feedback = await evaluateBehavioral({ question, transcript: input.transcript, durationMs: input.durationMs });

  store.ensureUser(userId, now);
  const stored: StoredFeedback = { ...feedback, context: { round, followUpOf: input.followUpOf ?? null } };
  const session = store.recordSparSession({
    userId,
    questionId: base.id,
    transcript: input.transcript,
    durationMs: input.durationMs,
    feedback: stored,
    now,
  });

  return {
    sessionId: session.id,
    createdAt: session.createdAt,
    questionId: base.id,
    round,
    question: question.prompt,
    feedback,
    metrics: feedback.analysis,
    source: feedback.source,
  };
}

export function listSessions(store: SynapseStore, userId: string, limit = 20): SparSessionsResponse {
  const sessions: SparSessionSummary[] = store.listSparSessions(userId, limit).map((session) => {
    const { context, ...feedback } = session.feedback as StoredFeedback;
    const question = getBehavioral(session.questionId);
    return {
      id: session.id,
      questionId: session.questionId,
      questionPrompt: question?.prompt ?? null,
      competency: question?.competency ?? null,
      round: context?.round === 2 ? 2 : 1,
      followUpOf: context?.followUpOf ?? null,
      durationMs: session.durationMs,
      overall: session.overall,
      scores: session.scores,
      transcript: session.transcript,
      feedback,
      createdAt: session.createdAt,
    };
  });
  return { sessions };
}
