import { browserPart, listSources, nativePart, treeSources, type AdapterSpec, type SourceSet } from "./adapters";
import type { Problem } from "./types";

/** Every subset of nums (the expected output for Subsets; order-free comparison). */
function powerSet(nums: number[]): number[][] {
  return nums.reduce<number[][]>((acc, n) => [...acc, ...acc.map((subset) => [...subset, n])], [[]]);
}

// ── Node-based sources (tree / list adapters in all six languages) ─────────────

const MAX_DEPTH: AdapterSpec = {
  wrapper: "maxDepthFromValues",
  call: "maxDepth",
  returns: { java: "int", cpp: "int", go: "int", typescript: "number" },
};

const MAX_DEPTH_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode | null} root
 * @return {number}
 */
function maxDepth(root) {
  // Your code here
  return 0;
}`,
  python: `def maxDepth(root: Optional[TreeNode]) -> int:
    # Your code here
    return 0`,
  java: `    public int maxDepth(TreeNode root) {
        // Your code here
        return 0;
    }`,
  cpp: `    int maxDepth(TreeNode* root) {
        // Your code here
        return 0;
    }`,
  go: `func maxDepth(root *TreeNode) int {
	// Your code here
	return 0
}`,
  typescript: `function maxDepth(root: TreeNode | null): number {
  // Your code here
  return 0;
}`,
};

const MAX_DEPTH_REF: SourceSet = {
  javascript: `function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
  python: `def maxDepth(root: Optional[TreeNode]) -> int:
    if root is None:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,
  java: `    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }`,
  cpp: `    int maxDepth(TreeNode* root) {
        if (!root) return 0;
        return 1 + max(maxDepth(root->left), maxDepth(root->right));
    }`,
  go: `func maxDepth(root *TreeNode) int {
	if root == nil {
		return 0
	}
	left, right := maxDepth(root.Left), maxDepth(root.Right)
	if left > right {
		return left + 1
	}
	return right + 1
}`,
  typescript: `function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
};

const VALID_BST: AdapterSpec = {
  wrapper: "isValidBSTFromValues",
  call: "isValidBST",
  returns: { java: "boolean", cpp: "bool", go: "bool", typescript: "boolean" },
};

const VALID_BST_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode | null} root
 * @return {boolean}
 */
function isValidBST(root) {
  // Your code here
  return false;
}`,
  python: `def isValidBST(root: Optional[TreeNode]) -> bool:
    # Your code here
    return False`,
  java: `    public boolean isValidBST(TreeNode root) {
        // Your code here
        return false;
    }`,
  cpp: `    bool isValidBST(TreeNode* root) {
        // Your code here
        return false;
    }`,
  go: `func isValidBST(root *TreeNode) bool {
	// Your code here
	return false
}`,
  typescript: `function isValidBST(root: TreeNode | null): boolean {
  // Your code here
  return false;
}`,
};

const VALID_BST_REF: SourceSet = {
  javascript: `function isValidBST(root, low = -Infinity, high = Infinity) {
  if (!root) return true;
  if (root.val <= low || root.val >= high) return false;
  return isValidBST(root.left, low, root.val) && isValidBST(root.right, root.val, high);
}`,
  python: `def isValidBST(root: Optional[TreeNode], low: float = float("-inf"), high: float = float("inf")) -> bool:
    if root is None:
        return True
    if not low < root.val < high:
        return False
    return isValidBST(root.left, low, root.val) and isValidBST(root.right, root.val, high)`,
  java: `    public boolean isValidBST(TreeNode root) {
        return check(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }

    private boolean check(TreeNode node, long low, long high) {
        if (node == null) return true;
        if (node.val <= low || node.val >= high) return false;
        return check(node.left, low, node.val) && check(node.right, node.val, high);
    }`,
  cpp: `    bool isValidBST(TreeNode* root) {
        return check(root, LLONG_MIN, LLONG_MAX);
    }

    bool check(TreeNode* node, long long low, long long high) {
        if (!node) return true;
        if (node->val <= low || node->val >= high) return false;
        return check(node->left, low, node->val) && check(node->right, node->val, high);
    }`,
  go: `func isValidBST(root *TreeNode) bool {
	var check func(node *TreeNode, low, high *int) bool
	check = func(node *TreeNode, low, high *int) bool {
		if node == nil {
			return true
		}
		if (low != nil && node.Val <= *low) || (high != nil && node.Val >= *high) {
			return false
		}
		return check(node.Left, low, &node.Val) && check(node.Right, &node.Val, high)
	}
	return check(root, nil, nil)
}`,
  typescript: `function isValidBST(root: TreeNode | null, low = -Infinity, high = Infinity): boolean {
  if (!root) return true;
  if (root.val <= low || root.val >= high) return false;
  return isValidBST(root.left, low, root.val) && isValidBST(root.right, root.val, high);
}`,
};

const REVERSE_LIST: AdapterSpec = {
  wrapper: "reverseListValues",
  call: "reverseList",
  returns: { java: "int[]", cpp: "vector<int>", go: "[]int", typescript: "number[]" },
};

const REVERSE_LIST_STUB: SourceSet = {
  javascript: `/**
 * @param {ListNode | null} head
 * @return {ListNode | null}
 */
function reverseList(head) {
  // Your code here
  return head;
}`,
  python: `def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:
    # Your code here
    return head`,
  java: `    public ListNode reverseList(ListNode head) {
        // Your code here
        return head;
    }`,
  cpp: `    ListNode* reverseList(ListNode* head) {
        // Your code here
        return head;
    }`,
  go: `func reverseList(head *ListNode) *ListNode {
	// Your code here
	return head
}`,
  typescript: `function reverseList(head: ListNode | null): ListNode | null {
  // Your code here
  return head;
}`,
};

const REVERSE_LIST_REF: SourceSet = {
  javascript: `function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
  python: `def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev, curr = curr, nxt
    return prev`,
  java: `    public ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }`,
  cpp: `    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }`,
  go: `func reverseList(head *ListNode) *ListNode {
	var prev *ListNode
	curr := head
	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev, curr = curr, next
	}
	return prev
}`,
  typescript: `function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  while (curr) {
    const next: ListNode | null = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
};

const maxDepthStarters = treeSources(MAX_DEPTH_STUB, MAX_DEPTH);
const validBstStarters = treeSources(VALID_BST_STUB, VALID_BST);
const reverseListStarters = listSources(REVERSE_LIST_STUB, REVERSE_LIST);

/** Node-based references for the server-compiled languages (used by the native judge tests). */
export const NODE_REFERENCES = {
  "p-maximum-depth-of-binary-tree": nativePart(treeSources(MAX_DEPTH_REF, MAX_DEPTH)),
  "p-validate-binary-search-tree": nativePart(treeSources(VALID_BST_REF, VALID_BST)),
  "p-reverse-linked-list": nativePart(listSources(REVERSE_LIST_REF, REVERSE_LIST)),
} as const;

const TREE_NOTE =
  "**Judge note:** The judge passes the tree as a LeetCode-style level-order array (`null` for missing children). The starter's adapter builds real `TreeNode`s and calls your function.";

export const PROBLEMS_C: Problem[] = [
  // ---------------------------------------------------------------- arrays / hashing
  {
    id: "p-two-sum",
    title: "Two Sum",
    leetcodeSlug: "two-sum",
    difficulty: "easy",
    tags: ["arrays", "hashing"],
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers that add up to \`target\`.

You may assume each input has **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.`,
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i], target <= 10^9", "Exactly one valid answer exists."],
    stages: {
      invariant: {
        prompt:
          "🔎 Two Sum in one pass: what does your hash map store, and what do you check before inserting nums[i]? Reply in 1-2 sentences.",
        answerKey:
          "The map stores each value already seen, mapped to its index. For each nums[i], first check whether target - nums[i] is already in the map; if so return both indices, otherwise store nums[i] with index i, so it runs in O(n).",
        keyPoints: [
          {
            label: "Map each seen value to its index",
            anyOf: ["mapped to its index", "value to its index", "value to index", "number to its index", "index of each value", "value -> index"],
          },
          {
            label: "Look up the complement target - nums[i]",
            anyOf: ["complement", "target - nums[i]", "target minus", "target - x", "the difference"],
          },
          {
            label: "Check before inserting the current element",
            anyOf: ["first check", "check first", "before inserting", "before storing", "before adding", "otherwise store"],
          },
        ],
        hint: "For each number, which single other value would complete the pair? How do you find out in O(1) whether you've seen it?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [3,2,4], target = 6. If you build the whole map first and then look up target - nums[i], what wrong answer can you return, and how do you avoid it? Reply in 1-2 sentences.",
        answerKey:
          "With the full map built first, index 0 looks up 6 - 3 = 3 and finds itself, returning [0,0] by reusing the same element. Look up the complement before inserting the current index (or check the found index differs from i), which still handles duplicates like [3,3].",
        keyPoints: [
          {
            label: "It pairs an element with itself",
            anyOf: ["finds itself", "same element", "same index", "[0,0]", "reusing", "uses it twice"],
          },
          {
            label: "Look up before inserting, or require a different index",
            anyOf: ["before inserting", "before adding", "before storing", "index differs", "different index", "indices differ", "i != j"],
          },
        ],
        hint: "Trace index 0 with the map already holding every value. What does the lookup for 3 return?",
      },
      code: {
        functionName: "twoSum",
        params: ["nums", "target"],
        signature: { params: ["int[]", "int"], returns: "int[]" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Your code here
  return [];
}
`,
          python: `def twoSum(nums: List[int], target: int) -> List[int]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
`,
          python: `from typing import List


def twoSum(nums: List[int], target: int) -> List[int]:
    seen = {}
    for i, value in enumerate(nums):
        if target - value in seen:
            return [seen[target - value], i]
        seen[value] = i
    return []
`,
        },
        tests: [
          { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
          { args: [[3, 2, 4], 6], expected: [1, 2] },
          { args: [[3, 3], 6], expected: [0, 1] },
          { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
          { args: [[0, 4, 3, 0], 0], expected: [0, 3] },
          { args: [[5, 75, 25], 100], expected: [1, 2], hidden: true },
          { args: [[1, 2], 3], expected: [0, 1], hidden: true },
          { args: [[2, 5, 5, 11], 10], expected: [1, 2], hidden: true },
        ],
        compare: "unordered",
      },
    },
    weakTags: ["hashing"],
    relatedCardIds: ["mc-two-sum-hash-map"],
  },

  // ---------------------------------------------------------------- two pointers
  {
    id: "p-container-with-most-water",
    title: "Container With Most Water",
    leetcodeSlug: "container-with-most-water",
    difficulty: "medium",
    tags: ["two_pointers", "arrays", "greedy"],
    statement: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines, where line \`i\` goes from \`(i, 0)\` to \`(i, height[i])\`.

Find two lines that, together with the x-axis, form a container holding the **most water**, and return that amount. You may not slant the container.`,
    examples: [
      { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49", explanation: "Lines at indices 1 and 8: min(8, 7) × 7 = 49." },
      { input: "height = [1,1]", output: "1" },
    ],
    constraints: ["2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "🪣 Container With Most Water in O(n): you start pointers at both ends. Which pointer do you move each step, and why can't moving the other one ever find a bigger area? Reply in 1-2 sentences.",
        answerKey:
          "Always move the pointer at the shorter line inward. The area is limited by the shorter line, and moving the taller one only shrinks the width while the height stays capped by that same shorter line, so it can never do better; each step discards one line, O(n).",
        keyPoints: [
          {
            label: "Move the shorter line inward",
            anyOf: ["move the shorter", "shorter line", "move the smaller", "smaller height", "lower line"],
          },
          {
            label: "The shorter line caps the height",
            anyOf: ["limited by the shorter", "capped by", "bounded by the shorter", "min of the heights", "bottleneck"],
          },
          {
            label: "Moving the taller line only loses width",
            anyOf: ["only shrinks the width", "width shrinks", "width decreases", "can never do better", "never do better", "can't do better"],
          },
        ],
        hint: "Area = min(left, right) × width. If you keep the shorter line and move the taller one inward, can min() go up?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: height = [1,8,6,2,5,4,8,3,7]. Why is the answer 49 and not 64 from the two 8s? What exactly is the area formula? Reply in 1-2 sentences.",
        answerKey:
          "Area is min(height[i], height[j]) times (j - i). The two 8s at indices 1 and 6 give 8 × 5 = 40, not 64; the best pair is indices 1 and 8 with min(8, 7) × 7 = 49, so you multiply by the distance between indices, not by a line's own height.",
        keyPoints: [
          {
            label: "Area = min of the two heights × the distance",
            anyOf: ["min(height", "times (j - i)", "times the distance", "times the width", "distance between", "width times"],
          },
          {
            label: "The best pair is indices 1 and 8",
            anyOf: ["indices 1 and 8", "8 and 7", "seven apart", "min(8, 7)"],
          },
        ],
        hint: "Compute the area for the two 8s using the real formula. How far apart are they?",
      },
      code: {
        functionName: "maxArea",
        params: ["height"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
  // Your code here
  return 0;
}
`,
          python: `def maxArea(height: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let best = 0;
  while (left < right) {
    best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}
`,
          python: `from typing import List


def maxArea(height: List[int]) -> int:
    left, right, best = 0, len(height) - 1, 0
    while left < right:
        best = max(best, min(height[left], height[right]) * (right - left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
`,
        },
        tests: [
          { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
          { args: [[1, 1]], expected: 1 },
          { args: [[4, 3, 2, 1, 4]], expected: 16 },
          { args: [[1, 2, 1]], expected: 2 },
          { args: [[2, 3, 4, 5, 18, 17, 6]], expected: 17 },
          { args: [[1, 3, 2, 5, 25, 24, 5]], expected: 24, hidden: true },
          { args: [[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]], expected: 25, hidden: true },
          { args: [[2, 2, 2, 2]], expected: 6, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["two_pointers"],
    relatedCardIds: ["mc-container-most-water", "mc-two-pointers-sorted-two-sum"],
  },

  // ---------------------------------------------------------------- stack
  {
    id: "p-evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    leetcodeSlug: "evaluate-reverse-polish-notation",
    difficulty: "medium",
    tags: ["stack", "math", "arrays"],
    statement: `You are given an array of strings \`tokens\` that represents an arithmetic expression in **Reverse Polish Notation**. Evaluate it and return the integer result.

- The valid operators are \`'+'\`, \`'-'\`, \`'*'\`, and \`'/'\`.
- Each operand may be an integer or another expression.
- Division between two integers always **truncates toward zero**.
- There is no division by zero, and every intermediate result fits in a 32-bit integer.`,
    examples: [
      { input: 'tokens = ["2","1","+","3","*"]', output: "9", explanation: "((2 + 1) * 3) = 9" },
      { input: 'tokens = ["4","13","5","/","+"]', output: "6", explanation: "(4 + (13 / 5)) = 6" },
    ],
    constraints: ["1 <= tokens.length <= 10^4", "tokens[i] is an operator or an integer in the range [-200, 200]."],
    stages: {
      invariant: {
        prompt:
          "🧮 Evaluate Reverse Polish Notation: what does your stack hold, and what exactly happens when you read an operator? Reply in 1-2 sentences.",
        answerKey:
          "The stack holds operands: numbers and partial results. On an operator, pop the top two values, apply the operator as second-popped op first-popped, and push the result; at the end the single value left is the answer.",
        keyPoints: [
          {
            label: "The stack holds operands and partial results",
            anyOf: ["operands", "partial results", "intermediate results", "holds the numbers", "values so far"],
          },
          {
            label: "Pop two, apply, push the result",
            anyOf: ["pop the top two", "pop two", "push the result", "push it back", "push back the result"],
          },
        ],
        hint: "Each operator applies to the two most recent values that aren't used up yet. Which structure hands you the most recent items first?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: tokens = ['13','5','/'] and ['-7','2','/']. What two details make or break division here? Reply in 1-2 sentences.",
        answerKey:
          "Order matters: the first popped value is the right operand, so compute 13 / 5, not 5 / 13. And division truncates toward zero, so -7 / 2 is -3, not the floor -4; use Math.trunc in JavaScript or int(a / b) in Python instead of floor division.",
        keyPoints: [
          {
            label: "The first popped value is the right operand",
            anyOf: ["order matters", "right operand", "first popped", "second operand", "13 / 5"],
          },
          {
            label: "Truncate toward zero, not floor",
            anyOf: ["toward zero", "towards zero", "truncate", "not the floor", "int(a / b)", "math.trunc"],
          },
        ],
        hint: "Which popped value is the numerator? And what does -7 / 2 give with floor division versus truncation?",
      },
      code: {
        functionName: "evalRPN",
        params: ["tokens"],
        signature: { params: ["string[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {string[]} tokens
 * @return {number}
 */
function evalRPN(tokens) {
  // Your code here
  return 0;
}
`,
          python: `def evalRPN(tokens: List[str]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function evalRPN(tokens) {
  const stack = [];
  for (const token of tokens) {
    if (token === "+" || token === "-" || token === "*" || token === "/") {
      const b = stack.pop();
      const a = stack.pop();
      if (token === "+") stack.push(a + b);
      else if (token === "-") stack.push(a - b);
      else if (token === "*") stack.push(a * b);
      else stack.push(Math.trunc(a / b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0] + 0;
}
`,
          python: `from typing import List


def evalRPN(tokens: List[str]) -> int:
    stack = []
    for token in tokens:
        if token in ("+", "-", "*", "/"):
            b = stack.pop()
            a = stack.pop()
            if token == "+":
                stack.append(a + b)
            elif token == "-":
                stack.append(a - b)
            elif token == "*":
                stack.append(a * b)
            else:
                stack.append(int(a / b))
        else:
            stack.append(int(token))
    return stack[0]
`,
        },
        tests: [
          { args: [["2", "1", "+", "3", "*"]], expected: 9 },
          { args: [["4", "13", "5", "/", "+"]], expected: 6 },
          { args: [["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]], expected: 22 },
          { args: [["-7", "2", "/"]], expected: -3 },
          { args: [["3"]], expected: 3 },
          { args: [["13", "5", "/"]], expected: 2, hidden: true },
          { args: [["1", "2", "-"]], expected: -1, hidden: true },
          { args: [["2", "-3", "*", "4", "-"]], expected: -10, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["stack"],
    relatedCardIds: ["mc-min-stack"],
  },

  // ---------------------------------------------------------------- binary search
  {
    id: "p-find-minimum-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    leetcodeSlug: "find-minimum-in-rotated-sorted-array",
    difficulty: "medium",
    tags: ["binary_search", "arrays"],
    statement: `An array of **unique** integers sorted in ascending order has been rotated between \`1\` and \`n\` times, e.g. \`[0,1,2,4,5,6,7]\` might become \`[4,5,6,7,0,1,2]\`.

Given the rotated array \`nums\`, return its **minimum** element. You must write an algorithm that runs in **O(log n)** time.`,
    examples: [
      { input: "nums = [3,4,5,1,2]", output: "1" },
      { input: "nums = [4,5,6,7,0,1,2]", output: "0" },
      { input: "nums = [11,13,15,17]", output: "11", explanation: "Rotated n times, it is sorted again." },
    ],
    constraints: ["1 <= nums.length <= 5000", "-5000 <= nums[i] <= 5000", "All values are unique."],
    stages: {
      invariant: {
        prompt:
          "🔄 Find Minimum in Rotated Sorted Array in O(log n): what do you compare nums[mid] against, and how does each outcome move lo or hi? Reply in 1-2 sentences.",
        answerKey:
          "Compare nums[mid] with nums[hi]. If nums[mid] > nums[hi] the drop, and so the minimum, is strictly right of mid, so lo = mid + 1; otherwise the minimum is at mid or to its left, so hi = mid; stop when lo == hi.",
        keyPoints: [
          {
            label: "Compare nums[mid] with the right end nums[hi]",
            anyOf: ["nums[hi]", "nums[right]", "nums[r]", "the right end", "last element", "rightmost"],
          },
          {
            label: "Greater: the minimum is right of mid (lo = mid + 1)",
            anyOf: ["lo = mid + 1", "left = mid + 1", "l = m + 1", "right of mid", "right half"],
          },
          {
            label: "Otherwise keep mid (hi = mid)",
            anyOf: ["hi = mid", "right = mid", "r = m", "at mid or", "keep mid"],
          },
        ],
        hint: "The minimum sits right after the one drop in the array. What does comparing mid to the last element tell you about where the drop is?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: why compare nums[mid] against nums[hi] rather than nums[lo]? Give an input where comparing against nums[lo] misleads you. Reply in 1-2 sentences.",
        answerKey:
          "nums[mid] > nums[lo] is also true for an array that is not rotated at all, like [1,2,3,4,5], where the minimum is on the left, so the lo comparison can't tell which side holds the drop. Against nums[hi], nums[mid] > nums[hi] happens only when the drop is to the right.",
        keyPoints: [
          {
            label: "An unrotated array fools the lo comparison",
            anyOf: ["not rotated", "unrotated", "already sorted", "[1,2,3,4,5]", "no rotation", "fully sorted"],
          },
          {
            label: "Only nums[hi] tells which side holds the drop",
            anyOf: ["which side", "only when the drop", "drop is to the right", "can't tell", "cannot tell", "ambiguous"],
          },
        ],
        hint: "Try [1,2,3,4,5]. Where is the minimum, and what does nums[mid] > nums[lo] suggest?",
      },
      code: {
        functionName: "findMin",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function findMin(nums) {
  // Your code here
  return 0;
}
`,
          python: `def findMin(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function findMin(nums) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1;
    else hi = mid;
  }
  return nums[lo];
}
`,
          python: `from typing import List


def findMin(nums: List[int]) -> int:
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]
`,
        },
        tests: [
          { args: [[3, 4, 5, 1, 2]], expected: 1 },
          { args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0 },
          { args: [[11, 13, 15, 17]], expected: 11 },
          { args: [[2, 1]], expected: 1 },
          { args: [[1]], expected: 1 },
          { args: [[5, 1, 2, 3, 4]], expected: 1, hidden: true },
          { args: [[2, 3, 4, 5, 1]], expected: 1, hidden: true },
          { args: [[-4, -3, -2, -5]], expected: -5, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["binary_search"],
    relatedCardIds: ["mc-rotated-array-search", "mc-binary-search-lower-bound"],
  },
  {
    id: "p-koko-eating-bananas",
    title: "Koko Eating Bananas",
    leetcodeSlug: "koko-eating-bananas",
    difficulty: "medium",
    tags: ["binary_search", "arrays"],
    statement: `Koko has \`n\` piles of bananas; the \`i\`th pile has \`piles[i]\` bananas. The guards return in \`h\` hours.

Each hour Koko picks one pile and eats \`k\` bananas from it. If the pile has fewer than \`k\`, she eats them all and **waits out the rest of the hour**.

Return the **minimum integer** \`k\` such that she can eat every banana within \`h\` hours.`,
    examples: [
      { input: "piles = [3,6,7,11], h = 8", output: "4" },
      { input: "piles = [30,11,23,4,20], h = 5", output: "30" },
      { input: "piles = [30,11,23,4,20], h = 6", output: "23" },
    ],
    constraints: ["1 <= piles.length <= 10^4", "piles.length <= h <= 10^9", "1 <= piles[i] <= 10^9"],
    stages: {
      invariant: {
        prompt:
          "🍌 Koko Eating Bananas: what exactly do you binary search over, and what monotonic check decides which half to keep? Reply in 1-2 sentences.",
        answerKey:
          "Binary search the eating speed k from 1 to max(piles). The check is monotonic: hours(k), the sum of ceil(pile / k), only goes down as k grows, so if hours(k) <= h keep k and search lower (hi = k), otherwise search higher (lo = k + 1).",
        keyPoints: [
          {
            label: "Search over the speed k in [1, max(piles)]",
            anyOf: ["the eating speed", "speed k", "search the speed", "search over k", "1 to max", "max(piles)", "range of speeds"],
          },
          {
            label: "The check is monotonic in k",
            anyOf: ["monotonic", "only goes down", "decreases as", "fewer hours", "feasible"],
          },
          {
            label: "Feasible: search lower; otherwise search higher",
            anyOf: ["search lower", "hi = k", "hi = mid", "go lower", "search higher", "lo = k + 1", "lo = mid + 1"],
          },
        ],
        hint: "You're not searching the array. If speed k works, does every faster speed also work?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: piles = [3,6,7,11], h = 8. Why must hours use ceil(pile / k), and what goes wrong with plain integer division? Reply in 1-2 sentences.",
        answerKey:
          "Koko spends a whole hour on a pile even if she finishes early, so a pile takes ceil(pile / k) hours. Floor division undercounts: for k = 4 it gives 0+1+1+2 = 4 hours instead of the true 1+2+2+3 = 8, so slow speeds look feasible and the answer comes out too small.",
        keyPoints: [
          {
            label: "A partial pile still costs a whole hour",
            anyOf: ["whole hour", "full hour", "even if she finishes", "partial pile", "rounds up", "round up"],
          },
          {
            label: "Floor division undercounts, so the answer is too small",
            anyOf: ["undercount", "too small", "too low", "looks feasible", "look feasible"],
          },
        ],
        hint: "Compute the hours for k = 4 both ways. Which one matches the rules?",
      },
      code: {
        functionName: "minEatingSpeed",
        params: ["piles", "h"],
        signature: { params: ["int[]", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} piles
 * @param {number} h
 * @return {number}
 */
function minEatingSpeed(piles, h) {
  // Your code here
  return 0;
}
`,
          python: `def minEatingSpeed(piles: List[int], h: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function minEatingSpeed(piles, h) {
  let lo = 1;
  let hi = Math.max(...piles);
  while (lo < hi) {
    const k = Math.floor((lo + hi) / 2);
    let hours = 0;
    for (const pile of piles) hours += Math.ceil(pile / k);
    if (hours <= h) hi = k;
    else lo = k + 1;
  }
  return lo;
}
`,
          python: `from typing import List


def minEatingSpeed(piles: List[int], h: int) -> int:
    lo, hi = 1, max(piles)
    while lo < hi:
        k = (lo + hi) // 2
        hours = sum((pile + k - 1) // k for pile in piles)
        if hours <= h:
            hi = k
        else:
            lo = k + 1
    return lo
`,
        },
        tests: [
          { args: [[3, 6, 7, 11], 8], expected: 4 },
          { args: [[30, 11, 23, 4, 20], 5], expected: 30 },
          { args: [[30, 11, 23, 4, 20], 6], expected: 23 },
          { args: [[1], 1], expected: 1 },
          { args: [[312884470], 312884469], expected: 2 },
          { args: [[1, 1, 1, 999999999], 10], expected: 142857143, hidden: true },
          { args: [[2, 2], 2], expected: 2, hidden: true },
          { args: [[5, 10], 3], expected: 5, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["binary_search"],
    relatedCardIds: ["mc-binary-search-on-answer"],
  },

  // ---------------------------------------------------------------- heap
  {
    id: "p-kth-largest-element",
    title: "Kth Largest Element in an Array",
    leetcodeSlug: "kth-largest-element-in-an-array",
    difficulty: "medium",
    tags: ["heap", "sorting", "arrays"],
    statement: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\`th **largest** element in the array.

It is the \`k\`th largest in sorted order, not the \`k\`th distinct element. Can you solve it without fully sorting?`,
    examples: [
      { input: "nums = [3,2,1,5,6,4], k = 2", output: "5" },
      { input: "nums = [3,2,3,1,2,4,5,5,6], k = 4", output: "4" },
    ],
    constraints: ["1 <= k <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "⛰️ Kth Largest Element: with a heap, which kind of heap do you keep, how big is it, and where is the answer at the end? Reply in 1-2 sentences.",
        answerKey:
          "Keep a min-heap of size k: push each number and pop the smallest whenever the heap grows past k, so it always holds the k largest seen. At the end the heap's top, its minimum, is the kth largest, in O(n log k).",
        keyPoints: [
          { label: "A min-heap", anyOf: ["min-heap", "min heap", "minheap", "heapq"] },
          {
            label: "Capped at size k",
            anyOf: ["size k", "past k", "exceeds k", "more than k", "k largest", "k elements"],
          },
          {
            label: "The heap's top is the answer",
            anyOf: ["heap's top", "top of the heap", "its minimum", "heap[0]", "root of the heap", "smallest in the heap"],
          },
        ],
        hint: "You only care about the k biggest values. To throw out the weakest of those quickly, what should sit on top?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [3,2,3,1,2,4,5,5,6], k = 4. Do duplicates count toward k, and what is the answer? Why not deduplicate first? Reply in 1-2 sentences.",
        answerKey:
          "Duplicates count: it is the kth largest in sorted order, not the kth distinct value. Sorted descending the array starts 6,5,5,4, so the answer is 4; deduplicating first would give 3, the 4th distinct value.",
        keyPoints: [
          {
            label: "Duplicates count (not the kth distinct)",
            anyOf: ["duplicates count", "not the kth distinct", "not distinct", "count duplicates", "counts duplicates", "sorted order"],
          },
          { label: "The answer is 4", anyOf: ["answer is 4", "6,5,5,4"] },
        ],
        hint: "Write the array in descending order and count to the 4th position.",
      },
      code: {
        functionName: "findKthLargest",
        params: ["nums", "k"],
        signature: { params: ["int[]", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function findKthLargest(nums, k) {
  // Your code here
  return 0;
}
`,
          python: `def findKthLargest(nums: List[int], k: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function findKthLargest(nums, k) {
  return [...nums].sort((a, b) => b - a)[k - 1];
}
`,
          python: `import heapq
from typing import List


def findKthLargest(nums: List[int], k: int) -> int:
    heap = []
    for value in nums:
        heapq.heappush(heap, value)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
`,
        },
        tests: [
          { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
          { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
          { args: [[1], 1], expected: 1 },
          { args: [[7, 6, 5, 4, 3, 2, 1], 7], expected: 1 },
          { args: [[-1, -1], 2], expected: -1 },
          { args: [[2, 1], 1], expected: 2, hidden: true },
          { args: [[5, 5, 5, 5], 3], expected: 5, hidden: true },
          { args: [[3, 1, 2, 4], 2], expected: 3, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["heap"],
    relatedCardIds: ["mc-heap-top-k-min-heap", "mc-quickselect-kth-largest"],
  },
  {
    id: "p-k-closest-points-to-origin",
    title: "K Closest Points to Origin",
    leetcodeSlug: "k-closest-points-to-origin",
    difficulty: "medium",
    tags: ["heap", "sorting", "math"],
    statement: `Given an array of \`points\` where \`points[i] = [xi, yi]\` and an integer \`k\`, return the \`k\` points closest to the origin \`(0, 0)\` by Euclidean distance.

You may return the answer in **any order**. The answer is guaranteed to be unique.`,
    examples: [
      { input: "points = [[1,3],[-2,2]], k = 1", output: "[[-2,2]]" },
      { input: "points = [[3,3],[5,-1],[-2,4]], k = 2", output: "[[3,3],[-2,4]]" },
    ],
    constraints: ["1 <= k <= points.length <= 10^4", "-10^4 <= xi, yi <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "📍 K Closest Points to Origin: with a heap, what do you order points by, which heap do you keep, and how big? Reply in 1-2 sentences.",
        answerKey:
          "Order by squared distance x*x + y*y, with no square root needed. Keep a max-heap of size k keyed on that distance: push each point and pop the farthest when the heap exceeds k, leaving the k closest in O(n log k).",
        keyPoints: [
          {
            label: "Order by squared distance (no sqrt)",
            anyOf: ["squared distance", "x*x + y*y", "x^2 + y^2", "no square root", "no sqrt"],
          },
          {
            label: "A max-heap of size k that evicts the farthest",
            anyOf: ["max-heap", "max heap", "pop the farthest", "evict the farthest", "negated distance"],
          },
        ],
        hint: "To keep only the k closest, you need quick access to the worst of them. Which heap puts the farthest on top?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: points = [[3,3],[5,-1],[-2,4]], k = 2. Can the answer come back in any order, and why is comparing sqrt distances as floats unnecessary? Reply in 1-2 sentences.",
        answerKey:
          "Any order is accepted: the answer is the set [[3,3],[-2,4]], with squared distances 18 and 20 versus 26 for [5,-1]. Comparing integer squared distances is exact, and the square root preserves order, so taking it only adds floating-point rounding.",
        keyPoints: [
          {
            label: "Any order is fine",
            anyOf: ["any order", "order doesn't matter", "order does not matter", "in any order"],
          },
          {
            label: "Squared integers are exact and sqrt keeps the order",
            anyOf: ["preserves order", "keeps the order", "same order", "is exact", "rounding"],
          },
        ],
        hint: "Is sqrt(a) < sqrt(b) ever different from a < b for non-negative a and b?",
      },
      code: {
        functionName: "kClosest",
        params: ["points", "k"],
        signature: { params: ["int[][]", "int"], returns: "int[][]" },
        starter: {
          javascript: `/**
 * @param {number[][]} points
 * @param {number} k
 * @return {number[][]}
 */
function kClosest(points, k) {
  // Your code here
  return [];
}
`,
          python: `def kClosest(points: List[List[int]], k: int) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function kClosest(points, k) {
  const dist = ([x, y]) => x * x + y * y;
  return [...points].sort((a, b) => dist(a) - dist(b)).slice(0, k);
}
`,
          python: `import heapq
from typing import List


def kClosest(points: List[List[int]], k: int) -> List[List[int]]:
    return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])
`,
        },
        tests: [
          { args: [[[1, 3], [-2, 2]], 1], expected: [[-2, 2]] },
          { args: [[[3, 3], [5, -1], [-2, 4]], 2], expected: [[3, 3], [-2, 4]] },
          { args: [[[0, 1], [1, 0]], 2], expected: [[0, 1], [1, 0]] },
          { args: [[[1, 1], [2, 2], [3, 3]], 1], expected: [[1, 1]] },
          { args: [[[-5, 4], [4, 6], [2, -1]], 2], expected: [[2, -1], [-5, 4]] },
          { args: [[[0, 0]], 1], expected: [[0, 0]], hidden: true },
          { args: [[[1, 2], [2, 1], [3, 3], [-1, -1]], 3], expected: [[1, 2], [2, 1], [-1, -1]], hidden: true },
          { args: [[[10, 10], [-1, 0], [0, -2]], 2], expected: [[-1, 0], [0, -2]], hidden: true },
        ],
        compare: "unordered",
      },
    },
    weakTags: ["heap"],
    relatedCardIds: ["mc-heap-top-k-min-heap"],
  },

  // ---------------------------------------------------------------- backtracking
  {
    id: "p-subsets",
    title: "Subsets",
    leetcodeSlug: "subsets",
    difficulty: "medium",
    tags: ["backtracking", "recursion", "bit_manipulation"],
    statement: `Given an integer array \`nums\` of **unique** elements, return all possible subsets (the power set).

The solution set must not contain duplicate subsets. Return the subsets in any order.`,
    examples: [
      { input: "nums = [1,2,3]", output: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]" },
      { input: "nums = [0]", output: "[[],[0]]" },
    ],
    constraints: ["1 <= nums.length <= 10", "-10 <= nums[i] <= 10", "All the numbers of nums are unique."],
    stages: {
      invariant: {
        prompt:
          "🌿 Subsets: in your backtracking, when do you record a subset, and how do you make sure each subset appears exactly once? Reply in 1-2 sentences.",
        answerKey:
          "Record the current path at every node of the recursion, not only at leaves, since every partial choice is a subset. Loop i from the start index and recurse with i + 1, so elements are only chosen in increasing index order and each subset is built once; 2^n subsets in total.",
        keyPoints: [
          {
            label: "Record at every node, not just at leaves",
            anyOf: ["every node", "not only at leaves", "not just leaves", "every call", "each call", "at every step"],
          },
          {
            label: "Only move forward from the start index",
            anyOf: ["start index", "i + 1", "increasing index", "move forward", "index order"],
          },
        ],
        hint: "Is [1] a subset of [1,2,3]? Then you can't wait until the path is full to record it.",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: you push path straight into the result, and your output ends up full of empty lists. What went wrong, and what is the fix? Reply in 1-2 sentences.",
        answerKey:
          "You appended a reference to the same path list, which backtracking later empties, so every entry ends up as the final empty path. Append a copy instead, like path.slice() in JavaScript or path[:] in Python.",
        keyPoints: [
          {
            label: "Every entry is a reference to the same path",
            anyOf: ["a reference", "same path", "same list", "shared list", "aliasing", "same object"],
          },
          { label: "Append a copy", anyOf: ["a copy", "copy of", "path.slice()", "path[:]", "list(path)", "clone"] },
        ],
        hint: "How many distinct list objects end up in your result?",
      },
      code: {
        functionName: "subsets",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "list<list<int>>" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function subsets(nums) {
  // Your code here
  return [];
}
`,
          python: `def subsets(nums: List[int]) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function subsets(nums) {
  const out = [];
  const path = [];
  const dfs = (start) => {
    out.push(path.slice());
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      dfs(i + 1);
      path.pop();
    }
  };
  dfs(0);
  return out;
}
`,
          python: `from typing import List


def subsets(nums: List[int]) -> List[List[int]]:
    out, path = [], []

    def dfs(start: int) -> None:
        out.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            dfs(i + 1)
            path.pop()

    dfs(0)
    return out
`,
        },
        tests: [
          { args: [[1, 2, 3]], expected: powerSet([1, 2, 3]) },
          { args: [[0]], expected: powerSet([0]) },
          { args: [[1, 2]], expected: powerSet([1, 2]) },
          { args: [[5, -1]], expected: powerSet([5, -1]) },
          { args: [[4, 1, 0]], expected: powerSet([4, 1, 0]) },
          { args: [[9, 8, 7, 6]], expected: powerSet([9, 8, 7, 6]), hidden: true },
          { args: [[-3, 2, 10, -10, 7]], expected: powerSet([-3, 2, 10, -10, 7]), hidden: true },
        ],
        compare: "unordered-nested",
      },
    },
    weakTags: ["backtracking"],
    relatedCardIds: ["mc-backtracking-subsets-perms-combos"],
  },
  {
    id: "p-combination-sum",
    title: "Combination Sum",
    leetcodeSlug: "combination-sum",
    difficulty: "medium",
    tags: ["backtracking", "recursion"],
    statement: `Given an array of **distinct** integers \`candidates\` and a \`target\`, return all **unique combinations** of candidates that sum to \`target\`, in any order.

The **same** number may be chosen an unlimited number of times. Two combinations are unique if the frequency of at least one number differs.`,
    examples: [
      { input: "candidates = [2,3,6,7], target = 7", output: "[[2,2,3],[7]]" },
      { input: "candidates = [2,3,5], target = 8", output: "[[2,2,2,2],[2,3,3],[3,5]]" },
      { input: "candidates = [2], target = 1", output: "[]" },
    ],
    constraints: ["1 <= candidates.length <= 30", "2 <= candidates[i] <= 40", "All elements are distinct.", "1 <= target <= 40"],
    stages: {
      invariant: {
        prompt:
          "🎯 Combination Sum: each candidate can be reused. How does your recursion allow reuse without producing the same combination in different orders? Reply in 1-2 sentences.",
        answerKey:
          "Recurse with the same index i after choosing candidates[i], not i + 1, so it can be reused, but never go back to earlier indices: the loop starts at the current start index. That builds each combination in non-decreasing index order exactly once; stop when the remaining target hits 0 (record it) or goes negative (prune).",
        keyPoints: [
          {
            label: "Recurse with the same index to allow reuse",
            anyOf: ["same index", "not i + 1", "recurse with i", "stay on i", "stay at i"],
          },
          {
            label: "Never revisit earlier indices",
            anyOf: ["never go back", "earlier indices", "start index", "non-decreasing", "only move forward"],
          },
          {
            label: "Stop at a remainder of 0, prune below it",
            anyOf: ["hits 0", "reaches 0", "goes negative", "remaining target", "prune", "below zero"],
          },
        ],
        hint: "To reuse 2 you must be allowed to pick index 0 again. To avoid [3,2] after [2,3], which indices must you forbid?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: candidates = [2,3], target = 5. A version that loops over all candidates at every level returns [2,3] and [3,2]. Why, and what single change fixes it? Reply in 1-2 sentences.",
        answerKey:
          "Looping from index 0 at every level lets the same multiset be built in different orders, so [2,3] and [3,2] both appear. Start each loop at the current index instead of 0, so choices only move forward and each combination is generated once.",
        keyPoints: [
          {
            label: "The same combination is built in different orders",
            anyOf: ["different orders", "different order", "same multiset", "permutations of"],
          },
          {
            label: "Start the loop at the current index instead of 0",
            anyOf: ["current index", "instead of 0", "start index", "start at i", "from index i"],
          },
        ],
        hint: "Draw the first two levels of the recursion tree for [2,3]. Where does [3,2] come from?",
      },
      code: {
        functionName: "combinationSum",
        params: ["candidates", "target"],
        signature: { params: ["int[]", "int"], returns: "list<list<int>>" },
        starter: {
          javascript: `/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
function combinationSum(candidates, target) {
  // Your code here
  return [];
}
`,
          python: `def combinationSum(candidates: List[int], target: int) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function combinationSum(candidates, target) {
  const out = [];
  const path = [];
  const dfs = (start, remaining) => {
    if (remaining === 0) {
      out.push(path.slice());
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) continue;
      path.push(candidates[i]);
      dfs(i, remaining - candidates[i]);
      path.pop();
    }
  };
  dfs(0, target);
  return out;
}
`,
          python: `from typing import List


def combinationSum(candidates: List[int], target: int) -> List[List[int]]:
    out, path = [], []

    def dfs(start: int, remaining: int) -> None:
        if remaining == 0:
            out.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] <= remaining:
                path.append(candidates[i])
                dfs(i, remaining - candidates[i])
                path.pop()

    dfs(0, target)
    return out
`,
        },
        tests: [
          { args: [[2, 3, 6, 7], 7], expected: [[2, 2, 3], [7]] },
          { args: [[2, 3, 5], 8], expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]] },
          { args: [[2], 1], expected: [] },
          { args: [[3, 5], 11], expected: [[3, 3, 5]] },
          { args: [[4, 2], 8], expected: [[4, 4], [2, 2, 4], [2, 2, 2, 2]] },
          { args: [[5, 10], 15], expected: [[5, 5, 5], [5, 10]], hidden: true },
          { args: [[8], 1], expected: [], hidden: true },
          { args: [[2, 3], 6], expected: [[2, 2, 2], [3, 3]], hidden: true },
        ],
        compare: "unordered-nested",
      },
    },
    weakTags: ["backtracking"],
    relatedCardIds: ["mc-backtracking-subsets-perms-combos", "mc-backtracking-skip-duplicates"],
  },

  // ---------------------------------------------------------------- trees
  {
    id: "p-maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    leetcodeSlug: "maximum-depth-of-binary-tree",
    difficulty: "easy",
    tags: ["tree_traversal", "dfs", "recursion"],
    statement: `Given the \`root\` of a binary tree, return its **maximum depth**: the number of nodes along the longest path from the root down to the farthest leaf.

${TREE_NOTE}`,
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "3" },
      { input: "root = [1,null,2]", output: "2" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 10^4].", "-100 <= Node.val <= 100"],
    stages: {
      invariant: {
        prompt:
          "🌳 Maximum Depth of Binary Tree: state the recursive definition of the depth, including the base case. Reply in 1-2 sentences.",
        answerKey:
          "The depth of an empty tree is 0, and otherwise depth(node) = 1 + max(depth(node.left), depth(node.right)). Each node is visited once, so it is O(n) time with O(h) stack.",
        keyPoints: [
          {
            label: "An empty tree has depth 0",
            anyOf: ["empty tree is 0", "null is 0", "none is 0", "returns 0 for", "depth 0", "base case"],
          },
          { label: "1 + the larger child depth", anyOf: ["1 + max", "one plus the max", "plus the larger", "1 + the max", "max(depth"] },
        ],
        hint: "If you already knew the depth of both subtrees, how would you get the depth of the whole tree?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: root = [1,null,2]. Why is the answer 2 even though the left child is missing? A classmate stops and returns 1 when either child is null. Why is that wrong? Reply in 1-2 sentences.",
        answerKey:
          "Depth follows the longest root-to-leaf path, and the right child 2 is a leaf one level down, so the depth is 2. A missing child just contributes 0 to the max; stopping when either child is null treats a node with one child like a leaf and undercounts.",
        keyPoints: [
          {
            label: "The longest path goes through the child that exists",
            anyOf: ["longest root-to-leaf", "longest path", "deepest leaf", "right child", "the other child"],
          },
          {
            label: "A missing child adds 0; its parent is not a leaf",
            anyOf: ["contributes 0", "counts as 0", "not a leaf", "like a leaf", "undercount"],
          },
        ],
        hint: "Which nodes are leaves in [1,null,2]? Is 1 one of them?",
      },
      code: {
        functionName: "maxDepthFromValues",
        params: ["values"],
        signature: { params: ["int?[]"], returns: "int" },
        starter: browserPart(maxDepthStarters),
        nativeStarters: nativePart(maxDepthStarters),
        reference: browserPart(treeSources(MAX_DEPTH_REF, MAX_DEPTH)),
        tests: [
          { args: [[3, 9, 20, null, null, 15, 7]], expected: 3 },
          { args: [[1, null, 2]], expected: 2 },
          { args: [[]], expected: 0 },
          { args: [[1]], expected: 1 },
          { args: [[1, 2, 3, 4, null, null, 5, 6]], expected: 4 },
          { args: [[1, 2, null, 3, null, 4, null, 5]], expected: 5, hidden: true },
          { args: [[0, 0, 0]], expected: 2, hidden: true },
          { args: [[1, null, 2, null, 3]], expected: 3, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal"],
    relatedCardIds: ["mc-tree-dfs-orders", "mc-tree-diameter"],
  },
  {
    id: "p-validate-binary-search-tree",
    title: "Validate Binary Search Tree",
    leetcodeSlug: "validate-binary-search-tree",
    difficulty: "medium",
    tags: ["bst", "tree_traversal", "dfs"],
    statement: `Given the \`root\` of a binary tree, determine whether it is a valid **binary search tree**:

- The left subtree of a node contains only values **strictly less** than the node's value.
- The right subtree contains only values **strictly greater** than the node's value.
- Both subtrees are themselves binary search trees.

${TREE_NOTE}`,
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      { input: "root = [5,1,4,null,null,3,6]", output: "false", explanation: "The right child 4 is smaller than the root 5." },
    ],
    constraints: ["The number of nodes in the tree is in the range [1, 10^4].", "-2^31 <= Node.val <= 2^31 - 1"],
    stages: {
      invariant: {
        prompt:
          "🌲 Validate BST: what does each recursive call carry down, and what must every node satisfy? Reply in 1-2 sentences.",
        answerKey:
          "Each call carries a lower and upper bound, initially unbounded. Every node must satisfy low < node.val < high; recurse left with high = node.val and right with low = node.val, so a node is checked against all its ancestors, not just its parent.",
        keyPoints: [
          {
            label: "Carry a lower and an upper bound",
            anyOf: ["lower and upper bound", "low and high", "min and max bound", "upper and lower bound", "a valid range"],
          },
          {
            label: "Tighten the bound on each side",
            anyOf: ["low < node.val < high", "recurse left with high", "right with low", "tighten", "strictly between"],
          },
          {
            label: "Checked against all ancestors, not just the parent",
            anyOf: ["all its ancestors", "not just its parent", "every ancestor", "not only the parent", "whole subtree"],
          },
        ],
        hint: "A node deep in the right subtree must still be greater than the root. What information has to travel down to check that?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: root = [5,4,6,null,null,3,7]. Every node is correct relative to its parent. Why is this still not a valid BST? Reply in 1-2 sentences.",
        answerKey:
          "The 3 is the left child of 6, which is fine locally, but it sits in 5's right subtree, where every value must be greater than 5. Checking only parent-child pairs misses this; the 3 violates the lower bound 5 inherited from the root.",
        keyPoints: [
          { label: "3 sits in 5's right subtree", anyOf: ["right subtree", "5's right", "under 6", "3 sits"] },
          {
            label: "It must be greater than 5 (an inherited bound)",
            anyOf: ["greater than 5", "lower bound 5", "bound 5", "inherited", "bigger than 5"],
          },
        ],
        hint: "Which subtree of the root does the 3 live in, and what does that require?",
      },
      code: {
        functionName: "isValidBSTFromValues",
        params: ["values"],
        signature: { params: ["int?[]"], returns: "bool" },
        starter: browserPart(validBstStarters),
        nativeStarters: nativePart(validBstStarters),
        reference: browserPart(treeSources(VALID_BST_REF, VALID_BST)),
        tests: [
          { args: [[2, 1, 3]], expected: true },
          { args: [[5, 1, 4, null, null, 3, 6]], expected: false },
          { args: [[5, 4, 6, null, null, 3, 7]], expected: false },
          { args: [[1]], expected: true },
          { args: [[2, 2, 2]], expected: false },
          { args: [[3, 1, 5, 0, 2, 4, 6]], expected: true, hidden: true },
          { args: [[10, 5, 15, null, null, 6, 20]], expected: false, hidden: true },
          { args: [[2147483647]], expected: true, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bst"],
    relatedCardIds: ["mc-validate-bst-bounds", "mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- linked list
  {
    id: "p-reverse-linked-list",
    title: "Reverse Linked List",
    leetcodeSlug: "reverse-linked-list",
    difficulty: "easy",
    tags: ["linked_list"],
    statement: `Given the \`head\` of a singly linked list, reverse the list and return the new head.

**Judge note:** The judge passes the list as an array. The starter's adapter builds real \`ListNode\`s, calls your \`reverseList(head)\`, and converts the result back.`,
    examples: [
      { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" },
      { input: "head = [1,2]", output: "[2,1]" },
      { input: "head = []", output: "[]" },
    ],
    constraints: ["The number of nodes in the list is in the range [0, 5000].", "-5000 <= Node.val <= 5000"],
    stages: {
      invariant: {
        prompt:
          "🔁 Reverse Linked List iteratively: which pointers do you keep, and in what order do you update them inside the loop? Reply in 1-2 sentences.",
        answerKey:
          "Keep prev, starting at null, and curr. In the loop save next = curr.next first, then point curr.next back to prev, then move prev = curr and curr = next; when curr is null, prev is the new head.",
        keyPoints: [
          { label: "Track prev and curr", anyOf: ["prev and curr", "previous and current", "prev starts", "prev = null", "prev pointer"] },
          { label: "Save next before rewiring", anyOf: ["save next", "next = curr.next", "store next", "keep next", "remember next"] },
          { label: "prev is the new head", anyOf: ["prev is the new head", "return prev", "new head"] },
        ],
        hint: "Once you point a node backwards, how do you still reach the node that used to follow it?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: what breaks if you set curr.next = prev before saving curr.next, and what do you return for an empty list? Reply in 1-2 sentences.",
        answerKey:
          "Overwriting curr.next first loses the only reference to the rest of the list, so you can't advance and the remaining nodes are dropped. For an empty list the loop never runs and prev is still null, so returning prev correctly gives an empty list.",
        keyPoints: [
          {
            label: "You lose the rest of the list",
            anyOf: ["rest of the list", "loses the only reference", "lose the reference", "lose track", "can't advance", "nodes are dropped"],
          },
          {
            label: "Empty list: prev is still null",
            anyOf: ["prev is still null", "return null", "returns null", "empty list", "never runs"],
          },
        ],
        hint: "After curr.next = prev, where does curr.next point, and where did the rest of the list go?",
      },
      code: {
        functionName: "reverseListValues",
        params: ["values"],
        signature: { params: ["int[]"], returns: "int[]" },
        starter: browserPart(reverseListStarters),
        nativeStarters: nativePart(reverseListStarters),
        reference: browserPart(listSources(REVERSE_LIST_REF, REVERSE_LIST)),
        tests: [
          { args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
          { args: [[1, 2]], expected: [2, 1] },
          { args: [[]], expected: [] },
          { args: [[1]], expected: [1] },
          { args: [[3, 3, 1]], expected: [1, 3, 3] },
          { args: [[10, 20, 30, 40]], expected: [40, 30, 20, 10], hidden: true },
          { args: [[0, -1]], expected: [-1, 0], hidden: true },
          { args: [[7, 8, 9]], expected: [9, 8, 7], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["linked_list"],
    relatedCardIds: ["mc-reverse-linked-list"],
  },
];
