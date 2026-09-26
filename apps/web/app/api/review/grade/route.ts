import type { TextGrade } from "@synapse/core";
import { json, readJson, route } from "@/lib/server/http";
import { gradeReviewCard, parseVerdict } from "@/lib/server/review";
import { currentUserId, getStore, now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRADES: readonly TextGrade[] = [1, 3, 5];

/** POST /api/review/grade { cardId, grade: 1|3|5, answer?, verdict? } → ReviewGradeResponse */
export const POST = route(async (request) => {
  const f = fields(await readJson(request));
  const cardId = f.string("cardId", { max: 120 });
  const grade = f.oneOf("grade", GRADES);
  const answer = f.optionalString("answer", { min: 0, max: 4000 });
  f.done();
  const verdict = parseVerdict(f.raw("verdict"));
  return json(gradeReviewCard(getStore(), currentUserId(), now(), { cardId, grade, answer, verdict }));
});
