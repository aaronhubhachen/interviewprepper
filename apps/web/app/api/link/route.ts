import { linkPayload, setAgentPaused } from "@/lib/server/account";
import { json, readJson, route } from "@/lib/server/http";
import { currentUserId, getStore, now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/link → LinkResponse (creates a link code while unlinked). */
export const GET = route(() => json(linkPayload(getStore(), currentUserId(), now())));

/** POST /api/link { paused: boolean } → LinkResponse (pause/resume proactive iMessage probes). */
export const POST = route(async (request) => {
  const f = fields(await readJson(request));
  const paused = f.boolean("paused");
  f.done();
  return json(setAgentPaused(getStore(), currentUserId(), now(), paused));
});
