import { json, route } from "@/lib/server/http";
import { problemSolution } from "@/lib/server/practice";
import { currentUserId, getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/problems/{id}/solution → ProblemSolutionResponse.
 * 403 until the code stage has been attempted (any recorded code attempt, incl. give up).
 */
export const GET = route(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return json(problemSolution(getStore(), currentUserId(), id));
});
