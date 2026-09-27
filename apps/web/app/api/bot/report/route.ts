import { json, readJson, route } from "@/lib/server/http";
import { reportBotSession } from "@/lib/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/** POST /api/bot/report { problemId, language, finalCode, durationMs, messages, events, traps, lastResult } → BotReport */
export const POST = route(async (request) => json(await reportBotSession(await readJson(request, 600_000))));
