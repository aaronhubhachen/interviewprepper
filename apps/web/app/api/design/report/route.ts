import { evaluateDesign } from "@synapse/core";
import { readDesignSession } from "@/lib/server/design";
import { json, readJson, route } from "@/lib/server/http";
import { withLlmBudget } from "@/lib/server/llm-budget";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/** POST /api/design/report { promptId, diagram, notes, turns (≥1) } → DesignReport, saved as a "design" session with the diagram. */
export const POST = route(async (request) => {
  const session = readDesignSession(await readJson(request, 256_000), { requireTurns: true });
  const report = await withLlmBudget(now(), (useLlm) => evaluateDesign(session, { useLlm }));
  const store = getStore();
  const userId = currentUserId();
  store.ensureUser(userId, now());
  store.recordPracticeSession({
    userId,
    kind: "design",
    subject: session.prompt.title,
    score: report.overall,
    report: { report, promptId: session.prompt.id, diagram: session.diagram },
    now: now(),
  });
  return json(report);
});
