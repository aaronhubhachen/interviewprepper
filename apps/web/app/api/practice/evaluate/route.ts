import { json, readJson, route } from "@/lib/server/http";
import { evaluatePractice } from "@/lib/server/practice";
import { now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";
import type { TextStage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STAGES: readonly TextStage[] = ["invariant", "edgeCase"];

/** POST /api/practice/evaluate { problemId, stage: "invariant"|"edgeCase", answer } → PracticeEvaluateResponse */
export const POST = route(async (request) => {
  const f = fields(await readJson(request));
  const problemId = f.string("problemId", { max: 120 });
  const stage = f.oneOf("stage", STAGES);
  const answer = f.string("answer", { min: 0, max: 4000 });
  f.done();
  return json(await evaluatePractice({ problemId, stage, answer }, now()));
});
