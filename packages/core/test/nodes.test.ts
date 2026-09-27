import { beforeAll, describe, expect, it } from "vitest";
import type { SourceSet } from "../src/content/adapters";
import { nodeSignature, nodeSources, type NodeSpec } from "../src/content/nodes";
import type { CodeStage } from "../src/content/types";
import { judgeResults, runJsTests, testArgsJson, type NativeLanguage } from "../src/judge";
import { nativeToolchains, runNativeTests } from "../src/judge/native-runner";
import { loadPythonRunner, type PythonRunner } from "./support/pyodide";

/** Exercises every node-adapter shape in all six languages with tiny reference solutions. */
const TIMEOUT = 120_000;

interface Case {
  spec: NodeSpec;
  user: SourceSet;
  tests: CodeStage["tests"];
}

const CASES: Record<string, Case> = {
  "two trees in, bool out": {
    spec: { wrapper: "isSameTreeValues", call: "isSameTree", params: [{ kind: "tree", name: "p" }, { kind: "tree", name: "q" }], returns: { kind: "value", type: "bool" } },
    user: {
      javascript: `function isSameTree(p, q) {
  if (!p || !q) return p === q;
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
      python: `def isSameTree(p, q):
    if not p or not q:
        return p is q
    return p.val == q.val and isSameTree(p.left, q.left) and isSameTree(p.right, q.right)`,
      java: `    public boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null || q == null) return p == q;
        return p.val == q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    }`,
      cpp: `    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (!p || !q) return p == q;
        return p->val == q->val && isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
    }`,
      go: `func isSameTree(p *TreeNode, q *TreeNode) bool {
	if p == nil || q == nil {
		return p == q
	}
	return p.Val == q.Val && isSameTree(p.Left, q.Left) && isSameTree(p.Right, q.Right)
}`,
      typescript: `function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  if (!p || !q) return p === q;
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
    },
    tests: [
      { args: [[1, 2, 3], [1, 2, 3]], expected: true },
      { args: [[1, 2], [1, null, 2]], expected: false },
      { args: [[], []], expected: true },
    ],
  },
  "tree in, tree out": {
    spec: { wrapper: "invertTreeValues", call: "invertTree", params: [{ kind: "tree", name: "root" }], returns: { kind: "tree" } },
    user: {
      javascript: `function invertTree(root) {
  if (root) [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}`,
      python: `def invertTree(root):
    if root:
        root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root`,
      java: `    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode left = invertTree(root.left);
        root.left = invertTree(root.right);
        root.right = left;
        return root;
    }`,
      cpp: `    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        TreeNode* left = invertTree(root->left);
        root->left = invertTree(root->right);
        root->right = left;
        return root;
    }`,
      go: `func invertTree(root *TreeNode) *TreeNode {
	if root != nil {
		root.Left, root.Right = invertTree(root.Right), invertTree(root.Left)
	}
	return root
}`,
      typescript: `function invertTree(root: TreeNode | null): TreeNode | null {
  if (root) [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}`,
    },
    tests: [
      { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
      { args: [[1, 2]], expected: [1, null, 2] },
      { args: [[]], expected: [] },
    ],
  },
  "tree and value in (kth smallest)": {
    spec: { wrapper: "kthSmallestValues", call: "kthSmallest", params: [{ kind: "tree", name: "root" }, { kind: "value", name: "k", type: "int" }], returns: { kind: "value", type: "int" } },
    user: {
      javascript: `function kthSmallest(root, k) {
  const out = [];
  const walk = (n) => { if (n) { walk(n.left); out.push(n.val); walk(n.right); } };
  walk(root);
  return out[k - 1];
}`,
      python: `def kthSmallest(root, k):
    out = []
    def walk(n):
        if n:
            walk(n.left); out.append(n.val); walk(n.right)
    walk(root)
    return out[k - 1]`,
      java: `    List<Integer> seen = new ArrayList<>();
    void walk(TreeNode n) { if (n != null) { walk(n.left); seen.add(n.val); walk(n.right); } }
    public int kthSmallest(TreeNode root, int k) {
        walk(root);
        return seen.get(k - 1);
    }`,
      cpp: `    vector<int> seen;
    void walk(TreeNode* n) { if (n) { walk(n->left); seen.push_back(n->val); walk(n->right); } }
    int kthSmallest(TreeNode* root, int k) {
        walk(root);
        return seen[k - 1];
    }`,
      go: `func kthSmallest(root *TreeNode, k int) int {
	out := []int{}
	var walk func(*TreeNode)
	walk = func(n *TreeNode) {
		if n != nil {
			walk(n.Left)
			out = append(out, n.Val)
			walk(n.Right)
		}
	}
	walk(root)
	return out[k-1]
}`,
      typescript: `function kthSmallest(root: TreeNode | null, k: number): number {
  const out: number[] = [];
  const walk = (n: TreeNode | null): void => { if (n) { walk(n.left); out.push(n.val); walk(n.right); } };
  walk(root);
  return out[k - 1];
}`,
    },
    tests: [
      { args: [[3, 1, 4, null, 2], 1], expected: 1 },
      { args: [[5, 3, 6, 2, 4, null, null, 1], 3], expected: 3 },
    ],
  },
  "two lists in, list out": {
    spec: { wrapper: "mergeTwoListsValues", call: "mergeTwoLists", params: [{ kind: "list", name: "list1" }, { kind: "list", name: "list2" }], returns: { kind: "list" } },
    user: {
      javascript: `function mergeTwoLists(a, b) {
  if (!a || !b) return a || b;
  if (a.val <= b.val) { a.next = mergeTwoLists(a.next, b); return a; }
  b.next = mergeTwoLists(a, b.next);
  return b;
}`,
      python: `def mergeTwoLists(a, b):
    if not a or not b:
        return a or b
    if a.val <= b.val:
        a.next = mergeTwoLists(a.next, b)
        return a
    b.next = mergeTwoLists(a, b.next)
    return b`,
      java: `    public ListNode mergeTwoLists(ListNode a, ListNode b) {
        if (a == null) return b;
        if (b == null) return a;
        if (a.val <= b.val) { a.next = mergeTwoLists(a.next, b); return a; }
        b.next = mergeTwoLists(a, b.next);
        return b;
    }`,
      cpp: `    ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
        if (!a) return b;
        if (!b) return a;
        if (a->val <= b->val) { a->next = mergeTwoLists(a->next, b); return a; }
        b->next = mergeTwoLists(a, b->next);
        return b;
    }`,
      go: `func mergeTwoLists(a *ListNode, b *ListNode) *ListNode {
	if a == nil {
		return b
	}
	if b == nil {
		return a
	}
	if a.Val <= b.Val {
		a.Next = mergeTwoLists(a.Next, b)
		return a
	}
	b.Next = mergeTwoLists(a, b.Next)
	return b
}`,
      typescript: `function mergeTwoLists(a: ListNode | null, b: ListNode | null): ListNode | null {
  if (!a || !b) return a || b;
  if (a.val <= b.val) { a.next = mergeTwoLists(a.next, b); return a; }
  b.next = mergeTwoLists(a, b.next);
  return b;
}`,
    },
    tests: [
      { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { args: [[], [0]], expected: [0] },
      { args: [[], []], expected: [] },
    ],
  },
  "lists in (merge k)": {
    spec: { wrapper: "mergeKListsValues", call: "mergeKLists", params: [{ kind: "lists", name: "lists" }], returns: { kind: "list" } },
    user: {
      javascript: `function mergeKLists(lists) {
  const vals = [];
  for (let n of lists) for (; n; n = n.next) vals.push(n.val);
  vals.sort((a, b) => a - b);
  let head = null;
  for (let i = vals.length - 1; i >= 0; i--) head = new ListNode(vals[i], head);
  return head;
}`,
      python: `def mergeKLists(lists):
    vals = []
    for n in lists:
        while n:
            vals.append(n.val)
            n = n.next
    head = None
    for v in sorted(vals, reverse=True):
        head = ListNode(v, head)
    return head`,
      java: `    public ListNode mergeKLists(ListNode[] lists) {
        List<Integer> vals = new ArrayList<>();
        for (ListNode n : lists) for (; n != null; n = n.next) vals.add(n.val);
        Collections.sort(vals);
        ListNode head = null;
        for (int i = vals.size() - 1; i >= 0; i--) head = new ListNode(vals.get(i), head);
        return head;
    }`,
      cpp: `    ListNode* mergeKLists(vector<ListNode*>& lists) {
        vector<int> vals;
        for (ListNode* n : lists) for (; n; n = n->next) vals.push_back(n->val);
        sort(vals.begin(), vals.end());
        ListNode* head = nullptr;
        for (int i = (int)vals.size() - 1; i >= 0; i--) head = new ListNode(vals[i], head);
        return head;
    }`,
      go: `func mergeKLists(lists []*ListNode) *ListNode {
	vals := []int{}
	for _, n := range lists {
		for ; n != nil; n = n.Next {
			vals = append(vals, n.Val)
		}
	}
	for i := 1; i < len(vals); i++ {
		for j := i; j > 0 && vals[j] < vals[j-1]; j-- {
			vals[j], vals[j-1] = vals[j-1], vals[j]
		}
	}
	var head *ListNode
	for i := len(vals) - 1; i >= 0; i-- {
		head = &ListNode{Val: vals[i], Next: head}
	}
	return head
}`,
      typescript: `function mergeKLists(lists: (ListNode | null)[]): ListNode | null {
  const vals: number[] = [];
  for (let n of lists) for (; n; n = n.next) vals.push(n.val);
  vals.sort((a, b) => a - b);
  let head: ListNode | null = null;
  for (let i = vals.length - 1; i >= 0; i--) head = new ListNode(vals[i], head);
  return head;
}`,
    },
    tests: [
      { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { args: [[]], expected: [] },
      { args: [[[]]], expected: [] },
    ],
  },
  "cycle in, bool out": {
    spec: { wrapper: "hasCycleValues", call: "hasCycle", params: [{ kind: "cycle", name: "head" }], returns: { kind: "value", type: "bool" } },
    user: {
      javascript: `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; if (slow === fast) return true; }
  return false;
}`,
      python: `def hasCycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False`,
      java: `    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; if (slow == fast) return true; }
        return false;
    }`,
      cpp: `    bool hasCycle(ListNode* head) {
        ListNode *slow = head, *fast = head;
        while (fast && fast->next) { slow = slow->next; fast = fast->next->next; if (slow == fast) return true; }
        return false;
    }`,
      go: `func hasCycle(head *ListNode) bool {
	slow, fast := head, head
	for fast != nil && fast.Next != nil {
		slow, fast = slow.Next, fast.Next.Next
		if slow == fast {
			return true
		}
	}
	return false
}`,
      typescript: `function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow!.next; fast = fast.next.next; if (slow === fast) return true; }
  return false;
}`,
    },
    tests: [
      { args: [[3, 2, 0, -4], 1], expected: true },
      { args: [[1], -1], expected: false },
      { args: [[], -1], expected: false },
    ],
  },
  "list edited in place": {
    spec: { wrapper: "reorderListValues", call: "reorderList", params: [{ kind: "list", name: "head" }], returns: { kind: "inPlace", param: 0 } },
    user: {
      javascript: `function reorderList(head) {
  const nodes = [];
  for (let n = head; n; n = n.next) nodes.push(n);
  let i = 0, j = nodes.length - 1;
  while (i < j) { nodes[i].next = nodes[j]; i++; if (i === j) break; nodes[j].next = nodes[i]; j--; }
  if (nodes.length) nodes[i].next = null;
}`,
      python: `def reorderList(head):
    nodes = []
    while head:
        nodes.append(head)
        head = head.next
    i, j = 0, len(nodes) - 1
    while i < j:
        nodes[i].next = nodes[j]
        i += 1
        if i == j:
            break
        nodes[j].next = nodes[i]
        j -= 1
    if nodes:
        nodes[i].next = None`,
      java: `    public void reorderList(ListNode head) {
        List<ListNode> nodes = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) nodes.add(n);
        int i = 0, j = nodes.size() - 1;
        while (i < j) { nodes.get(i).next = nodes.get(j); i++; if (i == j) break; nodes.get(j).next = nodes.get(i); j--; }
        if (!nodes.isEmpty()) nodes.get(i).next = null;
    }`,
      cpp: `    void reorderList(ListNode* head) {
        vector<ListNode*> nodes;
        for (ListNode* n = head; n; n = n->next) nodes.push_back(n);
        int i = 0, j = (int)nodes.size() - 1;
        while (i < j) { nodes[i]->next = nodes[j]; i++; if (i == j) break; nodes[j]->next = nodes[i]; j--; }
        if (!nodes.empty()) nodes[i]->next = nullptr;
    }`,
      go: `func reorderList(head *ListNode) {
	nodes := []*ListNode{}
	for n := head; n != nil; n = n.Next {
		nodes = append(nodes, n)
	}
	i, j := 0, len(nodes)-1
	for i < j {
		nodes[i].Next = nodes[j]
		i++
		if i == j {
			break
		}
		nodes[j].Next = nodes[i]
		j--
	}
	if len(nodes) > 0 {
		nodes[i].Next = nil
	}
}`,
      typescript: `function reorderList(head: ListNode | null): void {
  const nodes: ListNode[] = [];
  for (let n = head; n; n = n.next) nodes.push(n);
  let i = 0, j = nodes.length - 1;
  while (i < j) { nodes[i].next = nodes[j]; i++; if (i === j) break; nodes[j].next = nodes[i]; j--; }
  if (nodes.length) nodes[i].next = null;
}`,
    },
    tests: [
      { args: [[1, 2, 3, 4]], expected: [1, 4, 2, 3] },
      { args: [[1, 2, 3, 4, 5]], expected: [1, 5, 2, 4, 3] },
      { args: [[1]], expected: [1] },
    ],
  },
};

function stageFor({ spec, tests }: Case): Pick<CodeStage, "functionName" | "params" | "signature" | "tests" | "compare"> {
  return { functionName: spec.wrapper, ...nodeSignature(spec), tests, compare: "exact" };
}

let available: Record<NativeLanguage, boolean> = { java: false, cpp: false, go: false, typescript: false };
let python: PythonRunner | null = null;

beforeAll(async () => {
  [available, python] = await Promise.all([nativeToolchains(), loadPythonRunner()]);
}, TIMEOUT);

describe("node adapters", () => {
  it("derives the wrapper signature (a cycle adds a pos argument)", () => {
    expect(nodeSignature(CASES["cycle in, bool out"]!.spec)).toEqual({ params: ["head", "pos"], signature: { params: ["int[]", "int"], returns: "bool" } });
    expect(nodeSignature(CASES["tree in, tree out"]!.spec).signature).toEqual({ params: ["int?[]"], returns: "int?[]" });
    expect(nodeSignature(CASES["list edited in place"]!.spec).signature.returns).toBe("int[]");
  });

  for (const [name, testCase] of Object.entries(CASES)) {
    const sources = nodeSources(testCase.user, testCase.spec);
    const stage = stageFor(testCase);

    it(`${name}: JavaScript`, () => {
      const report = runJsTests(sources.javascript, stage);
      expect(report.cases.filter((c) => !c.passed), report.message).toEqual([]);
    });

    it(`${name}: Python`, (ctx) => {
      if (!python) return ctx.skip();
      const report = python.runTests(sources.python, stage);
      expect(report.cases.filter((c) => !c.passed), report.message).toEqual([]);
    });

    for (const language of ["java", "cpp", "go", "typescript"] as const) {
      it.concurrent(`${name}: ${language}`, async ({ skip }) => {
        if (!available[language]) skip();
        const raw = await runNativeTests(language, sources[language], stage, testArgsJson(stage));
        const report = judgeResults(stage, raw);
        expect(report.cases.filter((c) => !c.passed).map((c) => c.error ?? JSON.stringify(c.actual)), report.message).toEqual([]);
      }, TIMEOUT);
    }
  }
});
