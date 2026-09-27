import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { allCards, drillCardsForProblem, listProblems, type ReviewCard, type Tag } from "../src/content";
import type { Evaluation } from "../src/grading";
import {
  isGroupSpace,
  LINK_CODE_ROTATE_AFTER_FAILURES,
  LINK_CODE_ROTATE_MIN_AGE_MS,
  LINK_CODE_TTL_MS,
  LINK_FAILURE_WINDOW_MS,
  MAX_LINK_FAILURES_PER_SENDER,
  normalizeHandle,
  openStore,
  SCHEMA_VERSION,
  type StorePolicy,
  type SynapseStore,
} from "../src/store";
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
  it("creates the web user with a 6-digit link code on first stats()", () => {
    const stats = store.stats("me", T0);
    expect(stats.link.linked).toBe(false);
    expect(stats.link.linkCode).toMatch(/^\d{6}$/);
    expect(store.createOrGetLinkCode("me", T0 + MINUTE)).toBe(stats.link.linkCode);
  });

  it("expires a link code after LINK_CODE_TTL_MS and issues a new one", () => {
    const code = store.stats("me", T0).link.linkCode!;
    const owner = { spaceId: "iMessage;-;+13145550101", handle: "+13145550101" };
    // An expired code no longer links (and counts as a wrong guess)...
    expect(store.linkByCode(code, owner, T0 + LINK_CODE_TTL_MS)).toBeNull();
    // ...and the dashboard gets a fresh one that does.
    const fresh = store.createOrGetLinkCode("me", T0 + LINK_CODE_TTL_MS);
    expect(fresh).not.toBe(code);
    expect(fresh).toMatch(/^\d{6}$/);
    expect(store.createOrGetLinkCode("me", T0 + LINK_CODE_TTL_MS + MINUTE)).toBe(fresh);
    expect(store.linkByCode(fresh, owner, T0 + LINK_CODE_TTL_MS + MINUTE)?.id).toBe("me");
  });

  it("rotates a link code on demand", () => {
    const code = store.stats("me", T0).link.linkCode!;
    const rotated = store.rotateLinkCode("me", T0 + MINUTE);
    expect(rotated).not.toBe(code);
    expect(store.stats("me", T0 + MINUTE).link.linkCode).toBe(rotated);
    const owner = { spaceId: "iMessage;-;+13145550101", handle: "+13145550101" };
    expect(store.linkByCode(code, owner, T0 + MINUTE)).toBeNull();
    expect(store.linkByCode(rotated, owner, T0 + MINUTE)?.id).toBe("me");
    expect(() => store.rotateLinkCode("ghost", T0)).toThrow();
  });

  it("links a texter by code and merges their placeholder history", () => {
    store.ensureUser("me", T0);
    const code = store.createOrGetLinkCode("me", T0);
    const identity = { spaceId: "space-1", handle: "(314) 555-0101", platform: "imessage" };

    const { user: placeholder, created } = store.ensureUserForSpace(identity, T0);
    expect(created).toBe(true);
    expect(placeholder.id).not.toBe("me");
    const card = microCards[0]!;
    store.gradeCard({ userId: placeholder.id, cardId: card.id, grade: 5, source: "imessage", now: T0 });

    expect(store.linkByCode("12", identity, T0)).toBeNull();
    expect(store.linkByCode(code.slice(0, 4), identity, T0)).toBeNull();
    expect(store.linkByCode(code === "123456" ? "654321" : "123456", identity, T0)).toBeNull();

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

  it("never auto-links a stranger: without an owner handle the link code is required", () => {
    const code = store.stats("me", T0).link.linkCode!;
    expect(store.autoLinkSoleUser({ spaceId: "iMessage;-;+15550000001", handle: "+15550000001" }, T0)).toBeNull();
    expect(store.autoLinkSoleUser({ spaceId: "space-10" }, T0)).toBeNull();
    // The owner can still claim the dashboard with the code.
    expect(store.linkByCode(code, { spaceId: "iMessage;-;+13145550101", handle: "+13145550101" }, T0)?.id).toBe("me");
  });

  it("auto-links the sole unlinked user only for the configured owner handle", () => {
    const owned = openStore(path.join(dir, "owner.db"), { ...POLICY, ownerHandle: "(314) 555-0101" });
    try {
      owned.ensureUser("me", T0);
      expect(owned.autoLinkSoleUser({ spaceId: "iMessage;-;+15550000001", handle: "+15550000001" }, T0)).toBeNull();
      expect(owned.autoLinkSoleUser({ spaceId: "iMessage;+;chat42", handle: "+13145550101" }, T0)).toBeNull();
      expect(owned.autoLinkSoleUser({ spaceId: "iMessage;-;+13145550101", handle: "+1 314 555 0101" }, T0)).toMatchObject({
        id: "me",
        spaceId: "iMessage;-;+13145550101",
        handle: "+13145550101",
      });
    } finally {
      owned.close();
    }
  });

  it("auto-links to the handle already on record for the web user", () => {
    store.ensureUser("me", T0, { handle: "ada@example.com" });
    expect(store.autoLinkSoleUser({ spaceId: "dm-eve", handle: "eve@example.com" }, T0)).toBeNull();
    expect(store.autoLinkSoleUser({ spaceId: "dm-ada", handle: "Ada@Example.com" }, T0)?.id).toBe("me");
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

  it("never re-binds a user to a group chat, and group members never resolve to someone else", () => {
    const owner = { spaceId: "iMessage;-;+13145550101", handle: "+13145550101" };
    const code = store.createOrGetLinkCode(store.ensureUser("me", T0).id, T0);
    store.linkByCode(code, owner, T0);

    const inGroup = store.ensureUserForSpace({ spaceId: "iMessage;+;chat123", handle: "+13145550101" }, T0);
    expect(inGroup).toMatchObject({ created: false, user: { id: "me", spaceId: owner.spaceId } });
    const friend = store.ensureUserForSpace({ spaceId: "iMessage;+;chat123", handle: "+15559990000" }, T0);
    expect(friend.created).toBe(true);
    expect(friend.user.id).not.toBe("me");
    expect(friend.user.spaceId).toBeNull();
    expect(store.findUserForIdentity({ spaceId: "iMessage;+;chat123", handle: "+15559990000" })?.id).toBe(friend.user.id);
    // The platform's space type wins over the GUID convention.
    expect(store.findUserForIdentity({ spaceId: "opaque-1", spaceType: "group", handle: "+13145550101" })?.spaceId).toBe(owner.spaceId);
    expect(store.getUser("me")!.spaceId).toBe(owner.spaceId);
    // Groups can't link either.
    expect(store.linkByCode(store.createOrGetLinkCode(friend.user.id, T0), { spaceId: "iMessage;+;chat123", handle: "+15559990000" }, T0)).toBeNull();
  });

  it("locks a sender out after repeated wrong link codes, without blocking anyone else", () => {
    const code = store.stats("me", T0).link.linkCode!;
    const wrong = code === "100000" ? "100001" : "100000";
    const guesser = { spaceId: "iMessage;-;+15550000002", handle: "+15550000002" };
    for (let i = 0; i < MAX_LINK_FAILURES_PER_SENDER; i++) {
      expect(store.isLinkLocked(guesser, T0 + i)).toBe(false);
      expect(store.linkByCode(wrong, guesser, T0 + i)).toBeNull();
    }
    expect(store.isLinkLocked(guesser, T0 + MINUTE)).toBe(true);
    // Even the right code is refused while locked, from the same chat or the same handle elsewhere.
    expect(store.linkByCode(code, guesser, T0 + MINUTE)).toBeNull();
    expect(store.linkByCode(code, { spaceId: "other-dm", handle: "+1 555 000 0002" }, T0 + MINUTE)).toBeNull();
    expect(store.getUser("me")!.spaceId).toBeNull();
    // The owner's chat is unaffected, and the lock ages out.
    expect(store.isLinkLocked({ spaceId: "iMessage;-;+13145550101", handle: "+13145550101" }, T0 + MINUTE)).toBe(false);
    expect(store.isLinkLocked(guesser, T0 + LINK_FAILURE_WINDOW_MS + 10)).toBe(false);
    const later = store.createOrGetLinkCode("me", T0 + LINK_FAILURE_WINDOW_MS + 10);
    expect(store.linkByCode(later, guesser, T0 + LINK_FAILURE_WINDOW_MS + 10)?.id).toBe("me");
  });

  it("rotates outstanding link codes under a spray of guesses from many chats", () => {
    const original = store.stats("me", T0).link.linkCode!;
    const wrong = (i: number) => String(100_000 + ((Number(original) - 100_000 + 1 + i) % 900_000));
    // The spray arrives once the code has been out for a while.
    const sprayAt = T0 + LINK_CODE_ROTATE_MIN_AGE_MS;
    for (let i = 0; i < LINK_CODE_ROTATE_AFTER_FAILURES; i++) {
      store.linkByCode(wrong(i), { spaceId: `dm-${i}`, handle: `+1555000${String(i).padStart(4, "0")}` }, sprayAt + i);
    }
    const after = sprayAt + MINUTE;
    const rotated = store.stats("me", after).link.linkCode!;
    expect(rotated).toMatch(/^\d{6}$/);
    expect(rotated).not.toBe(original);
    expect(store.getUser("me")!.linkCode).toBe(rotated);
    // A fresh chat is not locked out and links with the code the dashboard now shows.
    expect(store.linkByCode(original, { spaceId: "dm-late", handle: "+15551112222" }, after)).toBeNull();
    const owner = { spaceId: "iMessage;-;+13145550101", handle: "+13145550101" };
    expect(store.linkByCode(store.stats("me", after).link.linkCode!, owner, after)?.id).toBe("me");
  });

  it("never lets a guess spray invalidate a code the dashboard just issued", () => {
    store.stats("me", T0);
    const sprayAt = T0 + 5 * MINUTE;
    for (let i = 0; i < LINK_CODE_ROTATE_AFTER_FAILURES; i++) {
      store.linkByCode("999999", { spaceId: `dm-${i}`, handle: `+1555000${String(i).padStart(4, "0")}` }, sprayAt + i);
    }
    // The spray rotated the old code; the one issued next survives further misses for LINK_CODE_ROTATE_MIN_AGE_MS.
    const fresh = store.createOrGetLinkCode("me", sprayAt + MINUTE);
    for (let i = 0; i < 5; i++) store.linkByCode("999999", { spaceId: `dm-x${i}`, handle: `+1555100${i}000` }, sprayAt + MINUTE + i);
    const owner = { spaceId: "iMessage;-;+13145550101", handle: "+13145550101" };
    expect(store.linkByCode(fresh, owner, sprayAt + MINUTE + 10)?.id).toBe("me");
  });

  it("unlinks a wrongly linked chat and issues a fresh code", () => {
    const code = store.stats("me", T0).link.linkCode!;
    store.linkByCode(code, { spaceId: "dm-stranger", handle: "+15550000001" }, T0);
    store.setPending("me", { cardId: microCards[0]!.id, phase: "awaiting_answer" }, T0);

    const unlinked = store.unlinkUser("me", T0 + MINUTE);
    expect(unlinked).toMatchObject({ spaceId: null, handle: null });
    expect(store.getPending("me")).toBeNull();
    expect(store.findUserBySpace("dm-stranger")).toBeNull();
    const stats = store.stats("me", T0 + MINUTE);
    expect(stats.link).toMatchObject({ linked: false, linkCode: expect.stringMatching(/^\d{6}$/) });
    expect(store.recentEvents("me").map((event) => event.kind)).toContain("unlinked");
    expect(store.linkByCode(stats.link.linkCode!, { spaceId: "dm-owner", handle: "+13145550101" }, T0 + 2 * MINUTE)?.spaceId).toBe("dm-owner");
    expect(() => store.unlinkUser("ghost", T0)).toThrow();
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

  it("orders ties by recency, then by the order the tags were flagged (primary weak tag first)", () => {
    store.flagWeakness("me", ["dp_state_compression", "bit_manipulation"], "ide", 1, T0);
    expect(store.weakTags("me", T0).map((weak) => weak.tag)).toEqual(["dp_state_compression", "bit_manipulation"]);
    store.flagWeakness("me", ["hashing"], "tapback", 1, T0 + MINUTE);
    expect(store.weakTags("me", T0 + MINUTE).map((weak) => weak.tag)[0]).toBe("hashing");
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

  it("counts the push cap over the last SRS day at demo scale, not the calendar day", () => {
    const demo = openStore(path.join(dir, "demo.db"), { ...POLICY, dayMs: MINUTE });
    try {
      for (let i = 0; i < 12; i++) demo.recordPush("me", "probe", T0 + i * MINUTE, microCards[0]!.id);
      const last = T0 + 11 * MINUTE;
      expect(demo.pushesToday("me", last)).toBe(1);
      expect(demo.pushesToday("me", last + 30_000)).toBe(1);
      expect(demo.pushesToday("me", last + MINUTE)).toBe(0);
      expect(demo.pushesToday("me", last + 3 * HOUR)).toBe(0);
    } finally {
      demo.close();
    }
  });
});

describe("identity helpers", () => {
  it("keeps international numbers written with + as they are", () => {
    expect(normalizeHandle("+3225551234")).toBe("+3225551234");
    expect(normalizeHandle("+6591234567")).not.toBe(normalizeHandle("+1 (659) 123-4567"));
    expect(normalizeHandle("(314) 555-0101")).toBe("+13145550101");
    expect(normalizeHandle("+1 314 555 0101")).toBe("+13145550101");
    expect(normalizeHandle(" Ada@Example.com ")).toBe("ada@example.com");
  });

  it("tells group chats from DMs", () => {
    expect(isGroupSpace({ spaceId: "iMessage;+;chat123" })).toBe(true);
    expect(isGroupSpace({ spaceId: "iMessage;-;+13145550101" })).toBe(false);
    expect(isGroupSpace({ spaceId: "iMessage;-;+13145550101", spaceType: "group" })).toBe(true);
    expect(isGroupSpace({ spaceId: "iMessage;+;chat123", spaceType: "dm" })).toBe(false);
  });
});

describe("regradeReview", () => {
  it("replaces a ❤️ with a 👎 as if the ❤️ never happened", () => {
    const [card] = cardsWithDisjointTags();
    const first = store.gradeCard({ userId: "me", cardId: card.id, grade: 3, source: "imessage", now: T0 });
    const expected = store.previewCard("me", card.id, first.after.dueAt + MINUTE);
    const loved = store.gradeCard({ userId: "me", cardId: card.id, grade: 5, source: "imessage", now: first.after.dueAt, answer: "my answer" });

    const regraded = store.regradeReview(loved.reviewId, 1, loved.before.dueAt + MINUTE)!;
    expect(regraded.before).toEqual(loved.before);
    expect(regraded.after).toEqual(expected.dislike.next);
    expect(store.getProgress("me", card.id)).toMatchObject({ phase: "relearning", lapses: 1, repetition: 0 });
    // One review left for the ❤️ slot, carrying the original answer; the ❤️ and its activity event are gone.
    const reviews = store.db.prepare("SELECT id, grade, answer FROM review_log WHERE card_id = ? ORDER BY id").all(card.id) as {
      id: number;
      grade: number;
      answer: string | null;
    }[];
    expect(reviews.map((review) => review.grade)).toEqual([3, 1]);
    expect(reviews[1]).toMatchObject({ id: regraded.reviewId, answer: "my answer" });
    const reviewEvents = store.recentEvents("me").filter((event) => event.kind === "review");
    expect(reviewEvents).toHaveLength(2);
    // The 👎 flags the card's tags; changing back to ❤️ removes that flag again.
    expect(store.weakTags("me", loved.before.dueAt + MINUTE).map((weak) => weak.tag)).toEqual(expect.arrayContaining([...card.tags]));
    const back = store.regradeReview(regraded.reviewId, 5, loved.before.dueAt + 2 * MINUTE)!;
    expect(back.after.intervalDays).toBe(loved.after.intervalDays);
    expect(store.weakTags("me", loved.before.dueAt + 2 * MINUTE)).toEqual([]);
  });

  it("undoes a first review completely", () => {
    const [card] = cardsWithDisjointTags();
    const outcome = store.gradeCard({ userId: "me", cardId: card.id, grade: 5, source: "web", now: T0 });
    const regraded = store.regradeReview(outcome.reviewId, 3, T0 + MINUTE)!;
    expect(regraded.wasNew).toBe(true);
    expect(regraded.after.intervalDays).toBe(1);
  });

  it("refuses unknown reviews and reviews that are no longer the card's latest", () => {
    const [card] = cardsWithDisjointTags();
    const first = store.gradeCard({ userId: "me", cardId: card.id, grade: 3, source: "web", now: T0 });
    store.gradeCard({ userId: "me", cardId: card.id, grade: 3, source: "web", now: first.after.dueAt });
    const before = store.getProgress("me", card.id);
    expect(store.regradeReview(first.reviewId, 5, T0 + 2 * DAY)).toBeNull();
    expect(store.regradeReview(987_654, 5, T0)).toBeNull();
    expect(store.getProgress("me", card.id)).toEqual(before);
  });

  it("keeps a weak spot that something else flagged after the review", () => {
    const [card] = cardsWithDisjointTags();
    const failed = store.gradeCard({ userId: "me", cardId: card.id, grade: 1, source: "imessage", now: T0 });
    store.flagWeakness("me", card.tags, "tapback", 1, T0 + MINUTE);
    store.regradeReview(failed.reviewId, 5, T0 + 2 * MINUTE);
    expect(store.weakTags("me", T0 + 2 * MINUTE).map((weak) => weak.source)).toContain("tapback");
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

  it("grades the problem card once per day while it is not due, however often it is re-solved", () => {
    const clean = { userId: "me", problemId: problem.id, stage: "code" as const, passed: true, attemptNumber: 1, hintsUsed: 0 };
    expect(store.recordIdeAttempt({ ...clean, now: T0 }).graded?.after.intervalDays).toBe(4);
    expect(store.recordIdeAttempt({ ...clean, now: T0 + MINUTE }).graded).toBeNull();
    expect(store.recordIdeAttempt({ ...clean, now: T0 + 2 * MINUTE }).graded).toBeNull();
    expect(store.getProgress("me", problem.id)).toMatchObject({ intervalDays: 4, dueAt: T0 + 4 * DAY });
    // Once due again, a solve counts.
    expect(store.recordIdeAttempt({ ...clean, now: T0 + 4 * DAY }).graded?.after.intervalDays).toBeGreaterThan(4);
  });

  it("keeps a give-up's weak spots attributed to the IDE, counted once", () => {
    store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: false, gaveUp: true, now: T0 });
    const weak = store.weakTags("me", T0);
    expect(weak.map((entry) => entry.tag).sort()).toEqual([...problem.weakTags].sort());
    for (const entry of weak) expect(entry).toMatchObject({ source: "ide", score: 1 });
    expect(store.getProgress("me", problem.id)?.phase).toBe("learning");
  });

  it("reports an overdue drill as arriving shortly, never at a past time", () => {
    for (const cardId of expectedDrills) store.gradeCard({ userId: "me", cardId, grade: 3, source: "web", now: T0 - 10 * DAY });
    const result = store.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: false, now: T0 });
    expect(result.drills.length).toBeGreaterThan(0);
    expect(result.drillAt).toBe(T0);
    expect(result.drillLabel).toBe("shortly");
  });

  it("moves the drill time into SYNAPSE_ACTIVE_HOURS when the morning hour is quiet", () => {
    const night = openStore(path.join(dir, "night.db"), { ...POLICY, activeHours: { startHour: 22, endHour: 2 } });
    try {
      const result = night.recordIdeAttempt({ userId: "me", problemId: problem.id, stage: "code", passed: false, now: T0 });
      expect(result.drillAt).toBe(zonedTimeToEpoch(CHI, 2026, 9, 27, 22));
      expect(result.drillLabel).toBe("tomorrow at 10:00 PM");
      expect(night.nextDrillTime(T0)).toBe(zonedTimeToEpoch(CHI, 2026, 9, 27, 22));
    } finally {
      night.close();
    }
    const day = openStore(path.join(dir, "day.db"), { ...POLICY, activeHours: { startHour: 8, endHour: 22 } });
    try {
      expect(day.nextDrillTime(T0)).toBe(zonedTimeToEpoch(CHI, 2026, 9, 27, 9));
    } finally {
      day.close();
    }
  });

  it("keeps a drilled card's interval instead of granting the full on-time step", () => {
    const [cardId] = expectedDrills;
    let now = T0 - 30 * DAY;
    for (let i = 0; i < 3; i++) now = store.gradeCard({ userId: "me", cardId: cardId!, grade: 3, source: "web", now }).after.dueAt;
    const learned = store.getProgress("me", cardId!)!;
    expect(learned.intervalDays).toBe(13);
    const drillAt = learned.lastReviewedAt! + 1.9 * DAY;
    store.scheduleCardsAt("me", [cardId!], drillAt, drillAt - HOUR);
    const drilled = store.gradeCard({ userId: "me", cardId: cardId!, grade: 3, source: "imessage", now: drillAt });
    // Pulled forward 1.9 days in: round(1.9 × 2.08) = 4 < 13, so the 13d interval restarts from the drill (not 27d).
    expect(drilled.after).toMatchObject({ repetition: learned.repetition, intervalDays: 13, easeFactor: learned.easeFactor });
    expect(drilled.after.dueAt).toBe(drillAt + 13 * DAY);
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

  it("keeps the day that starts with a skipped midnight (America/Santiago DST)", () => {
    const SCL = "America/Santiago";
    const chile = openStore(path.join(dir, "chile.db"), { ...POLICY, timezone: SCL, newPerDay: 2 });
    try {
      const labels = chile.forecast("me", zonedTimeToEpoch(SCL, 2026, 9, 2, 12), 7).map((day) => day.label);
      expect(labels).toEqual(["Today", "Tmrw", "Fri", "Sat", "Sun", "Mon", "Tue"]);
      const [a, b] = cardsWithDisjointTags();
      const saturdayNight = zonedTimeToEpoch(SCL, 2026, 9, 5, 23, 30);
      chile.gradeCard({ userId: "me", cardId: a.id, grade: 3, source: "web", now: saturdayNight });
      chile.gradeCard({ userId: "me", cardId: b.id, grade: 3, source: "web", now: saturdayNight });
      const sundayMorning = zonedTimeToEpoch(SCL, 2026, 9, 6, 10);
      expect(chile.newCardsIntroduced("me", sundayMorning)).toBe(0);
      expect(chile.nextCard("me", sundayMorning)?.reason).toBe("new");
    } finally {
      chile.close();
    }
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
    expect(stats.link.linkCode).toMatch(/^\d{6}$/);
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
  it("upgrades a version-2 file: old 4-digit link codes are replaced and grading keeps working", () => {
    const code = store.stats("me", T0).link.linkCode!;
    expect(code).toMatch(/^\d{6}$/);
    store.db.exec("DROP TABLE review_undo; ALTER TABLE users DROP COLUMN link_code_issued_at;");
    store.db.prepare("UPDATE users SET link_code = '1234' WHERE id = 'me'").run();
    store.db.pragma("user_version = 2");
    store.close();
    store = openStore(dbFile, POLICY);
    expect(store.db.pragma("user_version", { simple: true })).toBe(SCHEMA_VERSION);
    expect(store.linkByCode("1234", { spaceId: "dm-1", handle: "+15550000001" }, T0)).toBeNull();
    expect(store.stats("me", T0).link.linkCode).toMatch(/^\d{6}$/);
    const outcome = store.gradeCard({ userId: "me", cardId: microCards[0]!.id, grade: 5, source: "web", now: T0 });
    expect(store.regradeReview(outcome.reviewId, 3, T0 + MINUTE)?.after.intervalDays).toBe(1);
  });

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
