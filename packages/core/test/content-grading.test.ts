/**
 * Regression cases for key-point phrasing: the heuristic grader (used whenever the LLM is unavailable) must not
 * credit a wrong answer as correct, and must not reject a natural correct one. The grader reads operators ("n + 1" is
 * not "n - 1"), parenthesised groups and simple negation; these pin both the grader and the content phrasing.
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
    "Skip stale entries where d > dist[u], relax the edges, and the total is O((E + V) log V).",
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

  it("tells nums[i-1] from the classic wrong nums[i+1]", () => {
    expect(missed(edgeCase, "Compare nums[i] == nums[i+1] and continue.")).toContain("Skip a repeated anchor i");
    expect(missed(edgeCase, "Compare nums[i] == nums[i-1] and continue.")).not.toContain("Skip a repeated anchor i");
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

  it("tells n + 1 from n - 1 however it is written", () => {
    const label = "Frequency can reach n, so n + 1 buckets";
    for (const bucketCount of ["n+1", "n + 1", "n plus 1"]) expect(missed(edgeCase, `Allocate ${bucketCount} buckets.`)).not.toContain(label);
    for (const bucketCount of ["n-1", "n - 1", "n minus 1"]) expect(missed(edgeCase, `Allocate ${bucketCount} buckets.`)).toContain(label);
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

describe("keyword stuffing and paraphrase gaps", () => {
  it.each([
    ["mc-lru-cache-o1", "map dll pop"],
    ["mc-validate-bst-bounds", "subtree sorted"],
    ["mc-dijkstra-negative-edges", "final bellman"],
    ["mc-palindrome-expand-center", "2n odd n^2"],
  ])("%s does not grade generic single words as correct: %s", (id, answer) => {
    expect(grade(micro(id), answer)).not.toBe("correct");
  });

  it("gives a shared 'still valid' guard to one spiral bound only", () => {
    const card = micro("mc-spiral-matrix-bounds");
    expect(grade(card, "Only walk the bottom row and the left column while the bounds are still valid.")).toBe("partial");
    expect(grade(card, "Walk the bottom row only if top <= bottom, and the left column only if left <= right.")).toBe("correct");
  });

  it("does not credit the classic wrong 2n center count", () => {
    const card = micro("mc-palindrome-expand-center");
    expect(missed(card, "Try 2n centers, one per char and gap, O(n^2) time and O(1) space.")).toContain("2n - 1 centers");
    expect(grade(card, "n centers for odd lengths plus n - 1 gaps for even ones, so O(n^2) time and O(1) space.")).toBe("correct");
  });

  it.each([
    ["mc-lru-cache-o1", "A hash map from key to node plus a doubly linked list by recency; drop the least recently used node from the back."],
    ["mc-lru-cache-o1", "Map keys to nodes in a doubly linked list, move a node to the front on access, and pop the tail when full."],
    ["mc-single-number-xor", "XOR everything together: pairs cancel out, and XOR is order independent, so only the single number is left."],
    ["mc-dijkstra-negative-edges", "Dijkstra treats a node as optimal once popped, but a negative edge found later could make it cheaper; use Bellman-Ford."],
    ["mc-dijkstra-negative-edges", "Once a node is popped its distance is final, which assumes weights never go below zero; use Bellman-Ford instead."],
    ["mc-validate-bst-bounds", "Every node in the right subtree must beat the root, not just its parent, so pass down low/high bounds."],
    ["mc-dijkstra-negative-edges", "Dijkstra assumes edges can't make paths shorter, so once a node is popped it's settled; use Bellman-Ford."],
  ])("%s credits a natural paraphrase: %s", (id, answer) => {
    expect(grade(micro(id), answer)).toBe("correct");
  });

  it("gives mc-next-greater-circular's pop point to 'popped by' but not to a bare 'pop'", () => {
    const card = micro("mc-next-greater-circular");
    expect(grade(card, "Decreasing stack; an index gets its answer when it's popped by a larger value; loop 2n times with i % n.")).toBe("correct");
    expect(grade(card, "2n decreasing pop")).not.toBe("correct");
  });

  it("credits 2 * n - 1 centers without reopening the 2n count", () => {
    const card = micro("mc-palindrome-expand-center");
    expect(grade(card, "Try 2*n - 1 centers since palindromes are odd or even length; O(n^2) time, O(1) space.")).toBe("correct");
    expect(grade(card, "Try 2 * n - 1 centers since palindromes are odd or even length; O(n^2) time, O(1) space.")).toBe("correct");
    expect(missed(card, "Try 2 * n centers, one per char and gap, O(n^2) time and O(1) space.")).toContain("2n - 1 centers");
  });
});

describe("mc-binary-search-lower-bound", () => {
  const card = micro("mc-binary-search-lower-bound");
  const hiMid = "Otherwise hi = mid, keeping mid in range (not mid - 1)";

  it("does not credit the wrong updates", () => {
    expect(
      grade(
        card,
        "Everything before lo is less than target and everything at or after hi is at least target; if nums[mid] < target set lo = mid, else hi = mid - 1, and return lo when lo == hi.",
      ),
    ).not.toBe("correct");
    for (const answer of [
      "Everything before lo is less than target and everything at or after hi is at least target; if nums[mid] < target set lo = mid + 1, else hi = mid - 1.",
      "Before lo is < target and at or after hi is >= target; lo = mid + 1, otherwise set r = mid - 1.",
      // "r = mid" written bare would match "lower mid" (compact "rmid").
      "Before lo is < target and at or after hi is >= target; lo = mid + 1, else hi = mid - 1, using the lower mid.",
      "Before lo is < target and at or after hi is >= target; lo = mid + 1, else hi = mid + 1.",
    ]) {
      expect(missed(card, answer), answer).toContain(hiMid);
    }
  });

  it.each([
    "Invariant: nums[i] < target for i < lo, nums[i] >= target for i >= hi. If nums[mid] < target, lo = mid + 1, else hi = mid.",
    "Everything before lo is less than target, everything at or after hi is at least target. If nums[mid] < target set lo = mid + 1 else hi = mid.",
    "Left of lo is < target and from hi onward is >= target; lo = mid + 1 when nums[mid] < target, otherwise hi = mid.",
    "Before lo is < target, at or after hi is >= target. lo = mid + 1 if nums[mid] < target else r = mid.",
  ])("credits a complete answer that ends with hi = mid: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
    expect(missed(card, answer)).not.toContain(hiMid);
  });
});

describe("mc-tree-dfs-orders", () => {
  const card = micro("mc-tree-dfs-orders");

  it.each(["(a) inorder, (b) postorder, (c) preorder.", "(a) postorder, (b) preorder, (c) inorder.", "1) inorder 2) postorder 3) preorder"])(
    "does not credit a shuffled mapping: %s",
    (answer) => {
      expect(grade(card, answer)).not.toBe("correct");
    },
  );

  it.each([
    "(a) preorder, (b) inorder, (c) postorder.",
    "1) preorder 2) inorder 3) postorder",
    "Serialize with preorder, read sorted values with inorder, and compute heights with postorder.",
  ])("credits a labeled or job-bound mapping: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });

  it("gives an unlabeled list in prompt order partial credit, not incorrect", () => {
    expect(grade(card, "Preorder, inorder, postorder.")).toBe("partial");
    expect(grade(card, card.prompt)).toBe("incorrect");
  });
});

describe("mc-quickselect-kth-largest", () => {
  const card = micro("mc-quickselect-kth-largest");
  const average = "Quickselect: average O(n)";

  it.each([
    "Heap is O(n log k); quickselect is O(n) average and O(n^2) worst case, avoided by picking a random pivot.",
    "Heap is O(n log k); quickselect is average O(n) but O(n^2) worst case, avoided by a random pivot.",
    "Heap is O(n log k); quickselect is expected O(n) and O(n^2) worst, fixed by a random pivot.",
    "Heap is O(n log k); quickselect is O(n) avg, O(n^2) worst; random pivot.",
  ])("credits every point of a correct answer: %s", (answer) => {
    expect(missed(card, answer)).toEqual([]);
  });

  it.each([
    "A min heap of size k is O(n log k); quickselect is O(n log n) on average and O(n^2) in the worst case, which a random pivot avoids.",
    "Heap O(n log k); quickselect average O(n log n) and O(n^2) worst, random pivot.",
    "Heap O(n log k); quickselect expected O(n log n) and O(n^2) worst, random pivot.",
  ])("names the wrong average as the gap: %s", (answer) => {
    expect(missed(card, answer)).toContain(average);
  });
});

describe("mc-kahn-cycle-detection", () => {
  const card = micro("mc-kahn-cycle-detection");

  it.each([
    "Compute in-degrees and push the in-degree 0 courses into a queue, decrement neighbors as you pop; if there is a cycle then it's impossible.",
    "Compute each node's in-degree, queue the in-degree 0 ones and decrement neighbors; if there is a cycle you never reach the end, so it is impossible.",
  ])("does not credit an answer that never says how the cycle is detected: %s", (answer) => {
    expect(grade(card, answer)).not.toBe("correct");
  });

  it.each([
    "BFS from the zero in-degree nodes, decrementing neighbors; if the topological order doesn't include all nodes, there's a cycle.",
    "Queue the courses with in-degree 0 and decrement neighbors as you pop; if not every course gets processed, it's impossible.",
    "Queue in-degree 0 courses, decrement neighbors; if the count of popped nodes != numCourses it's impossible.",
    "Queue in-degree 0 nodes and decrement; some courses never reach in-degree 0, so it's impossible.",
  ])("credits a count-based detection: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("mc-fast-power", () => {
  const card = micro("mc-fast-power");

  it.each([
    "Square the base and divide the exponent, n / 2, each step; for negative n take 1/x.",
    // "res *= x" / "ans *= x" written with symbols would match "squares x" / "means x" through the compact form.
    "It squares x and halves n each step; for negative n take 1/x.",
    "Square the base and halve n each time, which means x^n takes log n steps; negative n: 1/x.",
  ])("does not credit halving without the odd-step multiply: %s", (answer) => {
    expect(grade(card, answer)).not.toBe("correct");
  });

  it.each([
    "If n % 2 == 1 multiply ans by x, then x *= x and n //= 2; for negative n invert x and negate n, using a long to avoid overflow.",
    "while n: if n & 1: res *= x; x *= x; n >>= 1. For negative n use 1/x and a long.",
    "If n is odd, ans = ans * x; then x = x * x and n = n // 2. Negative n: use 1/x and a long.",
    "Square x and halve n; if the low bit is set multiply res by x. Negative n: 1/x, careful of overflow.",
  ])("credits a code-style odd step: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("mc-knapsack-01-reverse-loop", () => {
  const card = micro("mc-knapsack-01-reverse-loop");

  it("does not credit the reversed directions", () => {
    const answer =
      "Looping upward keeps the previous item's old values so each item is used once; looping downward lets you reuse items, the unbounded knapsack.";
    expect(grade(card, answer)).not.toBe("correct");
  });

  it.each([
    "Looping from W down means dp[w - wt] is still the previous item's value so each item is used at most once; looping up lets you reuse the same item, which is the unbounded knapsack.",
    "Going down reads values from before item i so each item is picked at most once; iterating forward would let an item be reused, the unbounded knapsack.",
  ])("credits a correct answer: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("mc-knapsack-combinations-vs-permutations", () => {
  const card = micro("mc-knapsack-combinations-vs-permutations");

  it.each([
    "Coins in the outer loop counts permutations because order matters and 2 + 1 differs from 1 + 2; amounts outer counts combinations in a fixed coin order.",
    "Amounts outer gives combinations since coins are used in a fixed order; coins outer counts permutations since 1 + 2 and 2 + 1 are different orders.",
  ])("does not credit swapped loop orders: %s", (answer) => {
    expect(grade(card, answer)).not.toBe("correct");
  });

  it.each([
    "Coins in the outer loop means each coin is processed once in a fixed order so 1+2 and 2+1 are the same combination; amounts outer lets any coin be last at each amount, so different orders count separately as permutations.",
    "With coins outside, coins are added in a fixed order, so 1 + 2 and 2 + 1 are counted once; with amounts outside, every coin is tried at each amount, so each ordering is counted: permutations.",
  ])("credits a correct mechanism: %s", (answer) => {
    expect(grade(card, answer)).toBe("correct");
  });
});

describe("mc-two-pointers-sorted-two-sum", () => {
  const card = micro("mc-two-pointers-sorted-two-sum");

  it("credits the 'can't be in any pair' argument", () => {
    const answer =
      "Move the left pointer right; since the left number plus the largest number is still too small, the left number can't be in any valid pair.";
    expect(grade(card, answer)).toBe("correct");
  });

  it("does not credit restating that the sum is too small", () => {
    expect(grade(card, "Move the left pointer right because the sum is still too small.")).not.toBe("correct");
  });
});
