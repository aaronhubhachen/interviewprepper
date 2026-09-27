import { evaluateGrill } from "@synapse/core";
import { json, readJson, route } from "@/lib/server/http";
import { readGrillSession } from "@/lib/server/grill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/** POST /api/grill/report { resume, turns (≥1) } → GrillReport (LLM panel, heuristic fallback). */
export const POST = route(async (request) => {
  const session = readGrillSession(await readJson(request, 256_000), { requireTurns: true });
  return json(await evaluateGrill(session));
});
