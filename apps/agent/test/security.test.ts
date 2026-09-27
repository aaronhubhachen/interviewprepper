import { afterEach, describe, expect, it } from "vitest";
import { MAX_LINK_FAILURES_PER_SENDER } from "@synapse/core";
import { ownerHello } from "../src/messages";
import { FakeSpace, MINUTE, SECOND, WEB_USER, answerCorrectly, chicago, createHarness, isProbe, linkByText, pending, type Harness } from "./support";

/** Monday 10:00 AM, Chicago: inside active hours and after the morning hour. */
const MONDAY_10AM = chicago(9, 28, 10);
const OWNER = "+13145550101";
const FRIEND = "+15550001111";

let h: Harness;

afterEach(() => h?.cleanup());

function setup(options: Partial<Parameters<typeof createHarness>[0]> = {}): Harness {
  h = createHarness({ start: MONDAY_10AM, ...options });
  return h;
}

function wrongCode(code: string, offset: number): string {
  return String(((Number(code) - 1000 + offset) % 9000) + 1000);
}

describe("group chats are never served", () => {
  it("a tapback or text in a group leaves the owner's chat binding alone and sends nothing", async () => {
    setup();
    await linkByText(h);
    const probe = pending(h);
    const group = new FakeSpace("iMessage;+;chat123456");

    // The provider reports reactions on every message in every chat the line is in.
    await h.controller.handleReaction(group, "❤️", "friends-photo", { handle: OWNER });
    await h.controller.handleText(group, "stats", { handle: OWNER });
    await h.controller.handleText(group, "lol what is this bot", { handle: FRIEND });
    await h.controller.handleText(group, "easy", { handle: FRIEND });
    await h.controller.handleText(group, "pause", { handle: FRIEND });
    await h.controller.handleText(group, "start", { handle: FRIEND });
    await h.controller.handleText(group, "link 1234", { handle: FRIEND });

    expect(group.sent).toHaveLength(0);
    const me = h.store.getUser(WEB_USER)!;
    expect(me.spaceId).toBe(h.space.id);
    expect(me.paused).toBe(false);
    expect(h.store.getPending(WEB_USER)).toEqual(probe);
    expect(h.store.listProgress(WEB_USER)).toEqual([]);
    expect(h.store.listUsers().map((user) => user.id)).toEqual([WEB_USER]);
  });

  it("uses the platform's space type as well as the chat id", async () => {
    setup();
    await linkByText(h);
    const group = new FakeSpace("chat-without-guid-marker", "group");
    await h.controller.handleText(group, "more", { handle: OWNER });
    await h.controller.handleUnsupported(group);
    expect(group.sent).toHaveLength(0);
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
  });

  it("the scheduler never pushes into a group chat bound by older data", async () => {
    setup();
    const { user } = h.store.ensureUserForSpace({ spaceId: "iMessage;+;chat999" }, h.clock.now());
    h.store.gradeCard({ userId: user.id, cardId: "mc-two-sum-hash-map", grade: 3, source: "imessage", now: h.clock.now() - 2 * 86_400_000 });
    const report = await h.controller.tick();
    expect(report.results.find((result) => result.userId === user.id)).toMatchObject({ action: "skipped", reason: "group-chat" });
  });
});

describe("chat binding by handle", () => {
  it("a DM whose other party is not the sender never re-binds the sender's account", async () => {
    setup();
    await linkByText(h);
    const other = new FakeSpace(`iMessage;-;${FRIEND}`);
    await h.controller.handleText(other, "stats", { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
    const placeholder = h.store.findUserBySpace(other.id)!;
    expect(placeholder.id).not.toBe(WEB_USER);
    expect(placeholder.handle).toBeNull();
    expect(other.last.text).toMatch(/^👋 Hey! I'm Synapse/);
  });

  it("the account follows its owner to a new DM with the same handle (e.g. SMS fallback)", async () => {
    setup();
    await linkByText(h);
    const sms = new FakeSpace(`SMS;-;${OWNER}`);
    await h.controller.handleText(sms, "stats", { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(sms.id);
    expect(sms.last.text).toMatch(/^📊 Your Synapse/);
  });

  it("tapbacks resolve by chat only: a reaction from a new DM never re-binds", async () => {
    setup();
    await linkByText(h);
    const sms = new FakeSpace(`SMS;-;${OWNER}`);
    await h.controller.handleReaction(sms, "❤️", "whatever", { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
    expect(sms.sent).toHaveLength(0);
  });
});

describe("code-free linking is owner-only", () => {
  it("a stranger's 'start' neither links the web user nor blocks the owner's own 'start'", async () => {
    setup({ policy: { ownerHandle: OWNER } });
    const stranger = new FakeSpace("iMessage;-;+19995550000");
    await h.controller.handleText(stranger, "hi", { handle: "+19995550000" });
    await h.controller.handleText(stranger, "start", { handle: "+19995550000" });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBeNull();
    expect(stranger.texts[1]).toMatch(/^🧠 You're in!/);

    await h.controller.handleText(h.space, "start", { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
    expect(h.space.texts[0]).toMatch(/^🔗 Linked!/);
    expect(isProbe(h.space.last.text)).toBe(true);
  });

  it("without SYNAPSE_OWNER_HANDLE nobody links by 'start'; the code still works", async () => {
    setup();
    await h.controller.handleText(h.space, "start", { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBeNull();
    const solo = h.store.findUserBySpace(h.space.id)!;
    expect(solo.id).not.toBe(WEB_USER);

    await linkByText(h);
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
  });

  it("linkOwner (startup) says hello and delivers the first card itself, so the first tick has nothing to add", async () => {
    setup({ policy: { ownerHandle: OWNER } });
    const linked = await h.controller.linkOwner(h.space, OWNER);
    expect(linked?.id).toBe(WEB_USER);
    expect(h.space.texts[0]).toBe(ownerHello("http://synapse.test"));
    expect(h.space.texts[0]).not.toContain("Reply 'more'");
    expect(isProbe(h.space.last.text)).toBe(true);
    const probes = h.space.probes.length;

    h.clock.advance(3 * SECOND);
    const report = await h.controller.tick();
    expect(report.results.find((result) => result.userId === WEB_USER)).toMatchObject({ reason: "outstanding" });
    expect(h.space.probes).toHaveLength(probes);
    expect(await h.controller.linkOwner(h.space, OWNER)).toBeNull();
  });
});

describe("link-code brute force", () => {
  it(`locks a chat out after ${MAX_LINK_FAILURES_PER_SENDER} wrong codes, even for the right one, and survives a restart`, async () => {
    setup();
    const code = h.store.createOrGetLinkCode(WEB_USER);
    for (let attempt = 1; attempt <= MAX_LINK_FAILURES_PER_SENDER; attempt++) {
      h.clock.advance(SECOND);
      await h.controller.handleText(h.space, `link ${wrongCode(code, attempt)}`, { handle: OWNER });
      expect(h.space.last.text).toMatch(attempt < MAX_LINK_FAILURES_PER_SENDER ? /^🤔 That code didn't match/ : /^🔒 Too many wrong codes/);
    }
    const sent = h.space.sent.length;

    h.restart();
    h.clock.advance(SECOND);
    await h.controller.handleText(h.space, `link ${h.store.createOrGetLinkCode(WEB_USER)}`, { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBeNull();
    expect(h.space.sent).toHaveLength(sent); // the lockout notice is sent once

    // The same handle from another chat is locked too.
    const other = new FakeSpace(`SMS;-;${OWNER}`);
    await h.controller.handleText(other, `link ${h.store.createOrGetLinkCode(WEB_USER)}`, { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBeNull();
    expect(other.last.text).toMatch(/^🔒 Too many wrong codes/);

    h.clock.advance(61 * MINUTE);
    await h.controller.handleText(h.space, `link ${h.store.createOrGetLinkCode(WEB_USER)}`, { handle: OWNER });
    expect(h.store.getUser(WEB_USER)?.spaceId).toBe(h.space.id);
    expect(h.space.texts).toContainEqual(expect.stringMatching(/^🔗 Linked!/));
  });
});

describe("log hygiene", () => {
  it("masks phone numbers and leaves answers out of the log", async () => {
    setup();
    await linkByText(h);
    await answerCorrectly(h);
    const answer = h.store.getPending(WEB_USER)!.answer!;
    const log = h.logs.join("\n");
    expect(log).toContain("***0101");
    expect(log).not.toContain("3145550101");
    expect(log).not.toContain(answer.slice(0, 30));
  });
});
