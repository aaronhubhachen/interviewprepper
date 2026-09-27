import { describe, expect, it } from "vitest";
import { lineDiffStats } from "./DiffReview";

describe("lineDiffStats", () => {
  it("counts added and removed lines", () => {
    expect(lineDiffStats("a\nb\nc", "a\nB\nc\nd")).toEqual({ added: 2, removed: 1 });
  });

  it("ignores trailing whitespace and reports no change for identical code", () => {
    expect(lineDiffStats("x = 1\n", "x = 1")).toEqual({ added: 0, removed: 0 });
  });

  it("treats a rewrite of a starter as mostly additions", () => {
    const starter = "function f(n) {\n  // Your code here\n  return 0;\n}";
    const solved = "function f(n) {\n  let total = 0;\n  for (let i = 0; i < n; i++) total += i;\n  return total;\n}";
    expect(lineDiffStats(starter, solved)).toEqual({ added: 3, removed: 2 });
  });
});
