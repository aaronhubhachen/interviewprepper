import { json, route } from "@/lib/server/http";
import { problemDetail } from "@/lib/server/practice";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/problems/{id or leetcode slug} → ProblemResponse (no reference solutions or stage answer keys). */
export const GET = route(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return json(problemDetail(getStore(), currentUserId(), now(), id));
});
