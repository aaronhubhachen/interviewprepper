import { statsPayload } from "@/lib/server/account";
import { json, route } from "@/lib/server/http";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats → StatsResponse */
export const GET = route(() => json(statsPayload(getStore(), currentUserId(), now())));
