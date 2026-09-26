import { isTag, type CardKind } from "@synapse/core";
import { badRequest, json, route } from "@/lib/server/http";
import { nextReview } from "@/lib/server/review";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: readonly CardKind[] = ["micro", "problem"];

/** GET /api/review/next?tag=&exclude=id1,id2&kind=micro|problem → ReviewNextResponse */
export const GET = route((request) => {
  const params = new URL(request.url).searchParams;

  const tag = params.get("tag")?.trim() || undefined;
  if (tag !== undefined && !isTag(tag)) throw badRequest(`Unknown tag "${tag.slice(0, 60)}".`, { tag: "unknown tag" });

  const kind = params.get("kind")?.trim() || undefined;
  if (kind !== undefined && !KINDS.includes(kind as CardKind)) {
    throw badRequest("kind must be micro or problem.", { kind: "must be micro or problem" });
  }

  const exclude = (params.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 500);

  return json(nextReview(getStore(), currentUserId(), now(), { tag, kind: kind as CardKind | undefined, exclude }));
});
