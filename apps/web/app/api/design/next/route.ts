import { DESIGN_QUESTION_COUNT, nextDesignQuestion } from "@synapse/core";
import { readDesignSession } from "@/lib/server/design";
import { badRequest, json, readJson, route } from "@/lib/server/http";
import { withLlmBudget } from "@/lib/server/llm-budget";
import { now } from "@/lib/server/store";
import type { DesignNextResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/design/next { promptId, diagram, notes, turns } → DesignNextResponse (LLM interviewer, heuristic fallback). */
export const POST = route(async (request) => {
  const session = readDesignSession(await readJson(request, 256_000));
  if (session.turns.length >= DESIGN_QUESTION_COUNT) throw badRequest("The interview is over. Request the report instead.");
  const question = await withLlmBudget(now(), (useLlm) => nextDesignQuestion(session, { useLlm }));
  const response: DesignNextResponse = { ...question, number: session.turns.length + 1, total: DESIGN_QUESTION_COUNT };
  return json(response);
});
