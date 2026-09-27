import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { allCards, openStore, WEAK_MAX_SCORE, WEAK_THRESHOLD, zonedTimeToEpoch, type SynapseStore } from "@synapse/core";
import { GET as activityGET } from "@/app/api/activity/route";
import { GET as bonusGET } from "@/app/api/review/bonus/route";
import { setClockForTests, setStoreForTests, setUserForTests } from "@/lib/server/store";
import type { ApiErrorBody, ReviewNextCard, ReviewNextResponse } from "@/lib/types";
import type { ReviewActivityResponse } from "./activity-data";
import { WEAK_SCORE_MAX, WEAK_THRESHOLD as WEB_WEAK_THRESHOLD } from "./insights";

const CHI = "America/Chicago";
const T0 = zonedTimeToEpoch(CHI, 2026, 9, 26, 15);
const NO_CTX = {} as never;

let store: SynapseStore;
let clock = T0;

beforeEach(() => {
  store = openStore(":memory:", { timezone: CHI, dayMs: 86_400_000, morningHour: 9, newPerDay: 2 });
  clock = T0;
  setStoreForTests(store);
  setClockForTests(() => clock);
  setUserForTests("me");
});

afterAll(() => {
  setStoreForTests(undefined);
  setClockForTests(undefined);
  setUserForTests(undefined);
});

const get = (url: string) => new Request(`http://localhost${url}`);

describe("GET /api/activity", () => {
  it("splits reviews by surface per local day", async () => {
    const [a, b, c] = allCards();
    store.ensureUser("me", T0);
    store.gradeCard({ userId: "me", cardId: a!.id, grade: 5, source: "imessage", now: T0 - 86_400_000 });
    store.gradeCard({ userId: "me", cardId: b!.id, grade: 1, source: "web", now: T0 - 60_000 });
    store.gradeCard({ userId: "me", cardId: c!.id, grade: 3, source: "ide", now: T0 - 30_000 });

    const response = await activityGET(get("/api/activity"), NO_CTX);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as ReviewActivityResponse;
    expect(body.buckets).toHaveLength(30);
    expect(body.demoScale).toBe(false);
    expect(body.buckets[29]).toMatchObject({
      label: "Today",
      reviews: 2,
      passed: 1,
      bySource: { imessage: 0, web: 1, ide: 1, voice: 0 },
    });
    expect(body.buckets[28]!.bySource.imessage).toBe(1);
    expect(body.totals).toEqual({ reviews: 3, passed: 2, bySource: { imessage: 1, web: 1, ide: 1, voice: 0 } });

    // Totals agree with core's own reviewsByDay.
    const stats = store.stats("me", T0);
    expect(stats.reviewsByDay.reduce((sum, day) => sum + day.reviews, 0)).toBe(body.totals.reviews);
  });

  it("returns empty buckets for a fresh user", async () => {
    const body = (await (await activityGET(get("/api/activity"), NO_CTX)).json()) as ReviewActivityResponse;
    expect(body.totals.reviews).toBe(0);
    expect(body.buckets.every((bucket) => bucket.reviews === 0)).toBe(true);
  });
});

describe("GET /api/review/bonus", () => {
  it("serves unseen cards past the daily new-card cap", async () => {
    // Spend the cap (newPerDay = 2) via the normal queue.
    for (const card of allCards().slice(0, 2))
      store.gradeCard({ userId: "me", cardId: card.id, grade: 5, source: "web", now: T0 });
    expect(store.nextCard("me", T0)).toBeNull();

    const response = await bonusGET(get("/api/review/bonus"), NO_CTX);
    expect(response.status).toBe(200);
    const body = (await response.json()) as ReviewNextCard;
    expect(body.card).not.toBeNull();
    expect(body.reason).toBe("extra");
    expect(body.state.phase).toBe("new");
    expect(body.preview.love.label).toBe("4d");
    expect(
      allCards()
        .slice(0, 2)
        .map((card) => card.id),
    ).not.toContain(body.card.id);
    // No answer key leaks.
    expect(body.card).not.toHaveProperty("answerKey");
    expect(body.card).not.toHaveProperty("keyPoints");
  });

  it("honours tag and exclude, and reports exhaustion", async () => {
    const tagged = allCards().filter((card) => card.tags.includes("hashing"));
    expect(tagged.length).toBeGreaterThan(0);
    const first = (await (await bonusGET(get("/api/review/bonus?tag=hashing"), NO_CTX)).json()) as ReviewNextCard;
    expect(first.card.tags).toContain("hashing");

    const exclude = tagged.map((card) => card.id).join(",");
    const none = (await (
      await bonusGET(get(`/api/review/bonus?tag=hashing&exclude=${exclude}`), NO_CTX)
    ).json()) as ReviewNextResponse;
    expect(none.card).toBeNull();
    expect(none).toHaveProperty("queue");
  });

  it("rejects unknown tags", async () => {
    const response = await bonusGET(get("/api/review/bonus?tag=nope"), NO_CTX);
    expect(response.status).toBe(400);
    const body = (await response.json()) as ApiErrorBody;
    expect(body.error.code).toBe("invalid_request");
  });
});

describe("browser mirrors of core constants", () => {
  it("match core", () => {
    expect(WEAK_SCORE_MAX).toBe(WEAK_MAX_SCORE);
    expect(WEB_WEAK_THRESHOLD).toBe(WEAK_THRESHOLD);
  });
});
