/**
 * End-to-end pipeline: synthetic Spectrum-shaped events → dispatchSpectrumMessage
 * (the exact routing index.ts runs inside `for await (… of app.messages)`) →
 * StudyController → stubbed Socratic evaluator → SM-2 → rows in a temp SQLite
 * file, read back through a second, independent connection (as the web app would).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCard, openStore, type Evaluation, type EvaluationInput, type SynapseStore } from "@synapse/core";
import { dispatchSpectrumMessage, type Dispatched, type InboundMessage } from "../src/dispatch";
import { glitch, textOnly } from "../src/messages";
import { CHI, DAY, FakeSpace, MINUTE, SECOND, WEB_USER, chicago, createHarness, isProbe, type Harness } from "./support";

/** Monday 10:00 AM, Chicago: inside active hours and after the morning hour. */
const MONDAY_10AM = chicago(9, 28, 10);
const HANDLE = "+13145550101";
const LEGEND_NEW_CARD = "Tap this message: ❤️ Effortless → 4d · 👍 Hesitant → 1d · 👎 Guessed → 10m";

interface ProgressRow {
  card_id: string;
  card_kind: string;
  repetition: number;
  interval_days: number;
  ease_factor: number;
  due_at: number;
  lapses: number;
  phase: string;
  last_reviewed_at: number | null;
}

interface ReviewLogRow {
  id: number;
  card_id: string;
  grade: number;
  source: string;
  answer: string | null;
  verdict: string | null;
  phase_before: string;
  interval_before: number;
  interval_after: number;
  ease_after: number;
  reviewed_at: number;
}

interface PendingRow {
  card_id: string;
  phase: string;
  question_message_id: string | null;
  feedback_message_id: string | null;
  answer: string | null;
  asked_at: number;
}

let h: Harness | undefined;
let reader: SynapseStore | undefined;
let dispatchErrors: unknown[] = [];

afterEach(() => {
  reader?.close();
  reader = undefined;
  h?.cleanup();
  h = undefined;
  dispatchErrors = [];
});

/** Stands in for core's evaluateAnswer (LLM + heuristic fallback): records its input, answers like the model. */
function stubEvaluator() {
  return vi.fn(
    async (input: EvaluationInput): Promise<Evaluation> => ({
      verdict: "correct",
      nailed: input.keyPoints.map((point) => point.label),
      missed: [],
      feedback: "Spot on: you named the invariant and why it holds.",
      suggestedGrade: 5,
      source: "llm",
    }),
  );
}

function setup(evaluate = stubEvaluator()) {
  h = createHarness({ start: MONDAY_10AM, evaluate });
  return { harness: h, evaluate };
}

let seq = 0;

/** A Spectrum-shaped inbound message from the user's phone. */
function inbound(content: InboundMessage["content"], overrides: Partial<InboundMessage> = {}): InboundMessage {
  return { id: `inbound-${++seq}`, direction: "inbound", sender: { id: HANDLE, kind: "user" }, content, ...overrides };
}

const text = (body: string, overrides?: Partial<InboundMessage>) => inbound({ type: "text", text: body }, overrides);

const tapback = (emoji: string, targetId: string | undefined, overrides?: Partial<InboundMessage>) =>
  inbound({ type: "reaction", emoji, target: targetId ? { id: targetId } : undefined }, overrides);

/** Feeds one event through the production dispatch and waits for the controller to finish. */
async function deliver(event: InboundMessage, space?: FakeSpace, log?: (line: string) => void): Promise<Dispatched> {
  if (!h) throw new Error("call setup() first");
  const result = dispatchSpectrumMessage(h.controller, space ?? h.space, event, {
    platform: "imessage",
    log,
    onError: (_what, error) => dispatchErrors.push(error),
  });
  await result.done;
  return result;
}

/** A second connection to the same SQLite file, the way the web server sees the agent's writes. */
function sqlite() {
  if (!h) throw new Error("call setup() first");
  reader ??= openStore(h.dbPath, { timezone: CHI, dayMs: DAY });
  const db = reader.db;
  return {
    progress: (cardId: string) =>
      db.prepare("SELECT * FROM card_progress WHERE user_id = ? AND card_id = ?").get(WEB_USER, cardId) as ProgressRow | undefined,
    reviews: (cardId?: string) =>
      (cardId
        ? db.prepare("SELECT * FROM review_log WHERE user_id = ? AND card_id = ? ORDER BY id").all(WEB_USER, cardId)
        : db.prepare("SELECT * FROM review_log ORDER BY id").all()) as ReviewLogRow[],
    pending: () => db.prepare("SELECT * FROM pending WHERE user_id = ?").get(WEB_USER) as PendingRow | undefined,
    progressCount: () => (db.prepare("SELECT COUNT(*) AS n FROM card_progress").get() as { n: number }).n,
  };
}

/** Links the chat by texting the dashboard code; the agent answers with a probe. Returns the probe message. */
async function linkAndReceiveProbe() {
  const harness = h!;
  const code = harness.store.createOrGetLinkCode(WEB_USER, harness.clock.now());
  const result = await deliver(text(`link ${code}`));
  expect(result.handled).toBe("text");
  expect(harness.store.getUser(WEB_USER)).toMatchObject({ spaceId: harness.space.id, handle: HANDLE, platform: "imessage" });
  const probe = harness.space.last;
  expect(isProbe(probe.text)).toBe(true);
  return probe;
}

describe("Spectrum event → dispatch → controller → SQLite", () => {
  it.each(["❤️", "love", "❤"])("text answer, then a %s tapback, grades the card into card_progress and review_log", async (emoji) => {
    const { harness, evaluate } = setup();
    const db = sqlite();

    // 1. Probe sent (texting the link code delivers the first card) and persisted as outstanding.
    const probe = await linkAndReceiveProbe();
    const asked = db.pending();
    expect(asked).toMatchObject({ phase: "awaiting_answer", question_message_id: probe.id, asked_at: MONDAY_10AM });
    const card = getCard(asked!.card_id)!;
    expect(card).toBeDefined();
    expect(probe.text).toContain(card.prompt);
    expect(db.progress(card.id)).toBeUndefined();

    // 2. Synthetic text answer → Socratic evaluation with the answer and the card's answer key.
    harness.clock.advance(40 * SECOND);
    const answer = "Keep a hash map of what I have seen and check for the complement before inserting.";
    expect((await deliver(text(answer))).handled).toBe("text");
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(evaluate).toHaveBeenCalledWith({ question: card.prompt, answerKey: card.answerKey, keyPoints: card.keyPoints, answer });
    expect(harness.space.typing).toBe(1);

    // 3. Feedback with the tapback legend; the probe now waits for a rating on that message.
    const feedback = harness.space.last;
    expect(feedback.text).toMatch(/^✅ Spot on: you named the invariant/);
    expect(feedback.text).toContain(LEGEND_NEW_CARD);
    expect(db.pending()).toMatchObject({ phase: "awaiting_grade", feedback_message_id: feedback.id, answer });
    expect(db.progress(card.id)).toBeUndefined();

    // 4. Synthetic tapback targeting the feedback → SM-2 transition persisted.
    harness.clock.advance(5 * SECOND);
    const gradedAt = harness.clock.now();
    expect((await deliver(tapback(emoji, feedback.id))).handled).toBe("reaction");

    expect(db.progress(card.id)).toMatchObject({
      card_kind: "micro",
      repetition: 1,
      interval_days: 4,
      ease_factor: 2.6,
      due_at: gradedAt + 4 * DAY,
      lapses: 0,
      phase: "review",
      last_reviewed_at: gradedAt,
    });
    const reviews = db.reviews(card.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      source: "imessage",
      grade: 5,
      answer,
      phase_before: "new",
      interval_before: 0,
      interval_after: 4,
      ease_after: 2.6,
      reviewed_at: gradedAt,
    });
    expect(JSON.parse(reviews[0]!.verdict!)).toMatchObject({ verdict: "correct", source: "llm" });
    expect(db.pending()).toBeUndefined();
    expect(harness.space.last.text).toContain(`${card.title} returns in 4d (ease 2.6)`);
    expect(harness.space.texts).not.toContain(glitch());
    expect(dispatchErrors).toEqual([]);
  });

  it("a 👎 on a learned card re-probed by the scheduler lapses it into a 10-minute relearn", async () => {
    const { harness, evaluate } = setup();
    const db = sqlite();
    await linkAndReceiveProbe();
    const cardId = db.pending()!.card_id;

    harness.clock.advance(30 * SECOND);
    await deliver(text("first answer"));
    harness.clock.advance(5 * SECOND);
    await deliver(tapback("👍", harness.space.last.id));
    expect(db.progress(cardId)).toMatchObject({ repetition: 1, interval_days: 1, ease_factor: 2.36, phase: "review", lapses: 0 });

    // One day later the scheduler pushes the due card (after the morning briefing).
    harness.clock.advance(DAY);
    const due = await harness.controller.tick(harness.clock.now());
    expect(due.results).toContainEqual(expect.objectContaining({ userId: WEB_USER, action: "sent", cardId }));
    const reprobe = harness.space.last;
    expect(isProbe(reprobe.text)).toBe(true);
    expect(db.pending()).toMatchObject({ card_id: cardId, phase: "awaiting_answer", question_message_id: reprobe.id });

    evaluate.mockResolvedValueOnce({
      verdict: "incorrect",
      nailed: [],
      missed: getCard(cardId)!.keyPoints.map((point) => point.label),
      feedback: "Not quite: that misses the key invariant.",
      suggestedGrade: 1,
      source: "llm",
    });
    harness.clock.advance(30 * SECOND);
    await deliver(text("a confidently wrong answer"));
    const feedback = harness.space.last;
    expect(feedback.text).toMatch(/^❌ Not quite/);
    // Second review (repetition 1): 👍 → 6d, ❤️ → round(6 × 1.3) = 8d, 👎 → 10-minute relearn.
    expect(feedback.text).toContain("Tap this message: ❤️ Effortless → 8d · 👍 Hesitant → 6d · 👎 Guessed → 10m");

    harness.clock.advance(5 * SECOND);
    const lapsedAt = harness.clock.now();
    expect((await deliver(tapback("dislike", feedback.id))).handled).toBe("reaction");
    expect(db.progress(cardId)).toMatchObject({
      repetition: 0,
      interval_days: 0,
      ease_factor: 1.82,
      lapses: 1,
      phase: "relearning",
      due_at: lapsedAt + 10 * MINUTE,
    });
    const reviews = db.reviews(cardId);
    expect(reviews.map((row) => [row.source, row.grade, row.phase_before, row.interval_before, row.interval_after])).toEqual([
      ["imessage", 3, "new", 0, 1],
      ["imessage", 1, "review", 1, 0],
    ]);
    expect(harness.space.last.text).toMatch(/^🔁 No sweat\./);

    // Ten minutes later the relearn step comes back on the next tick.
    harness.clock.advance(10 * MINUTE);
    const retry = await harness.controller.tick(harness.clock.now());
    expect(retry.results).toContainEqual(expect.objectContaining({ userId: WEB_USER, action: "sent", cardId }));
    expect(harness.space.last.text).toContain("🔁 Back for round two.");
    expect(dispatchErrors).toEqual([]);
  });

  it("ignores outbound echoes, the agent's own messages and tapbacks, and unsupported or malformed content", async () => {
    const { harness, evaluate } = setup();
    const db = sqlite();
    const probe = await linkAndReceiveProbe();
    const sentBefore = harness.space.sent.length;
    const pendingBefore = db.pending();

    const events: [InboundMessage, string][] = [
      [text("my answer", { direction: "outbound" }), "outbound"],
      [text("my answer", { sender: { id: "synapse", kind: "agent" } }), "agent"],
      [tapback("❤️", probe.id, { direction: "outbound" }), "outbound"],
      [tapback("❤️", probe.id, { sender: { id: "synapse", kind: "agent" } }), "agent"],
      [inbound({ type: "typing", state: "start" } as InboundMessage["content"]), "unsupported"],
      [inbound({ type: "custom" }), "unsupported"],
      [inbound({ type: "text", text: 42 }), "malformed"],
      [inbound({ type: "reaction", emoji: undefined, target: { id: probe.id } }), "malformed"],
    ];
    for (const [event, reason] of events) {
      harness.clock.advance(SECOND);
      expect(await deliver(event)).toMatchObject({ handled: "ignored", reason });
    }

    expect(harness.space.sent.length).toBe(sentBefore);
    expect(evaluate).not.toHaveBeenCalled();
    expect(db.pending()).toEqual(pendingBefore);
    expect(db.reviews()).toEqual([]);
    expect(db.progressCount()).toBe(0);
    expect(dispatchErrors).toEqual([]);
  });

  it("a tapback on some other message is routed but never grades the open card", async () => {
    const { harness } = setup();
    const db = sqlite();
    await linkAndReceiveProbe();
    const cardId = db.pending()!.card_id;
    harness.clock.advance(30 * SECOND);
    await deliver(text("an answer"));
    const feedback = harness.space.last;
    const sentBefore = harness.space.sent.length;

    expect((await deliver(tapback("❤️", "an-older-message"))).handled).toBe("reaction");
    expect(harness.space.sent.length).toBe(sentBefore);
    expect(db.progress(cardId)).toBeUndefined();
    expect(db.pending()).toMatchObject({ phase: "awaiting_grade", feedback_message_id: feedback.id });

    expect((await deliver(tapback("👍", feedback.id))).handled).toBe("reaction");
    expect(db.progress(cardId)).toMatchObject({ repetition: 1, interval_days: 1, phase: "review" });
    expect(db.reviews(cardId)).toHaveLength(1);
  });
});

describe("dispatch: what reaches the controller", () => {
  it("a swipe-to-reply answer (content.type 'reply' wrapping text) is graded like any answer", async () => {
    const { harness, evaluate } = setup();
    const db = sqlite();
    const probe = await linkAndReceiveProbe();
    harness.clock.advance(30 * SECOND);
    const answer = "hash map + doubly linked list";
    const result = await deliver(inbound({ type: "reply", content: { type: "text", text: answer }, target: { id: probe.id } }));
    expect(result.handled).toBe("text");
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(db.pending()).toMatchObject({ phase: "awaiting_grade", answer });
    expect(dispatchErrors).toEqual([]);
  });

  it("text sent with an iMessage effect (content.type 'effect') is read like plain text", async () => {
    const { harness } = setup();
    await linkAndReceiveProbe();
    harness.clock.advance(SECOND);
    const result = await deliver(inbound({ type: "effect", content: { type: "text", text: "stats" }, effect: "slam" } as InboundMessage["content"]));
    expect(result.handled).toBe("text");
    expect(harness.space.last.text).toMatch(/^📊 Your Prepr/);
  });

  it("a photo with a caption (content.type 'group') is read by its text", async () => {
    const { harness } = setup();
    await linkAndReceiveProbe();
    harness.clock.advance(SECOND);
    const result = await deliver(
      inbound({ type: "group", items: [{ content: { type: "attachment", name: "a.png" } }, { content: { type: "text", text: "stats" } }] }),
    );
    expect(result.handled).toBe("text");
    expect(harness.space.last.text).toMatch(/^📊 Your Prepr/);
  });

  it("voice memos, photos and files get one 'text only' notice instead of silence", async () => {
    const { harness, evaluate } = setup();
    const db = sqlite();
    await linkAndReceiveProbe();
    const pendingBefore = db.pending();
    const sent = harness.space.sent.length;

    expect(await deliver(inbound({ type: "voice", mimeType: "audio/caf" } as InboundMessage["content"]))).toMatchObject({ handled: "unsupported" });
    expect(harness.space.last.text).toBe(textOnly());
    expect(await deliver(inbound({ type: "attachment", name: "whiteboard.jpg" } as InboundMessage["content"]))).toMatchObject({ handled: "unsupported" });
    expect(await deliver(inbound({ type: "group", items: [{ content: { type: "attachment" } }] }))).toMatchObject({ handled: "unsupported" });
    expect(harness.space.sent).toHaveLength(sent + 1);
    expect(evaluate).not.toHaveBeenCalled();
    expect(db.pending()).toEqual(pendingBefore);
  });

  it("group chats are ignored before they reach the controller", async () => {
    const { harness } = setup();
    await linkAndReceiveProbe();
    const group = new FakeSpace("iMessage;+;chat123456", "group");
    expect(await deliver(text("lol what is this bot", { sender: { id: "+15550001111", kind: "user" } }), group)).toMatchObject({
      handled: "ignored",
      reason: "group-chat",
    });
    expect(await deliver(tapback("❤️", "someone-elses-photo"), group)).toMatchObject({ handled: "ignored", reason: "group-chat" });
    expect(group.sent).toHaveLength(0);
    expect(harness.store.getUser(WEB_USER)?.spaceId).toBe(harness.space.id);
  });

  it("logs mask the sender's number and leave out message text", async () => {
    const { harness } = setup();
    await linkAndReceiveProbe();
    const lines: string[] = [];
    harness.clock.advance(30 * SECOND);
    await deliver(text("my secret answer about heaps"), undefined, (line) => lines.push(line));
    await deliver(tapback("❤️", harness.space.last.id), undefined, (line) => lines.push(line));
    const log = lines.join("\n");
    expect(log).toContain("0101");
    expect(log).not.toContain(HANDLE);
    expect(log).not.toContain("secret answer");
  });
});
