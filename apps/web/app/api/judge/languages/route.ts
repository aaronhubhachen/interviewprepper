import { json, route } from "@/lib/server/http";
import { judgeLanguages } from "@/lib/server/judge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/judge/languages → JudgeLanguagesResponse (server-compiled languages with a toolchain). */
export const GET = route(async () => json(await judgeLanguages()));
