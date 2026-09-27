import { GRILL_QUESTION_COUNT, nextGrillQuestion } from "@synapse/core";
import { badRequest, json, readJson, route } from "@/lib/server/http";
import { readGrillSession } from "@/lib/server/grill";
import { withLlmBudget } from "@/lib/server/llm-budget";
import { now } from "@/lib/server/store";
import type { GrillNextResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/grill/next { resume, turns } → GrillNextResponse (LLM interviewer, heuristic fallback). */
export const POST = route(async (request) => {
  const session = readGrillSession(await readJson(request, 256_000));
  if (session.turns.length >= GRILL_QUESTION_COUNT) throw badRequest("The grill is over. Request the report instead.");
  const question = await withLlmBudget(now(), (useLlm) => nextGrillQuestion(session, { useLlm }));
  const response: GrillNextResponse = { ...question, number: session.turns.length + 1, total: GRILL_QUESTION_COUNT };
  return json(response);
});
