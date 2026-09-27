import type { NativeLanguage } from "../judge/native";
import { browserPart, nativePart, type SourceSet } from "./adapters";
import { nodeSignature, nodeSources, type NodeSpec } from "./nodes";
import type { Problem } from "./types";

/** Blind 75 batch H: trees, a trie-backed design problem, and Word Search II. */

const TREE_NOTE =
  "**Judge note:** The judge passes each tree as a LeetCode-style level-order array (`null` for missing children). The starter's adapter builds real `TreeNode`s, calls your function, and turns a returned tree back into a level-order array.";

/** Go user code cannot import after the TreeNode type, so references that need packages get them hoisted. */
function withGoImports(sources: Record<NativeLanguage, string>, imports: string[]): Record<NativeLanguage, string> {
  return { ...sources, go: `import (\n${imports.map((name) => `\t"${name}"`).join("\n")}\n)\n\n${sources.go}` };
}

/** A right-leaning chain 1..n as a level-order array. */
function chain(n: number): (number | null)[] {
  const out: (number | null)[] = [1];
  for (let v = 2; v <= n; v++) out.push(null, v);
  return out;
}

// ── Same Tree ────────────────────────────────────────────────────────────────

const SAME_TREE: NodeSpec = {
  wrapper: "isSameTreeFromValues",
  call: "isSameTree",
  params: [
    { kind: "tree", name: "p" },
    { kind: "tree", name: "q" },
  ],
  returns: { kind: "value", type: "bool" },
};

const SAME_TREE_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode | null} p
 * @param {TreeNode | null} q
 * @return {boolean}
 */
function isSameTree(p, q) {
  // Your code here
  return false;
}`,
  python: `def isSameTree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
    # Your code here
    return False`,
  java: `    public boolean isSameTree(TreeNode p, TreeNode q) {
        // Your code here
        return false;
    }`,
  cpp: `    bool isSameTree(TreeNode* p, TreeNode* q) {
        // Your code here
        return false;
    }`,
  go: `func isSameTree(p *TreeNode, q *TreeNode) bool {
	// Your code here
	return false
}`,
  typescript: `function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  // Your code here
  return false;
}`,
};

const SAME_TREE_REF: SourceSet = {
  javascript: `function isSameTree(p, q) {
  if (!p || !q) return p === q;
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
  python: `def isSameTree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
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
};

// ── Invert Binary Tree ───────────────────────────────────────────────────────

const INVERT: NodeSpec = {
  wrapper: "invertTreeFromValues",
  call: "invertTree",
  params: [{ kind: "tree", name: "root" }],
  returns: { kind: "tree" },
};

const INVERT_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode | null} root
 * @return {TreeNode | null}
 */
function invertTree(root) {
  // Your code here
  return root;
}`,
  python: `def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:
    # Your code here
    return root`,
  java: `    public TreeNode invertTree(TreeNode root) {
        // Your code here
        return root;
    }`,
  cpp: `    TreeNode* invertTree(TreeNode* root) {
        // Your code here
        return root;
    }`,
  go: `func invertTree(root *TreeNode) *TreeNode {
	// Your code here
	return root
}`,
  typescript: `function invertTree(root: TreeNode | null): TreeNode | null {
  // Your code here
  return root;
}`,
};

const INVERT_REF: SourceSet = {
  javascript: `function invertTree(root) {
  if (!root) return null;
  const left = root.left;
  root.left = invertTree(root.right);
  root.right = invertTree(left);
  return root;
}`,
  python: `def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:
    if root:
        root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root`,
  java: `    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode left = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(left);
        return root;
    }`,
  cpp: `    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        TreeNode* left = root->left;
        root->left = invertTree(root->right);
        root->right = invertTree(left);
        return root;
    }`,
  go: `func invertTree(root *TreeNode) *TreeNode {
	if root != nil {
		root.Left, root.Right = invertTree(root.Right), invertTree(root.Left)
	}
	return root
}`,
  typescript: `function invertTree(root: TreeNode | null): TreeNode | null {
  if (!root) return null;
  const left = root.left;
  root.left = invertTree(root.right);
  root.right = invertTree(left);
  return root;
}`,
};

// ── Binary Tree Maximum Path Sum ─────────────────────────────────────────────

const MAX_PATH: NodeSpec = {
  wrapper: "maxPathSumFromValues",
  call: "maxPathSum",
  params: [{ kind: "tree", name: "root" }],
  returns: { kind: "value", type: "int" },
};

const MAX_PATH_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode} root
 * @return {number}
 */
function maxPathSum(root) {
  // Your code here
  return 0;
}`,
  python: `def maxPathSum(root: Optional[TreeNode]) -> int:
    # Your code here
    return 0`,
  java: `    public int maxPathSum(TreeNode root) {
        // Your code here
        return 0;
    }`,
  cpp: `    int maxPathSum(TreeNode* root) {
        // Your code here
        return 0;
    }`,
  go: `func maxPathSum(root *TreeNode) int {
	// Your code here
	return 0
}`,
  typescript: `function maxPathSum(root: TreeNode | null): number {
  // Your code here
  return 0;
}`,
};

const MAX_PATH_REF: SourceSet = {
  javascript: `function maxPathSum(root) {
  let best = -Infinity;
  // Best downward path starting at node (never negative for the parent to use).
  const gain = (node) => {
    if (!node) return 0;
    const left = Math.max(0, gain(node.left));
    const right = Math.max(0, gain(node.right));
    best = Math.max(best, node.val + left + right);
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}`,
  python: `def maxPathSum(root: Optional[TreeNode]) -> int:
    best = float("-inf")

    def gain(node):
        nonlocal best
        if not node:
            return 0
        left = max(0, gain(node.left))
        right = max(0, gain(node.right))
        best = max(best, node.val + left + right)
        return node.val + max(left, right)

    gain(root)
    return best`,
  java: `    private int best;

    public int maxPathSum(TreeNode root) {
        best = Integer.MIN_VALUE;
        gain(root);
        return best;
    }

    private int gain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.max(0, gain(node.left));
        int right = Math.max(0, gain(node.right));
        best = Math.max(best, node.val + left + right);
        return node.val + Math.max(left, right);
    }`,
  cpp: `    int best = INT_MIN;

    int maxPathSum(TreeNode* root) {
        best = INT_MIN;
        gain(root);
        return best;
    }

    int gain(TreeNode* node) {
        if (!node) return 0;
        int left = max(0, gain(node->left));
        int right = max(0, gain(node->right));
        best = max(best, node->val + left + right);
        return node->val + max(left, right);
    }`,
  go: `func maxPathSum(root *TreeNode) int {
	best := root.Val
	var gain func(*TreeNode) int
	gain = func(node *TreeNode) int {
		if node == nil {
			return 0
		}
		left := gain(node.Left)
		if left < 0 {
			left = 0
		}
		right := gain(node.Right)
		if right < 0 {
			right = 0
		}
		if node.Val+left+right > best {
			best = node.Val + left + right
		}
		if left > right {
			return node.Val + left
		}
		return node.Val + right
	}
	gain(root)
	return best
}`,
  typescript: `function maxPathSum(root: TreeNode | null): number {
  let best = -Infinity;
  const gain = (node: TreeNode | null): number => {
    if (!node) return 0;
    const left = Math.max(0, gain(node.left));
    const right = Math.max(0, gain(node.right));
    best = Math.max(best, node.val + left + right);
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}`,
};

// ── Serialize and Deserialize Binary Tree ────────────────────────────────────

const CODEC: NodeSpec = {
  wrapper: "codecRoundTrip",
  call: "roundTrip",
  params: [{ kind: "tree", name: "root" }],
  returns: { kind: "tree" },
};

const CODEC_MARK = "Judge adapter: encodes with your serialize, then decodes with your deserialize. No need to edit below.";

/** The round trip the judge runs, placed after the user's serialize / deserialize. */
const CODEC_ROUND_TRIP: SourceSet = {
  javascript: `// ${CODEC_MARK}
function roundTrip(root) {
  const data = serialize(root);
  if (typeof data !== "string") throw new Error("serialize must return a string");
  const copy = deserialize(data);
  if (copy !== null && copy === root) throw new Error("deserialize must build new nodes from the string");
  return copy;
}`,
  python: `# ${CODEC_MARK}
def roundTrip(root):
    data = serialize(root)
    if not isinstance(data, str):
        raise TypeError("serialize must return a string")
    copy = deserialize(data)
    if copy is not None and copy is root:
        raise ValueError("deserialize must build new nodes from the string")
    return copy`,
  java: `    // ${CODEC_MARK}
    public TreeNode roundTrip(TreeNode root) {
        String data = serialize(root);
        if (data == null) throw new IllegalStateException("serialize must return a string");
        TreeNode copy = deserialize(data);
        if (copy != null && copy == root) throw new IllegalStateException("deserialize must build new nodes from the string");
        return copy;
    }`,
  cpp: `    // ${CODEC_MARK}
    TreeNode* roundTrip(TreeNode* root) {
        string data = serialize(root);
        TreeNode* copy = deserialize(data);
        if (copy && copy == root) throw runtime_error("deserialize must build new nodes from the string");
        return copy;
    }`,
  go: `// ${CODEC_MARK}
func roundTrip(root *TreeNode) *TreeNode {
	data := serialize(root)
	copy := deserialize(data)
	if copy != nil && copy == root {
		panic("deserialize must build new nodes from the string")
	}
	return copy
}`,
  typescript: `// ${CODEC_MARK}
function roundTrip(root: TreeNode | null): TreeNode | null {
  const data = serialize(root);
  if (typeof data !== "string") throw new Error("serialize must return a string");
  const copy = deserialize(data);
  if (copy !== null && copy === root) throw new Error("deserialize must build new nodes from the string");
  return copy;
}`,
};

function withRoundTrip(user: SourceSet): SourceSet {
  return Object.fromEntries(
    (Object.keys(user) as (keyof SourceSet)[]).map((language) => [language, `${user[language]}\n\n${CODEC_ROUND_TRIP[language]}`]),
  ) as SourceSet;
}

const CODEC_STUB: SourceSet = withRoundTrip({
  javascript: `/**
 * Encodes a tree to a single string.
 * @param {TreeNode | null} root
 * @return {string}
 */
function serialize(root) {
  // Your code here
  return "";
}

/**
 * Decodes your encoded data back to a tree.
 * @param {string} data
 * @return {TreeNode | null}
 */
function deserialize(data) {
  // Your code here
  return null;
}`,
  python: `def serialize(root: Optional[TreeNode]) -> str:
    """Encodes a tree to a single string."""
    # Your code here
    return ""


def deserialize(data: str) -> Optional[TreeNode]:
    """Decodes your encoded data back to a tree."""
    # Your code here
    return None`,
  java: `    // Encodes a tree to a single string.
    public String serialize(TreeNode root) {
        // Your code here
        return "";
    }

    // Decodes your encoded data back to a tree.
    public TreeNode deserialize(String data) {
        // Your code here
        return null;
    }`,
  cpp: `    // Encodes a tree to a single string.
    string serialize(TreeNode* root) {
        // Your code here
        return "";
    }

    // Decodes your encoded data back to a tree.
    TreeNode* deserialize(string data) {
        // Your code here
        return nullptr;
    }`,
  go: `// Encodes a tree to a single string.
func serialize(root *TreeNode) string {
	// Your code here
	return ""
}

// Decodes your encoded data back to a tree.
func deserialize(data string) *TreeNode {
	// Your code here
	return nil
}`,
  typescript: `// Encodes a tree to a single string.
function serialize(root: TreeNode | null): string {
  // Your code here
  return "";
}

// Decodes your encoded data back to a tree.
function deserialize(data: string): TreeNode | null {
  // Your code here
  return null;
}`,
});

const CODEC_REF: SourceSet = withRoundTrip({
  javascript: `// Preorder with "#" for every missing child, comma-separated.
function serialize(root) {
  const out = [];
  const walk = (node) => {
    if (!node) {
      out.push("#");
      return;
    }
    out.push(String(node.val));
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out.join(",");
}

function deserialize(data) {
  const tokens = data.split(",");
  let next = 0;
  const build = () => {
    const token = tokens[next++];
    if (token === undefined || token === "#" || token === "") return null;
    const node = new TreeNode(Number(token));
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}`,
  python: `def serialize(root: Optional[TreeNode]) -> str:
    out = []

    def walk(node):
        if not node:
            out.append("#")
            return
        out.append(str(node.val))
        walk(node.left)
        walk(node.right)

    walk(root)
    return ",".join(out)


def deserialize(data: str) -> Optional[TreeNode]:
    tokens = iter(data.split(","))

    def build():
        token = next(tokens, "#")
        if token in ("#", ""):
            return None
        node = TreeNode(int(token))
        node.left = build()
        node.right = build()
        return node

    return build()`,
  java: `    public String serialize(TreeNode root) {
        StringBuilder out = new StringBuilder();
        writeNode(root, out);
        return out.toString();
    }

    private void writeNode(TreeNode node, StringBuilder out) {
        if (out.length() > 0) out.append(',');
        if (node == null) { out.append('#'); return; }
        out.append(node.val);
        writeNode(node.left, out);
        writeNode(node.right, out);
    }

    public TreeNode deserialize(String data) {
        String[] tokens = data.split(",");
        int[] next = {0};
        return readNode(tokens, next);
    }

    private TreeNode readNode(String[] tokens, int[] next) {
        if (next[0] >= tokens.length) return null;
        String token = tokens[next[0]++];
        if (token.equals("#") || token.isEmpty()) return null;
        TreeNode node = new TreeNode(Integer.parseInt(token));
        node.left = readNode(tokens, next);
        node.right = readNode(tokens, next);
        return node;
    }`,
  cpp: `    string serialize(TreeNode* root) {
        string out;
        writeNode(root, out);
        return out;
    }

    void writeNode(TreeNode* node, string& out) {
        if (!out.empty()) out += ',';
        if (!node) { out += '#'; return; }
        out += to_string(node->val);
        writeNode(node->left, out);
        writeNode(node->right, out);
    }

    TreeNode* deserialize(string data) {
        vector<string> tokens;
        stringstream in(data);
        string token;
        while (getline(in, token, ',')) tokens.push_back(token);
        size_t next = 0;
        return readNode(tokens, next);
    }

    TreeNode* readNode(const vector<string>& tokens, size_t& next) {
        if (next >= tokens.size()) return nullptr;
        const string& token = tokens[next++];
        if (token == "#" || token.empty()) return nullptr;
        TreeNode* node = new TreeNode(stoi(token));
        node->left = readNode(tokens, next);
        node->right = readNode(tokens, next);
        return node;
    }`,
  go: `func serialize(root *TreeNode) string {
	parts := []string{}
	var walk func(*TreeNode)
	walk = func(node *TreeNode) {
		if node == nil {
			parts = append(parts, "#")
			return
		}
		parts = append(parts, strconv.Itoa(node.Val))
		walk(node.Left)
		walk(node.Right)
	}
	walk(root)
	return strings.Join(parts, ",")
}

func deserialize(data string) *TreeNode {
	tokens := strings.Split(data, ",")
	next := 0
	var build func() *TreeNode
	build = func() *TreeNode {
		if next >= len(tokens) {
			return nil
		}
		token := tokens[next]
		next++
		if token == "#" || token == "" {
			return nil
		}
		val, _ := strconv.Atoi(token)
		node := &TreeNode{Val: val}
		node.Left = build()
		node.Right = build()
		return node
	}
	return build()
}`,
  typescript: `function serialize(root: TreeNode | null): string {
  const out: string[] = [];
  const walk = (node: TreeNode | null): void => {
    if (!node) {
      out.push("#");
      return;
    }
    out.push(String(node.val));
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out.join(",");
}

function deserialize(data: string): TreeNode | null {
  const tokens = data.split(",");
  let next = 0;
  const build = (): TreeNode | null => {
    const token = tokens[next++];
    if (token === undefined || token === "#" || token === "") return null;
    const node = new TreeNode(Number(token));
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}`,
});

// ── Subtree of Another Tree ──────────────────────────────────────────────────

const SUBTREE: NodeSpec = {
  wrapper: "isSubtreeFromValues",
  call: "isSubtree",
  params: [
    { kind: "tree", name: "root" },
    { kind: "tree", name: "subRoot" },
  ],
  returns: { kind: "value", type: "bool" },
};

const SUBTREE_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode | null} root
 * @param {TreeNode | null} subRoot
 * @return {boolean}
 */
function isSubtree(root, subRoot) {
  // Your code here
  return false;
}`,
  python: `def isSubtree(root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
    # Your code here
    return False`,
  java: `    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        // Your code here
        return false;
    }`,
  cpp: `    bool isSubtree(TreeNode* root, TreeNode* subRoot) {
        // Your code here
        return false;
    }`,
  go: `func isSubtree(root *TreeNode, subRoot *TreeNode) bool {
	// Your code here
	return false
}`,
  typescript: `function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  // Your code here
  return false;
}`,
};

const SUBTREE_REF: SourceSet = {
  javascript: `function sameTree(a, b) {
  if (!a || !b) return a === b;
  return a.val === b.val && sameTree(a.left, b.left) && sameTree(a.right, b.right);
}

function isSubtree(root, subRoot) {
  if (!root) return !subRoot;
  return sameTree(root, subRoot) || isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}`,
  python: `def sameTree(a, b):
    if not a or not b:
        return a is b
    return a.val == b.val and sameTree(a.left, b.left) and sameTree(a.right, b.right)


def isSubtree(root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
    if not root:
        return subRoot is None
    return sameTree(root, subRoot) or isSubtree(root.left, subRoot) or isSubtree(root.right, subRoot)`,
  java: `    private boolean sameTree(TreeNode a, TreeNode b) {
        if (a == null || b == null) return a == b;
        return a.val == b.val && sameTree(a.left, b.left) && sameTree(a.right, b.right);
    }

    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        if (root == null) return subRoot == null;
        return sameTree(root, subRoot) || isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
    }`,
  cpp: `    bool sameTree(TreeNode* a, TreeNode* b) {
        if (!a || !b) return a == b;
        return a->val == b->val && sameTree(a->left, b->left) && sameTree(a->right, b->right);
    }

    bool isSubtree(TreeNode* root, TreeNode* subRoot) {
        if (!root) return !subRoot;
        return sameTree(root, subRoot) || isSubtree(root->left, subRoot) || isSubtree(root->right, subRoot);
    }`,
  go: `func sameTree(a *TreeNode, b *TreeNode) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Val == b.Val && sameTree(a.Left, b.Left) && sameTree(a.Right, b.Right)
}

func isSubtree(root *TreeNode, subRoot *TreeNode) bool {
	if root == nil {
		return subRoot == nil
	}
	return sameTree(root, subRoot) || isSubtree(root.Left, subRoot) || isSubtree(root.Right, subRoot)
}`,
  typescript: `function sameTree(a: TreeNode | null, b: TreeNode | null): boolean {
  if (!a || !b) return a === b;
  return a.val === b.val && sameTree(a.left, b.left) && sameTree(a.right, b.right);
}

function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  if (!root) return !subRoot;
  return sameTree(root, subRoot) || isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}`,
};

// ── Construct Binary Tree from Preorder and Inorder Traversal ────────────────

const BUILD_TREE: NodeSpec = {
  wrapper: "buildTreeFromArrays",
  call: "buildTree",
  params: [
    { kind: "value", name: "preorder", type: "int[]" },
    { kind: "value", name: "inorder", type: "int[]" },
  ],
  returns: { kind: "tree" },
};

const BUILD_TREE_STUB: SourceSet = {
  javascript: `/**
 * @param {number[]} preorder
 * @param {number[]} inorder
 * @return {TreeNode | null}
 */
function buildTree(preorder, inorder) {
  // Your code here
  return null;
}`,
  python: `def buildTree(preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
    # Your code here
    return None`,
  java: `    public TreeNode buildTree(int[] preorder, int[] inorder) {
        // Your code here
        return null;
    }`,
  cpp: `    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        // Your code here
        return nullptr;
    }`,
  go: `func buildTree(preorder []int, inorder []int) *TreeNode {
	// Your code here
	return nil
}`,
  typescript: `function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  // Your code here
  return null;
}`,
};

const BUILD_TREE_REF: SourceSet = {
  javascript: `function buildTree(preorder, inorder) {
  const index = new Map(inorder.map((value, i) => [value, i]));
  let next = 0;
  // Builds the subtree whose values are inorder[lo..hi].
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const node = new TreeNode(preorder[next++]);
    const mid = index.get(node.val);
    node.left = build(lo, mid - 1);
    node.right = build(mid + 1, hi);
    return node;
  };
  return build(0, inorder.length - 1);
}`,
  python: `def buildTree(preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
    index = {value: i for i, value in enumerate(inorder)}
    order = iter(preorder)

    def build(lo, hi):
        if lo > hi:
            return None
        node = TreeNode(next(order))
        mid = index[node.val]
        node.left = build(lo, mid - 1)
        node.right = build(mid + 1, hi)
        return node

    return build(0, len(inorder) - 1)`,
  java: `    private Map<Integer, Integer> index;
    private int next;

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        index = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) index.put(inorder[i], i);
        next = 0;
        return build(preorder, 0, inorder.length - 1);
    }

    private TreeNode build(int[] preorder, int lo, int hi) {
        if (lo > hi) return null;
        TreeNode node = new TreeNode(preorder[next++]);
        int mid = index.get(node.val);
        node.left = build(preorder, lo, mid - 1);
        node.right = build(preorder, mid + 1, hi);
        return node;
    }`,
  cpp: `    unordered_map<int, int> index;
    int next = 0;

    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        index.clear();
        for (int i = 0; i < (int)inorder.size(); i++) index[inorder[i]] = i;
        next = 0;
        return build(preorder, 0, (int)inorder.size() - 1);
    }

    TreeNode* build(vector<int>& preorder, int lo, int hi) {
        if (lo > hi) return nullptr;
        TreeNode* node = new TreeNode(preorder[next++]);
        int mid = index[node->val];
        node->left = build(preorder, lo, mid - 1);
        node->right = build(preorder, mid + 1, hi);
        return node;
    }`,
  go: `func buildTree(preorder []int, inorder []int) *TreeNode {
	index := make(map[int]int, len(inorder))
	for i, value := range inorder {
		index[value] = i
	}
	next := 0
	var build func(lo, hi int) *TreeNode
	build = func(lo, hi int) *TreeNode {
		if lo > hi {
			return nil
		}
		node := &TreeNode{Val: preorder[next]}
		next++
		mid := index[node.Val]
		node.Left = build(lo, mid-1)
		node.Right = build(mid+1, hi)
		return node
	}
	return build(0, len(inorder)-1)
}`,
  typescript: `function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  const index = new Map<number, number>(inorder.map((value, i) => [value, i]));
  let next = 0;
  const build = (lo: number, hi: number): TreeNode | null => {
    if (lo > hi) return null;
    const node = new TreeNode(preorder[next++]);
    const mid = index.get(node.val)!;
    node.left = build(lo, mid - 1);
    node.right = build(mid + 1, hi);
    return node;
  };
  return build(0, inorder.length - 1);
}`,
};

// ── Kth Smallest Element in a BST ────────────────────────────────────────────

const KTH: NodeSpec = {
  wrapper: "kthSmallestFromValues",
  call: "kthSmallest",
  params: [
    { kind: "tree", name: "root" },
    { kind: "value", name: "k", type: "int" },
  ],
  returns: { kind: "value", type: "int" },
};

const KTH_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode} root
 * @param {number} k
 * @return {number}
 */
function kthSmallest(root, k) {
  // Your code here
  return 0;
}`,
  python: `def kthSmallest(root: Optional[TreeNode], k: int) -> int:
    # Your code here
    return 0`,
  java: `    public int kthSmallest(TreeNode root, int k) {
        // Your code here
        return 0;
    }`,
  cpp: `    int kthSmallest(TreeNode* root, int k) {
        // Your code here
        return 0;
    }`,
  go: `func kthSmallest(root *TreeNode, k int) int {
	// Your code here
	return 0
}`,
  typescript: `function kthSmallest(root: TreeNode | null, k: number): number {
  // Your code here
  return 0;
}`,
};

const KTH_REF: SourceSet = {
  javascript: `function kthSmallest(root, k) {
  const stack = [];
  let node = root;
  while (node || stack.length) {
    while (node) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    if (--k === 0) return node.val;
    node = node.right;
  }
  return -1;
}`,
  python: `def kthSmallest(root: Optional[TreeNode], k: int) -> int:
    stack = []
    node = root
    while node or stack:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right
    return -1`,
  java: `    public int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (node != null || !stack.isEmpty()) {
            while (node != null) { stack.push(node); node = node.left; }
            node = stack.pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
        return -1;
    }`,
  cpp: `    int kthSmallest(TreeNode* root, int k) {
        vector<TreeNode*> stack;
        TreeNode* node = root;
        while (node || !stack.empty()) {
            while (node) { stack.push_back(node); node = node->left; }
            node = stack.back();
            stack.pop_back();
            if (--k == 0) return node->val;
            node = node->right;
        }
        return -1;
    }`,
  go: `func kthSmallest(root *TreeNode, k int) int {
	stack := []*TreeNode{}
	node := root
	for node != nil || len(stack) > 0 {
		for node != nil {
			stack = append(stack, node)
			node = node.Left
		}
		node = stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		k--
		if k == 0 {
			return node.Val
		}
		node = node.Right
	}
	return -1
}`,
  typescript: `function kthSmallest(root: TreeNode | null, k: number): number {
  const stack: TreeNode[] = [];
  let node = root;
  while (node || stack.length) {
    while (node) {
      stack.push(node);
      node = node.left;
    }
    const top = stack.pop()!;
    if (--k === 0) return top.val;
    node = top.right;
  }
  return -1;
}`,
};

// ── Lowest Common Ancestor of a BST ──────────────────────────────────────────

const LCA: NodeSpec = {
  wrapper: "lowestCommonAncestorFromValues",
  call: "lowestCommonAncestor",
  params: [
    { kind: "tree", name: "root" },
    { kind: "value", name: "p", type: "int" },
    { kind: "value", name: "q", type: "int" },
  ],
  returns: { kind: "value", type: "int" },
};

const LCA_STUB: SourceSet = {
  javascript: `/**
 * @param {TreeNode} root
 * @param {number} p - the value of the first node
 * @param {number} q - the value of the second node
 * @return {number} the value of their lowest common ancestor
 */
function lowestCommonAncestor(root, p, q) {
  // Your code here
  return 0;
}`,
  python: `def lowestCommonAncestor(root: Optional[TreeNode], p: int, q: int) -> int:
    # Your code here: p and q are values; return the ancestor's value
    return 0`,
  java: `    // p and q are values; return the ancestor's value.
    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        // Your code here
        return 0;
    }`,
  cpp: `    // p and q are values; return the ancestor's value.
    int lowestCommonAncestor(TreeNode* root, int p, int q) {
        // Your code here
        return 0;
    }`,
  go: `// p and q are values; return the ancestor's value.
func lowestCommonAncestor(root *TreeNode, p int, q int) int {
	// Your code here
	return 0
}`,
  typescript: `// p and q are values; return the ancestor's value.
function lowestCommonAncestor(root: TreeNode | null, p: number, q: number): number {
  // Your code here
  return 0;
}`,
};

const LCA_REF: SourceSet = {
  javascript: `function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p < node.val && q < node.val) node = node.left;
    else if (p > node.val && q > node.val) node = node.right;
    else return node.val;
  }
  return -1;
}`,
  python: `def lowestCommonAncestor(root: Optional[TreeNode], p: int, q: int) -> int:
    node = root
    while node:
        if p < node.val and q < node.val:
            node = node.left
        elif p > node.val and q > node.val:
            node = node.right
        else:
            return node.val
    return -1`,
  java: `    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        TreeNode node = root;
        while (node != null) {
            if (p < node.val && q < node.val) node = node.left;
            else if (p > node.val && q > node.val) node = node.right;
            else return node.val;
        }
        return -1;
    }`,
  cpp: `    int lowestCommonAncestor(TreeNode* root, int p, int q) {
        TreeNode* node = root;
        while (node) {
            if (p < node->val && q < node->val) node = node->left;
            else if (p > node->val && q > node->val) node = node->right;
            else return node->val;
        }
        return -1;
    }`,
  go: `func lowestCommonAncestor(root *TreeNode, p int, q int) int {
	node := root
	for node != nil {
		if p < node.Val && q < node.Val {
			node = node.Left
		} else if p > node.Val && q > node.Val {
			node = node.Right
		} else {
			return node.Val
		}
	}
	return -1
}`,
  typescript: `function lowestCommonAncestor(root: TreeNode | null, p: number, q: number): number {
  let node = root;
  while (node) {
    if (p < node.val && q < node.val) node = node.left;
    else if (p > node.val && q > node.val) node = node.right;
    else return node.val;
  }
  return -1;
}`,
};

// ── Design Add and Search Words (class starters) ─────────────────────────────

const WORD_DICT_ADAPTER_MARK = "Judge adapter: replays the operations on one WordDictionary. No need to edit below.";

const WORD_DICT_STARTERS: Record<NativeLanguage, string> = {
  java: `class WordDictionary {
    public WordDictionary() {
        // Your code here
    }

    public void addWord(String word) {
    }

    // '.' matches any single letter.
    public boolean search(String word) {
        return false;
    }
}

class Solution {
    // ${WORD_DICT_ADAPTER_MARK}
    public List<Boolean> runWordDictionary(String[] operations, String[] words) {
        WordDictionary dictionary = new WordDictionary();
        List<Boolean> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            if (operations[i].equals("addWord")) { dictionary.addWord(words[i]); out.add(null); }
            else out.add(dictionary.search(words[i]));
        }
        return out;
    }
}
`,
  cpp: `class WordDictionary {
public:
    WordDictionary() {
        // Your code here
    }

    void addWord(string word) {
    }

    // '.' matches any single letter.
    bool search(string word) {
        return false;
    }
};

class Solution {
public:
    // ${WORD_DICT_ADAPTER_MARK}
    vector<optional<bool>> runWordDictionary(vector<string>& operations, vector<string>& words) {
        WordDictionary dictionary;
        vector<optional<bool>> out;
        for (size_t i = 0; i < operations.size(); i++) {
            if (operations[i] == "addWord") { dictionary.addWord(words[i]); out.push_back(nullopt); }
            else out.push_back(dictionary.search(words[i]));
        }
        return out;
    }
};
`,
  go: `type WordDictionary struct {
	// Your fields here
}

func Constructor() WordDictionary {
	return WordDictionary{}
}

func (d *WordDictionary) AddWord(word string) {
}

// '.' matches any single letter.
func (d *WordDictionary) Search(word string) bool {
	return false
}

// ${WORD_DICT_ADAPTER_MARK}
func runWordDictionary(operations []string, words []string) []*bool {
	dictionary := Constructor()
	out := make([]*bool, len(operations))
	for i, op := range operations {
		if op == "addWord" {
			dictionary.AddWord(words[i])
		} else {
			found := dictionary.Search(words[i])
			out[i] = &found
		}
	}
	return out
}
`,
  typescript: `class WordDictionary {
  constructor() {
    // Your code here
  }

  addWord(word: string): void {}

  // '.' matches any single letter.
  search(word: string): boolean {
    return false;
  }
}

// ${WORD_DICT_ADAPTER_MARK}
function runWordDictionary(operations: string[], words: string[]): (boolean | null)[] {
  const dictionary = new WordDictionary();
  return operations.map((op, i) => {
    const result = (dictionary as any)[op](words[i]);
    return result === undefined ? null : result;
  });
}
`,
};

/** Swaps the starter's class (everything before `marker`) for a full implementation. */
function replaceClass(starter: string, marker: string, impl: string): string {
  const at = starter.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  return `${impl}\n\n${starter.slice(at)}`;
}

const WORD_DICT_REFERENCES: Record<NativeLanguage, string> = {
  java: replaceClass(
    WORD_DICT_STARTERS.java,
    "class Solution",
    `class WordDictionary {
    private final WordDictionary[] children = new WordDictionary[26];
    private boolean end;

    public void addWord(String word) {
        WordDictionary node = this;
        for (char c : word.toCharArray()) {
            if (node.children[c - 'a'] == null) node.children[c - 'a'] = new WordDictionary();
            node = node.children[c - 'a'];
        }
        node.end = true;
    }

    public boolean search(String word) {
        return match(word, 0, this);
    }

    private static boolean match(String word, int i, WordDictionary node) {
        if (i == word.length()) return node.end;
        char c = word.charAt(i);
        if (c != '.') {
            WordDictionary child = node.children[c - 'a'];
            return child != null && match(word, i + 1, child);
        }
        for (WordDictionary child : node.children) if (child != null && match(word, i + 1, child)) return true;
        return false;
    }
}`,
  ),
  cpp: replaceClass(
    WORD_DICT_STARTERS.cpp,
    "class Solution",
    `class WordDictionary {
    struct Node {
        Node* children[26] = {};
        bool end = false;
    };
    Node* root = new Node();

    bool match(const string& word, size_t i, Node* node) {
        if (i == word.size()) return node->end;
        if (word[i] != '.') {
            Node* child = node->children[word[i] - 'a'];
            return child && match(word, i + 1, child);
        }
        for (Node* child : node->children) if (child && match(word, i + 1, child)) return true;
        return false;
    }

public:
    void addWord(string word) {
        Node* node = root;
        for (char c : word) {
            if (!node->children[c - 'a']) node->children[c - 'a'] = new Node();
            node = node->children[c - 'a'];
        }
        node->end = true;
    }

    bool search(string word) {
        return match(word, 0, root);
    }
};`,
  ),
  go: replaceClass(
    WORD_DICT_STARTERS.go,
    `// ${WORD_DICT_ADAPTER_MARK}`,
    `type WordDictionary struct {
	children [26]*WordDictionary
	end      bool
}

func Constructor() WordDictionary {
	return WordDictionary{}
}

func (d *WordDictionary) AddWord(word string) {
	node := d
	for i := 0; i < len(word); i++ {
		c := word[i] - 'a'
		if node.children[c] == nil {
			node.children[c] = &WordDictionary{}
		}
		node = node.children[c]
	}
	node.end = true
}

func (d *WordDictionary) Search(word string) bool {
	if word == "" {
		return d.end
	}
	if word[0] != '.' {
		child := d.children[word[0]-'a']
		return child != nil && child.Search(word[1:])
	}
	for _, child := range d.children {
		if child != nil && child.Search(word[1:]) {
			return true
		}
	}
	return false
}`,
  ),
  typescript: replaceClass(
    WORD_DICT_STARTERS.typescript,
    `// ${WORD_DICT_ADAPTER_MARK}`,
    `interface WordNode {
  children: Map<string, WordNode>;
  end: boolean;
}

class WordDictionary {
  root: WordNode = { children: new Map(), end: false };

  addWord(word: string): void {
    let node = this.root;
    for (const ch of word) {
      let child = node.children.get(ch);
      if (!child) {
        child = { children: new Map(), end: false };
        node.children.set(ch, child);
      }
      node = child;
    }
    node.end = true;
  }

  search(word: string): boolean {
    const match = (i: number, node: WordNode): boolean => {
      if (i === word.length) return node.end;
      if (word[i] !== ".") {
        const child = node.children.get(word[i]);
        return child !== undefined && match(i + 1, child);
      }
      for (const child of node.children.values()) if (match(i + 1, child)) return true;
      return false;
    };
    return match(0, this.root);
  }
}`,
  ),
};

// ── Word Search II ───────────────────────────────────────────────────────────

const WORD_SEARCH_NATIVE: Record<NativeLanguage, string> = {
  java: `class Solution {
    private static class Node {
        Node[] children = new Node[26];
        String word;
    }

    public String[] findWords(char[][] board, String[] words) {
        Node root = new Node();
        for (String w : words) {
            Node node = root;
            for (char c : w.toCharArray()) {
                if (node.children[c - 'a'] == null) node.children[c - 'a'] = new Node();
                node = node.children[c - 'a'];
            }
            node.word = w;
        }
        List<String> found = new ArrayList<>();
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[r].length; c++) dfs(board, r, c, root, found);
        return found.toArray(new String[0]);
    }

    private void dfs(char[][] board, int r, int c, Node parent, List<String> found) {
        if (r < 0 || c < 0 || r >= board.length || c >= board[r].length) return;
        char ch = board[r][c];
        if (ch == '#') return;
        Node node = parent.children[ch - 'a'];
        if (node == null) return;
        if (node.word != null) { found.add(node.word); node.word = null; }
        board[r][c] = '#';
        dfs(board, r + 1, c, node, found);
        dfs(board, r - 1, c, node, found);
        dfs(board, r, c + 1, node, found);
        dfs(board, r, c - 1, node, found);
        board[r][c] = ch;
    }
}`,
  cpp: `class Solution {
    struct Node {
        Node* children[26] = {};
        string word;
        bool hasWord = false;
    };

    void dfs(vector<vector<char>>& board, int r, int c, Node* parent, vector<string>& found) {
        if (r < 0 || c < 0 || r >= (int)board.size() || c >= (int)board[r].size()) return;
        char ch = board[r][c];
        if (ch == '#') return;
        Node* node = parent->children[ch - 'a'];
        if (!node) return;
        if (node->hasWord) { found.push_back(node->word); node->hasWord = false; }
        board[r][c] = '#';
        dfs(board, r + 1, c, node, found);
        dfs(board, r - 1, c, node, found);
        dfs(board, r, c + 1, node, found);
        dfs(board, r, c - 1, node, found);
        board[r][c] = ch;
    }

public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        Node* root = new Node();
        for (const string& w : words) {
            Node* node = root;
            for (char c : w) {
                if (!node->children[c - 'a']) node->children[c - 'a'] = new Node();
                node = node->children[c - 'a'];
            }
            node->word = w;
            node->hasWord = true;
        }
        vector<string> found;
        for (int r = 0; r < (int)board.size(); r++)
            for (int c = 0; c < (int)board[r].size(); c++) dfs(board, r, c, root, found);
        return found;
    }
};`,
  go: `type wordNode struct {
	children [26]*wordNode
	word     string
}

func findWords(board [][]byte, words []string) []string {
	root := &wordNode{}
	for _, w := range words {
		node := root
		for i := 0; i < len(w); i++ {
			c := w[i] - 'a'
			if node.children[c] == nil {
				node.children[c] = &wordNode{}
			}
			node = node.children[c]
		}
		node.word = w
	}
	found := []string{}
	var dfs func(r, c int, parent *wordNode)
	dfs = func(r, c int, parent *wordNode) {
		if r < 0 || c < 0 || r >= len(board) || c >= len(board[r]) {
			return
		}
		ch := board[r][c]
		if ch == '#' {
			return
		}
		node := parent.children[ch-'a']
		if node == nil {
			return
		}
		if node.word != "" {
			found = append(found, node.word)
			node.word = ""
		}
		board[r][c] = '#'
		dfs(r+1, c, node)
		dfs(r-1, c, node)
		dfs(r, c+1, node)
		dfs(r, c-1, node)
		board[r][c] = ch
	}
	for r := range board {
		for c := range board[r] {
			dfs(r, c, root)
		}
	}
	return found
}`,
  typescript: `interface WordNode {
  children: Map<string, WordNode>;
  word: string | null;
}

function findWords(board: string[][], words: string[]): string[] {
  const root: WordNode = { children: new Map(), word: null };
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      let child = node.children.get(ch);
      if (!child) {
        child = { children: new Map(), word: null };
        node.children.set(ch, child);
      }
      node = child;
    }
    node.word = w;
  }
  const found: string[] = [];
  const dfs = (r: number, c: number, parent: WordNode): void => {
    if (r < 0 || c < 0 || r >= board.length || c >= board[r].length) return;
    const ch = board[r][c];
    const node = parent.children.get(ch);
    if (!node) return;
    if (node.word !== null) {
      found.push(node.word);
      node.word = null;
    }
    board[r][c] = "#";
    dfs(r + 1, c, node);
    dfs(r - 1, c, node);
    dfs(r, c + 1, node);
    dfs(r, c - 1, node);
    board[r][c] = ch;
  };
  for (let r = 0; r < board.length; r++) for (let c = 0; c < board[r].length; c++) dfs(r, c, root);
  return found;
}`,
};

// ── Composed sources ─────────────────────────────────────────────────────────

const sameTreeStarters = nodeSources(SAME_TREE_STUB, SAME_TREE);
const invertStarters = nodeSources(INVERT_STUB, INVERT);
const maxPathStarters = nodeSources(MAX_PATH_STUB, MAX_PATH);
const codecStarters = nodeSources(CODEC_STUB, CODEC);
const subtreeStarters = nodeSources(SUBTREE_STUB, SUBTREE);
const buildTreeStarters = nodeSources(BUILD_TREE_STUB, BUILD_TREE);
const kthStarters = nodeSources(KTH_STUB, KTH);
const lcaStarters = nodeSources(LCA_STUB, LCA);

const sameTreeRefs = nodeSources(SAME_TREE_REF, SAME_TREE);
const invertRefs = nodeSources(INVERT_REF, INVERT);
const maxPathRefs = nodeSources(MAX_PATH_REF, MAX_PATH);
const codecRefs = nodeSources(CODEC_REF, CODEC);
const subtreeRefs = nodeSources(SUBTREE_REF, SUBTREE);
const buildTreeRefs = nodeSources(BUILD_TREE_REF, BUILD_TREE);
const kthRefs = nodeSources(KTH_REF, KTH);
const lcaRefs = nodeSources(LCA_REF, LCA);

const LCA_BOARD = [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5];
const OATH_BOARD = [
  ["o", "a", "a", "n"],
  ["e", "t", "a", "e"],
  ["i", "h", "k", "r"],
  ["i", "f", "l", "v"],
];

export const PROBLEMS_H: Problem[] = [
  // ---------------------------------------------------------------- same tree
  {
    id: "p-same-tree",
    title: "Same Tree",
    leetcodeSlug: "same-tree",
    difficulty: "easy",
    tags: ["tree_traversal", "dfs", "recursion"],
    statement: `Given the roots of two binary trees \`p\` and \`q\`, return \`true\` if they are the **same**: structurally identical, with equal values at every matching node.

${TREE_NOTE}`,
    examples: [
      { input: "p = [1,2,3], q = [1,2,3]", output: "true" },
      { input: "p = [1,2], q = [1,null,2]", output: "false", explanation: "The 2 is a left child in p but a right child in q." },
      { input: "p = [1,2,1], q = [1,1,2]", output: "false" },
    ],
    constraints: ["The number of nodes in both trees is in the range [0, 100].", "-10^4 <= Node.val <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "🌳 Same Tree: what are the base cases, and what must hold at every pair of matching nodes for the two trees to be the same? Reply in 1-2 sentences.",
        answerKey:
          "If both nodes are null they match, and if exactly one is null the trees differ. Otherwise the values must be equal and both the left pair and the right pair must be the same tree, checked recursively in O(n) time.",
        keyPoints: [
          { label: "Both null match; exactly one null differs", anyOf: ["both nodes are null", "both are null", "both null", "exactly one is null", "one is null"] },
          {
            label: "Equal values and both child pairs recursively the same",
            anyOf: ["values must be equal", "left pair and the right pair", "both subtrees", "checked recursively", "recurse on both"],
          },
        ],
        hint: "Compare the two roots first. What do you need to know about their children afterwards?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: p = [1,2], q = [1,null,2]. A classmate compares the two preorder value lists, sees 1,2 both times, and returns true. Why is the answer false? Reply in 1-2 sentences.",
        answerKey:
          "In p the 2 is a left child and in q it is a right child, so the shapes differ and the answer is false. A traversal that skips the null markers loses the structure; compare node by node or record the nulls.",
        keyPoints: [
          { label: "2 is a left child in p but a right child in q", anyOf: ["left child", "right child", "shapes differ", "different shape"] },
          { label: "Skipping nulls loses the structure", anyOf: ["null markers", "record the nulls", "loses the structure", "node by node"] },
        ],
        hint: "Draw both trees. Where does the 2 hang in each one?",
      },
      code: {
        functionName: SAME_TREE.wrapper,
        ...nodeSignature(SAME_TREE),
        starter: browserPart(sameTreeStarters),
        nativeStarters: nativePart(sameTreeStarters),
        reference: browserPart(sameTreeRefs),
        tests: [
          { args: [[1, 2, 3], [1, 2, 3]], expected: true },
          { args: [[1, 2], [1, null, 2]], expected: false },
          { args: [[1, 2, 1], [1, 1, 2]], expected: false },
          { args: [[], []], expected: true },
          { args: [[1], []], expected: false },
          { args: [[10, 5, 15], [10, 5, null, null, 15]], expected: false },
          { args: [[5, 4, 7, 3, null, 2, null, -1, null, 9], [5, 4, 7, 3, null, 2, null, -1, null, 9]], expected: true, hidden: true },
          { args: [[1, null, 2, null, 3], [1, null, 2, null, 3]], expected: true, hidden: true },
          { args: [[0, -5], [0, -8]], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal"],
    relatedCardIds: ["mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- invert binary tree
  {
    id: "p-invert-binary-tree",
    title: "Invert Binary Tree",
    leetcodeSlug: "invert-binary-tree",
    difficulty: "easy",
    tags: ["tree_traversal", "dfs", "recursion"],
    statement: `Given the \`root\` of a binary tree, **invert** it (mirror it left to right) and return its root.

${TREE_NOTE}`,
    examples: [
      { input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]" },
      { input: "root = [2,1,3]", output: "[2,3,1]" },
      { input: "root = []", output: "[]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 100].", "-100 <= Node.val <= 100"],
    stages: {
      invariant: {
        prompt:
          "🪞 Invert Binary Tree: describe the step you perform at each node, and why the whole thing runs in O(n). Reply in 1-2 sentences.",
        answerKey:
          "At each node, swap its left and right children and then invert both subtrees, in either order; a null node is returned as is. Every node is swapped exactly once, so it is O(n) time and O(h) stack.",
        keyPoints: [
          { label: "Swap the left and right children", anyOf: ["swap its left and right", "swap left and right", "swap the children", "swap"] },
          { label: "Invert both subtrees recursively", anyOf: ["invert both subtrees", "recurse on both", "both subtrees"] },
          { label: "Each node once", anyOf: ["exactly once", "each node once", "every node"] },
        ],
        hint: "What does the mirror image of a single node with two children look like? Now apply that everywhere.",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: a classmate writes root.left = invertTree(root.right), then root.right = invertTree(root.left). What does that return for [2,1,3], and how do you fix it? Reply in 1-2 sentences.",
        answerKey:
          "The first line overwrites root.left, so the second line inverts the new left (the old right subtree 3) again and the old left 1 is lost, giving [2,3,3]. Save the original left in a temp variable first, or swap both at once.",
        keyPoints: [
          { label: "root.left is overwritten before it is read", anyOf: ["overwrites root.left", "old left", "is lost", "overwritten", "[2,3,3]"] },
          { label: "Save the original left first", anyOf: ["temp variable", "save the original", "swap both at once", "temporary"] },
        ],
        hint: "After the first assignment runs, what does root.left point to?",
      },
      code: {
        functionName: INVERT.wrapper,
        ...nodeSignature(INVERT),
        starter: browserPart(invertStarters),
        nativeStarters: nativePart(invertStarters),
        reference: browserPart(invertRefs),
        tests: [
          { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
          { args: [[2, 1, 3]], expected: [2, 3, 1] },
          { args: [[]], expected: [] },
          { args: [[1, 2]], expected: [1, null, 2] },
          { args: [[1]], expected: [1] },
          { args: [[1, 2, 3, 4, 5, 6, 7]], expected: [1, 3, 2, 7, 6, 5, 4], hidden: true },
          { args: [[1, null, 2, null, 3]], expected: [1, 2, null, 3], hidden: true },
          { args: [[3, 1, 5, null, 2, 4]], expected: [3, 5, 1, null, 4, 2], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal", "recursion"],
    relatedCardIds: ["mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- max path sum
  {
    id: "p-binary-tree-maximum-path-sum",
    title: "Binary Tree Maximum Path Sum",
    leetcodeSlug: "binary-tree-maximum-path-sum",
    difficulty: "hard",
    tags: ["tree_traversal", "dfs", "recursion", "dp_1d"],
    statement: `A **path** in a binary tree is a sequence of nodes where each adjacent pair is connected by an edge. A node appears in the path at most once, and the path does not need to pass through the root. It contains at least one node.

Given the \`root\` of a binary tree, return the maximum **path sum** (the sum of the node values) of any non-empty path.

${TREE_NOTE}`,
    examples: [
      { input: "root = [1,2,3]", output: "6", explanation: "The path 2 -> 1 -> 3 has sum 6." },
      { input: "root = [-10,9,20,null,null,15,7]", output: "42", explanation: "The path 15 -> 20 -> 7 has sum 42." },
    ],
    constraints: ["The number of nodes in the tree is in the range [1, 3 * 10^4].", "-1000 <= Node.val <= 1000"],
    stages: {
      invariant: {
        prompt:
          "🧗 Binary Tree Maximum Path Sum: what does your DFS return to its parent, and what does it compare against the global best at each node? Reply in 1-2 sentences.",
        answerKey:
          "The DFS returns the best downward gain, node.val plus the larger child gain, because a parent can extend only one branch; a negative gain is treated as 0. At each node it updates the global best with node.val plus both child gains, the path that bends through that node.",
        keyPoints: [
          { label: "Return one branch: the best downward gain", anyOf: ["downward gain", "only one branch", "one branch", "larger child gain"] },
          { label: "The global best uses both sides through the node", anyOf: ["both child gains", "bends through", "both sides", "both children"] },
          { label: "Negative gains count as 0", anyOf: ["negative gain", "treated as 0", "clamp", "drop negative"] },
        ],
        hint: "A path can bend at most once. Which value can a parent reuse, and which one only makes sense as a final answer?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: root = [-3]. A classmate starts the global best at 0. What do they return, and what is the correct answer? Reply in 1-2 sentences.",
        answerKey:
          "They return 0, but a path must contain at least one node, so the answer is -3. Start the best at negative infinity or the root's value; only the child gains are clamped at 0, never the node itself.",
        keyPoints: [
          { label: "A path has at least one node, so -3", anyOf: ["at least one node", "answer is -3", "non-empty"] },
          { label: "Start the best at negative infinity", anyOf: ["negative infinity", "root's value", "int_min", "min value", "-infinity"] },
        ],
        hint: "Can the empty path count? What is the only path in a one-node tree?",
      },
      code: {
        functionName: MAX_PATH.wrapper,
        ...nodeSignature(MAX_PATH),
        starter: browserPart(maxPathStarters),
        nativeStarters: nativePart(maxPathStarters),
        reference: browserPart(maxPathRefs),
        tests: [
          { args: [[1, 2, 3]], expected: 6 },
          { args: [[-10, 9, 20, null, null, 15, 7]], expected: 42 },
          { args: [[-3]], expected: -3 },
          { args: [[2, -1]], expected: 2 },
          { args: [[1, -2, 3]], expected: 4 },
          { args: [[-1, -2, -3]], expected: -1, hidden: true },
          { args: [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]], expected: 48, hidden: true },
          { args: [[1, 2, null, 3, null, 4, null, 5]], expected: 15, hidden: true },
          { args: [[9, 6, -3, null, null, -6, 2, null, null, 2, null, -6, -6, -6]], expected: 16, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal", "recursion"],
    relatedCardIds: ["mc-tree-diameter", "mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- serialize / deserialize
  {
    id: "p-serialize-and-deserialize-binary-tree",
    title: "Serialize and Deserialize Binary Tree",
    leetcodeSlug: "serialize-and-deserialize-binary-tree",
    difficulty: "hard",
    tags: ["tree_traversal", "dfs", "design", "string"],
    statement: `Design an algorithm to **serialize** a binary tree to a string and **deserialize** that string back to the original tree structure. Any format works, as long as \`deserialize(serialize(root))\` rebuilds a tree with the same shape and values.

Implement:

- \`serialize(root)\` returns a string encoding the tree.
- \`deserialize(data)\` takes a string produced by your \`serialize\` and returns the root of the rebuilt tree.

**Judge note:** The judge passes each tree as a LeetCode-style level-order array (\`null\` for missing children). The starter's \`roundTrip\` adapter calls your \`serialize\`, checks that it returned a string, passes that string to your \`deserialize\`, and compares the rebuilt tree (as a level-order array) with the input.`,
    examples: [
      { input: "root = [1,2,3,null,null,4,5]", output: "[1,2,3,null,null,4,5]" },
      { input: "root = []", output: "[]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 10^4].", "-1000 <= Node.val <= 1000"],
    stages: {
      invariant: {
        prompt:
          "📦 Serialize and Deserialize Binary Tree: what must your string record so the exact shape can be rebuilt, and how does deserialize consume it? Reply in 1-2 sentences.",
        answerKey:
          "Write a preorder traversal that records a null marker such as # for every missing child, with a separator between values. Deserialize reads the tokens in the same preorder: a # returns null, otherwise it builds the node and then recursively builds its left and right subtrees.",
        keyPoints: [
          { label: "A null marker for every missing child", anyOf: ["null marker", "missing child", "marker for"] },
          { label: "A separator between values", anyOf: ["separator", "delimiter", "comma"] },
          { label: "Read back in the same order", anyOf: ["same preorder", "same order", "reads the tokens"] },
        ],
        hint: "Values alone are ambiguous. What extra symbol makes a preorder listing describe exactly one tree?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: a classmate serializes only the preorder values, with no null markers, giving the string 1,2,3. Name two different trees that produce that same string. Reply in 1-2 sentences.",
        answerKey:
          "The tree [1,2,3] (2 on the left, 3 on the right) and the chain [1,2,null,3] (3 under 2) both have preorder 1,2,3, so the decoder cannot tell them apart. Adding a null marker for each missing child makes the string unique.",
        keyPoints: [
          { label: "Two shapes share the preorder", anyOf: ["cannot tell them apart", "both have preorder", "same preorder", "ambiguous"] },
          { label: "Null markers make it unique", anyOf: ["null marker", "makes the string unique", "unique"] },
        ],
        hint: "Where can the 3 go relative to 1 and 2 while preorder still lists 1, then 2, then 3?",
      },
      code: {
        functionName: CODEC.wrapper,
        ...nodeSignature(CODEC),
        starter: browserPart(codecStarters),
        nativeStarters: nativePart(codecStarters),
        reference: browserPart(codecRefs),
        tests: [
          { args: [[1, 2, 3, null, null, 4, 5]], expected: [1, 2, 3, null, null, 4, 5] },
          { args: [[]], expected: [] },
          { args: [[1]], expected: [1] },
          { args: [[-10, 9, 20, null, null, 15, 7]], expected: [-10, 9, 20, null, null, 15, 7] },
          { args: [[1, null, 2, null, 3]], expected: [1, null, 2, null, 3] },
          { args: [[5, 4, 7, 3, null, 2, null, -1, null, 9]], expected: [5, 4, 7, 3, null, 2, null, -1, null, 9], hidden: true },
          { args: [[0, 0, 0, 0, null, null, 0]], expected: [0, 0, 0, 0, null, null, 0], hidden: true },
          { args: [[1000, -1000, 999, null, -999]], expected: [1000, -1000, 999, null, -999], hidden: true },
          { args: [chain(100)], expected: chain(100), hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal", "design"],
    relatedCardIds: ["mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- subtree
  {
    id: "p-subtree-of-another-tree",
    title: "Subtree of Another Tree",
    leetcodeSlug: "subtree-of-another-tree",
    difficulty: "easy",
    tags: ["tree_traversal", "dfs", "recursion"],
    statement: `Given the roots of two binary trees \`root\` and \`subRoot\`, return \`true\` if there is a subtree of \`root\` with the same structure and node values as \`subRoot\`, and \`false\` otherwise.

A subtree of \`root\` is a node of \`root\` together with **all** of its descendants. The tree \`root\` counts as a subtree of itself.

${TREE_NOTE}`,
    examples: [
      { input: "root = [3,4,5,1,2], subRoot = [4,1,2]", output: "true" },
      {
        input: "root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]",
        output: "false",
        explanation: "The 2 under the 4 has an extra child 0, so that subtree is 4,1,2,0.",
      },
    ],
    constraints: [
      "The number of nodes in root is in the range [1, 2000].",
      "The number of nodes in subRoot is in the range [1, 1000].",
      "-10^4 <= Node.val <= 10^4",
    ],
    stages: {
      invariant: {
        prompt:
          "🌲 Subtree of Another Tree: how do you combine a sameTree check with a traversal of root, and what is the worst-case time? Reply in 1-2 sentences.",
        answerKey:
          "Visit every node of root and at each one run sameTree(node, subRoot), returning true as soon as one matches. That is O(m * n) in the worst case for m and n nodes; serializing both trees with null markers and string matching can make it linear.",
        keyPoints: [
          { label: "Run sameTree at every node of root", anyOf: ["every node", "at each one", "each node"] },
          { label: "O(m * n) worst case", anyOf: ["o(m * n)", "o(mn)", "o(m*n)", "m * n"] },
        ],
        hint: "Where could the matching subtree start? What check do you run from each candidate start?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]. The values 4, 1, 2 all appear under the 4. Why is the answer still false? Reply in 1-2 sentences.",
        answerKey:
          "In root the 2 has an extra child 0, so the subtree rooted at 4 is 4,1,2,0, which differs from subRoot. A subtree includes all descendants, so the comparison must reach the null leaves on both sides at once.",
        keyPoints: [
          { label: "The 2 has an extra child 0", anyOf: ["extra child", "child 0", "4,1,2,0"] },
          { label: "A subtree includes all descendants; match the nulls", anyOf: ["all descendants", "null leaves", "both sides", "entire subtree"] },
        ],
        hint: "Draw the subtree rooted at 4 in root. Does it end where subRoot ends?",
      },
      code: {
        functionName: SUBTREE.wrapper,
        ...nodeSignature(SUBTREE),
        starter: browserPart(subtreeStarters),
        nativeStarters: nativePart(subtreeStarters),
        reference: browserPart(subtreeRefs),
        tests: [
          { args: [[3, 4, 5, 1, 2], [4, 1, 2]], expected: true },
          { args: [[3, 4, 5, 1, 2, null, null, null, null, 0], [4, 1, 2]], expected: false },
          { args: [[1, 1], [1]], expected: true },
          { args: [[1], [1]], expected: true },
          { args: [[1, 2, 3], [2, 3]], expected: false },
          { args: [[3, 4, 5, 1, null, 2], [3, 1, 2]], expected: false, hidden: true },
          { args: [[12], [2]], expected: false, hidden: true },
          { args: [[1, null, 1, null, 1, null, 1, null, 1, null, 1, 2], [1, null, 1, 2]], expected: true, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal"],
    relatedCardIds: ["mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- build tree
  {
    id: "p-construct-binary-tree-from-preorder-and-inorder",
    title: "Construct Binary Tree from Preorder and Inorder Traversal",
    leetcodeSlug: "construct-binary-tree-from-preorder-and-inorder-traversal",
    difficulty: "medium",
    tags: ["tree_traversal", "hashing", "recursion"],
    statement: `Given two integer arrays \`preorder\` and \`inorder\`, where \`preorder\` is the preorder traversal of a binary tree and \`inorder\` is the inorder traversal of the same tree, construct and return the tree.

**Judge note:** The adapter converts the tree you return into a LeetCode-style level-order array (\`null\` for missing children) for comparison.`,
    examples: [
      { input: "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]", output: "[3,9,20,null,null,15,7]" },
      { input: "preorder = [-1], inorder = [-1]", output: "[-1]" },
    ],
    constraints: [
      "1 <= preorder.length <= 3000",
      "inorder.length == preorder.length",
      "-3000 <= preorder[i], inorder[i] <= 3000",
      "preorder and inorder consist of unique values.",
      "inorder is the inorder traversal of the same tree as preorder.",
    ],
    stages: {
      invariant: {
        prompt:
          "🏗️ Construct Binary Tree from Preorder and Inorder: what does preorder tell you, what does inorder tell you, and how do you avoid a linear search at every step? Reply in 1-2 sentences.",
        answerKey:
          "The first preorder value is the root, and its position in inorder splits the remaining values into the left subtree (before it) and the right subtree (after it). Precompute a hash map from value to inorder index so each split is O(1), giving O(n) overall.",
        keyPoints: [
          { label: "Preorder's first value is the root", anyOf: ["first preorder value is the root", "first value is the root", "is the root"] },
          { label: "The root's inorder position splits left and right", anyOf: ["splits", "left subtree", "before it"] },
          { label: "Hash map from value to inorder index", anyOf: ["hash map", "inorder index", "map from value"] },
        ],
        hint: "Preorder always lists a subtree's root first. Where does that root sit in the inorder list, and what lies on each side of it?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: preorder = [1,2], inorder = [1,2]. Is 2 the left or the right child of 1, and how does the inorder split show it? Reply in 1-2 sentences.",
        answerKey:
          "2 is the right child: 1 comes first in inorder, so its left part is empty and the 2 after it goes to the right subtree. The left subtree size equals the root's inorder index, here 0, which tells you how many preorder values belong to the left side.",
        keyPoints: [
          { label: "2 is the right child", anyOf: ["right child", "right subtree"] },
          { label: "The left part is empty (size = inorder index 0)", anyOf: ["left part is empty", "here 0", "subtree size", "empty"] },
        ],
        hint: "Find 1 in the inorder list. What comes before it?",
      },
      code: {
        functionName: BUILD_TREE.wrapper,
        ...nodeSignature(BUILD_TREE),
        starter: browserPart(buildTreeStarters),
        nativeStarters: nativePart(buildTreeStarters),
        reference: browserPart(buildTreeRefs),
        tests: [
          { args: [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]], expected: [3, 9, 20, null, null, 15, 7] },
          { args: [[-1], [-1]], expected: [-1] },
          { args: [[1, 2], [2, 1]], expected: [1, 2] },
          { args: [[1, 2], [1, 2]], expected: [1, null, 2] },
          { args: [[1, 2, 3], [3, 2, 1]], expected: [1, 2, null, 3] },
          { args: [[1, 2, 4, 5, 3, 6, 7], [4, 2, 5, 1, 6, 3, 7]], expected: [1, 2, 3, 4, 5, 6, 7], hidden: true },
          { args: [[3, 1, 2, 4], [1, 2, 3, 4]], expected: [3, 1, 4, null, 2], hidden: true },
          { args: [[5, 4, 3, 2, 1], [1, 2, 3, 4, 5]], expected: [5, 4, null, 3, null, 2, null, 1], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["tree_traversal", "recursion"],
    relatedCardIds: ["mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- kth smallest
  {
    id: "p-kth-smallest-element-in-a-bst",
    title: "Kth Smallest Element in a BST",
    leetcodeSlug: "kth-smallest-element-in-a-bst",
    difficulty: "medium",
    tags: ["bst", "tree_traversal", "dfs"],
    statement: `Given the \`root\` of a binary search tree and an integer \`k\`, return the \`k\`th smallest value (**1-indexed**) among all the values of the nodes in the tree.

${TREE_NOTE}`,
    examples: [
      { input: "root = [3,1,4,null,2], k = 1", output: "1" },
      { input: "root = [5,3,6,2,4,null,null,1], k = 3", output: "3" },
    ],
    constraints: ["The number of nodes in the tree is n.", "1 <= k <= n <= 10^4", "0 <= Node.val <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "🔢 Kth Smallest Element in a BST: which traversal visits BST values in sorted order, and when can you stop? Reply in 1-2 sentences.",
        answerKey:
          "An inorder traversal (left, node, right) visits a BST in ascending order, so count nodes as you visit them and return the value of the kth one. With an iterative stack you stop early, taking O(h + k) time.",
        keyPoints: [
          { label: "Inorder traversal", anyOf: ["inorder", "in-order", "left, node, right"] },
          { label: "Visits values in ascending order", anyOf: ["ascending", "sorted order", "increasing order"] },
          { label: "Stop at the kth visited node", anyOf: ["kth one", "stop early", "count nodes"] },
        ],
        hint: "In a BST, everything left of a node is smaller and everything right is larger. Which visiting order does that produce?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: root = [5,3,6,2,4,null,null,1], k = 3. A classmate walks right, node, left. What do they return, and what is correct? Reply in 1-2 sentences.",
        answerKey:
          "Right, node, left visits values in descending order, 6,5,4, so they return 4, the 3rd largest. The correct order is left, node, right, which visits 1,2,3, so the answer is 3.",
        keyPoints: [
          { label: "Reversed order returns 4 (3rd largest)", anyOf: ["descending", "return 4", "3rd largest"] },
          { label: "Left, node, right gives 3", anyOf: ["left, node, right", "answer is 3", "1,2,3"] },
        ],
        hint: "List the values in the order that walk visits them. Which one is third?",
      },
      code: {
        functionName: KTH.wrapper,
        ...nodeSignature(KTH),
        starter: browserPart(kthStarters),
        nativeStarters: nativePart(kthStarters),
        reference: browserPart(kthRefs),
        tests: [
          { args: [[3, 1, 4, null, 2], 1], expected: 1 },
          { args: [[5, 3, 6, 2, 4, null, null, 1], 3], expected: 3 },
          { args: [[1], 1], expected: 1 },
          { args: [[2, 1, 3], 3], expected: 3 },
          { args: [[5, 3, 6, 2, 4, null, null, 1], 6], expected: 6 },
          { args: [[3, 1, 4, null, 2], 4], expected: 4, hidden: true },
          { args: [[41, 20, 65, 11, 29, 50, 91, null, null, null, 32, null, null, 72, 99], 5], expected: 41, hidden: true },
          { args: [[4, 2, 6, 1, 3, 5, 7], 4], expected: 4, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bst"],
    relatedCardIds: ["mc-bst-kth-smallest-inorder", "mc-tree-dfs-orders"],
  },

  // ---------------------------------------------------------------- LCA of a BST
  {
    id: "p-lowest-common-ancestor-of-a-bst",
    title: "Lowest Common Ancestor of a Binary Search Tree",
    leetcodeSlug: "lowest-common-ancestor-of-a-binary-search-tree",
    difficulty: "medium",
    tags: ["bst", "tree_traversal"],
    statement: `Given a binary search tree and two of its nodes \`p\` and \`q\`, return their **lowest common ancestor** (LCA): the lowest node that has both \`p\` and \`q\` as descendants, where a node counts as a descendant of itself.

**Judge note:** The judge passes the tree as a LeetCode-style level-order array (\`null\` for missing children), and the starter's adapter builds real \`TreeNode\`s. Unlike LeetCode, \`p\` and \`q\` are passed as the **values** of the two nodes, and your function returns the **value** of their LCA.`,
    examples: [
      { input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8", output: "6" },
      { input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4", output: "2", explanation: "A node can be an ancestor of itself." },
      { input: "root = [2,1], p = 2, q = 1", output: "2" },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [2, 10^5].",
      "-10^9 <= Node.val <= 10^9",
      "All Node.val are unique.",
      "p != q, and both p and q exist in the BST.",
    ],
    stages: {
      invariant: {
        prompt:
          "🌿 Lowest Common Ancestor of a BST: starting at the root, how do the values of p and q tell you which way to go, and when do you stop? Reply in 1-2 sentences.",
        answerKey:
          "If both p and q are smaller than the node, go left; if both are larger, go right. Otherwise they split here, or one of them equals the node, so the current node is the LCA, found in O(h) time.",
        keyPoints: [
          { label: "Both smaller go left, both larger go right", anyOf: ["both are larger", "go left", "go right", "both smaller"] },
          { label: "The split point is the LCA", anyOf: ["split here", "current node is the lca", "they split"] },
        ],
        hint: "At the root, if p and q are on the same side, can the LCA be the root? If they are on different sides, can it be anything else?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4. A classmate answers 6 because it is an ancestor of both. What is the correct answer, and why? Reply in 1-2 sentences.",
        answerKey:
          "The answer is 2: a node can be an ancestor of itself, and 4 is in 2's right subtree, so 2 is the lowest common ancestor. At 6 both values are smaller, so the walk moves left to 2, where p equals the node and it stops.",
        keyPoints: [
          { label: "The answer is 2", anyOf: ["answer is 2", "2 is the lowest"] },
          { label: "A node is its own ancestor", anyOf: ["ancestor of itself", "own ancestor", "p equals the node"] },
        ],
        hint: "Is 6 the lowest node that has both 2 and 4 underneath (or equal to it)?",
      },
      code: {
        functionName: LCA.wrapper,
        ...nodeSignature(LCA),
        starter: browserPart(lcaStarters),
        nativeStarters: nativePart(lcaStarters),
        reference: browserPart(lcaRefs),
        tests: [
          { args: [LCA_BOARD, 2, 8], expected: 6 },
          { args: [LCA_BOARD, 2, 4], expected: 2 },
          { args: [[2, 1], 2, 1], expected: 2 },
          { args: [LCA_BOARD, 3, 5], expected: 4 },
          { args: [LCA_BOARD, 7, 9], expected: 8 },
          { args: [LCA_BOARD, 0, 5], expected: 2, hidden: true },
          { args: [[2, 1, 3], 3, 1], expected: 2, hidden: true },
          { args: [LCA_BOARD, 3, 7], expected: 6, hidden: true },
          { args: [[5, 3, 6, 2, 4, null, null, 1], 1, 4], expected: 3, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bst"],
    relatedCardIds: ["mc-bst-lca-split", "mc-lca-binary-tree"],
  },

  // ---------------------------------------------------------------- word dictionary
  {
    id: "p-design-add-and-search-words",
    title: "Design Add and Search Words Data Structure",
    leetcodeSlug: "design-add-and-search-words-data-structure",
    difficulty: "medium",
    tags: ["trie", "design", "dfs", "string"],
    statement: `Design a data structure that supports adding new words and checking whether a string matches any previously added word. Implement the \`WordDictionary\` class:

- \`addWord(word)\` adds \`word\` to the data structure.
- \`search(word)\` returns \`true\` if any added word matches \`word\`, and \`false\` otherwise. \`word\` may contain dots \`'.'\`, and a dot matches **any one letter**.

**Judge note:** The judge replays a list of operations on one \`WordDictionary\` through the starter's \`runWordDictionary\` adapter. \`addWord\` records \`null\`.`,
    examples: [
      {
        input:
          'operations = ["addWord","addWord","addWord","search","search","search","search"], words = ["bad","dad","mad","pad","bad",".ad","b.."]',
        output: "[null,null,null,false,true,true,true]",
      },
    ],
    constraints: [
      "1 <= word.length <= 25",
      "word in addWord consists of lowercase English letters.",
      "word in search consists of '.' or lowercase English letters.",
      "There will be at most 2 dots in word for search queries.",
      "At most 10^4 calls will be made to addWord and search.",
    ],
    stages: {
      invariant: {
        prompt:
          "🔎 Design Add and Search Words: in a trie, how does search handle a '.' character, and what must be true when the word runs out? Reply in 1-2 sentences.",
        answerKey:
          "A letter follows its one child, but a '.' branches into every child at that depth with a DFS, returning true if any branch matches the rest of the word. When the word runs out, the current node must have its end-of-word flag set.",
        keyPoints: [
          { label: "A dot tries every child", anyOf: ["every child", "each child", "all children", "branches into"] },
          { label: "The end-of-word flag must be set at the end", anyOf: ["end-of-word", "end of word", "word flag"] },
        ],
        hint: "A plain trie search follows one path. How many paths does a wildcard open up?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: addWord(\"apple\"), then search(\"app..\") and search(\"app.\"). What should each one return, and why? Reply in 1-2 sentences.",
        answerKey:
          "search(\"app..\") is true because each dot matches one letter, l then e, ending at the end of apple. search(\"app.\") is false: the walk reaches the l node, but no word ends there, so its end-of-word flag is unset.",
        keyPoints: [
          { label: "app.. is true (one letter per dot)", anyOf: ["one letter", "each dot", "is true"] },
          { label: "app. is false: no word ends at that node", anyOf: ["no word ends", "flag is unset", "is false"] },
        ],
        hint: "Count the letters. A dot matches exactly one character, not zero or many.",
      },
      code: {
        functionName: "runWordDictionary",
        params: ["operations", "words"],
        signature: { params: ["string[]", "string[]"], returns: "list<bool?>" },
        nativeStarters: WORD_DICT_STARTERS,
        starter: {
          javascript: `class WordDictionary {
  constructor() {
    // Your code here
  }

  /** @param {string} word */
  addWord(word) {}

  /**
   * '.' matches any single letter.
   * @param {string} word
   * @return {boolean}
   */
  search(word) {
    return false;
  }
}

// ${WORD_DICT_ADAPTER_MARK}
function runWordDictionary(operations, words) {
  const dictionary = new WordDictionary();
  return operations.map((op, i) => {
    const result = dictionary[op](words[i]);
    return result === undefined ? null : result;
  });
}
`,
          python: `class WordDictionary:
    def __init__(self):
        # Your code here
        pass

    def addWord(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        """'.' matches any single letter."""
        return False


# ${WORD_DICT_ADAPTER_MARK}
def runWordDictionary(operations: List[str], words: List[str]) -> List[Optional[bool]]:
    dictionary = WordDictionary()
    return [getattr(dictionary, op)(word) for op, word in zip(operations, words)]
`,
        },
        reference: {
          javascript: `class WordDictionary {
  constructor() {
    this.root = { children: new Map(), end: false };
  }

  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), end: false });
      node = node.children.get(ch);
    }
    node.end = true;
  }

  search(word) {
    const match = (i, node) => {
      if (i === word.length) return node.end;
      if (word[i] !== ".") {
        const child = node.children.get(word[i]);
        return child !== undefined && match(i + 1, child);
      }
      for (const child of node.children.values()) if (match(i + 1, child)) return true;
      return false;
    };
    return match(0, this.root);
  }
}

function runWordDictionary(operations, words) {
  const dictionary = new WordDictionary();
  return operations.map((op, i) => {
    const result = dictionary[op](words[i]);
    return result === undefined ? null : result;
  });
}
`,
          python: `from typing import List, Optional


class WordDictionary:
    def __init__(self):
        self.root = {}

    def addWord(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True

    def search(self, word: str) -> bool:
        def match(i, node):
            if i == len(word):
                return "$" in node
            ch = word[i]
            if ch != ".":
                return ch in node and match(i + 1, node[ch])
            return any(match(i + 1, child) for key, child in node.items() if key != "$")

        return match(0, self.root)


def runWordDictionary(operations: List[str], words: List[str]) -> List[Optional[bool]]:
    dictionary = WordDictionary()
    return [getattr(dictionary, op)(word) for op, word in zip(operations, words)]
`,
        },
        tests: [
          {
            args: [
              ["addWord", "addWord", "addWord", "search", "search", "search", "search"],
              ["bad", "dad", "mad", "pad", "bad", ".ad", "b.."],
            ],
            expected: [null, null, null, false, true, true, true],
          },
          { args: [["addWord", "search", "search", "search"], ["a", "a", ".", "aa"]], expected: [null, true, true, false] },
          { args: [["search", "addWord", "search"], ["a", "a", "."]], expected: [false, null, true] },
          {
            args: [
              ["addWord", "addWord", "search", "search", "search"],
              ["at", "and", "a.", "an.", "a"],
            ],
            expected: [null, null, true, true, false],
          },
          { args: [["addWord", "search", "search", "search"], ["apple", "app..", "app.", "....."]], expected: [null, true, false, true] },
          {
            args: [
              ["addWord", "addWord", "search", "search", "search", "search"],
              ["ab", "abc", "ab.", "a.", "..", "...."],
            ],
            expected: [null, null, true, true, true, false],
            hidden: true,
          },
          { args: [["addWord", "search", "search"], ["xyz", "...", "x.z."]], expected: [null, true, false], hidden: true },
          { args: [["addWord", "addWord", "search", "search"], ["dot", "dog", "..t", "d.g"]], expected: [null, null, true, true], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["trie"],
    relatedCardIds: ["mc-trie-basics"],
  },

  // ---------------------------------------------------------------- word search II
  {
    id: "p-word-search-ii",
    title: "Word Search II",
    leetcodeSlug: "word-search-ii",
    difficulty: "hard",
    tags: ["trie", "backtracking", "matrix", "dfs"],
    statement: `Given an \`m x n\` \`board\` of characters and a list of strings \`words\`, return **all** words that appear on the board, in any order.

Each word must be built from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same cell may not be used more than once in a word.`,
    examples: [
      {
        input: `board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]`,
        output: '["eat","oath"]',
      },
      { input: `board = [["a","b"],["c","d"]], words = ["abcb"]`, output: "[]" },
    ],
    constraints: [
      "m == board.length, n == board[i].length",
      "1 <= m, n <= 12",
      "board[i][j] is a lowercase English letter.",
      "1 <= words.length <= 3 * 10^4",
      "1 <= words[i].length <= 10",
      "words[i] consists of lowercase English letters, and all the strings of words are unique.",
    ],
    stages: {
      invariant: {
        prompt:
          "🧩 Word Search II: why build a trie from the words instead of running Word Search once per word, and how does the trie prune the grid DFS? Reply in 1-2 sentences.",
        answerKey:
          "One DFS from each cell walks the board and the trie together, so all words sharing a prefix are searched at once. The DFS stops as soon as the next letter has no child in the trie, and a node that stores a word adds it to the result.",
        keyPoints: [
          { label: "Shared prefixes: all words searched at once", anyOf: ["all words", "at once", "sharing a prefix", "shared prefix"] },
          { label: "Prune when there is no trie child", anyOf: ["no child", "prune", "stops as soon"] },
        ],
        hint: "Many words share their first few letters. How can one walk over the grid test all of them together?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: board = [[\"a\",\"a\"]], words = [\"a\",\"aa\",\"aaa\"]. What should be returned, and which two bugs give a wrong answer here? Reply in 1-2 sentences.",
        answerKey:
          "Return a and aa: aaa would need a cell twice, so cells must be marked visited during the DFS. Without removing a found word from the trie, a and aa are found again from the second cell, creating duplicates.",
        keyPoints: [
          { label: "aaa would reuse a cell: mark visited", anyOf: ["visited", "cell twice", "reuse"] },
          { label: "Remove found words to avoid duplicates", anyOf: ["duplicates", "removing a found word", "found again"] },
        ],
        hint: "Start a DFS from each of the two cells. What does each one find?",
      },
      code: {
        functionName: "findWords",
        params: ["board", "words"],
        signature: { params: ["char[][]", "string[]"], returns: "string[]" },
        starter: {
          javascript: `/**
 * @param {string[][]} board
 * @param {string[]} words
 * @return {string[]}
 */
function findWords(board, words) {
  // Your code here
  return [];
}
`,
          python: `def findWords(board: List[List[str]], words: List[str]) -> List[str]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function findWords(board, words) {
  const root = { children: new Map(), word: null };
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), word: null });
      node = node.children.get(ch);
    }
    node.word = w;
  }
  const found = [];
  const dfs = (r, c, parent) => {
    if (r < 0 || c < 0 || r >= board.length || c >= board[r].length) return;
    const ch = board[r][c];
    const node = parent.children.get(ch);
    if (!node) return;
    if (node.word !== null) {
      found.push(node.word);
      node.word = null; // report each word once
    }
    board[r][c] = "#"; // visited on this path
    dfs(r + 1, c, node);
    dfs(r - 1, c, node);
    dfs(r, c + 1, node);
    dfs(r, c - 1, node);
    board[r][c] = ch;
  };
  for (let r = 0; r < board.length; r++) for (let c = 0; c < board[r].length; c++) dfs(r, c, root);
  return found;
}
`,
          python: `from typing import List


def findWords(board: List[List[str]], words: List[str]) -> List[str]:
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w
    found = []
    rows, cols = len(board), len(board[0])

    def dfs(r, c, parent):
        if r < 0 or c < 0 or r >= rows or c >= cols:
            return
        ch = board[r][c]
        node = parent.get(ch)
        if node is None:
            return
        if "$" in node:
            found.append(node.pop("$"))
        board[r][c] = "#"
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            dfs(nr, nc, node)
        board[r][c] = ch

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)
    return found
`,
        },
        tests: [
          { args: [OATH_BOARD, ["oath", "pea", "eat", "rain"]], expected: ["eat", "oath"] },
          { args: [[["a", "b"], ["c", "d"]], ["abcb"]], expected: [] },
          { args: [[["a"]], ["a", "b"]], expected: ["a"] },
          {
            args: [[["a", "b"], ["c", "d"]], ["ab", "cb", "ad", "bd", "ac", "ca", "da", "bc", "db", "adcb", "dabc", "abb", "acb"]],
            expected: ["ab", "ac", "bd", "ca", "db"],
          },
          { args: [[["a", "a"]], ["aaa", "aa", "a"]], expected: ["aa", "a"] },
          {
            args: [
              [
                ["o", "a", "b", "n"],
                ["o", "t", "a", "e"],
                ["a", "h", "k", "r"],
                ["a", "f", "l", "v"],
              ],
              ["oa", "oaa"],
            ],
            expected: ["oa", "oaa"],
            hidden: true,
          },
          {
            args: [
              [
                ["a", "b", "c"],
                ["a", "e", "d"],
                ["a", "f", "g"],
              ],
              ["abcdefg", "gfedcbaaa", "eaabcdgfa", "befa", "dgc", "ade"],
            ],
            expected: ["abcdefg", "befa", "eaabcdgfa", "gfedcbaaa"],
            hidden: true,
          },
          {
            args: [
              [
                ["a", "b"],
                ["a", "a"],
              ],
              ["aba", "baa", "bab", "aaab", "aaa", "aaaa", "aaba"],
            ],
            expected: ["aaa", "aaab", "aaba", "aba", "baa"],
            hidden: true,
          },
        ],
        compare: "unordered",
      },
    },
    weakTags: ["trie", "backtracking"],
    relatedCardIds: ["mc-trie-word-search-ii", "mc-trie-basics"],
  },
];

/** Java / C++ / Go / TypeScript reference solutions for this batch, by problem id. */
export const NATIVE_REFERENCES_H: Record<string, Record<NativeLanguage, string>> = {
  "p-same-tree": nativePart(sameTreeRefs),
  "p-invert-binary-tree": nativePart(invertRefs),
  "p-binary-tree-maximum-path-sum": nativePart(maxPathRefs),
  "p-serialize-and-deserialize-binary-tree": withGoImports(nativePart(codecRefs), ["strconv", "strings"]),
  "p-subtree-of-another-tree": nativePart(subtreeRefs),
  "p-construct-binary-tree-from-preorder-and-inorder": nativePart(buildTreeRefs),
  "p-kth-smallest-element-in-a-bst": nativePart(kthRefs),
  "p-lowest-common-ancestor-of-a-bst": nativePart(lcaRefs),
  "p-design-add-and-search-words": WORD_DICT_REFERENCES,
  "p-word-search-ii": WORD_SEARCH_NATIVE,
};
