import { NATIVE_LANGUAGES } from "@synapse/core";
import { json, readJson, route } from "@/lib/server/http";
import { runOnServer } from "@/lib/server/judge";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/**
 * POST /api/judge/run { problemId, language: java|cpp|go|typescript, code, argsJson } → { raw }
 * Compiles and runs on the server; the browser compares outputs with judgeResults.
 */
export const POST = route(async (request) => {
  const f = fields(await readJson(request, 200_000));
  const problemId = f.string("problemId", { max: 120 });
  const language = f.oneOf("language", NATIVE_LANGUAGES);
  const code = f.string("code", { max: 50_000, trim: false });
  const argsJson = f.string("argsJson", { max: 100_000 });
  f.done();
  return json(await runOnServer({ problemId, language, code, argsJson }));
});
