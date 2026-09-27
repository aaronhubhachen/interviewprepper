import { describe, expect, it } from "vitest";
import { terminal } from "spectrum-ts/providers/terminal";
import { normalizeCommandText, parseCommand, TERMINAL_COMMANDS, textAsTapback } from "../src/commands";

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
    ["prepr", "greeting"],
    ["hey prepr", "greeting"],
    ["start prepr", "start"],
    ["grill", "grill"],
    ["Grill me!", "grill"],
    ["end grill", "endGrill"],
    ["stop grill", "endGrill"],
    ["synapse more", "more"],
  ])("%j → %s", (text, type) => {
    expect(parseCommand(text)?.type).toBe(type);
  });

  it("points web-only features at the web app", () => {
    expect(parseCommand("Blind 75")).toEqual({ type: "web", page: "plans" });
    expect(parseCommand("system design")).toEqual({ type: "web", page: "design" });
    expect(parseCommand("mock interview?")).toEqual({ type: "web", page: "mock" });
    expect(parseCommand("spar")).toEqual({ type: "web", page: "behavioral" });
    expect(parseCommand("use a hash map of value to index")).toBeUndefined();
  });

  it("parses link codes with punctuation", () => {
    expect(parseCommand("link 1234")).toEqual({ type: "link", code: "1234" });
    expect(parseCommand("LINK: 4821.")).toEqual({ type: "link", code: "4821" });
    expect(parseCommand("link #0042")).toEqual({ type: "link", code: "0042" });
    expect(parseCommand("link")).toEqual({ type: "link", code: null });
    expect(parseCommand("link code 4821")).toEqual({ type: "link", code: "4821" });
    expect(parseCommand("link 48 21")).toEqual({ type: "link", code: "4821" });
    expect(parseCommand("link code")).toEqual({ type: "link", code: null });
    expect(parseCommand("link 12345")).toEqual({ type: "link", code: "12345" });
  });

  it("keeps an answer that starts with the word 'link' as an answer", () => {
    expect(parseCommand("Link the smaller head each step")).toBeUndefined();
    expect(parseCommand("link each node to its successor")).toBeUndefined();
    expect(parseCommand("link 2 lists by comparing heads")).toBeUndefined();
  });

  it("only the literal 'start' signs a texter up (everyday texts on a shared line do not)", () => {
    expect(parseCommand("Start!")?.type).toBe("start");
    expect(parseCommand("start synapse")?.type).toBe("start");
    for (const text of ["lets go", "let's go", "begin", "get started", "subscribe", "sign me up"]) {
      expect(parseCommand(text)?.type).not.toBe("start");
    }
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
    expect(normalizeCommandText("hey prepr, stats")).toBe("stats");
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
    expect(textAsTapback("Loved “🧠 Prepr · LRU Cache”")).toBe("love");
  });

  it("ignores texts with words", () => {
    expect(textAsTapback("❤️ hash map")).toBeUndefined();
    expect(textAsTapback("ok")).toBeUndefined();
  });
});

describe("TERMINAL_COMMANDS", () => {
  it("passes the terminal provider's real config schema (names must start with '/')", () => {
    const provider = terminal.config({ commands: TERMINAL_COMMANDS.map((command) => ({ ...command })) });
    const definition = provider.__definition as unknown as { config: { parse: (input: unknown) => unknown } };
    expect(() => definition.config.parse(provider.config)).not.toThrow();
    const slashless = terminal.config({ commands: [{ name: "more" }] });
    expect(() => definition.config.parse(slashless.config)).toThrow(/must start with \//);
  });

  it("every autocomplete entry parses back to a command", () => {
    for (const command of TERMINAL_COMMANDS) expect(parseCommand(command.name)).toBeDefined();
  });
});
