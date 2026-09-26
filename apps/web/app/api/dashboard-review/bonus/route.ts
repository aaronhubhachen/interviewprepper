import { allCards, humanizeDuration, isTag, newReviewState } from "@synapse/core";
import { pickBonusCard } from "@/components/review/bonus";
import { badRequest, json, route } from "@/lib/server/http";
import { queueCounts } from "@/lib/server/review";
import { tagRefs, toClientCard, toClientState } from "@/lib/server/serialize";
import { currentUserId, getStore, now } from "@/lib/server/store";
import type { ReviewNextResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard-review/bonus?tag=&exclude=id1,id2 → ReviewNextResponse
 * "Study new cards": the next never-seen card, ignoring the daily new-card cap
 * (weak tags first, micro-cards before problems, easier first). reason = "extra".
 * Grading it through /api/review/grade works as usual.
 */
export const GET = route((request) => {
  const params = new URL(request.url).searchParams;
  const tag = params.get("tag")?.trim() || undefined;
  if (tag !== undefined && !isTag(tag)) throw badRequest(`Unknown tag "${tag.slice(0, 60)}".`, { tag: "unknown tag" });
  const exclude = new Set(
    (params.get("exclude") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 500),
  );

  const store = getStore();
  const userId = currentUserId();
  const at = now();
  store.ensureUser(userId, at);

  const seen = new Set(store.listProgress(userId).map((entry) => entry.cardId));
  const weak = store.weakTags(userId, at);
  const weakScores = new Map<string, number>(weak.map((entry) => [entry.tag, entry.score]));
  const card = pickBonusCard(allCards(), { seen, exclude, tag, weakScores });
  const queue = queueCounts(store, userId, at);

  let body: ReviewNextResponse;
  if (card) {
    body = {
      card: toClientCard(card),
      reason: "extra",
      weakTags: tagRefs(card.tags.filter((cardTag) => weakScores.has(cardTag))),
      state: toClientState(newReviewState(at)),
      preview: store.previewCard(userId, card.id, at),
      queue,
    };
  } else {
    body = {
      card: null,
      nextDueAt: queue.nextDueAt,
      nextDueIn: queue.nextDueAt === null ? null : humanizeDuration(queue.nextDueAt - at),
      queue,
    };
  }
  return json(body);
});
