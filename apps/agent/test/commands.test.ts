import { describe, expect, it } from "vitest";
import { normalizeCommandText, parseCommand, textAsTapback } from "../src/commands";

describe("parseCommand", () => {
  it.each([
    ["help", "help"],
    ["HELP!", "help"],
    ["more", "more"],
    ["More please 🙏", "more"],
    ["/next", "more"],
    ["another one", "more"],
    ["skip", "skip"],
    ["hint?", "hint"],
    ["idk", "reveal"],
    ["I don't know.", "reveal"],
    ["no idea", "reveal"],
    ["reveal", "reveal"],
    ["Stats", "stats"],
    ["stop", "pause"],
    ["pause", "pause"],
    ["resume", "resume"],
    ["why?", "why"],
    ["explain", "why"],
    ["start", "start"],
    ["hey", "greeting"],
    ["synapse more", "more"],
  ])("%j → %s", (text, type) => {
    expect(parseCommand(text)?.type).toBe(type);
  });

  it("parses link codes with punctuation", () => {
    expect(parseCommand("link 1234")).toEqual({ type: "link", code: "1234" });
    expect(parseCommand("LINK: 4821.")).toEqual({ type: "link", code: "4821" });
    expect(parseCommand("link #0042")).toEqual({ type: "link", code: "0042" });
    expect(parseCommand("link")).toEqual({ type: "link", code: null });
  });

  it("never mistakes a real answer for a command", () => {
    expect(parseCommand("use a hash map plus a doubly linked list")).toBeUndefined();
    expect(parseCommand("answer: two pointers")).toBeUndefined();
    expect(parseCommand("more than k distinct characters")).toBeUndefined();
    expect(parseCommand("")).toBeUndefined();
    expect(parseCommand("❤️")).toBeUndefined();
  });

  it("normalizes case, apostrophes and punctuation", () => {
    expect(normalizeCommandText("  I Don’t KNOW!!  ")).toBe("i dont know");
    expect(normalizeCommandText("hey synapse, stats")).toBe("stats");
  });
});

describe("textAsTapback", () => {
  it("reads emoji-only texts and relayed tapbacks", () => {
    expect(textAsTapback("❤️")).toBe("love");
    expect(textAsTapback("👍🏽")).toBe("like");
    expect(textAsTapback("👎")).toBe("dislike");
    expect(textAsTapback("?")).toBe("question");
    expect(textAsTapback("!!")).toBe("emphasize");
    expect(textAsTapback("Loved “🧠 Synapse · LRU Cache”")).toBe("love");
  });

  it("ignores texts with words", () => {
    expect(textAsTapback("❤️ hash map")).toBeUndefined();
    expect(textAsTapback("ok")).toBeUndefined();
  });
});
