import { CODE_LANGUAGES, type IdeStage, type TextGrade } from "@synapse/core";
import { json, readJson, route } from "@/lib/server/http";
import { recordAttempt } from "@/lib/server/practice";
import { currentUserId, getStore, now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES: readonly IdeStage[] = ["invariant", "edgeCase", "code"];
const GRADES: readonly TextGrade[] = [1, 3, 5];
const LANGUAGES = CODE_LANGUAGES;

/**
 * POST /api/practice/attempt → PracticeAttemptResponse
 * { problemId, stage, grade?, passed?, failedRuns?, usedHint?, hintsUsed?, gaveUp?, durationMs?,
 *   language?, testsPassed?, testsTotal?, code?, answer? }
 * A struggle flags the problem's weak tags and queues iMessage drills for the next morning.
 */
export const POST = route(async (request) => {
  const f = fields(await readJson(request, 200_000));
  const input = {
    problemId: f.string("problemId", { max: 120 }),
    stage: f.oneOf("stage", STAGES),
    grade: f.optionalOneOf("grade", GRADES),
    passed: f.optionalBoolean("passed"),
    failedRuns: f.optionalNumber("failedRuns", { integer: true, min: 0, max: 1000 }),
    usedHint: f.optionalBoolean("usedHint"),
    hintsUsed: f.optionalNumber("hintsUsed", { integer: true, min: 0, max: 100 }),
    gaveUp: f.optionalBoolean("gaveUp"),
    durationMs: f.optionalNumber("durationMs", { integer: true, min: 0, max: 86_400_000 }),
    language: f.optionalOneOf("language", LANGUAGES),
    testsPassed: f.optionalNumber("testsPassed", { integer: true, min: 0, max: 10_000 }),
    testsTotal: f.optionalNumber("testsTotal", { integer: true, min: 0, max: 10_000 }),
    code: f.optionalString("code", { min: 0, max: 50_000, trim: false }),
    answer: f.optionalString("answer", { min: 0, max: 4000 }),
  };
  f.done();
  return json(recordAttempt(getStore(), currentUserId(), now(), input));
});
