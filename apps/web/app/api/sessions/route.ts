import type { PracticeSessionKind } from "@synapse/core";
import { badRequest, json, route } from "@/lib/server/http";
import { currentUserId, getStore } from "@/lib/server/store";
import type { PracticeSessionsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: readonly PracticeSessionKind[] = ["grill", "bot", "mock", "design"];

/** GET /api/sessions?kind=grill|bot|mock|design&limit=20 → PracticeSessionsResponse (newest first). */
export const GET = route((request) => {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== null && !KINDS.includes(kind as PracticeSessionKind)) throw badRequest(`kind must be one of: ${KINDS.join(", ")}.`);
  const raw = Number(params.get("limit") ?? "20");
  const limit = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 100) : 20;
  const sessions = getStore()
    .listPracticeSessions(currentUserId(), (kind ?? undefined) as PracticeSessionKind | undefined, limit)
    .map(({ userId: _userId, ...session }) => session);
  const response: PracticeSessionsResponse = { sessions };
  return json(response);
});
