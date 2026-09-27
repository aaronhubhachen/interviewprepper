/**
 * Regression cases for key-point phrasing: the heuristic grader (used whenever the LLM is unavailable) must not
 * credit a wrong answer as correct, and must not reject a natural correct one. The grader drops operators and
 * ignores negation, so these pin the content-side workarounds.
 */
import { describe, expect, it } from "vitest";
import { getMicroCard, getProblem, type KeyPoint } from "../src/content";
import { heuristicEvaluation, type Verdict } from "../src/grading";

interface Gradable {
  prompt: string;
  answerKey: string;
  keyPoints: KeyPoint[];
}

function micro(id: string): Gradable {
  const card = getMicroCard(id);
  if (!card) throw new Error(`missing micro-card ${id}`);
  return card;
}

function stage(problemId: string, which: "invariant" | "edgeCase"): Gradable {
  const problem = getProblem(problemId);
  if (!problem) throw new Error(`missing problem ${problemId}`);
  return problem.stages[which];
}

function grade(item: Gradable, answer: string): Verdict {
  return heuristicEvaluation({ question: item.prompt, answerKey: item.answerKey, keyPoints: item.keyPoints, answer }).verdict;
}

function missed(item: Gradable, answer: string): string[] {
  return heuristicEvaluation({ question: item.prompt, answerKey: item.answerKey, keyPoints: item.keyPoints, answer }).missed;
}

describe("mc-bfs-unweighted-shortest-path", () => {
  const card = micro("mc-bfs-unweighted-shortest-path");

  it.each([
    "BFS goes level by level so the first time you reach a node is the shortest; mark it visited when you dequeue it, not when you enqueue it.",
    "BFS goes level by level so the first time you reach a node is the shortest; mark it visited when you pop it, not when you push it.",
    "BFS goes level by level so the first time you reach a node is the shortest; mark visited when you dequeue rather than when you add it to the queue.",
  ])("does not credit the opposite choice: %s", (answer) => {
    expect(grade(card, answer)).not.toBe("correct");
  });

  it("gives no timing credit for echoing the prompt", () => {
    expect(missed(card, card.prompt)).toContain("Mark visited on enqueue");
  });

  it.each([
    "BFS explores level by level, so the first time you reach a node uses the fewest edges. Mark it visited when you enqueue it.",
    "It goes in layers of increasing distance so the first visit is shortest; mark on enqueue so a node is never enqueued twice.",
    "Level by level, so the first time you see a node is the shortest path. Mark nodes visited when you push them onto the queue.",
    "BFS visits in distance order, so first discovery is optimal; mark it when discovered, otherwise a node sits in the queue many times.",
  ])("credits a correct answer: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("mc-dijkstra-lazy-heap", () => {
  const card = micro("mc-dijkstra-lazy-heap");

  it("does not accept the Fibonacci-heap bound O(E + V log V)", () => {
    const answer = "Skip stale entries where d > dist[u], relax the edges, and the total is O(E + V log V).";
    expect(missed(card, answer)).toContain("O((V + E) log V)");
    expect(grade(card, answer)).not.toBe("correct");
  });

  it.each([
    "Skip stale entries where d > dist[u], relax the edges, and the total is O(E log V).",
    "Skip stale entries where d > dist[u], relax the edges, and the total is O((V + E) log V).",
  ])("credits the binary-heap bound: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("mc-backtracking-n-queens-pruning", () => {
  const card = micro("mc-backtracking-n-queens-pruning");

  it.each([
    "Keep a set of used columns and a set of r + c anti-diagonals; remove them when you backtrack.",
    "Sets for cols and row + col; undo on backtrack.",
    "Keep a set of used columns and a set of r - c diagonals; remove them when you backtrack.",
  ])("does not credit an answer that checks only one diagonal: %s", (answer) => {
    expect(grade(card, answer)).not.toBe("correct");
  });

  it.each([
    "Keep sets of used columns, r - c, and r + c; add them before recursing and remove them when you backtrack.",
    "Three sets: cols, r-c, r+c. Undo them on backtrack.",
    "Track columns plus diagonals (r - c) and anti-diagonals (r + c) in sets, and remove the marks when you backtrack.",
    "Use a column set and two diagonal sets keyed by row minus col and row plus col; unmark on backtrack.",
  ])("credits an answer that checks both diagonals: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("p-partition-k-equal-sum-subsets", () => {
  const invariant = stage("p-partition-k-equal-sum-subsets", "invariant");

  it.each([
    "dp[mask] is true if the elements in mask sum to a multiple of target. For each unused i, dp[mask | (1 << i)] |= dp[mask]. O(n * 2^n).",
    "subset sum divisible by target; set the bit for any unused element; O(2^n)",
  ])("does not credit a DP with no capacity check: %s", (answer) => {
    expect(grade(invariant, answer)).not.toBe("correct");
  });

  it.each([
    "dp[mask] holds the remainder of the chosen sum mod target; add i if it's unused and nums[i] <= target - dp[mask], setting mask | (1 << i). O(n * 2^n).",
    "dp[mask] is the current bucket fill; add nums[i] only if it fits, then set the bit for i. O(n * 2^n).",
    "dp[mask] is the running sum mod target; add i when it stays within the target and set the bit; n * 2^n total.",
  ])("credits a correct answer: %s", (answer) => {
    expect(grade(invariant, answer)).toBe("correct");
  });

  it("keeps every visible test inside the stated 1-4 copies per value constraint", () => {
    const tests = getProblem("p-partition-k-equal-sum-subsets")?.stages.code.tests ?? [];
    expect(tests.length).toBeGreaterThan(0);
    for (const test of tests) {
      const nums = test.args[0] as number[];
      const counts = new Map<number, number>();
      for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
      expect(Math.max(...counts.values()), `nums = ${JSON.stringify(nums)}`).toBeLessThanOrEqual(4);
    }
  });
});

describe("p-search-rotated-sorted-array invariant", () => {
  const invariant = stage("p-search-rotated-sorted-array", "invariant");

  it.each([
    "One half is always sorted; compare nums[lo] <= nums[mid]; then always search the other half.",
    "One half is always sorted; compare nums[lo] <= nums[mid]; if target > nums[mid] go right, otherwise go left.",
    "One half is always sorted; compare nums[lo] <= nums[mid]; if nums[mid] == target return mid, else search the other half.",
  ])("does not credit an answer without a range test: %s", (answer) => {
    expect(grade(invariant, answer)).not.toBe("correct");
  });

  it.each([
    "One half is always sorted: if nums[lo] <= nums[mid] the left is sorted; if nums[lo] <= target < nums[mid] go left, otherwise go right.",
    "One half is always sorted; compare nums[lo] <= nums[mid] to find it; if target lies in its range search it, else search the other half.",
  ])("credits a correct answer: %s", (answer) => {
    expect(grade(invariant, answer)).toBe("correct");
  });
});

describe("p-3sum", () => {
  const invariant = stage("p-3sum", "invariant");
  const edgeCase = stage("p-3sum", "edgeCase");

  it.each([
    "lo starts at i+1 and hi at the end. If the sum is too small move lo right, if too big move hi left, otherwise record it and move both; each move drops a value that can't work, so O(n^2).",
    "If the sum is too small move lo right, if too big move hi left. Because it's sorted, the value you move past can never form a valid triplet with the other pointer. O(n^2)",
  ])("credits a complete invariant answer without restating the sort: %s", (answer) => {
    expect(grade(invariant, answer)).toBe("correct");
  });

  it("credits l/r shorthand in the edge case", () => {
    const answer =
      "Skip i if nums[i] == nums[i-1]; after a match do l++ while nums[l] == nums[l-1] and r-- while nums[r] == nums[r+1]. Sorted means equal values are adjacent.";
    expect(grade(edgeCase, answer)).toBe("correct");
  });
});

describe("p-course-schedule", () => {
  const invariant = stage("p-course-schedule", "invariant");
  const edgeCase = stage("p-course-schedule", "edgeCase");

  it.each([
    "Queue starts with every course that has indegree 0. When you pop a course, decrement its neighbors and enqueue any that reach 0. At the end, if you popped all n courses there's no cycle.",
    "Start with all courses whose indegree is 0; pop one, decrement each neighbor and enqueue it when it hits 0; if the processed count equals numCourses there's no cycle, O(V + E).",
  ])("credits a correct invariant answer: %s", (answer) => {
    expect(grade(invariant, answer)).toBe("correct");
  });

  it.each([
    "No prereqs means true. [[0,0]] is a self loop but a course can't really block itself so it's still true. You need to run DFS from every course because the graph can be disconnected.",
    "No prereqs returns false and the self loop returns true. You need to run DFS from every course because the graph can be disconnected.",
    "With no prerequisites there's no cycle, so false. You need to run DFS from every course because the graph can be disconnected.",
  ])("does not credit a wrong edge-case answer: %s", (answer) => {
    expect(grade(edgeCase, answer)).not.toBe("correct");
  });

  it.each([
    "It's true when there are no prerequisites. [[0,0]] is a self-loop, a cycle, so false. Start DFS from every course since the graph can be disconnected.",
    "No prerequisites means true; a course that requires itself is a cycle, so it's false; the graph may be disconnected, so start from each course.",
  ])("credits a correct edge-case answer: %s", (answer) => {
    expect(grade(edgeCase, answer)).toBe("correct");
  });
});

describe("p-top-k-frequent-elements edge case", () => {
  const edgeCase = stage("p-top-k-frequent-elements", "edgeCase");

  it("does not credit the off-by-one bucket count", () => {
    const answer = "Allocate n - 1 buckets. Values can be negative so count them in a hash map.";
    expect(grade(edgeCase, answer)).not.toBe("correct");
  });

  it("credits n + 1 buckets with the reason", () => {
    const answer = "n + 1 buckets, because a frequency can be n when every value is the same; values can be negative, so count in a hash map.";
    expect(grade(edgeCase, answer)).toBe("correct");
  });
});

describe("p-trapping-rain-water edge case", () => {
  const edgeCase = stage("p-trapping-rain-water", "edgeCase");

  it("does not credit a lone 'nothing' from one sub-case", () => {
    const answer =
      "[5,4,3,2,1] traps 10 units and [3,3,3] traps 3 since each bar has neighbors on both sides; fewer than 3 bars traps nothing.";
    expect(grade(edgeCase, answer)).not.toBe("correct");
  });

  it.each([
    "Zero in every case: water needs a taller wall on both sides, and edge bars have no wall on one side.",
    "They trap 0 water; a descending, flat, or tiny array has no bar with a taller wall on both sides.",
  ])("credits a correct answer: %s", (answer) => {
    expect(grade(edgeCase, answer)).toBe("correct");
  });
});

describe("p-house-robber edge case", () => {
  const edgeCase = stage("p-house-robber", "edgeCase");

  it("does not credit a mention of the 4 houses", () => {
    const answer = "It doesn't fail: both alternating sums are 3 and with 4 houses you can't beat that. One house: return nums[0].";
    expect(grade(edgeCase, answer)).not.toBe("correct");
  });

  it("credits the real optimum", () => {
    expect(grade(edgeCase, "Robbing houses 0 and 3 gives 4, which alternating misses. One house: return nums[0].")).toBe("correct");
  });
});

describe("p-number-of-islands edge case", () => {
  const edgeCase = stage("p-number-of-islands", "edgeCase");

  it.each([
    "A recursive DFS can overflow the stack, so use BFS. Diagonal 1s count as adjacent so that grid is one island.",
    "A recursive DFS can overflow the stack, so use BFS. Diagonal 1s count as adjacent so that grid is one island, not 2 islands.",
  ])("does not credit the wrong adjacency rule: %s", (answer) => {
    expect(grade(edgeCase, answer)).not.toBe("correct");
  });

  it.each([
    "A 90,000-deep recursion overflows the stack, so use BFS with a queue. Diagonals don't connect, so it's 2 islands.",
    "Recursion depth hits the limit, so use an explicit stack. No, 2 islands: only up, down, left and right count.",
  ])("credits a correct answer: %s", (answer) => {
    expect(grade(edgeCase, answer)).toBe("correct");
  });
});

describe("p-merge-intervals edge case and p-longest-substring-without-repeating invariant", () => {
  it("credits 'turn [1,10] into [1,3]' for the nested-interval point", () => {
    const answer = "last end = next end would turn [1,10] into [1,3], so [4,5] gets split off; use max. Touching intervals merge since start <= end.";
    expect(grade(stage("p-merge-intervals", "edgeCase"), answer)).toBe("correct");
  });

  it("credits 'appears once' for the window invariant", () => {
    const answer =
      "Every char in the window appears once. Track last positions in a hash map and jump left past the previous occurrence.";
    expect(grade(stage("p-longest-substring-without-repeating", "invariant"), answer)).toBe("correct");
  });
});
