import type { MicroCard } from "./types";

/**
 * Deck C: arrays, stacks, BST order, and union-find, so struggles in those
 * topics turn into iMessage drills. Same authoring rules as decks A and B
 * (plain text, at most 280 chars, answer keys grade as correct on their own key points).
 */
export const MICROCARDS_C: MicroCard[] = [
  // ---------------------------------------------------------------- Arrays
  {
    id: "mc-kadane-max-subarray",
    title: "Kadane: maximum subarray",
    prompt:
      "📈 Maximum Subarray in O(n): what running value does Kadane's algorithm keep, and what is the one decision it makes at each element? Reply in 1-2 sentences.",
    answerKey:
      "Keep the best sum of a subarray ending at the current index. At each element either extend the previous run or start fresh at this element, whichever is larger (cur = max(x, cur + x)), and track the best cur seen; a negative running sum is never worth carrying.",
    keyPoints: [
      { label: "Best sum of a subarray ending here", anyOf: ["ending at the current", "ending here", "ends at i", "ending at index", "running sum"] },
      { label: "Extend the run or start fresh", anyOf: ["start fresh", "extend the previous", "restart", "cur = max(x, cur + x)", "start over"] },
      { label: "Track the best seen overall", anyOf: ["best cur seen", "global max", "best so far", "track the best", "overall max"] },
    ],
    hint: "If the best subarray ending at i-1 has a negative sum, would you ever keep it when you reach i?",
    explanation:
      "Every subarray ends somewhere, so the answer is the best of the best-ending-here values. A run with a negative sum only drags down whatever follows, which is why dropping it is always safe. One pass, O(1) space; with all negatives it returns the largest single element.",
    tags: ["arrays", "dp_1d"],
    difficulty: 2,
    relatedProblem: { title: "Maximum Subarray", leetcodeSlug: "maximum-subarray" },
  },
  {
    id: "mc-best-time-buy-sell",
    title: "Best time to buy and sell stock",
    prompt:
      "💹 Best Time to Buy and Sell Stock (one trade): what do you track as you scan the prices once, and how do you compute the answer from it? Reply in 1-2 sentences.",
    answerKey:
      "Track the minimum price seen so far. At each day the best sale is today's price minus that minimum, so keep the max of that difference; buying must come before selling, and the scan order guarantees it.",
    keyPoints: [
      { label: "Track the lowest price so far", anyOf: ["minimum price", "lowest price", "min price", "cheapest so far", "minimum so far"] },
      { label: "Profit today = price - min so far", anyOf: ["price minus", "minus that minimum", "price - min", "today's price minus", "difference"] },
      { label: "Buy must come before sell", anyOf: ["before selling", "buy before", "scan order", "earlier day", "comes before"] },
    ],
    hint: "If you sold today, which past day would you have wanted to buy on?",
    explanation:
      "The best buy for a sale on day i is the cheapest day before i, so a single running minimum answers every day in O(1). This is the same shape as Kadane's algorithm on daily price differences.",
    tags: ["arrays", "greedy"],
    difficulty: 1,
    relatedProblem: { title: "Best Time to Buy and Sell Stock", leetcodeSlug: "best-time-to-buy-and-sell-stock" },
  },
  {
    id: "mc-rotate-array-reversals",
    title: "Rotate an array in place",
    prompt:
      "🔁 Rotate Array right by k in O(1) extra space: what three reversals do it, and what must you do to k first? Reply in 1-2 sentences.",
    answerKey:
      "First take k = k mod n. Then reverse the whole array, reverse the first k elements, and reverse the remaining n - k elements; the last k elements end up in front, in order, with O(1) extra space.",
    keyPoints: [
      { label: "k mod n first", anyOf: ["k mod n", "k % n", "modulo", "k = k % n", "k mod the length"] },
      { label: "Reverse the whole array", anyOf: ["reverse the whole array", "reverse everything", "reverse the entire array", "reverse all"] },
      { label: "Then reverse the first k and the rest", anyOf: ["first k elements", "reverse the first k", "remaining n - k", "the rest", "last n - k"] },
    ],
    hint: "Reversing everything puts the last k elements in front, but backwards. How do you fix each part?",
    explanation:
      "Reversal is its own inverse on each segment, so the full reverse moves blocks and the two partial reverses restore order inside each block. Without k mod n, k larger than n would index out of range.",
    tags: ["arrays", "two_pointers"],
    difficulty: 2,
    relatedProblem: { title: "Rotate Array", leetcodeSlug: "rotate-array" },
  },
  {
    id: "mc-boyer-moore-majority",
    title: "Boyer-Moore majority vote",
    prompt:
      "🗳️ Majority Element (appears more than n/2 times) in O(n) time and O(1) space: describe the Boyer-Moore voting idea, candidate and counter. Reply in 1-2 sentences.",
    answerKey:
      "Keep a candidate and a counter: when the counter is 0 adopt the current element as the candidate, then add 1 if the element equals the candidate and subtract 1 otherwise. Pairs of different values cancel out, so the majority value, having more than half, survives as the candidate.",
    keyPoints: [
      { label: "A candidate and a counter", anyOf: ["candidate and a counter", "candidate and counter", "a candidate", "count and candidate"] },
      { label: "Adopt a new candidate at count 0", anyOf: ["counter is 0", "count is 0", "count reaches 0", "count hits zero", "adopt the current"] },
      { label: "Different values cancel out", anyOf: ["cancel out", "cancel each other", "pairs of different", "cancels"] },
    ],
    hint: "Pair each majority element with a different element. Can the majority ever be fully paired off?",
    explanation:
      "Each decrement removes one majority vote and one other vote, and the majority has more than half the votes, so it can never be cancelled completely. If a majority might not exist, run a second pass to count the final candidate.",
    tags: ["arrays", "math"],
    difficulty: 2,
    relatedProblem: { title: "Majority Element", leetcodeSlug: "majority-element" },
  },

  // ---------------------------------------------------------------- Stack
  {
    id: "mc-valid-parentheses-stack",
    title: "Valid parentheses with a stack",
    prompt:
      "🧱 Valid Parentheses: what does the stack hold, what must be true when a closing bracket arrives, and what final check do people forget? Reply in 1-2 sentences.",
    answerKey:
      "The stack holds unmatched opening brackets. A closing bracket must match the opener on top of the stack, which you pop; at the end the stack must be empty, or leftover openers like '((' make the string invalid.",
    keyPoints: [
      { label: "The stack holds unmatched openers", anyOf: ["unmatched opening", "opening brackets", "open brackets", "unmatched openers"] },
      { label: "A closer must match the top", anyOf: ["match the opener on top", "matches the top", "top of the stack", "pop the matching"] },
      { label: "The stack must end empty", anyOf: ["stack must be empty", "must be empty", "stack is empty", "leftover openers"] },
    ],
    hint: "What input has no mismatches but is still invalid?",
    explanation:
      "The most recently opened bracket must close first, which is exactly LIFO order. Checking only for mismatches accepts strings that never close their openers, so the final emptiness check is part of the algorithm.",
    tags: ["stack", "string"],
    difficulty: 1,
    relatedProblem: { title: "Valid Parentheses", leetcodeSlug: "valid-parentheses" },
  },
  {
    id: "mc-rpn-operand-order",
    title: "Reverse Polish Notation: operand order",
    prompt:
      "🧮 Evaluating Reverse Polish Notation with a stack: when you pop two values for '-' or '/', which one is the left operand, and how should division round? Reply in 1-2 sentences.",
    answerKey:
      "The first value popped is the right operand and the second popped is the left, so compute second - first and second / first. Division truncates toward zero, so -7 / 2 is -3, not the floor -4.",
    keyPoints: [
      { label: "The second popped is the left operand", anyOf: ["second popped is the left", "first value popped is the right", "second - first", "right operand", "order matters"] },
      { label: "Truncate toward zero", anyOf: ["toward zero", "towards zero", "truncates", "not the floor"] },
    ],
    hint: "Push 13 then 5, then read '/'. Which one comes off the stack first?",
    explanation:
      "Operands are pushed left to right, so the right operand sits on top. Most languages' integer division truncates, but Python's // floors, so use int(a / b) there.",
    tags: ["stack", "math"],
    difficulty: 2,
    relatedProblem: { title: "Evaluate Reverse Polish Notation", leetcodeSlug: "evaluate-reverse-polish-notation" },
  },
  {
    id: "mc-decode-string-stacks",
    title: "Decode string with stacks",
    prompt:
      "🧵 Decode String like '3[a2[c]]' → 'accaccacc': what do you push when you see '[' and what do you do when you see ']'? Reply in 1-2 sentences.",
    answerKey:
      "On '[' push the repeat count and the string built so far onto stacks, then start a fresh current string. On ']' pop the count and the previous string, and set current = previous + current repeated count times; digits can span several characters, so build the count as you read.",
    keyPoints: [
      { label: "On '[' push the count and the string so far", anyOf: ["push the repeat count", "push the count", "string built so far", "push the current string"] },
      { label: "On ']' pop and append the repeated current string", anyOf: ["pop the count", "repeated count times", "previous + current", "pop and repeat"] },
      { label: "Counts can have several digits", anyOf: ["several characters", "multiple digits", "multi-digit", "build the count"] },
    ],
    hint: "Nested brackets mean you must pause the outer string while you build the inner one. Where do you park it?",
    explanation:
      "Each '[' starts a new scope, and the stacks remember every enclosing scope's partial string and multiplier. A recursive descent parser works the same way, with the call stack doing the saving.",
    tags: ["stack", "string", "recursion"],
    difficulty: 2,
    relatedProblem: { title: "Decode String", leetcodeSlug: "decode-string" },
  },

  // ---------------------------------------------------------------- BST
  {
    id: "mc-bst-kth-smallest-inorder",
    title: "Kth smallest in a BST",
    prompt:
      "🌲 Kth Smallest Element in a BST: which traversal visits the values in sorted order, and how do you stop early? Reply in 1-2 sentences.",
    answerKey:
      "An inorder traversal (left, node, right) visits BST values in sorted order. Count nodes as you visit them and stop at the kth, which takes O(h + k) time with an iterative stack instead of walking the whole tree.",
    keyPoints: [
      { label: "Inorder traversal is sorted", anyOf: ["inorder traversal", "in-order traversal", "inorder", "left, node, right"] },
      { label: "Count and stop at the kth", anyOf: ["stop at the kth", "count nodes", "stop early", "kth visited", "decrement k"] },
    ],
    hint: "In a BST, everything in a node's left subtree is smaller. What order does that give if you go left first?",
    explanation:
      "The BST property makes inorder order equal to sorted order, so the kth node visited is the answer. If the tree changes often and queries repeat, store subtree sizes to answer in O(h).",
    tags: ["bst", "tree_traversal"],
    difficulty: 2,
    relatedProblem: { title: "Kth Smallest Element in a BST", leetcodeSlug: "kth-smallest-element-in-a-bst" },
  },
  {
    id: "mc-bst-lca-split",
    title: "Lowest common ancestor in a BST",
    prompt:
      "🌿 Lowest Common Ancestor of p and q in a BST (not a general tree): how does the BST property let you find it in O(h) without searching both subtrees? Reply in 1-2 sentences.",
    answerKey:
      "Walk down from the root: if both p and q are smaller than the node go left, if both are larger go right, otherwise the node is where they split and it is the lowest common ancestor. That uses only the values, so it is O(h).",
    keyPoints: [
      { label: "Both smaller: go left; both larger: go right", anyOf: ["both smaller", "both are smaller", "both larger", "both are larger", "both less than"] },
      { label: "The split point is the answer", anyOf: ["where they split", "split point", "they diverge", "one on each side", "otherwise the node"] },
    ],
    hint: "If p is left of the node and q is right of it, can any lower node contain both?",
    explanation:
      "Above the split both nodes sit on the same side, so the ancestor can go lower; at the split they separate, so no deeper node contains both. A node equal to p or q also counts as the split.",
    tags: ["bst", "tree_traversal"],
    difficulty: 1,
    relatedProblem: { title: "Lowest Common Ancestor of a Binary Search Tree", leetcodeSlug: "lowest-common-ancestor-of-a-binary-search-tree" },
  },

  // ---------------------------------------------------------------- Union-Find
  {
    id: "mc-union-find-rank-compression",
    title: "Union-find: two optimizations",
    prompt:
      "🔗 Union-Find: name the two optimizations that make find and union nearly constant time, and say what each one does. Reply in 1-2 sentences.",
    answerKey:
      "Path compression points every node on a find path straight at the root, and union by rank (or size) attaches the shorter tree under the taller one. Together they give amortized inverse-Ackermann time per operation, effectively constant.",
    keyPoints: [
      { label: "Path compression", anyOf: ["path compression", "compress the path", "point straight at the root", "points every node"] },
      { label: "Union by rank or size", anyOf: ["union by rank", "union by size", "shorter tree under", "smaller tree under", "by rank"] },
      { label: "Nearly constant (inverse Ackermann)", anyOf: ["inverse-ackermann", "inverse ackermann", "effectively constant", "nearly constant", "amortized"] },
    ],
    hint: "One trick fixes tall trees after the fact, the other avoids making them. What are they?",
    explanation:
      "Without either, a chain of unions can build a linked list and make find O(n). Each trick alone gives O(log n); both together give α(n), which is at most 4 for any realistic input.",
    tags: ["union_find"],
    difficulty: 2,
    relatedProblem: { title: "Number of Provinces", leetcodeSlug: "number-of-provinces" },
  },
];
