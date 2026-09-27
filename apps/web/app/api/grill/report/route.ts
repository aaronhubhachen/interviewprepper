import { evaluateGrill } from "@synapse/core";
import { json, readJson, route } from "@/lib/server/http";
import { readGrillSession } from "@/lib/server/grill";
import { withLlmBudget } from "@/lib/server/llm-budget";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * POST /api/grill/report { resume, turns (≥1) } → GrillReport (LLM panel, heuristic fallback).
 * The report (not the resume) is saved as a practice session for the dashboard's trends.
 */
export const POST = route(async (request) => {
  const session = readGrillSession(await readJson(request, 256_000), { requireTurns: true });
  const report = await withLlmBudget(now(), (useLlm) => evaluateGrill(session, { useLlm }));
  const store = getStore();
  const userId = currentUserId();
  store.ensureUser(userId, now());
  store.recordPracticeSession({ userId, kind: "grill", subject: "Resume", score: report.overall, report, now: now() });
  return json(report);
});
