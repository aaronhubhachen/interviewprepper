import { unlinkAccount } from "@/lib/server/account";
import { json, readJson, route } from "@/lib/server/http";
import { currentUserId, getStore, now } from "@/lib/server/store";
import { fields } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/link/unlink {} → LinkResponse (drops the iMessage link and shows a fresh link code). */
export const POST = route(async (request) => {
  fields(await readJson(request)).done();
  return json(unlinkAccount(getStore(), currentUserId(), now()));
});
