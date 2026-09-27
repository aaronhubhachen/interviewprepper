import { json, readJson, route } from "@/lib/server/http";
import { mockPacket } from "@/lib/server/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/** POST /api/mock/packet { coding?, behavioral?, grill? } → MockPacket (hiring-committee write-up, saved as a "mock" session). */
export const POST = route(async (request) => json(await mockPacket(await readJson(request, 64_000))));
