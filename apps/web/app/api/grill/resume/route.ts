import { json, readJson, route } from "@/lib/server/http";
import { extractResumeText, MAX_RESUME_BYTES } from "@/lib/server/grill";
import { fields } from "@/lib/server/validate";
import type { GrillResumeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Base64 inflates by 4/3; leave room for the JSON envelope. */
const MAX_BODY_BYTES = Math.ceil((MAX_RESUME_BYTES * 4) / 3) + 16_000;

/**
 * POST /api/grill/resume { fileName, mimeType?, dataBase64 } → GrillResumeResponse.
 * JSON (not multipart) like every mutating route, so route()'s CSRF rule holds. PDF, .txt or .md up to 5 MB.
 */
export const POST = route(async (request) => {
  const f = fields(await readJson(request, MAX_BODY_BYTES));
  const fileName = f.string("fileName", { max: 200 });
  const mimeType = f.optionalString("mimeType", { min: 0, max: 120 }) ?? "";
  const dataBase64 = f.string("dataBase64", { max: MAX_BODY_BYTES });
  f.done();
  const bytes = new Uint8Array(Buffer.from(dataBase64, "base64"));
  const result: GrillResumeResponse = await extractResumeText({ name: fileName, type: mimeType, bytes });
  return json(result);
});
