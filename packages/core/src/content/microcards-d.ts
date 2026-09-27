import type { MicroCard } from "./types";

/**
 * Deck D: the Blind 75 ideas decks A-C left thin (grid flood fill, graph copy,
 * tree codecs and construction, palindrome and grid DP, trie wildcards, word
 * break, bit tricks, list surgery), so every problem drills two on-topic cards.
 * Same authoring rules as decks A-C (plain text, at most 280 chars, answer keys
 * grade as correct on their own key points).
 */
export const MICROCARDS_D: MicroCard[] = [
  // ---------------------------------------------------------------- Bits
  {
    id: "mc-reverse-bits-shift",
    title: "Reverse bits of a 32-bit integer",
    prompt:
      "🔃 Reverse Bits of a 32-bit unsigned integer: describe the loop that builds the answer one bit at a time, and the JavaScript pitfall at the end. Reply in 1-2 sentences.",
    answerKey:
      "Loop exactly 32 times: shift the result left by one, OR in the lowest bit of n (n & 1), then shift n right by one. In JavaScript bitwise ops return signed 32-bit values, so finish with result >>> 0 to read it as unsigned.",
    keyPoints: [
      { label: "Exactly 32 iterations", anyOf: ["32 times", "32 iterations", "all 32 bits", "every one of the 32"] },
      { label: "Shift result left, add n's low bit", anyOf: ["shift the result left", "result << 1", "or in the lowest bit", "n & 1", "lowest bit of n"] },
      { label: "Shift n right each step", anyOf: ["shift n right", "n >>> 1", "n >> 1", "n right by one"] },
      { label: "Force unsigned at the end", anyOf: [">>> 0", "unsigned", "signed 32-bit"] },
    ],
    hint: "Peel bits off the right end of n and push them onto the right end of the result. How many bits must you move, even if n runs out early?",
    explanation:
      "The low bit of n becomes the high bit of the answer after 31 more left shifts, which is why the loop must run all 32 times instead of stopping when n hits 0. Divide and conquer (swap halves, then quarters, then bytes with masks) does it in 5 steps for repeated calls.",
    tags: ["bit_manipulation"],
    difficulty: 1,
    relatedProblem: { title: "Reverse Bits", leetcodeSlug: "reverse-bits" },
  },
  {
    id: "mc-counting-bits-half",
    title: "Counting bits with a DP on i >> 1",
    prompt:
      "🧮 Counting Bits: return the set-bit count for every i from 0 to n in O(n). What recurrence reuses an earlier answer, and why is that earlier index already filled? Reply in 1-2 sentences.",
    answerKey:
      "Use bits[i] = bits[i >> 1] + (i & 1): dropping the last bit gives i >> 1, which is smaller than i and so already computed, and i & 1 adds that last bit back. The alternative bits[i] = bits[i & (i - 1)] + 1 also works because clearing the lowest set bit gives a smaller index.",
    keyPoints: [
      { label: "bits[i] = bits[i >> 1] + (i & 1)", anyOf: ["bits[i >> 1]", "i >> 1", "i / 2", "half of i", "i & (i - 1)"] },
      { label: "Add the last bit back", anyOf: ["i & 1", "last bit back", "lowest bit", "plus the last bit", "+ 1"] },
      { label: "The smaller index is already computed", anyOf: ["already computed", "smaller than i", "smaller index", "already filled", "computed earlier"] },
    ],
    hint: "How does the binary form of i relate to the binary form of i / 2?",
    explanation:
      "Every recurrence here points to a strictly smaller index, so a single left-to-right pass fills the table in O(n) with no per-number bit loop. The i & (i - 1) version is the same Kernighan trick used for counting one number's bits.",
    tags: ["bit_manipulation", "dp_1d"],
    difficulty: 1,
    relatedProblem: { title: "Counting Bits", leetcodeSlug: "counting-bits" },
  },
  {
    id: "mc-add-without-plus",
    title: "Add two integers without + or -",
    prompt:
      "➕ Sum of Two Integers without using + or -: which bitwise operation gives the sum ignoring carries, which gives the carries, and when does the loop stop? Reply in 1-2 sentences.",
    answerKey:
      "a ^ b is the sum without carries and (a & b) << 1 is the carry, so repeat a, b = a ^ b, (a & b) << 1 until the carry is 0. In fixed-width 32-bit arithmetic negatives work through two's complement; Python needs a 32-bit mask because its ints never overflow.",
    keyPoints: [
      { label: "XOR is the sum without carries", anyOf: ["a ^ b", "xor", "sum without carries"] },
      { label: "AND shifted left is the carry", anyOf: ["(a & b) << 1", "a & b", "shifted left", "and shifted"] },
      { label: "Repeat until the carry is 0", anyOf: ["until the carry is 0", "carry is 0", "carry becomes zero", "no carry left"] },
      { label: "32-bit mask / two's complement", anyOf: ["two's complement", "32-bit mask", "mask", "32-bit"] },
    ],
    hint: "Add 1 + 1 in binary by hand: which bit stays, and which bit moves one column left?",
    explanation:
      "Each round moves every carry one column left, so after at most 32 rounds none remain. The mask matters in Python: without it a negative sum keeps extending the carry forever.",
    tags: ["bit_manipulation", "math"],
    difficulty: 2,
    relatedProblem: { title: "Sum of Two Integers", leetcodeSlug: "sum-of-two-integers" },
  },
  {
    id: "mc-missing-number-sum-or-xor",
    title: "Missing number: Gauss sum or XOR",
    prompt:
      "🕳️ Missing Number: nums holds n distinct values from 0..n with one missing. Give two O(n) time, O(1) space ways to find it, and the risk one of them has in fixed-width ints. Reply in 1-2 sentences.",
    answerKey:
      "Subtract the array's sum from the expected total n(n + 1)/2, or XOR every index 0..n with every value so the pairs cancel and only the missing number is left. The sum formula can overflow in 32-bit ints for large n, which the XOR version avoids.",
    keyPoints: [
      { label: "Expected total n(n + 1)/2 minus the sum", anyOf: ["n(n + 1)/2", "n * (n + 1) / 2", "gauss", "expected total", "expected sum"] },
      { label: "XOR indices and values", anyOf: ["xor every index", "xor", "pairs cancel", "cancel"] },
      { label: "Sum can overflow", anyOf: ["overflow"] },
    ],
    hint: "What do you get if you XOR a number with itself, and which number would never find its partner?",
    explanation:
      "Both tricks use the fact that you know exactly which values should be present. XOR is the overflow-proof version of the same idea: x ^ x = 0, so everything with a partner vanishes.",
    tags: ["math", "bit_manipulation", "arrays"],
    difficulty: 1,
    relatedProblem: { title: "Missing Number", leetcodeSlug: "missing-number" },
  },

  // ---------------------------------------------------------------- 1D DP and greedy
  {
    id: "mc-jump-game-farthest-reach",
    title: "Jump Game: farthest reach",
    prompt:
      "🦘 Jump Game: nums[i] is the max jump length from index i. What single value do you track in one greedy pass, and when do you return false? Reply in 1-2 sentences.",
    answerKey:
      "Track the farthest index reachable so far. Scan left to right; if the current index i is beyond that farthest reach you are stuck, so return false, otherwise update farthest = max(farthest, i + nums[i]) and return true once it reaches the last index.",
    keyPoints: [
      { label: "Track the farthest reachable index", anyOf: ["farthest index reachable", "farthest reach", "max reach", "furthest reachable"] },
      { label: "Stuck when i passes the reach", anyOf: ["beyond that farthest", "i > farthest", "you are stuck", "past the reach"] },
      { label: "farthest = max(farthest, i + nums[i])", anyOf: ["i + nums[i]", "max(farthest"] },
    ],
    hint: "If every index up to 7 is reachable, what is the only thing that matters about indices 0 through 7?",
    explanation:
      "Reachable indices always form a prefix, so one number describes the whole set. That turns an O(n^2) DP into one O(n) pass; working backwards with a goal index that moves left is the equivalent mirror image.",
    tags: ["greedy", "arrays"],
    difficulty: 2,
    relatedProblem: { title: "Jump Game", leetcodeSlug: "jump-game" },
  },
  {
    id: "mc-climbing-stairs-recurrence",
    title: "Climbing stairs: count by the last step",
    prompt:
      "🪜 Climbing Stairs (1 or 2 steps at a time): what recurrence counts the ways to reach step n, what are the base cases, and how much space do you need? Reply in 1-2 sentences.",
    answerKey:
      "Split on the last move: ways(n) = ways(n - 1) + ways(n - 2), because you arrived by a 1-step or a 2-step. Base cases ways(0) = 1 and ways(1) = 1, and since each value needs only the previous two, two variables give O(1) space.",
    keyPoints: [
      { label: "ways(n) = ways(n - 1) + ways(n - 2)", anyOf: ["ways(n - 1) + ways(n - 2)", "n - 1) + ways(n - 2", "fibonacci", "previous two"] },
      { label: "Split on the last move", anyOf: ["last move", "last step", "1-step or a 2-step"] },
      { label: "Base cases", anyOf: ["base cases", "ways(0) = 1", "ways(1) = 1"] },
      { label: "O(1) space with two variables", anyOf: ["two variables", "o(1) space", "constant space"] },
    ],
    hint: "Think about the very last move onto step n. What could it have been?",
    explanation:
      "Classifying paths by their final move gives disjoint cases, so the counts add. The same shape powers Decode Ways and Combination Sum IV, where the last piece can be one of several sizes.",
    tags: ["dp_1d", "math"],
    difficulty: 1,
    relatedProblem: { title: "Climbing Stairs", leetcodeSlug: "climbing-stairs" },
  },
  {
    id: "mc-decode-ways-dp",
    title: "Decode Ways: one or two digits",
    prompt:
      "🔐 Decode Ways ('1' = A ... '26' = Z): how does dp[i], the ways to decode the first i characters, depend on earlier entries, and how do zeros change it? Reply in 1-2 sentences.",
    answerKey:
      "dp[i] adds dp[i - 1] if the single digit s[i - 1] is 1-9, and adds dp[i - 2] if the two digits s[i - 2..i - 1] form 10-26, with dp[0] = 1. A '0' can never stand alone, so it only counts as the second digit of 10 or 20; any other zero makes the count 0.",
    keyPoints: [
      { label: "One-digit case adds dp[i - 1]", anyOf: ["dp[i - 1]", "single digit", "one digit"] },
      { label: "Two-digit case adds dp[i - 2]", anyOf: ["dp[i - 2]", "two digits", "10-26"] },
      { label: "Zero only as part of 10 or 20", anyOf: ["10 or 20", "never stand alone", "0 can", "zero makes"] },
      { label: "dp[0] = 1", anyOf: ["dp[0] = 1", "empty prefix", "base case"] },
    ],
    hint: "The last letter of any decoding used either one digit or two. Which of those is legal here?",
    explanation:
      "It is Climbing Stairs with validity checks on each step size. Only two previous values are read, so two variables suffice, and zeros are the classic trap: '06' is not a letter.",
    tags: ["dp_1d", "string"],
    difficulty: 2,
    relatedProblem: { title: "Decode Ways", leetcodeSlug: "decode-ways" },
  },
  {
    id: "mc-word-break-prefix-dp",
    title: "Word Break: DP over prefixes",
    prompt:
      "🧩 Word Break: can s be split into dictionary words? Define dp[i], give the transition, and state the time complexity. Reply in 1-2 sentences.",
    answerKey:
      "dp[i] is true when the prefix s[0..i) can be segmented, with dp[0] = true for the empty prefix. Then dp[i] is true if some j < i has dp[j] true and s[j..i) in the word set (a hash set), giving O(n^2) substring checks, or O(n * L) if j only goes back the max word length L.",
    keyPoints: [
      { label: "dp[i] = prefix of length i is segmentable", anyOf: ["prefix s[0..i)", "prefix can be segmented", "first i characters", "dp[i] is true when"] },
      { label: "dp[0] = true", anyOf: ["dp[0] = true", "empty prefix"] },
      { label: "Some j with dp[j] and s[j..i) a word", anyOf: ["dp[j] true", "some j", "s[j..i)"] },
      { label: "Hash set, O(n^2) checks", anyOf: ["o(n^2)", "n^2", "o(n * l)", "hash set"] },
    ],
    hint: "If s[0..j) is breakable, what extra thing must be true for s[0..i) to be breakable through j?",
    explanation:
      "Each dp[i] asks what the last word was, which is the same last-piece split as Decode Ways but with dictionary pieces. Plain recursion without memo retries the same suffixes exponentially often on inputs like 'aaaa...ab'.",
    tags: ["dp_1d", "string", "hashing"],
    difficulty: 2,
    relatedProblem: { title: "Word Break", leetcodeSlug: "word-break" },
  },

  // ---------------------------------------------------------------- 2D DP
  {
    id: "mc-grid-paths-dp-base-cases",
    title: "Grid DP: base row and column",
    prompt:
      "🗺️ Unique Paths (moves only right or down): why are the first row and first column all 1s, and what closed-form answer skips the DP entirely? Reply in 1-2 sentences.",
    answerKey:
      "A cell in the first row or first column has only one way in, a straight line from the start, so those base cells are 1 and every other cell is the sum of the cell above and the cell to the left. Every path is m - 1 downs and n - 1 rights in some order, so the answer is C(m + n - 2, m - 1).",
    keyPoints: [
      { label: "Edge cells have only one way in", anyOf: ["only one way", "straight line", "one path", "base cells are 1"] },
      { label: "Other cells = above + left", anyOf: ["above and the cell to the left", "above plus left", "sum of the cell above", "top and left"] },
      { label: "Closed form C(m + n - 2, m - 1)", anyOf: ["c(m + n - 2, m - 1)", "binomial", "choose", "m + n - 2"] },
    ],
    hint: "How many different ways can you reach a cell on the top edge if you can never move up or left?",
    explanation:
      "The base cases come straight from the move rules, and the same table handles obstacles by zeroing blocked cells (then an obstacle in row 0 zeroes everything to its right). The binomial form works because a path is just a choice of which steps are downs.",
    tags: ["dp_2d", "matrix", "math"],
    difficulty: 1,
    relatedProblem: { title: "Unique Paths", leetcodeSlug: "unique-paths" },
  },
  {
    id: "mc-palindrome-interval-dp",
    title: "Palindrome table: interval DP",
    prompt:
      "🪞 Palindromic substrings via DP: define isPal[i][j], give its recurrence, and say which order you must fill the table in. Reply in 1-2 sentences.",
    answerKey:
      "isPal[i][j] is true when s[i..j] is a palindrome: s[i] == s[j] and either the length is at most 2 or isPal[i + 1][j - 1] is true. The inner interval must be ready first, so fill by increasing length (or i from right to left); it is O(n^2) time and space, while expand-around-center gets O(1) space.",
    keyPoints: [
      { label: "Ends match and the inside is a palindrome", anyOf: ["s[i] == s[j]", "ends match", "ispal[i + 1][j - 1]", "inner interval"] },
      { label: "Short base cases", anyOf: ["at most 2", "length 1", "length 2", "single characters"] },
      { label: "Fill by increasing length", anyOf: ["increasing length", "right to left", "shorter intervals first", "by length"] },
      { label: "O(n^2) time and space", anyOf: ["o(n^2)", "n^2"] },
    ],
    hint: "s[i..j] is a palindrome exactly when its outer characters match and what else holds?",
    explanation:
      "Each entry depends on the interval one shorter on each side, so row-by-row top-down order reads unfilled cells. Counting the true cells answers Palindromic Substrings, and tracking the longest true interval answers Longest Palindromic Substring.",
    tags: ["dp_2d", "string"],
    difficulty: 2,
    relatedProblem: { title: "Palindromic Substrings", leetcodeSlug: "palindromic-substrings" },
  },

  // ---------------------------------------------------------------- Strings
  {
    id: "mc-length-prefix-encoding",
    title: "Encode strings with length prefixes",
    prompt:
      "📦 Encode and Decode Strings: why does joining with a delimiter like ',' break, and what encoding survives any characters inside the strings? Reply in 1-2 sentences.",
    answerKey:
      "A delimiter breaks as soon as a string contains that delimiter, because the decoder can't tell data from separators. Prefix each string with its length and a marker, like 5#hello, so the decoder reads digits up to '#', then takes exactly that many characters, whatever they are.",
    keyPoints: [
      { label: "Delimiter collides with the data", anyOf: ["contains that delimiter", "tell data from separators", "delimiter breaks", "appears inside"] },
      { label: "Length prefix", anyOf: ["length and a marker", "its length", "length prefix", "5#hello"] },
      { label: "Decode: read the length, take that many chars", anyOf: ["exactly that many characters", "read digits up to", "that many characters"] },
    ],
    hint: "Instead of marking where a string ends, what could you say up front so the decoder never has to look for an end?",
    explanation:
      "Length-prefix framing is how real wire protocols work: the payload is never scanned, so it can hold '#', digits or empty strings. Escaping the delimiter also works but is fiddlier to get right.",
    tags: ["string", "design"],
    difficulty: 2,
    relatedProblem: { title: "Encode and Decode Strings", leetcodeSlug: "encode-and-decode-strings" },
  },

  // ---------------------------------------------------------------- Linked lists
  {
    id: "mc-fast-slow-middle",
    title: "Fast and slow pointers: find the middle",
    prompt:
      "🐇 How do fast and slow pointers find the middle of a singly linked list in one pass, and where does slow stop for an even-length list? Reply in 1-2 sentences.",
    answerKey:
      "Move slow one step and fast two steps while fast and fast.next exist; when fast runs off the end, slow is at the middle. For an even length that loop leaves slow on the second middle, and starting fast at head.next instead stops slow on the first middle, which is what splitting a list in half needs.",
    keyPoints: [
      { label: "Slow 1 step, fast 2 steps", anyOf: ["two steps", "one step", "twice as fast", "2 steps"] },
      { label: "Loop while fast and fast.next exist", anyOf: ["fast and fast.next", "fast.next", "runs off the end"] },
      { label: "Even length: second middle vs first middle", anyOf: ["second middle", "first middle", "head.next"] },
    ],
    hint: "When the fast pointer has covered the whole list, how far has a pointer at half its speed gone?",
    explanation:
      "The same two-speed trick detects cycles (the pointers meet only if there is a loop) and splits lists for merge sort and Reorder List. Being exact about which middle you get avoids off-by-one bugs when you cut the list.",
    tags: ["linked_list", "two_pointers"],
    difficulty: 1,
    relatedProblem: { title: "Middle of the Linked List", leetcodeSlug: "middle-of-the-linked-list" },
  },
  {
    id: "mc-reorder-list-three-steps",
    title: "Reorder List in three steps",
    prompt:
      "🔀 Reorder List (L0, Ln, L1, Ln-1, ...) in place with O(1) extra space: what are the three steps? Reply in 1-2 sentences.",
    answerKey:
      "Find the middle with fast and slow pointers and cut the list there, reverse the second half in place, then merge the two halves by alternating nodes, first half first. Each step is O(n) with O(1) extra space.",
    keyPoints: [
      { label: "Find the middle and cut", anyOf: ["find the middle", "fast and slow", "cut the list", "split"] },
      { label: "Reverse the second half", anyOf: ["reverse the second half", "reverse the back half", "reverse the second"] },
      { label: "Merge by alternating nodes", anyOf: ["alternating nodes", "alternate", "interleave", "weave"] },
    ],
    hint: "The back of the list has to be read backwards. Which list operation makes that possible without extra space?",
    explanation:
      "Copying nodes into an array works but costs O(n) space. Forgetting to cut the first half (slow.next = null) leaves a cycle, the most common bug.",
    tags: ["linked_list", "two_pointers"],
    difficulty: 2,
    relatedProblem: { title: "Reorder List", leetcodeSlug: "reorder-list" },
  },

  // ---------------------------------------------------------------- Trees
  {
    id: "mc-same-tree-recursion",
    title: "Same Tree: compare in lockstep",
    prompt:
      "🌲 Same Tree: write the recursion in words. What are the base cases for two null or one null node, and what must hold for the recursive case? Reply in 1-2 sentences.",
    answerKey:
      "If both nodes are null return true; if exactly one is null return false. Otherwise the values must be equal and both the left subtrees and the right subtrees must be the same, recursing on both pairs; it is O(n) time and O(h) stack.",
    keyPoints: [
      { label: "Both null is true", anyOf: ["both nodes are null", "both null", "both are null"] },
      { label: "Exactly one null is false", anyOf: ["exactly one is null", "one is null", "only one"] },
      { label: "Equal values and both subtree pairs match", anyOf: ["values must be equal", "left subtrees and the right subtrees", "both pairs", "same value"] },
    ],
    hint: "Handle null first. What are the only null combinations, and what does each mean?",
    explanation:
      "Checking nulls before touching .val avoids crashes, and the two null checks together cover every shape mismatch. Subtree of Another Tree runs this exact check at every node of the bigger tree.",
    tags: ["tree_traversal", "recursion", "dfs"],
    difficulty: 1,
    relatedProblem: { title: "Same Tree", leetcodeSlug: "same-tree" },
  },
  {
    id: "mc-subtree-of-another-tree",
    title: "Subtree of Another Tree",
    prompt:
      "🌳 Subtree of Another Tree: how do you check whether subRoot appears as a subtree of root, what is the time complexity, and what trick makes it linear? Reply in 1-2 sentences.",
    answerKey:
      "At every node of root, run a same-tree check against subRoot, returning true if any node matches, which is O(m * n) in the worst case. For linear time, serialize both trees with null markers and delimiters around each value and test whether subRoot's string is a substring of root's with KMP.",
    keyPoints: [
      { label: "Same-tree check at every node", anyOf: ["same-tree check", "every node", "is same tree", "same tree"] },
      { label: "O(m * n) worst case", anyOf: ["o(m * n)", "m * n", "o(mn)"] },
      { label: "Serialize with null markers, substring match", anyOf: ["serialize both trees", "null markers", "substring", "kmp"] },
    ],
    hint: "You already know how to test if two trees are identical. Where in root could subRoot start?",
    explanation:
      "The serialization trick needs null markers and delimiters, otherwise 12 and 2 or different shapes produce the same string. For interview sizes the O(m * n) recursion is usually what is expected.",
    tags: ["tree_traversal", "recursion", "dfs"],
    difficulty: 1,
    relatedProblem: { title: "Subtree of Another Tree", leetcodeSlug: "subtree-of-another-tree" },
  },
  {
    id: "mc-invert-tree-swap",
    title: "Invert a binary tree",
    prompt:
      "🙃 Invert Binary Tree: describe the recursion, give its base case, and say whether you can do it iteratively with a queue. Reply in 1-2 sentences.",
    answerKey:
      "For a null node return null; otherwise swap the node's left and right children and recursively invert both subtrees, then return the node. Iteratively, pop nodes from a queue (or stack), swap each node's children and push them; every node is visited once, O(n).",
    keyPoints: [
      { label: "Base case: null returns null", anyOf: ["null node return null", "null node", "base case"] },
      { label: "Swap left and right children", anyOf: ["swap the node's left and right", "swap", "left and right children"] },
      { label: "Recurse on both subtrees", anyOf: ["invert both subtrees", "both subtrees", "recursively"] },
      { label: "Iterative BFS or stack works", anyOf: ["queue", "stack", "iteratively"] },
    ],
    hint: "What does the mirror image of a tree look like at the root, and what must be true of each subtree?",
    explanation:
      "Swap order does not matter (pre- or postorder both work) as long as every node gets its children swapped exactly once. A common bug is assigning root.left = invert(root.right) and then reading the already overwritten root.left.",
    tags: ["tree_traversal", "recursion"],
    difficulty: 1,
    relatedProblem: { title: "Invert Binary Tree", leetcodeSlug: "invert-binary-tree" },
  },
  {
    id: "mc-tree-serialize-null-markers",
    title: "Serialize a tree with null markers",
    prompt:
      "📝 Serialize and Deserialize Binary Tree with preorder: why must you write a marker for null children, and how does the decoder rebuild the tree from the token stream? Reply in 1-2 sentences.",
    answerKey:
      "Without null markers a preorder list is ambiguous, since many shapes share the same values in order. Write each value and a marker like '#' for every null child; the decoder reads tokens in the same preorder, returning null on '#' and otherwise building the node, then its left and right subtrees recursively.",
    keyPoints: [
      { label: "Values alone are ambiguous", anyOf: ["ambiguous", "many shapes", "same values"] },
      { label: "A marker for every null child", anyOf: ["marker like '#'", "null child", "null markers", "every null"] },
      { label: "Decoder consumes tokens in the same preorder", anyOf: ["same preorder", "reads tokens", "consume", "token stream"] },
      { label: "Build node, then left, then right", anyOf: ["left and right subtrees recursively", "then its left", "recursively"] },
    ],
    hint: "Would the lists for a root with only a left child and a root with only a right child differ if you skipped nulls?",
    explanation:
      "With nulls marked, preorder alone pins down the tree, so the decoder needs no inorder list. A shared index (or an iterator) is what lets each recursive call pick up exactly where the previous subtree ended; level order with markers works too.",
    tags: ["tree_traversal", "design", "string"],
    difficulty: 3,
    relatedProblem: { title: "Serialize and Deserialize Binary Tree", leetcodeSlug: "serialize-and-deserialize-binary-tree" },
  },
  {
    id: "mc-build-tree-preorder-inorder",
    title: "Build a tree from preorder and inorder",
    prompt:
      "🏗️ Construct Binary Tree from Preorder and Inorder: which array gives the root, how do you split the other one, and what makes the whole build O(n)? Reply in 1-2 sentences.",
    answerKey:
      "The next preorder value is the root; its position in inorder splits the values into the left subtree (before it) and the right subtree (after it), and the left size tells you where the right subtree starts in preorder. A hash map from value to inorder index makes each split O(1), so the build is O(n).",
    keyPoints: [
      { label: "Preorder gives the root", anyOf: ["next preorder value is the root", "preorder value", "first preorder", "preorder gives"] },
      { label: "Inorder position splits left and right", anyOf: ["position in inorder", "splits the values", "before it", "left subtree"] },
      { label: "Hash map of inorder indices", anyOf: ["hash map", "value to inorder index", "index map"] },
      { label: "O(n) overall", anyOf: ["o(n)"] },
    ],
    hint: "Preorder lists a root before its children. Once you know the root, where does inorder put its left subtree?",
    explanation:
      "Scanning inorder for the root at every call makes it O(n^2) on a skewed tree. Build the left subtree before the right so a single advancing preorder index stays in sync; values must be unique for the split to be well defined.",
    tags: ["tree_traversal", "hashing", "recursion"],
    difficulty: 2,
    relatedProblem: {
      title: "Construct Binary Tree from Preorder and Inorder Traversal",
      leetcodeSlug: "construct-binary-tree-from-preorder-and-inorder-traversal",
    },
  },

  // ---------------------------------------------------------------- Tries
  {
    id: "mc-trie-wildcard-dfs",
    title: "Trie search with '.' wildcards",
    prompt:
      "🃏 Design Add and Search Words: search may contain '.', which matches any letter. How does the trie search handle '.', and what is its worst-case cost? Reply in 1-2 sentences.",
    answerKey:
      "Search recursively with DFS over (node, index): a normal letter follows one child, while '.' tries every child and returns true if any branch matches the rest; at the end check the isEnd flag. Letters stay O(L), but a word of all dots can branch up to 26^L paths, bounded by the trie's size.",
    keyPoints: [
      { label: "DFS over (node, index)", anyOf: ["dfs", "recursively", "(node, index)", "backtrack"] },
      { label: "'.' tries every child", anyOf: ["tries every child", "every child", "all children", "any branch"] },
      { label: "Check isEnd at the end", anyOf: ["isend", "end flag", "end of word"] },
      { label: "Worst case branches over many paths", anyOf: ["26^l", "whole trie", "trie's size", "exponential"] },
    ],
    hint: "A letter tells you which child to take. What choice does '.' leave you, and how do you explore all of them?",
    explanation:
      "Wildcards turn a single path walk into a DFS, which is why a trie beats a hash set of words here: the set would need every possible expansion. Returning early on the first matching branch keeps typical searches fast.",
    tags: ["trie", "dfs", "design"],
    difficulty: 2,
    relatedProblem: { title: "Design Add and Search Words Data Structure", leetcodeSlug: "design-add-and-search-words-data-structure" },
  },

  // ---------------------------------------------------------------- Graphs
  {
    id: "mc-grid-flood-fill-from-border",
    title: "Flood fill inward from the border",
    prompt:
      "🌊 Pacific Atlantic Water Flow: checking where water from each cell can reach is slow. What do you search from instead, which direction do edges go, and what is the answer? Reply in 1-2 sentences.",
    answerKey:
      "Reverse the flow: start a DFS or BFS from every border cell of each ocean and climb to neighbors whose height is greater than or equal to the current cell. Each ocean gets a visited set of cells that can drain into it, and the answer is the intersection of the two sets, in O(rows * cols).",
    keyPoints: [
      { label: "Start from the border cells of each ocean", anyOf: ["border cell", "from every border", "from the ocean", "edges of the grid"] },
      { label: "Move uphill (reverse the flow)", anyOf: ["reverse the flow", "greater than or equal", "climb", "uphill"] },
      { label: "Intersect the two reachable sets", anyOf: ["intersection", "both sets", "reachable from both"] },
      { label: "O(rows * cols)", anyOf: ["o(rows * cols)", "rows * cols", "o(m * n)"] },
    ],
    hint: "Instead of asking where each cell's water ends up, ask which cells each ocean can be reached from.",
    explanation:
      "Searching from each cell repeats work and costs O((rows * cols)^2); starting from the targets visits every cell at most once per ocean. The same border-inward idea solves Surrounded Regions and counting enclosed islands.",
    tags: ["dfs", "bfs", "matrix"],
    difficulty: 2,
    relatedProblem: { title: "Pacific Atlantic Water Flow", leetcodeSlug: "pacific-atlantic-water-flow" },
  },
  {
    id: "mc-clone-graph-visited-map",
    title: "Clone a graph with an old-to-new map",
    prompt:
      "🧬 Clone Graph: the graph can have cycles. What map do you keep, when do you put a node into it, and why does that timing matter? Reply in 1-2 sentences.",
    answerKey:
      "Keep a hash map from each original node to its clone. Create the clone and store it in the map before visiting its neighbors, then DFS or BFS and wire each neighbor's clone into the clone's list; the map doubles as the visited set, so a cycle returns the existing clone instead of recursing forever.",
    keyPoints: [
      { label: "Map original to clone", anyOf: ["original node to its clone", "old to new", "hash map", "map from each original"] },
      { label: "Store before visiting neighbors", anyOf: ["before visiting its neighbors", "before recursing", "store it in the map before"] },
      { label: "Map doubles as visited, so cycles stop", anyOf: ["visited set", "recursing forever", "existing clone", "cycle"] },
    ],
    hint: "Node A's neighbor list includes B, and B's includes A. When you reach A again from B, what should you hand back?",
    explanation:
      "Registering the clone only after its neighbors are copied recurses forever on the first cycle. With the map, every node and edge is copied once, O(V + E).",
    tags: ["dfs", "bfs", "hashing"],
    difficulty: 2,
    relatedProblem: { title: "Clone Graph", leetcodeSlug: "clone-graph" },
  },
  {
    id: "mc-union-find-valid-tree",
    title: "Graph Valid Tree with union-find",
    prompt:
      "🌐 Graph Valid Tree: n nodes and an undirected edge list. What quick edge-count check comes first, and how does union-find detect a cycle as you add edges? Reply in 1-2 sentences.",
    answerKey:
      "A tree on n nodes has exactly n - 1 edges, so return false otherwise. Then union the endpoints of each edge; if find gives both endpoints the same root they are already connected, so that edge closes a cycle and the answer is false. With n - 1 edges and no cycle the graph is connected.",
    keyPoints: [
      { label: "Exactly n - 1 edges", anyOf: ["n - 1 edges", "exactly n - 1"] },
      { label: "Same root means a cycle", anyOf: ["same root", "already connected", "closes a cycle"] },
      { label: "n - 1 edges and acyclic implies connected", anyOf: ["graph is connected", "connected", "no cycle"] },
    ],
    hint: "How many edges does any tree on n nodes have, and what does it mean if an edge joins two nodes already in one component?",
    explanation:
      "The edge count plus acyclicity is enough: an acyclic graph with n - 1 edges has exactly one component. DFS works too, but in an undirected graph it must skip the parent edge or every edge looks like a cycle.",
    tags: ["union_find", "dfs"],
    difficulty: 2,
    relatedProblem: { title: "Graph Valid Tree", leetcodeSlug: "graph-valid-tree" },
  },
  {
    id: "mc-alien-dictionary-edges",
    title: "Alien Dictionary: edges from adjacent words",
    prompt:
      "👽 Alien Dictionary: from a sorted list of alien words, how do you get ordering edges, which invalid input must you catch, and how do you produce the order? Reply in 1-2 sentences.",
    answerKey:
      "Compare each pair of adjacent words: the first position where they differ gives an edge from the first word's letter to the second's, and nothing after it counts. If a word is followed by its own proper prefix (like 'abc' then 'ab') the input is invalid. Then run a topological sort (Kahn's BFS) and return empty if a cycle leaves letters unprocessed.",
    keyPoints: [
      { label: "Adjacent pairs, first differing letter gives an edge", anyOf: ["first position where they differ", "first differing", "adjacent words"] },
      { label: "Prefix-after-longer-word is invalid", anyOf: ["proper prefix", "prefix", "invalid"] },
      { label: "Topological sort", anyOf: ["topological sort", "kahn", "in-degree"] },
      { label: "A cycle means no valid order", anyOf: ["cycle", "unprocessed"] },
    ],
    hint: "Two dictionary words tell you exactly one fact about the alphabet. Where in the words is that fact?",
    explanation:
      "Only the first mismatch is ordered; later letters are unconstrained, and comparing non-adjacent pairs adds nothing new. Include every letter that appears as a graph node even without edges, or it goes missing from the output.",
    tags: ["topological_sort", "string", "bfs"],
    difficulty: 3,
    relatedProblem: { title: "Alien Dictionary", leetcodeSlug: "alien-dictionary" },
  },
];
