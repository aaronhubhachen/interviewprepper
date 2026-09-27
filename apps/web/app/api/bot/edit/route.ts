import { json, readJson, route } from "@/lib/server/http";
import { inlineEdit } from "@/lib/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/bot/edit { problemId, language, code, startLine, endLine, instruction, trapMode, trapsUsed }
 * → BotInlineEditResponse: the complete updated file for a Cmd+K edit (null when no model answered).
 */
export const POST = route(async (request) => json(await inlineEdit(await readJson(request, 200_000))));
