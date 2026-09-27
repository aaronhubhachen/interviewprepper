import type { MicroCard } from "./types";

/**
 * Deck B: monotonic stack/deque, heaps, trees, graphs, tries, backtracking,
 * greedy, DP (1D, 2D, knapsack) and bitmask DP.
 *
 * Authoring rules (enforced by test/content.test.ts): prompts are plain text,
 * at most 280 chars, and end with a clear ask; each answer key must grade as
 * "correct" against its own keyPoints with the heuristic grader. That grader
 * matches whole-word stem sequences, so phrases that reduce to a single token
 * ("-1", "n!", "> k") would match almost anything and are avoided.
 */
export const MICROCARDS_B: MicroCard[] = [
  // ---------------------------------------------------------------- Monotonic stack / deque
  {
    id: "mc-monotonic-stack-next-warmer",
    title: "Monotonic stack: next warmer day",
    prompt:
      "📚 Daily Temperatures: for each day, how many days until a warmer one? Explain the monotonic stack: what does it hold, in what order, and when do you pop? Reply in 2 sentences.",
    answerKey:
      "Keep a stack of indices still waiting for a warmer day, with temperatures decreasing from bottom to top. While today is warmer than the top, pop it and set its answer to today's index minus its index, then push today. Each index is pushed and popped once, so O(n).",
    keyPoints: [
      {
        label: "Stack holds indices still waiting",
        anyOf: ["indices", "index", "indexes", "waiting", "unresolved", "not yet found", "unanswered"],
      },
      {
        label: "Temperatures decreasing bottom to top",
        anyOf: ["decreasing", "descending", "non-increasing", "monotonically decreasing", "colder"],
      },
      {
        label: "Pop while today is warmer; answer = i - j",
        anyOf: ["pop while", "pop when", "warmer than the top", "hotter than the top", "greater than the top", "higher than the top", "i - j", "index minus", "difference"],
      },
      {
        label: "O(n): each index pushed and popped once",
        anyOf: ["o(n)", "linear", "pushed and popped once", "each element once", "amortized"],
      },
    ],
    hint: "Which days are still waiting for a warmer day? When a hot day arrives, which of them get resolved first?",
    explanation:
      "Because the stack decreases from bottom to top, the top is always the coldest unresolved day, so a warmer day resolves days from the top down. Once popped, a day never matters again, which bounds the total work at O(n). The same pattern solves next greater element, stock span, and largest rectangle in a histogram.",
    tags: ["monotonic_stack"],
    difficulty: 2,
    relatedProblem: { title: "Daily Temperatures", leetcodeSlug: "daily-temperatures" },
  },
  {
    id: "mc-next-greater-circular",
    title: "Next greater element in a circular array",
    prompt:
      "🔁 Next Greater Element II: nums is circular, so the search for a bigger value can wrap past the end back to the start. What order does your monotonic stack keep, when does an index get its answer, and how do you let every index see the wrapped elements? Reply in 1-2 sentences.",
    answerKey:
      "Loop i from 0 to 2n - 1 and read nums[i % n], so every index also sees the elements that wrap around. Keep a stack of indices with decreasing values, pop and record the current value as the answer while it is greater than the top, and push indices only during the first pass; anything left on the stack gets -1.",
    keyPoints: [
      {
        label: "Walk the array twice using i % n",
        anyOf: [
          "2n",
          "2 * n",
          "twice",
          "two passes",
          "2 passes",
          "loop twice",
          "iterate twice",
          "i % n",
          "modulo",
          "mod n",
          "concatenate",
          "double the array",
          "doubled array",
        ],
      },
      {
        label: "Stack of indices with decreasing values",
        anyOf: ["decreasing", "descending", "non-increasing", "monotonically decreasing"],
      },
      {
        label: "Pop while the current value is greater, recording it",
        anyOf: ["pop while", "pop when", "pop", "popped", "greater than the top", "bigger than the top", "larger than the top"],
      },
    ],
    hint: "A circular array behaves like the array followed by a copy of itself. How can you get that effect without actually copying it?",
    explanation:
      "Walking indices 0 to 2n - 1 with i % n simulates the array followed by itself, so in the second pass the front elements act as the elements after the end. Pushing only in the first pass keeps each index on the stack at most once. Every index is pushed and popped at most once, so the extra pass keeps the total at O(n).",
    tags: ["monotonic_stack"],
    difficulty: 2,
    relatedProblem: { title: "Next Greater Element II", leetcodeSlug: "next-greater-element-ii" },
  },
  {
    id: "mc-sliding-window-max-deque",
    title: "Sliding window maximum with a deque",
    prompt:
      "🪟 Sliding Window Maximum: return the max of every window of size k in O(n). What does your deque store, what do you pop from the back, and what do you pop from the front? Reply in 2 sentences.",
    answerKey:
      "The deque stores indices whose values decrease from front to back, so the front is the window max. Before pushing i, pop from the back every index whose value is <= nums[i], since it can never be a max again, and pop from the front once that index has slid out of the window (index <= i - k); each index enters and leaves once, so O(n).",
    keyPoints: [
      {
        label: "Deque of indices, values decreasing front to back",
        anyOf: ["decreasing", "descending", "non-increasing", "monotonic", "monotone"],
      },
      {
        label: "Back: pop values smaller than (or equal to) the new one",
        anyOf: [
          "smaller than",
          "smaller values",
          "smaller ones",
          "less than",
          "less than or equal",
          "lower values",
          "can never be",
          "never be the max",
          "dominated",
          "useless",
        ],
      },
      {
        label: "Front: pop the index once it leaves the window",
        anyOf: [
          "out of the window",
          "out of window",
          "outside the window",
          "no longer in the window",
          "left the window",
          "leaves the window",
          "slid out",
          "expired",
          "too old",
          "i - k",
        ],
      },
      {
        label: "Front holds the current window max",
        anyOf: [
          "front is the max",
          "front is max",
          "front is the window max",
          "front is the maximum",
          "front = max",
          "front gives the max",
          "head is the max",
          "max at the front",
          "largest at the front",
          "max is at the front",
        ],
      },
    ],
    hint: "If a newer element is bigger than an older one, can the older one ever be the max of a later window?",
    explanation:
      "An element smaller than a newer element can never be the max of any future window, because the newer one stays in the window longer; discarding it keeps the deque decreasing. Storing indices rather than values lets you tell when the front has expired. A heap with lazy deletion also works in O(n log n), but the monotonic deque is the O(n) answer interviewers look for.",
    tags: ["monotonic_stack", "sliding_window"],
    difficulty: 3,
    relatedProblem: { title: "Sliding Window Maximum", leetcodeSlug: "sliding-window-maximum" },
  },
  {
    id: "mc-largest-rectangle-histogram",
    title: "Largest rectangle in a histogram",
    prompt:
      "📊 Largest Rectangle in Histogram: you keep an increasing stack of indices. When a shorter bar at index i forces you to pop bar h, what width does the rectangle of height heights[h] get, and why? Reply in 1-2 sentences.",
    answerKey:
      "Bar h extends right up to i - 1 and left to just past the new stack top, so width = i - stack.top - 1, or width = i if the stack is empty. The new top is the nearest shorter bar on the left and i is the first shorter bar on the right, so heights[h] is the limiting height for everything strictly between them.",
    keyPoints: [
      {
        label: "width = i - top - 1 after popping",
        anyOf: ["i - stack.top - 1", "i - top - 1", "i - stack top - 1", "i - stack[-1] - 1", "i - st[-1] - 1", "i - left - 1", "i - prev - 1"],
      },
      {
        label: "Empty stack: width = i (it reaches index 0)",
        anyOf: ["if empty", "stack is empty", "stack empty", "empty stack", "all the way to the left", "to index 0", "from index 0"],
      },
      {
        label: "Left edge: the new stack top is the previous shorter bar",
        anyOf: [
          "new top",
          "new stack top",
          "stack top",
          "top of the stack",
          "previous smaller",
          "prev smaller",
          "previous shorter",
          "nearest shorter",
          "left boundary",
          "left edge",
          "below it",
          "under it",
        ],
      },
      {
        label: "Right edge: i is the first shorter bar on the right",
        anyOf: ["i - 1", "first shorter", "next smaller", "next shorter", "right boundary", "right edge", "shorter bar on the right", "to the right"],
      },
    ],
    hint: "When a bar gets popped, the bar that forced it out is its first shorter bar on the right. Where is its first shorter bar on the left?",
    explanation:
      "Heights on the stack increase, so whatever sits under a popped bar is shorter than it, and the current bar is the first one to its right that is shorter. Appending a sentinel bar of height 0 flushes every remaining bar at the end, and since each bar is pushed and popped once, the scan is O(n). Maximal Rectangle in a binary matrix reuses this routine on each row's histogram.",
    tags: ["monotonic_stack"],
    difficulty: 3,
    relatedProblem: { title: "Largest Rectangle in Histogram", leetcodeSlug: "largest-rectangle-in-histogram" },
  },

  // ---------------------------------------------------------------- Heaps
  {
    id: "mc-heap-top-k-min-heap",
    title: "Top K largest with a size-k min-heap",
    prompt:
      "⛰️ Find the k largest elements of an array of n items. Which kind of heap do you use, how big do you let it grow, and what is the time complexity? Reply in 1-2 sentences.",
    answerKey:
      "Use a min-heap capped at size k: push each element and pop the smallest whenever the size exceeds k, so the heap always holds the k largest seen so far and its root is the kth largest. That is O(n log k) time and O(k) space.",
    keyPoints: [
      {
        label: "A min-heap, not a max-heap",
        anyOf: ["min-heap", "min heap", "minheap", "min priority queue", "min pq", "heapq"],
      },
      {
        label: "Cap it at size k, evicting the smallest",
        anyOf: [
          "size k",
          "k elements",
          "k items",
          "capped at k",
          "cap at k",
          "exceeds k",
          "bigger than k",
          "larger than k",
          "more than k",
          "pop the smallest",
          "pop the min",
          "evict the smallest",
        ],
      },
      {
        label: "O(n log k) time",
        anyOf: ["n log k", "nlogk", "n logk", "nlog k"],
      },
    ],
    hint: "You want to throw out the weakest candidate quickly whenever a better one shows up. Which heap keeps the weakest candidate at the root?",
    explanation:
      "The root of a size-k min-heap is the smallest of the current top k, which is exactly the element to evict when something bigger arrives. Heapifying all n elements into a max-heap and popping k times also works, in O(n + k log n) time and O(n) space, and quickselect averages O(n). For streams, or when k is much smaller than n, the bounded min-heap wins.",
    tags: ["heap"],
    difficulty: 1,
    relatedProblem: { title: "Kth Largest Element in an Array", leetcodeSlug: "kth-largest-element-in-an-array" },
  },
  {
    id: "mc-heap-k-way-merge",
    title: "K-way merge with a heap",
    prompt:
      "🔀 Merge k sorted lists holding N elements in total. What goes into the heap at the start, what do you push after each pop, and what is the complexity? Reply in 1-2 sentences.",
    answerKey:
      "Seed a min-heap with the head of each list, storing the value plus which list it came from. Pop the smallest, append it to the output, and push the next element from that same list, so the heap never holds more than k entries: O(N log k) time and O(k) extra space.",
    keyPoints: [
      {
        label: "Seed with the first element of every list",
        anyOf: [
          "head of each list",
          "head of every list",
          "heads of the lists",
          "each list's head",
          "first element of each",
          "first node of each",
          "first of each list",
          "one from each list",
          "front of each",
        ],
      },
      {
        label: "Min-heap / priority queue",
        anyOf: ["min-heap", "min heap", "minheap", "priority queue", "heapq", "pq"],
      },
      {
        label: "After a pop, push the next element from the same list",
        anyOf: ["same list", "that list", "its list", "its next", "next node", "node.next", "successor", "push the next", "next element"],
      },
      {
        label: "O(N log k)",
        anyOf: ["n log k", "nlogk", "nlog k", "n logk"],
      },
    ],
    hint: "At any moment, the next output element has to be the smallest among only a handful of candidates. Which ones?",
    explanation:
      "Every list is sorted, so the smallest remaining element overall is always one of the k current heads. The heap keeps those k candidates and hands back the smallest in O(log k), and each of the N elements is pushed and popped once. Put the list index in each heap entry so ties between equal values never fall back to comparing list nodes.",
    tags: ["heap", "linked_list"],
    difficulty: 2,
    relatedProblem: { title: "Merge k Sorted Lists", leetcodeSlug: "merge-k-sorted-lists" },
  },
  {
    id: "mc-two-heaps-median",
    title: "Running median with two heaps",
    prompt:
      "⚖️ Find Median from Data Stream: numbers arrive one at a time and you must report the median at any moment. Describe the two heaps, the balancing rule, and the cost of addNum and findMedian. Reply in 2 sentences.",
    answerKey:
      "Keep a max-heap for the smaller half and a min-heap for the larger half, with every value in the max-heap <= every value in the min-heap and sizes that differ by at most 1. The median is the top of the larger heap, or the average of both tops when sizes are equal; addNum is O(log n) and findMedian is O(1).",
    keyPoints: [
      {
        label: "Max-heap for the lower half, min-heap for the upper half",
        // Pairings only: every answer names both heaps and both halves, so bare terms can't tell swapped roles apart.
        anyOf: [
          "max heap for the lower",
          "max heap for the smaller",
          "max heap for the small",
          "max heap for the low",
          "max heap for the left",
          "max heap for the bottom",
          "max heap of the lower",
          "max heap of the smaller",
          "max heap holding the smaller",
          "max heap holding the lower",
          "max heap keeps the smaller",
          "max heap stores the smaller",
          "max heap with the smaller",
          "maxheap for the lower",
          "maxheap for the smaller",
          "lower half in a max",
          "smaller half in a max",
          "small half in a max",
          "lower half goes in a max",
          "smaller half goes in a max",
          "lower half as a max",
          "min heap for the upper",
          "min heap for the larger",
          "min heap for the large",
          "min heap for the high",
          "min heap for the right",
          "min heap of the upper",
          "min heap of the larger",
          "min heap holding the larger",
          "minheap for the upper",
          "minheap for the larger",
          "upper half in a min",
          "larger half in a min",
          "large half in a min",
          "upper half goes in a min",
          "larger half goes in a min",
        ],
      },
      {
        label: "Rebalance so sizes differ by at most 1",
        anyOf: [
          "at most 1",
          "at most one",
          "differ by 1",
          "differ by one",
          "within 1",
          "within one",
          "off by one",
          "rebalance",
          "same size",
          "equal size",
          "sizes equal",
          "move the top",
        ],
      },
      {
        label: "Median comes from the heap tops",
        anyOf: ["average", "mean of the two", "avg", "top of the larger", "top of the bigger", "top of each", "both tops", "two tops"],
      },
      {
        label: "addNum O(log n), findMedian O(1)",
        anyOf: ["log n", "logn", "o(1)", "constant time"],
      },
    ],
    hint: "The median sits right at the boundary between the smaller half and the larger half. Which kind of heap gives instant access to the edge of each half?",
    explanation:
      "The max-heap's root is the largest value of the small half and the min-heap's root is the smallest of the large half, so the median is always at one or both roots. On insert, push into one heap, move that heap's top to the other so the ordering holds, then move a top back if the sizes drift apart by 2. Keeping a sorted array instead makes each insert O(n).",
    tags: ["heap", "design"],
    difficulty: 3,
    relatedProblem: { title: "Find Median from Data Stream", leetcodeSlug: "find-median-from-data-stream" },
  },

  // ---------------------------------------------------------------- Trees
  {
    id: "mc-tree-dfs-orders",
    title: "Preorder, inorder, postorder: pick one",
    prompt:
      "🌳 Which DFS order fits each job: (a) serialize or copy a tree, (b) read a BST's values in sorted order, (c) compute every node's height or free the tree from the leaves up? Reply in 1 sentence, one order per job.",
    answerKey:
      "(a) Preorder, because each node is created before its children. (b) Inorder, because left, node, right visits BST keys in ascending order. (c) Postorder, because both children must be finished before their parent.",
    keyPoints: [
      // Each phrase ties an order to its job: every answer names all three orders, so bare names can't check the mapping.
      {
        label: "Preorder to serialize or copy",
        anyOf: [
          "(a) preorder",
          "(a) pre-order",
          "a is preorder",
          "a uses preorder",
          "preorder for (a)",
          "preorder to serialize",
          "preorder for serializing",
          "preorder for serialization",
          "preorder to copy",
          "preorder for copying",
          "serialize with preorder",
          "serialize using preorder",
          "serialize preorder",
          "serialization preorder",
          "serialization uses preorder",
          "copy with preorder",
          "copy preorder",
        ],
      },
      {
        label: "Inorder for sorted BST values",
        anyOf: [
          "(b) inorder",
          "(b) in-order",
          "b is inorder",
          "b uses inorder",
          "inorder for (b)",
          "inorder for sorted",
          "inorder for the sorted",
          "inorder for a bst",
          "inorder for the bst",
          "inorder for bst",
          "inorder gives sorted",
          "inorder is sorted",
          "inorder reads",
          "sorted with inorder",
          "sorted order with inorder",
          "sorted inorder",
          "sorted order inorder",
          "bst inorder",
          "bst values inorder",
        ],
      },
      {
        label: "Postorder for heights and deletion",
        anyOf: [
          "(c) postorder",
          "(c) post-order",
          "c is postorder",
          "c uses postorder",
          "postorder for (c)",
          "postorder for height",
          "postorder for the height",
          "postorder to compute",
          "postorder for computing",
          "postorder to free",
          "postorder for freeing",
          "postorder for deletion",
          "postorder to delete",
          "height with postorder",
          "heights with postorder",
          "free with postorder",
          "height postorder",
          "freeing postorder",
          "free postorder",
          "delete postorder",
        ],
      },
    ],
    hint: "For each job, ask when a node must be handled relative to its children: before them, between them, or after them.",
    explanation:
      "Preorder emits a parent before its subtrees, so a reader can rebuild the tree top-down from the sequence (with null markers). Inorder on a BST is sorted order, the basis of validate-BST and kth-smallest. Postorder fits any answer that combines results from both children, such as height, diameter, or subtree sums.",
    tags: ["tree_traversal", "dfs"],
    difficulty: 1,
    relatedProblem: { title: "Serialize and Deserialize Binary Tree", leetcodeSlug: "serialize-and-deserialize-binary-tree" },
  },
  {
    id: "mc-validate-bst-bounds",
    title: "Validate a BST: why parent checks fail",
    prompt:
      "🌲 Validate BST: why is checking left.val < node.val < right.val at every node not enough, and what do you check instead? Reply in 1-2 sentences.",
    answerKey:
      "The BST rule covers whole subtrees, not just children: in root 5 with right child 6 whose left child is 3, every parent-child check passes but 3 sits in 5's right subtree. Instead pass down an allowed (low, high) range, narrowing high when you go left and low when you go right, or check that an inorder traversal is strictly increasing.",
    keyPoints: [
      {
        label: "The rule applies to the whole subtree / all ancestors",
        anyOf: [
          "whole subtree",
          "entire subtree",
          "subtree",
          "all ancestors",
          "ancestor",
          "grandparent",
          "descendant",
          "every node in",
          "all nodes in",
          "deeper nodes",
        ],
      },
      {
        label: "Pass down (low, high) bounds, or check inorder is strictly increasing",
        anyOf: [
          "low, high",
          "low high",
          "min and max",
          "min max",
          "min/max",
          "lower and upper",
          "lower bound",
          "upper bound",
          "bounds",
          "range",
          "inorder",
          "in-order",
          "strictly increasing",
          "sorted",
        ],
      },
    ],
    hint: "Picture a node deep inside the root's right subtree. Which values must it be greater than, beyond just its own parent?",
    explanation:
      "Every node inherits constraints from all of its ancestors, which a local parent-child check cannot see. Passing (low, high) bounds down the recursion carries those inherited limits at O(1) per node, O(n) total. Use strict comparisons, and start with null or infinite bounds so values at the integer limits are not rejected by mistake.",
    tags: ["bst", "tree_traversal", "dfs"],
    difficulty: 2,
    relatedProblem: { title: "Validate Binary Search Tree", leetcodeSlug: "validate-binary-search-tree" },
  },
  {
    id: "mc-lca-binary-tree",
    title: "Lowest common ancestor in a binary tree",
    prompt:
      "🧬 LCA of nodes p and q in a plain binary tree (not a BST), both guaranteed to exist. Describe the recursion: what does each call return, and when is the current node the answer? Reply in 2 sentences.",
    answerKey:
      "If the node is null, p, or q, return it; otherwise recurse into both children. If both sides return non-null, p and q are split across this node so it is the LCA; otherwise return whichever side is non-null, which visits each node once for O(n) time.",
    keyPoints: [
      {
        label: "Base case: return the node if it is null, p, or q",
        anyOf: ["null, p, or q", "null or p or q", "is p or q", "equals p or q", "p or q", "null or p", "base case", "return the node itself"],
      },
      {
        label: "Both sides non-null means this node is the LCA",
        anyOf: [
          "both sides",
          "both non-null",
          "both not null",
          "both return",
          "both children return",
          "both left and right",
          "left and right both",
          "one on each side",
          "different sides",
          "split",
        ],
      },
      {
        label: "Otherwise bubble up the non-null side",
        anyOf: [
          "whichever",
          "non-null side",
          "the non-null one",
          "the one that isn't null",
          "the one that is not null",
          "bubble up",
          "propagate",
          "pass up",
          "return left or right",
          "otherwise return",
        ],
      },
      {
        label: "O(n): each node visited once",
        anyOf: ["o(n)", "linear", "each node once", "every node once"],
      },
    ],
    hint: "Let each subtree report whether it found p or q. What does it mean when the left and the right subtree both report something?",
    explanation:
      "A non-null return means this subtree contains p or q, so the first node where both subtrees report something is exactly where the paths to p and q split. If p is an ancestor of q, the search stops at p and returns it, which is correct because a node counts as its own ancestor. In a BST you can do better: walk down from the root and stop where p and q fall on different sides, O(h).",
    tags: ["tree_traversal", "dfs", "recursion"],
    difficulty: 2,
    relatedProblem: { title: "Lowest Common Ancestor of a Binary Tree", leetcodeSlug: "lowest-common-ancestor-of-a-binary-tree" },
  },
  {
    id: "mc-tree-diameter",
    title: "Diameter of a binary tree",
    prompt:
      "📏 Diameter of Binary Tree: the longest path between any two nodes, in edges. What does your recursive helper return, what do you update at each node, and why can't you just measure through the root? Reply in 2 sentences.",
    answerKey:
      "The helper returns the node's height, 1 + max(left, right) with null as 0, while updating a global best with left + right, the longest path that bends at this node. The answer is that global max, because the longest path can bend at any node, not necessarily the root.",
    keyPoints: [
      {
        label: "Helper returns height (depth)",
        anyOf: ["height", "depth", "longest downward", "max depth", "longest branch"],
      },
      {
        label: "Update the best with left + right at every node",
        anyOf: [
          "left + right",
          "left plus right",
          "left height + right height",
          "left height plus right height",
          "left depth + right depth",
          "left depth plus right depth",
          "heights of both",
          "height of both",
          "l + r",
          "lh + rh",
          "sum of the two heights",
          "sum of heights",
          "sum of left and right",
          "add the heights",
          "add both heights",
          "both heights",
        ],
      },
      {
        label: "Keep a global max: the path need not pass through the root",
        anyOf: [
          "global",
          "nonlocal",
          "not through the root",
          "not necessarily the root",
          "not necessarily through the root",
          "doesn't pass through the root",
          "may not pass",
          "any node",
          "every node",
          "max over all nodes",
        ],
      },
    ],
    hint: "Every path has a single highest node where it bends. What is the longest path that bends at one particular node?",
    explanation:
      "The longest path bending at node x uses the deepest downward path on each side: height(left) + height(right) edges. Returning height while updating a global best computes both in one postorder pass, O(n). The classic bug is returning the diameter from the helper instead of the height, which mixes up two different quantities.",
    tags: ["tree_traversal", "dfs", "recursion"],
    difficulty: 2,
    relatedProblem: { title: "Diameter of Binary Tree", leetcodeSlug: "diameter-of-binary-tree" },
  },

  // ---------------------------------------------------------------- Graphs
  {
    id: "mc-bfs-unweighted-shortest-path",
    title: "BFS for unweighted shortest paths",
    prompt:
      "🌊 Why does BFS find shortest paths in an unweighted graph, and should you mark a node visited when you enqueue it or when you dequeue it? Reply in 1-2 sentences.",
    answerKey:
      "BFS explores in layers of increasing distance, so the first time it reaches a node is along a path with the fewest edges. Mark nodes visited when you enqueue them; marking on dequeue still gives correct distances but lets the same node sit in the queue many times, wasting time and memory.",
    keyPoints: [
      {
        label: "Explores level by level, in distance order",
        anyOf: [
          "layer",
          "level by level",
          "level-by-level",
          "levels",
          "increasing distance",
          "distance order",
          "order of distance",
          "closest first",
          "nearest first",
          "wave",
          "ripple",
          "fifo",
        ],
      },
      {
        label: "First visit uses the fewest edges",
        anyOf: [
          "first time",
          "first reach",
          "first visit",
          "first discovered",
          "first discovery",
          "fewest edges",
          "minimum number of edges",
          "min edges",
          "same weight",
          "equal weight",
          "weight 1",
          "each edge costs 1",
        ],
      },
      {
        label: "Mark visited on enqueue",
        // Every timing phrase is glued to the marking verb: the grader ignores negation, so a bare "when you push"
        // also credits "mark it when you pop, not when you push". Nothing here appears verbatim in the prompt
        // ("mark a node visited when you enqueue it"), so echoing the question earns no credit.
        anyOf: [
          "mark on enqueue",
          "mark it on enqueue",
          "mark them on enqueue",
          "visited on enqueue",
          "mark when you enqueue",
          "mark it when you enqueue",
          "mark them when you enqueue",
          "mark it visited when you enqueue",
          "mark them visited when you enqueue",
          "mark nodes visited when you enqueue",
          "mark when enqueuing",
          "visited when enqueuing",
          "visited when enqueued",
          "mark as you enqueue",
          "visited as you enqueue",
          "mark as soon as you enqueue",
          "visited as soon as you enqueue",
          "mark at enqueue time",
          "visited at enqueue time",
          "mark before enqueuing",
          "visited before enqueuing",
          "mark when you push",
          "mark it when you push",
          "mark them when you push",
          "visited when you push",
          "mark when pushing",
          "visited when pushing",
          "mark before pushing",
          "visited before pushing",
          "mark on push",
          "visited on push",
          "mark when adding",
          "mark it when adding",
          "visited when adding",
          "mark when you add",
          "mark it when you add",
          "visited when you add",
          "mark when discovered",
          "mark it when discovered",
          "visited when discovered",
          "mark on discovery",
          // The reason, which only the right choice gives: marking on dequeue lets a node be queued repeatedly.
          "queue many times",
          "queue multiple times",
          "queue more than once",
          "enqueued more than once",
          "enqueued multiple times",
          "enqueued twice",
          "pushed more than once",
          "pushed multiple times",
          "duplicates in the queue",
        ],
      },
    ],
    hint: "Think about the order nodes leave the queue: all distance-1 nodes, then all distance-2 nodes, and so on.",
    explanation:
      "The queue only ever holds nodes from two consecutive distance levels, so nodes come out in nondecreasing distance and a node's first discovery is optimal. Marking on enqueue guarantees each node enters the queue once, for O(V + E). With weighted edges the layering breaks, so you switch to Dijkstra, or to 0-1 BFS with a deque when weights are only 0 or 1.",
    tags: ["bfs", "graph_shortest_path"],
    difficulty: 1,
    relatedProblem: { title: "Shortest Path in Binary Matrix", leetcodeSlug: "shortest-path-in-binary-matrix" },
  },
  {
    id: "mc-multi-source-bfs",
    title: "Multi-source BFS",
    prompt:
      "🍊 Rotting Oranges: each minute, rot spreads to the 4 neighbors of each rotten orange. How do you get the minutes until everything is rotten with one BFS instead of one BFS per rotten orange? Reply in 1-2 sentences.",
    answerKey:
      "Put every rotten orange in the queue at time 0 and run a single BFS level by level, counting one minute per level, so each fresh orange is reached first by its nearest rotten source. If any fresh orange remains at the end, return -1; the whole thing is O(rows * cols).",
    keyPoints: [
      {
        label: "Enqueue all sources at time 0",
        anyOf: [
          "every rotten",
          "all rotten",
          "all the rotten",
          "all sources",
          "all the sources",
          "multi-source",
          "multi source",
          "multisource",
          "at once",
          "at time 0",
          "time zero",
          "initially",
        ],
      },
      {
        label: "Each BFS level is one minute",
        anyOf: ["level", "levels", "layer", "per level", "each level", "minute per", "queue size", "depth"],
      },
      {
        label: "Leftover fresh oranges mean impossible",
        anyOf: [
          "any fresh",
          "fresh remain",
          "fresh left",
          "fresh count",
          "count fresh",
          "count the fresh",
          "still fresh",
          "unreachable",
          "leftover",
          "impossible",
        ],
      },
    ],
    hint: "Imagine one super-source wired to every rotten orange. What would the queue look like one step after it?",
    explanation:
      "Seeding the queue with every source is the same as a BFS from a virtual super-source joined to each of them, so each cell's BFS distance is its distance to the nearest source. One BFS per source would cost O(k * rows * cols) and still need a min across runs. The same trick solves Walls and Gates and 01 Matrix.",
    tags: ["bfs", "matrix"],
    difficulty: 2,
    relatedProblem: { title: "Rotting Oranges", leetcodeSlug: "rotting-oranges" },
  },
  {
    id: "mc-dfs-directed-cycle-colors",
    title: "DFS cycle detection in a directed graph",
    prompt:
      "🎨 Detecting a cycle in a directed graph with DFS: why isn't a single visited set enough, and what states do you track instead? Reply in 1-2 sentences.",
    answerKey:
      "In a directed graph, reaching an already-visited node can just mean a cross edge into a finished branch, not a cycle. Track three states (unvisited, visiting = on the current recursion stack, done); an edge to a visiting node is a back edge, which means a cycle.",
    keyPoints: [
      {
        label: "Visited alone confuses finished branches with cycles",
        anyOf: [
          "cross edge",
          "finished",
          "already finished",
          "already processed",
          "already explored",
          "fully explored",
          "different branch",
          "another branch",
          "another path",
          "different path",
          "reached twice",
          "reach it twice",
          "diamond",
          "false positive",
          "not a cycle",
        ],
      },
      {
        label: "Three states: unvisited, visiting (on stack), done",
        anyOf: [
          "three states",
          "3 states",
          "three colors",
          "3 colors",
          "white gray black",
          "gray",
          "grey",
          "in progress",
          "on stack",
          "on the stack",
          "recursion stack",
          "recursion path",
          "current recursion path",
          "track the current path",
          "path set",
          "onpath",
          "on path",
          "in path",
          "done set",
        ],
      },
      {
        label: "Edge to a visiting node is a back edge: cycle",
        anyOf: [
          "back edge",
          "back-edge",
          "gray node",
          "grey node",
          "edge to a node on the path",
          "node on the path",
          "node already on the path",
          "node still on the path",
          "on the current path",
          "in the current path",
          "currently in the recursion",
        ],
      },
    ],
    hint: "In the diamond A to B, A to C, B to D, C to D, DFS reaches D twice without any cycle. What separates that from a real loop?",
    explanation:
      "A directed graph has a cycle exactly when DFS finds a back edge, an edge to an ancestor that is still on the recursion stack. Nodes marked done are fully explored and cannot lead back to the current path, so reaching them is safe. Undirected graphs differ: there, a visited neighbor other than your parent already means a cycle.",
    tags: ["dfs", "topological_sort"],
    difficulty: 2,
    relatedProblem: { title: "Find Eventual Safe States", leetcodeSlug: "find-eventual-safe-states" },
  },
  {
    id: "mc-kahn-cycle-detection",
    title: "Kahn's algorithm: detecting a cycle",
    prompt:
      "🧭 Course Schedule: using Kahn's algorithm (BFS topological sort), how do you detect that it's impossible to finish every course? Reply in 1-2 sentences.",
    answerKey:
      "Compute in-degrees, enqueue every node with in-degree 0, then repeatedly pop a node and decrement its neighbors' in-degrees, enqueuing any that reach 0. If fewer than n nodes get processed, the rest sit on a cycle, so finishing is impossible.",
    keyPoints: [
      {
        label: "Track in-degrees; start from in-degree 0",
        anyOf: ["in-degree", "indegree", "in degree", "no prerequisites", "zero incoming", "incoming edges"],
      },
      {
        label: "Pop, decrement neighbors, enqueue at 0",
        anyOf: ["decrement", "decrease", "reduce", "subtract", "reaches 0", "hits 0", "becomes 0", "reaches zero", "queue", "enqueue"],
      },
      {
        label: "Processed count < n means a cycle",
        // Not a bare "cycle": every answer says it, but the question is how the cycle gets detected.
        anyOf: [
          "fewer than n",
          "less than n",
          "count < n",
          "fewer nodes",
          "processed fewer",
          "popped fewer",
          "not all nodes",
          "not every node",
          "processed count",
          "visited count",
          "fewer than numcourses",
          "less than numcourses",
          "count != numcourses",
          "leftover",
          "remaining nodes",
        ],
      },
    ],
    hint: "Courses on a cycle all wait on each other. What happens to their in-degrees?",
    explanation:
      "A node on a cycle always keeps an incoming edge from another cycle node, so its in-degree never reaches 0 and it is never enqueued. Counting processed nodes is therefore a complete cycle check in O(V + E), with no recursion stack.",
    tags: ["topological_sort", "bfs"],
    difficulty: 2,
    relatedProblem: { title: "Course Schedule", leetcodeSlug: "course-schedule" },
  },
  {
    id: "mc-dijkstra-negative-edges",
    title: "Why Dijkstra breaks on negative edges",
    prompt:
      "🚫 Dijkstra's algorithm can give wrong answers when some edge weights are negative. What assumption breaks, and what would you use instead? Reply in 1-2 sentences.",
    answerKey:
      "Dijkstra finalizes the unvisited node with the smallest tentative distance, assuming no later path can make it cheaper, which only holds when all weights are non-negative. A negative edge found later can undercut an already-finalized distance, so use Bellman-Ford, O(V * E), which also detects negative cycles.",
    keyPoints: [
      {
        label: "Popped nodes are finalized greedily",
        anyOf: [
          "finalize",
          "finalized",
          "final",
          "settled",
          "settle",
          "locked in",
          "permanent",
          "never revisited",
          "never updated",
          "once popped",
          "greedy",
        ],
      },
      {
        label: "Relies on non-negative weights: a later path can't be cheaper",
        anyOf: [
          "non-negative",
          "nonnegative",
          "only get longer",
          "only increase",
          "can't get cheaper",
          "cannot get cheaper",
          "can't get shorter",
          "cannot get shorter",
          "cheaper later",
          "shorter later",
          "later path",
          "shorter path later",
          "make it shorter",
          "could later",
          "later make",
          "found later",
          "improve a finalized",
          "undercut",
        ],
      },
      {
        label: "Use Bellman-Ford instead",
        anyOf: ["bellman-ford", "bellman ford", "bellmanford", "bellman", "spfa", "floyd-warshall", "floyd warshall"],
      },
    ],
    hint: "When Dijkstra pops a node, it treats that node's distance as final. What must be true of every remaining edge for that to be safe?",
    explanation:
      "With non-negative weights, any path that detours through a node still in the queue costs at least that node's distance, so a popped node can never improve. A negative edge breaks that bound. Bellman-Ford relaxes every edge V - 1 times, and if any edge still relaxes on pass V, there is a negative cycle.",
    tags: ["graph_shortest_path", "greedy"],
    difficulty: 2,
    relatedProblem: { title: "Network Delay Time", leetcodeSlug: "network-delay-time" },
  },
  {
    id: "mc-dijkstra-lazy-heap",
    title: "Dijkstra with a heap: stale entries",
    prompt:
      "🗺️ Dijkstra with a binary heap but no decrease-key: the same node can get pushed several times. How do you handle stale heap entries, and what is the overall time complexity? Reply in 1-2 sentences.",
    answerKey:
      "When you pop (d, u), skip it if d > dist[u], because a shorter path to u was already processed; otherwise relax u's edges and push (newDist, v) for every improvement. The heap holds at most O(E) entries, so the total is O(E log V), usually written O((V + E) log V).",
    keyPoints: [
      {
        label: "Skip popped entries with d > dist[u]",
        anyOf: [
          "skip",
          "ignore",
          "discard",
          "continue",
          "d > dist",
          "greater than dist",
          "outdated",
          "out of date",
          "lazy deletion",
          "lazy delete",
          "already visited",
          "visited set",
        ],
      },
      {
        label: "Relax edges, pushing each improvement",
        anyOf: ["relax", "improve", "improvement", "newdist", "new distance", "shorter distance", "shorter path", "update dist", "update the distance"],
      },
      {
        label: "O((V + E) log V)",
        // No "(e + v) log v" or "e + v log v": the grader drops operators and parentheses, so both reduce to
        // "e v log v" and credit the Fibonacci-heap bound O(E + V log V). "(v + e) log v" keeps V first and stays distinct.
        anyOf: [
          "(v + e) log v",
          "v + e log v",
          "e log v",
          "elogv",
          "e logv",
          "e log e",
          "log v per edge",
          "log v per push",
          "log e per push",
          "log v per relaxation",
        ],
      },
    ],
    hint: "Each heap entry records the distance at the moment it was pushed. When you pop one, how can you tell it's out of date?",
    explanation:
      "Lazy deletion replaces decrease-key: outdated entries stay in the heap and get discarded when they surface, since the first pop of each node carries its final distance. Each successful relaxation pushes one entry, so there are at most E pushes and pops at O(log E) = O(log V) each. Without the check the answer stays correct, but you re-scan a node's edges once for every stale copy. O(E + V log V) is the Fibonacci-heap bound: it needs decrease-key, so it does not apply here.",
    tags: ["graph_shortest_path", "heap"],
    difficulty: 3,
    relatedProblem: { title: "Path With Minimum Effort", leetcodeSlug: "path-with-minimum-effort" },
  },
  {
    id: "mc-union-find-optimizations",
    title: "Union-Find: path compression and union by rank",
    prompt:
      "🔗 Union-Find: explain path compression and union by rank (or size), and state the amortized cost per operation when you use both. Reply in 2 sentences.",
    answerKey:
      "Path compression makes every node visited during find point directly at the root, and union by rank attaches the shorter tree under the taller one so trees stay shallow. Together each find or union costs amortized O(alpha(n)), the inverse Ackermann function, which is effectively constant.",
    keyPoints: [
      {
        label: "Path compression: nodes point straight at the root",
        anyOf: [
          "directly at the root",
          "directly to the root",
          "point to the root",
          "points to the root",
          "point at the root",
          "straight to the root",
          "the root directly",
          "parent[x] = find",
          "flatten",
          "shortcut",
          "reparent",
          "re-parent",
        ],
      },
      {
        label: "Union by rank: attach the shorter/smaller tree under the other",
        anyOf: [
          "shorter tree under",
          "smaller tree under",
          "shorter under",
          "smaller under",
          "smaller into",
          "attach the smaller",
          "attach the shorter",
          "lower rank",
          "smaller rank",
          "smaller size",
          "taller tree",
          "larger tree",
          "bigger tree",
        ],
      },
      {
        label: "Amortized inverse Ackermann, effectively O(1)",
        anyOf: [
          "inverse ackermann",
          "ackermann",
          "alpha(n)",
          "effectively constant",
          "nearly constant",
          "near constant",
          "almost constant",
          "basically constant",
          "amortized o(1)",
          "o(1)",
        ],
      },
    ],
    hint: "Both tricks fight the same enemy: long parent chains. One flattens chains after you walk them; the other stops them from forming.",
    explanation:
      "Without either trick, a bad sequence of unions builds a tree shaped like a linked list and find becomes O(n). Union by rank alone keeps the height at O(log n), and adding path compression drops the amortized cost to alpha(n), which is at most 4 for any realistic input. Union by size works just as well and tracks component sizes for free.",
    tags: ["union_find"],
    difficulty: 2,
    relatedProblem: { title: "Redundant Connection", leetcodeSlug: "redundant-connection" },
  },

  // ---------------------------------------------------------------- Tries
  {
    id: "mc-trie-basics",
    title: "Trie: node layout, search vs startsWith",
    prompt:
      "🔤 Implement Trie: what does each node store, what do insert and search cost for a word of length L, and what is the one difference between search(word) and startsWith(prefix)? Reply in 1-2 sentences.",
    answerKey:
      "Each node stores a map (or an array of 26) from character to child node, plus an isEnd flag marking that a word ends there. Insert and search walk one node per character, O(L), and search must also check isEnd at the last node while startsWith only needs the path to exist.",
    keyPoints: [
      {
        label: "Children map or array of 26 per node",
        anyOf: ["children", "child map", "child node", "array of 26", "26 children", "26 pointers", "hashmap", "hash map", "dict", "dictionary", "map"],
      },
      {
        label: "End-of-word flag",
        anyOf: ["isend", "is end", "isword", "is word", "end flag", "end of word", "end-of-word", "word ends", "terminal", "eow", "flag"],
      },
      {
        label: "O(L) per operation",
        anyOf: ["o(l)", "o(m)", "o(k)", "word length", "length of the word", "one node per character", "per character", "per char"],
      },
      {
        label: "search checks isEnd; startsWith only needs the path",
        anyOf: [
          "check isend",
          "checks isend",
          "check the flag",
          "checks the flag",
          "path exists",
          "path to exist",
          "only the path",
          "only needs the prefix",
          "startswith only",
          "doesn't need",
        ],
      },
    ],
    hint: "Inserting apple creates a path that also spells app. How would search(app) know whether app itself was ever inserted?",
    explanation:
      "A trie shares common prefixes, so lookups cost O(L) no matter how many words are stored, and prefix queries come for free. Without the end flag, search would wrongly report every prefix of an inserted word as a word. An array of 26 is fastest for lowercase letters; a hash map saves memory for sparse or large alphabets.",
    tags: ["trie", "string", "design"],
    difficulty: 1,
    relatedProblem: { title: "Implement Trie (Prefix Tree)", leetcodeSlug: "implement-trie-prefix-tree" },
  },
  {
    id: "mc-trie-word-search-ii",
    title: "Word Search II: trie-guided backtracking",
    prompt:
      "🔍 Word Search II: find every word from a list of up to 30,000 in a letter grid. Why build a trie instead of running Word Search once per word, how does the trie prune the DFS, and how do you avoid reporting a word twice? Reply in 2 sentences.",
    answerKey:
      "Insert all words into a trie and run one DFS from each cell that walks the trie alongside the grid, so shared prefixes are explored once for all words. Stop a path as soon as the next letter is not a child of the current trie node, record a word when you reach its end node, and delete finished leaves so fruitless branches disappear.",
    keyPoints: [
      {
        label: "One search for all words: shared prefixes explored once",
        anyOf: [
          "shared prefix",
          "shared prefixes",
          "common prefix",
          "common prefixes",
          "all words at once",
          "all the words",
          "trie of all words",
          "trie of the words",
          "all words into a trie",
          "once for all",
          "one dfs",
          "single pass",
          "not once per word",
        ],
      },
      {
        label: "Stop when the next letter is not a trie child",
        anyOf: [
          "not a child",
          "isn't a child",
          "no child",
          "no matching child",
          "not in the trie",
          "not in trie",
          "isn't in the trie",
          "not a prefix",
          "no such prefix",
          "no word starts with",
          "dead end",
          "stop early",
          "stop as soon as",
          "backtrack as soon as",
          "abandon",
          "cut off",
          "stop the path",
          "stop a path",
        ],
      },
      {
        label: "Record the word at its end node, then clear it (or delete finished leaves)",
        anyOf: [
          "end node",
          "end of a word",
          "word end",
          "isend",
          "is end",
          "add to result",
          "add it to the result",
          "mark found",
          "set word to null",
          "set it to null",
          "clear the word",
          "remove the word",
          "dedupe",
          "deduplicate",
          "result set",
          "delete finished",
          "delete leaves",
          "remove leaves",
          "prune leaves",
          "remove the node",
          "delete the node",
          "remove found",
          "trim",
        ],
      },
    ],
    hint: "Many words start with the same letters. How could a single walk across the grid check all of them at the same time?",
    explanation:
      "Separate Word Search runs repeat the same exponential prefix exploration for every word, so the cost is multiplied by the number of words. The trie merges those searches, and the moment the grid path leaves the trie the branch dies. Clearing a word at its end node avoids duplicates, and pruning emptied leaves keeps later DFS runs from re-walking exhausted branches.",
    tags: ["trie", "backtracking", "matrix"],
    difficulty: 3,
    relatedProblem: { title: "Word Search II", leetcodeSlug: "word-search-ii" },
  },

  // ---------------------------------------------------------------- Backtracking
  {
    id: "mc-backtracking-subsets-perms-combos",
    title: "Subsets vs permutations vs combinations",
    prompt:
      "🌿 Backtracking templates: how does the recursion differ for subsets, permutations, and combinations of size k, and how many results does each produce for n distinct elements? Reply in 2-3 sentences.",
    answerKey:
      "Subsets recurse with a start index and record every node, giving 2^n results. Combinations use the same start index so each element is only picked after earlier ones, but record only at size k, giving C(n, k). Permutations loop over all elements at every level with a used array and record at length n, giving n factorial results.",
    keyPoints: [
      {
        label: "Subsets: record every node, 2^n",
        anyOf: ["2^n", "2 to the n", "two to the n", "every node", "include or exclude", "in or out", "take or skip", "pick or skip"],
      },
      {
        label: "Combinations: start index, stop at size k, C(n, k)",
        anyOf: ["c(n, k)", "c(n,k)", "n choose k", "nck", "binomial", "start index", "start from i + 1", "i + 1", "stop at k", "record at k"],
      },
      {
        label: "Permutations: used array, any unused element each level, n!",
        anyOf: [
          "factorial",
          "used array",
          "used set",
          "used",
          "unused",
          "not yet used",
          "already in the path",
          "not in the path",
          "visited array",
          "swap",
          "all elements at every level",
          "every element each level",
          "record at length n",
          "at length n",
        ],
      },
    ],
    hint: "For each one, ask: can you still pick elements that come earlier in the array, and at which depth do you record a result?",
    explanation:
      "Order does not matter for subsets and combinations, so the start index forbids picking an earlier element after a later one and each set is generated once. Order matters for permutations, so every level may choose any unused element. Total work is roughly results times the cost to copy each: O(n * 2^n), O(k * C(n, k)), and O(n * n!).",
    tags: ["backtracking", "recursion"],
    difficulty: 2,
    relatedProblem: { title: "Subsets", leetcodeSlug: "subsets" },
  },
  {
    id: "mc-backtracking-skip-duplicates",
    title: "Backtracking with duplicates: skip same-level repeats",
    prompt:
      "♻️ Subsets II: nums may contain duplicates like [1,2,2], and the output must not repeat a subset. How do you avoid duplicate subsets without a hash set of results? Reply in 1-2 sentences.",
    answerKey:
      "Sort nums first, then in the loop at each recursion level skip nums[i] when i > start and nums[i] == nums[i - 1]. Equal values can still be chosen at deeper levels, so [1,2,2] is kept, but the same value never starts two sibling branches.",
    keyPoints: [
      {
        label: "Sort first so duplicates are adjacent",
        anyOf: ["sort", "sorted", "sorting"],
      },
      {
        label: "Skip nums[i] equal to nums[i - 1]",
        anyOf: [
          "nums[i] == nums[i - 1]",
          "nums[i] == nums[i-1]",
          "same as previous",
          "same as the previous",
          "equal to the previous",
          "equals the previous",
          "skip duplicates",
          "skip dupes",
          "skip the duplicate",
          "skip repeats",
          "skip if equal",
          "same value",
        ],
      },
      {
        label: "Only at the same level (i > start), not deeper",
        anyOf: ["i > start", "same level", "same depth", "sibling", "siblings", "within a level", "at each level", "not the first", "first occurrence"],
      },
    ],
    hint: "After sorting, equal values sit next to each other. When should the second 2 be allowed, and when is it just repeating a branch you already explored?",
    explanation:
      "Two sibling branches that start with the same value would generate identical subtrees, so only the first copy at each level is explored. The i > start condition leaves deeper levels free to take the next copy, which is how [2,2] still gets generated. The same sort-and-skip rule fixes Combination Sum II and Permutations II (there with a used array: skip when the previous equal element is unused).",
    tags: ["backtracking", "sorting"],
    difficulty: 2,
    relatedProblem: { title: "Subsets II", leetcodeSlug: "subsets-ii" },
  },
  {
    id: "mc-backtracking-n-queens-pruning",
    title: "N-Queens: O(1) conflict checks",
    prompt:
      "👑 N-Queens: you place one queen per row. How do you check in O(1) whether a square in the current row is attacked by a queen placed earlier, so the search prunes early? Reply in 1-2 sentences.",
    answerKey:
      "Keep three sets: used columns, used diagonals keyed by r - c, and used anti-diagonals keyed by r + c. Square (r, c) is safe if c, r - c, and r + c are all unused; add them before recursing into the next row and remove them when you backtrack.",
    keyPoints: [
      {
        label: "Set of used columns",
        anyOf: ["column", "columns", "col", "cols", "col set"],
      },
      {
        // One point for both diagonals: the grader drops "+" and "-", so "r - c" and "r + c" are the same tokens and
        // separate points let an answer that checks only one diagonal earn both. Every phrase names the pair.
        label: "Diagonal keys r - c and r + c",
        anyOf: [
          "r - c and r + c",
          "r + c and r - c",
          "r - c, r + c",
          "r + c, r - c",
          "r - c or r + c",
          "r + c or r - c",
          "row - col and row + col",
          "row + col and row - col",
          "row - col, row + col",
          "row + col, row - col",
          "row - column and row + column",
          "row + column and row - column",
          "row - column, row + column",
          "row + column, row - column",
          "r minus c and r plus c",
          "r plus c and r minus c",
          "row minus col and row plus col",
          "row plus col and row minus col",
          "row minus column and row plus column",
          "row plus column and row minus column",
          "r - c and anti-diagonal",
          "r - c and antidiagonal",
          "row - col and anti-diagonal",
          "row - col and antidiagonal",
          "row - column and anti-diagonal",
          "r - c for diagonals and r + c",
          "r + c for anti-diagonals and r - c",
          "diagonals and r + c",
          "diagonal and anti-diagonal",
          "diagonals and anti-diagonals",
          "diagonal and antidiagonal",
          "diagonals and antidiagonals",
          "anti-diagonal and diagonal",
          "anti-diagonals and diagonals",
          "main and anti-diagonal",
          "main and anti diagonal",
          "diag and anti-diag",
          "diags and anti-diags",
          "both diagonals",
          "both diagonal",
          "two diagonals",
          "two diagonal",
          "sum and difference",
          "difference and sum",
        ],
      },
      {
        label: "Undo the marks when backtracking",
        anyOf: ["remove", "undo", "unmark", "backtrack", "discard", "pop", "clean up"],
      },
    ],
    hint: "Every square on one diagonal shares something about its row and column. What stays constant as you step down-right? And down-left?",
    explanation:
      "Stepping down-right increases r and c together, so r - c is constant along a diagonal; stepping down-left keeps r + c constant. With those keys every placement check is O(1) instead of a board scan, and a branch dies the moment no column in the row is safe. One queen per row with no reused column already caps the search at n factorial arrangements, and the diagonal checks cut far below that.",
    tags: ["backtracking"],
    difficulty: 3,
    relatedProblem: { title: "N-Queens", leetcodeSlug: "n-queens" },
  },

  // ---------------------------------------------------------------- Greedy
  {
    id: "mc-greedy-interval-scheduling",
    title: "Interval scheduling: sort by end time",
    prompt:
      "📅 Non-overlapping Intervals: remove the fewest intervals so the rest don't overlap. What do you sort by, what is the greedy choice, and why does it work? Reply in 2 sentences.",
    answerKey:
      "Sort by end time and keep each interval whose start is at least the end of the last kept one; the answer is n minus the number kept. Keeping the interval that ends earliest leaves the most room for the rest, and an exchange argument shows swapping it into any optimal solution never hurts.",
    keyPoints: [
      {
        label: "Sort by end time",
        anyOf: [
          "end time",
          "by end",
          "end point",
          "endpoint",
          "ending time",
          "finish time",
          "earliest end",
          "ends earliest",
          "ends first",
          "earliest finishing",
          "right endpoint",
          "interval[1]",
        ],
      },
      {
        label: "Keep if it starts after the last kept end; answer is n minus kept",
        anyOf: [
          "last kept",
          "last end",
          "previous end",
          "prev end",
          "doesn't overlap",
          "does not overlap",
          "no overlap",
          "n minus",
          "n - kept",
          "total minus",
          "count the overlaps",
        ],
      },
      {
        label: "Earliest end leaves the most room (exchange argument)",
        anyOf: [
          "most room",
          "more room",
          "most space",
          "leaves room",
          "frees up",
          "exchange argument",
          "exchange",
          "swap",
          "never worse",
          "never hurts",
          "can't be worse",
          "stays ahead",
        ],
      },
    ],
    hint: "Among all the intervals you could keep first, which one blocks the fewest future intervals?",
    explanation:
      "The earliest-ending interval constrains the future the least, so any optimal schedule can swap its first interval for this one without creating a conflict. Repeating that argument shows greedy keeps the maximum number of intervals, in O(n log n) for the sort. Greedily keeping the earliest-starting interval fails: one long early interval can block many short ones.",
    tags: ["greedy", "intervals", "sorting"],
    difficulty: 2,
    relatedProblem: { title: "Non-overlapping Intervals", leetcodeSlug: "non-overlapping-intervals" },
  },
  {
    id: "mc-greedy-exchange-argument",
    title: "Proving greedy: the exchange argument",
    prompt:
      "🔄 An interviewer asks you to prove your greedy choice is optimal. Outline the exchange argument. Reply in 2-3 sentences.",
    answerKey:
      "Take any optimal solution and find the first place it differs from the greedy solution. Show you can swap the optimal solution's choice there for the greedy choice without making it worse or infeasible. Repeating the swap turns the optimal solution into the greedy one with no loss, so greedy is optimal too.",
    keyPoints: [
      {
        label: "Start from an arbitrary optimal solution",
        anyOf: ["optimal solution", "any optimal", "an optimal", "optimal answer", "best solution", "opt"],
      },
      {
        label: "Find the first point where it differs from greedy",
        anyOf: ["first place", "first point", "first difference", "first choice", "first position", "first decision", "first mismatch", "where they differ", "differs"],
      },
      {
        label: "Swap in the greedy choice without getting worse",
        anyOf: [
          "swap",
          "replace",
          "substitute",
          "not worse",
          "no worse",
          "without making it worse",
          "doesn't get worse",
          "still valid",
          "still feasible",
        ],
      },
      {
        label: "Repeat (induction) until it matches greedy",
        anyOf: ["repeat", "induction", "inductively", "keep swapping", "until it matches", "until they match", "iterate"],
      },
    ],
    hint: "Imagine someone hands you a perfect solution that disagrees with your greedy pick. What would you try to do to it?",
    explanation:
      "The exchange argument never needs to know what the optimal solution looks like, only that one exists. It is the standard proof for interval scheduling (earliest end), Huffman coding, and minimizing maximum lateness (earliest deadline first). If the swap can make things worse, that is a strong hint greedy is wrong and you need DP.",
    tags: ["greedy"],
    difficulty: 3,
    relatedProblem: { title: "Minimum Number of Arrows to Burst Balloons", leetcodeSlug: "minimum-number-of-arrows-to-burst-balloons" },
  },
  {
    id: "mc-greedy-coin-change-fails",
    title: "When greedy fails: coin change",
    prompt:
      "🪙 Coins [1, 3, 4], amount 6. Does always taking the largest coin that fits give the fewest coins? Give both coin counts and what you would use instead. Reply in 1-2 sentences.",
    answerKey:
      "No: greedy takes 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is optimal. Use DP instead: dp[a] = min over coins c of dp[a - c] + 1 with dp[0] = 0, which is O(amount * number of coins).",
    keyPoints: [
      {
        label: "Greedy gives 3 coins (4 + 1 + 1)",
        anyOf: ["4 + 1 + 1", "4+1+1", "4, 1, 1", "4 1 1", "three coins", "3 coins"],
      },
      {
        label: "Optimal is 2 coins (3 + 3)",
        anyOf: ["3 + 3", "3+3", "3, 3", "two coins", "2 coins", "two 3s", "two threes"],
      },
      {
        label: "Use DP over amounts",
        anyOf: ["dp", "dynamic programming", "dp[a - c]", "dp[i - c]", "dp[i - coin]", "memo", "memoization", "memoize", "tabulation", "bfs"],
      },
    ],
    hint: "Try it by hand: what does greedy grab first, and is there any way to reach 6 with just two coins?",
    explanation:
      "Greedy works for canonical coin systems like US coins, but grabbing a big coin can force several small ones later, and greedy never reconsiders. DP tries every possible last coin for every sub-amount, so it finds the combination greedy skipped. This is an unbounded knapsack, since each coin can be reused.",
    tags: ["greedy", "dp_knapsack", "dp_1d"],
    difficulty: 1,
    relatedProblem: { title: "Coin Change", leetcodeSlug: "coin-change" },
  },

  // ---------------------------------------------------------------- DP: 1D, 2D, knapsack
  {
    id: "mc-dp-house-robber",
    title: "House Robber: state, transition, O(1) space",
    prompt:
      "🏠 House Robber: you can't rob two adjacent houses. Define dp[i], give the transition and base cases, and say how to cut the space to O(1). Reply in 2 sentences.",
    answerKey:
      "dp[i] is the max money from houses 0..i, with dp[i] = max(dp[i - 1], dp[i - 2] + nums[i]), dp[0] = nums[0], and dp[1] = max(nums[0], nums[1]). Each step only reads the previous two values, so keep two variables instead of an array for O(n) time and O(1) space.",
    keyPoints: [
      {
        label: "State: best total using houses up to i",
        anyOf: ["max money", "max amount", "max profit", "max loot", "maximum", "best total", "best up to", "up to house i", "up to i", "first i houses"],
      },
      {
        label: "Transition: max(skip, rob + dp[i - 2])",
        anyOf: [
          "dp[i - 2] + nums[i]",
          "dp[i-2] + nums[i]",
          "dp[i-2]+nums[i]",
          "i - 2",
          "i-2",
          "two back",
          "skip or rob",
          "rob or skip",
          "take or skip",
          "skip it or take it",
        ],
      },
      {
        label: "Base cases dp[0] and dp[1]",
        anyOf: ["dp[0]", "dp[1]", "first house", "nums[0]", "first two houses"],
      },
      {
        label: "O(1) space with two rolling variables",
        anyOf: ["two variables", "2 variables", "two vars", "2 vars", "prev and curr", "prev1", "prev2", "rolling", "constant space"],
      },
    ],
    hint: "At house i there are only two choices: rob it or skip it. What does each choice leave you from the earlier houses?",
    explanation:
      "Skipping house i leaves the best answer for houses up to i - 1; robbing it rules out house i - 1, leaving the best up to i - 2 plus nums[i]. Because the recurrence only looks back two steps, the table collapses to two rolling variables. House Robber II (circular street) runs this twice, once without the first house and once without the last.",
    tags: ["dp_1d"],
    difficulty: 1,
    relatedProblem: { title: "House Robber", leetcodeSlug: "house-robber" },
  },
  {
    id: "mc-dp-lis-patience",
    title: "LIS in O(n log n): the tails array",
    prompt:
      "📈 Longest Increasing Subsequence in O(n log n): what does the tails array hold, and what do you do with each new number x? Reply in 1-2 sentences.",
    answerKey:
      "tails[k] is the smallest possible tail of an increasing subsequence of length k + 1, so tails stays sorted. For each x, binary search for the first tail >= x and replace it, or append x if it is larger than every tail; the LIS length is the length of tails.",
    keyPoints: [
      {
        label: "tails[k] = smallest tail of any increasing subsequence of length k + 1",
        anyOf: ["smallest tail", "smallest possible tail", "smallest ending", "smallest end", "smallest last", "minimum tail", "min tail", "lowest ending"],
      },
      {
        label: "Binary search for the first tail >= x",
        anyOf: ["binary search", "bisect", "bisect_left", "lower bound", "lower_bound", "lowerbound", "first tail >= x", "first element >= x"],
      },
      {
        label: "Replace it, or append when x beats every tail",
        anyOf: ["replace", "overwrite", "swap it in", "append", "extend", "push"],
      },
      {
        label: "Answer is the length of tails",
        anyOf: ["length of tails", "len(tails)", "tails.length", "size of tails", "tails length", "tails size"],
      },
    ],
    hint: "Among all increasing subsequences of the same length, which one is the most useful to keep extending later?",
    explanation:
      "A smaller tail can be extended by more future numbers, so tails keeps the most extendable ending for each length, and replacing never shortens anything. Because tails is sorted, each update is one binary search, O(log n). tails itself is not a valid subsequence, and for a strictly increasing LIS you must use lower bound (first >= x) so equal values don't extend the length.",
    tags: ["dp_1d", "binary_search"],
    difficulty: 3,
    relatedProblem: { title: "Longest Increasing Subsequence", leetcodeSlug: "longest-increasing-subsequence" },
  },
  {
    id: "mc-dp-edit-distance",
    title: "Edit distance: 2D state and transitions",
    prompt:
      "✏️ Edit Distance from word1 (length m) to word2 (length n): define dp[i][j], give the transition when the characters match and when they don't, and the base cases. Reply in 2 sentences.",
    answerKey:
      "dp[i][j] is the min edits to turn the first i chars of word1 into the first j chars of word2; if word1[i - 1] == word2[j - 1] then dp[i][j] = dp[i - 1][j - 1], otherwise 1 + min(dp[i - 1][j] for delete, dp[i][j - 1] for insert, dp[i - 1][j - 1] for replace). Base cases are dp[i][0] = i and dp[0][j] = j, giving O(m * n) time.",
    keyPoints: [
      {
        label: "State over prefixes: first i and first j characters",
        anyOf: ["first i", "prefix", "prefixes", "first i characters", "first i chars", "up to i"],
      },
      {
        label: "Match: copy the diagonal dp[i - 1][j - 1]",
        anyOf: ["dp[i - 1][j - 1]", "dp[i-1][j-1]", "diagonal", "no cost", "for free", "carry over"],
      },
      {
        label: "Mismatch: 1 + min of insert, delete, replace",
        anyOf: [
          "1 + min",
          "one plus min",
          "1 + the min",
          "min of three",
          "min of the three",
          "three options",
          "insert, delete, replace",
          "insert delete replace",
          "insert",
          "delete",
          "replace",
        ],
      },
      {
        label: "Base: dp[i][0] = i and dp[0][j] = j",
        anyOf: ["dp[i][0] = i", "dp[0][j] = j", "dp[i][0]", "dp[0][j]", "empty string", "empty prefix", "first row", "first column"],
      },
    ],
    hint: "Look at the last character of each prefix. If they match, what's left to solve? If not, what are the three single edits that could have come last?",
    explanation:
      "Each cell depends only on the cell above (delete from word1), to the left (insert into word1), and diagonally up-left (replace or match), so filling row by row works. Converting to or from an empty string costs its length, which gives the first row and column. Each row only needs the previous one, so space can drop to O(n).",
    tags: ["dp_2d", "string"],
    difficulty: 2,
    relatedProblem: { title: "Edit Distance", leetcodeSlug: "edit-distance" },
  },
  {
    id: "mc-dp-rolling-array",
    title: "2D DP space optimization: rolling rows",
    prompt:
      "🧮 Unique Paths on an m x n grid uses dp[i][j] = dp[i - 1][j] + dp[i][j - 1]. How do you cut space from O(m * n) to O(n), and why is the in-place, left-to-right update safe here? Reply in 1-2 sentences.",
    answerKey:
      "Keep one row and do dp[j] += dp[j - 1]: before the update dp[j] still holds the value from the row above, and dp[j - 1] was already updated for the current row. The recurrence only reads the previous row and the current row's left cell, so a single array of length n is enough.",
    keyPoints: [
      {
        label: "Keep a single 1D row",
        anyOf: ["one row", "single row", "1d array", "1d", "one array", "single array", "two rows", "rolling", "one dimensional"],
      },
      {
        label: "In-place update dp[j] += dp[j - 1]",
        anyOf: [
          "dp[j] += dp[j - 1]",
          "dp[j] += dp[j-1]",
          "dp[j] = dp[j] + dp[j - 1]",
          "dp[j] + dp[j - 1]",
          "add the left",
          "plus the left",
          "left neighbor",
          "left cell",
        ],
      },
      {
        label: "Old dp[j] is the row above; dp[j - 1] is already the current row",
        anyOf: ["row above", "from above", "still holds", "old value", "previous value", "not yet overwritten", "already updated", "previous row"],
      },
    ],
    hint: "Just before you overwrite dp[j] for the current row, what does dp[j] still contain, and what does dp[j - 1] contain?",
    explanation:
      "Rolling arrays work whenever row i depends only on row i - 1 and earlier cells of row i. Direction matters: left to right here because you want the new left value, while 0/1 knapsack goes right to left to keep reading old values. If the recurrence also needs the old diagonal dp[i - 1][j - 1], save it in a temp variable before overwriting, as in LCS.",
    tags: ["dp_2d", "matrix"],
    difficulty: 2,
    relatedProblem: { title: "Unique Paths", leetcodeSlug: "unique-paths" },
  },
  {
    id: "mc-knapsack-01-reverse-loop",
    title: "0/1 knapsack in 1D: loop capacity backward",
    prompt:
      "🎒 0/1 knapsack with a 1D array dp[w]: why must the inner capacity loop run from W down to weight[i] instead of upward, and what does the upward loop compute instead? Reply in 1-2 sentences.",
    answerKey:
      "Going from high to low capacity means dp[w - weight[i]] still holds the previous item's value, so each item is used at most once. Looping upward reads a value already updated with item i, letting it be taken repeatedly, which is the unbounded knapsack.",
    keyPoints: [
      {
        label: "Backward loop reads values from before this item",
        anyOf: [
          "previous item",
          "previous row",
          "old value",
          "old values",
          "not yet updated",
          "hasn't been updated",
          "not updated yet",
          "still holds",
          "before it's overwritten",
          "stale",
          "last item",
        ],
      },
      {
        label: "Each item used at most once",
        anyOf: ["at most once", "only once", "exactly once", "used once", "taken once", "counted once", "once per item", "single use"],
      },
      {
        label: "Upward loop = unbounded knapsack",
        // Tied to the upward direction: a reversed answer still says "unbounded" and "reuse", just for the wrong loop.
        anyOf: [
          "upward is unbounded",
          "upward is the unbounded",
          "upward unbounded",
          "upward gives unbounded",
          "upward gives the unbounded",
          "upward computes unbounded",
          "upward computes the unbounded",
          "upward loop computes the unbounded",
          "upward loop is unbounded",
          "upward loop gives",
          "upward loop lets",
          "upward lets",
          "upward allows",
          "upward would let",
          "upward would allow",
          "upward reuses",
          "upward can reuse",
          "upward you can reuse",
          "looping upward lets",
          "going up lets",
          "forward is unbounded",
          "forward loop is unbounded",
          "forward gives unbounded",
          "forward lets",
          "forward allows",
          "forward reuses",
          "low to high is unbounded",
          "low to high gives",
          "low to high lets",
          "low to high reuses",
          "ascending is unbounded",
          "ascending lets",
          "unbounded when upward",
          "unbounded if upward",
          "unbounded going up",
          "unbounded with upward",
          "it computes the unbounded",
          "it computes unbounded",
          "it gives the unbounded",
          "it becomes unbounded",
          "already updated",
          "already been updated",
          "already includes item i",
        ],
      },
    ],
    hint: "The update is dp[w] = max(dp[w], dp[w - weight] + value). When you read dp[w - weight], has it already been updated for the current item?",
    explanation:
      "In the 2D table, dp[i][w] reads dp[i - 1][w - weight], the row before item i. Looping capacity downward preserves exactly that, because smaller capacities are overwritten only after larger ones have read them. The same rule applies to Partition Equal Subset Sum and Target Sum, while Coin Change deliberately loops upward because coins are reusable.",
    tags: ["dp_knapsack", "dp_1d"],
    difficulty: 2,
    relatedProblem: { title: "Partition Equal Subset Sum", leetcodeSlug: "partition-equal-subset-sum" },
  },
  {
    id: "mc-knapsack-combinations-vs-permutations",
    title: "Coin Change II: combinations vs permutations",
    prompt:
      "🔢 Counting ways to make an amount with dp[a] += dp[a - c]: why does putting coins in the outer loop count combinations, while putting amounts in the outer loop counts ordered sequences? Reply in 1-2 sentences.",
    answerKey:
      "With coins outside, each coin is fully processed before the next, so every way is built in a fixed coin order and 1 + 2 and 2 + 1 count once: combinations (Coin Change II). With amounts outside, any coin can be the last one added at every amount, so different orders count separately: permutations (Combination Sum IV).",
    keyPoints: [
      {
        label: "Coins outer: each way is built in one fixed coin order",
        // Mechanism or loop-to-result pairs only: a swapped answer still says "coin order", just for the amount loop.
        anyOf: [
          "each coin is fully processed",
          "coin is fully processed",
          "coin fully processed",
          "before the next coin",
          "before the next",
          "one coin at a time",
          "finish each coin",
          "coins outer counts combinations",
          "coins outside counts combinations",
          "coins outer gives combinations",
          "coins outside gives combinations",
          "coin loop outside counts combinations",
        ],
      },
      {
        label: "1 + 2 and 2 + 1 count once vs twice",
        anyOf: ["2 + 1", "2+1", "order matters", "order doesn't matter", "order does not matter", "different orders", "different order", "reorderings", "counted twice", "count twice"],
      },
      {
        label: "Amounts outer: any coin can come last, giving permutations",
        // Mechanism or loop-to-result pairs only: bare "permutations" is also what a swapped answer says for coins outer.
        anyOf: [
          "amounts outer counts permutations",
          "amounts outside counts permutations",
          "amounts outer gives permutations",
          "amounts outside gives permutations",
          "amount loop outside counts permutations",
          "any coin can be the last",
          "any coin can come last",
          "any coin last",
          "last coin",
          "every coin at each amount",
          "all coins at each amount",
          "combination sum iv",
        ],
      },
    ],
    hint: "Trace amount 3 with coins [1, 2] both ways. In which loop order can a 2 ever be added before a 1?",
    explanation:
      "Coins-outer builds every multiset in the order the coins are listed, so each combination has exactly one construction path. Amounts-outer makes dp[a] a sum over the last coin chosen, which is the recurrence for ordered sequences. Both run in O(amount * coins); only the loop order changes what is counted.",
    tags: ["dp_knapsack", "dp_1d"],
    difficulty: 3,
    relatedProblem: { title: "Coin Change II", leetcodeSlug: "coin-change-ii" },
  },

  // ---------------------------------------------------------------- Bitmask DP (state compression)
  {
    id: "mc-bitmask-when-n-small",
    title: "Spotting bitmask DP from the constraints",
    prompt:
      "🚩 A problem asks you to pick an order or a subset of items, and the constraints say n <= 16 (sometimes up to 20). Why does that hint at bitmask DP, and what does the mask represent? Reply in 1-2 sentences.",
    answerKey:
      "The mask is an n-bit integer where bit i says whether item i is already used or visited, so every subset fits in 2^n states: about 65,000 for n = 16 and 1 million for n = 20. With O(n) work per state that is O(2^n * n), roughly 20 million steps at n = 20, while trying all n factorial orders is hopeless.",
    keyPoints: [
      {
        label: "Bit i marks whether item i is used (the mask is a subset)",
        anyOf: [
          "bit i",
          "each bit",
          "ith bit",
          "i-th bit",
          "which items",
          "used or not",
          "set of used",
          "visited set",
          "set of visited",
          "chosen items",
        ],
      },
      {
        label: "Only 2^n states: about a million at n = 20",
        anyOf: ["2^n", "2 to the n", "two to the n", "2^20", "2^16", "1 million", "a million", "1e6", "10^6", "65536", "65,000", "65k"],
      },
      {
        label: "O(2^n * n) total, versus n factorial brute force",
        anyOf: ["2^n * n", "n * 2^n", "2^n n", "n 2^n", "n2^n", "factorial", "permutations", "brute force"],
      },
    ],
    hint: "How many different subsets does a set of 20 items have? Would a table that big fit in memory?",
    explanation:
      "2^20 is about 1 million, so a table indexed by mask fits comfortably, and O(2^n * n) runs in time up to n = 20 (O(2^n * n^2) up to about 16). Much beyond that 2^n explodes: n = 30 would need a billion states. So n <= 20 usually means subset state, much like n <= 10 hints at trying every permutation.",
    tags: ["dp_state_compression", "bit_manipulation"],
    difficulty: 1,
    relatedProblem: { title: "Partition to K Equal Sum Subsets", leetcodeSlug: "partition-to-k-equal-sum-subsets" },
  },
  {
    id: "mc-bitmask-dp-transition",
    title: "Bitmask DP: the state transition",
    prompt:
      "🧩 TSP-style bitmask DP: dp[mask][i] = min cost to visit exactly the cities in mask, ending at city i. Write the transition that extends it to a new city j, and give the total time complexity. Reply in 1-2 lines.",
    answerKey:
      "For every city j not in mask: dp[mask | (1 << j)][j] = min(dp[mask | (1 << j)][j], dp[mask][i] + cost[i][j]). There are 2^n * n states with n transitions each, so O(2^n * n^2) time and O(2^n * n) space.",
    keyPoints: [
      {
        label: "Only extend to cities not yet in mask",
        anyOf: ["not in mask", "not visited", "unvisited", "bit j is 0", "bit is not set", "not set", "mask & (1 << j)"],
      },
      {
        label: "New state sets bit j: mask | (1 << j)",
        anyOf: ["mask | (1 << j)", "mask | 1 << j", "set bit", "set the bit", "turn on", "add j to mask", "include j"],
      },
      {
        label: "Relax with dp[mask][i] + cost[i][j]",
        anyOf: ["cost[i][j]", "plus cost", "plus the cost", "add the cost", "relax"],
      },
      {
        label: "O(2^n · n^2) time",
        anyOf: ["2^n * n^2", "2^n n^2", "n^2 * 2^n", "n^2 2^n", "n squared 2 to the n", "2 to the n"],
      },
    ],
    hint: "You're at city i having visited the set mask. Which cities can you move to next, and what does the new mask look like?",
    explanation:
      "The mask compresses 'which subset have I used' into an integer, so paths that visit the same set in different orders share one table cell. Iterating masks in increasing numeric order is valid because adding a bit always makes the mask larger. It only scales to n around 20.",
    tags: ["dp_state_compression", "bit_manipulation"],
    difficulty: 3,
    relatedProblem: { title: "Find the Shortest Superstring", leetcodeSlug: "find-the-shortest-superstring" },
  },
  {
    id: "mc-bitmask-assignment-popcount",
    title: "Assignment bitmask DP: popcount as the index",
    prompt:
      "👥 Assign n workers to n jobs (n <= 15) to maximize total score, with dp[mask] over the set of jobs already taken. How do you know which worker goes next without a second dimension? Give the transition and complexity. Reply in 2 sentences.",
    answerKey:
      "Assign workers in a fixed order, so the next worker is i = popcount(mask), the number of jobs already taken. For each job j not in mask, dp[mask | (1 << j)] = max(dp[mask | (1 << j)], dp[mask] + score[i][j]), which is O(2^n * n) time and O(2^n) space.",
    keyPoints: [
      {
        label: "Next worker = popcount(mask)",
        anyOf: [
          "popcount",
          "pop count",
          "bitcount",
          "bit count",
          "bin(mask).count",
          "number of set bits",
          "count of set bits",
          "set bits",
          "number of ones",
          "count the ones",
          "hamming weight",
          "number of jobs taken",
          "how many jobs",
        ],
      },
      {
        label: "Move to mask | (1 << j) for each untaken job j",
        anyOf: ["mask | (1 << j)", "mask | 1 << j", "not in mask", "untaken", "not taken", "unassigned job", "free job", "set bit j", "add job j"],
      },
      {
        label: "Add score[i][j] and take the max",
        anyOf: ["score[i][j]", "plus score", "plus the score", "add the score", "max("],
      },
      {
        label: "O(2^n * n) time",
        anyOf: ["2^n * n", "n * 2^n", "2^n n", "n 2^n", "n2^n"],
      },
    ],
    hint: "If workers are always placed in order 0, 1, 2, and so on, how many workers have been placed when mask has k bits set?",
    explanation:
      "Fixing the worker order makes the state self-describing: a mask with k bits set means workers 0 to k - 1 are already placed, so dp[mask] needs no worker index. That shrinks the table from 2^n * n states to 2^n. The same trick solves Maximum Compatibility Score Sum and Minimum XOR Sum of Two Arrays.",
    tags: ["dp_state_compression", "bit_manipulation"],
    difficulty: 3,
    relatedProblem: { title: "Maximum Compatibility Score Sum", leetcodeSlug: "maximum-compatibility-score-sum" },
  },
  {
    id: "mc-bitmask-submask-iteration",
    title: "Iterating over submasks",
    prompt:
      "🧷 Some bitmask DPs build dp[mask] from dp[sub] for every submask sub of mask. How do you enumerate all submasks efficiently, and what is the total cost summed over all masks? Reply in 1-2 sentences.",
    answerKey:
      "Start at sub = mask and step with sub = (sub - 1) & mask until sub reaches 0 (handle the empty set separately if needed), which visits each submask exactly once in decreasing order. Summed over all masks this is O(3^n), because each element is either outside mask, in mask but not in sub, or in both.",
    keyPoints: [
      {
        label: "Step with sub = (sub - 1) & mask",
        anyOf: [
          "(sub - 1) & mask",
          "sub - 1 & mask",
          "(sub-1)&mask",
          "(s - 1) & mask",
          "s - 1 & mask",
          "(s-1)&m",
          "minus 1 and mask",
          "subtract 1 and and with mask",
          "subtract one and mask",
        ],
      },
      {
        label: "Stops at 0, visiting each submask once",
        anyOf: [
          "until 0",
          "reaches 0",
          "until it hits 0",
          "until sub is 0",
          "while sub > 0",
          "sub > 0",
          "s > 0",
          "exactly once",
          "each submask once",
          "decreasing order",
          "empty set",
        ],
      },
      {
        label: "Total O(3^n)",
        anyOf: ["3^n", "3 ^ n", "3 to the n", "three to the n"],
      },
      {
        label: "Each element has three states",
        anyOf: [
          "three states",
          "3 states",
          "three choices",
          "3 choices",
          "three options",
          "3 options",
          "outside mask",
          "in mask but not",
          "in both",
        ],
      },
    ],
    hint: "Subtracting 1 from a number clears its lowest set bit and turns on every bit below it. What happens if you then AND the result with mask?",
    explanation:
      "Subtracting 1 clears the lowest set bit of sub and sets all lower bits, and ANDing with mask keeps only bits that belong to mask, which yields the next smaller submask. Enumerating the submasks of every mask costs the sum of 2^popcount(mask), which is 3^n: about 43 million at n = 16 but 3.5 billion at n = 20. So this pattern is for n up to about 16.",
    tags: ["dp_state_compression", "bit_manipulation"],
    difficulty: 3,
    relatedProblem: { title: "Parallel Courses II", leetcodeSlug: "parallel-courses-ii" },
  },
  {
    id: "mc-bitmask-bfs-node-mask",
    title: "BFS over (node, mask) states",
    prompt:
      "🕸️ Shortest Path Visiting All Nodes (n <= 12, unweighted, start anywhere, revisits allowed). What is a BFS state, how do you start the search, and when do you stop? Reply in 1-2 sentences.",
    answerKey:
      "A state is (node, mask), where mask is the set of nodes visited so far, and visited is tracked per state rather than per node. Enqueue (i, 1 << i) for every node i at distance 0, then return the distance of the first state whose mask equals (1 << n) - 1; with n * 2^n states that is O(2^n * n^2).",
    keyPoints: [
      {
        label: "State is (node, mask of visited nodes)",
        anyOf: [
          "(node, mask)",
          "node, mask",
          "node and mask",
          "node plus mask",
          "node plus",
          "node and the mask",
          "bitmask",
          "mask of visited",
          "(node, visited)",
          "node, visited",
          "current node and visited set",
          "node and the set",
        ],
      },
      {
        label: "Track visited per state, not per node",
        anyOf: ["per state", "visited states", "seen states", "state visited", "visited[node][mask]", "seen[node][mask]", "not per node"],
      },
      {
        label: "Start from every node at distance 0",
        // Not a bare "all nodes": the prompt's own title says "Visiting All Nodes".
        anyOf: [
          "every node",
          "each node",
          "all the nodes",
          "from all nodes",
          "for all nodes",
          "all nodes at once",
          "every start node",
          "its own bit",
          "their own bit",
          "push (i, 1 << i)",
          "enqueue (i, 1 << i)",
          "multi-source",
          "multi source",
          "multisource",
          "all starts",
          "every start",
        ],
      },
      {
        label: "Stop at the first full mask (1 << n) - 1",
        anyOf: [
          "(1 << n) - 1",
          "full mask",
          "all ones",
          "all bits set",
          "all n bits",
          "n bits set",
          "every bit set",
          "all bits",
          "mask is full",
          "mask equals",
          "complete mask",
          "all visited",
        ],
      },
    ],
    hint: "Knowing which node you're on isn't enough: two visits to the same node can have very different progress. What else must the state remember?",
    explanation:
      "Revisiting nodes is allowed, so a plain visited-node set would cut off valid paths; the mask records progress so each (node, mask) pair is expanded only once. Starting every node at distance 0 handles the free starting point in a single BFS. BFS returns the shortest answer because every move costs exactly one edge.",
    tags: ["dp_state_compression", "bfs", "bit_manipulation"],
    difficulty: 3,
    relatedProblem: { title: "Shortest Path Visiting All Nodes", leetcodeSlug: "shortest-path-visiting-all-nodes" },
  },
];
