import type { JudgeLanguage } from "./types";
import type { NativeLanguage } from "../judge/native";

/**
 * Starter/reference composers for node-based problems. The judge passes JSON, so each
 * file wraps the function the user implements in a marked adapter that builds real
 * nodes from a level-order array (trees) or a plain array (linked lists).
 */
export type AdapterLanguage = JudgeLanguage | NativeLanguage;

const MARK = "Judge adapter: builds the input from the test's array. No need to edit below.";

export interface AdapterSpec {
  /** Entry point the judge calls (takes JSON-friendly values). */
  wrapper: string;
  /** The function the user implements, called with the built root/head. */
  call: string;
  /** Return type of the wrapper per statically typed language. */
  returns: { java: string; cpp: string; go: string; typescript: string };
}

// ── Trees ──────────────────────────────────────────────────────────────────

export const TREE_NODE: Record<AdapterLanguage, string> = {
  javascript: `class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}`,
  python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`,
  java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}`,
  cpp: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};`,
  go: `type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}`,
  typescript: `class TreeNode {
  val: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(val = 0) {
    this.val = val;
  }
}`,
};

function treeAdapter(language: AdapterLanguage, spec: AdapterSpec): string {
  const { wrapper, call, returns } = spec;
  switch (language) {
    case "javascript":
      return `// ${MARK}
function ${wrapper}(values) {
  if (values.length === 0 || values[0] === null) return ${call}(null);
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
  return ${call}(root);
}`;
    case "python":
      return `# ${MARK}
def ${wrapper}(values: List[Optional[int]]):
    if not values or values[0] is None:
        return ${call}(None)
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
    return ${call}(root)`;
    case "java":
      return `    // ${MARK}
    public ${returns.java} ${wrapper}(Integer[] values) {
        if (values.length == 0 || values[0] == null) return ${call}(null);
        TreeNode root = new TreeNode(values[0]);
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return ${call}(root);
    }`;
    case "cpp":
      return `    // ${MARK}
    ${returns.cpp} ${wrapper}(vector<optional<int>>& values) {
        if (values.empty() || !values[0]) return ${call}(nullptr);
        TreeNode* root = new TreeNode(*values[0]);
        queue<TreeNode*> pending;
        pending.push(root);
        size_t i = 1;
        while (!pending.empty() && i < values.size()) {
            TreeNode* node = pending.front();
            pending.pop();
            if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); pending.push(node->left); }
            i++;
            if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); pending.push(node->right); }
            i++;
        }
        return ${call}(root);
    }`;
    case "go":
      return `// ${MARK}
func ${wrapper}(values []*int) ${returns.go} {
	if len(values) == 0 || values[0] == nil {
		return ${call}(nil)
	}
	root := &TreeNode{Val: *values[0]}
	queue := []*TreeNode{root}
	i := 1
	for len(queue) > 0 && i < len(values) {
		node := queue[0]
		queue = queue[1:]
		if i < len(values) && values[i] != nil {
			node.Left = &TreeNode{Val: *values[i]}
			queue = append(queue, node.Left)
		}
		i++
		if i < len(values) && values[i] != nil {
			node.Right = &TreeNode{Val: *values[i]}
			queue = append(queue, node.Right)
		}
		i++
	}
	return ${call}(root)
}`;
    case "typescript":
      return `// ${MARK}
function ${wrapper}(values: (number | null)[]): ${returns.typescript} {
  if (values.length === 0 || values[0] === null) return ${call}(null);
  const root = new TreeNode(values[0]);
  const queue: TreeNode[] = [root];
  let i = 1;
  for (let head = 0; head < queue.length && i < values.length; head++) {
    const node = queue[head];
    const left = values[i++];
    if (left !== null && left !== undefined) queue.push((node.left = new TreeNode(left)));
    const right = values[i++];
    if (right !== null && right !== undefined) queue.push((node.right = new TreeNode(right)));
  }
  return ${call}(root);
}`;
  }
}

// ── Linked lists ───────────────────────────────────────────────────────────

export const LIST_NODE: Record<AdapterLanguage, string> = {
  javascript: `class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}`,
  python: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next`,
  java: `class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}`,
  cpp: `struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x, ListNode* n = nullptr) : val(x), next(n) {}
};`,
  go: `type ListNode struct {
	Val  int
	Next *ListNode
}`,
  typescript: `class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}`,
};

/** List adapters take and return int arrays (the user's function maps head → head). */
function listAdapter(language: AdapterLanguage, spec: AdapterSpec): string {
  const { wrapper, call } = spec;
  switch (language) {
    case "javascript":
      return `// ${MARK}
function ${wrapper}(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  const out = [];
  for (let node = ${call}(head); node; node = node.next) out.push(node.val);
  return out;
}`;
    case "python":
      return `# ${MARK}
def ${wrapper}(values: List[int]) -> List[int]:
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    out = []
    node = ${call}(head)
    while node:
        out.append(node.val)
        node = node.next
    return out`;
    case "java":
      return `    // ${MARK}
    public int[] ${wrapper}(int[] values) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        List<Integer> out = new ArrayList<>();
        for (ListNode node = ${call}(head); node != null; node = node.next) out.add(node.val);
        return out.stream().mapToInt(Integer::intValue).toArray();
    }`;
    case "cpp":
      return `    // ${MARK}
    vector<int> ${wrapper}(vector<int>& values) {
        ListNode* head = nullptr;
        for (int i = (int)values.size() - 1; i >= 0; i--) head = new ListNode(values[i], head);
        vector<int> out;
        for (ListNode* node = ${call}(head); node; node = node->next) out.push_back(node->val);
        return out;
    }`;
    case "go":
      return `// ${MARK}
func ${wrapper}(values []int) []int {
	var head *ListNode
	for i := len(values) - 1; i >= 0; i-- {
		head = &ListNode{Val: values[i], Next: head}
	}
	out := []int{}
	for node := ${call}(head); node != nil; node = node.Next {
		out = append(out, node.Val)
	}
	return out
}`;
    case "typescript":
      return `// ${MARK}
function ${wrapper}(values: number[]): number[] {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  const out: number[] = [];
  for (let node = ${call}(head); node; node = node.next) out.push(node.val);
  return out;
}`;
  }
}

/**
 * Full source for one language. `user` is the function the candidate writes (starter stub
 * or reference). Java and C++ nest it and the adapter inside `class Solution`.
 */
function compose(kind: "tree" | "list", language: AdapterLanguage, user: string, spec: AdapterSpec): string {
  const node = (kind === "tree" ? TREE_NODE : LIST_NODE)[language];
  const adapter = kind === "tree" ? treeAdapter(language, spec) : listAdapter(language, spec);
  const python = language === "python" ? "from typing import List, Optional\n\n\n" : "";
  if (language === "java") return `${node}\n\nclass Solution {\n${user}\n\n${adapter}\n}\n`;
  if (language === "cpp") return `${node}\n\nclass Solution {\npublic:\n${user}\n\n${adapter}\n};\n`;
  const gap = language === "python" ? "\n\n\n" : "\n\n";
  return `${python}${node}${gap}${user}${gap}${adapter}\n`;
}

export type SourceSet = Record<AdapterLanguage, string>;

/** Starters (and, with bodies, references) for a tree problem in all six languages. */
export function treeSources(user: SourceSet, spec: AdapterSpec): SourceSet {
  return Object.fromEntries(
    (Object.keys(user) as AdapterLanguage[]).map((language) => [language, compose("tree", language, user[language], spec)]),
  ) as SourceSet;
}

export function listSources(user: SourceSet, spec: AdapterSpec): SourceSet {
  return Object.fromEntries(
    (Object.keys(user) as AdapterLanguage[]).map((language) => [language, compose("list", language, user[language], spec)]),
  ) as SourceSet;
}

export function browserPart(sources: SourceSet): Record<JudgeLanguage, string> {
  return { javascript: sources.javascript, python: sources.python };
}

export function nativePart(sources: SourceSet): Record<NativeLanguage, string> {
  return { java: sources.java, cpp: sources.cpp, go: sources.go, typescript: sources.typescript };
}
