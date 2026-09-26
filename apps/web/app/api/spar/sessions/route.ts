import { json, route } from "@/lib/server/http";
import { listSessions } from "@/lib/server/spar";
import { currentUserId, getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/spar/sessions?limit=20 → SparSessionsResponse (newest first). */
export const GET = route((request) => {
  const raw = Number(new URL(request.url).searchParams.get("limit") ?? "20");
  const limit = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 100) : 20;
  return json(listSessions(getStore(), currentUserId(), limit));
});
