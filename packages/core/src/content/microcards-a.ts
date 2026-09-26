import type { MicroCard } from "./types";

export const MICROCARDS_A: MicroCard[] = [
  {
    id: "mc-lru-cache-o1",
    title: "LRU Cache in O(1)",
    prompt:
      "🧠 Design an LRU cache where get and put both run in O(1). Which two data structures do you combine, and what job does each one do?",
    answerKey:
      "Combine a hash map from key to node with a doubly linked list ordered by recency. The map gives O(1) lookup; the list gives O(1) move-to-front on access and O(1) eviction of the least recently used node at the tail.",
    keyPoints: [
      {
        label: "Hash map for O(1) key lookup",
        anyOf: ["hash map", "hashmap", "hash table", "dictionary", "dict", "map"],
      },
      {
        label: "Doubly linked list ordered by recency",
        anyOf: ["doubly linked list", "doubly-linked list", "linked list", "dll", "deque"],
      },
      {
        label: "Evict from the least-recent end",
        anyOf: ["evict", "tail", "least recently used", "oldest", "remove last", "remove the last", "pop"],
      },
    ],
    hint: "One structure answers 'where is key k?' instantly; the other keeps usage order and lets you unlink a node from the middle in O(1).",
    explanation:
      "A hash map alone can't track recency, and a list alone can't find keys fast. Storing list nodes as map values lets you jump straight to a node, unlink it in O(1) (which needs prev pointers, hence doubly linked), and re-insert it at the head. Sentinel head and tail nodes remove the empty-list edge cases.",
    tags: ["design", "hashing", "linked_list"],
    difficulty: 2,
    relatedProblem: { title: "LRU Cache", leetcodeSlug: "lru-cache" },
  },
  {
    id: "mc-sliding-window-shrink-condition",
    title: "Sliding window: when to shrink",
    prompt:
      "🪟 In a variable-size sliding window (e.g. longest substring with at most k distinct chars), what exact condition makes you shrink from the left, and why is the whole scan still O(n)?",
    answerKey:
      "Expand right every step and shrink left only while the window violates the constraint (here: more than k distinct chars, tracked with a frequency map). Both pointers only move forward, so each index enters and leaves the window at most once, giving O(n).",
    keyPoints: [
      {
        label: "Shrink only while the window is invalid",
        anyOf: [
          "invalid",
          "violates",
          "violated",
          "more than k",
          "exceeds k",
          "too many distinct",
          "constraint is broken",
          "shrink while",
          "while the window",
        ],
      },
      {
        label: "Track counts with a frequency map",
        anyOf: ["frequency", "count map", "counter", "hash map", "hashmap", "counts", "dictionary", "map"],
      },
      {
        label: "Pointers only move forward, so O(n)",
        anyOf: [
          "o(n)",
          "linear",
          "only move forward",
          "never move back",
          "added and removed once",
          "at most twice",
          "amortized",
        ],
      },
    ],
    hint: "Ask: when does the window stop being a valid answer? Repair exactly that, then keep expanding.",
    explanation:
      "The window invariant is 'the current window satisfies the constraint'. Growing right may break it, moving left is the only way to repair it, and left never needs to move back because any wider window ending here is also invalid. Record the best answer after the repair step, when the window is valid again.",
    tags: ["sliding_window", "two_pointers", "hashing"],
    difficulty: 2,
    relatedProblem: {
      title: "Longest Substring with At Most K Distinct Characters",
      leetcodeSlug: "longest-substring-with-at-most-k-distinct-characters",
    },
  },
  {
    id: "mc-binary-search-on-answer",
    title: "Binary search on the answer",
    prompt:
      "🎯 Koko Eating Bananas asks for the minimum eating speed that finishes all piles in h hours. Why can you binary search over the speed itself, and what property must your check function have?",
    answerKey:
      "The candidate speeds 1..max(piles) are ordered and feasibility is monotonic: if speed s finishes in time, every faster speed does too. So binary search for the smallest feasible speed, where each check costs O(n).",
    keyPoints: [
      {
        label: "Search the range of answers, not the array",
        anyOf: [
          "answer space",
          "range of speeds",
          "search the speed",
          "search over speed",
          "search space",
          "possible answers",
          "max pile",
          "max(piles)",
        ],
      },
      {
        label: "Feasibility is monotonic",
        anyOf: ["monotonic", "monotone", "every faster", "any faster", "higher speed also", "larger speed also", "false then true"],
      },
      {
        label: "Find the minimum feasible value",
        anyOf: ["minimum", "smallest", "lowest", "first true", "leftmost", "lower bound"],
      },
    ],
    hint: "If speed 10 works, does speed 11? What does a false…false, true…true shape let you do?",
    explanation:
      "Binary search needs a monotonic predicate, not a sorted array. canFinish(s) flips from false to true exactly once as s grows, so you search for the first true. Total cost is O(n log max(piles)).",
    tags: ["binary_search"],
    difficulty: 2,
    relatedProblem: { title: "Koko Eating Bananas", leetcodeSlug: "koko-eating-bananas" },
  },
];
