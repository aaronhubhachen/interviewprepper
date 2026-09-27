import { LEVEL_ORDER_STARTERS, REMOVE_NTH_STARTERS, TRIE_STARTERS } from "./native-adapters";
import type { Problem } from "./types";

/**
 * Core-topic problems for the home roadmap (arrays, stack, linked list, trees, trie).
 * The judge passes JSON only, so node-based problems ship a small adapter in the
 * starter that builds real ListNode / TreeNode / Trie objects from arrays.
 */
export const PROBLEMS_B: Problem[] = [
  // ---------------------------------------------------------------- arrays
  {
    id: "p-product-of-array-except-self",
    title: "Product of Array Except Self",
    leetcodeSlug: "product-of-array-except-self",
    difficulty: "medium",
    tags: ["arrays", "prefix_sum"],
    statement: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

The product of any prefix or suffix of \`nums\` is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in **O(n)** time and **without using the division operation**.`,
    examples: [
      { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
      { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" },
    ],
    constraints: ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30", "Every prefix and suffix product fits in a 32-bit integer."],
    stages: {
      invariant: {
        prompt:
          "✖️ Product of Array Except Self in O(n) without division: what does answer[i] equal in terms of the elements before and after i, and how do you build it in two passes? Reply in 1-2 sentences.",
        answerKey:
          "answer[i] is the product of everything left of i times the product of everything right of i. One pass left to right writes the running prefix product into answer, and a second pass right to left multiplies in a running suffix product, so O(n) time and O(1) extra space.",
        keyPoints: [
          {
            label: "Left (prefix) product times right (suffix) product",
            anyOf: [
              "prefix product",
              "product of everything left",
              "left product",
              "product to the left",
              "prefix and suffix",
              "prefix times suffix",
              "left times right",
            ],
          },
          {
            label: "Two passes: left to right, then right to left",
            anyOf: ["two passes", "second pass", "right to left", "backward pass", "reverse pass", "both directions", "suffix product"],
          },
        ],
        hint: "Split everything except nums[i] into two groups by position. Can you precompute each group for every i?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: why is 'multiply everything, then divide by nums[i]' wrong here, even ignoring the no-division rule? Give an input where it breaks. Reply in 1-2 sentences.",
        answerKey:
          "Zeros break division: the total product becomes 0, and the zero's own slot needs the product of the rest, which you cannot recover by dividing by 0. For nums = [1,2,0,4] the answer is [0,0,8,0]; prefix and suffix products handle zeros with no special cases.",
        keyPoints: [
          {
            label: "A zero makes division impossible",
            anyOf: ["zero", "zeros", "divide by 0", "divide by zero", "division by zero"],
          },
          {
            label: "The zero's slot needs the product of the others",
            anyOf: ["product of the rest", "product of the others", "product of the other", "own slot", "every other element", "all the others"],
          },
        ],
        hint: "Try an array that contains a 0. What should the zero's own position hold?",
      },
      code: {
        functionName: "productExceptSelf",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int[]" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number[]}
 */
function productExceptSelf(nums) {
  // Your code here
  return [];
}
`,
          python: `def productExceptSelf(nums: List[int]) -> List[int]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function productExceptSelf(nums) {
  const answer = new Array(nums.length).fill(1);
  let prefix = 1;
  for (let i = 0; i < nums.length; i++) {
    answer[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  return answer.map((value) => value + 0);
}
`,
          python: `from typing import List


def productExceptSelf(nums: List[int]) -> List[int]:
    answer = [1] * len(nums)
    prefix = 1
    for i, value in enumerate(nums):
        answer[i] = prefix
        prefix *= value
    suffix = 1
    for i in range(len(nums) - 1, -1, -1):
        answer[i] *= suffix
        suffix *= nums[i]
    return answer
`,
        },
        tests: [
          { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
          { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
          { args: [[2, 3]], expected: [3, 2] },
          { args: [[1, 2, 0, 4]], expected: [0, 0, 8, 0] },
          { args: [[5, 1, 1, 1]], expected: [1, 5, 5, 5] },
          { args: [[0, 0]], expected: [0, 0], hidden: true },
          { args: [[-2, -3, 4]], expected: [-12, -8, 6], hidden: true },
          { args: [[3, 0, 2, 0]], expected: [0, 0, 0, 0], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["arrays", "prefix_sum"],
    relatedCardIds: ["mc-product-except-self", "mc-range-sum-prefix"],
  },

  // ---------------------------------------------------------------- stack
  {
    id: "p-valid-parentheses",
    title: "Valid Parentheses",
    leetcodeSlug: "valid-parentheses",
    difficulty: "easy",
    tags: ["stack", "string"],
    statement: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

A string is valid if:

- Open brackets are closed by the same type of bracket.
- Open brackets are closed in the correct order.
- Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
      { input: 's = "([])"', output: "true" },
    ],
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    stages: {
      invariant: {
        prompt:
          "🧱 Valid Parentheses: what does your stack hold at every moment, and what must happen when you read a closing bracket? Reply in 1-2 sentences.",
        answerKey:
          "The stack holds the opening brackets that are still unmatched, most recent on top. On a closing bracket the top must be the matching opener, so pop it; if the stack is empty or the top does not match, the string is invalid.",
        keyPoints: [
          {
            label: "The stack holds unmatched openers",
            anyOf: ["unmatched", "still open", "opening bracket", "open bracket", "openers", "opening"],
          },
          {
            label: "A closer must match the top, then pop",
            anyOf: ["top must", "match the top", "matching opener", "matches the top", "pop", "compare with the top", "top of the stack"],
          },
        ],
        hint: "The most recently opened bracket must be the first one closed. Which data structure gives you the most recent item?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: your loop finishes without ever seeing a mismatch. Why is that not enough to return true? Give an input that fools it. Reply in 1-2 sentences.",
        answerKey:
          "Openers can be left over at the end, like s = '((' or '({', which never trigger a mismatch. Return true only if the stack is empty after the loop.",
        keyPoints: [
          {
            label: "Openers can be left over",
            anyOf: ["left over", "leftover", "unmatched at the end", "still on the stack", "remain", "never closed", "left unmatched"],
          },
          {
            label: "Return true only if the stack is empty",
            anyOf: ["stack is empty", "empty stack", "stack empty", "nothing left on the stack", "check empty", "is empty"],
          },
        ],
        hint: "What if the string only opens brackets and never closes any?",
      },
      code: {
        functionName: "isValid",
        params: ["s"],
        signature: { params: ["string"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Your code here
  return false;
}
`,
          python: `def isValid(s: str) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}
`,
          python: `def isValid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
`,
        },
        tests: [
          { args: ["()"], expected: true },
          { args: ["()[]{}"], expected: true },
          { args: ["(]"], expected: false },
          { args: ["([])"], expected: true },
          { args: ["){"], expected: false },
          { args: ["(("], expected: false, hidden: true },
          { args: ["([)]"], expected: false, hidden: true },
          { args: ["{[]}"], expected: true, hidden: true },
          { args: ["]"], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["stack"],
    relatedCardIds: ["mc-min-stack"],
  },

  // ---------------------------------------------------------------- linked list
  {
    id: "p-remove-nth-node-from-end",
    title: "Remove Nth Node From End of List",
    leetcodeSlug: "remove-nth-node-from-end-of-list",
    difficulty: "medium",
    tags: ["linked_list", "two_pointers"],
    statement: `Given the \`head\` of a linked list, remove the \`n\`th node from the end of the list and return its head.

Can you do it in one pass?

**Judge note:** The judge passes the list as an array. The starter's \`removeNth\` adapter builds real \`ListNode\`s, calls your \`removeNthFromEnd(head, n)\`, and converts the result back, so write the node logic there.`,
    examples: [
      { input: "head = [1,2,3,4,5], n = 2", output: "[1,2,3,5]" },
      { input: "head = [1], n = 1", output: "[]" },
      { input: "head = [1,2], n = 1", output: "[1]" },
    ],
    constraints: ["The number of nodes in the list is sz.", "1 <= sz <= 30", "0 <= Node.val <= 100", "1 <= n <= sz"],
    stages: {
      invariant: {
        prompt:
          "🔗 Remove Nth Node From End in one pass: how far apart do your two pointers stay, and where is the slow one when the fast one reaches the end? Reply in 1-2 sentences.",
        answerKey:
          "Move the fast pointer n steps ahead first, so the pointers stay exactly n nodes apart. Starting both from a dummy node before head, when fast reaches the last node slow sits just before the node to delete, so set slow.next = slow.next.next.",
        keyPoints: [
          {
            label: "Fast leads by n nodes",
            anyOf: ["n steps ahead", "n nodes apart", "n apart", "gap of n", "n ahead", "advance fast n", "move fast n", "n + 1 steps"],
          },
          {
            label: "Slow ends just before the node to delete",
            anyOf: ["just before", "node before", "previous node", "before the node", "predecessor", "slow.next = slow.next.next", "unlink"],
          },
        ],
        hint: "If one pointer starts n nodes ahead and both move together, where is the trailing one when the leader runs out of list?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: head = [1,2], n = 2. Why do you want a dummy node before head, and what goes wrong without one? Reply in 1-2 sentences.",
        answerKey:
          "Here the node to remove is the head itself, which has no previous node for slow to stop on. A dummy node pointing at head gives every node, including the head, a predecessor, and you return dummy.next instead of head.",
        keyPoints: [
          {
            label: "The node to remove is the head",
            anyOf: ["remove the head", "removing the head", "head itself", "first node", "delete the head"],
          },
          {
            label: "The head has no predecessor",
            anyOf: ["no previous", "no predecessor", "nothing before", "no node before", "predecessor"],
          },
          {
            label: "Return dummy.next",
            anyOf: ["dummy.next", "return dummy", "dummy next", "sentinel"],
          },
        ],
        hint: "When n equals the list length, which node gets deleted, and what node points to it?",
      },
      code: {
        functionName: "removeNth",
        params: ["values", "n"],
        signature: { params: ["int[]", "int"], returns: "int[]" },
        nativeStarters: REMOVE_NTH_STARTERS,
        starter: {
          javascript: `class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

/**
 * @param {ListNode} head
 * @param {number} n
 * @return {ListNode | null}
 */
function removeNthFromEnd(head, n) {
  // Your code here
  return head;
}

// Judge adapter: arrays in and out. No need to edit below.
function removeNth(values, n) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  const out = [];
  for (let node = removeNthFromEnd(head, n); node; node = node.next) out.push(node.val);
  return out;
}
`,
          python: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def removeNthFromEnd(head: Optional[ListNode], n: int) -> Optional[ListNode]:
    # Your code here
    return head


# Judge adapter: lists in and out. No need to edit below.
def removeNth(values: List[int], n: int) -> List[int]:
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    out = []
    node = removeNthFromEnd(head, n)
    while node:
        out.append(node.val)
        node = node.next
    return out
`,
        },
        reference: {
          javascript: `class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy;
  let slow = dummy;
  for (let i = 0; i < n; i++) fast = fast.next;
  while (fast.next) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;
  return dummy.next;
}

function removeNth(values, n) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  const out = [];
  for (let node = removeNthFromEnd(head, n); node; node = node.next) out.push(node.val);
  return out;
}
`,
          python: `from typing import List, Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def removeNthFromEnd(head: Optional[ListNode], n: int) -> Optional[ListNode]:
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next


def removeNth(values: List[int], n: int) -> List[int]:
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    out = []
    node = removeNthFromEnd(head, n)
    while node:
        out.append(node.val)
        node = node.next
    return out
`,
        },
        tests: [
          { args: [[1, 2, 3, 4, 5], 2], expected: [1, 2, 3, 5] },
          { args: [[1], 1], expected: [] },
          { args: [[1, 2], 1], expected: [1] },
          { args: [[1, 2], 2], expected: [2] },
          { args: [[1, 2, 3], 3], expected: [2, 3] },
          { args: [[1, 2, 3], 1], expected: [1, 2], hidden: true },
          { args: [[10, 20, 30, 40], 2], expected: [10, 20, 40], hidden: true },
          { args: [[7, 7, 7, 7, 7], 5], expected: [7, 7, 7, 7], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["linked_list", "two_pointers"],
    relatedCardIds: ["mc-dummy-head-remove-nth", "mc-reverse-linked-list"],
  },

  // ---------------------------------------------------------------- trees
  {
    id: "p-binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    leetcodeSlug: "binary-tree-level-order-traversal",
    difficulty: "medium",
    tags: ["tree_traversal", "bfs"],
    statement: `Given the \`root\` of a binary tree, return the **level order traversal** of its nodes' values (i.e., from left to right, level by level).

**Judge note:** The judge passes the tree as a LeetCode-style level-order array (\`null\` for missing children). The starter's \`levelOrderFromValues\` adapter builds real \`TreeNode\`s and calls your \`levelOrder(root)\`.`,
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
      { input: "root = [1]", output: "[[1]]" },
      { input: "root = []", output: "[]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 2000].", "-1000 <= Node.val <= 1000"],
    stages: {
      invariant: {
        prompt:
          "🌳 Level Order Traversal: what does your queue contain at the start of each loop iteration, and how do you know where one level ends? Reply in 1-2 sentences.",
        answerKey:
          "At the start of each iteration the queue holds exactly the nodes of one level, left to right. Record the queue size first, pop that many nodes into the current level list while pushing their children, and those children form the next level.",
        keyPoints: [
          {
            label: "The queue holds exactly one level",
            anyOf: ["one level", "exactly the nodes", "current level", "whole level", "a single level", "one full level"],
          },
          {
            label: "Snapshot the queue size first",
            anyOf: ["queue size", "size first", "record the size", "len(queue)", "queue.length", "level size", "count first", "snapshot"],
          },
        ],
        hint: "Breadth-first search already visits nodes level by level. What number tells you how many of the queued nodes belong to the current level?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: why must you save the queue's length before the inner loop instead of looping while the queue is non-empty or re-reading its length? Reply in 1-2 sentences.",
        answerKey:
          "Children are pushed onto the queue during the inner loop, so draining it or re-reading its length mixes the next level's nodes into the current level. Freezing the count first keeps the levels separate; also return an empty list for an empty tree instead of queuing null.",
        keyPoints: [
          {
            label: "Children are added during the inner loop",
            anyOf: ["children are pushed", "children are added", "pushing children", "push children", "queue grows", "adds children"],
          },
          {
            label: "Levels get mixed together",
            anyOf: ["mixes", "mix", "next level", "merged levels", "wrong level", "levels blur"],
          },
        ],
        hint: "Watch the queue while you process one level: what gets added to it before you finish?",
      },
      code: {
        functionName: "levelOrderFromValues",
        params: ["values"],
        signature: { params: ["int?[]"], returns: "list<list<int>>" },
        nativeStarters: LEVEL_ORDER_STARTERS,
        starter: {
          javascript: `class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

/**
 * @param {TreeNode | null} root
 * @return {number[][]}
 */
function levelOrder(root) {
  // Your code here
  return [];
}

// Judge adapter: builds the tree from a level-order array. No need to edit below.
function levelOrderFromValues(values) {
  if (values.length === 0 || values[0] === null) return levelOrder(null);
  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;
  for (let head = 0; head < queue.length && i < values.length; head++) {
    const node = queue[head];
    if (i < values.length && values[i] !== null) queue.push((node.left = new TreeNode(values[i])));
    i++;
    if (i < values.length && values[i] !== null) queue.push((node.right = new TreeNode(values[i])));
    i++;
  }
  return levelOrder(root);
}
`,
          python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def levelOrder(root: Optional[TreeNode]) -> List[List[int]]:
    # Your code here
    return []


# Judge adapter: builds the tree from a level-order list. No need to edit below.
def levelOrderFromValues(values: List[Optional[int]]) -> List[List[int]]:
    if not values or values[0] is None:
        return levelOrder(None)
    root = TreeNode(values[0])
    queue = [root]
    i = 1
    head = 0
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return levelOrder(root)
`,
        },
        reference: {
          javascript: `class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function levelOrder(root) {
  if (!root) return [];
  const levels = [];
  const queue = [root];
  let head = 0;
  while (head < queue.length) {
    const size = queue.length - head;
    const level = [];
    for (let k = 0; k < size; k++) {
      const node = queue[head++];
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}

function levelOrderFromValues(values) {
  if (values.length === 0 || values[0] === null) return levelOrder(null);
  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;
  for (let head = 0; head < queue.length && i < values.length; head++) {
    const node = queue[head];
    if (i < values.length && values[i] !== null) queue.push((node.left = new TreeNode(values[i])));
    i++;
    if (i < values.length && values[i] !== null) queue.push((node.right = new TreeNode(values[i])));
    i++;
  }
  return levelOrder(root);
}
`,
          python: `from collections import deque
from typing import List, Optional


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def levelOrder(root: Optional[TreeNode]) -> List[List[int]]:
    if root is None:
        return []
    levels = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels


def levelOrderFromValues(values: List[Optional[int]]) -> List[List[int]]:
    if not values or values[0] is None:
        return levelOrder(None)
    root = TreeNode(values[0])
    queue = [root]
    i = 1
    head = 0
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return levelOrder(root)
`,
        },
        tests: [
          { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
          { args: [[1]], expected: [[1]] },
          { args: [[]], expected: [] },
          { args: [[1, 2, 3, 4, 5, 6, 7]], expected: [[1], [2, 3], [4, 5, 6, 7]] },
          { args: [[1, 2, null, 3, null, 4]], expected: [[1], [2], [3], [4]] },
          { args: [[1, null, 2, null, 3]], expected: [[1], [2], [3]], hidden: true },
          { args: [[0, -1, 1]], expected: [[0], [-1, 1]], hidden: true },
          { args: [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1]], expected: [[5], [4, 8], [11, 13, 4], [7, 2, 5, 1]], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal", "bfs"],
    relatedCardIds: ["mc-tree-dfs-orders", "mc-bfs-unweighted-shortest-path"],
  },

  // ---------------------------------------------------------------- trie
  {
    id: "p-implement-trie",
    title: "Implement Trie (Prefix Tree)",
    leetcodeSlug: "implement-trie-prefix-tree",
    difficulty: "medium",
    tags: ["trie", "design", "string"],
    statement: `A **trie** (prefix tree) stores strings so that insertion and prefix lookups take time proportional to the word length. Implement the \`Trie\` class:

- \`insert(word)\` inserts the string \`word\` into the trie.
- \`search(word)\` returns \`true\` if \`word\` was inserted before, and \`false\` otherwise.
- \`startsWith(prefix)\` returns \`true\` if some previously inserted word has the prefix \`prefix\`, and \`false\` otherwise.

**Judge note:** The judge replays a list of operations on one \`Trie\` through the starter's \`runTrie\` adapter. \`insert\` records \`null\`.`,
    examples: [
      {
        input: 'operations = ["insert","search","search","startsWith","insert","search"], words = ["apple","apple","app","app","app","app"]',
        output: "[null,true,false,true,null,true]",
      },
    ],
    constraints: [
      "1 <= word.length, prefix.length <= 2000",
      "word and prefix consist only of lowercase English letters.",
      "At most 3 * 10^4 calls in total will be made to insert, search, and startsWith.",
    ],
    stages: {
      invariant: {
        prompt:
          "🌲 Implement Trie: what does each node store, and what is the one difference between search(word) and startsWith(prefix) once you have walked the characters? Reply in 1-2 sentences.",
        answerKey:
          "Each node stores a map from character to child node plus an end-of-word flag. Both methods walk one child per character and fail if a child is missing; startsWith succeeds as soon as the walk finishes, while search also requires the final node's end-of-word flag.",
        keyPoints: [
          {
            label: "Children by character plus an end-of-word flag",
            anyOf: ["end-of-word", "end of word", "is_end", "isend", "is_word", "isword", "word flag", "terminal flag", "marks the end"],
          },
          {
            label: "Walk one child per character",
            anyOf: ["one child per character", "child per character", "walk the characters", "follow the children", "character by character", "each character"],
          },
          {
            label: "search also checks the flag at the last node",
            anyOf: ["search also requires", "also requires", "checks the flag", "flag at the end", "final node", "last node", "only search checks"],
          },
        ],
        hint: "Words that share a prefix share a path. How do you tell a complete stored word from a path that just passes through?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: insert('apple'), then search('app'). What should it return, and what bug makes it return true? Reply in 1-2 sentences.",
        answerKey:
          "It must return false, because 'app' is only a prefix of an inserted word; the bug is returning true whenever the walk succeeds without checking the end-of-word flag, which is exactly startsWith. After insert('app'), search('app') becomes true.",
        keyPoints: [
          {
            label: "False: 'app' is only a prefix",
            anyOf: ["false", "only a prefix", "just a prefix", "prefix of"],
          },
          {
            label: "The bug skips the end-of-word check",
            anyOf: ["end-of-word flag", "end flag", "without checking", "ignores the flag", "not checking", "forgets the flag"],
          },
        ],
        hint: "Walking a-p-p succeeds. What extra fact about that last node distinguishes a stored word from a prefix?",
      },
      code: {
        functionName: "runTrie",
        params: ["operations", "words"],
        signature: { params: ["string[]", "string[]"], returns: "list<bool?>" },
        nativeStarters: TRIE_STARTERS,
        starter: {
          javascript: `class Trie {
  constructor() {
    // Your code here
  }

  /** @param {string} word */
  insert(word) {}

  /**
   * @param {string} word
   * @return {boolean}
   */
  search(word) {
    return false;
  }

  /**
   * @param {string} prefix
   * @return {boolean}
   */
  startsWith(prefix) {
    return false;
  }
}

// Judge adapter: replays the operations on one Trie. No need to edit below.
function runTrie(operations, words) {
  const trie = new Trie();
  return operations.map((op, i) => {
    const result = trie[op](words[i]);
    return result === undefined ? null : result;
  });
}
`,
          python: `class Trie:
    def __init__(self):
        # Your code here
        pass

    def insert(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        return False

    def startsWith(self, prefix: str) -> bool:
        return False


# Judge adapter: replays the operations on one Trie. No need to edit below.
def runTrie(operations: List[str], words: List[str]) -> List[Optional[bool]]:
    trie = Trie()
    return [getattr(trie, op)(word) for op, word in zip(operations, words)]
`,
        },
        reference: {
          javascript: `class Trie {
  constructor() {
    this.root = { children: new Map(), end: false };
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), end: false });
      node = node.children.get(ch);
    }
    node.end = true;
  }

  walk(text) {
    let node = this.root;
    for (const ch of text) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }

  search(word) {
    const node = this.walk(word);
    return node !== null && node.end;
  }

  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }
}

function runTrie(operations, words) {
  const trie = new Trie();
  return operations.map((op, i) => {
    const result = trie[op](words[i]);
    return result === undefined ? null : result;
  });
}
`,
          python: `from typing import List, Optional


class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True

    def _walk(self, text: str):
        node = self.root
        for ch in text:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and "$" in node

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None


def runTrie(operations: List[str], words: List[str]) -> List[Optional[bool]]:
    trie = Trie()
    return [getattr(trie, op)(word) for op, word in zip(operations, words)]
`,
        },
        tests: [
          {
            args: [
              ["insert", "search", "search", "startsWith", "insert", "search"],
              ["apple", "apple", "app", "app", "app", "app"],
            ],
            expected: [null, true, false, true, null, true],
          },
          { args: [["search", "startsWith"], ["a", "a"]], expected: [false, false] },
          {
            args: [
              ["insert", "insert", "search", "search", "startsWith", "startsWith"],
              ["cat", "car", "ca", "car", "ca", "cab"],
            ],
            expected: [null, null, false, true, true, false],
          },
          { args: [["insert", "startsWith", "search"], ["a", "a", "a"]], expected: [null, true, true] },
          {
            args: [["insert", "insert", "search", "search", "search"], ["abc", "ab", "ab", "abc", "abcd"]],
            expected: [null, null, true, true, false],
          },
          {
            args: [["insert", "search", "startsWith", "startsWith"], ["hello", "hell", "hell", "helloo"]],
            expected: [null, false, true, false],
            hidden: true,
          },
          {
            args: [["insert", "insert", "startsWith", "search"], ["dog", "do", "d", "do"]],
            expected: [null, null, true, true],
            hidden: true,
          },
        ],
        compare: "exact",
      },
    },
    weakTags: ["trie"],
    relatedCardIds: ["mc-trie-basics"],
  },
];
