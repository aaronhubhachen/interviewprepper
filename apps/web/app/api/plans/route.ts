import { json, route } from "@/lib/server/http";
import { plansPayload } from "@/lib/server/plans";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/plans → PlansResponse: Blind 75 / NeetCode 150 with per-category progress. */
export const GET = route(() => json(plansPayload(getStore(), currentUserId(), now())));
