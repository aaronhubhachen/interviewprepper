import { json, readJson, route } from "@/lib/server/http";
import { chatWithBot } from "@/lib/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/bot/chat { problemId, language, code, messages, trapMode, trapsUsed } → BotChatResponse */
export const POST = route(async (request) => json(await chatWithBot(await readJson(request, 400_000))));
