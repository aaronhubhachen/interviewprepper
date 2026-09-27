import { afterEach, describe, expect, it } from "vitest";
import { getCard, type Evaluation } from "@synapse/core";
import { FakeSpace, SECOND, MINUTE, DAY, WEB_USER, answerCorrectly, chicago, createHarness, isProbe, linkByText, pending, pendingCard, type Harness } from "./support";

/** Monday 10:00 AM, Chicago: inside active hours and after the morning hour. */
const MONDAY_10AM = chicago(9, 28, 10);

let h: Harness;

afterEach(() => h?.cleanup());

function setup(options: Partial<Parameters<typeof createHarness>[0]> = {}): Harness {
  h = createHarness({ start: MONDAY_10AM, ...options });
  return h;
}

describe("probe → answer → feedback → tapback", () => {
  it("runs the full cycle and updates progress and the due date", async () => {
    setup();
    await linkByText(h);

    expect(h.space.texts[0]).toMatch(/^🔗 Linked!/);
    expect(h.space.texts[1]).toMatch(/^☕ Morning Synapse — /);
    expect(h.space.texts[2]).toMatch(/^☕ Morning Synapse · /);
    expect(isProbe(h.space.texts[2]!)).toBe(true);
    const probe = pending(h);
    expect(probe.phase).toBe("awaiting_answer");
    expect(probe.questionMessageId).toBe(h.space.sent[2]!.id);
    expect(h.store.getUser(WEB_USER)).toMatchObject({ spaceId: h.space.id, handle: "+13145550101" });

    const card = await answerCorrectly(h);
    const feedback = h.space.last;
    expect(h.space.typing).toBe(1);
    expect(feedback.text).toMatch(/^✅ /);
    expect(feedback.text).toContain("Tap this message: ❤️ Effortless → 4d · 👍 Hesitant → 1d · 👎 Guessed → 10m");
    expect(pending(h)).toMatchObject({ phase: "awaiting_grade", feedbackMessageId: feedback.id, answer: card.answerKey });
    expect(pending(h).verdict?.verdict).toBe("correct");

    h.clock.advance(5 * SECOND);
    await h.controller.handleReaction(h.space, "❤️", feedback.id);

    const progress = h.store.getProgress(WEB_USER, card.id)!;
    expect(progress).toMatchObject({ repetition: 1, intervalDays: 4, phase: "review", easeFactor: 2.6 });
    expect(progress.dueAt).toBe(h.clock.now() + 4 * DAY);
    expect(h.store.getPending(WEB_USER)).toBeNull();
    expect(h.space.last.text).toBe(
      `🧠 Locked in. ${card.title} returns in 4d (ease 2.6). 🔥 1-day streak. Reply 'more' for another.`,
    );
    const review = h.store.recentEvents(WEB_USER, 10).find((event) => event.kind === "review");
    expect(review?.detail).toMatchObject({ cardId: card.id, grade: 5, source: "imessage", verdict: "correct" });
  });

  it("ignores a tapback on the wrong message", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    const feedbackId = h.space.last.id;
    const sentBefore = h.space.sent.length;

    await h.controller.handleReaction(h.space, "❤️", "some-older-message");
    expect(h.space.sent.length).toBe(sentBefore);
    expect(h.store.getProgress(WEB_USER, card.id)).toBeNull();
    expect(pending(h).phase).toBe("awaiting_grade");

    await h.controller.handleReaction(h.space, "love", feedbackId);
    expect(h.store.getProgress(WEB_USER, card.id)?.intervalDays).toBe(4);
  });

  it("accepts a tapback without a target id while awaiting the grade", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    await h.controller.handleReaction(h.space, "👍");
    expect(h.store.getProgress(WEB_USER, card.id)).toMatchObject({ intervalDays: 1, phase: "review" });
    expect(h.space.last.text).toContain("returns in 1d");
  });

  it.each([
    ["ok", 1, "review"],
    ["easy", 4, "review"],
    ["3", 4, "review"],
    ["again", 0, "learning"],
    ["👍", 1, "review"],
  ])("grades a text reply %j as a fallback", async (reply, intervalDays, phase) => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    await h.controller.handleText(h.space, reply);
    expect(h.store.getProgress(WEB_USER, card.id)).toMatchObject({ intervalDays, phase });
    expect(h.store.getPending(WEB_USER)).toBeNull();
  });

  it("asks for a rating when a non-grade text arrives after feedback", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    await h.controller.handleText(h.space, "that was a fun one");
    expect(h.space.last.text).toContain(`Rate ${card.title} first`);
    expect(pending(h).phase).toBe("awaiting_grade");
  });

  it("👎 explains the key idea once more and schedules the 10m relearn", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    h.clock.advance(20 * SECOND);
    await h.controller.handleText(h.space, "banana split");
    expect(h.space.last.text).toMatch(/^❌ /);
    const feedbackId = h.space.last.id;

    await h.controller.handleReaction(h.space, "👎", feedbackId);
    const progress = h.store.getProgress(WEB_USER, card.id)!;
    expect(progress).toMatchObject({ phase: "learning", repetition: 0, intervalDays: 0 });
    expect(progress.dueAt).toBe(h.clock.now() + 10 * MINUTE);
    expect(h.space.last.text).toContain(card.explanation);
    expect(h.space.last.text).toContain(`${card.title} comes back in 10m`);
  });

  it("asks for an answer first when a rating arrives on the question", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    await h.controller.handleReaction(h.space, "❤️", pending(h).questionMessageId);
    expect(h.space.last.text).toMatch(/^✍️ Answer first/);
    expect(h.store.getProgress(WEB_USER, card.id)).toBeNull();
  });

  it("falls back to the heuristic when the evaluator throws", async () => {
    setup({
      evaluate: async (): Promise<Evaluation> => {
        throw new Error("model down");
      },
    });
    await linkByText(h);
    await answerCorrectly(h);
    expect(h.space.last.text).toMatch(/^✅ /);
    expect(pending(h).verdict?.source).toBe("heuristic");
  });
});

describe("'idk', hints and flags", () => {
  it("'idk' reveals the answer, auto-grades 1 and relearns in ~10m", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    h.clock.advance(15 * SECOND);
    await h.controller.handleText(h.space, "idk");

    const reveal = h.space.last.text;
    expect(reveal).toContain(card.answerKey);
    expect(reveal).toContain(`Why: ${card.explanation}`);
    expect(reveal).toContain("comes back in 10m");
    expect(h.store.getPending(WEB_USER)).toBeNull();
    const progress = h.store.getProgress(WEB_USER, card.id)!;
    expect(progress.phase).toBe("learning");
    expect(progress.dueAt).toBe(h.clock.now() + 10 * MINUTE);
  });

  it("treats a non-answer like 'no idea tbh' as a reveal", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    await h.controller.handleText(h.space, "no idea tbh");
    expect(h.space.last.text).toContain(card.answerKey);
    expect(h.store.getProgress(WEB_USER, card.id)?.phase).toBe("learning");
  });

  it("❓ on the probe (or 'hint', or '?') sends the hint without grading", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    const hint = `💡 Hint: ${card.hint}`;

    await h.controller.handleReaction(h.space, "❓", pending(h).questionMessageId);
    expect(h.space.last.text.startsWith(hint)).toBe(true);
    await h.controller.handleText(h.space, "hint");
    expect(h.space.last.text.startsWith(hint)).toBe(true);
    await h.controller.handleText(h.space, "?");
    expect(h.space.last.text.startsWith(hint)).toBe(true);

    expect(pending(h).phase).toBe("awaiting_answer");
    expect(h.store.getProgress(WEB_USER, card.id)).toBeNull();
  });

  it("❓ on the feedback explains the card", async () => {
    setup();
    await linkByText(h);
    const card = await answerCorrectly(h);
    await h.controller.handleReaction(h.space, "question", h.space.last.id);
    expect(h.space.last.text).toBe(`🔎 ${card.title}: ${card.explanation}`);
    expect(pending(h).phase).toBe("awaiting_grade");
  });

  it("‼️ flags the card's tags as weak spots", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    await h.controller.handleReaction(h.space, "‼️", pending(h).questionMessageId);

    const weak = h.store.weakTags(WEB_USER, h.clock.now()).map((entry) => entry.tag);
    for (const tag of card.tags) expect(weak).toContain(tag);
    expect(h.space.last.text).toMatch(/^‼️ Flagged /);
    expect(pending(h).phase).toBe("awaiting_answer");
  });

  it("😂 is ignored", async () => {
    setup();
    await linkByText(h);
    const before = h.space.sent.length;
    await h.controller.handleReaction(h.space, "😂", pending(h).questionMessageId);
    expect(h.space.sent.length).toBe(before);
  });
});

describe("commands", () => {
  it("help lists the commands", async () => {
    setup();
    await linkByText(h);
    await h.controller.handleText(h.space, "Help!");
    expect(h.space.last.text).toMatch(/^🧠 Synapse commands/);
  });

  it("stats reports due count, streak, retention and weak spot", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    await h.controller.handleReaction(h.space, "‼️", pending(h).questionMessageId);
    await answerCorrectly(h);
    await h.controller.handleReaction(h.space, "❤️", pending(h).feedbackMessageId);
    await h.controller.handleText(h.space, "stats");

    const text = h.space.last.text;
    expect(text).toMatch(/^📊 Your Synapse/);
    expect(text).toContain("Due now: 0 · Reviewed today: 1");
    expect(text).toContain("Streak: 1 day");
    expect(text).toContain("Retention (30d): 100%");
    expect(text).toContain("Weak spot: ");
    expect(card.tags.length).toBeGreaterThan(0);
    expect(text).toContain("http://synapse.test");
  });

  it("pause stops pushes and resume restarts them", async () => {
    setup();
    await linkByText(h);
    await h.controller.handleText(h.space, "pause");
    expect(h.store.getUser(WEB_USER)?.paused).toBe(true);
    expect(h.space.last.text).toMatch(/^⏸️ Paused/);

    h.store.clearPending(WEB_USER);
    h.clock.advance(MINUTE);
    const paused = await h.controller.tick();
    expect(paused.results.find((result) => result.userId === WEB_USER)?.reason).toBe("paused");

    await h.controller.handleText(h.space, "resume");
    expect(h.store.getUser(WEB_USER)?.paused).toBe(false);
    expect(h.space.last.text).toMatch(/^▶️ Back on/);
    h.clock.advance(MINUTE);
    const resumed = await h.controller.tick();
    expect(resumed.results.find((result) => result.userId === WEB_USER)?.action).toBe("sent");
  });

  it("skip drops the open card and serves a different one", async () => {
    setup();
    await linkByText(h);
    const skipped = pendingCard(h);
    await h.controller.handleText(h.space, "skip");

    expect(h.space.texts.at(-2)).toBe(`⏭️ Skipped ${skipped.title}. It'll come back later.`);
    expect(isProbe(h.space.last.text)).toBe(true);
    const next = pendingCard(h);
    expect(next.id).not.toBe(skipped.id);
    expect(h.store.getProgress(WEB_USER, skipped.id)).toBeNull();

    await h.controller.handleText(h.space, "skip");
    expect(pendingCard(h).id).not.toBe(skipped.id);
  });

  it("skip with nothing open says so", async () => {
    setup();
    await linkByText(h);
    h.store.clearPending(WEB_USER);
    await h.controller.handleText(h.space, "skip");
    expect(h.space.last.text).toMatch(/^🤷 Nothing to skip/);
  });

  it("more sends a card, reminds while one is open, and auto-grades a pending rating", async () => {
    setup();
    await linkByText(h);
    h.store.clearPending(WEB_USER);
    const probesBefore = h.space.probes.length;

    await h.controller.handleText(h.space, "more");
    expect(h.space.probes.length).toBe(probesBefore + 1);
    expect(h.space.last.text).toMatch(/^🧠 Synapse · /);
    const first = pendingCard(h);

    await h.controller.handleText(h.space, "next");
    expect(h.space.last.text).toBe(
      `🧠 Still open: ${first.title}. Answer in 1 sentence, 'hint' for a nudge, or 'skip' for a different card.`,
    );
    expect(h.space.probes.length).toBe(probesBefore + 1);

    await answerCorrectly(h);
    await h.controller.handleText(h.space, "another");
    expect(h.space.texts.at(-2)).toBe(`❤️ Logged ${first.title} as Effortless (my grade). Back in 4d.`);
    expect(h.store.getProgress(WEB_USER, first.id)?.intervalDays).toBe(4);
    expect(h.space.probes.length).toBe(probesBefore + 2);
    expect(pendingCard(h).id).not.toBe(first.id);
  });

  it("more says 'all caught up' when nothing is due and the new-card cap is hit", async () => {
    setup({ newPerDay: 0 });
    await linkByText(h);
    expect(h.space.last.text).toMatch(/^🎉 All caught up!/);
    await h.controller.handleText(h.space, "more");
    expect(h.space.last.text).toContain("today's new-card goal");
  });

  it("why explains the last graded card, and gives only a hint while the card is open", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    await h.controller.handleText(h.space, "why");
    expect(h.space.last.text).toMatch(/^🙊 No spoilers yet\./);

    await answerCorrectly(h);
    await h.controller.handleReaction(h.space, "👍", pending(h).feedbackMessageId);
    await h.controller.handleText(h.space, "explain");
    expect(h.space.last.text).toBe(`🔎 ${card.title}: ${card.explanation}`);
  });

  it("free text with nothing open gets a brief helpful reply", async () => {
    setup();
    await linkByText(h);
    h.store.clearPending(WEB_USER);
    await h.controller.handleText(h.space, "what's up with graphs");
    expect(h.space.last.text).toContain("Reply 'more'");
  });
});

describe("linking & onboarding", () => {
  it("rejects a wrong code and explains how to link", async () => {
    setup();
    const code = h.store.createOrGetLinkCode(WEB_USER);
    await h.controller.handleText(h.space, `link ${code === "1111" ? "2222" : "1111"}`);
    expect(h.space.last.text).toMatch(/^🤔 That code didn't match/);
    expect(h.store.getUser(WEB_USER)?.spaceId).toBeNull();

    await h.controller.handleText(h.space, "link");
    expect(h.space.last.text).toContain("e.g. 'link 1234'");

    await h.controller.handleText(h.space, `Link: ${code}!`);
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
    expect(h.store.listUsers().map((user) => user.id)).toEqual([WEB_USER]);
  });

  it("onboards an unknown texter, creates their user row and does not push to them", async () => {
    setup();
    await h.controller.handleText(h.space, "hello?", { handle: "+15550001111" });
    expect(h.space.sent).toHaveLength(1);
    expect(h.space.last.text).toMatch(/^👋 Hey! I'm Synapse/);
    const placeholder = h.store.findUserBySpace(h.space.id)!;
    expect(placeholder.id).not.toBe(WEB_USER);

    const report = await h.controller.tick();
    expect(report.results.find((result) => result.userId === placeholder.id)?.reason).toBe("not-started");
    expect(h.space.sent).toHaveLength(1);
  });

  it("'start' from SYNAPSE_OWNER_HANDLE links the unlinked web user and merges the placeholder", async () => {
    setup({ policy: { ownerHandle: "(314) 555-0101" } });
    await h.controller.handleText(h.space, "hey", { handle: "+13145550101" });
    await h.controller.handleText(h.space, "Start!", { handle: "+13145550101" });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
    expect(h.store.listUsers().map((user) => user.id)).toEqual([WEB_USER]);
    expect(h.space.texts).toContainEqual(expect.stringMatching(/^🔗 Linked!/));
    expect(isProbe(h.space.last.text)).toBe(true);
  });

  it("'start' from anyone else never claims the web user: they get a solo account", async () => {
    setup();
    const stranger = new FakeSpace("iMessage;-;+19995550000");
    await h.controller.handleText(stranger, "start", { handle: "+19995550000" });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBeNull();
    expect(stranger.texts[0]).toMatch(/^🧠 You're in!/);
    expect(stranger.texts.join("\n")).not.toMatch(/🔗 Linked!/);
    expect(h.store.stats(WEB_USER, h.clock.now()).link.linkCode).toMatch(/^\d{4}$/);
  });

  it("'start' from a second person creates a solo account when the web user is taken", async () => {
    setup();
    await linkByText(h);
    const other = new FakeSpace("iMessage;-;+15550002222");
    await h.controller.handleText(other, "start", { handle: "+15550002222" });
    const solo = h.store.findUserBySpace(other.id)!;
    expect(solo.id).not.toBe(WEB_USER);
    expect(other.texts[0]).toMatch(/^🧠 You're in!/);
    expect(isProbe(other.last.text)).toBe(true);
    expect(h.store.getPending(solo.id)).not.toBeNull();
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
  });

  it("ignores reactions from unknown chats", async () => {
    setup();
    const stranger = new FakeSpace("iMessage;-;+15550003333");
    await h.controller.handleReaction(stranger, "❤️", "whatever");
    expect(stranger.sent).toHaveLength(0);
  });

  it("apologizes instead of crashing when a send fails mid-flow", async () => {
    setup();
    await linkByText(h);
    const card = pendingCard(h);
    let failNext = true;
    const original = h.space.send.bind(h.space);
    h.space.send = async (text: string) => {
      if (failNext) {
        failNext = false;
        throw new Error("network down");
      }
      return original(text);
    };
    await h.controller.handleText(h.space, card.answerKey);
    expect(h.space.last.text).toMatch(/^⚠️ Something glitched/);
    expect(getCard(card.id)).toBeDefined();
  });
});
