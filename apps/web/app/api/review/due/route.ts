import { json, route } from "@/lib/server/http";
import { queueCounts } from "@/lib/server/review";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/review/due → DueResponse (lightweight; polled by the nav badge). */
export const GET = route(() => json(queueCounts(getStore(), currentUserId(), now())));
