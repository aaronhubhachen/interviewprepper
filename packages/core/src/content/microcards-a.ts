/**
 * Micro-card deck A: arrays, hashing, two pointers, sliding window, prefix sums,
 * binary search, sorting, intervals, linked lists, strings, matrix, math/bits,
 * and design. Every texted field is plain text (iMessage shows no markdown).
 *
 * Order matters a little: with no weak tags, the scheduler introduces the
 * easiest cards first in registry order, so the deck opens with Two Sum.
 */
import type { MicroCard } from "./types";

export const MICROCARDS_A: MicroCard[] = [
  // ─── Hashing ──────────────────────────────────────────────────────────────
  {
    id: "mc-two-sum-hash-map",
    title: "Two Sum in one pass",
    prompt:
      "#️⃣ Two Sum on an unsorted array in one pass: what do you store in the hash map, and why look up the complement BEFORE inserting the current number? Reply in 1-2 sentences.",
    answerKey:
      "Store each value mapped to its index, and for each number first look up target minus the number. Looking up before inserting means an element can never pair with itself (like target 6 with a single 3), while duplicates like [3, 3] are still found.",
    keyPoints: [
      {
        label: "Map each value to its index",
        anyOf: [
          "value to index",
          "value mapped to its index",
          "number to index",
          "num to index",
          "value -> index",
          "num -> index",
          "index",
          "indices",
          "position",
        ],
      },
      {
        label: "Look up the complement (target minus x)",
        anyOf: ["complement", "target minus", "target - num", "target - x", "target - nums[i]", "difference", "diff"],
      },
      {
        label: "Lookup-first stops an element pairing with itself",
        anyOf: ["itself", "same element", "same index", "with itself", "self pair", "reuse", "use it twice", "used twice"],
      },
    ],
    hint: "Try nums = [3, 2, 4], target = 6. What goes wrong if 3 goes into the map before you look for 6 - 3?",
    explanation:
      "Each lookup asks: have I already seen the partner this number needs? That is O(n) time and O(n) space versus O(n^2) brute force. Lookup-first still finds [3, 3] because the first 3 is already in the map when the second one arrives.",
    tags: ["hashing"],
    difficulty: 1,
    relatedProblem: { title: "Two Sum", leetcodeSlug: "two-sum" },
  },
  {
    id: "mc-group-anagrams-key",
    title: "Group Anagrams: the hash key",
    prompt:
      "🔤 Group Anagrams: what hash key makes all anagrams of a word collide, and which key choice is faster for long words? Reply in 1-2 sentences.",
    answerKey:
      "Use a canonical form as the key: either the sorted string, which costs O(k log k) per word, or a tuple of 26 letter counts, which costs O(k) per word. Group the words in a hash map from that key to a list.",
    keyPoints: [
      {
        label: "Sorted string as a canonical key",
        anyOf: ["sorted string", "sorted word", "sorted chars", "sorted letters", "sort the word", "sort each word", "sort the string", "sort"],
      },
      {
        label: "26-letter count signature is O(k)",
        anyOf: ["26", "letter count", "letter counts", "char count", "character count", "frequency", "count array", "tuple of counts", "counts"],
      },
      {
        label: "Hash map from key to list of words",
        anyOf: ["hash map", "hashmap", "dict", "dictionary", "defaultdict", "map", "group"],
      },
    ],
    hint: "Two words are anagrams exactly when some normalized version of them is identical. Which normalization is cheapest?",
    explanation:
      "Total cost is O(n k log k) with sorted keys or O(n k) with count keys, where k is the longest word. The count key must be hashable: a tuple in Python, or counts joined with a separator in Java or JavaScript, since without a separator counts like 1,11 and 11,1 collide.",
    tags: ["hashing", "string", "sorting"],
    difficulty: 2,
    relatedProblem: { title: "Group Anagrams", leetcodeSlug: "group-anagrams" },
  },
  {
    id: "mc-longest-consecutive-sequence",
    title: "Longest consecutive run in O(n)",
    prompt:
      "🔗 Longest Consecutive Sequence in O(n) on an unsorted array, no sorting allowed. How do you avoid re-walking the same run from every element? Reply in 1-2 sentences.",
    answerKey:
      "Put every number in a hash set and only start counting from x when x - 1 is not in the set, meaning x is the start of a run. Then walk x + 1, x + 2 and so on; each number is visited at most twice overall, so it is O(n).",
    keyPoints: [
      {
        label: "Hash set for O(1) membership",
        anyOf: ["hash set", "hashset", "set"],
      },
      {
        label: "Only start at run heads (x - 1 missing)",
        anyOf: [
          "x - 1",
          "x-1",
          "num - 1",
          "n - 1",
          "start of a run",
          "start of the run",
          "start of a sequence",
          "start of the sequence",
          "only start",
          "no predecessor",
          "smallest in the run",
        ],
      },
      {
        label: "Linear because each number is walked once",
        anyOf: ["o(n)", "linear", "at most twice", "visited once", "each number once", "amortized"],
      },
    ],
    hint: "If 5 is in the set, is there any point starting a count from 6?",
    explanation:
      "Starting only from run heads means each run is walked exactly once, so the inner loop does O(n) work in total across the whole scan. Sorting would be O(n log n) and breaks the constraint. Iterate over the set rather than the array so duplicate run heads don't trigger repeated walks.",
    tags: ["hashing"],
    difficulty: 2,
    relatedProblem: { title: "Longest Consecutive Sequence", leetcodeSlug: "longest-consecutive-sequence" },
  },

  // ─── Two pointers ─────────────────────────────────────────────────────────
  {
    id: "mc-two-pointers-sorted-two-sum",
    title: "Two pointers on a sorted array",
    prompt:
      "👉👈 Two Sum II: the array is sorted and you need two numbers adding to target. With pointers at both ends, which pointer moves when the sum is too small, and why is that move safe? Reply in 1-2 sentences.",
    answerKey:
      "If the sum is too small, move the left pointer right (if too big, move the right pointer left). It is safe because the left value paired with the largest remaining value is already too small, so the left value can't be part of any solution and can be discarded.",
    keyPoints: [
      {
        label: "Too small: move the left pointer right",
        anyOf: ["move the left", "move left", "left pointer right", "increment left", "advance left", "left forward", "left up", "bump left"],
      },
      {
        label: "Safe: the discarded value can't be in any pair",
        anyOf: [
          "can't be part",
          "cannot be part",
          "can't pair",
          "cannot pair",
          "discard",
          "eliminate",
          "rule out",
          "ruled out",
          "largest remaining",
          "already too small",
          "no solution",
          "prune",
          "never works",
        ],
      },
    ],
    hint: "The left value plus the biggest value you have left is still under target. Could the left value pair with anything smaller?",
    explanation:
      "Each comparison eliminates a whole row or column of the pair matrix, so all n squared pairs are covered implicitly in O(n) time and O(1) space. This elimination argument is the invariant behind most opposite-end two-pointer solutions: if an answer exists, it always lies between the pointers.",
    tags: ["two_pointers"],
    difficulty: 1,
    relatedProblem: { title: "Two Sum II - Input Array Is Sorted", leetcodeSlug: "two-sum-ii-input-array-is-sorted" },
  },
  {
    id: "mc-container-most-water",
    title: "Container With Most Water",
    prompt:
      "🌊 Container With Most Water: pointers at both ends, area = min(h[l], h[r]) * width. Why do you always move the pointer at the SHORTER line? Reply in 1-2 sentences.",
    answerKey:
      "The area is limited by the shorter line, and every other container that uses the shorter line has a narrower width, so its area can only be less than or equal to the current one. So the shorter line is finished and can be discarded, while moving the taller one can never help.",
    keyPoints: [
      {
        label: "The shorter line caps the height",
        anyOf: ["limited by the shorter", "shorter line", "the shorter one", "shorter height", "min height", "smaller height", "bottleneck", "limiting"],
      },
      {
        label: "Any other pairing is narrower",
        anyOf: ["narrower", "width shrinks", "width decreases", "smaller width", "less width", "width only gets smaller", "width goes down"],
      },
      {
        label: "So the shorter line can be discarded",
        anyOf: ["discard", "can never help", "never help", "can't improve", "cannot improve", "no better", "finished", "eliminate", "rule out", "never increase"],
      },
    ],
    hint: "Fix the shorter line and pair it with any closer line, taller or not. Can the area ever go up?",
    explanation:
      "Moving the taller pointer keeps the same or a lower height cap while the width drops, so it can never improve. Moving the shorter pointer is the only move with a chance at a taller bottleneck. Each step safely eliminates one line, giving O(n) instead of checking all O(n^2) pairs.",
    tags: ["two_pointers", "greedy"],
    difficulty: 2,
    relatedProblem: { title: "Container With Most Water", leetcodeSlug: "container-with-most-water" },
  },
  {
    id: "mc-three-sum-dedup",
    title: "3Sum without duplicates",
    prompt:
      "🔺 3Sum: find all unique triplets that sum to 0. What is the O(n^2) approach, and how do you avoid duplicate triplets without using a set? Reply in 1-2 sentences.",
    answerKey:
      "Sort the array, fix each index i, and run two pointers on the rest to find pairs summing to -nums[i], for O(n^2) total. Skip duplicates by skipping i when nums[i] equals nums[i-1], and after a match move both pointers past repeated values.",
    keyPoints: [
      {
        label: "Sort first",
        anyOf: ["sort", "sorted"],
      },
      {
        label: "Fix one element, two pointers on the rest",
        anyOf: ["two pointers", "two pointer", "2 pointers", "left and right", "fix each", "fix one", "fix i", "fix the first"],
      },
      {
        label: "Skip equal neighbors at every level",
        anyOf: ["skip duplicates", "skip dupes", "skip equal", "skip repeated", "skip same", "nums[i] == nums[i-1]", "move past", "skip"],
      },
    ],
    hint: "After sorting, equal values sit next to each other. Where in the loops could the same triplet be produced twice?",
    explanation:
      "Sorting is O(n log n), dominated by the O(n^2) two-pointer scans. Because equal values are adjacent after sorting, skipping a value equal to its predecessor at each level emits each triplet exactly once. Breaking early once nums[i] > 0 is a nice optimization, since the sorted rest can't sum back to 0.",
    tags: ["two_pointers", "sorting"],
    difficulty: 2,
    relatedProblem: { title: "3Sum", leetcodeSlug: "3sum" },
  },
  {
    id: "mc-trapping-rain-water-two-pointers",
    title: "Trapping Rain Water in O(1) space",
    prompt:
      "🌧️ Trapping Rain Water with two pointers and O(1) space: water above bar i is min(maxLeft, maxRight) - h[i]. How do you decide which side to process without knowing both maxes? Reply in 1-2 sentences.",
    answerKey:
      "Keep a running leftMax and rightMax and always process the side with the smaller max. If leftMax is below rightMax, the true max to the right of l is at least rightMax, so the water at l is determined by leftMax alone: add leftMax - h[l] and move l inward.",
    keyPoints: [
      {
        label: "Track running leftMax and rightMax",
        anyOf: ["leftmax", "left max", "rightmax", "right max", "maxleft", "maxright", "max from the left", "running max", "max so far"],
      },
      {
        label: "Process the side with the smaller max",
        anyOf: [
          "smaller max",
          "smaller side",
          "lower side",
          "shorter side",
          "lower max",
          "lower bar",
          "smaller one",
          "whichever is smaller",
          "the side with the smaller",
          "smaller height",
        ],
      },
      {
        label: "That side's max alone bounds the water",
        anyOf: ["determined by", "bounded by", "alone", "is at least", "guaranteed", "limited by", "other side is taller", "other side is higher", "bottleneck"],
      },
    ],
    hint: "If the best wall on the left is 3 and the right side already has a wall of 5 somewhere, does the exact right max matter for the left bar?",
    explanation:
      "The water level at a bar is capped by the lower of the tallest walls on each side. When leftMax is smaller, some wall on the right already beats it, so the left side is the bottleneck no matter what lies between. That turns the O(n) prefix-max and suffix-max arrays into two running variables.",
    tags: ["two_pointers"],
    difficulty: 3,
    relatedProblem: { title: "Trapping Rain Water", leetcodeSlug: "trapping-rain-water" },
  },

  // ─── Sliding window ───────────────────────────────────────────────────────
  {
    id: "mc-sliding-window-fixed-size",
    title: "Fixed-size sliding window",
    prompt:
      "🪟 Find the max average of any contiguous subarray of length k. How do you get each next window's sum in O(1) instead of re-summing all k elements? Reply in 1 sentence.",
    answerKey:
      "Sum the first k elements once, then slide: add the element entering on the right and subtract the element leaving on the left while tracking the best sum, for O(n) total instead of O(n*k).",
    keyPoints: [
      {
        label: "Add the element entering the window",
        anyOf: ["add the element entering", "add the new", "add incoming", "add the next", "add the right", "plus the new", "entering", "incoming", "add"],
      },
      {
        label: "Subtract the element leaving the window",
        anyOf: ["subtract", "minus", "leaving", "outgoing", "drop the left", "remove the left", "remove the element leaving"],
      },
      {
        label: "O(n) total",
        anyOf: ["o(n)", "linear", "one pass", "single pass"],
      },
    ],
    hint: "Two consecutive windows share k - 1 elements. What actually changes between them?",
    explanation:
      "Each slide changes exactly one element at each end, so the running sum updates in constant time. Compare sums rather than averages and divide once at the end, since dividing by the fixed k preserves order. The same add-one, remove-one pattern works for fixed windows of counts, like finding anagram windows.",
    tags: ["sliding_window"],
    difficulty: 1,
    relatedProblem: { title: "Maximum Average Subarray I", leetcodeSlug: "maximum-average-subarray-i" },
  },
  {
    id: "mc-sliding-window-shrink-condition",
    title: "Sliding window: when to shrink",
    prompt:
      "🪟 In a variable-size sliding window (e.g. longest substring with at most k distinct chars), what exact condition makes you shrink from the left, and why is the whole scan still O(n)? Reply in 1-2 sentences.",
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
        anyOf: ["frequency", "count map", "counter", "hash map", "hashmap", "counts", "dictionary", "dict", "map"],
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
    id: "mc-min-window-substring",
    title: "Minimum window: shrink while valid",
    prompt:
      "🪟 Minimum Window Substring: smallest window of s containing every char of t (with counts). Unlike longest-window problems, when do you shrink, and when do you record the answer? Reply in 1-2 sentences.",
    answerKey:
      "Expand right until the window is valid (a formed counter says every required char count is met), then shrink from the left while it stays valid, recording the minimum length at each valid step before dropping the left char. It is the mirror of longest-window problems, where you shrink while invalid.",
    keyPoints: [
      {
        label: "Expand until the window is valid",
        anyOf: ["expand until", "grow until", "until valid", "until the window is valid", "until it contains", "until all", "until it covers"],
      },
      {
        label: "Shrink while it stays valid",
        anyOf: [
          "shrink while valid",
          "while it stays valid",
          "while valid",
          "while still valid",
          "while the window is valid",
          "while it is valid",
          "contract while",
          "shrink while",
        ],
      },
      {
        label: "Record the answer during the shrink",
        anyOf: ["record", "update the answer", "update min", "update the min", "track the min", "save the best", "minimum length", "update best"],
      },
      {
        label: "Track required counts (need/have)",
        anyOf: ["counter", "formed", "need", "have", "count", "counts", "frequency", "hash map", "hashmap", "dict", "map"],
      },
    ],
    hint: "Here a valid window is a candidate answer and you want it smaller. So which state should the left pointer eat into?",
    explanation:
      "Keep need[c] from t and a formed count of chars whose requirement is met, so validity is an O(1) check instead of comparing maps. For minimum problems validity is what you optimize inside, so you shrink while valid; for maximum problems validity is the constraint, so you shrink while invalid. Each pointer moves at most |s| times, so it is O(|s| + |t|).",
    tags: ["sliding_window", "hashing", "string"],
    difficulty: 3,
    relatedProblem: { title: "Minimum Window Substring", leetcodeSlug: "minimum-window-substring" },
  },
  {
    id: "mc-char-replacement-window",
    title: "Character replacement window",
    prompt:
      "🪟 Longest Repeating Character Replacement: longest substring you can make one letter with at most k replacements. What is the window's validity condition, and why can maxFreq stay stale when you shrink? Reply in 2 sentences.",
    answerKey:
      "The window is valid when its length minus the count of its most frequent char is at most k, because the other chars are exactly the replacements needed. maxFreq can stay stale because the answer only grows when some char's count beats the best maxFreq seen so far; a stale value just makes the window slide at its best size instead of shrinking.",
    keyPoints: [
      {
        label: "Window length minus the top letter's count",
        anyOf: [
          "length minus",
          "window length minus",
          "size minus",
          "len - maxfreq",
          "size - maxfreq",
          "window - maxfreq",
          "r - l + 1 - maxfreq",
          "minus the count",
          "minus max",
          "minus the most frequent",
          "most frequent",
          "most common",
          "max frequency",
        ],
      },
      {
        label: "Must be at most k",
        anyOf: ["at most k", "no more than k", "less than or equal to k", "within k", "k or fewer", "k or less", "maxfreq <= k", "fits in k"],
      },
      {
        label: "Stale maxFreq is safe: the answer only grows with a new max",
        anyOf: [
          "only grows",
          "only improves",
          "only gets longer",
          "beats",
          "beat the",
          "new max",
          "historical max",
          "best maxfreq",
          "larger maxfreq",
          "bigger maxfreq",
          "higher maxfreq",
          "never needs to decrease",
          "doesnt need to decrease",
          "overestimate",
          "slide",
          "slides",
          "never shrinks",
        ],
      },
    ],
    hint: "In a window of length L where the top letter appears f times, how many letters must change? Then ask: can a smaller maxFreq ever produce a longer answer?",
    explanation:
      "Recomputing the true max after each shrink is a scan of 26 counts, still O(26n), so that version is fine too. The stale trick works because we only care about windows longer than the best so far, and those require a larger maxFreq. Either way it is O(n) time and O(1) extra space for 26 letters.",
    tags: ["sliding_window", "string"],
    difficulty: 3,
    relatedProblem: { title: "Longest Repeating Character Replacement", leetcodeSlug: "longest-repeating-character-replacement" },
  },

  // ─── Prefix sums ──────────────────────────────────────────────────────────
  {
    id: "mc-range-sum-prefix",
    title: "Range sums in O(1)",
    prompt:
      "➕ Range Sum Query: many sum(l, r) queries on a fixed array. How do you answer each one in O(1), and why give the prefix array a leading 0? Reply in 1-2 sentences.",
    answerKey:
      "Precompute prefix[i+1] = prefix[i] + nums[i] in O(n), then sum(l, r) = prefix[r+1] - prefix[l]. The leading 0 (a prefix array of length n+1) makes ranges starting at index 0 work without a special case.",
    keyPoints: [
      {
        label: "Precompute running sums in O(n)",
        anyOf: [
          "precompute",
          "running sum",
          "running total",
          "cumulative",
          "prefix[i+1] = prefix[i] + nums[i]",
          "prefix[i] + nums[i]",
          "one pass",
          "o(n)",
        ],
      },
      {
        label: "Answer = difference of two prefixes",
        anyOf: ["prefix[r+1] - prefix[l]", "p[r+1] - p[l]", "pre[r+1] - pre[l]", "subtract", "difference", "minus"],
      },
      {
        label: "Leading 0 removes the l = 0 special case",
        anyOf: [
          "special case",
          "edge case",
          "index 0",
          "l = 0",
          "l is 0",
          "starts at 0",
          "start at 0",
          "nothing before",
          "empty prefix",
          "n+1",
          "n + 1",
          "off by one",
          "off-by-one",
        ],
      },
    ],
    hint: "sum(l..r) is (everything before r+1) minus (everything before l). What is 'everything before 0'?",
    explanation:
      "You trade O(n) preprocessing and space for O(1) queries, which wins when queries are many. It only works on an immutable array; with point updates you need a Fenwick tree or segment tree for O(log n) updates and queries. The same idea extends to 2D grids with inclusion-exclusion.",
    tags: ["prefix_sum"],
    difficulty: 1,
    relatedProblem: { title: "Range Sum Query - Immutable", leetcodeSlug: "range-sum-query-immutable" },
  },
  {
    id: "mc-subarray-sum-equals-k",
    title: "Subarray sum = k with negatives",
    prompt:
      "➕ Subarray Sum Equals K, and nums can be negative. Why does a sliding window fail here, and what O(n) technique counts the subarrays instead? Reply in 1-2 sentences.",
    answerKey:
      "With negatives, extending the window can decrease the sum and shrinking can increase it, so there is no monotonic rule for which pointer to move. Instead keep a running prefix sum and a hash map counting prefix sums seen so far (seeded with 0 mapped to 1), and at each index add count[prefix - k] to the answer.",
    keyPoints: [
      {
        label: "Negatives break the monotonic window rule",
        anyOf: [
          "monotonic",
          "monotonicity",
          "not monotonic",
          "can decrease",
          "sum can go down",
          "shrinking can increase",
          "which pointer to move",
          "negatives break",
        ],
      },
      {
        label: "Running prefix sum",
        anyOf: ["prefix sum", "prefix sums", "running sum", "cumulative sum", "prefix"],
      },
      {
        label: "Hash map of prefix counts, look up prefix - k",
        anyOf: ["prefix - k", "sum - k", "curr - k", "hash map", "hashmap", "dict", "counter", "map"],
      },
      {
        label: "Seed the map with prefix 0",
        anyOf: ["0 mapped to 1", "seed", "seeded", "zero", "count of 0", "initialize with 0", "empty prefix"],
      },
    ],
    hint: "sum(i..j) = prefix[j] - prefix[i-1]. If you want that to be k, which earlier prefix value are you looking for?",
    explanation:
      "A subarray ending at j sums to k exactly when some earlier prefix equals prefix[j] - k, so counting earlier prefixes in a map counts subarrays in O(n) time and space. The seed covers subarrays that start at index 0. Look up before inserting the current prefix, or k = 0 would count the empty subarray.",
    tags: ["prefix_sum", "hashing", "sliding_window"],
    difficulty: 2,
    relatedProblem: { title: "Subarray Sum Equals K", leetcodeSlug: "subarray-sum-equals-k" },
  },
  {
    id: "mc-product-except-self",
    title: "Product of Array Except Self",
    prompt:
      "✖️ Product of Array Except Self, no division, O(n). How do you build each answer, and how do you get O(1) extra space besides the output array? Reply in 1-2 sentences.",
    answerKey:
      "Each answer[i] is the product of everything to its left times the product of everything to its right. Fill the output with prefix products in a left-to-right pass, then sweep right-to-left multiplying by a running suffix product variable, so no extra arrays are needed.",
    keyPoints: [
      {
        label: "Left (prefix) products",
        anyOf: ["prefix product", "prefix products", "left product", "left products", "to its left", "left to right", "left pass"],
      },
      {
        label: "Right (suffix) products",
        anyOf: ["suffix product", "suffix products", "right product", "right products", "to its right", "right to left", "right pass"],
      },
      {
        label: "Reuse the output plus one running variable",
        anyOf: ["output array", "fill the output", "reuse the output", "running", "one variable", "single variable", "in place", "no extra arrays", "o(1) extra"],
      },
    ],
    hint: "Split the product around position i into two halves. Can each half be built incrementally in one pass?",
    explanation:
      "Division fails when the array contains a zero and is usually banned anyway. The prefix and suffix passes are O(n) time, and since the output doesn't count as extra space, only the running suffix variable is extra. Zeros need no special handling with this approach.",
    tags: ["prefix_sum"],
    difficulty: 2,
    relatedProblem: { title: "Product of Array Except Self", leetcodeSlug: "product-of-array-except-self" },
  },

  // ─── Binary search ────────────────────────────────────────────────────────
  {
    id: "mc-binary-search-lower-bound",
    title: "Lower bound invariant",
    prompt:
      "🔎 Lower bound: first index i with nums[i] >= target, or n if none. Using lo = 0, hi = n and while lo < hi, what invariant do lo and hi keep, and how do you update them? Reply in 2 sentences.",
    answerKey:
      "Invariant: everything before lo is less than target and everything at or after hi is at least target, so the answer is always in [lo, hi]. If nums[mid] < target set lo = mid + 1, otherwise set hi = mid (not mid - 1, since mid could be the answer), and when lo equals hi that index is the lower bound.",
    keyPoints: [
      {
        label: "Everything before lo is < target",
        anyOf: ["before lo", "left of lo", "below lo", "i < lo", "less than target", "smaller than target", "too small"],
      },
      {
        label: "Everything at or after hi is >= target",
        anyOf: [
          "at or after hi",
          "after hi",
          "from hi",
          "right of hi",
          "hi onward",
          "hi and beyond",
          "i >= hi",
          "at least target",
          "not less than target",
          "greater than or equal to target",
        ],
      },
      {
        label: "lo = mid + 1, else hi = mid",
        anyOf: ["lo = mid + 1", "lo = mid+1", "l = mid + 1", "hi = mid", "r = mid", "mid + 1", "mid+1"],
      },
      {
        label: "Loop ends with lo == hi as the answer",
        anyOf: ["lo equals hi", "lo == hi", "lo = hi", "they meet", "converge", "return lo", "answer is lo"],
      },
    ],
    hint: "Write down what you know about nums[0..lo-1] and nums[hi..n-1] at every step. Which update keeps mid in play when it might be the answer?",
    explanation:
      "The half-open template never skips the answer and can't loop forever: mid = lo + (hi - lo) / 2 is always below hi, so both branches shrink the range. Starting hi at n handles targets larger than everything. Upper bound (first index with nums[i] > target) is the same loop with nums[mid] <= target moving lo.",
    tags: ["binary_search"],
    difficulty: 2,
    relatedProblem: { title: "Search Insert Position", leetcodeSlug: "search-insert-position" },
  },
  {
    id: "mc-binary-search-on-answer",
    title: "Binary search on the answer",
    prompt:
      "🎯 Koko Eating Bananas asks for the minimum eating speed that finishes all piles in h hours. Why can you binary search over the speed itself, and what property must your check function have? Reply in 1-2 sentences.",
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
    hint: "If speed 10 works, does speed 11? What does a false, false, true, true shape let you do?",
    explanation:
      "Binary search needs a monotonic predicate, not a sorted array. canFinish(s) flips from false to true exactly once as s grows, so you search for the first true. Total cost is O(n log max(piles)).",
    tags: ["binary_search"],
    difficulty: 2,
    relatedProblem: { title: "Koko Eating Bananas", leetcodeSlug: "koko-eating-bananas" },
  },
  {
    id: "mc-rotated-array-search",
    title: "Search a rotated sorted array",
    prompt:
      "🔄 Search in Rotated Sorted Array (distinct values) in O(log n). After computing mid, what do you check to decide which half to throw away? Reply in 1-2 sentences.",
    answerKey:
      "At least one half around mid is always sorted: if nums[lo] <= nums[mid] the left half is sorted, otherwise the right half is. Check whether the target falls inside the sorted half's range; if so search there, otherwise search the other half.",
    keyPoints: [
      {
        label: "One half is always sorted",
        anyOf: ["one half is always sorted", "one half is sorted", "half is sorted", "sorted half", "one side is sorted", "one side sorted", "sorted side"],
      },
      {
        label: "Detect it with nums[lo] <= nums[mid]",
        anyOf: [
          "nums[lo] <= nums[mid]",
          "nums[l] <= nums[mid]",
          "nums[left] <= nums[mid]",
          "compare with nums[lo]",
          "compare mid to the left",
          "compare to the first",
          "compare with the left end",
        ],
      },
      {
        label: "Check if target is in the sorted half's range",
        anyOf: ["target falls", "target is in", "target lies", "target in", "within the range", "inside the sorted", "in range", "between"],
      },
    ],
    hint: "A rotation splits the array into two sorted runs, and mid lands in one of them. Which half can you fully reason about?",
    explanation:
      "You can only rule out a half when you know its exact range, and you know that for the sorted half from its endpoints. The <= matters when lo equals mid in a two-element window. With duplicates, nums[lo] == nums[mid] makes the sorted side ambiguous, so you step lo forward and the worst case degrades to O(n).",
    tags: ["binary_search"],
    difficulty: 2,
    relatedProblem: { title: "Search in Rotated Sorted Array", leetcodeSlug: "search-in-rotated-sorted-array" },
  },

  // ─── Sorting & selection ──────────────────────────────────────────────────
  {
    id: "mc-sort-colors-dutch-flag",
    title: "Dutch national flag partition",
    prompt:
      "🎨 Sort Colors: sort an array of 0s, 1s and 2s in one pass, in place. Describe the three-pointer invariant, and why you don't advance mid after swapping with high. Reply in 2 sentences.",
    answerKey:
      "Keep low, mid and high so that [0, low) is all 0s, [low, mid) is all 1s, (high, end] is all 2s, and [mid, high] is still unknown. When nums[mid] is 2 you swap it with high and decrement high but don't advance mid, because the value swapped in from high hasn't been examined yet.",
    keyPoints: [
      {
        label: "Regions: 0s before low, 1s before mid, 2s after high",
        anyOf: [
          "low, mid",
          "low mid high",
          "all 0s",
          "0s before low",
          "zeros before low",
          "before low",
          "left of low",
          "after high",
          "right of high",
          "regions",
          "sections",
        ],
      },
      {
        label: "A 2 is swapped with high, then high shrinks",
        anyOf: [
          "swap it with high",
          "swap with high",
          "swap with the end",
          "swap the 2",
          "swap a 2",
          "swapping a 2",
          "swapping the 2",
          "2 to high",
          "2 to the end",
          "decrement high",
          "move high",
          "high moves left",
          "shrink high",
        ],
      },
      {
        label: "The swapped-in value is unexamined",
        anyOf: [
          "hasnt been examined",
          "unexamined",
          "not examined",
          "unknown",
          "unchecked",
          "not checked",
          "hasnt been checked",
          "havent checked",
          "not processed",
          "unprocessed",
          "could be 0",
          "might be 0",
          "could be a 0",
          "might be a 0",
          "still need to check",
        ],
      },
    ],
    hint: "When you swap with low you know what comes back. What do you know about the value coming back from high?",
    explanation:
      "Swapping a 0 with low lets both pointers advance because the value at low is a 1 you already scanned (or the same cell when low equals mid). The loop runs while mid <= high, so it is O(n) time and O(1) space. A two-pass counting sort also works, but interviewers usually ask for one pass.",
    tags: ["sorting", "two_pointers"],
    difficulty: 2,
    relatedProblem: { title: "Sort Colors", leetcodeSlug: "sort-colors" },
  },
  {
    id: "mc-top-k-bucket-sort",
    title: "Top K Frequent in O(n)",
    prompt:
      "🪣 Top K Frequent Elements: a heap gives O(n log k). How can you get O(n) instead, and why is the number of buckets bounded? Reply in 1-2 sentences.",
    answerKey:
      "Count frequencies with a hash map, then bucket sort: bucket[f] holds the values that appear f times, and you walk the buckets from high to low until you have k values. A frequency can't exceed n, so an array of n+1 buckets suffices and everything is O(n).",
    keyPoints: [
      {
        label: "Count with a hash map",
        anyOf: ["count", "counts", "frequency map", "hash map", "hashmap", "counter", "dict"],
      },
      {
        label: "Bucket values by frequency",
        anyOf: ["bucket", "buckets", "bucket sort", "index by frequency", "frequency as index", "array of lists"],
      },
      {
        label: "Frequency is at most n",
        anyOf: ["n+1", "n + 1", "at most n", "bounded by n", "max frequency is n", "can't exceed n", "cannot exceed n", "only n"],
      },
      {
        label: "Walk buckets from high to low",
        anyOf: ["high to low", "from the end", "backwards", "descending", "highest first", "reverse"],
      },
    ],
    hint: "A frequency is an integer between 1 and n. Which kind of sort doesn't compare elements when keys are small integers?",
    explanation:
      "Comparison sorts can't beat O(n log n), but frequencies are small integers, so indexing by them sidesteps comparisons like counting sort does. A heap is still a strong answer when k is tiny or the data streams in, and quickselect on the counts also gives average O(n).",
    tags: ["hashing", "sorting", "heap"],
    difficulty: 2,
    relatedProblem: { title: "Top K Frequent Elements", leetcodeSlug: "top-k-frequent-elements" },
  },
  {
    id: "mc-quickselect-kth-largest",
    title: "Kth largest: heap vs quickselect",
    prompt:
      "⚡ Kth Largest Element: compare a size-k min-heap with quickselect. Give both time complexities, and say how quickselect avoids its worst case. Reply in 2 sentences.",
    answerKey:
      "A size-k min-heap runs in O(n log k) time with O(k) space, popping whenever it holds more than k so the root is the kth largest. Quickselect partitions around a pivot and recurses into only one side, for average O(n) but worst case O(n^2), which a random pivot makes vanishingly unlikely.",
    keyPoints: [
      {
        label: "Size-k min-heap: O(n log k)",
        anyOf: ["o(n log k)", "n log k", "min-heap", "min heap", "size k", "size-k"],
      },
      {
        label: "Quickselect: average O(n)",
        anyOf: ["average o(n)", "expected o(n)", "o(n) average", "o(n) on average", "linear on average", "average linear", "expected linear"],
      },
      {
        label: "Worst case O(n^2)",
        anyOf: ["o(n^2)", "n^2", "quadratic", "n squared"],
      },
      {
        label: "Random pivot",
        anyOf: ["random pivot", "randomized", "random", "shuffle", "median of medians", "introselect"],
      },
    ],
    hint: "One approach keeps only the k best seen so far; the other borrows quicksort's partition step but throws half away each time.",
    explanation:
      "On average quickselect does n + n/2 + n/4 and so on, which sums to O(n), but a consistently bad pivot shrinks the range by only one element each time. Random pivots fix this in expectation, and median of medians guarantees O(n) worst case at a large constant. Use three-way partitioning when there are many duplicates.",
    tags: ["sorting", "heap"],
    difficulty: 2,
    relatedProblem: { title: "Kth Largest Element in an Array", leetcodeSlug: "kth-largest-element-in-an-array" },
  },

  // ─── Intervals ────────────────────────────────────────────────────────────
  {
    id: "mc-merge-intervals",
    title: "Merge Intervals",
    prompt:
      "📅 Merge Intervals: after sorting by start, when does the next interval merge into the last merged one, and what is the subtle bug when updating the end? Reply in 1-2 sentences.",
    answerKey:
      "Merge when next.start <= last.end (touching counts as overlapping here), and set last.end = max(last.end, next.end). Assigning next.end directly is the bug: an interval fully contained in the last one, like [1,10] then [2,3], would shrink the end.",
    keyPoints: [
      {
        label: "Overlap when next.start <= last.end",
        anyOf: [
          "next.start <= last.end",
          "start <= last end",
          "start <= prev end",
          "start <= end",
          "start is less than or equal",
          "starts before",
          "overlap",
          "overlaps",
          "overlapping",
        ],
      },
      {
        label: "Take the max of the ends",
        anyOf: ["max(last.end, next.end)", "max", "maximum", "larger end", "bigger end"],
      },
      {
        label: "Contained intervals would shrink the end",
        anyOf: ["contained", "inside", "nested", "fully covers", "engulfs", "subset", "shrink the end"],
      },
    ],
    hint: "Try [1,10], [2,3], [4,5]. What should the merged end be after processing [2,3]?",
    explanation:
      "Sorting by start guarantees that anything overlapping the current block starts inside it, so one linear pass after the O(n log n) sort is enough. Ask whether touching endpoints like [1,2] and [2,3] should merge; that decides between <= and <. Sort a copy if you shouldn't mutate the input.",
    tags: ["intervals", "sorting"],
    difficulty: 1,
    relatedProblem: { title: "Merge Intervals", leetcodeSlug: "merge-intervals" },
  },
  {
    id: "mc-insert-interval",
    title: "Insert Interval in one pass",
    prompt:
      "📅 Insert Interval: the list is already sorted and non-overlapping. How do you insert newInterval in O(n) without re-sorting? Reply in 1-2 sentences.",
    answerKey:
      "Walk the list in three phases: copy intervals that end before newInterval starts, then merge every interval that overlaps it by taking the min start and max end, then copy the rest. Because the input is sorted, one linear pass is enough and no sort is needed.",
    keyPoints: [
      {
        label: "Copy intervals that end before it",
        anyOf: ["end before", "ends before", "entirely before", "to the left", "left of", "before it starts", "copy"],
      },
      {
        label: "Merge overlaps with min start and max end",
        anyOf: ["min start", "max end", "min and max", "merge", "absorb", "expand", "grow"],
      },
      {
        label: "Copy the rest",
        anyOf: ["copy the rest", "the rest", "remaining", "append the rest", "to the right", "after it"],
      },
      {
        label: "One linear pass",
        anyOf: ["one pass", "single pass", "one linear pass", "linear", "o(n)"],
      },
    ],
    hint: "Relative to newInterval, the existing intervals fall into three groups. What are they?",
    explanation:
      "Phase one stops at the first interval whose end reaches newInterval's start; phase two continues while an interval's start is at most newInterval's end, growing newInterval as it absorbs them. Emitting the grown interval between phases keeps the output sorted. Binary search can find the boundaries in O(log n), but building the output is still O(n).",
    tags: ["intervals"],
    difficulty: 2,
    relatedProblem: { title: "Insert Interval", leetcodeSlug: "insert-interval" },
  },
  {
    id: "mc-meeting-rooms-min-heap",
    title: "Meeting Rooms II",
    prompt:
      "🏢 Meeting Rooms II: minimum conference rooms needed for a list of meetings. With meetings sorted by start, what do you keep in a min-heap, and when can a room be reused? Reply in 1-2 sentences.",
    answerKey:
      "Keep a min-heap of end times for rooms in use. For each meeting, if the earliest end time is at or before this meeting's start, pop it to reuse that room, then push this meeting's end; the heap's size at the end is the answer.",
    keyPoints: [
      {
        label: "Min-heap of end times",
        anyOf: ["end time", "end times", "ending times", "earliest end", "heap of ends", "when rooms free up"],
      },
      {
        label: "Reuse when the earliest end is at or before the start",
        anyOf: ["at or before", "reuse", "free", "frees up", "pop", "ended", "finished", "already over"],
      },
      {
        label: "Heap size is the room count",
        anyOf: ["heap size", "size of the heap", "heap's size", "max size", "number of rooms", "max concurrent", "maximum overlap", "peak"],
      },
    ],
    hint: "When a new meeting starts, only one existing room matters: the one that frees up soonest.",
    explanation:
      "The heap answers 'which room frees up first?' in O(log n), for O(n log n) total. An equivalent sweep sorts start times and end times separately and walks them with two pointers, counting concurrent meetings. Clarify ties: a meeting ending at 10 frees its room for one starting at 10, so process the end first.",
    tags: ["intervals", "heap", "sorting"],
    difficulty: 2,
    relatedProblem: { title: "Meeting Rooms II", leetcodeSlug: "meeting-rooms-ii" },
  },

  // ─── Linked lists ─────────────────────────────────────────────────────────
  {
    id: "mc-reverse-linked-list",
    title: "Reverse a linked list",
    prompt:
      "↩️ Reverse a singly linked list iteratively in O(1) space. Which pointers do you track, and what must you save before rewiring curr.next? Reply in 1-2 sentences.",
    answerKey:
      "Track prev (starting as null) and curr (starting at head); each step save next = curr.next, point curr.next to prev, then advance prev = curr and curr = next. You must save next first or you lose the rest of the list, and at the end prev is the new head.",
    keyPoints: [
      {
        label: "Track prev alongside curr",
        anyOf: ["prev", "previous", "three pointers", "3 pointers"],
      },
      {
        label: "Save next before rewiring",
        anyOf: ["save next", "save the next", "store next", "keep next", "temp", "tmp", "next = curr.next", "lose the rest"],
      },
      {
        label: "prev is the new head",
        anyOf: ["prev is the new head", "return prev", "new head", "prev at the end"],
      },
    ],
    hint: "The moment you point curr.next backward, how do you still reach the node that used to come after curr?",
    explanation:
      "Each node is visited once, so it is O(n) time and O(1) space. The recursive version (reverse the rest, then head.next.next = head and head.next = null) is elegant but uses O(n) stack and can overflow on long lists. Reversal is a building block for palindrome checks, reverse in k-groups, and reorder list.",
    tags: ["linked_list"],
    difficulty: 1,
    relatedProblem: { title: "Reverse Linked List", leetcodeSlug: "reverse-linked-list" },
  },
  {
    id: "mc-dummy-head-remove-nth",
    title: "Remove Nth from end with a dummy head",
    prompt:
      "🧷 Remove Nth Node From End of List in one pass. How do two pointers land on the node before the target, and why start both at a dummy node? Reply in 1-2 sentences.",
    answerKey:
      "Move fast n steps ahead of slow, then advance both until fast reaches the last node, so slow sits right before the target and you set slow.next = slow.next.next. Starting from a dummy node that points to head handles deleting the head itself without a special case, and you return dummy.next.",
    keyPoints: [
      {
        label: "Keep a gap of n between fast and slow",
        anyOf: ["n steps ahead", "n ahead", "n nodes ahead", "gap of n", "n apart", "head start", "offset", "gap"],
      },
      {
        label: "Slow stops right before the target",
        anyOf: ["right before", "just before", "previous node", "predecessor", "slow.next = slow.next.next", "slow.next.next", "skip"],
      },
      {
        label: "Dummy handles removing the head",
        anyOf: [
          "deleting the head",
          "delete the head",
          "remove the head",
          "removing the head",
          "head itself",
          "head is the target",
          "head gets removed",
          "special case",
          "edge case",
          "dummy.next",
        ],
      },
    ],
    hint: "If two runners keep a fixed gap and the front one reaches the end, where is the back one?",
    explanation:
      "A dummy (sentinel) node gives every real node a predecessor, so edits at the head use the same code as edits anywhere else. It is the go-to trick whenever the head might change, as in merging lists or removing elements. When n equals the list length the target is the head, exactly the case the dummy saves.",
    tags: ["linked_list", "two_pointers"],
    difficulty: 2,
    relatedProblem: { title: "Remove Nth Node From End of List", leetcodeSlug: "remove-nth-node-from-end-of-list" },
  },
  {
    id: "mc-floyd-cycle-entry",
    title: "Floyd: finding the cycle entry",
    prompt:
      "🐢🐇 Linked List Cycle II: after fast and slow meet inside the cycle, how do you find the node where the cycle begins, still in O(1) space? Reply in 1-2 sentences.",
    answerKey:
      "Reset one pointer to the head and move both one step at a time; the node where they meet again is the cycle's entry. It works because the distance from head to the entry equals the distance from the meeting point forward to the entry, modulo the cycle length.",
    keyPoints: [
      {
        label: "Reset one pointer to the head",
        anyOf: ["reset", "back to the head", "to the head", "from the head", "restart from head", "move one to head", "head"],
      },
      {
        label: "Advance both one step at a time",
        anyOf: ["one step", "1 step", "same speed", "same pace", "both one", "one at a time", "step by step"],
      },
      {
        label: "Why: the two distances match",
        anyOf: ["distance", "same distance", "equal", "equals", "modulo", "mod", "multiple of the cycle"],
      },
    ],
    hint: "Let a be the distance from head to the entry. When they meet, fast has walked twice as far as slow. What does that say about a?",
    explanation:
      "If slow walked a + b steps when they met, fast walked 2(a + b), and the extra a + b steps are whole laps, so a + b is a multiple of the cycle length. Walking a more steps from the meeting point therefore lands exactly on the entry, which is also a steps from the head. No visited set is needed.",
    tags: ["linked_list", "two_pointers"],
    difficulty: 2,
    relatedProblem: { title: "Linked List Cycle II", leetcodeSlug: "linked-list-cycle-ii" },
  },

  // ─── Strings ──────────────────────────────────────────────────────────────
  {
    id: "mc-string-concat-quadratic",
    title: "Hidden cost of string concatenation",
    prompt:
      "🧵 You build a result with s = s + ch inside a loop over n chars in Java or Python. What is the hidden cost, and what is the fix? Reply in 1 sentence.",
    answerKey:
      "Strings are immutable, so each concatenation copies the whole string built so far, making the loop O(n^2) overall. Append pieces to a list and join once, or use a StringBuilder, for O(n).",
    keyPoints: [
      {
        label: "Immutable strings get copied each time",
        anyOf: ["immutable", "copies", "copy", "new string", "reallocate", "reallocation", "allocation"],
      },
      {
        label: "O(n^2) overall",
        anyOf: ["o(n^2)", "n^2", "quadratic", "n squared"],
      },
      {
        label: "Use a list + join or a StringBuilder",
        anyOf: ["join", "stringbuilder", "string builder", "list of chars", "array of chars", "buffer", "stringio"],
      },
    ],
    hint: "Can a Java or Python string be changed in place? So what must s + ch produce on every iteration?",
    explanation:
      "Copying 1 + 2 + ... + n characters adds up to about n squared over 2. CPython sometimes optimizes in-place concatenation, but you can't rely on it, and Java compiles each + into a fresh builder per statement, so a loop still copies every time. Collecting parts and joining makes one final allocation of the right size.",
    tags: ["string"],
    difficulty: 1,
  },
  {
    id: "mc-palindrome-expand-center",
    title: "Expand around center",
    prompt:
      "🪞 Longest Palindromic Substring with expand-around-center: how many centers do you try, why that many, and what are the time and space costs? Reply in 1-2 sentences.",
    answerKey:
      "Try 2n - 1 centers: each of the n characters for odd-length palindromes and each of the n - 1 gaps between characters for even-length ones. Expanding outward while the ends match gives O(n^2) time and O(1) space.",
    keyPoints: [
      {
        label: "2n - 1 centers",
        anyOf: ["2n - 1", "2n-1", "2n", "2 n", "n and n - 1", "n + n - 1", "every char and every gap", "gaps"],
      },
      {
        label: "Odd and even lengths need different centers",
        anyOf: ["odd", "even", "between characters", "between chars", "gap", "two centers"],
      },
      {
        label: "O(n^2) time, O(1) space",
        anyOf: ["o(n^2)", "n^2", "quadratic", "n squared", "o(1) space", "constant space"],
      },
    ],
    hint: "'aba' has a middle letter but 'abba' doesn't. Where is the center of 'abba'?",
    explanation:
      "Each center expands at most n/2 steps, so the total is O(n^2) with a small constant and no table, beating the O(n^2)-space 2D DP. Manacher's algorithm reaches O(n) by reusing mirror information, but it is rarely expected in interviews. Track the best start and length rather than copying substrings.",
    tags: ["string", "two_pointers"],
    difficulty: 2,
    relatedProblem: { title: "Longest Palindromic Substring", leetcodeSlug: "longest-palindromic-substring" },
  },

  // ─── Matrix ───────────────────────────────────────────────────────────────
  {
    id: "mc-rotate-image-in-place",
    title: "Rotate a matrix in place",
    prompt:
      "🔁 Rotate Image: rotate an n x n matrix 90 degrees clockwise in place. Which two simple in-place steps compose into the rotation? Reply in 1 sentence.",
    answerKey:
      "Transpose the matrix (swap matrix[i][j] with matrix[j][i] for j > i), then reverse each row. For counterclockwise, reverse each row first and then transpose.",
    keyPoints: [
      {
        label: "Transpose",
        anyOf: ["transpose", "transposing", "swap across the diagonal", "flip over the diagonal", "diagonal", "matrix[i][j] with matrix[j][i]"],
      },
      {
        label: "Reverse each row",
        anyOf: ["reverse each row", "reverse every row", "reverse the rows", "reverse rows", "flip horizontally", "mirror"],
      },
    ],
    hint: "Clockwise rotation sends cell (i, j) to (j, n - 1 - i). Which simpler moves produce the swap of i and j, and the n - 1 - i?",
    explanation:
      "Transpose maps (i, j) to (j, i), and reversing each row maps (j, i) to (j, n - 1 - i), which is exactly the clockwise rotation. Both steps are O(n^2) time with O(1) extra space. The alternative is rotating four cells at a time layer by layer, which is easier to get wrong.",
    tags: ["matrix"],
    difficulty: 2,
    relatedProblem: { title: "Rotate Image", leetcodeSlug: "rotate-image" },
  },
  {
    id: "mc-spiral-matrix-bounds",
    title: "Spiral order boundaries",
    prompt:
      "🌀 Spiral Matrix: you walk the outer ring and pull four boundaries inward after each pass. What check prevents double-visiting cells when only one row or column is left? Reply in 1-2 sentences.",
    answerKey:
      "After walking the top row and right column and shrinking those bounds, only walk the bottom row if top <= bottom and the left column if left <= right. Without those checks, a leftover single row or column is walked twice in opposite directions.",
    keyPoints: [
      {
        label: "Guard the bottom-row pass with top <= bottom",
        anyOf: [
          "top <= bottom",
          "top < bottom",
          "top > bottom",
          "if top",
          "check top",
          "top is still",
          "top still",
          "rows remain",
          "still a row",
          "still valid",
          "havent crossed",
          "not crossed",
        ],
      },
      {
        label: "Guard the left-column pass with left <= right",
        anyOf: [
          "left <= right",
          "left < right",
          "left > right",
          "if left",
          "check left",
          "left is still",
          "left still",
          "columns remain",
          "cols remain",
          "still a column",
          "still valid",
          "havent crossed",
          "not crossed",
        ],
      },
    ],
    hint: "Try a 3 x 4 matrix. After the outer ring, what is left, and which of the four passes would run over it?",
    explanation:
      "Each pass walks one edge and pulls that boundary inward, so every cell is visited once: O(m n) time and O(1) extra space beyond the output. Non-square matrices are where the bugs hide, so test 1 x n and m x 1. A direction array with visited marks also works, at the cost of O(m n) extra space.",
    tags: ["matrix"],
    difficulty: 2,
    relatedProblem: { title: "Spiral Matrix", leetcodeSlug: "spiral-matrix" },
  },
  {
    id: "mc-set-matrix-zeroes-constant-space",
    title: "Set Matrix Zeroes in O(1) space",
    prompt:
      "0️⃣ Set Matrix Zeroes: if a cell is 0, zero its whole row and column, in place with O(1) extra space. Where do you store the row and column markers, and what edge case needs an extra flag? Reply in 2 sentences.",
    answerKey:
      "Use the first row and first column as marker arrays: for each zero at (i, j), set matrix[i][0] and matrix[0][j] to 0. Because matrix[0][0] is shared by both, keep a separate flag for whether the first column itself had a zero, and zero the first row and column last.",
    keyPoints: [
      {
        label: "First row and first column hold the markers",
        anyOf: ["first row", "first column", "first col", "row 0", "column 0", "col 0", "matrix[i][0]", "matrix[0][j]"],
      },
      {
        label: "matrix[0][0] is shared, so track one of them separately",
        anyOf: [
          "matrix[0][0]",
          "corner",
          "top left",
          "top-left",
          "shared",
          "overlap",
          "both use",
          "first column itself",
          "first col itself",
          "first row itself",
          "flag for the first",
          "flag for column 0",
          "flag for col 0",
          "flag for row 0",
          "boolean for the first",
          "separate variable",
          "separate boolean",
          "col0",
        ],
      },
      {
        label: "Handle the first row and column last",
        anyOf: ["last", "at the end", "finally", "after the rest", "second pass", "in reverse", "bottom up"],
      },
    ],
    hint: "You need m + n bits of memory, and the matrix already has m + n cells you will overwrite anyway. Which ones?",
    explanation:
      "Careless in-place marking cascades: a zero you just wrote looks like an original zero. Scan first, zero the inner cells from the markers, and only then handle the first row and column, so you never clobber markers you still need. The simpler O(m + n) version uses two boolean arrays.",
    tags: ["matrix"],
    difficulty: 3,
    relatedProblem: { title: "Set Matrix Zeroes", leetcodeSlug: "set-matrix-zeroes" },
  },

  // ─── Math & bits ──────────────────────────────────────────────────────────
  {
    id: "mc-single-number-xor",
    title: "Single Number with XOR",
    prompt:
      "🔢 Single Number: every element appears twice except one. Find it in O(n) time and O(1) space. Which operation do you use, and which properties make it work? Reply in 1 sentence.",
    answerKey:
      "XOR all the numbers together: x ^ x = 0, x ^ 0 = x, and XOR is commutative and associative, so every pair cancels and only the single number remains.",
    keyPoints: [
      {
        label: "XOR everything",
        anyOf: ["xor", "exclusive or"],
      },
      {
        label: "Pairs cancel (x ^ x = 0)",
        anyOf: ["cancel", "cancels", "x ^ x = 0", "a ^ a = 0", "itself is 0", "itself is zero", "pairs cancel"],
      },
      {
        label: "Order doesn't matter",
        anyOf: ["commutative", "associative", "order doesn't matter", "order does not matter", "any order"],
      },
    ],
    hint: "Which bitwise operation turns a number combined with itself into 0 and leaves a number combined with 0 unchanged?",
    explanation:
      "Because order doesn't matter, you can regroup the sequence so each duplicate pair sits together and becomes 0, leaving the single number. A hash set also works but costs O(n) space. Variants: if the others appear three times, count each bit mod 3; if two numbers are single, split them by any set bit of their XOR.",
    tags: ["bit_manipulation"],
    difficulty: 1,
    relatedProblem: { title: "Single Number", leetcodeSlug: "single-number" },
  },
  {
    id: "mc-clear-lowest-set-bit",
    title: "The n & (n - 1) trick",
    prompt:
      "🔢 What does n & (n - 1) do to an integer, and how does it give you a one-line power-of-two check and a fast bit count? Reply in 1-2 sentences.",
    answerKey:
      "n & (n - 1) clears the lowest set bit of n. A positive n is a power of two exactly when n & (n - 1) is 0, and counting how many times you can clear a bit before n hits 0 gives the number of set bits in time proportional to that count (Brian Kernighan's trick).",
    keyPoints: [
      {
        label: "It clears the lowest set bit",
        anyOf: [
          "clears the lowest set bit",
          "lowest set bit",
          "rightmost set bit",
          "rightmost 1",
          "lowest 1",
          "last set bit",
          "least significant set bit",
          "removes the lowest",
          "drops the lowest",
        ],
      },
      {
        label: "Power of two: positive and the result is 0",
        anyOf: ["power of two", "power of 2", "is 0", "equals 0", "is zero", "single set bit", "only one bit", "one bit set"],
      },
      {
        label: "Kernighan bit count",
        anyOf: ["kernighan", "number of set bits", "count bits", "count the bits", "count the ones", "popcount", "hamming weight", "number of 1 bits"],
      },
    ],
    hint: "Write 12 as 1100 and 11 as 1011. What happens when you AND them?",
    explanation:
      "Subtracting 1 flips the lowest set bit to 0 and every zero below it to 1, so the AND wipes out exactly that bit. Require n > 0, since 0 & -1 is also 0 but 0 is not a power of two. The same step gives the Counting Bits recurrence bits[i] = bits[i & (i - 1)] + 1.",
    tags: ["bit_manipulation", "math"],
    difficulty: 1,
    relatedProblem: { title: "Power of Two", leetcodeSlug: "power-of-two" },
  },
  {
    id: "mc-fast-power",
    title: "Fast exponentiation",
    prompt:
      "🚀 Pow(x, n): compute x to the power n in O(log n) instead of O(n). How does fast exponentiation work, and what edge case bites with negative n? Reply in 1-2 sentences.",
    answerKey:
      "Square the base and halve the exponent each step, multiplying the result by the current base whenever the exponent's lowest bit is 1, so there are O(log n) multiplications. For negative n compute 1 / x to the power -n, but widen n first because negating the minimum 32-bit int overflows.",
    keyPoints: [
      {
        label: "Square the base, halve the exponent",
        anyOf: [
          "square",
          "squaring",
          "halve",
          "half",
          "divide the exponent by 2",
          "n / 2",
          "n // 2",
          "n >> 1",
          "binary exponentiation",
          "exponentiation by squaring",
        ],
      },
      {
        label: "Multiply in the base when the bit is 1 (odd)",
        anyOf: ["odd", "lowest bit is 1", "bit is 1", "n & 1", "n % 2", "extra x", "multiply the result", "multiplying the result"],
      },
      {
        label: "Negative n: reciprocal and overflow",
        anyOf: ["1 / x", "1/x", "reciprocal", "invert", "inverse", "overflow", "int_min", "min int", "minimum 32-bit", "long"],
      },
    ],
    hint: "x^10 = (x^5)^2 and x^5 = x * (x^2)^2. What is the pattern for even and odd exponents?",
    explanation:
      "Each step halves n, so it is O(log n) time; recursion uses O(log n) stack, while the iterative bit version is O(1) space. In Java or C++, n = -2147483648 can't be negated inside an int, so cast to long first. The same idea powers modular exponentiation, where you reduce mod m after every multiplication.",
    tags: ["math", "recursion", "bit_manipulation"],
    difficulty: 2,
    relatedProblem: { title: "Pow(x, n)", leetcodeSlug: "powx-n" },
  },

  // ─── Design ───────────────────────────────────────────────────────────────
  {
    id: "mc-min-stack",
    title: "Min Stack in O(1)",
    prompt:
      "📚 Min Stack: push, pop, top and getMin all in O(1). What extra state do you store, and why does it stay correct after a pop? Reply in 1-2 sentences.",
    answerKey:
      "Store the minimum so far alongside each element, either as (value, currentMin) pairs or in a parallel min stack. getMin just reads the top's saved minimum, and popping restores the previous minimum automatically because each entry remembers the min at the time it was pushed.",
    keyPoints: [
      {
        label: "Store the min so far with each element",
        anyOf: [
          "min so far",
          "minimum so far",
          "current min",
          "currentmin",
          "running min",
          "running minimum",
          "pair",
          "pairs",
          "tuple",
          "second stack",
          "another stack",
          "extra stack",
          "stack of mins",
          "auxiliary stack",
          "parallel stack",
          "two stacks",
        ],
      },
      {
        label: "getMin reads the top entry",
        anyOf: ["read the top", "top's min", "top's saved", "top of the min stack", "top of the second stack", "top pair", "peek", "last element", "last entry"],
      },
      {
        label: "Popping restores the previous min",
        anyOf: ["previous min", "previous minimum", "restores", "automatically", "remembers", "snapshot", "at the time", "when it was pushed", "below it"],
      },
    ],
    hint: "A single min variable breaks the moment you pop the minimum. What if every level of the stack remembered its own answer?",
    explanation:
      "The elements below any stack position never change while that position exists, so the min up to that position is a fixed fact you can cache at push time. A space optimization pushes onto the min stack only when value <= current min, and pops it when the popped value equals its top; the <= keeps duplicate minimums safe.",
    tags: ["design"],
    difficulty: 1,
    relatedProblem: { title: "Min Stack", leetcodeSlug: "min-stack" },
  },
  {
    id: "mc-lru-cache-o1",
    title: "LRU Cache in O(1)",
    prompt:
      "🧠 Design an LRU cache where get and put both run in O(1). Which two data structures do you combine, and what job does each one do? Reply in 1-2 sentences.",
    answerKey:
      "Combine a hash map from key to node with a doubly linked list ordered by recency. The map gives O(1) lookup; the list gives O(1) move-to-front on access and O(1) eviction of the least recently used node at the tail.",
    keyPoints: [
      {
        label: "Hash map for O(1) key lookup",
        anyOf: ["hash map", "hashmap", "hash table", "dictionary", "dict", "map"],
      },
      {
        label: "Doubly linked list ordered by recency",
        anyOf: ["doubly linked list", "doubly-linked list", "linked list", "dll", "deque", "ordereddict", "linkedhashmap"],
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
    id: "mc-lru-why-doubly-linked",
    title: "LRU: why not an array?",
    prompt:
      "🧠 LRU cache follow-up: even with a hash map pointing into it, why can't a plain array (or a singly linked list) keep the recency order in O(1)? Reply in 1-2 sentences.",
    answerKey:
      "An array must shift every element after the one you move or evict, so each reorder is O(n), and the indexes stored in the map go stale after every shift. A singly linked list can't unlink a node in O(1) because it has no pointer to the previous node, so you need a doubly linked list with prev and next pointers.",
    keyPoints: [
      {
        label: "Array moves shift elements: O(n)",
        anyOf: ["shift", "shifting", "o(n)", "linear", "move every element", "moving elements", "stale", "reindex", "indexes change", "indices change"],
      },
      {
        label: "Singly linked list has no prev pointer",
        anyOf: ["previous", "prev", "predecessor", "back pointer", "no back pointer", "node before"],
      },
      {
        label: "Doubly linked list unlinks in O(1)",
        anyOf: ["doubly linked", "doubly-linked", "dll", "prev and next", "both directions", "unlink in o(1)", "o(1) unlink", "o(1) removal"],
      },
    ],
    hint: "Picture moving the key at index 3 of 1000 to the front. What happens to the other entries, and to the indexes your map stored?",
    explanation:
      "The map hands you the entry, but that only helps if you can detach and reattach it by touching just its neighbors. Array slots are positional, so any move invalidates positions. Doubly linked nodes are position-free: unlinking is prev.next = next and next.prev = prev, both O(1).",
    tags: ["design", "linked_list"],
    difficulty: 2,
    relatedProblem: { title: "LRU Cache", leetcodeSlug: "lru-cache" },
  },
  {
    id: "mc-lfu-cache-o1",
    title: "LFU Cache in O(1)",
    prompt:
      "🧠 LFU cache: evict the least frequently used key, ties broken by least recently used, with O(1) get and put. What structures do you keep, and how do you find the victim instantly? Reply in 2 sentences.",
    answerKey:
      "Keep a key-to-node hash map, a map from frequency to a doubly linked list of nodes in recency order, and a minFreq counter. On access move the node to the freq + 1 list (bumping minFreq if its old list was the minimum and is now empty), reset minFreq to 1 on insert, and evict from the least recent end of the minFreq list.",
    keyPoints: [
      {
        label: "Key-to-node hash map",
        anyOf: ["key to node", "key-to-node", "hash map", "hashmap", "dict", "key map"],
      },
      {
        label: "Frequency buckets of recency lists",
        anyOf: [
          "frequency to",
          "freq to",
          "frequency buckets",
          "freq buckets",
          "bucket",
          "list per frequency",
          "frequency list",
          "frequency lists",
          "doubly linked list",
          "dll",
          "linkedhashset",
          "ordereddict",
        ],
      },
      {
        label: "Track minFreq",
        anyOf: ["minfreq", "min freq", "min_freq", "minimum frequency", "min frequency", "lowest frequency"],
      },
      {
        label: "Evict the least recent node of the minFreq list",
        anyOf: ["least recent", "least recently used", "lru", "tail", "oldest", "recency"],
      },
    ],
    hint: "Two questions must be O(1): which frequency is smallest right now, and within that frequency, who is oldest?",
    explanation:
      "minFreq only changes in two ways: a fresh insert makes it 1, and touching the last node of the minimum bucket makes it minFreq + 1, so you never scan for it. Each bucket is itself an LRU list, which handles the tie-break. In Java a LinkedHashSet per frequency, or in Python an OrderedDict per frequency, gives the same effect.",
    tags: ["design", "hashing", "linked_list"],
    difficulty: 3,
    relatedProblem: { title: "LFU Cache", leetcodeSlug: "lfu-cache" },
  },
  {
    id: "mc-insert-delete-getrandom",
    title: "Insert Delete GetRandom O(1)",
    prompt:
      "🎲 Support insert, remove and getRandom (uniform) all in average O(1). Which structures do you use, and how do you delete from the middle without an O(n) shift? Reply in 1-2 sentences.",
    answerKey:
      "Keep the values in a dynamic array for uniform random indexing, plus a hash map from value to its index. To remove, swap the target with the last element, update the moved element's index in the map, then pop the last slot.",
    keyPoints: [
      {
        label: "Array for random indexing",
        anyOf: ["array", "list", "vector", "arraylist", "random index"],
      },
      {
        label: "Hash map from value to index",
        anyOf: ["value to index", "value to its index", "hash map", "hashmap", "dict", "index map", "map"],
      },
      {
        label: "Swap with the last element, then pop",
        anyOf: ["swap", "swap with the last", "last element", "move the last", "overwrite with the last", "pop"],
      },
      {
        label: "Update the moved element's index",
        anyOf: ["update", "moved element", "fix the index", "reindex"],
      },
    ],
    hint: "Order doesn't matter in a set. If you're allowed to scramble order, which array element is cheapest to remove?",
    explanation:
      "A hash set alone can't pick a uniform random element in O(1) because it has no index access, and an array alone can't find a value in O(1). Removing from the end of an array is O(1), and since order is irrelevant you can move the last element into the hole. Update the map before deleting the key so removing the last element itself still works.",
    tags: ["design", "hashing"],
    difficulty: 2,
    relatedProblem: { title: "Insert Delete GetRandom O(1)", leetcodeSlug: "insert-delete-getrandom-o1" },
  },
  {
    id: "mc-rate-limiter-token-bucket",
    title: "Rate limiter: fixed window vs token bucket",
    prompt:
      "🚦 A fixed-window rate limiter allows 100 requests per minute. What burst can slip through at the window boundary, and how does a token bucket prevent it? Reply in 2 sentences.",
    answerKey:
      "A client can send 100 requests at the end of one window and 100 more at the start of the next, so about 200 get through within a few seconds. A token bucket refills tokens at a steady rate up to a fixed capacity and each request spends one token, so bursts are capped at the capacity and the long-run rate is the refill rate.",
    keyPoints: [
      {
        label: "Boundary burst of about 2x",
        anyOf: ["200", "double", "2x", "twice", "boundary", "end of one window", "edge of the window", "window edge", "back to back", "two windows"],
      },
      {
        label: "Tokens refill at a steady rate",
        anyOf: ["refill", "refills", "steady rate", "constant rate", "fixed rate", "tokens per second", "replenish", "drip"],
      },
      {
        label: "Bursts capped by bucket capacity",
        anyOf: ["capacity", "bucket size", "max tokens", "cap", "capped", "burst size", "maximum burst"],
      },
      {
        label: "Each request spends a token",
        anyOf: ["spend", "spends", "consume", "consumes", "take a token", "one token", "costs a token", "remove a token", "decrement"],
      },
    ],
    hint: "Say the minute rolls over at 12:00:00. What can a client do at 11:59:59, and then again at 12:00:01?",
    explanation:
      "Fixed windows are cheap (one counter per key) but only bound each calendar window, not every rolling 60 seconds. A token bucket needs two numbers per client, tokens and last refill time, and refills lazily on each request: tokens = min(capacity, tokens + elapsed * rate). A sliding-window log is exact but stores a timestamp per request, and a sliding-window counter approximates it with two counters.",
    tags: ["design"],
    difficulty: 2,
  },
];
