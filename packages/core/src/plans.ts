/**
 * Study plans (browser-safe: slugs and titles only, no content). NeetCode 150 grouped by its
 * roadmap categories; the Blind 75 is the subset flagged below. Problems Prepr doesn't have yet
 * still count toward the plan total so progress is honest.
 */
export type StudyPlanId = "blind75" | "neetcode150";

export interface StudyPlanCategory {
  name: string;
  slugs: string[];
}

export interface StudyPlan {
  id: StudyPlanId;
  title: string;
  description: string;
  categories: StudyPlanCategory[];
}

const NEETCODE_150: StudyPlanCategory[] = [
  {
    name: "Arrays & Hashing",
    slugs: [
      "contains-duplicate",
      "valid-anagram",
      "two-sum",
      "group-anagrams",
      "top-k-frequent-elements",
      "encode-and-decode-strings",
      "product-of-array-except-self",
      "valid-sudoku",
      "longest-consecutive-sequence",
    ],
  },
  { name: "Two Pointers", slugs: ["valid-palindrome", "two-sum-ii-input-array-is-sorted", "3sum", "container-with-most-water", "trapping-rain-water"] },
  {
    name: "Sliding Window",
    slugs: [
      "best-time-to-buy-and-sell-stock",
      "longest-substring-without-repeating-characters",
      "longest-repeating-character-replacement",
      "permutation-in-string",
      "minimum-window-substring",
      "sliding-window-maximum",
    ],
  },
  {
    name: "Stack",
    slugs: ["valid-parentheses", "min-stack", "evaluate-reverse-polish-notation", "generate-parentheses", "daily-temperatures", "car-fleet", "largest-rectangle-in-histogram"],
  },
  {
    name: "Binary Search",
    slugs: [
      "binary-search",
      "search-a-2d-matrix",
      "koko-eating-bananas",
      "find-minimum-in-rotated-sorted-array",
      "search-in-rotated-sorted-array",
      "time-based-key-value-store",
      "median-of-two-sorted-arrays",
    ],
  },
  {
    name: "Linked List",
    slugs: [
      "reverse-linked-list",
      "merge-two-sorted-lists",
      "reorder-list",
      "remove-nth-node-from-end-of-list",
      "copy-list-with-random-pointer",
      "add-two-numbers",
      "linked-list-cycle",
      "find-the-duplicate-number",
      "lru-cache",
      "merge-k-sorted-lists",
      "reverse-nodes-in-k-group",
    ],
  },
  {
    name: "Trees",
    slugs: [
      "invert-binary-tree",
      "maximum-depth-of-binary-tree",
      "diameter-of-binary-tree",
      "balanced-binary-tree",
      "same-tree",
      "subtree-of-another-tree",
      "lowest-common-ancestor-of-a-binary-search-tree",
      "binary-tree-level-order-traversal",
      "binary-tree-right-side-view",
      "count-good-nodes-in-binary-tree",
      "validate-binary-search-tree",
      "kth-smallest-element-in-a-bst",
      "construct-binary-tree-from-preorder-and-inorder-traversal",
      "binary-tree-maximum-path-sum",
      "serialize-and-deserialize-binary-tree",
    ],
  },
  { name: "Tries", slugs: ["implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii"] },
  {
    name: "Heap / Priority Queue",
    slugs: [
      "kth-largest-element-in-a-stream",
      "last-stone-weight",
      "k-closest-points-to-origin",
      "kth-largest-element-in-an-array",
      "task-scheduler",
      "design-twitter",
      "find-median-from-data-stream",
    ],
  },
  {
    name: "Backtracking",
    slugs: [
      "subsets",
      "combination-sum",
      "permutations",
      "subsets-ii",
      "combination-sum-ii",
      "word-search",
      "palindrome-partitioning",
      "letter-combinations-of-a-phone-number",
      "n-queens",
    ],
  },
  {
    name: "Graphs",
    slugs: [
      "number-of-islands",
      "clone-graph",
      "max-area-of-island",
      "pacific-atlantic-water-flow",
      "surrounded-regions",
      "rotting-oranges",
      "walls-and-gates",
      "course-schedule",
      "course-schedule-ii",
      "redundant-connection",
      "number-of-connected-components-in-an-undirected-graph",
      "graph-valid-tree",
      "word-ladder",
    ],
  },
  {
    name: "Advanced Graphs",
    slugs: [
      "reconstruct-itinerary",
      "min-cost-to-connect-all-points",
      "network-delay-time",
      "swim-in-rising-water",
      "alien-dictionary",
      "cheapest-flights-within-k-stops",
    ],
  },
  {
    name: "1-D Dynamic Programming",
    slugs: [
      "climbing-stairs",
      "min-cost-climbing-stairs",
      "house-robber",
      "house-robber-ii",
      "longest-palindromic-substring",
      "palindromic-substrings",
      "decode-ways",
      "coin-change",
      "maximum-product-subarray",
      "word-break",
      "longest-increasing-subsequence",
      "partition-equal-subset-sum",
    ],
  },
  {
    name: "2-D Dynamic Programming",
    slugs: [
      "unique-paths",
      "longest-common-subsequence",
      "best-time-to-buy-and-sell-stock-with-cooldown",
      "coin-change-ii",
      "target-sum",
      "interleaving-string",
      "longest-increasing-path-in-a-matrix",
      "distinct-subsequences",
      "edit-distance",
      "burst-balloons",
      "regular-expression-matching",
    ],
  },
  {
    name: "Greedy",
    slugs: [
      "maximum-subarray",
      "jump-game",
      "jump-game-ii",
      "gas-station",
      "hand-of-straights",
      "merge-triplets-to-form-target-triplet",
      "partition-labels",
      "valid-parenthesis-string",
    ],
  },
  {
    name: "Intervals",
    slugs: ["insert-interval", "merge-intervals", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii", "minimum-interval-to-include-each-query"],
  },
  {
    name: "Math & Geometry",
    slugs: ["rotate-image", "spiral-matrix", "set-matrix-zeroes", "happy-number", "plus-one", "powx-n", "multiply-strings", "detect-squares"],
  },
  {
    name: "Bit Manipulation",
    slugs: ["single-number", "number-of-1-bits", "counting-bits", "reverse-bits", "missing-number", "sum-of-two-integers", "reverse-integer"],
  },
];

const BLIND_75 = new Set([
  "contains-duplicate",
  "valid-anagram",
  "two-sum",
  "group-anagrams",
  "top-k-frequent-elements",
  "encode-and-decode-strings",
  "product-of-array-except-self",
  "longest-consecutive-sequence",
  "valid-palindrome",
  "3sum",
  "container-with-most-water",
  "best-time-to-buy-and-sell-stock",
  "longest-substring-without-repeating-characters",
  "longest-repeating-character-replacement",
  "minimum-window-substring",
  "valid-parentheses",
  "find-minimum-in-rotated-sorted-array",
  "search-in-rotated-sorted-array",
  "reverse-linked-list",
  "merge-two-sorted-lists",
  "reorder-list",
  "remove-nth-node-from-end-of-list",
  "linked-list-cycle",
  "merge-k-sorted-lists",
  "invert-binary-tree",
  "maximum-depth-of-binary-tree",
  "same-tree",
  "subtree-of-another-tree",
  "lowest-common-ancestor-of-a-binary-search-tree",
  "binary-tree-level-order-traversal",
  "validate-binary-search-tree",
  "kth-smallest-element-in-a-bst",
  "construct-binary-tree-from-preorder-and-inorder-traversal",
  "binary-tree-maximum-path-sum",
  "serialize-and-deserialize-binary-tree",
  "implement-trie-prefix-tree",
  "design-add-and-search-words-data-structure",
  "word-search-ii",
  "find-median-from-data-stream",
  "combination-sum",
  "word-search",
  "number-of-islands",
  "clone-graph",
  "pacific-atlantic-water-flow",
  "course-schedule",
  "number-of-connected-components-in-an-undirected-graph",
  "graph-valid-tree",
  "alien-dictionary",
  "climbing-stairs",
  "house-robber",
  "house-robber-ii",
  "longest-palindromic-substring",
  "palindromic-substrings",
  "decode-ways",
  "coin-change",
  "maximum-product-subarray",
  "word-break",
  "longest-increasing-subsequence",
  "unique-paths",
  "longest-common-subsequence",
  "maximum-subarray",
  "jump-game",
  "insert-interval",
  "merge-intervals",
  "non-overlapping-intervals",
  "meeting-rooms",
  "meeting-rooms-ii",
  "rotate-image",
  "spiral-matrix",
  "set-matrix-zeroes",
  "number-of-1-bits",
  "counting-bits",
  "reverse-bits",
  "missing-number",
  "sum-of-two-integers",
]);

export const STUDY_PLANS: readonly StudyPlan[] = [
  {
    id: "blind75",
    title: "Blind 75",
    description: "The classic 75: every core pattern once.",
    categories: NEETCODE_150.map((category) => ({ name: category.name, slugs: category.slugs.filter((slug) => BLIND_75.has(slug)) })).filter(
      (category) => category.slugs.length > 0,
    ),
  },
  {
    id: "neetcode150",
    title: "NeetCode 150",
    description: "The Blind 75 plus 75 more for depth.",
    categories: NEETCODE_150,
  },
];

export function getStudyPlan(id: string): StudyPlan | undefined {
  return STUDY_PLANS.find((plan) => plan.id === id);
}

export function planSlugs(plan: StudyPlan): string[] {
  return plan.categories.flatMap((category) => category.slugs);
}

const UPPER = new Set(["ii", "iii", "iv", "bst", "lru", "k", "2d", "n"]);

/** Display title from a LeetCode slug, for plan items Prepr doesn't have yet. */
export function titleFromSlug(slug: string): string {
  if (slug === "powx-n") return "Pow(x, n)";
  if (slug === "3sum") return "3Sum";
  return slug
    .split("-")
    .map((word, index) => (UPPER.has(word) ? word.toUpperCase() : index > 0 && ["a", "an", "the", "of", "in", "to", "and", "from", "with"].includes(word) ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(" ");
}

export interface PlanProgress {
  total: number;
  /** Plan problems that exist in Prepr. */
  available: number;
  solved: number;
}

/** Progress over a plan given the catalog's slugs and the slugs the user has solved. */
export function planProgress(plan: StudyPlan, catalog: ReadonlySet<string>, solved: ReadonlySet<string>): PlanProgress {
  const slugs = planSlugs(plan);
  return {
    total: slugs.length,
    available: slugs.filter((slug) => catalog.has(slug)).length,
    solved: slugs.filter((slug) => solved.has(slug)).length,
  };
}
