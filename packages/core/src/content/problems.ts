import type { Problem } from "./types";

/**
 * Card-flip IDE problems: Stage 1 invariant, Stage 2 edge-case trap, Stage 3 code.
 * Inputs and outputs are JSON-only; references in both languages are verified by
 * test/content.test.ts (JS in-process, Python via Pyodide). Python starters are
 * top-level functions, although the harness also accepts a LeetCode Solution class.
 */
export const PROBLEMS: Problem[] = [
  // ---------------------------------------------------------------- sliding window
  {
    id: "p-longest-substring-without-repeating",
    title: "Longest Substring Without Repeating Characters",
    leetcodeSlug: "longest-substring-without-repeating-characters",
    difficulty: "medium",
    tags: ["sliding_window", "hashing", "string", "two_pointers"],
    statement: `Given a string \`s\`, return the length of the **longest substring** that contains no repeated characters.

A substring is a contiguous, non-empty sequence of characters within the string.`,
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"', output: "1", explanation: 'The answer is "b", with length 1.' },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke". "pwke" is a subsequence, not a substring.',
      },
    ],
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces.",
    ],
    stages: {
      invariant: {
        prompt:
          "🪟 Longest Substring Without Repeating Characters: what invariant does your sliding window keep, and how do you restore it when s[right] is already inside the window? Reply in 1-2 sentences.",
        answerKey:
          "The window s[left..right] never contains a repeated character. Keep a hash map of each character's last index; when s[right] was last seen at an index >= left, jump left to lastSeen[s[right]] + 1, then record the window length. Each index enters and leaves once, so O(n).",
        keyPoints: [
          {
            label: "Window has no repeated characters",
            anyOf: [
              // Not "without repeating": that is the problem title in the prompt.
              "no duplicate",
              "no duplicates",
              "no duplicate character",
              "never has a duplicate",
              "no repeat",
              "no repeated",
              "never contains a repeat",
              "never repeats",
              "at most once",
              "appears once",
              "each character once",
              "unique",
              "distinct",
              "all different",
            ],
          },
          {
            label: "Map each character to its last index",
            anyOf: ["last seen", "last index", "last position", "hash map", "hashmap", "map each char", "map of char", "char map", "map char", "map to last", "map to its last", "dict", "dictionary", "set"],
          },
          {
            label: "Move left just past the previous occurrence",
            anyOf: [
              "move left",
              "jump left",
              "shrink",
              "last seen + 1",
              "lastseen + 1",
              "previous occurrence",
              "past the duplicate",
              "jump past",
              "left = max",
              "max(left",
              "last[c] + 1",
            ],
          },
        ],
        hint: "What must be true of every window you measure? When a new character breaks it, where is the earliest valid left edge?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: with a last-seen map, why must you write left = max(left, last[c] + 1) instead of left = last[c] + 1? Give an input where the naive version fails. Reply in 1-2 sentences.",
        answerKey:
          'The map keeps stale indices from before the window, so without max the left edge can jump backwards and re-admit duplicates. On "abba", at the final a last[a] = 0, so the naive update moves left from 2 back to 1 and reports 3 instead of 2.',
        keyPoints: [
          {
            label: "Map holds stale indices from before the window",
            anyOf: ["stale", "outside the window", "before left", "old index", "previous window", "already passed", "out of date"],
          },
          {
            label: "Left must never move backwards",
            anyOf: ["backward", "backwards", "move back", "never decrease", "goes back", "monotonic"],
          },
          {
            label: 'Counterexample such as "abba"',
            anyOf: ["abba", "tmmzuxt"],
          },
        ],
        hint: 'Trace "abba" by hand. Where is left when you reach the final a, and where does last[a] point?',
      },
      code: {
        functionName: "lengthOfLongestSubstring",
        params: ["s"],
        signature: { params: ["string"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Your code here
  return 0;
}
`,
          python: `def lengthOfLongestSubstring(s: str) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) {
      left = lastSeen.get(ch) + 1;
    }
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
          python: `def lengthOfLongestSubstring(s: str) -> int:
    last_seen = {}
    left = best = 0
    for right, ch in enumerate(s):
        if last_seen.get(ch, -1) >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best
`,
        },
        tests: [
          { args: ["abcabcbb"], expected: 3 },
          { args: ["bbbbb"], expected: 1 },
          { args: ["pwwkew"], expected: 3 },
          { args: [""], expected: 0 },
          { args: [" "], expected: 1 },
          { args: ["dvdf"], expected: 3 },
          { args: ["abba"], expected: 2, hidden: true },
          { args: ["tmmzuxt"], expected: 5, hidden: true },
          { args: ["abcdefghijklmnopqrstuvwxyz".repeat(3)], expected: 26, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["sliding_window", "hashing"],
    relatedCardIds: ["mc-sliding-window-shrink-condition", "mc-char-replacement-window"],
  },
  {
    id: "p-minimum-window-substring",
    title: "Minimum Window Substring",
    leetcodeSlug: "minimum-window-substring",
    difficulty: "hard",
    tags: ["sliding_window", "hashing", "string", "two_pointers"],
    statement: `Given two strings \`s\` and \`t\`, return the **minimum window substring** of \`s\` such that every character in \`t\` (**including duplicates**) is included in the window. If there is no such substring, return the empty string \`""\`.

The test cases are generated so that the answer is unique.`,
    examples: [
      {
        input: 's = "ADOBECODEBANC", t = "ABC"',
        output: '"BANC"',
        explanation: '"BANC" is the shortest window that contains A, B and C.',
      },
      { input: 's = "a", t = "a"', output: '"a"', explanation: "The whole string is the minimum window." },
      {
        input: 's = "a", t = "aa"',
        output: '""',
        explanation: "t needs two a's but s has only one, so no window exists.",
      },
    ],
    constraints: [
      "m == s.length, n == t.length",
      "1 <= m, n <= 10^5",
      "s and t consist of uppercase and lowercase English letters.",
      "Aim for O(m + n) time.",
    ],
    stages: {
      invariant: {
        prompt:
          "🔍 Minimum Window Substring: when is the window s[left..right] valid, how do you check validity in O(1) per step, and when do you move left? Reply in 1-2 sentences.",
        answerKey:
          "The window is valid when it covers every character of t, including duplicates. Keep a need count per character plus a missing counter that drops when a still-needed character enters; when missing hits 0, shrink left while the window stays valid, recording the smallest window, then keep expanding right. Total O(m + n).",
        keyPoints: [
          {
            label: "Valid means it covers all of t, with multiplicity",
            anyOf: [
              "every character of t",
              "every char of t",
              "all characters of t",
              "all chars of t",
              "all of t",
              "covers t",
              "contains t",
              "including duplicates",
              "with multiplicity",
              "enough of each",
              "counts of t",
            ],
          },
          {
            label: "O(1) check via a missing/formed counter",
            anyOf: [
              "missing",
              "formed",
              "counter",
              "need count",
              "satisfied",
              "have == need",
              "matched count",
              "required",
              "remaining",
            ],
          },
          {
            label: "Shrink left while still valid",
            anyOf: ["shrink", "move left", "contract", "while valid", "stays valid", "still valid", "advance left", "increment left"],
          },
          {
            label: "Record the smallest valid window",
            anyOf: ["smallest", "minimum", "shortest", "min length", "min window", "keep the min", "track the min", "update the min", "best window", "record"],
          },
        ],
        hint: "Grow the window until it first becomes valid. Once it is valid, is there any reason to keep growing before trying to shrink? And how can one integer tell you whether it is valid?",
      },
      edgeCase: {
        prompt:
          '⚠️ Trap check: t can repeat letters (t = "aab"). Why does tracking a set of t\'s letters fail, and when you drop s[left], exactly when should your missing count go back up? Reply in 1-2 sentences.',
        answerKey:
          'A set ignores multiplicity, so a window with one a looks like it covers "aab"; you need per-character counts. Dropping s[left] only breaks validity when its count goes back above zero, meaning it was a required copy rather than a surplus one; if no window is ever valid, return the empty string.',
        keyPoints: [
          {
            label: "Need per-character counts, not a set",
            anyOf: ["multiplicity", "count", "counts", "frequency", "frequencies", "counter", "hash map", "hashmap", "dict", "how many"],
          },
          {
            label: "Only a required copy (not a surplus one) breaks validity",
            anyOf: [
              "surplus",
              "extra",
              "more than needed",
              "above zero",
              "greater than zero",
              "positive",
              "required copy",
              "needed copy",
              "still needed",
            ],
          },
          {
            label: "No valid window means the empty string",
            anyOf: ["empty string", "return empty", "no valid window", "no window", "empty"],
          },
        ],
        hint: 'Picture s = "aaab" with t = "ab". When the first a leaves the window, is the window any less valid?',
      },
      code: {
        functionName: "minWindow",
        params: ["s", "t"],
        signature: { params: ["string", "string"], returns: "string" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
function minWindow(s, t) {
  // Your code here
  return "";
}
`,
          python: `def minWindow(s: str, t: str) -> str:
    # Your code here
    return ""
`,
        },
        reference: {
          javascript: `function minWindow(s, t) {
  if (t.length === 0 || t.length > s.length) return "";
  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) || 0) + 1);
  let missing = t.length;
  let bestStart = 0;
  let bestLen = Infinity;
  let left = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (need.has(ch)) {
      if (need.get(ch) > 0) missing--;
      need.set(ch, need.get(ch) - 1);
    }
    while (missing === 0) {
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      if (need.has(out)) {
        need.set(out, need.get(out) + 1);
        if (need.get(out) > 0) missing++;
      }
      left++;
    }
  }
  return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen);
}
`,
          python: `from collections import Counter


def minWindow(s: str, t: str) -> str:
    if not t or len(t) > len(s):
        return ""
    need = Counter(t)
    missing = len(t)
    best_start, best_len = 0, float("inf")
    left = 0
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        while missing == 0:
            if right - left + 1 < best_len:
                best_start, best_len = left, right - left + 1
            out = s[left]
            need[out] += 1
            if need[out] > 0:
                missing += 1
            left += 1
    return "" if best_len == float("inf") else s[best_start:best_start + best_len]
`,
        },
        tests: [
          { args: ["ADOBECODEBANC", "ABC"], expected: "BANC" },
          { args: ["a", "a"], expected: "a" },
          { args: ["a", "aa"], expected: "" },
          { args: ["ab", "b"], expected: "b" },
          { args: ["abc", "d"], expected: "" },
          { args: ["aa", "aa"], expected: "aa" },
          { args: ["bba", "ab"], expected: "ba" },
          { args: ["acbbaca", "aba"], expected: "baca", hidden: true },
          { args: ["cabwefgewcwaefgcf", "cae"], expected: "cwae", hidden: true },
          { args: ["aaflslflsldkalskaaa", "aaa"], expected: "aaa", hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["sliding_window", "hashing"],
    relatedCardIds: ["mc-min-window-substring", "mc-sliding-window-shrink-condition"],
  },

  // ---------------------------------------------------------------- two pointers
  {
    id: "p-3sum",
    title: "3Sum",
    leetcodeSlug: "3sum",
    difficulty: "medium",
    tags: ["two_pointers", "sorting", "arrays"],
    statement: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i\`, \`j\` and \`k\` are distinct indices and \`nums[i] + nums[j] + nums[k] == 0\`.

The solution set **must not contain duplicate triplets**. You may return the triplets in any order, and the numbers inside each triplet in any order.`,
    examples: [
      {
        input: "nums = [-1,0,1,2,-1,-4]",
        output: "[[-1,-1,2],[-1,0,1]]",
        explanation: "The distinct zero-sum triplets are [-1,0,1] and [-1,-1,2]; [-1,0,1] counts once even though two different -1s can form it.",
      },
      { input: "nums = [0,1,1]", output: "[]", explanation: "No triplet sums to 0." },
      { input: "nums = [0,0,0]", output: "[[0,0,0]]", explanation: "The only triplet sums to 0." },
    ],
    constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
    stages: {
      invariant: {
        prompt:
          "🎯 3Sum: after sorting, you fix nums[i] and look for pairs to its right that sum to -nums[i]. How do the two pointers move, why is each move safe, and what's the total complexity? Reply in 1-2 sentences.",
        answerKey:
          "Sort, then for each i put lo at i+1 and hi at the end: if the sum is too small move lo right, if too big move hi left, and on a hit record it and move both. Sorted order means each move discards a value that can never pair with the other pointer, so each i costs O(n) and the total is O(n^2).",
        keyPoints: [
          {
            // The prompt already gives "after sorting"; what it asks is why each pointer move is safe.
            label: "Each move is safe: the discarded value can never pair",
            anyOf: [
              "can never pair",
              "never pair",
              "can't pair",
              "cannot pair",
              "never form",
              "can't form",
              "cannot form",
              "no partner",
              "can't be part of",
              "never be part of",
              "can never be used",
              "no longer useful",
              "discard",
              "eliminate",
              "rule out",
              "ruled out",
              "can't work",
              "can never work",
              "drops a value",
              "too small for any",
              "too big for any",
              "too large for any",
              "no valid pair",
              "sorted order",
            ],
          },
          {
            label: "Too small: move lo right. Too big: move hi left",
            anyOf: [
              "too small",
              "too big",
              "too large",
              "less than 0",
              "less than zero",
              "greater than 0",
              "greater than zero",
              "move lo",
              "move hi",
              "move left pointer",
              "move right pointer",
              "move l",
              "move r",
              "increment l",
              "decrement r",
              "left pointer right",
              "right pointer left",
            ],
          },
          {
            label: "O(n^2) total",
            anyOf: ["o(n^2)", "o(n2)", "n^2", "n squared", "quadratic"],
          },
        ],
        hint: "In a sorted array, if nums[lo] + nums[hi] is too small, can nums[lo] ever work with any pointer to the left of hi?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [-2,0,0,2,2]. How do you avoid returning [-2,0,2] twice without a set of tuples? Say what you skip and where. Reply in 1-2 sentences.",
        answerKey:
          "Skip duplicates at both levels: skip i when nums[i] equals nums[i-1], and after recording a triplet advance lo past equal values (and hi likewise). Because the array is sorted, equal values are adjacent, so this dedupes in O(1) extra space.",
        keyPoints: [
          {
            label: "Skip a repeated anchor i",
            anyOf: [
              "skip i",
              "nums[i] equals nums[i-1]",
              "nums[i] == nums[i-1]",
              "nums[i] == nums[i - 1]",
              "same as the previous",
              "equals the previous",
              "skip duplicate",
              "skip duplicates",
              "skip the same",
              "skip repeated",
            ],
          },
          {
            label: "After a hit, move lo/hi past equal values",
            anyOf: [
              "advance lo",
              "move lo past",
              "lo and hi",
              "l and r",
              "move l",
              "move r",
              "both pointers",
              "inner pointers",
              "while nums[lo]",
              "while nums[l]",
              "while nums[r]",
              "past equal",
              "past duplicates",
              "past repeats",
              "after recording",
              "after a hit",
              "after a match",
              "after a triplet",
              "after finding",
            ],
          },
          {
            label: "Sorting makes duplicates adjacent",
            anyOf: ["adjacent", "next to each other", "consecutive", "grouped together", "side by side"],
          },
        ],
        hint: "Sorted, the array is [-2,0,0,2,2]. Where do the repeated values sit relative to each other, and which pointers could land on them?",
      },
      code: {
        functionName: "threeSum",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "list<list<int>>" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function threeSum(nums) {
  // Your code here
  return [];
}
`,
          python: `def threeSum(nums: List[int]) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function threeSum(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const n = sorted.length;
  const result = [];
  for (let i = 0; i < n - 2; i++) {
    if (sorted[i] > 0) break;
    if (i > 0 && sorted[i] === sorted[i - 1]) continue;
    let lo = i + 1;
    let hi = n - 1;
    while (lo < hi) {
      const sum = sorted[i] + sorted[lo] + sorted[hi];
      if (sum < 0) {
        lo++;
      } else if (sum > 0) {
        hi--;
      } else {
        result.push([sorted[i], sorted[lo], sorted[hi]]);
        lo++;
        hi--;
        while (lo < hi && sorted[lo] === sorted[lo - 1]) lo++;
        while (lo < hi && sorted[hi] === sorted[hi + 1]) hi--;
      }
    }
  }
  return result;
}
`,
          python: `from typing import List


def threeSum(nums: List[int]) -> List[List[int]]:
    nums = sorted(nums)
    n = len(nums)
    result = []
    for i in range(n - 2):
        if nums[i] > 0:
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, n - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total < 0:
                lo += 1
            elif total > 0:
                hi -= 1
            else:
                result.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                hi -= 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
                while lo < hi and nums[hi] == nums[hi + 1]:
                    hi -= 1
    return result
`,
        },
        tests: [
          { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]] },
          { args: [[0, 1, 1]], expected: [] },
          { args: [[0, 0, 0]], expected: [[0, 0, 0]] },
          { args: [[-2, 0, 0, 2, 2]], expected: [[-2, 0, 2]] },
          { args: [[1, 2, 3]], expected: [] },
          { args: [[-1, 0, 1, 0]], expected: [[-1, 0, 1]] },
          { args: [[0, 0, 0, 0]], expected: [[0, 0, 0]], hidden: true },
          { args: [[3, 0, -2, -1, 1, 2]], expected: [[-2, -1, 3], [-2, 0, 2], [-1, 0, 1]], hidden: true },
          {
            args: [[-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]],
            expected: [
              [-4, -2, 6],
              [-4, 0, 4],
              [-4, 1, 3],
              [-4, 2, 2],
              [-2, -2, 4],
              [-2, 0, 2],
            ],
            hidden: true,
          },
        ],
        compare: "unordered-nested",
      },
    },
    weakTags: ["two_pointers", "sorting"],
    relatedCardIds: ["mc-three-sum-dedup", "mc-two-pointers-sorted-two-sum"],
  },
  {
    id: "p-trapping-rain-water",
    title: "Trapping Rain Water",
    leetcodeSlug: "trapping-rain-water",
    difficulty: "hard",
    tags: ["two_pointers", "monotonic_stack", "stack", "arrays", "dp_1d"],
    statement: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

Water above a bar is held in place by the tallest bar to its left and the tallest bar to its right.`,
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "6 units of water collect in the dips between the bars.",
      },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
    stages: {
      invariant: {
        prompt:
          "🌧️ Trapping Rain Water with two pointers: how much water sits above index i, and why is it safe to settle the side whose running max is smaller? Give time and space. Reply in 1-2 sentences.",
        answerKey:
          "Water above i is min(maxLeft, maxRight) - height[i]. If leftMax < rightMax, the right side is guaranteed a wall at least that tall, so the left bar holds exactly leftMax - height[left]; settle it and move left inward (mirror for the right), for O(n) time and O(1) space.",
        keyPoints: [
          {
            label: "Water = min(max left, max right) - height[i]",
            anyOf: [
              "min(maxleft, maxright)",
              "min(leftmax, rightmax)",
              "min(left max, right max)",
              "min of the max",
              "min of the two max",
              "minimum of the tallest",
              "shorter of the two walls",
              "minus height",
              "minus the height",
            ],
          },
          {
            label: "Settle the side with the smaller max",
            anyOf: ["smaller", "lower", "leftmax < rightmax", "the smaller side", "smaller max", "shorter side", "less than"],
          },
          {
            label: "The other side is guaranteed a wall at least as tall",
            anyOf: [
              "at least as tall",
              "at least that tall",
              "taller wall",
              "guaranteed",
              "bounded by",
              "bounds",
              "limited by",
              "other side has",
              "bottleneck",
            ],
          },
          {
            label: "O(n) time, O(1) space",
            anyOf: ["o(1) space", "constant space", "o(1)", "o(n)", "linear", "one pass", "single pass"],
          },
        ],
        hint: "The water at a bar is capped by the shorter of its two tallest walls. If you already know one side's wall beats the other side's best so far, which side's water is fully determined?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: how much water do [5,4,3,2,1], [3,3,3], or fewer than 3 bars trap? Why can the first and last bars never hold water? Reply in 1-2 sentences.",
        answerKey:
          "Zero for all of them: water needs a taller wall on both sides, and a monotonic array, a flat array, or fewer than 3 bars has no such bar. The edge bars have no wall on one side, and because the running maxes include height[i] itself, min(...) - height[i] is never negative.",
        keyPoints: [
          {
            label: "They all trap 0",
            // Phrases must cover every case: a lone "0" or "nothing" can come from one sub-case.
            anyOf: [
              "zero for all",
              "0 for all",
              "all zero",
              "all 0",
              "all trap 0",
              "all trap zero",
              "all trap nothing",
              "they all trap",
              "none of them",
              "none trap",
              "all three",
              "all of them",
              "any of them",
              "every case",
              "all cases",
              "each case",
              "each traps 0",
              "they trap 0",
              "they trap zero",
              "they trap nothing",
              "they trap no water",
              "no water in any",
            ],
          },
          {
            label: "Water needs a taller wall on both sides; edge bars lack one",
            anyOf: [
              "both sides",
              "each side",
              "either side",
              "left and right",
              "walls on both",
              "one side",
              "no wall",
              "no left wall",
              "no right wall",
              "nothing to hold",
            ],
          },
        ],
        hint: "For water to sit on a bar, what must exist on its left and on its right? Which bars can never have both?",
      },
      code: {
        functionName: "trap",
        params: ["height"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
  // Your code here
  return 0;
}
`,
          python: `def trap(height: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left <= right) {
    leftMax = Math.max(leftMax, height[left]);
    rightMax = Math.max(rightMax, height[right]);
    if (leftMax < rightMax) {
      water += leftMax - height[left];
      left++;
    } else {
      water += rightMax - height[right];
      right--;
    }
  }
  return water;
}
`,
          python: `from typing import List


def trap(height: List[int]) -> int:
    left, right = 0, len(height) - 1
    left_max = right_max = water = 0
    while left <= right:
        left_max = max(left_max, height[left])
        right_max = max(right_max, height[right])
        if left_max < right_max:
            water += left_max - height[left]
            left += 1
        else:
            water += right_max - height[right]
            right -= 1
    return water
`,
        },
        tests: [
          { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
          { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
          { args: [[1]], expected: 0 },
          { args: [[2, 0, 2]], expected: 2 },
          { args: [[5, 4, 3, 2, 1]], expected: 0 },
          { args: [[3, 3, 3]], expected: 0 },
          { args: [[4, 2, 3]], expected: 1 },
          { args: [[5, 2, 1, 2, 1, 5]], expected: 14, hidden: true },
          { args: [[0, 7, 1, 4, 6]], expected: 7, hidden: true },
          { args: [[1, 2, 3, 4, 3, 2, 1]], expected: 0, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["two_pointers", "monotonic_stack"],
    relatedCardIds: ["mc-trapping-rain-water-two-pointers", "mc-container-most-water"],
  },

  // ---------------------------------------------------------------- monotonic stack
  {
    id: "p-daily-temperatures",
    title: "Daily Temperatures",
    leetcodeSlug: "daily-temperatures",
    difficulty: "medium",
    tags: ["monotonic_stack", "stack"],
    statement: `Given an array of integers \`temperatures\` representing daily temperatures, return an array \`answer\` such that \`answer[i]\` is the number of days you have to wait after day \`i\` to get a **strictly warmer** temperature.

If there is no future day that is warmer, set \`answer[i] = 0\`.`,
    examples: [
      { input: "temperatures = [73,74,75,71,69,72,76,73]", output: "[1,1,4,2,1,1,0,0]" },
      { input: "temperatures = [30,40,50,60]", output: "[1,1,1,0]" },
      { input: "temperatures = [30,60,90]", output: "[1,1,0]" },
    ],
    constraints: ["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100", "Aim for O(n) time."],
    stages: {
      invariant: {
        prompt:
          "🌡️ Daily Temperatures in O(n): what does your stack hold, what order does it keep, and what happens when today is warmer than the top? Reply in 1-2 sentences.",
        answerKey:
          "The stack holds indices of days still waiting for a warmer day, with temperatures decreasing from bottom to top. While today is warmer than the top, pop index j and set answer[j] = i - j, then push i; each index is pushed and popped once, so O(n).",
        keyPoints: [
          {
            label: "Stack holds indices still waiting",
            anyOf: ["indices", "index", "indexes", "waiting", "unresolved", "unanswered", "not yet found"],
          },
          {
            label: "Temperatures decrease from bottom to top",
            anyOf: ["decreasing", "descending", "non-increasing", "monotonic", "monotone"],
          },
          {
            label: "Pop while warmer; answer[j] = i - j",
            anyOf: ["i - j", "i-j", "index difference", "difference", "distance", "pop while", "pop them", "pop the top"],
          },
          {
            label: "O(n): each index pushed and popped once",
            anyOf: ["o(n)", "linear", "pushed and popped once", "popped once", "amortized"],
          },
        ],
        hint: "Which days are still waiting for their answer? When a hot day shows up, which of the waiting days does it resolve, and in what order?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: temperatures = [70,70,71]. Should an equal temperature pop the stack? And what ends up in answer for days that never get warmer? Reply in 1-2 sentences.",
        answerKey:
          "No: pop only when today is strictly warmer, because an equal day is not warmer, so [70,70,71] gives [2,1,0]. Days still on the stack at the end never saw a warmer day and keep the default 0.",
        keyPoints: [
          {
            label: "Pop only on strictly warmer (equal does not pop)",
            anyOf: [
              "strictly",
              "equal is not warmer",
              "not warmer",
              "equal does not",
              "equal doesn't",
              "don't pop on equal",
              "do not pop on equal",
              "greater than, not",
              "[2,1,0]",
            ],
          },
          {
            label: "Unresolved days keep 0",
            anyOf: ["0", "zero", "default", "left on the stack", "still on the stack", "remain on the stack"],
          },
        ],
        hint: "The problem says strictly warmer. Trace the first 70 when the second 70 arrives: has its question been answered?",
      },
      code: {
        functionName: "dailyTemperatures",
        params: ["temperatures"],
        signature: { params: ["int[]"], returns: "int[]" },
        starter: {
          javascript: `/**
 * @param {number[]} temperatures
 * @return {number[]}
 */
function dailyTemperatures(temperatures) {
  // Your code here
  return [];
}
`,
          python: `def dailyTemperatures(temperatures: List[int]) -> List[int]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0);
  const stack = [];
  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const j = stack.pop();
      answer[j] = i - j;
    }
    stack.push(i);
  }
  return answer;
}
`,
          python: `from typing import List


def dailyTemperatures(temperatures: List[int]) -> List[int]:
    answer = [0] * len(temperatures)
    stack = []
    for i, temp in enumerate(temperatures):
        while stack and temp > temperatures[stack[-1]]:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
`,
        },
        tests: [
          { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
          { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
          { args: [[30, 60, 90]], expected: [1, 1, 0] },
          { args: [[50]], expected: [0] },
          { args: [[90, 80, 70]], expected: [0, 0, 0] },
          { args: [[55, 38, 53, 81, 61, 93, 97, 32, 43, 78]], expected: [3, 1, 1, 2, 1, 1, 0, 1, 1, 0] },
          { args: [[70, 70, 71]], expected: [2, 1, 0], hidden: true },
          { args: [[89, 62, 70, 58, 47, 47, 46, 76, 100, 70]], expected: [8, 1, 5, 4, 3, 2, 1, 1, 0, 0], hidden: true },
          { args: [[40, 40, 40, 40]], expected: [0, 0, 0, 0], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["monotonic_stack"],
    relatedCardIds: ["mc-monotonic-stack-next-warmer", "mc-next-greater-circular"],
  },

  // ---------------------------------------------------------------- binary search
  {
    id: "p-search-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    leetcodeSlug: "search-in-rotated-sorted-array",
    difficulty: "medium",
    tags: ["binary_search", "arrays"],
    statement: `An integer array \`nums\` sorted in ascending order with **distinct** values was possibly rotated at an unknown pivot, e.g. \`[0,1,2,4,5,6,7]\` might become \`[4,5,6,7,0,1,2]\`.

Given \`nums\` after the possible rotation and an integer \`target\`, return the index of \`target\` in \`nums\`, or \`-1\` if it is not present.

You must write an algorithm with **O(log n)** runtime complexity.`,
    examples: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", output: "-1" },
      { input: "nums = [1], target = 0", output: "-1" },
    ],
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i], target <= 10^4",
      "All values of nums are unique.",
      "nums is an ascending array that is possibly rotated.",
    ],
    stages: {
      invariant: {
        prompt:
          "🔄 Search in Rotated Sorted Array in O(log n): what is always true about the two halves around mid, and how do you use it to pick which half to search? Reply in 1-2 sentences.",
        answerKey:
          "At least one half around mid is always sorted: if nums[lo] <= nums[mid] the left half is sorted, otherwise the right half is. If target lies inside the sorted half's range search that half, otherwise search the other half, which keeps it O(log n).",
        keyPoints: [
          {
            label: "One half is always sorted",
            anyOf: [
              "at least one half",
              "one half is sorted",
              "one half is always sorted",
              "one side is sorted",
              "half is sorted",
              "half is always sorted",
              "sorted half",
              "sorted side",
              "side is sorted",
              "side is always sorted",
              "left half is sorted",
              "right half is sorted",
              "left is sorted",
              "right is sorted",
            ],
          },
          {
            label: "Compare nums[lo] with nums[mid] to find it",
            anyOf: [
              "nums[lo] <= nums[mid]",
              "nums[left] <= nums[mid]",
              "nums[l] <= nums[m]",
              "nums[mid] >= nums[lo]",
              "compare nums[lo]",
              "compare the left end",
              "compare mid with",
              "compare with nums[lo]",
            ],
          },
          {
            label: "Go into the sorted half only if target is in its range",
            anyOf: [
              "inside",
              "in range",
              "within the range",
              "within its range",
              "lies in",
              "between",
              "target is in",
              // Symbolic range tests anchored on an endpoint. Not "target < nums[mid]" / "nums[mid] < target": with
              // operators dropped they match "nums[mid] == target" and the plain binary-search "target > nums[mid]".
              "nums[lo] <= target",
              "nums[left] <= target",
              "nums[l] <= target",
              "target >= nums[lo]",
              "target >= nums[left]",
              "target <= nums[hi]",
              "target <= nums[right]",
              "target <= nums[r]",
              "nums[hi] >= target",
            ],
          },
        ],
        hint: "Rotation creates exactly one drop. If you split at mid, can both halves contain that drop?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [3,1], target = 1. Why must the sorted-left test be nums[lo] <= nums[mid] rather than nums[lo] < nums[mid]? Walk through what goes wrong. Reply in 1-2 sentences.",
        answerKey:
          "With two elements lo == mid, so nums[lo] equals nums[mid] and that one-element left half is sorted. A strict < wrongly treats the right half as sorted, rules the target out of it, and returns -1 for [3,1] searching 1.",
        keyPoints: [
          {
            label: "With two elements, lo == mid",
            anyOf: [
              "lo == mid",
              "lo equals mid",
              "mid == lo",
              "mid equals lo",
              "left == mid",
              "left equals mid",
              "two elements",
              "2 elements",
              "same index",
            ],
          },
          {
            label: "A one-element left half is sorted, so equality must count",
            anyOf: ["one element", "one-element", "single element", "equal", "equals", "is sorted", "counts as sorted"],
          },
          {
            label: "Strict < picks the wrong half and returns -1",
            anyOf: ["wrong half", "wrong side", "right half", "return -1", "returns -1", "misses", "skips the target", "not found"],
          },
        ],
        hint: "Compute mid for lo = 0, hi = 1. What are nums[lo] and nums[mid], and which half does each comparison declare sorted?",
      },
      code: {
        functionName: "search",
        params: ["nums", "target"],
        signature: { params: ["int[]", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  // Your code here
  return -1;
}
`,
          python: `def search(nums: List[int], target: int) -> int:
    # Your code here
    return -1
`,
        },
        reference: {
          javascript: `function search(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
`,
          python: `from typing import List


def search(nums: List[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
`,
        },
        tests: [
          { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
          { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
          { args: [[1], 0], expected: -1 },
          { args: [[1], 1], expected: 0 },
          { args: [[1, 3], 3], expected: 1 },
          { args: [[6, 7, 8, 1, 2, 3, 4, 5], 8], expected: 2 },
          { args: [[3, 1], 1], expected: 1, hidden: true },
          { args: [[5, 1, 3], 5], expected: 0, hidden: true },
          { args: [[1, 2, 3, 4, 5, 6], 4], expected: 3, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["binary_search"],
    relatedCardIds: ["mc-rotated-array-search", "mc-binary-search-lower-bound"],
  },

  // ---------------------------------------------------------------- heap / hashing
  {
    id: "p-top-k-frequent-elements",
    title: "Top K Frequent Elements",
    leetcodeSlug: "top-k-frequent-elements",
    difficulty: "medium",
    tags: ["heap", "hashing", "sorting"],
    statement: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in **any order**.

The test cases guarantee that the answer is unique. Follow-up: can you beat O(n log n), where n is the array's length?`,
    examples: [
      { input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" },
      { input: "nums = [1], k = 1", output: "[1]" },
      { input: "nums = [1,2,1,2,1,2,3,1,3,2], k = 2", output: "[1,2]" },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
      "k is in the range [1, the number of unique elements in the array].",
      "The answer is guaranteed to be unique.",
    ],
    stages: {
      invariant: {
        prompt:
          "📊 Top K Frequent Elements: after counting with a hash map, how do you get the top k without sorting every distinct value? Name the structure, what it keeps, and the complexity. Reply in 1-2 sentences.",
        answerKey:
          "Keep a min-heap of size k keyed by frequency: push each (count, value) and pop the smallest whenever it grows past k, so it always holds the k most frequent seen so far, for O(n log k). Or bucket sort by frequency (bucket index = count, at most n) and read from the highest bucket down for O(n).",
        keyPoints: [
          {
            label: "Count frequencies with a hash map",
            anyOf: ["hash map", "hashmap", "count map", "frequency map", "map of counts", "map counts", "dict", "counter", "count", "frequency", "frequencies"],
          },
          {
            label: "Min-heap capped at k, or buckets by frequency",
            anyOf: ["min-heap", "min heap", "heap", "heapq", "nlargest", "priority queue", "quickselect", "bucket sort", "buckets", "bucket"],
          },
          {
            label: "O(n log k) or O(n)",
            anyOf: ["o(n log k)", "n log k", "o(n)", "linear"],
          },
        ],
        hint: "If you only ever need k winners, what's the cheapest way to evict the weakest current winner? Alternatively, how big can a frequency possibly be?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [-1,-1,-1], k = 1. If you bucket by frequency, how many buckets do you allocate, and why can't you count with an array indexed by value? Reply in 1-2 sentences.",
        answerKey:
          "Frequencies run from 1 to n, so you need n + 1 buckets (index n when every value is the same) or you index out of bounds. Values can be negative, so count them in a hash map rather than an array indexed by value; the answer here is [-1].",
        keyPoints: [
          {
            label: "Frequency can reach n, so n + 1 buckets",
            // The grader reads operators, so "n + 1" no longer matches "n - 1", the exact bug this card targets.
            anyOf: [
              "n + 1",
              "n+1",
              "n plus one",
              "n plus 1",
              "one more than n",
              "up to n",
              "index n",
              "frequency can be n",
              "frequency can reach n",
              "count can be n",
              "count can reach n",
              "max frequency is n",
              "out of bounds",
              "off by one",
              "off-by-one",
            ],
          },
          {
            label: "Negative values need a hash map",
            anyOf: ["negative", "hash map", "hashmap", "dict", "counter", "count map", "map of counts", "map counts", "map to count", "map keyed"],
          },
        ],
        hint: "What is the largest count a single value can have in an array of length n? And what is nums[i] allowed to be?",
      },
      code: {
        functionName: "topKFrequent",
        params: ["nums", "k"],
        signature: { params: ["int[]", "int"], returns: "int[]" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
function topKFrequent(nums, k) {
  // Your code here
  return [];
}
`,
          python: `def topKFrequent(nums: List[int], k: int) -> List[int]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function topKFrequent(nums, k) {
  const counts = new Map();
  for (const value of nums) counts.set(value, (counts.get(value) || 0) + 1);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, count] of counts) buckets[count].push(value);
  const result = [];
  for (let freq = nums.length; freq > 0 && result.length < k; freq--) {
    for (const value of buckets[freq]) {
      if (result.length < k) result.push(value);
    }
  }
  return result;
}
`,
          python: `import heapq
from collections import Counter
from typing import List


def topKFrequent(nums: List[int], k: int) -> List[int]:
    heap = []
    for value, count in Counter(nums).items():
        heapq.heappush(heap, (count, value))
        if len(heap) > k:
            heapq.heappop(heap)
    return [value for _, value in heap]
`,
        },
        tests: [
          { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
          { args: [[1], 1], expected: [1] },
          { args: [[1, 2, 1, 2, 1, 2, 3, 1, 3, 2], 2], expected: [1, 2] },
          { args: [[-1, -1, -1], 1], expected: [-1] },
          { args: [[4, 1, -1, 2, -1, 2, 3], 2], expected: [-1, 2] },
          { args: [[1, 2], 2], expected: [1, 2] },
          { args: [[5, 3, 1, 1, 1, 3, 73, 1], 2], expected: [1, 3], hidden: true },
          { args: [[7, 7, 8, 8, 8, 9], 3], expected: [7, 8, 9], hidden: true },
          { args: [[3, 0, 1, 0], 1], expected: [0], hidden: true },
        ],
        compare: "unordered",
      },
    },
    weakTags: ["heap", "hashing"],
    relatedCardIds: ["mc-top-k-bucket-sort", "mc-heap-top-k-min-heap"],
  },

  // ---------------------------------------------------------------- intervals
  {
    id: "p-merge-intervals",
    title: "Merge Intervals",
    leetcodeSlug: "merge-intervals",
    difficulty: "medium",
    tags: ["intervals", "sorting", "arrays"],
    statement: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.

Intervals that touch (one ends where the next starts) count as overlapping. You may return the intervals in any order.`,
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "[1,3] and [2,6] overlap, so they merge into [1,6].",
      },
      { input: "intervals = [[1,4],[4,5]]", output: "[[1,5]]", explanation: "Touching intervals merge." },
      { input: "intervals = [[4,7],[1,4]]", output: "[[1,7]]", explanation: "The input is not necessarily sorted." },
    ],
    constraints: ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= start_i <= end_i <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "🧱 Merge Intervals: after sorting, what invariant does your output list keep, and what's the exact merge condition and update? Give the complexity. Reply in 1-2 sentences.",
        answerKey:
          "Sort by start; the output stays sorted and non-overlapping, so only its last interval can overlap the next one. If next start <= last end, set last end = max(last end, next end), otherwise append; O(n log n) for the sort.",
        keyPoints: [
          {
            label: "Sort by start",
            anyOf: ["sort by start", "sorted by start", "sort by the start", "sort on start", "by start time", "sort the intervals", "sort intervals"],
          },
          {
            label: "Only the last merged interval can overlap",
            anyOf: ["last interval", "last merged", "only the last", "the last one", "last end", "previous interval", "previous end", "prev end", "prev interval", "top of the output", "its last"],
          },
          {
            label: "Overlap when next start <= last end",
            anyOf: ["start <= last end", "start <= prev end", "start <= previous end", "start <= end", "start is less than or equal", "starts before", "overlap", "overlaps"],
          },
          {
            label: "Extend with max of the ends",
            anyOf: ["max(", "max of", "maximum end", "max end", "larger end", "the larger of"],
          },
          {
            label: "O(n log n)",
            anyOf: ["o(n log n)", "n log n", "nlogn"],
          },
        ],
        hint: "Once intervals are sorted by start, which previously merged interval is the only candidate to overlap the next one?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: intervals = [[1,10],[2,3],[4,5]]. What goes wrong if you merge with last end = next end, and do touching intervals like [1,4],[4,5] merge? Reply in 1-2 sentences.",
        answerKey:
          "Overwriting shrinks a containing interval: [1,10] then [2,3] becomes [1,3] and wrongly splits off [4,5], so take the max of the two ends. Touching intervals do merge because the condition is start <= end, giving [1,5].",
        keyPoints: [
          {
            label: "Overwriting shrinks a containing (nested) interval",
            anyOf: [
              "shrink",
              "shrinks",
              "contained",
              "containing",
              "nested",
              "swallowed",
              "fully covers",
              "becomes [1,3]",
              "into [1,3]",
              "inside [1,10]",
              "cuts off",
              "loses the end",
              "split off",
              "splits off",
            ],
          },
          {
            label: "Use the max of the ends",
            anyOf: ["max", "maximum", "larger of the two", "bigger end", "larger end"],
          },
          {
            label: "Touching intervals merge (<=, inclusive)",
            anyOf: ["do merge", "they merge", "touching intervals merge", "inclusive", "less than or equal", "start <= end", "[1,5]"],
          },
        ],
        hint: "Merge [1,10] with [2,3] by hand. Which end should survive, and does [4,5] still fall inside?",
      },
      code: {
        functionName: "merge",
        params: ["intervals"],
        signature: { params: ["int[][]"], returns: "int[][]" },
        starter: {
          javascript: `/**
 * @param {number[][]} intervals
 * @return {number[][]}
 */
function merge(intervals) {
  // Your code here
  return [];
}
`,
          python: `def merge(intervals: List[List[int]]) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function merge(intervals) {
  const sorted = intervals.map(([start, end]) => [start, end]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}
`,
          python: `from typing import List


def merge(intervals: List[List[int]]) -> List[List[int]]:
    merged = []
    for start, end in sorted(intervals, key=lambda interval: interval[0]):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
`,
        },
        tests: [
          { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
          { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
          { args: [[[4, 7], [1, 4]]], expected: [[1, 7]] },
          { args: [[[1, 4]]], expected: [[1, 4]] },
          { args: [[[1, 4], [0, 0]]], expected: [[0, 0], [1, 4]] },
          { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] },
          { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]], hidden: true },
          { args: [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]], expected: [[1, 10]], hidden: true },
          { args: [[[5, 5], [1, 2], [2, 2], [3, 4]]], expected: [[1, 2], [3, 4], [5, 5]], hidden: true },
        ],
        compare: "unordered",
      },
    },
    weakTags: ["intervals", "sorting"],
    relatedCardIds: ["mc-merge-intervals", "mc-insert-interval"],
  },

  // ---------------------------------------------------------------- graphs
  {
    id: "p-number-of-islands",
    title: "Number of Islands",
    leetcodeSlug: "number-of-islands",
    difficulty: "medium",
    tags: ["bfs", "dfs", "matrix", "union_find"],
    statement: `Given an \`m x n\` 2D grid of \`"1"\`s (land) and \`"0"\`s (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent land cells **horizontally or vertically** (not diagonally). You may assume all four edges of the grid are surrounded by water.`,
    examples: [
      {
        input: `grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]`,
        output: "1",
      },
      {
        input: `grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]`,
        output: "3",
      },
    ],
    constraints: ["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", 'grid[i][j] is "0" or "1".'],
    stages: {
      invariant: {
        prompt:
          "🏝️ Number of Islands: as you scan the grid, when do you increment the count, and what must your BFS/DFS do so an island is never counted twice? Give the complexity. Reply in 1-2 sentences.",
        answerKey:
          "Increment only when you hit an unvisited land cell, then flood fill from it with BFS or DFS over its 4 neighbors, marking every connected land cell visited (or sinking it to 0). Each cell is processed once, so O(m * n) time.",
        keyPoints: [
          {
            label: "Count at each unvisited land cell",
            anyOf: ["unvisited land", "unvisited 1", "unvisited cell", "new land", "new island", "not visited", "not seen", "unseen", "haven't seen", "find a 1", "hit a 1", "see a 1", "each 1", "every 1", "land cell"],
          },
          {
            label: "Flood fill marks the whole island",
            anyOf: ["flood fill", "flood-fill", "mark", "visited", "sink", "set to 0", "whole island", "connected component"],
          },
          {
            label: "Only 4-directional neighbors",
            anyOf: [
              "4 neighbors",
              "four neighbors",
              "4 directions",
              "four directions",
              "4-directional",
              "up down left right",
              "horizontally or vertically",
              "adjacent",
              "neighbors",
              "neighbours",
              "4-way",
              "connected land",
            ],
          },
          {
            label: "O(m * n)",
            anyOf: ["o(m * n)", "o(m*n)", "o(mn)", "m * n", "m*n", "mn", "rows * cols", "rows*cols", "r * c", "number of cells", "linear", "each cell once"],
          },
        ],
        hint: "Every island has some first cell you reach in row-major order. What should happen to the rest of that island before you continue scanning?",
      },
      edgeCase: {
        prompt:
          '⚠️ Trap check: the grid is 300 x 300, all "1". What can crash a recursive DFS here, and do diagonal 1s like [["1","0"],["0","1"]] form one island? Reply in 1-2 sentences.',
        answerKey:
          "A recursive DFS can go 90,000 calls deep and overflow the stack (Python's default recursion limit is about 1000), so use an explicit stack or a BFS queue. Diagonals do not connect since only up, down, left and right count, so that grid has 2 islands.",
        keyPoints: [
          {
            label: "Recursion depth can overflow the stack",
            anyOf: ["stack overflow", "overflow", "recursion limit", "recursion depth", "too deep", "call stack", "maximum call stack"],
          },
          {
            label: "Use an explicit stack or BFS queue",
            anyOf: ["iterative", "explicit stack", "bfs", "queue", "deque", "own stack"],
          },
          {
            label: "Diagonals don't connect: 2 islands",
            // Not a bare "diagonal": the prompt itself asks about diagonal 1s. Not a bare "2 islands" either: the grader
            // ignores negation, so it also credits "one island, not 2 islands"; each count is tied to a claim.
            anyOf: [
              "diagonals don't",
              "diagonals do not",
              "diagonal doesn't",
              "diagonal does not",
              "diagonals are not",
              "diagonals aren't",
              "diagonal 1s don't",
              "diagonal 1s do not",
              "not diagonal",
              "no diagonal",
              "has 2 islands",
              "is 2 islands",
              "it's 2 islands",
              "that's 2 islands",
              "so 2 islands",
              "no, 2 islands",
              "are 2 islands",
              "gives 2 islands",
              "form 2 islands",
              "makes 2 islands",
              "count 2 islands",
              "counts as 2 islands",
              "has two islands",
              "is two islands",
              "it's two islands",
              "that's two islands",
              "so two islands",
              "no, two islands",
              "are two islands",
              "gives two islands",
              "form two islands",
              "makes two islands",
              "count two islands",
              "counts as two islands",
              "separate islands",
              "not connected",
              "only 4 directions",
              "four directions",
              "4-directional",
              "up, down, left and right",
              "horizontal and vertical",
              "horizontally or vertically",
            ],
          },
        ],
        hint: "How deep does the call stack get if one DFS path snakes through every cell? And which neighbors does the problem statement say are adjacent?",
      },
      code: {
        functionName: "numIslands",
        params: ["grid"],
        signature: { params: ["char[][]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string[][]} grid - cells are "1" (land) or "0" (water)
 * @return {number}
 */
function numIslands(grid) {
  // Your code here
  return 0;
}
`,
          python: `def numIslands(grid: List[List[str]]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function numIslands(grid) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const seen = grid.map((row) => row.map(() => false));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r][c]) continue;
      count++;
      seen[r][c] = true;
      const queue = [[r, c]];
      for (let head = 0; head < queue.length; head++) {
        const [cr, cc] = queue[head];
        for (const [dr, dc] of dirs) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1" && !seen[nr][nc]) {
            seen[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
    }
  }
  return count;
}
`,
          python: `from collections import deque
from typing import List


def numIslands(grid: List[List[str]]) -> int:
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    seen = [[False] * cols for _ in range(rows)]
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or seen[r][c]:
                continue
            count += 1
            seen[r][c] = True
            queue = deque([(r, c)])
            while queue:
                cr, cc = queue.popleft()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and not seen[nr][nc]:
                        seen[nr][nc] = True
                        queue.append((nr, nc))
    return count
`,
        },
        tests: [
          {
            args: [
              [
                ["1", "1", "1", "1", "0"],
                ["1", "1", "0", "1", "0"],
                ["1", "1", "0", "0", "0"],
                ["0", "0", "0", "0", "0"],
              ],
            ],
            expected: 1,
          },
          {
            args: [
              [
                ["1", "1", "0", "0", "0"],
                ["1", "1", "0", "0", "0"],
                ["0", "0", "1", "0", "0"],
                ["0", "0", "0", "1", "1"],
              ],
            ],
            expected: 3,
          },
          { args: [[["0"]]], expected: 0 },
          { args: [[["1"]]], expected: 1 },
          { args: [[["1", "0", "1", "0", "1"]]], expected: 3 },
          {
            args: [
              [
                ["1", "1", "1"],
                ["0", "1", "0"],
                ["1", "1", "1"],
              ],
            ],
            expected: 1,
          },
          {
            args: [
              [
                ["1", "0"],
                ["0", "1"],
              ],
            ],
            expected: 2,
            hidden: true,
          },
          {
            args: [
              [
                ["1", "1", "1", "1", "1"],
                ["1", "0", "0", "0", "1"],
                ["1", "0", "1", "0", "1"],
                ["1", "0", "0", "0", "1"],
                ["1", "1", "1", "1", "1"],
              ],
            ],
            expected: 2,
            hidden: true,
          },
          {
            args: [
              [
                ["0", "0", "0"],
                ["0", "0", "0"],
              ],
            ],
            expected: 0,
            hidden: true,
          },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bfs", "dfs"],
    relatedCardIds: ["mc-multi-source-bfs", "mc-bfs-unweighted-shortest-path"],
  },
  {
    id: "p-course-schedule",
    title: "Course Schedule",
    leetcodeSlug: "course-schedule",
    difficulty: "medium",
    tags: ["topological_sort", "bfs", "dfs"],
    statement: `There are \`numCourses\` courses labeled \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where \`prerequisites[i] = [a_i, b_i]\` means you must take course \`b_i\` before course \`a_i\`.

Return \`true\` if you can finish all courses, otherwise return \`false\`.`,
    examples: [
      {
        input: "numCourses = 2, prerequisites = [[1,0]]",
        output: "true",
        explanation: "Take course 0, then course 1.",
      },
      {
        input: "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        output: "false",
        explanation: "Each course requires the other first: a cycle.",
      },
    ],
    constraints: [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= 5000",
      "prerequisites[i].length == 2",
      "0 <= a_i, b_i < numCourses",
      "All the pairs prerequisites[i] are unique.",
    ],
    stages: {
      invariant: {
        prompt:
          "🎓 Course Schedule with Kahn's algorithm: which courses start in the queue, when does a course join it, how do you know at the end whether there's a cycle, and what's the complexity? Reply in 1-2 sentences.",
        answerKey:
          "Build edges b -> a with indegree counts and start the queue with every course of indegree 0; when you pop a course, decrement each neighbor's indegree and enqueue any that hit 0. If the number of processed courses equals numCourses there is no cycle, otherwise the leftovers sit on a cycle, all in O(V + E).",
        keyPoints: [
          {
            label: "Seed the queue with indegree-0 courses",
            anyOf: [
              "indegree 0",
              "indegree zero",
              "indegree is 0",
              "indegree is zero",
              "indegree of 0",
              "indegree of zero",
              "in-degree 0",
              "in-degree zero",
              "in-degree is 0",
              "in-degree of 0",
              "in degree 0",
              "zero indegree",
              "0 indegree",
              "no prerequisites",
              "no prereqs",
              "no incoming",
              "no dependencies",
            ],
          },
          {
            label: "Decrement neighbors; enqueue when they hit 0",
            anyOf: ["decrement", "decrease", "reduce", "subtract", "hit 0", "hits 0", "reaches 0", "becomes 0", "drops to 0"],
          },
          {
            label: "Processed count == numCourses means no cycle",
            // Not "all courses" / "every course": seeding answers say "all courses with indegree 0".
            anyOf: [
              "processed",
              "processed count",
              "number processed",
              "processed all",
              "popped all",
              "pop all",
              "popped every",
              "equals numcourses",
              "== numcourses",
              "fewer than numcourses",
              "less than numcourses",
              "count equals",
              "count == numcourses",
              "visited all",
              "took all",
              "count == n",
            ],
          },
          {
            label: "O(V + E)",
            anyOf: ["o(v + e)", "o(v+e)", "v + e", "v+e", "linear"],
          },
        ],
        hint: "Which courses can you take on day one? After taking one, which other courses get closer to being takeable?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: what do you return for numCourses = 3 with no prerequisites, and for prerequisites = [[0,0]]? Why does starting a DFS only from course 0 miss cycles? Reply in 1-2 sentences.",
        answerKey:
          "No prerequisites means true, since every course has indegree 0. A self-loop [[0,0]] is a cycle, so false. The graph can be disconnected, so you must start from every unvisited course (Kahn's seeds all indegree 0 nodes), otherwise a cycle in another component is never seen.",
        keyPoints: [
          {
            label: "No prerequisites: true",
            // Each value is tied to its case: bare "true"/"false" also pass an answer that swaps them.
            anyOf: [
              "no prerequisites true",
              "no prerequisites is true",
              "no prerequisites means true",
              "no prerequisites returns true",
              "no prereqs true",
              "no prereqs is true",
              "no prereqs means true",
              "no prereqs returns true",
              "prerequisites means true",
              "true for no prerequisites",
              "true with no prerequisites",
              "true when there are no",
              "true if there are no",
              "true since every course",
              "true because every course",
              "every course has indegree 0",
              "all indegree 0",
              "can finish all",
              "trivially",
            ],
          },
          {
            label: "Self-loop is a cycle: false",
            anyOf: [
              "self loop is a cycle",
              "self loop means false",
              "self loop returns false",
              "self loop is false",
              "self loop false",
              "false for the self loop",
              "false for [[0,0]]",
              "[[0,0]] is a cycle",
              "[[0,0]] is false",
              "[[0,0]] returns false",
              "self loop, so false",
              "self loop, so it's false",
              "a cycle, so false",
              "a cycle, so it's false",
              "cycle of length 1",
              "depends on itself",
              "requires itself",
              "prerequisite of itself",
              "its own prerequisite",
            ],
          },
          {
            label: "Disconnected graph: start from every course",
            anyOf: [
              "disconnected",
              "every unvisited",
              "every course",
              "every node",
              "all nodes",
              "each course",
              "each component",
              "components",
              "unreachable from 0",
            ],
          },
        ],
        hint: "Draw [[1,0],[2,3],[3,2]] with 4 courses. Is the cycle reachable from course 0?",
      },
      code: {
        functionName: "canFinish",
        params: ["numCourses", "prerequisites"],
        signature: { params: ["int", "int[][]"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites - [course, prerequisite] pairs
 * @return {boolean}
 */
function canFinish(numCourses, prerequisites) {
  // Your code here
  return true;
}
`,
          python: `def canFinish(numCourses: int, prerequisites: List[List[int]]) -> bool:
    # Your code here
    return True
`,
        },
        reference: {
          javascript: `function canFinish(numCourses, prerequisites) {
  const indegree = new Array(numCourses).fill(0);
  const graph = Array.from({ length: numCourses }, () => []);
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
    indegree[course]++;
  }
  const queue = [];
  for (let course = 0; course < numCourses; course++) {
    if (indegree[course] === 0) queue.push(course);
  }
  let taken = 0;
  for (let head = 0; head < queue.length; head++) {
    const course = queue[head];
    taken++;
    for (const next of graph[course]) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  return taken === numCourses;
}
`,
          python: `from collections import deque
from typing import List


def canFinish(numCourses: int, prerequisites: List[List[int]]) -> bool:
    indegree = [0] * numCourses
    graph = [[] for _ in range(numCourses)]
    for course, pre in prerequisites:
        graph[pre].append(course)
        indegree[course] += 1
    queue = deque(course for course in range(numCourses) if indegree[course] == 0)
    taken = 0
    while queue:
        course = queue.popleft()
        taken += 1
        for nxt in graph[course]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return taken == numCourses
`,
        },
        tests: [
          { args: [2, [[1, 0]]], expected: true },
          { args: [2, [[1, 0], [0, 1]]], expected: false },
          { args: [3, []], expected: true },
          { args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true },
          { args: [5, [[1, 4], [2, 4], [3, 1], [3, 2]]], expected: true },
          { args: [3, [[0, 1], [0, 2], [1, 2]]], expected: true },
          { args: [1, [[0, 0]]], expected: false, hidden: true },
          { args: [4, [[1, 0], [2, 3], [3, 2]]], expected: false, hidden: true },
          { args: [3, [[1, 0], [2, 1], [0, 2]]], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["topological_sort"],
    relatedCardIds: ["mc-kahn-cycle-detection", "mc-dfs-directed-cycle-colors"],
  },

  // ---------------------------------------------------------------- dynamic programming
  {
    id: "p-coin-change",
    title: "Coin Change",
    leetcodeSlug: "coin-change",
    difficulty: "medium",
    tags: ["dp_1d", "dp_knapsack"],
    statement: `You are given an integer array \`coins\` of distinct denominations and an integer \`amount\`.

Return the **fewest number of coins** needed to make up \`amount\`. If that amount cannot be made up by any combination of the coins, return \`-1\`. You have an unlimited supply of each coin.`,
    examples: [
      { input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1" },
      { input: "coins = [2], amount = 3", output: "-1", explanation: "Only even amounts are reachable." },
      { input: "coins = [1], amount = 0", output: "0", explanation: "Zero coins make an amount of 0." },
    ],
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "🪙 Coin Change bottom-up: define dp[a], give the recurrence and the base case, and say why greedy (largest coin first) is wrong. Reply in 1-2 sentences.",
        answerKey:
          "dp[a] is the fewest coins that sum to a, with base case dp[0] = 0 and dp[a] = min over coins c <= a of dp[a - c] + 1, using infinity for unreachable amounts, in O(amount * coins). Greedy fails on coins [1,3,4] with amount 6: it takes 4+1+1 (3 coins) but 3+3 needs only 2.",
        keyPoints: [
          {
            label: "dp[a] = fewest coins summing to a",
            anyOf: ["fewest coins", "minimum coins", "min coins", "minimum number of coins", "min number of coins", "fewest number", "least coins"],
          },
          {
            label: "Recurrence: min of dp[a - c] + 1",
            anyOf: [
              "dp[a - c] + 1",
              "dp[a-c] + 1",
              "dp[a-c]+1",
              "dp[i - c] + 1",
              "dp[i - coin] + 1",
              "dp[i-coin]+1",
              "dp[amount - coin] + 1",
              "plus one",
            ],
          },
          {
            label: "Base case dp[0] = 0",
            anyOf: ["dp[0] = 0", "dp[0]=0", "dp[0] is 0", "base case 0", "zero coins for 0", "0 coins for 0"],
          },
          {
            label: "Greedy counterexample",
            anyOf: ["greedy fails", "[1,3,4]", "1,3,4", "3+3", "counterexample", "not optimal", "isn't optimal", "suboptimal"],
          },
        ],
        hint: "Suppose the last coin you use is c. What smaller subproblem is left, and what does it cost to finish from there?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: what should coinChange([1,2,5], 0) return, and what about coins = [2], amount = 3? How do you keep an unreachable sentinel from breaking dp[a - c] + 1? Reply in 1-2 sentences.",
        answerKey:
          "Amount 0 needs 0 coins, so return 0, not -1; that is the dp[0] = 0 base case. Amount 3 with only 2s is unreachable, so return -1. Use amount + 1 or infinity as the sentinel so adding 1 cannot overflow, and map it to -1 at the end.",
        keyPoints: [
          {
            label: "Amount 0 returns 0",
            anyOf: ["return 0", "returns 0", "0 coins", "zero coins", "is 0", "dp[0] = 0"],
          },
          {
            label: "Unreachable returns -1",
            anyOf: ["return -1", "returns -1", "unreachable", "impossible", "can't make", "cannot make", "negative one"],
          },
          {
            label: "Safe sentinel: amount + 1 or infinity",
            anyOf: ["amount + 1", "amount+1", "infinity", "inf", "sentinel", "overflow", "max value", "max int"],
          },
        ],
        hint: "How many coins does it take to pay nothing? And if you seed dp with INT_MAX, what happens when you add 1?",
      },
      code: {
        functionName: "coinChange",
        params: ["coins", "amount"],
        signature: { params: ["int[]", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  // Your code here
  return -1;
}
`,
          python: `def coinChange(coins: List[int], amount: int) -> int:
    # Your code here
    return -1
`,
        },
        reference: {
          javascript: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] + 1 < dp[a]) dp[a] = dp[a - coin] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
`,
          python: `from typing import List


def coinChange(coins: List[int], amount: int) -> int:
    unreachable = amount + 1
    dp = [0] + [unreachable] * amount
    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a and dp[a - coin] + 1 < dp[a]:
                dp[a] = dp[a - coin] + 1
    return -1 if dp[amount] == unreachable else dp[amount]
`,
        },
        tests: [
          { args: [[1, 2, 5], 11], expected: 3 },
          { args: [[2], 3], expected: -1 },
          { args: [[1], 0], expected: 0 },
          { args: [[1, 3, 4], 6], expected: 2 },
          { args: [[2, 5, 10, 1], 27], expected: 4 },
          { args: [[1], 2], expected: 2 },
          { args: [[5, 10], 0], expected: 0, hidden: true },
          { args: [[3, 7], 5], expected: -1, hidden: true },
          { args: [[186, 419, 83, 408], 6249], expected: 20, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_knapsack", "dp_1d"],
    relatedCardIds: ["mc-greedy-coin-change-fails", "mc-knapsack-combinations-vs-permutations"],
  },
  {
    id: "p-house-robber",
    title: "House Robber",
    leetcodeSlug: "house-robber",
    difficulty: "medium",
    tags: ["dp_1d"],
    statement: `You are a professional robber planning to rob houses along a street. \`nums[i]\` is the amount of money in house \`i\`. Adjacent houses have connected security systems, so you **cannot rob two adjacent houses** on the same night.

Return the maximum amount of money you can rob.`,
    examples: [
      { input: "nums = [1,2,3,1]", output: "4", explanation: "Rob house 0 (1) and house 2 (3): 1 + 3 = 4." },
      {
        input: "nums = [2,7,9,3,1]",
        output: "12",
        explanation: "Rob houses 0, 2 and 4: 2 + 9 + 1 = 12.",
      },
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
    stages: {
      invariant: {
        prompt:
          "🏠 House Robber: write the recurrence for the best total through house i, name the two choices it captures, and say how much memory you really need. Reply in 1-2 sentences.",
        answerKey:
          "best[i] = max(best[i-1], best[i-2] + nums[i]): either skip house i and keep the previous best, or rob it and add it to the best from two houses back. Only the last two values matter, so O(n) time and O(1) space with two rolling variables.",
        keyPoints: [
          {
            label: "best[i] = max(best[i-1], best[i-2] + nums[i])",
            anyOf: [
              "max(best[i-1], best[i-2] + nums[i])",
              "max(dp[i-1], dp[i-2] + nums[i])",
              "dp[i-2] + nums[i]",
              "best[i-2] + nums[i]",
              "i-2",
              "i - 2",
              "two houses back",
              "two back",
            ],
          },
          {
            label: "Skip house i or rob it",
            anyOf: ["skip", "rob it", "rob or skip", "take or skip", "take it or leave it", "include or exclude", "exclude"],
          },
          {
            label: "O(1) space with two variables",
            anyOf: ["o(1) space", "o(1)", "two variables", "2 variables", "two vars", "2 vars", "two values", "rolling", "constant space", "last two", "prev1", "prev2", "prev and curr"],
          },
        ],
        hint: "Standing at house i, you either rob it or you don't. If you rob it, which earlier result are you allowed to build on?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [2,1,1,2]. Why does taking the better of the even-index sum and odd-index sum fail here, and what should you return for a single house? Reply in 1-2 sentences.",
        answerKey:
          "Even and odd sums both give 3, but robbing houses 0 and 3 gives 4: the optimal plan can skip two houses in a row, which an alternating pattern never does. With one house, return nums[0], so initialize the rolling values so n = 1 works without indexing out of bounds.",
        keyPoints: [
          {
            label: "Optimum is 4 by skipping two houses in a row",
            // Not a bare "4": the input has 4 houses, so any answer can mention it.
            anyOf: [
              "gets 4",
              "gives 4",
              "total of 4",
              "sum of 4",
              "optimum is 4",
              "optimal is 4",
              "best is 4",
              "answer is 4",
              "max is 4",
              "2 + 2",
              "first and last",
              "skip two",
              "two in a row",
              "houses 0 and 3",
              "rob 0 and 3",
              "gap of two",
              "not alternating",
              "skip more than one",
            ],
          },
          {
            label: "Single house returns nums[0]",
            anyOf: ["nums[0]", "that house", "the only house", "its value", "single house", "one house"],
          },
        ],
        hint: "Write out every valid plan for [2,1,1,2]. Does the best one alternate?",
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
  let skipBest = 0; // best total through house i-2
  let best = 0; // best total through house i-1
  for (const money of nums) {
    const next = Math.max(best, skipBest + money);
    skipBest = best;
    best = next;
  }
  return best;
}
`,
          python: `from typing import List


def rob(nums: List[int]) -> int:
    skip_best = best = 0  # best through house i-2, best through house i-1
    for money in nums:
        skip_best, best = best, max(best, skip_best + money)
    return best
`,
        },
        tests: [
          { args: [[1, 2, 3, 1]], expected: 4 },
          { args: [[2, 7, 9, 3, 1]], expected: 12 },
          { args: [[5]], expected: 5 },
          { args: [[2, 1]], expected: 2 },
          { args: [[0, 0, 0]], expected: 0 },
          { args: [[400, 0, 0, 400]], expected: 800 },
          { args: [[2, 1, 1, 2]], expected: 4, hidden: true },
          { args: [[1, 3, 1, 3, 100]], expected: 103, hidden: true },
          { args: [[6, 6, 4, 8, 4, 3, 3, 10]], expected: 27, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d"],
    relatedCardIds: ["mc-dp-house-robber"],
  },
  {
    id: "p-partition-k-equal-sum-subsets",
    title: "Partition to K Equal Sum Subsets",
    leetcodeSlug: "partition-to-k-equal-sum-subsets",
    difficulty: "medium",
    tags: ["dp_state_compression", "bit_manipulation", "backtracking"],
    statement: `Given an integer array \`nums\` and an integer \`k\`, return \`true\` if it is possible to divide the array into \`k\` non-empty subsets whose sums are all equal.

Every element must be used in exactly one subset. Note how small \`n\` is (at most 16): that is a hint about which state space is affordable.`,
    examples: [
      {
        input: "nums = [4,3,2,3,5,2,1], k = 4",
        output: "true",
        explanation: "It can be divided into (5), (1,4), (2,3), (2,3), each summing to 5.",
      },
      { input: "nums = [1,2,3,4], k = 3", output: "false", explanation: "The total 10 is not divisible by 3." },
    ],
    constraints: [
      "1 <= k <= nums.length <= 16",
      "1 <= nums[i] <= 10^4",
      "Each value appears between 1 and 4 times.",
    ],
    stages: {
      invariant: {
        prompt:
          "🧩 Partition to K Equal Sum Subsets with bitmask DP: with target = sum / k, what does dp[mask] store, when can you add nums[i] to mask, and what's the complexity? Reply in 1-2 sentences.",
        answerKey:
          "dp[mask] is the fill level of the current bucket, the sum of the chosen elements mod target, or -1 if mask is unreachable. From a reachable mask add an unused i only if dp[mask] + nums[i] fits within target, setting dp[mask | (1 << i)] = (dp[mask] + nums[i]) mod target; the answer is whether the full mask is reachable, in O(n * 2^n).",
        keyPoints: [
          {
            label: "dp[mask] = current bucket fill (sum mod target)",
            anyOf: [
              "mod target",
              "modulo target",
              "modulo",
              "fill level",
              "current bucket",
              "partial bucket",
              "remainder",
              "sum of the chosen",
              "sum of chosen",
              "sum of used",
              "sum % target",
              "current sum",
              "running sum",
              "bucket sum",
            ],
          },
          {
            label: "Only add an unused element that fits",
            // Capacity phrases only: "unused" alone passes a DP with no fits check. "<= target" would reduce to "target".
            anyOf: [
              "fits",
              "does not exceed",
              "doesn't exceed",
              "not exceed",
              "without overflowing",
              "without exceeding",
              "overflow",
              "overfill",
              "at most target",
              "at most the target",
              "within target",
              "within the target",
              "stays within",
              "no more than target",
              "no larger than target",
              "not over target",
              "doesn't go over",
              "does not go over",
              "remaining capacity",
              "room left",
              "keeps the bucket",
              "dp[mask] + nums[i] <= target",
              "target - dp[mask]",
            ],
          },
          {
            label: "New state sets bit i: mask | (1 << i)",
            anyOf: ["mask | (1 << i)", "mask | 1 << i", "set bit i", "set the bit", "turn on bit", "add i to mask"],
          },
          {
            label: "O(n * 2^n)",
            anyOf: ["o(n * 2^n)", "n * 2^n", "2^n * n", "n 2^n", "n times 2^n", "2^n times n", "n * 2 to the n"],
          },
        ],
        hint: "If you always fill buckets one at a time, does it matter which bucket a used element went into, or only which elements are used so far?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: before any search, which two quick checks return false immediately for nums = [1,2,3,4], k = 3 and for nums = [10,1,1], k = 2? And what about k = 1? Reply in 1-2 sentences.",
        answerKey:
          "Return false if the sum is not divisible by k (10 % 3 != 0), since target = sum / k must be an integer, or if the largest element exceeds the target (10 > 6), since it fits in no bucket. For k = 1 the whole array is one valid subset, so return true.",
        keyPoints: [
          {
            label: "Sum must be divisible by k",
            anyOf: ["divisible", "not divisible", "sum % k", "sum mod k", "doesn't divide", "does not divide", "remainder", "integer"],
          },
          {
            label: "Largest element can't exceed the target",
            anyOf: [
              "largest element",
              "largest",
              "max element",
              "biggest",
              "max(nums)",
              "exceeds the target",
              "greater than the target",
              "bigger than the target",
            ],
          },
          {
            label: "k = 1 is always true",
            anyOf: ["k = 1", "k == 1", "k is 1", "whole array", "one subset", "single subset"],
          },
        ],
        hint: "What must each bucket sum to? Can [1,2,3,4] even produce that number? Could any bucket hold the 10 in [10,1,1]?",
      },
      code: {
        functionName: "canPartitionKSubsets",
        params: ["nums", "k"],
        signature: { params: ["int[]", "int"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @param {number} k
 * @return {boolean}
 */
function canPartitionKSubsets(nums, k) {
  // Your code here
  return false;
}
`,
          python: `def canPartitionKSubsets(nums: List[int], k: int) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function canPartitionKSubsets(nums, k) {
  const total = nums.reduce((sum, value) => sum + value, 0);
  if (total % k !== 0) return false;
  const target = total / k;
  if (Math.max(...nums) > target) return false;
  const n = nums.length;
  const full = (1 << n) - 1;
  // dp[mask]: fill level of the current bucket after using mask, or -1 if unreachable.
  const dp = new Array(full + 1).fill(-1);
  dp[0] = 0;
  for (let mask = 0; mask <= full; mask++) {
    if (dp[mask] === -1) continue;
    for (let i = 0; i < n; i++) {
      const next = mask | (1 << i);
      if (next === mask || dp[next] !== -1) continue;
      if (dp[mask] + nums[i] <= target) dp[next] = (dp[mask] + nums[i]) % target;
    }
  }
  return dp[full] === 0;
}
`,
          python: `from typing import List


def canPartitionKSubsets(nums: List[int], k: int) -> bool:
    total = sum(nums)
    if total % k != 0:
        return False
    target = total // k
    if max(nums) > target:
        return False
    n = len(nums)
    full = (1 << n) - 1
    # dp[mask]: fill level of the current bucket after using mask, or -1 if unreachable.
    dp = [-1] * (full + 1)
    dp[0] = 0
    for mask in range(full + 1):
        if dp[mask] == -1:
            continue
        for i in range(n):
            nxt = mask | (1 << i)
            if nxt == mask or dp[nxt] != -1:
                continue
            if dp[mask] + nums[i] <= target:
                dp[nxt] = (dp[mask] + nums[i]) % target
    return dp[full] == 0
`,
        },
        tests: [
          { args: [[4, 3, 2, 3, 5, 2, 1], 4], expected: true },
          { args: [[1, 2, 3, 4], 3], expected: false },
          { args: [[10, 1, 1], 2], expected: false },
          { args: [[5], 1], expected: true },
          { args: [[1, 1, 1, 1, 2, 2, 2, 2], 4], expected: true },
          { args: [[1, 1, 2, 2, 3, 3], 3], expected: true },
          { args: [[2, 2, 2, 2, 3, 4, 5], 4], expected: false, hidden: true },
          { args: [[4, 4, 6, 2, 3, 8, 10, 2, 10, 7], 4], expected: true, hidden: true },
          { args: [[3, 3, 10, 2, 6, 5, 10, 6, 8, 3, 2, 1, 6, 10, 7, 2], 6], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_state_compression", "bit_manipulation"],
    relatedCardIds: ["mc-bitmask-when-n-small", "mc-bitmask-dp-transition"],
  },
];
