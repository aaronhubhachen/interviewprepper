import type { NativeLanguage } from "../judge/native";
import type { Problem } from "./types";

/** Blind 75 batch E. */
export const PROBLEMS_E: Problem[] = [
  {
    id: "p-climbing-stairs",
    title: "Climbing Stairs",
    leetcodeSlug: "climbing-stairs",
    difficulty: "easy",
    tags: ["dp_1d", "math"],
    statement: `You are climbing a staircase that takes \`n\` steps to reach the top. Each time you can climb either **1 or 2 steps**.

Return the number of distinct ways to climb to the top.`,
    examples: [
      { input: "n = 2", output: "2", explanation: "1 + 1, or 2." },
      { input: "n = 3", output: "3", explanation: "1 + 1 + 1, 1 + 2, or 2 + 1." },
    ],
    constraints: ["1 <= n <= 45"],
    stages: {
      invariant: {
        prompt:
          "🪜 Climbing Stairs: write the recurrence for ways(i), explain why it holds, and say how much memory you need. Reply in 1-2 sentences.",
        answerKey:
          "ways(i) = ways(i-1) + ways(i-2), because the last move onto step i is either a 1-step from i-1 or a 2-step from i-2, and those groups never overlap. It is Fibonacci, so keep only the last two values: O(n) time and O(1) space.",
        keyPoints: [
          {
            label: "ways(i) = ways(i-1) + ways(i-2)",
            anyOf: ["ways(i-1) + ways(i-2)", "dp[i-1] + dp[i-2]", "f(n-1) + f(n-2)", "i-1 and i-2", "fibonacci", "sum of the previous two"],
          },
          {
            label: "The last move is a 1-step or a 2-step",
            anyOf: ["last move", "last step", "final step", "1-step", "one step or two", "1 or 2 steps", "from i-1 or i-2"],
          },
          {
            label: "O(1) space with two variables",
            anyOf: ["o(1) space", "o(1)", "last two values", "two variables", "2 variables", "rolling", "constant space"],
          },
        ],
        hint: "Think about the very last move you make onto step i. Where could you have been standing just before it?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: n = 45. Why does plain recursion ways(n-1) + ways(n-2) time out, and what base cases make n = 1 and n = 2 come out right? Reply in 1-2 sentences.",
        answerKey:
          "Plain recursion recomputes the same subproblems, so the call tree is exponential (about 1.6^n calls); memoize or iterate bottom-up so each step is computed once. Use ways(0) = 1 and ways(1) = 1 (so ways(2) = 2), which makes n = 1 return 1 without indexing past the array.",
        keyPoints: [
          {
            label: "Naive recursion is exponential because it recomputes subproblems",
            anyOf: ["exponential", "recomputes", "overlapping subproblems", "same subproblems", "1.6^n", "2^n"],
          },
          {
            label: "Memoize or iterate bottom-up",
            anyOf: ["memoize", "memo", "bottom-up", "bottom up", "iterate", "cache"],
          },
          {
            label: "Base cases ways(0) = ways(1) = 1",
            anyOf: ["ways(0) = 1", "ways(1) = 1", "dp[0] = 1", "dp[1] = 1", "base case", "n = 1 return 1"],
          },
        ],
        hint: "Draw the call tree for ways(5). How many times does ways(2) appear?",
      },
      code: {
        functionName: "climbStairs",
        params: ["n"],
        signature: { params: ["int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  // Your code here
  return 0;
}
`,
          python: `def climbStairs(n: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function climbStairs(n) {
  let prev = 1; // ways to reach step i-2
  let curr = 1; // ways to reach step i-1
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}
`,
          python: `def climbStairs(n: int) -> int:
    prev, curr = 1, 1  # ways to reach step i-2, step i-1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr
`,
        },
        tests: [
          { args: [1], expected: 1 },
          { args: [2], expected: 2 },
          { args: [3], expected: 3 },
          { args: [5], expected: 8 },
          { args: [10], expected: 89 },
          { args: [20], expected: 10946, hidden: true },
          { args: [38], expected: 63245986, hidden: true },
          { args: [45], expected: 1836311903, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d"],
    relatedCardIds: ["mc-climbing-stairs-recurrence", "mc-dp-house-robber"],
  },
  {
    id: "p-longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    leetcodeSlug: "longest-increasing-subsequence",
    difficulty: "medium",
    tags: ["dp_1d", "binary_search"],
    statement: `Given an integer array \`nums\`, return the length of the longest **strictly increasing** subsequence.

A subsequence keeps the original order but may skip elements.

Aim for \`O(n log n)\`.`,
    examples: [
      {
        input: "nums = [10,9,2,5,3,7,101,18]",
        output: "4",
        explanation: "One longest increasing subsequence is [2,3,7,101].",
      },
      { input: "nums = [0,1,0,3,2,3]", output: "4" },
      { input: "nums = [7,7,7,7,7,7,7]", output: "1" },
    ],
    constraints: ["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "📈 LIS: in the O(n log n) patience approach, what does tails[k] store, and what do you do with each new number? Reply in 1-2 sentences.",
        answerKey:
          "tails[k] is the smallest possible tail of any increasing subsequence of length k+1, so tails stays sorted. For each x, binary search for the first tail >= x and replace it, or append x if it is larger than every tail; the answer is the length of tails.",
        keyPoints: [
          {
            label: "tails[k] = smallest tail of an increasing subsequence of length k+1",
            anyOf: ["smallest possible tail", "smallest tail", "minimum tail", "smallest ending value", "smallest last element"],
          },
          {
            label: "Binary search for the first tail >= x and replace it",
            anyOf: ["binary search", "lower bound", "lower_bound", "bisect_left", "first tail >= x"],
          },
          {
            label: "Append when x beats every tail; answer is the length",
            anyOf: ["append", "length of tails", "tails.length", "len(tails)", "extend"],
          },
        ],
        hint: "Among all increasing subsequences of the same length, which one is most useful to keep extending later?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [7,7,7,7]. The answer is 1. Which binary search detail keeps duplicates from growing the LIS, and is tails itself a valid subsequence? Reply in 1-2 sentences.",
        answerKey:
          "Search for the first tail >= x (lower bound, bisect_left), not > x, so an equal value replaces its twin instead of being appended; that enforces strictly increasing. tails is not necessarily a real subsequence of nums, only its length is meaningful.",
        keyPoints: [
          {
            label: "Use lower bound (>= x), not upper bound",
            anyOf: ["lower bound", "bisect_left", ">= x", "first tail >= x", "not > x", "not upper bound"],
          },
          {
            label: "Equal values replace instead of append (strictly increasing)",
            anyOf: ["replaces", "replace", "strictly increasing", "instead of being appended", "not appended"],
          },
          {
            label: "tails is not an actual subsequence; only its length counts",
            anyOf: ["not necessarily a real subsequence", "not a real subsequence", "only its length", "length is meaningful", "not the actual subsequence"],
          },
        ],
        hint: "Run bisect_left and bisect_right by hand on tails = [7] with x = 7. Which one appends?",
      },
      code: {
        functionName: "lengthOfLIS",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function lengthOfLIS(nums) {
  // Your code here
  return 0;
}
`,
          python: `def lengthOfLIS(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function lengthOfLIS(nums) {
  const tails = []; // tails[k] = smallest tail of an increasing run of length k + 1
  for (const x of nums) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x; // replaces the first tail >= x, or appends
  }
  return tails.length;
}
`,
          python: `from bisect import bisect_left
from typing import List


def lengthOfLIS(nums: List[int]) -> int:
    tails: List[int] = []  # tails[k] = smallest tail of an increasing run of length k + 1
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
`,
        },
        tests: [
          { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
          { args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
          { args: [[7, 7, 7, 7, 7, 7, 7]], expected: 1 },
          { args: [[5]], expected: 1 },
          { args: [[1, 2, 3, 4, 5]], expected: 5 },
          { args: [[-2, -1]], expected: 2 },
          { args: [[5, 4, 3, 2, 1]], expected: 1, hidden: true },
          { args: [[4, 10, 4, 3, 8, 9]], expected: 3, hidden: true },
          { args: [[3, 5, 6, 2, 5, 4, 19, 5, 6, 7, 12]], expected: 6, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d", "binary_search"],
    relatedCardIds: ["mc-dp-lis-patience", "mc-binary-search-lower-bound"],
  },
  {
    id: "p-longest-common-subsequence",
    title: "Longest Common Subsequence",
    leetcodeSlug: "longest-common-subsequence",
    difficulty: "medium",
    tags: ["dp_2d", "string"],
    statement: `Given two strings \`text1\` and \`text2\`, return the length of their longest **common subsequence**, or \`0\` if there is none.

A subsequence keeps the original order but may delete characters (for example, \`"ace"\` is a subsequence of \`"abcde"\`).`,
    examples: [
      { input: 'text1 = "abcde", text2 = "ace"', output: "3", explanation: 'The LCS is "ace".' },
      { input: 'text1 = "abc", text2 = "abc"', output: "3" },
      { input: 'text1 = "abc", text2 = "def"', output: "0" },
    ],
    constraints: ["1 <= text1.length, text2.length <= 1000", "text1 and text2 are lowercase English letters"],
    stages: {
      invariant: {
        prompt:
          "🔤 LCS: define dp[i][j] and give the transition when text1[i-1] == text2[j-1] and when they differ. Reply in 1-2 sentences.",
        answerKey:
          "dp[i][j] is the LCS length of the first i chars of text1 and the first j chars of text2. If the chars match, dp[i][j] = dp[i-1][j-1] + 1; otherwise dp[i][j] = max(dp[i-1][j], dp[i][j-1]), dropping one char from either string.",
        keyPoints: [
          {
            label: "dp[i][j] = LCS of the prefixes of length i and j",
            anyOf: ["first i chars", "first i characters", "prefixes", "prefix", "text1[:i]"],
          },
          {
            label: "Match: dp[i-1][j-1] + 1",
            anyOf: ["dp[i-1][j-1] + 1", "diagonal + 1", "diagonal plus one", "1 + dp[i-1][j-1]"],
          },
          {
            label: "Mismatch: max(dp[i-1][j], dp[i][j-1])",
            anyOf: ["max(dp[i-1][j], dp[i][j-1])", "max of top and left", "max of the two neighbors", "drop one char"],
          },
        ],
        hint: "Look at the last characters of both prefixes. If they are equal, can you always use them? If not, one of them is useless.",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: text1 = \"abc\", text2 = \"def\". Why size the table (m+1) x (n+1), and how can you cut memory to one row? Reply in 1-2 sentences.",
        answerKey:
          "The extra row and column hold empty prefixes with LCS 0, so i-1 and j-1 never go out of bounds and no-overlap inputs like abc/def correctly return 0. Only the previous row is read, so keep one row of size n+1 plus a saved diagonal value for O(n) space.",
        keyPoints: [
          {
            label: "Row/column 0 = empty prefix with LCS 0 (no out-of-bounds)",
            anyOf: ["empty prefix", "empty prefixes", "out of bounds", "row 0", "base row"],
          },
          {
            label: "No common chars returns 0",
            anyOf: ["return 0", "returns 0", "lcs 0", "answer is 0"],
          },
          {
            label: "One row plus a saved diagonal for O(n) space",
            anyOf: ["one row", "single row", "previous row", "saved diagonal", "o(n) space", "rolling"],
          },
        ],
        hint: "What is the LCS of any string with the empty string? Where would that value live in the table?",
      },
      code: {
        functionName: "longestCommonSubsequence",
        params: ["text1", "text2"],
        signature: { params: ["string", "string"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string} text1
 * @param {string} text2
 * @return {number}
 */
function longestCommonSubsequence(text1, text2) {
  // Your code here
  return 0;
}
`,
          python: `def longestCommonSubsequence(text1: str, text2: str) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function longestCommonSubsequence(text1, text2) {
  const n = text2.length;
  const row = new Array(n + 1).fill(0); // row[j] = LCS(text1[0..i), text2[0..j))
  for (let i = 1; i <= text1.length; i++) {
    let diag = 0; // dp[i-1][j-1]
    for (let j = 1; j <= n; j++) {
      const above = row[j];
      row[j] = text1[i - 1] === text2[j - 1] ? diag + 1 : Math.max(above, row[j - 1]);
      diag = above;
    }
  }
  return row[n];
}
`,
          python: `def longestCommonSubsequence(text1: str, text2: str) -> int:
    n = len(text2)
    row = [0] * (n + 1)  # row[j] = LCS(text1[:i], text2[:j])
    for ch in text1:
        diag = 0  # dp[i-1][j-1]
        for j in range(1, n + 1):
            above = row[j]
            row[j] = diag + 1 if ch == text2[j - 1] else max(above, row[j - 1])
            diag = above
    return row[n]
`,
        },
        tests: [
          { args: ["abcde", "ace"], expected: 3 },
          { args: ["abc", "abc"], expected: 3 },
          { args: ["abc", "def"], expected: 0 },
          { args: ["a", "a"], expected: 1 },
          { args: ["bl", "yby"], expected: 1 },
          { args: ["ezupkr", "ubmrapg"], expected: 2, hidden: true },
          { args: ["oxcpqrsvwf", "shmtulqrypy"], expected: 2, hidden: true },
          { args: ["abcba", "abcbcba"], expected: 5, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_2d", "string"],
    relatedCardIds: ["mc-dp-edit-distance", "mc-dp-rolling-array"],
  },
  {
    id: "p-word-break",
    title: "Word Break",
    leetcodeSlug: "word-break",
    difficulty: "medium",
    tags: ["dp_1d", "hashing", "string"],
    statement: `Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words.

The same word may be reused any number of times.`,
    examples: [
      { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true" },
      {
        input: 's = "applepenapple", wordDict = ["apple","pen"]',
        output: "true",
        explanation: '"apple pen apple" reuses "apple".',
      },
      { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: "false" },
    ],
    constraints: [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000",
      "1 <= wordDict[i].length <= 20",
      "s and wordDict[i] are lowercase English letters; all words are unique",
    ],
    stages: {
      invariant: {
        prompt:
          "📚 Word Break: define dp[i] and write the transition that fills it. What is dp[0], and what is the running time? Reply in 1-2 sentences.",
        answerKey:
          "dp[i] is true when the prefix s[0..i) can be segmented; dp[i] is true if some j < i has dp[j] true and s[j..i) is in the word set. dp[0] = true for the empty prefix, and with a hash set and a max word length cap it runs in about O(n * L) substring checks.",
        keyPoints: [
          {
            label: "dp[i] = prefix of length i can be segmented",
            anyOf: ["prefix", "first i chars", "s[0..i)", "s[:i]"],
          },
          {
            label: "dp[j] true and s[j..i) is a word",
            anyOf: ["dp[j]", "s[j..i)", "s[j:i]", "in the word set", "in the dictionary"],
          },
          {
            label: "dp[0] = true (empty prefix)",
            anyOf: ["dp[0] = true", "dp[0] is true", "empty prefix", "empty string"],
          },
          {
            label: "Hash set for O(1) lookups; about O(n * L) or O(n^2)",
            anyOf: ["hash set", "set", "o(n * l)", "o(n^2)", "o(n*l)"],
          },
        ],
        hint: "If the string ends with a dictionary word, what has to be true about everything before that word?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: s = \"catsandog\" with cats, dog, sand, and, cat. Why does greedily taking the longest (or shortest) matching word fail, and why must plain backtracking memoize? Reply in 1-2 sentences.",
        answerKey:
          "A greedy choice commits to one split (cats then and, or cat then sand) and cannot recover, while the answer depends on trying every split point. Plain backtracking re-explores the same suffix from many paths and goes exponential on inputs like aaaa...ab, so memoize failures per start index, which is exactly the dp.",
        keyPoints: [
          {
            label: "Greedy commits to one split and cannot recover",
            anyOf: ["commits", "cannot recover", "every split", "all split points", "one split"],
          },
          {
            label: "Backtracking without memo is exponential",
            anyOf: ["exponential", "same suffix", "re-explores", "recomputes"],
          },
          {
            label: "Memoize per start index",
            anyOf: ["memoize", "memo", "cache", "per start index", "the dp"],
          },
        ],
        hint: "Try both greedy rules on catsandog by hand, then count how many times you would re-check the suffix og.",
      },
      code: {
        functionName: "wordBreak",
        params: ["s", "wordDict"],
        signature: { params: ["string", "string[]"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @param {string[]} wordDict
 * @return {boolean}
 */
function wordBreak(s, wordDict) {
  // Your code here
  return false;
}
`,
          python: `def wordBreak(s: str, wordDict: List[str]) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const maxLen = Math.max(...wordDict.map((word) => word.length));
  const dp = new Array(s.length + 1).fill(false); // dp[i]: s.slice(0, i) can be segmented
  dp[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = Math.max(0, i - maxLen); j < i && !dp[i]; j++) {
      if (dp[j] && words.has(s.slice(j, i))) dp[i] = true;
    }
  }
  return dp[s.length];
}
`,
          python: `from typing import List


def wordBreak(s: str, wordDict: List[str]) -> bool:
    words = set(wordDict)
    max_len = max(len(word) for word in wordDict)
    dp = [False] * (len(s) + 1)  # dp[i]: s[:i] can be segmented
    dp[0] = True
    for i in range(1, len(s) + 1):
        for j in range(max(0, i - max_len), i):
            if dp[j] and s[j:i] in words:
                dp[i] = True
                break
    return dp[len(s)]
`,
        },
        tests: [
          { args: ["leetcode", ["leet", "code"]], expected: true },
          { args: ["applepenapple", ["apple", "pen"]], expected: true },
          { args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]], expected: false },
          { args: ["a", ["a"]], expected: true },
          { args: ["cars", ["car", "ca", "rs"]], expected: true },
          { args: ["ab", ["a"]], expected: false },
          { args: ["aaaaaaa", ["aaaa", "aaa"]], expected: true, hidden: true },
          { args: ["goalspecial", ["go", "goal", "goals", "special"]], expected: true, hidden: true },
          {
            args: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab", ["a", "aa", "aaa", "aaaa", "aaaaa"]],
            expected: false,
            hidden: true,
          },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d", "hashing"],
    relatedCardIds: ["mc-word-break-prefix-dp", "mc-decode-ways-dp"],
  },
  {
    id: "p-combination-sum-iv",
    title: "Combination Sum IV",
    leetcodeSlug: "combination-sum-iv",
    difficulty: "medium",
    tags: ["dp_knapsack", "dp_1d"],
    statement: `Given an array of **distinct** positive integers \`nums\` and a target integer \`target\`, return the number of possible **ordered** sequences drawn from \`nums\` (with repetition) that add up to \`target\`.

Different orders count as different combinations, so \`(1, 2)\` and \`(2, 1)\` are both counted. The answer fits in a 32-bit integer.`,
    examples: [
      {
        input: "nums = [1,2,3], target = 4",
        output: "7",
        explanation: "(1,1,1,1), (1,1,2), (1,2,1), (2,1,1), (2,2), (1,3), (3,1).",
      },
      { input: "nums = [9], target = 3", output: "0" },
    ],
    constraints: ["1 <= nums.length <= 200", "1 <= nums[i] <= 1000", "All nums are unique", "1 <= target <= 1000"],
    stages: {
      invariant: {
        prompt:
          "🔢 Combination Sum IV: write the recurrence for ways[t], give ways[0], and say which loop goes outside so that orders count separately. Reply in 1-2 sentences.",
        answerKey:
          "ways[t] = sum of ways[t - num] over every num <= t, with ways[0] = 1 for the empty sequence. Loop the target t on the outside and nums on the inside, so every last element is tried at every total and different orders are counted as different sequences.",
        keyPoints: [
          {
            label: "ways[t] = sum of ways[t - num]",
            anyOf: ["ways[t - num]", "dp[t - num]", "sum of ways", "t - num"],
          },
          {
            label: "ways[0] = 1",
            anyOf: ["ways[0] = 1", "dp[0] = 1", "empty sequence", "base case of 1"],
          },
          {
            label: "Target on the outside, nums inside (permutations)",
            anyOf: ["target t on the outside", "target outside", "target on the outside", "outer loop over target", "nums on the inside", "orders are counted"],
          },
        ],
        hint: "Classify every sequence summing to t by its last element. How many sequences end in num?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [1,2], target = 3. Swap the loops so nums is outside. What do you get instead of 3, and why? Reply in 1-2 sentences.",
        answerKey:
          "With nums on the outside you get 2, because each num is added in a fixed order, so it counts combinations ({1,1,1} and {1,2}) instead of ordered sequences and misses (2,1). Keep the target loop outside for Combination Sum IV; nums outside is Coin Change II.",
        keyPoints: [
          {
            label: "Swapped loops give 2",
            anyOf: ["you get 2", "gives 2", "returns 2", "get 2"],
          },
          {
            label: "Nums outside counts combinations, not ordered sequences",
            anyOf: ["counts combinations", "combinations", "fixed order", "misses (2,1)", "instead of ordered"],
          },
          {
            label: "Keep target outside; nums outside is Coin Change II",
            anyOf: ["coin change ii", "coin change 2", "target loop outside", "keep the target loop outside"],
          },
        ],
        hint: "With nums outside, can a 2 ever be placed before a 1 in the sequences you build?",
      },
      code: {
        functionName: "combinationSum4",
        params: ["nums", "target"],
        signature: { params: ["int[]", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function combinationSum4(nums, target) {
  // Your code here
  return 0;
}
`,
          python: `def combinationSum4(nums: List[int], target: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function combinationSum4(nums, target) {
  const ways = new Array(target + 1).fill(0); // ways[t] = ordered sequences summing to t
  ways[0] = 1;
  for (let t = 1; t <= target; t++) {
    for (const num of nums) {
      if (num <= t) ways[t] += ways[t - num];
    }
  }
  return ways[target];
}
`,
          python: `from typing import List


def combinationSum4(nums: List[int], target: int) -> int:
    ways = [0] * (target + 1)  # ways[t] = ordered sequences summing to t
    ways[0] = 1
    for t in range(1, target + 1):
        for num in nums:
            if num <= t:
                ways[t] += ways[t - num]
    return ways[target]
`,
        },
        tests: [
          { args: [[1, 2, 3], 4], expected: 7 },
          { args: [[9], 3], expected: 0 },
          { args: [[1], 1], expected: 1 },
          { args: [[2], 3], expected: 0 },
          { args: [[1, 2], 10], expected: 89 },
          { args: [[3, 1, 2, 4], 4], expected: 8, hidden: true },
          { args: [[4, 2, 1], 32], expected: 39882198, hidden: true },
          { args: [[5, 1, 8], 24], expected: 982, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_knapsack", "dp_1d"],
    relatedCardIds: ["mc-knapsack-combinations-vs-permutations", "mc-climbing-stairs-recurrence"],
  },
  {
    id: "p-house-robber-ii",
    title: "House Robber II",
    leetcodeSlug: "house-robber-ii",
    difficulty: "medium",
    tags: ["dp_1d"],
    statement: `The houses on this street are arranged in a **circle**, so the first house is adjacent to the last one. \`nums[i]\` is the money in house \`i\`, and you **cannot rob two adjacent houses** on the same night.

Return the maximum amount of money you can rob.`,
    examples: [
      { input: "nums = [2,3,2]", output: "3", explanation: "Houses 0 and 2 are adjacent on the circle, so rob house 1." },
      { input: "nums = [1,2,3,1]", output: "4", explanation: "Rob houses 0 and 2: 1 + 3 = 4." },
      { input: "nums = [1,2,3]", output: "3" },
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 1000"],
    stages: {
      invariant: {
        prompt:
          "⭕ House Robber II: the street is a circle. How do you reduce it to the straight-line House Robber, and why does that cover every valid plan? Reply in 1-2 sentences.",
        answerKey:
          "Run linear House Robber twice, once on nums[0..n-2] (skip the last house) and once on nums[1..n-1] (skip the first), and take the max. Any valid plan leaves out the first or the last house, so it lives in one of the two ranges.",
        keyPoints: [
          {
            label: "Run linear House Robber twice",
            anyOf: ["twice", "two passes", "two runs", "run linear house robber", "two ranges"],
          },
          {
            label: "Exclude the first house or the last house",
            anyOf: ["skip the last", "skip the first", "exclude the first", "exclude the last", "nums[1..n-1]", "nums[0..n-2]"],
          },
          {
            label: "Take the max; every plan leaves out the first or the last",
            anyOf: ["take the max", "max of the two", "leaves out the first or the last", "first or the last"],
          },
        ],
        hint: "The first and last houses can never both be robbed. What does that let you delete?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [5]. Both ranges nums[0..n-2] and nums[1..n-1] are empty. What should you return, and how do you handle it? Reply in 1-2 sentences.",
        answerKey:
          "With a single house there is no neighbor to conflict with, so return nums[0] = 5. Special-case n == 1 before splitting, because both reduced ranges are empty and would wrongly give 0.",
        keyPoints: [
          {
            label: "Return nums[0] for one house",
            anyOf: ["return nums[0]", "nums[0]", "return 5", "the only house"],
          },
          {
            label: "Special-case n == 1 before splitting",
            anyOf: ["special-case", "special case", "n == 1", "n = 1", "before splitting"],
          },
          {
            label: "Empty ranges would give 0",
            anyOf: ["give 0", "return 0", "wrongly give 0", "empty"],
          },
        ],
        hint: "Is a single house adjacent to itself on the circle?",
      },
      code: {
        functionName: "rob",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function rob(nums) {
  // Your code here
  return 0;
}
`,
          python: `def rob(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function rob(nums) {
  if (nums.length === 1) return nums[0];
  const line = (from, to) => {
    let skipBest = 0; // best through house i-2
    let best = 0; // best through house i-1
    for (let i = from; i <= to; i++) {
      const next = Math.max(best, skipBest + nums[i]);
      skipBest = best;
      best = next;
    }
    return best;
  };
  return Math.max(line(0, nums.length - 2), line(1, nums.length - 1));
}
`,
          python: `from typing import List


def rob(nums: List[int]) -> int:
    if len(nums) == 1:
        return nums[0]

    def line(houses: List[int]) -> int:
        skip_best = best = 0  # best through house i-2, best through house i-1
        for money in houses:
            skip_best, best = best, max(best, skip_best + money)
        return best

    return max(line(nums[:-1]), line(nums[1:]))
`,
        },
        tests: [
          { args: [[2, 3, 2]], expected: 3 },
          { args: [[1, 2, 3, 1]], expected: 4 },
          { args: [[1, 2, 3]], expected: 3 },
          { args: [[5]], expected: 5 },
          { args: [[1, 2]], expected: 2 },
          { args: [[200, 3, 140, 20, 10]], expected: 340, hidden: true },
          { args: [[2, 1, 1, 2]], expected: 3, hidden: true },
          { args: [[1, 3, 1, 3, 100]], expected: 103, hidden: true },
          { args: [[4, 1, 2, 7, 5, 3, 1]], expected: 14, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d"],
    relatedCardIds: ["mc-dp-house-robber", "mc-dp-rolling-array"],
  },
  {
    id: "p-decode-ways",
    title: "Decode Ways",
    leetcodeSlug: "decode-ways",
    difficulty: "medium",
    tags: ["dp_1d", "string"],
    statement: `A message of letters \`A-Z\` is encoded as digits with \`"A" -> "1"\`, \`"B" -> "2"\`, ..., \`"Z" -> "26"\`. Given a string \`s\` of digits, return the number of ways to decode it.

A group like \`"06"\` is **not** valid (no leading zeros), so it cannot map to \`"F"\`. Return \`0\` if the string cannot be decoded. The answer fits in a 32-bit integer.`,
    examples: [
      { input: 's = "12"', output: "2", explanation: '"AB" (1 2) or "L" (12).' },
      { input: 's = "226"', output: "3", explanation: '"BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).' },
      { input: 's = "06"', output: "0", explanation: '"06" has a leading zero and "0" alone maps to nothing.' },
    ],
    constraints: ["1 <= s.length <= 100", "s contains only digits and may contain leading zeros"],
    stages: {
      invariant: {
        prompt:
          "🔐 Decode Ways: write the transition for dp[i], the number of ways to decode the first i digits, including exactly when each term applies. Reply in 1-2 sentences.",
        answerKey:
          "dp[i] = (s[i-1] != '0' ? dp[i-1] : 0) + (the two digits s[i-2..i) form 10 to 26 ? dp[i-2] : 0), with dp[0] = 1. It is a Fibonacci-like climb with validity checks, so two rolling variables give O(1) space.",
        keyPoints: [
          {
            label: "One-digit term dp[i-1] when s[i-1] is not 0",
            anyOf: ["dp[i-1]", "single digit", "one digit", "s[i-1] != '0'"],
          },
          {
            label: "Two-digit term dp[i-2] when the pair is 10 to 26",
            anyOf: ["dp[i-2]", "10 to 26", "10..26", "between 10 and 26", "two digits"],
          },
          {
            label: "dp[0] = 1, O(1) space",
            anyOf: ["dp[0] = 1", "two rolling variables", "o(1) space", "rolling", "fibonacci"],
          },
        ],
        hint: "The last letter uses either one digit or two. When is each of those choices legal?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: s = \"100\" and s = \"27\". What are the answers, and which checks do they exercise? Reply in 1-2 sentences.",
        answerKey:
          "\"100\" decodes 0 ways: 10 is J, but the last 0 cannot stand alone and 00 is not in 10 to 26, so a zero must be absorbed by a preceding 1 or 2. \"27\" decodes 1 way (B G) because 27 > 26, so only single digits work.",
        keyPoints: [
          {
            label: "\"100\" gives 0: a zero must pair with a preceding 1 or 2",
            anyOf: ["decodes 0 ways", "0 ways", "zero must be absorbed", "cannot stand alone", "preceding 1 or 2"],
          },
          {
            label: "\"27\" gives 1 because 27 > 26",
            anyOf: ["27 > 26", "decodes 1 way", "1 way", "only single digits"],
          },
          {
            label: "00 or leading-zero pairs are invalid",
            anyOf: ["00 is not", "not in 10 to 26", "leading zero", "00"],
          },
        ],
        hint: "Which letters could the final 0 in 100 belong to?",
      },
      code: {
        functionName: "numDecodings",
        params: ["s"],
        signature: { params: ["string"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @return {number}
 */
function numDecodings(s) {
  // Your code here
  return 0;
}
`,
          python: `def numDecodings(s: str) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function numDecodings(s) {
  let prev = 1; // dp[i-2]
  let curr = s[0] === "0" ? 0 : 1; // dp[i-1]
  for (let i = 2; i <= s.length; i++) {
    let next = s[i - 1] !== "0" ? curr : 0;
    const pair = Number(s.slice(i - 2, i));
    if (s[i - 2] !== "0" && pair <= 26) next += prev;
    prev = curr;
    curr = next;
  }
  return curr;
}
`,
          python: `def numDecodings(s: str) -> int:
    prev, curr = 1, 0 if s[0] == "0" else 1  # dp[i-2], dp[i-1]
    for i in range(2, len(s) + 1):
        nxt = curr if s[i - 1] != "0" else 0
        if s[i - 2] != "0" and int(s[i - 2 : i]) <= 26:
            nxt += prev
        prev, curr = curr, nxt
    return curr
`,
        },
        tests: [
          { args: ["12"], expected: 2 },
          { args: ["226"], expected: 3 },
          { args: ["06"], expected: 0 },
          { args: ["0"], expected: 0 },
          { args: ["10"], expected: 1 },
          { args: ["27"], expected: 1 },
          { args: ["11106"], expected: 2, hidden: true },
          { args: ["2101"], expected: 1, hidden: true },
          { args: ["100"], expected: 0, hidden: true },
          { args: ["111111111111111111111111111111111111111111111"], expected: 1836311903, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d", "string"],
    relatedCardIds: ["mc-decode-ways-dp", "mc-climbing-stairs-recurrence"],
  },
  {
    id: "p-unique-paths",
    title: "Unique Paths",
    leetcodeSlug: "unique-paths",
    difficulty: "medium",
    tags: ["dp_2d", "math", "matrix"],
    statement: `A robot starts at the top-left corner of an \`m x n\` grid and wants to reach the bottom-right corner. It can only move **right** or **down**.

Return the number of unique paths. The answer is at most \`2 * 10^9\`.`,
    examples: [
      { input: "m = 3, n = 7", output: "28" },
      { input: "m = 3, n = 2", output: "3", explanation: "Right-Down-Down, Down-Down-Right, Down-Right-Down." },
    ],
    constraints: ["1 <= m, n <= 100"],
    stages: {
      invariant: {
        prompt:
          "🤖 Unique Paths: write the recurrence for paths[r][c], its base cases, and how to fit it in one row. Reply in 1-2 sentences.",
        answerKey:
          "paths[r][c] = paths[r-1][c] + paths[r][c-1], since the last move came from above or from the left; the first row and first column are all 1. Keep one row and update row[c] += row[c-1] left to right for O(n) space.",
        keyPoints: [
          {
            label: "paths[r][c] = above + left",
            anyOf: ["paths[r-1][c] + paths[r][c-1]", "dp[i-1][j] + dp[i][j-1]", "above or from the left", "above + left", "top + left"],
          },
          {
            label: "First row and column are 1",
            anyOf: ["first row and first column", "first row", "all 1", "all ones"],
          },
          {
            label: "One row: row[c] += row[c-1]",
            anyOf: ["row[c] += row[c-1]", "one row", "single row", "o(n) space", "rolling"],
          },
        ],
        hint: "Where could the robot have been one move before reaching cell (r, c)?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: m = 23, n = 12. The closed form is C(m+n-2, m-1). Why can computing it with factorials break, and how do you compute it safely? Reply in 1-2 sentences.",
        answerKey:
          "33! overflows 64-bit integers (and loses precision in doubles) even though the answer 193536720 fits, so multiply and divide incrementally: result = result * (n-1+i) / i for i = 1..m-1 stays an exact integer at every step, or just use the O(m*n) dp.",
        keyPoints: [
          {
            label: "Factorials overflow even though the answer fits",
            anyOf: ["overflows", "overflow", "loses precision", "too large"],
          },
          {
            label: "Multiply and divide incrementally so each step is an integer",
            anyOf: ["incrementally", "multiply and divide", "exact integer at every step", "result * (n-1+i) / i"],
          },
          {
            label: "Or use the dp",
            anyOf: ["use the o(m*n) dp", "the dp", "dp table", "o(m*n)"],
          },
        ],
        hint: "How big is 33!? Can you build C(33, 11) one factor at a time?",
      },
      code: {
        functionName: "uniquePaths",
        params: ["m", "n"],
        signature: { params: ["int", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number} m
 * @param {number} n
 * @return {number}
 */
function uniquePaths(m, n) {
  // Your code here
  return 0;
}
`,
          python: `def uniquePaths(m: int, n: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function uniquePaths(m, n) {
  const row = new Array(n).fill(1); // row[c] = paths to (r, c); the first row is all 1
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) row[c] += row[c - 1]; // above + left
  }
  return row[n - 1];
}
`,
          python: `def uniquePaths(m: int, n: int) -> int:
    row = [1] * n  # row[c] = paths to (r, c); the first row is all 1
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]  # above + left
    return row[n - 1]
`,
        },
        tests: [
          { args: [3, 7], expected: 28 },
          { args: [3, 2], expected: 3 },
          { args: [1, 1], expected: 1 },
          { args: [1, 5], expected: 1 },
          { args: [7, 3], expected: 28 },
          { args: [10, 10], expected: 48620, hidden: true },
          { args: [23, 12], expected: 193536720, hidden: true },
          { args: [5, 5], expected: 70, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_2d"],
    relatedCardIds: ["mc-grid-paths-dp-base-cases", "mc-dp-rolling-array"],
  },
  {
    id: "p-longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    leetcodeSlug: "longest-palindromic-substring",
    difficulty: "medium",
    tags: ["string", "two_pointers", "dp_2d"],
    statement: `Given a string \`s\`, return the **longest palindromic substring** in \`s\`.

> **Judge note:** on LeetCode several substrings can tie for the longest (for example \`"babad"\` accepts \`"bab"\` or \`"aba"\`). Every test here has a **unique** longest palindrome, so your output is compared exactly.`,
    examples: [
      { input: 's = "cbbd"', output: '"bb"' },
      { input: 's = "bananas"', output: '"anana"' },
      { input: 's = "a"', output: '"a"' },
    ],
    constraints: ["1 <= s.length <= 1000", "s consists of digits and English letters"],
    stages: {
      invariant: {
        prompt:
          "🪞 Longest Palindromic Substring: describe the expand-around-center approach, how many centers you try, and its time and space. Reply in 1-2 sentences.",
        answerKey:
          "Every palindrome mirrors around a center, so for each of the 2n-1 centers (each char and each gap between chars) expand two pointers outward while the ends match and keep the longest span. That is O(n^2) time and O(1) extra space.",
        keyPoints: [
          {
            label: "Expand two pointers outward from a center",
            anyOf: ["expand", "outward", "around a center", "two pointers"],
          },
          {
            label: "2n-1 centers: characters and gaps (odd and even)",
            anyOf: ["2n-1", "2n - 1", "each gap", "between chars", "odd and even"],
          },
          {
            label: "O(n^2) time, O(1) space",
            anyOf: ["o(n^2)", "o(n²)", "o(1) extra space", "o(1) space"],
          },
        ],
        hint: "A palindrome reads the same outward from its middle. Where can that middle be?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: s = \"cbbd\". If you only expand around single characters, what do you return, and what is missing? Reply in 1-2 sentences.",
        answerKey:
          "Only odd-length centers find single letters, so you return c instead of bb. Also expand from each gap, with left = i and right = i + 1, to catch even-length palindromes.",
        keyPoints: [
          {
            label: "Returns a single letter instead of bb",
            anyOf: ["instead of bb", "single letter", "return c", "misses bb"],
          },
          {
            label: "Also expand from gaps (i, i+1) for even lengths",
            anyOf: ["each gap", "i + 1", "i+1", "even-length", "even length"],
          },
        ],
        hint: "Where is the center of bb?",
      },
      code: {
        functionName: "longestPalindrome",
        params: ["s"],
        signature: { params: ["string"], returns: "string" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @return {string}
 */
function longestPalindrome(s) {
  // Your code here
  return "";
}
`,
          python: `def longestPalindrome(s: str) -> str:
    # Your code here
    return ""
`,
        },
        reference: {
          javascript: `function longestPalindrome(s) {
  let start = 0;
  let length = 0;
  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--;
      right++;
    }
    if (right - left - 1 > length) {
      start = left + 1;
      length = right - left - 1;
    }
  };
  for (let i = 0; i < s.length; i++) {
    expand(i, i); // odd length, centered on s[i]
    expand(i, i + 1); // even length, centered on the gap after s[i]
  }
  return s.slice(start, start + length);
}
`,
          python: `def longestPalindrome(s: str) -> str:
    start, length = 0, 0
    for center in range(2 * len(s) - 1):
        left, right = center // 2, (center + 1) // 2  # odd centers on chars, even on gaps
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        if right - left - 1 > length:
            start, length = left + 1, right - left - 1
    return s[start : start + length]
`,
        },
        tests: [
          { args: ["cbbd"], expected: "bb" },
          { args: ["a"], expected: "a" },
          { args: ["bananas"], expected: "anana" },
          { args: ["racecar"], expected: "racecar" },
          { args: ["forgeeksskeegfor"], expected: "geeksskeeg" },
          { args: ["aaaa"], expected: "aaaa", hidden: true },
          { args: ["abcdcbaxyz"], expected: "abcdcba", hidden: true },
          { args: ["xabbay"], expected: "abba", hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["string", "two_pointers"],
    relatedCardIds: ["mc-palindrome-expand-center", "mc-palindrome-interval-dp"],
  },
  {
    id: "p-palindromic-substrings",
    title: "Palindromic Substrings",
    leetcodeSlug: "palindromic-substrings",
    difficulty: "medium",
    tags: ["string", "two_pointers", "dp_2d"],
    statement: `Given a string \`s\`, return the number of **palindromic substrings** in it.

Substrings at different positions count separately even if they contain the same characters.`,
    examples: [
      { input: 's = "abc"', output: "3", explanation: '"a", "b", "c".' },
      { input: 's = "aaa"', output: "6", explanation: '"a" x3, "aa" x2, "aaa".' },
    ],
    constraints: ["1 <= s.length <= 1000", "s consists of lowercase English letters"],
    stages: {
      invariant: {
        prompt:
          "🔁 Palindromic Substrings: how do you count every palindrome in O(n^2) time and O(1) space, and what does each successful expansion step mean? Reply in 1-2 sentences.",
        answerKey:
          "Expand around all 2n-1 centers (each char and each gap), and every step where both ends still match is one more distinct palindrome, so add 1 per successful expansion. That is O(n^2) time and O(1) space.",
        keyPoints: [
          {
            label: "Expand around all 2n-1 centers",
            anyOf: ["expand", "2n-1", "each gap", "around all", "centers"],
          },
          {
            label: "Each successful expansion is one more palindrome",
            anyOf: ["add 1 per successful expansion", "one more", "add 1", "count each", "each step"],
          },
          {
            label: "O(n^2) time, O(1) space",
            anyOf: ["o(n^2)", "o(1) space"],
          },
        ],
        hint: "When you expand from a center and the ends still match, you just found a new palindrome. Count it right then.",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: s = \"aaa\". Why is the answer 6, not 3, and what goes wrong if you dedupe with a set of strings? Reply in 1-2 sentences.",
        answerKey:
          "Substrings at different positions count separately: three a, two aa and one aaa make 6. A set of strings would collapse repeats and return 3, so count occurrences, never distinct values.",
        keyPoints: [
          {
            label: "Different positions count separately",
            anyOf: ["different positions", "count separately", "each occurrence", "count occurrences"],
          },
          {
            label: "Tally: three a, two aa, one aaa",
            anyOf: ["two aa", "three a", "one aaa", "3 + 2 + 1"],
          },
          {
            label: "A set would wrongly give 3",
            anyOf: ["return 3", "collapse", "distinct values", "set of strings"],
          },
        ],
        hint: "List every (start, end) pair in aaa whose substring is a palindrome.",
      },
      code: {
        functionName: "countSubstrings",
        params: ["s"],
        signature: { params: ["string"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @return {number}
 */
function countSubstrings(s) {
  // Your code here
  return 0;
}
`,
          python: `def countSubstrings(s: str) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function countSubstrings(s) {
  let count = 0;
  for (let center = 0; center < 2 * s.length - 1; center++) {
    let left = center >> 1; // odd centers on chars, even centers on gaps
    let right = left + (center & 1);
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      count++; // s[left..right] is one more palindrome
      left--;
      right++;
    }
  }
  return count;
}
`,
          python: `def countSubstrings(s: str) -> int:
    count = 0
    for center in range(2 * len(s) - 1):
        left, right = center // 2, (center + 1) // 2  # odd centers on chars, even on gaps
        while left >= 0 and right < len(s) and s[left] == s[right]:
            count += 1  # s[left..right] is one more palindrome
            left -= 1
            right += 1
    return count
`,
        },
        tests: [
          { args: ["abc"], expected: 3 },
          { args: ["aaa"], expected: 6 },
          { args: ["a"], expected: 1 },
          { args: ["abba"], expected: 6 },
          { args: ["racecar"], expected: 10 },
          { args: ["aaaaa"], expected: 15, hidden: true },
          { args: ["fdsklf"], expected: 6, hidden: true },
          { args: ["abacdfgdcaba"], expected: 14, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["string", "two_pointers"],
    relatedCardIds: ["mc-palindrome-expand-center", "mc-palindrome-interval-dp"],
  },
  {
    id: "p-longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    leetcodeSlug: "longest-repeating-character-replacement",
    difficulty: "medium",
    tags: ["sliding_window", "hashing", "string"],
    statement: `You are given a string \`s\` of uppercase English letters and an integer \`k\`. You may change any character to any other uppercase letter, at most \`k\` times in total.

Return the length of the longest substring containing a single repeated letter that you can get after those changes.`,
    examples: [
      { input: 's = "ABAB", k = 2', output: "4", explanation: "Replace both A's with B's (or vice versa)." },
      {
        input: 's = "AABABBA", k = 1',
        output: "4",
        explanation: 'Replace the A in "BABB" to get "BBBB".',
      },
    ],
    constraints: ["1 <= s.length <= 10^5", "s consists of uppercase English letters", "0 <= k <= s.length"],
    stages: {
      invariant: {
        prompt:
          "🔠 Char Replacement: what condition makes a sliding window valid, what counts do you track, and when do you move the left edge? Reply in 1-2 sentences.",
        answerKey:
          "A window is valid when window length - maxFreq <= k, where maxFreq is the count of its most common letter, since everything else must be replaced. Track letter counts in a 26-slot array, grow right each step, and move left forward by one when the window needs more than k replacements.",
        keyPoints: [
          {
            label: "Valid when window length - maxFreq <= k",
            anyOf: ["length - maxfreq <= k", "window length - maxfreq", "len - maxfreq", "minus the most common", "- maxfreq <= k"],
          },
          {
            label: "Track letter counts (26 slots) and the max frequency",
            anyOf: ["letter counts", "26-slot", "26 slots", "frequency", "count array", "maxfreq"],
          },
          {
            label: "Move left when more than k replacements are needed",
            anyOf: ["move left", "shrink", "more than k replacements", "advance left"],
          },
        ],
        hint: "In a window you want to make uniform, which letter should you keep, and how many others must change?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: when left moves, maxFreq may now overstate the window's true max. Why is it safe to never decrease it, e.g. on s = \"AABABBA\", k = 1? Reply in 1-2 sentences.",
        answerKey:
          "The answer only grows when a window beats the best length, which requires a larger true maxFreq than any seen before, so a stale maxFreq can only keep the window size from shrinking, never produce a wrong larger answer. The window then slides at its best size, giving O(n) without rescanning the 26 counts.",
        keyPoints: [
          {
            label: "A longer answer needs a larger true maxFreq",
            anyOf: ["larger true maxfreq", "only grows", "beats the best", "new max"],
          },
          {
            label: "Stale maxFreq only stops shrinking, never inflates the answer",
            anyOf: ["stale", "never produce a wrong", "keep the window size", "never inflates", "from shrinking"],
          },
          {
            label: "O(n) with no rescan",
            anyOf: ["o(n)", "without rescanning", "no rescan", "slides at its best size"],
          },
        ],
        hint: "Ask what it takes for the recorded answer to increase. Can an overstated maxFreq ever cause that?",
      },
      code: {
        functionName: "characterReplacement",
        params: ["s", "k"],
        signature: { params: ["string", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
function characterReplacement(s, k) {
  // Your code here
  return 0;
}
`,
          python: `def characterReplacement(s: str, k: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function characterReplacement(s, k) {
  const counts = new Array(26).fill(0);
  let left = 0;
  let maxFreq = 0; // highest single-letter count seen in any window (never decreases)
  for (let right = 0; right < s.length; right++) {
    const idx = s.charCodeAt(right) - 65;
    maxFreq = Math.max(maxFreq, ++counts[idx]);
    if (right - left + 1 - maxFreq > k) {
      counts[s.charCodeAt(left) - 65]--;
      left++;
    }
  }
  return s.length - left;
}
`,
          python: `def characterReplacement(s: str, k: int) -> int:
    counts = [0] * 26
    left = 0
    max_freq = 0  # highest single-letter count seen in any window (never decreases)
    for right, ch in enumerate(s):
        counts[ord(ch) - 65] += 1
        max_freq = max(max_freq, counts[ord(ch) - 65])
        if right - left + 1 - max_freq > k:
            counts[ord(s[left]) - 65] -= 1
            left += 1
    return len(s) - left
`,
        },
        tests: [
          { args: ["ABAB", 2], expected: 4 },
          { args: ["AABABBA", 1], expected: 4 },
          { args: ["A", 0], expected: 1 },
          { args: ["ABCD", 0], expected: 1 },
          { args: ["AAAA", 2], expected: 4 },
          { args: ["ABBB", 2], expected: 4, hidden: true },
          { args: ["ABCDE", 1], expected: 2, hidden: true },
          { args: ["AABCABBB", 2], expected: 6, hidden: true },
          { args: ["ABAA", 0], expected: 2, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["sliding_window"],
    relatedCardIds: ["mc-char-replacement-window", "mc-sliding-window-shrink-condition"],
  },
];

/** Java / C++ / Go / TypeScript reference solutions for this batch, by problem id. */
export const NATIVE_REFERENCES_E: Record<string, Record<NativeLanguage, string>> = {
  "p-climbing-stairs": {
    java: `class Solution {
    public int climbStairs(int n) {
        int prev = 1, curr = 1;
        for (int i = 2; i <= n; i++) {
            int next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }
}`,
    cpp: `class Solution {
public:
    int climbStairs(int n) {
        int prev = 1, curr = 1;
        for (int i = 2; i <= n; i++) {
            int next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }
};`,
    go: `func climbStairs(n int) int {
	prev, curr := 1, 1
	for i := 2; i <= n; i++ {
		prev, curr = curr, prev+curr
	}
	return curr
}`,
    typescript: `function climbStairs(n: number): number {
  let prev = 1;
  let curr = 1;
  for (let i = 2; i <= n; i++) [prev, curr] = [curr, prev + curr];
  return curr;
}`,
  },
  "p-longest-increasing-subsequence": {
    java: `class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        for (int x : nums) {
            int lo = 0, hi = size;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < x) lo = mid + 1;
                else hi = mid;
            }
            tails[lo] = x;
            if (lo == size) size++;
        }
        return size;
    }
}`,
    cpp: `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int x : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) tails.push_back(x);
            else *it = x;
        }
        return (int)tails.size();
    }
};`,
    go: `func lengthOfLIS(nums []int) int {
	tails := []int{}
	for _, x := range nums {
		lo, hi := 0, len(tails)
		for lo < hi {
			mid := (lo + hi) / 2
			if tails[mid] < x {
				lo = mid + 1
			} else {
				hi = mid
			}
		}
		if lo == len(tails) {
			tails = append(tails, x)
		} else {
			tails[lo] = x
		}
	}
	return len(tails)
}`,
    typescript: `function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  for (const x of nums) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}`,
  },
  "p-longest-common-subsequence": {
    java: `class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int n = text2.length();
        int[] row = new int[n + 1];
        for (int i = 1; i <= text1.length(); i++) {
            int diag = 0;
            for (int j = 1; j <= n; j++) {
                int above = row[j];
                row[j] = text1.charAt(i - 1) == text2.charAt(j - 1) ? diag + 1 : Math.max(above, row[j - 1]);
                diag = above;
            }
        }
        return row[n];
    }
}`,
    cpp: `class Solution {
public:
    int longestCommonSubsequence(string text1, string text2) {
        int n = text2.size();
        vector<int> row(n + 1, 0);
        for (size_t i = 1; i <= text1.size(); i++) {
            int diag = 0;
            for (int j = 1; j <= n; j++) {
                int above = row[j];
                row[j] = text1[i - 1] == text2[j - 1] ? diag + 1 : max(above, row[j - 1]);
                diag = above;
            }
        }
        return row[n];
    }
};`,
    go: `func longestCommonSubsequence(text1 string, text2 string) int {
	n := len(text2)
	row := make([]int, n+1)
	for i := 1; i <= len(text1); i++ {
		diag := 0
		for j := 1; j <= n; j++ {
			above := row[j]
			if text1[i-1] == text2[j-1] {
				row[j] = diag + 1
			} else if row[j-1] > above {
				row[j] = row[j-1]
			}
			diag = above
		}
	}
	return row[n]
}`,
    typescript: `function longestCommonSubsequence(text1: string, text2: string): number {
  const n = text2.length;
  const row = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= text1.length; i++) {
    let diag = 0;
    for (let j = 1; j <= n; j++) {
      const above = row[j];
      row[j] = text1[i - 1] === text2[j - 1] ? diag + 1 : Math.max(above, row[j - 1]);
      diag = above;
    }
  }
  return row[n];
}`,
  },
  "p-word-break": {
    java: `class Solution {
    public boolean wordBreak(String s, String[] wordDict) {
        Set<String> words = new HashSet<>(Arrays.asList(wordDict));
        int maxLen = 0;
        for (String w : wordDict) maxLen = Math.max(maxLen, w.length());
        boolean[] dp = new boolean[s.length() + 1];
        dp[0] = true;
        for (int i = 1; i <= s.length(); i++) {
            for (int j = Math.max(0, i - maxLen); j < i; j++) {
                if (dp[j] && words.contains(s.substring(j, i))) { dp[i] = true; break; }
            }
        }
        return dp[s.length()];
    }
}`,
    cpp: `class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> words(wordDict.begin(), wordDict.end());
        int maxLen = 0;
        for (const string& w : wordDict) maxLen = max(maxLen, (int)w.size());
        int n = s.size();
        vector<bool> dp(n + 1, false);
        dp[0] = true;
        for (int i = 1; i <= n; i++) {
            for (int j = max(0, i - maxLen); j < i; j++) {
                if (dp[j] && words.count(s.substr(j, i - j))) { dp[i] = true; break; }
            }
        }
        return dp[n];
    }
};`,
    go: `func wordBreak(s string, wordDict []string) bool {
	words := make(map[string]bool, len(wordDict))
	maxLen := 0
	for _, w := range wordDict {
		words[w] = true
		if len(w) > maxLen {
			maxLen = len(w)
		}
	}
	dp := make([]bool, len(s)+1)
	dp[0] = true
	for i := 1; i <= len(s); i++ {
		for j := i - maxLen; j < i; j++ {
			if j >= 0 && dp[j] && words[s[j:i]] {
				dp[i] = true
				break
			}
		}
	}
	return dp[len(s)]
}`,
    typescript: `function wordBreak(s: string, wordDict: string[]): boolean {
  const words = new Set(wordDict);
  const maxLen = Math.max(...wordDict.map((word) => word.length));
  const dp = new Array<boolean>(s.length + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = Math.max(0, i - maxLen); j < i && !dp[i]; j++) {
      if (dp[j] && words.has(s.slice(j, i))) dp[i] = true;
    }
  }
  return dp[s.length];
}`,
  },
  "p-combination-sum-iv": {
    java: `class Solution {
    public int combinationSum4(int[] nums, int target) {
        long[] ways = new long[target + 1];
        ways[0] = 1;
        for (int t = 1; t <= target; t++)
            for (int num : nums) if (num <= t) ways[t] = (ways[t] + ways[t - num]) & 0xFFFFFFFFL;
        return (int) ways[target];
    }
}`,
    cpp: `class Solution {
public:
    int combinationSum4(vector<int>& nums, int target) {
        vector<unsigned int> ways(target + 1, 0);
        ways[0] = 1;
        for (int t = 1; t <= target; t++)
            for (int num : nums) if (num <= t) ways[t] += ways[t - num];
        return (int)ways[target];
    }
};`,
    go: `func combinationSum4(nums []int, target int) int {
	ways := make([]uint32, target+1)
	ways[0] = 1
	for t := 1; t <= target; t++ {
		for _, num := range nums {
			if num <= t {
				ways[t] += ways[t-num]
			}
		}
	}
	return int(int32(ways[target]))
}`,
    typescript: `function combinationSum4(nums: number[], target: number): number {
  const ways = new Array<number>(target + 1).fill(0);
  ways[0] = 1;
  for (let t = 1; t <= target; t++) {
    for (const num of nums) if (num <= t) ways[t] += ways[t - num];
  }
  return ways[target];
}`,
  },
  "p-house-robber-ii": {
    java: `class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 1) return nums[0];
        return Math.max(line(nums, 0, n - 2), line(nums, 1, n - 1));
    }

    private int line(int[] nums, int from, int to) {
        int prev = 0, curr = 0;
        for (int i = from; i <= to; i++) {
            int next = Math.max(curr, prev + nums[i]);
            prev = curr;
            curr = next;
        }
        return curr;
    }
}`,
    cpp: `class Solution {
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return nums[0];
        return max(line(nums, 0, n - 2), line(nums, 1, n - 1));
    }

    int line(const vector<int>& nums, int from, int to) {
        int prev = 0, curr = 0;
        for (int i = from; i <= to; i++) {
            int next = max(curr, prev + nums[i]);
            prev = curr;
            curr = next;
        }
        return curr;
    }
};`,
    go: `func rob(nums []int) int {
	n := len(nums)
	if n == 1 {
		return nums[0]
	}
	line := func(houses []int) int {
		prev, curr := 0, 0
		for _, money := range houses {
			next := curr
			if prev+money > next {
				next = prev + money
			}
			prev, curr = curr, next
		}
		return curr
	}
	a, b := line(nums[:n-1]), line(nums[1:])
	if a > b {
		return a
	}
	return b
}`,
    typescript: `function rob(nums: number[]): number {
  if (nums.length === 1) return nums[0];
  const line = (from: number, to: number): number => {
    let prev = 0;
    let curr = 0;
    for (let i = from; i <= to; i++) [prev, curr] = [curr, Math.max(curr, prev + nums[i])];
    return curr;
  };
  return Math.max(line(0, nums.length - 2), line(1, nums.length - 1));
}`,
  },
  "p-decode-ways": {
    java: `class Solution {
    public int numDecodings(String s) {
        int prev = 1, curr = s.charAt(0) == '0' ? 0 : 1;
        for (int i = 2; i <= s.length(); i++) {
            int next = s.charAt(i - 1) != '0' ? curr : 0;
            int pair = (s.charAt(i - 2) - '0') * 10 + (s.charAt(i - 1) - '0');
            if (s.charAt(i - 2) != '0' && pair <= 26) next += prev;
            prev = curr;
            curr = next;
        }
        return curr;
    }
}`,
    cpp: `class Solution {
public:
    int numDecodings(string s) {
        int prev = 1, curr = s[0] == '0' ? 0 : 1;
        for (size_t i = 2; i <= s.size(); i++) {
            int next = s[i - 1] != '0' ? curr : 0;
            int pair = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (s[i - 2] != '0' && pair <= 26) next += prev;
            prev = curr;
            curr = next;
        }
        return curr;
    }
};`,
    go: `func numDecodings(s string) int {
	prev, curr := 1, 1
	if s[0] == '0' {
		curr = 0
	}
	for i := 2; i <= len(s); i++ {
		next := 0
		if s[i-1] != '0' {
			next = curr
		}
		pair := int(s[i-2]-'0')*10 + int(s[i-1]-'0')
		if s[i-2] != '0' && pair <= 26 {
			next += prev
		}
		prev, curr = curr, next
	}
	return curr
}`,
    typescript: `function numDecodings(s: string): number {
  let prev = 1;
  let curr = s[0] === "0" ? 0 : 1;
  for (let i = 2; i <= s.length; i++) {
    let next = s[i - 1] !== "0" ? curr : 0;
    if (s[i - 2] !== "0" && Number(s.slice(i - 2, i)) <= 26) next += prev;
    prev = curr;
    curr = next;
  }
  return curr;
}`,
  },
  "p-unique-paths": {
    java: `class Solution {
    public int uniquePaths(int m, int n) {
        int[] row = new int[n];
        Arrays.fill(row, 1);
        for (int r = 1; r < m; r++)
            for (int c = 1; c < n; c++) row[c] += row[c - 1];
        return row[n - 1];
    }
}`,
    cpp: `class Solution {
public:
    int uniquePaths(int m, int n) {
        vector<int> row(n, 1);
        for (int r = 1; r < m; r++)
            for (int c = 1; c < n; c++) row[c] += row[c - 1];
        return row[n - 1];
    }
};`,
    go: `func uniquePaths(m int, n int) int {
	row := make([]int, n)
	for c := range row {
		row[c] = 1
	}
	for r := 1; r < m; r++ {
		for c := 1; c < n; c++ {
			row[c] += row[c-1]
		}
	}
	return row[n-1]
}`,
    typescript: `function uniquePaths(m: number, n: number): number {
  const row = new Array<number>(n).fill(1);
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) row[c] += row[c - 1];
  }
  return row[n - 1];
}`,
  },
  "p-longest-palindromic-substring": {
    java: `class Solution {
    public String longestPalindrome(String s) {
        int start = 0, length = 0;
        for (int center = 0; center < 2 * s.length() - 1; center++) {
            int left = center / 2, right = left + center % 2;
            while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) { left--; right++; }
            if (right - left - 1 > length) { start = left + 1; length = right - left - 1; }
        }
        return s.substring(start, start + length);
    }
}`,
    cpp: `class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size(), start = 0, length = 0;
        for (int center = 0; center < 2 * n - 1; center++) {
            int left = center / 2, right = left + center % 2;
            while (left >= 0 && right < n && s[left] == s[right]) { left--; right++; }
            if (right - left - 1 > length) { start = left + 1; length = right - left - 1; }
        }
        return s.substr(start, length);
    }
};`,
    go: `func longestPalindrome(s string) string {
	start, length := 0, 0
	for center := 0; center < 2*len(s)-1; center++ {
		left, right := center/2, center/2+center%2
		for left >= 0 && right < len(s) && s[left] == s[right] {
			left--
			right++
		}
		if right-left-1 > length {
			start, length = left+1, right-left-1
		}
	}
	return s[start : start+length]
}`,
    typescript: `function longestPalindrome(s: string): string {
  let start = 0;
  let length = 0;
  for (let center = 0; center < 2 * s.length - 1; center++) {
    let left = center >> 1;
    let right = left + (center & 1);
    while (left >= 0 && right < s.length && s[left] === s[right]) { left--; right++; }
    if (right - left - 1 > length) { start = left + 1; length = right - left - 1; }
  }
  return s.slice(start, start + length);
}`,
  },
  "p-palindromic-substrings": {
    java: `class Solution {
    public int countSubstrings(String s) {
        int count = 0;
        for (int center = 0; center < 2 * s.length() - 1; center++) {
            int left = center / 2, right = left + center % 2;
            while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) { count++; left--; right++; }
        }
        return count;
    }
}`,
    cpp: `class Solution {
public:
    int countSubstrings(string s) {
        int n = s.size(), count = 0;
        for (int center = 0; center < 2 * n - 1; center++) {
            int left = center / 2, right = left + center % 2;
            while (left >= 0 && right < n && s[left] == s[right]) { count++; left--; right++; }
        }
        return count;
    }
};`,
    go: `func countSubstrings(s string) int {
	count := 0
	for center := 0; center < 2*len(s)-1; center++ {
		left, right := center/2, center/2+center%2
		for left >= 0 && right < len(s) && s[left] == s[right] {
			count++
			left--
			right++
		}
	}
	return count
}`,
    typescript: `function countSubstrings(s: string): number {
  let count = 0;
  for (let center = 0; center < 2 * s.length - 1; center++) {
    let left = center >> 1;
    let right = left + (center & 1);
    while (left >= 0 && right < s.length && s[left] === s[right]) { count++; left--; right++; }
  }
  return count;
}`,
  },
  "p-longest-repeating-character-replacement": {
    java: `class Solution {
    public int characterReplacement(String s, int k) {
        int[] counts = new int[26];
        int left = 0, maxFreq = 0;
        for (int right = 0; right < s.length(); right++) {
            maxFreq = Math.max(maxFreq, ++counts[s.charAt(right) - 'A']);
            if (right - left + 1 - maxFreq > k) {
                counts[s.charAt(left) - 'A']--;
                left++;
            }
        }
        return s.length() - left;
    }
}`,
    cpp: `class Solution {
public:
    int characterReplacement(string s, int k) {
        int counts[26] = {0};
        int left = 0, maxFreq = 0, n = s.size();
        for (int right = 0; right < n; right++) {
            maxFreq = max(maxFreq, ++counts[s[right] - 'A']);
            if (right - left + 1 - maxFreq > k) {
                counts[s[left] - 'A']--;
                left++;
            }
        }
        return n - left;
    }
};`,
    go: `func characterReplacement(s string, k int) int {
	var counts [26]int
	left, maxFreq := 0, 0
	for right := 0; right < len(s); right++ {
		counts[s[right]-'A']++
		if counts[s[right]-'A'] > maxFreq {
			maxFreq = counts[s[right]-'A']
		}
		if right-left+1-maxFreq > k {
			counts[s[left]-'A']--
			left++
		}
	}
	return len(s) - left
}`,
    typescript: `function characterReplacement(s: string, k: number): number {
  const counts = new Array<number>(26).fill(0);
  let left = 0;
  let maxFreq = 0;
  for (let right = 0; right < s.length; right++) {
    const idx = s.charCodeAt(right) - 65;
    maxFreq = Math.max(maxFreq, ++counts[idx]);
    if (right - left + 1 - maxFreq > k) {
      counts[s.charCodeAt(left) - 65]--;
      left++;
    }
  }
  return s.length - left;
}`,
  },
};
