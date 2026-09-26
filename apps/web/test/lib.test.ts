import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";
import { formatClock, formatPercent, formatRelative, plural } from "@/lib/format";
import { HttpError, readJson } from "@/lib/server/http";
import { fields } from "@/lib/server/validate";

describe("fields validator", () => {
  it("collects every field error and throws a 400", () => {
    const f = fields({ a: 1, b: "", c: "x".repeat(10), d: 2.5, e: "maybe" });
    f.string("a");
    f.string("b");
    f.string("c", { max: 5 });
    f.number("d", { integer: true });
    f.oneOf("e", ["yes", "no"] as const);
    f.string("missing");
    try {
      f.done();
      throw new Error("expected done() to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const http = error as HttpError;
      expect(http.status).toBe(400);
      expect(http.details).toEqual({
        a: "must be a string",
        b: "must not be empty",
        c: "must be at most 5 characters",
        d: "must be an integer",
        e: "must be one of: yes, no",
        missing: "is required",
      });
    }
  });

  it("returns typed values when valid", () => {
    const f = fields({ id: "  mc-1 ", n: 3, flag: false, empty: "" });
    expect(f.string("id")).toBe("mc-1");
    expect(f.number("n", { min: 1, max: 5 })).toBe(3);
    expect(f.optionalBoolean("flag")).toBe(false);
    expect(f.optionalString("empty", { min: 0 })).toBe("");
    expect(f.optionalString("absent")).toBeUndefined();
    expect(f.optionalOneOf("grade", [1, 3, 5] as const)).toBeUndefined();
    expect(() => f.done()).not.toThrow();
  });
});

describe("readJson", () => {
  const req = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://localhost/x", { method: "POST", body, headers });

  it("rejects non-objects, bad JSON, and oversized bodies", async () => {
    await expect(readJson(req("[1,2]"))).rejects.toMatchObject({ status: 400, code: "invalid_json" });
    await expect(readJson(req("{"))).rejects.toMatchObject({ status: 400, code: "invalid_json" });
    await expect(readJson(req(""))).rejects.toMatchObject({ status: 400, code: "invalid_json" });
    await expect(readJson(req(JSON.stringify({ a: "x".repeat(100) })), 50)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(req('{"ok":true}'))).resolves.toEqual({ ok: true });
  });
});

describe("display helpers", () => {
  it("cn joins truthy classes", () => {
    expect(cn("a", false, null, undefined, ["b", ["c", false]], 0, "d")).toBe("a b c 0 d");
  });

  it("formats percents, clocks, relative times, and plurals", () => {
    expect(formatPercent(0.873)).toBe("87%");
    expect(formatPercent(null)).toBe("—");
    expect(formatClock(83_000)).toBe("1:23");
    const now = 1_000_000_000;
    expect(formatRelative(now + 10_000, now)).toBe("just now");
    expect(formatRelative(now + 3 * 60_000, now)).toBe("in 3 min");
    expect(formatRelative(now - 2 * 3_600_000, now)).toBe("2 hr ago");
    expect(formatRelative(now + 4 * 86_400_000, now)).toBe("in 4 days");
    expect(plural(1, "card")).toBe("1 card");
    expect(plural(3, "card")).toBe("3 cards");
  });
});
