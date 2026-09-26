import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { allCards, drillCardsForProblem, listProblems, type ReviewCard, type Tag } from "../src/content";
import type { Evaluation } from "../src/grading";
import { openStore, SCHEMA_VERSION, type StorePolicy, type SynapseStore } from "../src/store";
import { zonedTimeToEpoch } from "../src/time";

const CHI = "America/Chicago";
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const POLICY: StorePolicy = { timezone: CHI, dayMs: DAY, morningHour: 9, newPerDay: 3 };
/** Saturday Sep 26 2026, 3:00 PM in Chicago. */
const T0 = zonedTimeToEpoch(CHI, 2026, 9, 26, 15);

const microCards = allCards().filter((card) => card.kind === "micro");

function cardsWithDisjointTags(): [ReviewCard, ReviewCard] {
  for (const a of microCards) {
    const b = microCards.find((other) => other.id !== a.id && !other.tags.some((tag) => a.tags.includes(tag)));
    if (b) return [a, b];
  }
  throw new Error("content needs two micro-cards with disjoint tags");
}

/** The registry-order card the selector introduces first when no tag is weak. */
function defaultFirstNewCard(): ReviewCard {
  return [...microCards].sort((a, b) => a.difficulty - b.difficulty)[0]!;
}

const verdict: Evaluation = {
  verdict: "partial",
  nailed: ["A"],
  missed: ["B"],
  feedback: "Close.",
  suggestedGrade: 3,
  source: "heuristic",
};

let dir: string;
let dbFile: string;
let store: SynapseStore;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "synapse-store-"));
  dbFile = path.join(dir, "synapse.db");
  store = openStore(dbFile, POLICY);
});

afterEach(() => {
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("users & linking", () => {
  it("creates the web user with a 4-digit link code on first stats()", () => {
    const stats = store.stats("me", T0);
    expect(stats.link.linked).toBe(false);
    expect(stats.link.linkCode).toMatch(/^\d{4}$/);
    expect(store.createOrGetLinkCode("me")).toBe(stats.link.linkCode);
  });

  it("links a texter by code and merges their placeholder history", () => {
    store.ensureUser("me", T0);
    const code = store.createOrGetLinkCode("me");
    const identity = { spaceId: "space-1", handle: "(314) 555-0101", platform: "imessage" };

    const { user: placeholder, created } = store.ensureUserForSpace(identity, T0);
    expect(created).toBe(true);
    expect(placeholder.id).not.toBe("me");
    const card = microCards[0]!;
    store.gradeCard({ userId: placeholder.id, cardId: card.id, grade: 5, source: "imessage", now: T0 });

    expect(store.linkByCode("12", identity, T0)).toBeNull();
    expect(store.linkByCode(code === "1234" ? "4321" : "1234", identity, T0)).toBeNull();

    const linked = store.linkByCode(` ${code} `, identity, T0 + 1_000)!;
    expect(linked).toMatchObject({ id: "me", spaceId: "space-1", handle: "+13145550101", linkCode: null });
    expect(store.getUser(placeholder.id)).toBeNull();
    expect(store.getProgress("me", card.id)?.intervalDays).toBe(4);
    expect(store.findUserBySpace("space-1")?.id).toBe("me");
    expect(store.findUserByHandle("+1 314-555-0101")?.id).toBe("me");

    const stats = store.stats("me", T0 + 2_000);
    expect(stats.link).toMatchObject({ linked: true, linkCode: null, spaceId: "space-1" });
    expect(stats.reviewedToday).toBe(1);
  });

  it("auto-links the single unlinked user on start, and only then", () => {
    store.ensureUser("me", T0);
    expect(store.autoLinkSoleUser({ spaceId: "space-9", handle: "me@example.com" }, T0)?.id).toBe("me");
    expect(store.autoLinkSoleUser({ spaceId: "space-10" }, T0)).toBeNull();
  });

  it("refuses to auto-link when several users could match", () => {
    store.ensureUser("a", T0);
    store.ensureUser("b", T0);
    expect(store.autoLinkSoleUser({ spaceId: "space-1" }, T0)).toBeNull();
  });

  it("re-binds a known handle that texts from a new space", () => {
    const first = store.ensureUserForSpace({ spaceId: "s1", handle: "Ada@Example.com" }, T0);
    const again = store.ensureUserForSpace({ spaceId: "s2", handle: "ada@example.com" }, T0);
    expect(again.created).toBe(false);
    expect(again.user.id).toBe(first.user.id);
    expect(again.user.spaceId).toBe("s2");
  });

  it("pauses and resumes a user", () => {
    store.ensureUser("me", T0);
    expect(store.setPaused("me", true, T0).paused).toBe(true);
    expect(store.setPaused("me", false, T0).paused).toBe(false);
    expect(() => store.setPaused("ghost", true, T0)).toThrow();
  });
});

describe("gradeCard", () => {
  it("applies SM-2, logs the review and an activity event", () => {
    store.ensureUser("me", T0);
    const card = microCards[0]!;
    const outcome = store.gradeCard({ userId: "me", cardId: card.id, grade: 5, source: "web", now: T0, answer: "x", verdict });
    expect(outcome.wasNew).toBe(true);
    expect(outcome.before.phase).toBe("new");
    expect(outcome.after).toMatchObject({ intervalDays: 4, phase: "review", dueAt: T0 + 4 * DAY });
    expect(outcome.nextLabel).toBe("4d");
    expect(store.getProgress("me", card.id)).toMatchObject({ cardKind: "micro", intervalDays: 4, boostReason: null });
    expect(store.recentEvents("me")[0]).toMatchObject({ kind: "review", detail: { cardId: card.id, grade: 5 } });
  });

  it("clears the pending probe only when it is for the graded card", () => {
    const [a, b] = cardsWithDisjointTags();
    store.setPending("me", { cardId: a.id, phase: "awaiting_grade" }, T0);
    store.gradeCard({ userId: "me", cardId: b.id, grade: 3, source: "imessage", now: T0 });
    expect(store.getPending("me")?.cardId).toBe(a.id);
    store.gradeCard({ userId: "me", cardId: a.id, grade: 3, source: "imessage", now: T0 });
    expect(store.getPending("me")).toBeNull();
  });

  it("flags tags weak on failure and relieves them on effortless recall", () => {
    const card = microCards[0]!;
    store.gradeCard({ userId: "me", cardId: card.id, grade: 1, source: "imessage", now: T0 });
    const weak = store.weakTags("me", T0);
    expect(weak.map((w) => w.tag).sort()).toEqual([...card.tags].sort());
    expect(weak[0]!.score).toBe(0.5);

    store.gradeCard({ userId: "me", cardId: card.id, grade: 5, source: "imessage", now: T0 + 11 * MINUTE });
    expect(store.weakTags("me", T0 + 11 * MINUTE)).toEqual([]);
  });

  it("previews each tapback from the card's current state", () => {
    const card = microCards[0]!;
    expect(store.cardState("me", card.id, T0).phase).toBe("new");
    expect(store.previewCard("me", card.id, T0).love.label).toBe("4d");
    store.gradeCard({ userId: "me", cardId: card.id, grade: 5, source: "web", now: T0 });
    const preview = store.previewCard("me", card.id, T0 + 4 * DAY);
    expect([preview.love.label, preview.like.label, preview.dislike.label]).toEqual(["8d", "6d", "10m"]);
  });

  it("rejects unknown cards", () => {
    expect(() => store.gradeCard({ userId: "me", cardId: "mc-nope", grade: 3, source: "web", now: T0 })).toThrow(/Unknown card/);
  });
});

describe("weakness", () => {
  it("accumulates, caps, and decays with a 3-SRS-day half-life", () => {
    store.flagWeakness("me", ["dp_state_compression"], "ide", 1, T0);
    store.flagWeakness("me", ["dp_state_compression"], "ide", 1, T0);
    expect(store.weakTags("me", T0)[0]).toMatchObject({ tag: "dp_state_compression", score: 2, source: "ide" });
    expect(store.weakTags("me", T0 + 3 * DAY)[0]!.score).toBe(1);
    expect(store.weakTags("me", T0 + 30 * DAY)).toEqual([]);
    store.flagWeakness("me", ["dp_state_compression"], "tapback", 10, T0);
    expect(store.weakTags("me", T0)[0]!.score).toBe(5);
  });
});

describe("nextCard", () => {
  it("introduces the easiest micro-card first when nothing is due", () => {
    const pick = store.nextCard("me", T0)!;
    expect(pick.reason).toBe("new");
    expect(pick.card.id).toBe(defaultFirstNewCard().id);
    expect(pick.state.phase).toBe("new");
  });

  it("serves due cards before new ones", () => {
    const card = microCards.at(-1)!;
    store.gradeCard({ userId: "me", cardId: card.id, grade: 1, source: "web", now: T0 });
    expect(store.nextCard("me", T0 + 5 * MINUTE)?.reason).toBe("new");
    const pick = store.nextCard("me", T0 + 11 * MINUTE)!;
    expect(pick).toMatchObject({ reason: "due", card: { id: card.id } });
    expect(pick.state.phase).toBe("learning");
  });

  it("ranks due cards by how overdue they are relative to their interval", () => {
    const [a, b] = cardsWithDisjointTags();
    store.gradeCard({ userId: "me", cardId: b.id, grade: 3, source: "web", now: T0 });
    store.gradeCard({ userId: "me", cardId: b.id, grade: 3, source: "web", now: T0 + DAY }); // 6-day interval
    store.gradeCard({ userId: "me", cardId: a.id, grade: 3, source: "web", now: T0 + 6 * DAY }); // 1-day interval
    // Both due at T0 + 7d; one day later a is 100% overdue, b only ~17%.
    expect(store.nextCard("me", T0 + 8 * DAY)?.card.id).toBe(a.id);
  });

  it("boosts due cards whose tags are currently weak", () => {
    const [a, b] = cardsWithDisjointTags();
    for (const card of [a, b]) store.gradeCard({ userId: "me", cardId: card.id, grade: 3, source: "web", now: T0 });
    const later = T0 + DAY + HOUR;
    const first = store.nextCard("me", later)!.card.id;
    const other = first === a.id ? b : a;
    store.flagWeakness("me", other.tags, "ide", 1, later);
    const pick = store.nextCard("me", later)!;
    expect(pick.card.id).toBe(other.id);
    expect(pick.weakTags.length).toBeGreaterThan(0);
  });

  it("enforces the daily new-card cap per local day", () => {
    for (let i = 0; i < POLICY.newPerDay; i++) {
      const pick = store.nextCard("me", T0)!;
      expect(pick.reason).toBe("new");
      store.gradeCard({ userId: "me", cardId: pick.card.id, grade: 5, source: "web", now: T0 });
    }
    expect(store.newCardsIntroduced("me", T0)).toBe(POLICY.newPerDay);
    expect(store.nextCard("me", T0 + HOUR)).toBeNull();
    const tomorrow = zonedTimeToEpoch(CHI, 2026, 9, 27, 8);
    expect(store.nextCard("me", tomorrow)?.reason).toBe("new");
  });

  it("prefers new cards on weak tags", () => {
    const fallback = defaultFirstNewCard();
    const target = microCards.find((card) => card.tags.some((tag) => !fallback.tags.includes(tag)))!;
    const weakTag = target.tags.find((tag) => !fallback.tags.includes(tag)) as Tag;
    store.flagWeakness("me", [weakTag], "ide", 1, T0);
    const pick = store.nextCard("me", T0)!;
    expect(pick.reason).toBe("new");
    expect(pick.card.tags).toContain(weakTag);
    expect(pick.weakTags).toContain(weakTag);
  });

  it("honors excludeCardIds, kinds, and includeNew", () => {
    const first = store.nextCard("me", T0)!.card;
    expect(store.nextCard("me", T0, { excludeCardIds: [first.id] })!.card.id).not.toBe(first.id);
    expect(store.nextCard("me", T0, { includeNew: false })).toBeNull();
    if (listProblems().length > 0) {
      expect(store.nextCard("me", T0, { kinds: ["problem"] })!.card.kind).toBe("problem");
    }
  });

  it("surfaces scheduled drills ahead of other due cards", () => {
    const [a, b] = cardsWithDisjointTags();
    store.gradeCard({ userId: "me", cardId: a.id, grade: 1, source: "web", now: T0 });
    const [drill] = store.scheduleCardsAt("me", [b.id], T0 + HOUR, T0);
    expect(drill).toMatchObject({ cardId: b.id, dueAt: T0 + HOUR });
    expect(store.nextCard("me", T0 + 30 * MINUTE)?.card.id).toBe(a.id);
    expect(store.nextCard("me", T0 + 2 * HOUR)).toMatchObject({ reason: "drill", card: { id: b.id } });

    store.gradeCard({ userId: "me", cardId: b.id, grade: 5, source: "imessage", now: T0 + 2 * HOUR });
    expect(store.getProgress("me", b.id)?.boostReason).toBeNull();
  });

  it("never postpones a card that is already due sooner", () => {
    const card = microCards[0]!;
    store.gradeCard({ userId: "me", cardId: card.id, grade: 1, source: "web", now: T0 });
    const [drill] = store.scheduleCardsAt("me", [card.id], T0 + DAY, T0);
    expect(drill!.dueAt).toBe(T0 + 10 * MINUTE);
  });
});

describe("pending probe", () => {
  it("tracks one outstanding probe through answer and grade phases", () => {
    const [a, b] = cardsWithDisjointTags();
    const asked = store.setPending("me", { cardId: a.id, phase: "awaiting_answer", questionMessageId: "msg-q" }, T0);
    expect(asked).toMatchObject({ cardId: a.id, phase: "awaiting_answer", questionMessageId: "msg-q", askedAt: T0 });

    const graded = store.updatePending("me", { phase: "awaiting_grade", answer: "hash map", verdict, feedbackMessageId: "msg-f" }, T0 + MINUTE)!;
    expect(graded).toMatchObject({
      phase: "awaiting_grade",
      questionMessageId: "msg-q",
      feedbackMessageId: "msg-f",
      answer: "hash map",
      askedAt: T0,
      updatedAt: T0 + MINUTE,
    });
    expect(graded.verdict).toEqual(verdict);

    expect(store.setPending("me", { cardId: b.id, phase: "awaiting_answer" }, T0 + 2 * MINUTE).askedAt).toBe(T0 + 2 * MINUTE);
    store.clearPending("me");
    expect(store.getPending("me")).toBeNull();
    expect(store.updatePending("me", { phase: "awaiting_grade" }, T0)).toBeNull();
  });

  it("expires stale probes without grading them", () => {
    const card = microCards[0]!;
    store.setPending("me", { cardId: card.id, phase: "awaiting_answer" }, T0);
    store.setPending("other", { cardId: card.id, phase: "awaiting_answer" }, T0 + 5 * HOUR);
    const expired = store.expireStalePending(T0 + 6 * HOUR, 6 * HOUR);
    expect(expired.map((probe) => probe.userId)).toEqual(["me"]);
    expect(store.getPending("me")).toBeNull();
    expect(store.getPending("other")).not.toBeNull();
    expect(store.getProgress("me", card.id)).toBeNull();
  });
});

describe("push accounting", () => {
  it("counts pushes per local day and remembers the morning briefing", () => {
    const morning = zonedTimeToEpoch(CHI, 2026, 9, 26, 9);
    const lateNight = zonedTimeToEpoch(CHI, 2026, 9, 26, 23, 30);
    const afterMidnight = zonedTimeToEpoch(CHI, 2026, 9, 27, 0, 30);
    const card = microCards[0]!;

    expect(store.morningSentToday("me", morning)).toBe(false);
    store.recordPush("me", "morning", morning);
    store.recordPush("me", "probe", morning + MINUTE, card.id);
    store.recordPush("me", "probe", lateNight, card.id);

    expect(store.pushesToday("me", lateNight)).toBe(3);
    expect(store.morningSentToday("me", lateNight)).toBe(true);
    expect(store.pushesToday("me", afterMidnight)).toBe(0);
    expect(store.morningSentToday("me", afterMidnight)).toBe(false);
    expect(store.lastPushAt("me")).toBe(lateNight);
    expect(store.recentEvents("me")[0]!.title).toContain(card.title);
  });
});

describe("recordIdeAttempt", () => {
  const problem = listProblems()[0]!;
  const expectedDrills = drillCardsForProblem(problem).slice(0, 2).map((card) => card.id);

  it("flags weak tags and schedules related micro-cards for tomorrow morning", () => {
    const result = store.recordIdeAttempt({
      userId: "me",
      problemId: problem.id,
      stage: "code",
      passed: false,
      testsPassed: 3,
      testsTotal: 9,
      language: "javascript",
      now: T0,
    });
    const tomorrowNine = zonedTimeToEpoch(CHI, 2026, 9, 27, 9);
    expect(result.struggled).toBe(true);
    expect(result.flaggedTags.sort()).toEqual([...problem.weakTags].sort());
    expect(result.drills.map((drill) => drill.cardId)).toEqual(expectedDrills);
    expect(result.drillAt).toBe(tomorrowNine);
    expect(result.drillLabel).toBe("tomorrow at 9:00 AM");
    expect(result.graded).toBeNull();

    expect(store.weakTags("me", T0).map((weak) => weak.tag)).toEqual(expect.arrayContaining(problem.weakTags));
    expect(store.nextCard("me", tomorrowNine)).toMatchObject({ reason: "drill", card: { id: expectedDrills[0] } });
    expect(store.recentEvents("me").map((event) => event.kind)).toEqual(expect.arrayContaining(["drill_scheduled", "weak_flag"]));
  });

  it("flags a problem at most once per day but keeps reporting the queued drills", () => {
    store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "invariant", passed: false, now: T0 });
    const again = store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "edgeCase", passed: false, now: T0 + HOUR });
    expect(again.struggled).toBe(true);
    expect(again.flaggedTags).toEqual([]);
    expect(again.drills.map((drill) => drill.cardId)).toEqual(expectedDrills);
    expect(store.weakTags("me", T0 + HOUR).find((weak) => weak.tag === problem.weakTags[0])!.score).toBeLessThan(1.5);
  });

  it("grades the problem card when the code stage is solved cleanly", () => {
    const result = store.recordIdeAttempt({
      userId: "me",
      problemId: problem.id,
      stage: "code",
      passed: true,
      attemptNumber: 1,
      hintsUsed: 0,
      now: T0,
    });
    expect(result.struggled).toBe(false);
    expect(result.drills).toEqual([]);
    expect(result.graded).toMatchObject({ card: { id: problem.id, kind: "problem" }, after: { intervalDays: 4 } });
    expect(store.listIdeAttempts("me", problem.id)[0]).toMatchObject({ stage: "code", passed: true, struggled: false });
  });

  it("treats heavy hint use as a struggle and giving up as a failed review", () => {
    const hinted = store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: true, hintsUsed: 2, now: T0 });
    expect(hinted.struggled).toBe(true);
    expect(hinted.graded?.after.intervalDays).toBe(1);

    const gaveUp = store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: false, gaveUp: true, now: T0 + 2 * DAY });
    expect(gaveUp.graded?.after.phase).toBe("relearning");
  });

  it("queues drills one SRS day out at demo scale", () => {
    const demo = openStore(path.join(dir, "demo.db"), { ...POLICY, dayMs: MINUTE });
    try {
      const result = demo.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: false, now: T0 });
      expect(result.drillAt).toBe(T0 + MINUTE);
      expect(result.drillLabel).toBe("in 1 min");
    } finally {
      demo.close();
    }
  });

  it("rejects unknown problems", () => {
    expect(() => store.recordIdeAttempt({ userId: "me", problemId: "p-nope", stage: "code", passed: true, now: T0 })).toThrow();
  });
});

describe("forecast & stats", () => {
  it("buckets due cards by local day with overdue cards counted today", () => {
    const [a, b] = cardsWithDisjointTags();
    store.gradeCard({ userId: "me", cardId: a.id, grade: 3, source: "web", now: T0 - 2 * DAY }); // overdue
    store.gradeCard({ userId: "me", cardId: b.id, grade: 5, source: "web", now: T0 }); // +4 days
    const forecast = store.forecast("me", T0, 7);
    expect(forecast).toHaveLength(7);
    expect(forecast.map((day) => day.label).slice(0, 3)).toEqual(["Today", "Tmrw", "Mon"]);
    expect(forecast[0]!.count).toBe(1);
    expect(forecast[4]!.count).toBe(1);
    expect(forecast.reduce((sum, day) => sum + day.count, 0)).toBe(2);
  });

  it("uses SRS-day buckets at demo scale", () => {
    const demo = openStore(path.join(dir, "demo.db"), { ...POLICY, dayMs: MINUTE });
    try {
      demo.gradeCard({ userId: "me", cardId: microCards[0]!.id, grade: 5, source: "web", now: T0 });
      const forecast = demo.forecast("me", T0, 5);
      expect(forecast.map((day) => day.label)).toEqual(["Today", "+1d", "+2d", "+3d", "+4d"]);
      expect(forecast[4]!.count).toBe(1);
    } finally {
      demo.close();
    }
  });

  it("assembles the dashboard stats", () => {
    const [a, b] = cardsWithDisjointTags();
    store.gradeCard({ userId: "me", cardId: a.id, grade: 5, source: "imessage", now: T0 - 2 * DAY });
    store.gradeCard({ userId: "me", cardId: b.id, grade: 1, source: "web", now: T0 - DAY });
    store.gradeCard({ userId: "me", cardId: b.id, grade: 3, source: "web", now: T0 });

    const stats = store.stats("me", T0 + MINUTE);
    expect(stats).toMatchObject({
      userId: "me",
      reviewedToday: 1,
      streakDays: 3,
      cardsLearned: 2,
      totalCards: allCards().length,
      demoScale: false,
    });
    expect(stats.retention30d).toBeCloseTo(2 / 3, 3);
    expect(stats.dueNow).toBe(0);
    expect(stats.forecast14).toHaveLength(14);
    expect(stats.reviewsByDay).toHaveLength(30);
    expect(stats.reviewsByDay.at(-1)).toEqual({ dayKey: "2026-09-26", reviews: 1, passed: 1 });
    expect(stats.reviewsByDay.at(-2)).toEqual({ dayKey: "2026-09-25", reviews: 1, passed: 0 });
    const tagOfA = stats.masteryByTag.find((mastery) => mastery.tag === a.tags[0])!;
    expect(tagOfA.learned).toBeGreaterThanOrEqual(1);
    expect(tagOfA.progress).toBeGreaterThan(0);
    expect(stats.weakTags.map((weak) => weak.tag)).toEqual(expect.arrayContaining(b.tags));
    expect(stats.recentActivity.length).toBeGreaterThan(0);
    expect(stats.link.linkCode).toMatch(/^\d{4}$/);
  });

  it("returns empty-state stats for a brand-new user", () => {
    const stats = store.stats("fresh", T0);
    expect(stats).toMatchObject({ dueNow: 0, reviewedToday: 0, streakDays: 0, retention30d: null, cardsLearned: 0 });
    expect(stats.masteryByTag.every((mastery) => mastery.progress === 0)).toBe(true);
  });
});

describe("spar sessions", () => {
  it("records and lists sparring rounds", async () => {
    const { evaluateBehavioral } = await import("../src/spar");
    const feedback = await evaluateBehavioral(
      { question: "Tell me about a conflict.", transcript: "I led the migration and reduced latency by 40%.", durationMs: 30_000 },
      { useLlm: false },
    );
    const session = store.recordSparSession({ userId: "me", questionId: "bq-x", transcript: "…", durationMs: 30_000, feedback, now: T0 });
    expect(session).toMatchObject({ questionId: "bq-x", overall: feedback.overall, scores: feedback.scores });
    expect(store.listSparSessions("me")).toHaveLength(1);
    expect(store.stats("me", T0).streakDays).toBe(1);
  });
});

describe("persistence", () => {
  it("migrates to the current schema in WAL mode and shares the file across connections", () => {
    expect(store.db.pragma("user_version", { simple: true })).toBe(SCHEMA_VERSION);
    expect(store.db.pragma("journal_mode", { simple: true })).toBe("wal");

    const second = openStore(dbFile, POLICY);
    try {
      store.gradeCard({ userId: "me", cardId: microCards[0]!.id, grade: 3, source: "web", now: T0 });
      expect(second.getProgress("me", microCards[0]!.id)?.intervalDays).toBe(1);
    } finally {
      second.close();
    }
  });
});
