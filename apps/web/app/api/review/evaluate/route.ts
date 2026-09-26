import { json, readJson, route } from "@/lib/server/http";
import { evaluateReview } from "@/lib/server/review";
import { currentUserId, getStore, now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/review/evaluate { cardId, answer } → ReviewEvaluateResponse (LLM with heuristic fallback). */
export const POST = route(async (request) => {
  const f = fields(await readJson(request));
  const cardId = f.string("cardId", { max: 120 });
  const answer = f.string("answer", { min: 0, max: 4000 });
  f.done();
  return json(await evaluateReview(getStore(), currentUserId(), now(), { cardId, answer }));
});
