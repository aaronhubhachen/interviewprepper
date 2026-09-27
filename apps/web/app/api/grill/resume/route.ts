import { badRequest, json, route } from "@/lib/server/http";
import { extractResumeText, MAX_RESUME_BYTES } from "@/lib/server/grill";
import type { GrillResumeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/grill/resume (multipart/form-data, field "file": PDF, .txt, or .md up to 5 MB) → GrillResumeResponse. */
export const POST = route(async (request) => {
  if (Number(request.headers.get("content-length") ?? "0") > MAX_RESUME_BYTES + 64_000) {
    throw badRequest("Resume must be 5 MB or smaller.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("Expected a multipart upload with a \"file\" field.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Expected a multipart upload with a \"file\" field.");
  const result: GrillResumeResponse = await extractResumeText(file);
  return json(result);
});
