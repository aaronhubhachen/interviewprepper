import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyController } from "../src/controller";
import { glitch, textOnly } from "../src/messages";
import {
  DAY,
  FakeSpace,
  HOUR,
  MINUTE,
  SECOND,
  WEB_USER,
  answerCorrectly,
  chicago,
  completeProbe,
  createHarness,
  isProbe,
  linkByText,
  pending,
  pendingCard,
  type Harness,
} from "./support";

/** Monday 10:00 AM, Chicago: inside active hours and after the morning hour. */
const MONDAY_10AM = chicago(9, 28, 10);

let h: Harness;

afterEach(() => h?.cleanup());

function setup(options: Partial<Parameters<typeof createHarness>[0]> = {}): Harness {
  h = createHarness({ start: MONDAY_10AM, ...options });
  return h;
}

function reviewCount(cardId: string): number {
  return (h.store.db.prepare("SELECT COUNT(*) AS n FROM review_log WHERE card_id = ?").get(cardId) as { n: number }).n;
}

/** Makes the next `count` sends from the fake space throw, like a transient iMessage failure. */
function failSends(count: number): void {
  let remaining = count;
  const original = h.space.send.bind(h.space);
  h.space.send = async (text: string) => {
    if (remaining > 0) {
      remaining -= 1;
      throw new Error("network down");
    }
    return original(text);
  };
}

describe("agent state survives a restart", () => {
  it("snoozes: a skipped card stays out of rotation after a restart", async () => {
    setup();
    await linkByText(h);
    const skipped = pendingCard(h);
    await h.controller.handleText(h.space, "skip");
    const second = pendingCard(h);

    h.restart();
    await h.controller.handleText(h.space, "skip");
    expect(pendingCard(h).id).not.toBe(skipped.id);
    expect(pendingCard(h).id).not.toBe(second.id);
  });

  it("last-card memory: ❓ on the old feedback and 'why' still explain it after a restart", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    const feedbackId = pending(h).feedbackMessageId!;
    await h.controller.handleReaction(h.space, "❤️", feedbackId);
    const lockedInId = h.space.last.id;

    h.restart();
    await h.controller.handleReaction(h.space, "❓", feedbackId);
    expect(h.space.last.text).toBe(`🔎 ${card.title}: ${card.explanation}`);
    await h.controller.handleReaction(h.space, "‼️", lockedInId);
    expect(h.space.last.text).toMatch(/^‼️ Flagged /);
    await h.controller.handleText(h.space, "why");
    expect(h.space.last.text).toBe(`🔎 ${card.title}: ${card.explanation}`);
  });

  it("cooldown: the last reply still counts after a restart", async () => {
    setup({ policy: { pushGapMs: 30 * MINUTE } });
    await linkByText(h);
    await completeProbe(h);

    h.restart();
    h.clock.advance(15 * MINUTE);
    const report = await h.controller.tick();
    expect(report.results.find((result) => result.userId === WEB_USER)).toMatchObject({ reason: "cooldown" });
  });

  it("remembers the iMessage line a chat is on and hands it to resolveSpace after a restart", async () => {
    setup();
    const space = new FakeSpace("iMessage;-;+13145550101", "dm", "+13145550100");
    const code = h.store.createOrGetLinkCode(WEB_USER);
    await h.controller.handleText(space, `link ${code}`, { handle: "+13145550101" });
    await completeProbeIn(space);

    const resolveSpace = vi.fn((_spaceId: string) => space);
    const controller = new StudyController<FakeSpace>({
      store: h.store,
      now: h.clock.now,
      policy: { pushGapMs: 0, webUserId: WEB_USER },
      resolveSpace: (spaceId, _user, hints) => {
        expect(hints).toEqual({ phone: "+13145550100" });
        return resolveSpace(spaceId);
      },
      log: () => undefined,
    });
    h.clock.advance(MINUTE);
    const report = await controller.tick();
    expect(resolveSpace).toHaveBeenCalledWith(space.id);
    expect(report.results.find((result) => result.userId === WEB_USER)).toMatchObject({ action: "sent" });
  });
});

async function completeProbeIn(space: FakeSpace): Promise<void> {
  const card = pendingCard(h);
  h.clock.advance(30 * SECOND);
  await h.controller.handleText(space, card.answerKey);
  h.clock.advance(5 * SECOND);
  await h.controller.handleReaction(space, "❤️", pending(h).feedbackMessageId);
}

describe("changing a tapback", () => {
  it("❤️ then 👎 on the same feedback replaces the rating instead of keeping the first one", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    const feedbackId = pending(h).feedbackMessageId!;
    h.clock.advance(5 * SECOND);
    await h.controller.handleReaction(h.space, "❤️", feedbackId);
    expect(h.store.getProgress(WEB_USER, card.id)?.intervalDays).toBe(4);

    h.clock.advance(3 * SECOND);
    await h.controller.handleReaction(h.space, "👎", feedbackId);
    const progress = h.store.getProgress(WEB_USER, card.id)!;
    expect(progress).toMatchObject({ phase: "learning", repetition: 0, intervalDays: 0 });
    expect(progress.dueAt).toBe(h.clock.now() + 10 * MINUTE);
    expect(reviewCount(card.id)).toBe(1);
    expect(h.space.last.text).toBe(`✏️ Updated: ${card.title} is now 👎 Guessed. Back in 10m.`);

    h.clock.advance(3 * SECOND);
    await h.controller.handleReaction(h.space, "👍", feedbackId);
    expect(h.store.getProgress(WEB_USER, card.id)).toMatchObject({ phase: "review", repetition: 1, intervalDays: 1 });
    expect(reviewCount(card.id)).toBe(1);
    const reviews = h.store.recentEvents(WEB_USER, 20).filter((event) => event.kind === "review");
    expect(reviews).toHaveLength(1);
  });

  it("the same rating again changes nothing, and a change after the window is ignored", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    const feedbackId = pending(h).feedbackMessageId!;
    await h.controller.handleReaction(h.space, "❤️", feedbackId);
    const sent = h.space.sent.length;
    await h.controller.handleReaction(h.space, "love", feedbackId);
    expect(h.space.sent).toHaveLength(sent);

    h.clock.advance(11 * MINUTE);
    await h.controller.handleReaction(h.space, "👎", feedbackId);
    expect(h.store.getProgress(WEB_USER, card.id)?.intervalDays).toBe(4);
    expect(h.space.sent).toHaveLength(sent);
  });
});

describe("a send that fails after the grade is saved", () => {
  it("'idk': a transient failure is retried, so the answer is still revealed", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    failSends(1);
    await h.controller.handleText(h.space, "idk");
    expect(h.space.last.text).toContain(card.answerKey);
    expect(h.space.texts).not.toContain(glitch());
  });

  it("'idk': when the retry fails too, a short reveal says it was saved (not 'try again')", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    failSends(2);
    await h.controller.handleText(h.space, "idk");
    expect(h.space.last.text).toMatch(/^💡 /);
    expect(h.space.last.text).toContain(`Saved as a blank. ${card.title} comes back in 10m.`);
    expect(h.space.texts).not.toContain(glitch());
    expect(h.store.getProgress(WEB_USER, card.id)?.phase).toBe("learning");
  });

  it("a rating: the fallback confirms what was saved", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    failSends(2);
    await h.controller.handleReaction(h.space, "❤️", pending(h).feedbackMessageId);
    expect(h.space.last.text).toBe(`✅ Saved: ${card.title} as ❤️ Effortless, back in 4d. Reply 'more' for another.`);
    expect(h.store.getProgress(WEB_USER, card.id)?.intervalDays).toBe(4);
  });
});

describe("non-text messages", () => {
  it("a known texter gets one 'text only' notice per 10 minutes; strangers get nothing", async () => {
    setup();
    await linkByText(h);
    const sent = h.space.sent.length;
    await h.controller.handleUnsupported(h.space);
    expect(h.space.last.text).toBe(textOnly());
    await h.controller.handleUnsupported(h.space);
    expect(h.space.sent).toHaveLength(sent + 1);
    h.clock.advance(11 * MINUTE);
    await h.controller.handleUnsupported(h.space);
    expect(h.space.sent).toHaveLength(sent + 2);

    const stranger = new FakeSpace("iMessage;-;+19995550000");
    await h.controller.handleUnsupported(stranger);
    expect(stranger.sent).toHaveLength(0);
  });
});

describe("an answered but unrated probe", () => {
  it("keeps the evaluator's grade when it goes stale instead of being thrown away", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    expect(pending(h).verdict?.suggestedGrade).toBe(5);

    h.clock.advance(6 * HOUR + MINUTE);
    const report = await h.controller.tick();
    const mine = report.results.find((result) => result.userId === WEB_USER)!;
    expect(mine).toMatchObject({ action: "sent", gradedCardId: card.id });
    expect(mine.expiredCardId).toBeUndefined();
    expect(h.store.getProgress(WEB_USER, card.id)).toMatchObject({ repetition: 1, intervalDays: 4, phase: "review" });
    expect(isProbe(h.space.last.text)).toBe(true);
  });

  it("'more' after it went stale applies the evaluator's grade too", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    h.clock.advance(DAY);
    await h.controller.handleText(h.space, "more");
    expect(h.space.texts.at(-2)).toBe(`❤️ Logged ${card.title} as Effortless (my grade). Back in 4d.`);
    expect(h.store.getProgress(WEB_USER, card.id)?.intervalDays).toBe(4);
  });
});
