import { json, route } from "@/lib/server/http";
import { listQuestions } from "@/lib/server/spar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/behavioral → BehavioralResponse */
export const GET = route(() => json(listQuestions()));
