import { json, readJson, route } from "@/lib/server/http";
import { evaluateSpar } from "@/lib/server/spar";
import { currentUserId, getStore, now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const ROUNDS = [1, 2] as const;

/**
 * POST /api/spar/evaluate { questionId, transcript, durationMs, round?: 1|2, followUpOf? } → SparEvaluateResponse
 * Engineering-Manager feedback (LLM, ~25 s budget, heuristic fallback); persisted as a spar session.
 */
export const POST = route(async (request) => {
  const f = fields(await readJson(request, 128_000));
  const questionId = f.string("questionId", { max: 120 });
  const transcript = f.string("transcript", { max: 20_000 });
  const durationMs = f.number("durationMs", { integer: true, min: 1_000, max: 30 * 60_000 });
  const round = f.optionalOneOf("round", ROUNDS);
  const followUpOf = f.optionalString("followUpOf", { max: 500 });
  f.done();
  return json(
    await evaluateSpar(getStore(), currentUserId(), now(), { questionId, transcript, durationMs, round, followUpOf }),
  );
});
