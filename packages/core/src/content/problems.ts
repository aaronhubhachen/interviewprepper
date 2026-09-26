import type { Problem } from "./types";

export const PROBLEMS: Problem[] = [
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
          "What invariant does your sliding window maintain, and how do you restore it when s[right] is already inside the window?",
        answerKey:
          "The window s[left..right] never contains a repeated character. When s[right] was last seen at an index >= left, jump left to lastSeen[s[right]] + 1, then record the window length.",
        keyPoints: [
          {
            label: "Window has no repeated characters",
            anyOf: [
              "no duplicate",
              "no repeat",
              "never contains a repeat",
              "at most once",
              "unique",
              "distinct",
              "all different",
              "without repeating",
            ],
          },
          {
            label: "Map each character to its last index",
            anyOf: ["last seen", "last index", "last position", "hash map", "hashmap", "map", "dictionary", "set"],
          },
          {
            label: "Move left just past the previous occurrence",
            anyOf: ["move left", "jump left", "shrink", "last seen + 1", "previous occurrence", "past the duplicate"],
          },
        ],
        hint: "What must be true of every window you measure? When a new character breaks it, where is the earliest valid left edge?",
      },
      edgeCase: {
        prompt:
          "Trap check: with a last-seen map, why must you write left = max(left, last[c] + 1) instead of left = last[c] + 1? Give an input where the naive version fails.",
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
          python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
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
          python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
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
          { args: ["abba"], expected: 2, hidden: true },
          { args: ["dvdf"], expected: 3, hidden: true },
          { args: ["tmmzuxt"], expected: 5, hidden: true },
          { args: ["abcdefghijklmnopqrstuvwxyz".repeat(3)], expected: 26, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["sliding_window", "hashing"],
    relatedCardIds: ["mc-sliding-window-shrink-condition"],
  },
];
