import type { NativeLanguage } from "../judge/native";

/**
 * Starters for node-based problems in the server-compiled languages. The judge passes
 * JSON, so each starter ships a marked adapter that builds real nodes around the
 * function the user actually implements (mirroring the JS / Python starters).
 */
type Starters = Record<NativeLanguage, string>;

export const REMOVE_NTH_STARTERS: Starters = {
  java: `class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        // Your code here
        return head;
    }

    // Judge adapter: arrays in and out. No need to edit below.
    public int[] removeNth(int[] values, int n) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        List<Integer> out = new ArrayList<>();
        for (ListNode node = removeNthFromEnd(head, n); node != null; node = node.next) out.add(node.val);
        return out.stream().mapToInt(Integer::intValue).toArray();
    }
}
`,
  cpp: `struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        // Your code here
        return head;
    }

    // Judge adapter: arrays in and out. No need to edit below.
    vector<int> removeNth(vector<int>& values, int n) {
        ListNode* head = nullptr;
        for (int i = (int)values.size() - 1; i >= 0; i--) head = new ListNode(values[i], head);
        vector<int> out;
        for (ListNode* node = removeNthFromEnd(head, n); node; node = node->next) out.push_back(node->val);
        return out;
    }
};
`,
  go: `type ListNode struct {
	Val  int
	Next *ListNode
}

func removeNthFromEnd(head *ListNode, n int) *ListNode {
	// Your code here
	return head
}

// Judge adapter: slices in and out. No need to edit below.
func removeNth(values []int, n int) []int {
	var head *ListNode
	for i := len(values) - 1; i >= 0; i-- {
		head = &ListNode{Val: values[i], Next: head}
	}
	out := []int{}
	for node := removeNthFromEnd(head, n); node != nil; node = node.Next {
		out = append(out, node.Val)
	}
	return out
}
`,
  typescript: `class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  // Your code here
  return head;
}

// Judge adapter: arrays in and out. No need to edit below.
function removeNth(values: number[], n: number): number[] {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  const out: number[] = [];
  for (let node = removeNthFromEnd(head, n); node; node = node.next) out.push(node.val);
  return out;
}
`,
};

export const LEVEL_ORDER_STARTERS: Starters = {
  java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        // Your code here
        return new ArrayList<>();
    }

    // Judge adapter: builds the tree from a level-order array. No need to edit below.
    public List<List<Integer>> levelOrderFromValues(Integer[] values) {
        if (values.length == 0 || values[0] == null) return levelOrder(null);
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
        return levelOrder(root);
    }
}
`,
  cpp: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        // Your code here
        return {};
    }

    // Judge adapter: builds the tree from a level-order array. No need to edit below.
    vector<vector<int>> levelOrderFromValues(vector<optional<int>>& values) {
        if (values.empty() || !values[0]) return levelOrder(nullptr);
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
        return levelOrder(root);
    }
};
`,
  go: `type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}

func levelOrder(root *TreeNode) [][]int {
	// Your code here
	return nil
}

// Judge adapter: builds the tree from a level-order slice. No need to edit below.
func levelOrderFromValues(values []*int) [][]int {
	if len(values) == 0 || values[0] == nil {
		return levelOrder(nil)
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
	return levelOrder(root)
}
`,
  typescript: `class TreeNode {
  val: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(val = 0) {
    this.val = val;
  }
}

function levelOrder(root: TreeNode | null): number[][] {
  // Your code here
  return [];
}

// Judge adapter: builds the tree from a level-order array. No need to edit below.
function levelOrderFromValues(values: (number | null)[]): number[][] {
  if (values.length === 0 || values[0] === null) return levelOrder(null);
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
  return levelOrder(root);
}
`,
};

export const TRIE_STARTERS: Starters = {
  java: `class Trie {
    public Trie() {
        // Your code here
    }

    public void insert(String word) {
    }

    public boolean search(String word) {
        return false;
    }

    public boolean startsWith(String prefix) {
        return false;
    }
}

class Solution {
    // Judge adapter: replays the operations on one Trie. No need to edit below.
    public List<Boolean> runTrie(String[] operations, String[] words) {
        Trie trie = new Trie();
        List<Boolean> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert": trie.insert(words[i]); out.add(null); break;
                case "search": out.add(trie.search(words[i])); break;
                default: out.add(trie.startsWith(words[i]));
            }
        }
        return out;
    }
}
`,
  cpp: `class Trie {
public:
    Trie() {
        // Your code here
    }

    void insert(string word) {
    }

    bool search(string word) {
        return false;
    }

    bool startsWith(string prefix) {
        return false;
    }
};

class Solution {
public:
    // Judge adapter: replays the operations on one Trie. No need to edit below.
    vector<optional<bool>> runTrie(vector<string>& operations, vector<string>& words) {
        Trie trie;
        vector<optional<bool>> out;
        for (size_t i = 0; i < operations.size(); i++) {
            if (operations[i] == "insert") { trie.insert(words[i]); out.push_back(nullopt); }
            else if (operations[i] == "search") out.push_back(trie.search(words[i]));
            else out.push_back(trie.startsWith(words[i]));
        }
        return out;
    }
};
`,
  go: `type Trie struct {
	// Your fields here
}

func Constructor() Trie {
	return Trie{}
}

func (t *Trie) Insert(word string) {
}

func (t *Trie) Search(word string) bool {
	return false
}

func (t *Trie) StartsWith(prefix string) bool {
	return false
}

// Judge adapter: replays the operations on one Trie. No need to edit below.
func runTrie(operations []string, words []string) []*bool {
	trie := Constructor()
	out := make([]*bool, len(operations))
	for i, op := range operations {
		switch op {
		case "insert":
			trie.Insert(words[i])
		case "search":
			found := trie.Search(words[i])
			out[i] = &found
		default:
			found := trie.StartsWith(words[i])
			out[i] = &found
		}
	}
	return out
}
`,
  typescript: `class Trie {
  constructor() {
    // Your code here
  }

  insert(word: string): void {}

  search(word: string): boolean {
    return false;
  }

  startsWith(prefix: string): boolean {
    return false;
  }
}

// Judge adapter: replays the operations on one Trie. No need to edit below.
function runTrie(operations: string[], words: string[]): (boolean | null)[] {
  const trie = new Trie();
  return operations.map((op, i) => {
    const result = (trie as any)[op](words[i]);
    return result === undefined ? null : result;
  });
}
`,
};
