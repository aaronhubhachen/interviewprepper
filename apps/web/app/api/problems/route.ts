import { json, route } from "@/lib/server/http";
import { listProblemSummaries } from "@/lib/server/practice";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/problems → ProblemsResponse */
export const GET = route(() => json(listProblemSummaries(getStore(), currentUserId(), now())));
