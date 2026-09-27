import { beforeAll, describe, expect, it } from "vitest";
import { getProblem, listProblems } from "../src/content";
import { judgeResults, nativeStarter, testArgsJson, type NativeLanguage } from "../src/judge";
import { NODE_REFERENCES } from "../src/content/problems-c";
import { nativeToolchains, runNativeTests } from "../src/judge/native-runner";

const TIMEOUT = 120_000;
let available: Record<NativeLanguage, boolean> = { java: false, cpp: false, go: false, typescript: false };

beforeAll(async () => {
  available = await nativeToolchains();
}, TIMEOUT);

async function judge(problemId: string, language: NativeLanguage, code: string) {
  const problem = getProblem(problemId)!;
  const stage = problem.stages.code;
  const raw = await runNativeTests(language, code, stage, testArgsJson(stage));
  return judgeResults(stage, raw);
}

function fill(starter: string, stub: string, body: string): string {
  if (!starter.includes(stub)) throw new Error(`stub not found: ${stub}`);
  return starter.replace(stub, body);
}

function replaceClass(starter: string, marker: string, impl: string): string {
  return impl + starter.slice(starter.indexOf(marker));
}

const starterOf = (id: string, language: NativeLanguage) => nativeStarter(getProblem(id)!.stages.code, language);

const REFERENCES: Record<NativeLanguage, Record<string, () => string>> = {
  java: {
    "p-minimum-window-substring": () => `class Solution {
    public String minWindow(String s, String t) {
        int[] need = new int[128];
        for (char c : t.toCharArray()) need[c]++;
        int missing = t.length(), left = 0, bestStart = 0, bestLen = Integer.MAX_VALUE;
        for (int right = 0; right < s.length(); right++) {
            if (need[s.charAt(right)]-- > 0) missing--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
                if (++need[s.charAt(left++)] > 0) missing++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
    }
}`,
    "p-3sum": () => `class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int lo = i + 1, hi = nums.length - 1;
            while (lo < hi) {
                int sum = nums[i] + nums[lo] + nums[hi];
                if (sum < 0) lo++;
                else if (sum > 0) hi--;
                else {
                    out.add(Arrays.asList(nums[i], nums[lo], nums[hi]));
                    while (lo < hi && nums[lo] == nums[lo + 1]) lo++;
                    while (lo < hi && nums[hi] == nums[hi - 1]) hi--;
                    lo++; hi--;
                }
            }
        }
        return out;
    }
}`,
    "p-number-of-islands": () => `class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[r].length; c++)
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
        return count;
    }
    private void sink(char[][] g, int r, int c) {
        if (r < 0 || c < 0 || r >= g.length || c >= g[r].length || g[r][c] != '1') return;
        g[r][c] = '0';
        sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
    }
}`,
    "p-merge-intervals": () => `class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>();
        for (int[] iv : intervals) {
            if (!out.isEmpty() && out.get(out.size() - 1)[1] >= iv[0]) {
                int[] last = out.get(out.size() - 1);
                last[1] = Math.max(last[1], iv[1]);
            } else out.add(new int[] { iv[0], iv[1] });
        }
        return out.toArray(new int[0][]);
    }
}`,
    "p-valid-parentheses": () => `class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') stack.push(c);
            else {
                if (stack.isEmpty()) return false;
                char open = stack.pop();
                if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{')) return false;
            }
        }
        return stack.isEmpty();
    }
}`,
    "p-remove-nth-node-from-end": () =>
      fill(
        starterOf("p-remove-nth-node-from-end", "java"),
        "        // Your code here\n        return head;",
        `        ListNode dummy = new ListNode(0, head), fast = dummy, slow = dummy;
        for (int i = 0; i < n; i++) fast = fast.next;
        while (fast.next != null) { fast = fast.next; slow = slow.next; }
        slow.next = slow.next.next;
        return dummy.next;`,
      ),
    "p-binary-tree-level-order-traversal": () =>
      fill(
        starterOf("p-binary-tree-level-order-traversal", "java"),
        "        // Your code here\n        return new ArrayList<>();",
        `        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            List<Integer> level = new ArrayList<>();
            for (int k = q.size(); k > 0; k--) {
                TreeNode node = q.poll();
                level.add(node.val);
                if (node.left != null) q.add(node.left);
                if (node.right != null) q.add(node.right);
            }
            out.add(level);
        }
        return out;`,
      ),
    "p-implement-trie": () =>
      replaceClass(
        starterOf("p-implement-trie", "java"),
        "class Solution",
        `class Trie {
    private final Map<Character, Trie> children = new HashMap<>();
    private boolean end;
    public void insert(String word) { Trie node = this; for (char c : word.toCharArray()) node = node.children.computeIfAbsent(c, k -> new Trie()); node.end = true; }
    private Trie walk(String s) { Trie node = this; for (char c : s.toCharArray()) { node = node.children.get(c); if (node == null) return null; } return node; }
    public boolean search(String word) { Trie node = walk(word); return node != null && node.end; }
    public boolean startsWith(String prefix) { return walk(prefix) != null; }
}

`,
      ),
  },
  cpp: {
    "p-minimum-window-substring": () => `class Solution {
public:
    string minWindow(string s, string t) {
        vector<int> need(128, 0);
        for (char c : t) need[c]++;
        int missing = t.size(), left = 0, bestStart = 0, bestLen = INT_MAX;
        for (int right = 0; right < (int)s.size(); right++) {
            if (need[s[right]]-- > 0) missing--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
                if (++need[s[left++]] > 0) missing++;
            }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
    }
};`,
    "p-3sum": () => `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> out;
        int n = nums.size();
        for (int i = 0; i + 2 < n; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int lo = i + 1, hi = n - 1;
            while (lo < hi) {
                int sum = nums[i] + nums[lo] + nums[hi];
                if (sum < 0) lo++;
                else if (sum > 0) hi--;
                else {
                    out.push_back({nums[i], nums[lo], nums[hi]});
                    while (lo < hi && nums[lo] == nums[lo + 1]) lo++;
                    while (lo < hi && nums[hi] == nums[hi - 1]) hi--;
                    lo++; hi--;
                }
            }
        }
        return out;
    }
};`,
    "p-number-of-islands": () => `#include <bits/stdc++.h>

class Solution {
    void sink(vector<vector<char>>& g, int r, int c) {
        if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[r].size() || g[r][c] != '1') return;
        g[r][c] = '0';
        sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
    }
public:
    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int r = 0; r < (int)grid.size(); r++)
            for (int c = 0; c < (int)grid[r].size(); c++)
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
        return count;
    }
};`,
    "p-merge-intervals": () => `class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        vector<vector<int>> out;
        for (auto& iv : intervals) {
            if (!out.empty() && out.back()[1] >= iv[0]) out.back()[1] = max(out.back()[1], iv[1]);
            else out.push_back(iv);
        }
        return out;
    }
};`,
    "p-valid-parentheses": () => `class Solution {
public:
    bool isValid(string s) {
        string stack;
        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') stack.push_back(c);
            else {
                if (stack.empty()) return false;
                char open = stack.back();
                stack.pop_back();
                if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{')) return false;
            }
        }
        return stack.empty();
    }
};`,
    "p-remove-nth-node-from-end": () =>
      fill(
        starterOf("p-remove-nth-node-from-end", "cpp"),
        "        // Your code here\n        return head;",
        `        ListNode dummy(0, head);
        ListNode* fast = &dummy;
        ListNode* slow = &dummy;
        for (int i = 0; i < n; i++) fast = fast->next;
        while (fast->next) { fast = fast->next; slow = slow->next; }
        slow->next = slow->next->next;
        return dummy.next;`,
      ),
    "p-binary-tree-level-order-traversal": () =>
      fill(
        starterOf("p-binary-tree-level-order-traversal", "cpp"),
        "        // Your code here\n        return {};",
        `        vector<vector<int>> out;
        if (!root) return out;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            vector<int> level;
            for (int k = q.size(); k > 0; k--) {
                TreeNode* node = q.front();
                q.pop();
                level.push_back(node->val);
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            out.push_back(level);
        }
        return out;`,
      ),
    "p-implement-trie": () =>
      replaceClass(
        starterOf("p-implement-trie", "cpp"),
        "class Solution",
        `class Trie {
    struct Node { Node* next[26] = {}; bool end = false; };
    Node* root = new Node();
    Node* walk(const string& s) { Node* n = root; for (char c : s) { n = n->next[c - 'a']; if (!n) return nullptr; } return n; }
public:
    void insert(string word) { Node* n = root; for (char c : word) { if (!n->next[c - 'a']) n->next[c - 'a'] = new Node(); n = n->next[c - 'a']; } n->end = true; }
    bool search(string word) { Node* n = walk(word); return n && n->end; }
    bool startsWith(string prefix) { return walk(prefix) != nullptr; }
};

`,
      ),
  },
  go: {
    "p-minimum-window-substring": () => `func minWindow(s string, t string) string {
	need := make([]int, 128)
	for i := 0; i < len(t); i++ {
		need[t[i]]++
	}
	missing, left, bestStart, bestLen := len(t), 0, 0, -1
	for right := 0; right < len(s); right++ {
		if need[s[right]] > 0 {
			missing--
		}
		need[s[right]]--
		for missing == 0 {
			if bestLen < 0 || right-left+1 < bestLen {
				bestLen, bestStart = right-left+1, left
			}
			need[s[left]]++
			if need[s[left]] > 0 {
				missing++
			}
			left++
		}
	}
	if bestLen < 0 {
		return ""
	}
	return s[bestStart : bestStart+bestLen]
}`,
    "p-3sum": () => `import "sort"

func threeSum(nums []int) [][]int {
	sort.Ints(nums)
	out := [][]int{}
	for i := 0; i+2 < len(nums); i++ {
		if i > 0 && nums[i] == nums[i-1] {
			continue
		}
		lo, hi := i+1, len(nums)-1
		for lo < hi {
			sum := nums[i] + nums[lo] + nums[hi]
			if sum < 0 {
				lo++
			} else if sum > 0 {
				hi--
			} else {
				out = append(out, []int{nums[i], nums[lo], nums[hi]})
				for lo < hi && nums[lo] == nums[lo+1] {
					lo++
				}
				for lo < hi && nums[hi] == nums[hi-1] {
					hi--
				}
				lo++
				hi--
			}
		}
	}
	return out
}`,
    "p-number-of-islands": () => `func numIslands(grid [][]byte) int {
	var sink func(r, c int)
	sink = func(r, c int) {
		if r < 0 || c < 0 || r >= len(grid) || c >= len(grid[r]) || grid[r][c] != '1' {
			return
		}
		grid[r][c] = '0'
		sink(r+1, c)
		sink(r-1, c)
		sink(r, c+1)
		sink(r, c-1)
	}
	count := 0
	for r := range grid {
		for c := range grid[r] {
			if grid[r][c] == '1' {
				count++
				sink(r, c)
			}
		}
	}
	return count
}`,
    "p-merge-intervals": () => `import "sort"

func merge(intervals [][]int) [][]int {
	sort.Slice(intervals, func(a, b int) bool { return intervals[a][0] < intervals[b][0] })
	out := [][]int{}
	for _, iv := range intervals {
		if len(out) > 0 && out[len(out)-1][1] >= iv[0] {
			if iv[1] > out[len(out)-1][1] {
				out[len(out)-1][1] = iv[1]
			}
		} else {
			out = append(out, []int{iv[0], iv[1]})
		}
	}
	return out
}`,
    "p-valid-parentheses": () => `func isValid(s string) bool {
	pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
	stack := []rune{}
	for _, c := range s {
		if open, closing := pairs[c]; closing {
			if len(stack) == 0 || stack[len(stack)-1] != open {
				return false
			}
			stack = stack[:len(stack)-1]
		} else {
			stack = append(stack, c)
		}
	}
	return len(stack) == 0
}`,
    "p-remove-nth-node-from-end": () =>
      fill(
        starterOf("p-remove-nth-node-from-end", "go"),
        "\t// Your code here\n\treturn head",
        `	dummy := &ListNode{Next: head}
	fast, slow := dummy, dummy
	for i := 0; i < n; i++ {
		fast = fast.Next
	}
	for fast.Next != nil {
		fast, slow = fast.Next, slow.Next
	}
	slow.Next = slow.Next.Next
	return dummy.Next`,
      ),
    "p-binary-tree-level-order-traversal": () =>
      fill(
        starterOf("p-binary-tree-level-order-traversal", "go"),
        "\t// Your code here\n\treturn nil",
        `	out := [][]int{}
	if root == nil {
		return out
	}
	queue := []*TreeNode{root}
	for len(queue) > 0 {
		level := []int{}
		next := []*TreeNode{}
		for _, node := range queue {
			level = append(level, node.Val)
			if node.Left != nil {
				next = append(next, node.Left)
			}
			if node.Right != nil {
				next = append(next, node.Right)
			}
		}
		out = append(out, level)
		queue = next
	}
	return out`,
      ),
    "p-implement-trie": () =>
      replaceClass(
        starterOf("p-implement-trie", "go"),
        "// Judge adapter",
        `type Trie struct {
	children map[byte]*Trie
	end      bool
}

func Constructor() Trie {
	return Trie{children: map[byte]*Trie{}}
}

func (t *Trie) Insert(word string) {
	node := t
	for i := 0; i < len(word); i++ {
		next, ok := node.children[word[i]]
		if !ok {
			child := Constructor()
			next = &child
			node.children[word[i]] = next
		}
		node = next
	}
	node.end = true
}

func (t *Trie) walk(s string) *Trie {
	node := t
	for i := 0; i < len(s); i++ {
		next, ok := node.children[s[i]]
		if !ok {
			return nil
		}
		node = next
	}
	return node
}

func (t *Trie) Search(word string) bool {
	node := t.walk(word)
	return node != nil && node.end
}

func (t *Trie) StartsWith(prefix string) bool {
	return t.walk(prefix) != nil
}

`,
      ),
  },
  typescript: {
    "p-minimum-window-substring": () => `function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  let missing = t.length, left = 0, bestStart = 0, bestLen = Infinity;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if ((need.get(c) ?? 0) > 0) missing--;
    need.set(c, (need.get(c) ?? 0) - 1);
    while (missing === 0) {
      if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
      const d = s[left++];
      need.set(d, (need.get(d) ?? 0) + 1);
      if ((need.get(d) ?? 0) > 0) missing++;
    }
  }
  return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen);
}`,
    "p-3sum": () => `function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const out: number[][] = [];
  for (let i = 0; i + 2 < nums.length; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let lo = i + 1, hi = nums.length - 1;
    while (lo < hi) {
      const sum = nums[i] + nums[lo] + nums[hi];
      if (sum < 0) lo++;
      else if (sum > 0) hi--;
      else {
        out.push([nums[i], nums[lo], nums[hi]]);
        while (lo < hi && nums[lo] === nums[lo + 1]) lo++;
        while (lo < hi && nums[hi] === nums[hi - 1]) hi--;
        lo++; hi--;
      }
    }
  }
  return out;
}`,
    "p-number-of-islands": () => `function numIslands(grid: string[][]): number {
  const sink = (r: number, c: number): void => {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[r].length || grid[r][c] !== "1") return;
    grid[r][c] = "0";
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
  };
  let count = 0;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) if (grid[r][c] === "1") { count++; sink(r, c); }
  return count;
}`,
    "p-merge-intervals": () => `function merge(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0]);
  const out: number[][] = [];
  for (const [start, end] of intervals) {
    const last = out[out.length - 1];
    if (last && last[1] >= start) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}`,
    "p-valid-parentheses": () => `function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const c of s) {
    if (c in pairs) {
      if (stack.pop() !== pairs[c]) return false;
    } else stack.push(c);
  }
  return stack.length === 0;
}`,
    "p-remove-nth-node-from-end": () =>
      fill(
        starterOf("p-remove-nth-node-from-end", "typescript"),
        "  // Your code here\n  return head;",
        `  const dummy = new ListNode(0, head);
  let fast: ListNode | null = dummy;
  let slow: ListNode = dummy;
  for (let i = 0; i < n; i++) fast = fast!.next;
  while (fast!.next) { fast = fast!.next; slow = slow.next!; }
  slow.next = slow.next!.next;
  return dummy.next;`,
      ),
    "p-binary-tree-level-order-traversal": () =>
      fill(
        starterOf("p-binary-tree-level-order-traversal", "typescript"),
        "  // Your code here\n  return [];",
        `  const out: number[][] = [];
  let queue: TreeNode[] = root ? [root] : [];
  while (queue.length) {
    out.push(queue.map((node) => node.val));
    queue = queue.flatMap((node) => [node.left, node.right].filter((child): child is TreeNode => child !== null));
  }
  return out;`,
      ),
    "p-implement-trie": () =>
      replaceClass(
        starterOf("p-implement-trie", "typescript"),
        "// Judge adapter",
        `class Trie {
  private children = new Map<string, Trie>();
  private end = false;

  insert(word: string): void {
    let node: Trie = this;
    for (const c of word) {
      if (!node.children.has(c)) node.children.set(c, new Trie());
      node = node.children.get(c)!;
    }
    node.end = true;
  }

  private walk(text: string): Trie | null {
    let node: Trie | undefined = this;
    for (const c of text) {
      node = node.children.get(c);
      if (!node) return null;
    }
    return node;
  }

  search(word: string): boolean {
    const node = this.walk(word);
    return node !== null && node.end;
  }

  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null;
  }
}

`,
      ),
  },
};

const LANGUAGES: NativeLanguage[] = ["java", "cpp", "go", "typescript"];

for (const [problemId, byLanguage] of Object.entries(NODE_REFERENCES)) {
  for (const language of LANGUAGES) REFERENCES[language][problemId] = () => byLanguage[language];
}

for (const language of LANGUAGES) {
  describe.concurrent(`native judge: ${language}`, () => {
    for (const [problemId, reference] of Object.entries(REFERENCES[language])) {
      it(`accepts the reference for ${problemId}`, async ({ skip }) => {
        if (!available[language]) skip();
        const report = await judge(problemId, language, reference());
        expect(report.cases.filter((c) => !c.passed).map((c) => `${c.index}: ${c.error ?? JSON.stringify(c.actual)}`), report.message).toEqual([]);
        expect(report.status).toBe("accepted");
      }, TIMEOUT);
    }

    for (const problem of listProblems()) {
      it(`compiles and runs the starter for ${problem.id} (without passing)`, async ({ skip }) => {
        if (!available[language]) skip();
        const report = await judge(problem.id, language, starterOf(problem.id, language));
        expect(report.status, report.message).not.toBe("compile_error");
        expect(report.status).not.toBe("accepted");
      }, TIMEOUT);
    }
  });
}

describe.concurrent("native judge: failures", () => {
  it("maps Java compile errors to the user's line numbers", async ({ skip }) => {
    if (!available.java) skip();
    const code = "class Solution {\n    public boolean isValid(String s) {\n        return undefinedThing;\n    }\n}";
    const report = await judge("p-valid-parentheses", "java", code);
    expect(report.status).toBe("compile_error");
    expect(report.message).toContain("Solution.java:3");
    expect(report.message).not.toContain("prepr-judge");
  }, TIMEOUT);

  it("reports C++ compile errors in solution.cpp", async ({ skip }) => {
    if (!available.cpp) skip();
    const report = await judge("p-valid-parentheses", "cpp", "class Solution {\npublic:\n    bool isValid(string s) { return nope; }\n};");
    expect(report.status).toBe("compile_error");
    expect(report.message).toMatch(/solution\.cpp:3/);
  }, TIMEOUT);

  it("captures per-test prints and exceptions with a line number (Java)", async ({ skip }) => {
    if (!available.java) skip();
    const code = `class Solution {
    public boolean isValid(String s) {
        System.out.println("len=" + s.length());
        if (s.length() > 2) throw new IllegalStateException("boom");
        return true;
    }
}`;
    const report = await judge("p-valid-parentheses", "java", code);
    expect(report.cases[0]!.logs).toEqual(["len=2"]);
    const thrown = report.cases.find((c) => c.error);
    expect(thrown?.error).toContain("IllegalStateException: boom (line 4)");
  }, TIMEOUT);

  it("recovers Go panics per test and captures fmt output", async ({ skip }) => {
    if (!available.go) skip();
    const code = `import "fmt"

func isValid(s string) bool {
	fmt.Println("checking", s)
	if len(s) > 2 {
		var empty []int
		return empty[5] == 0
	}
	return true
}`;
    const report = await judge("p-valid-parentheses", "go", code);
    expect(report.cases[0]!.logs).toEqual(["checking ()"]);
    expect(report.cases.find((c) => c.error)?.error).toContain("panic");
  }, TIMEOUT);

  it("stops infinite loops at the time limit", async ({ skip }) => {
    if (!available.cpp) skip();
    const problem = getProblem("p-valid-parentheses")!;
    const raw = await runNativeTests(
      "cpp",
      "class Solution {\npublic:\n    bool isValid(string s) { volatile int x = 0; while (true) x++; return false; }\n};",
      problem.stages.code,
      testArgsJson(problem.stages.code),
      { runTimeoutMs: 1_500 },
    );
    expect(raw).toMatchObject({ kind: "timeout" });
  }, TIMEOUT);

  it("reports a segfault as a runtime error", async ({ skip }) => {
    if (!available.cpp) skip();
    const report = await judge("p-valid-parentheses", "cpp", "class Solution {\npublic:\n    bool isValid(string s) { int* volatile p = nullptr; *p = 1; return true; }\n};");
    expect(report.status).toBe("runtime_error");
  }, TIMEOUT);

  it("does not leak server secrets into user code", async ({ skip }) => {
    if (!available.typescript) skip();
    process.env.PREPR_TEST_SECRET = "hunter2";
    const code = 'function isValid(s: string): boolean { console.log(String(process.env.PREPR_TEST_SECRET)); return true; }';
    const report = await judge("p-valid-parentheses", "typescript", code);
    expect(report.cases[0]!.logs).toEqual(["undefined"]);
    delete process.env.PREPR_TEST_SECRET;
  }, TIMEOUT);
});
