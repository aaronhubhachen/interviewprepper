import { describe, expect, it } from "vitest";
import { humanizeTag, plural, spokenDurationMs, statementBlocks, wordCount } from "../format";
import { replyParts } from "../replyParts";
import { normalizeServerUrl, serverUrlFromHostUri } from "../url";

describe("server address", () => {
  it("derives the web server from Expo's host and the Next.js port", () => {
    expect(serverUrlFromHostUri("192.168.1.20:8081")).toBe("http://192.168.1.20:3000");
    expect(serverUrlFromHostUri(undefined)).toBe("http://localhost:3000");
  });

  it("normalizes typed addresses", () => {
    expect(normalizeServerUrl(" 10.0.0.5:3000/ ")).toBe("http://10.0.0.5:3000");
    expect(normalizeServerUrl("https://prepr.example.com//")).toBe("https://prepr.example.com");
    expect(normalizeServerUrl("   ")).toBe("");
  });
});

describe("format", () => {
  it("labels tags", () => {
    expect(humanizeTag("tree_traversal")).toBe("Trees");
    expect(humanizeTag("union_find")).toBe("Union find");
  });

  it("counts words and estimates spoken time within the API's range", () => {
    expect(wordCount("  one two   three ")).toBe(3);
    expect(spokenDurationMs("")).toBe(1_000);
    expect(spokenDurationMs("word ".repeat(150))).toBe(60_000);
    expect(spokenDurationMs("word ".repeat(100_000))).toBe(30 * 60_000);
    expect(plural(1, "card")).toBe("1 card");
    expect(plural(2, "card")).toBe("2 cards");
  });

  it("splits a markdown statement into paragraphs, bullets, and code", () => {
    const blocks = statementBlocks("Given **nums**, return `x`.\n\n- first\n- second\n\n```\ncode here\n```");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Given nums, return x." },
      { kind: "list", items: ["first", "second"] },
      { kind: "code", text: "code here\n" },
    ]);
  });
});

describe("replyParts", () => {
  it("separates prose from fenced code and strips inline markdown", () => {
    expect(replyParts("Use a **hash map**:\n```python\nseen = {}\n```\nThen `return`.")).toEqual([
      { kind: "text", text: "Use a hash map:" },
      { kind: "code", text: "seen = {}" },
      { kind: "text", text: "Then return." },
    ]);
  });
});
