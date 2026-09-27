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
import { badRequest, notFound } from "./http";
import { takeSparSaveSlot, withLlmBudget } from "./llm-budget";

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

/** Recent sessions searched for the follow-up a round 2 answers (the /spar history shows 30). */
const FOLLOW_UP_SCAN = 200;

/**
 * The round-2 follow-up goes into the trusted part of the grading prompt, so
 * it must be one Prepr asked: a scripted follow-up of the question, or the
 * follow-up stored with one of this user's recent sessions of it. Returns the
 * server's copy of the text.
 */
function knownFollowUp(
  store: SynapseStore,
  userId: string,
  question: BehavioralQuestion,
  followUpOf: string,
): string | undefined {
  const wanted = followUpOf.trim();
  const scripted = question.followUps.find((followUp) => followUp.trim() === wanted);
  if (scripted) return scripted;
  for (const session of store.listSparSessions(userId, FOLLOW_UP_SCAN)) {
    if (session.questionId !== question.id) continue;
    const asked = (session.feedback as Partial<StoredFeedback>).followUp;
    if (typeof asked === "string" && asked.trim() === wanted) return asked;
  }
  return undefined;
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
  let followUpOf: string | undefined;
  if (round === 2 && input.followUpOf) {
    followUpOf = knownFollowUp(store, userId, base, input.followUpOf);
    if (followUpOf === undefined) {
      throw badRequest("followUpOf must be a follow-up question Prepr asked for this question.", {
        followUpOf: "is not a follow-up Prepr asked",
      });
    }
  }
  const question = questionForRound(base, round, followUpOf);

  takeSparSaveSlot(now);
  const feedback = await withLlmBudget(now, (useLlm) =>
    evaluateBehavioral({ question, transcript: input.transcript, durationMs: input.durationMs }, { useLlm }),
  );

  store.ensureUser(userId, now);
  const stored: StoredFeedback = { ...feedback, context: { round, followUpOf: followUpOf ?? null } };
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
