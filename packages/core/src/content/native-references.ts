/**
 * Reference solutions in the server-compiled languages (Java, C++, Go, TypeScript) for every
 * problem, shown in the solution panel next to the JavaScript / Python references and verified
 * by test/native-judge.test.ts. Node-based problems embed their starter's adapter.
 */
import { nativeStarter, type NativeLanguage } from "../judge/native";
import { PROBLEMS } from "./problems";
import { PROBLEMS_B } from "./problems-b";
import { NODE_REFERENCES, PROBLEMS_C } from "./problems-c";
import { NATIVE_REFERENCES_D } from "./problems-d";
import { NATIVE_REFERENCES_E } from "./problems-e";
import { NATIVE_REFERENCES_F } from "./problems-f";
import { NATIVE_REFERENCES_G } from "./problems-g";
import { NATIVE_REFERENCES_H } from "./problems-h";

/** Batches D-H (the Blind 75 expansion) keep their native references next to the problems. */
const BATCHES: Record<string, Record<NativeLanguage, string>> = {
  ...NATIVE_REFERENCES_D,
  ...NATIVE_REFERENCES_E,
  ...NATIVE_REFERENCES_F,
  ...NATIVE_REFERENCES_G,
  ...NATIVE_REFERENCES_H,
};

const ALL = [...PROBLEMS, ...PROBLEMS_B, ...PROBLEMS_C];

function fill(starter: string, stub: string, body: string): string {
  if (!starter.includes(stub)) throw new Error(`stub not found: ${stub}`);
  return starter.replace(stub, body);
}

function replaceClass(starter: string, marker: string, impl: string): string {
  return impl + starter.slice(starter.indexOf(marker));
}

function starterOf(id: string, language: NativeLanguage): string {
  const problem = ALL.find((candidate) => candidate.id === id);
  if (!problem) throw new Error(`unknown problem ${id}`);
  return nativeStarter(problem.stages.code, language);
}

const BASE: Record<NativeLanguage, Record<string, () => string>> = {
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

const MORE: Record<NativeLanguage, Record<string, string>> = {
  java: {
    "p-longest-substring-without-repeating": `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int best = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (last.containsKey(c) && last.get(c) >= left) left = last.get(c) + 1;
            last.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`,
    "p-trapping-rain-water": `class Solution {
    public int trap(int[] height) {
        int left = 0, right = height.length - 1, leftMax = 0, rightMax = 0, water = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                water += leftMax - height[left++];
            } else {
                rightMax = Math.max(rightMax, height[right]);
                water += rightMax - height[right--];
            }
        }
        return water;
    }
}`,
    "p-daily-temperatures": `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int[] answer = new int[temperatures.length];
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < temperatures.length; i++) {
            while (!stack.isEmpty() && temperatures[stack.peek()] < temperatures[i]) {
                int j = stack.pop();
                answer[j] = i - j;
            }
            stack.push(i);
        }
        return answer;
    }
}`,
    "p-search-rotated-sorted-array": `class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
            }
        }
        return -1;
    }
}`,
    "p-top-k-frequent-elements": `class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int n : nums) count.merge(n, 1, Integer::sum);
        List<Integer> keys = new ArrayList<>(count.keySet());
        keys.sort((a, b) -> count.get(b) - count.get(a));
        int[] out = new int[k];
        for (int i = 0; i < k; i++) out[i] = keys.get(i);
        return out;
    }
}`,
    "p-course-schedule": `class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
        int[] indegree = new int[numCourses];
        for (int[] p : prerequisites) { graph.get(p[1]).add(p[0]); indegree[p[0]]++; }
        Deque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) queue.add(i);
        int taken = 0;
        while (!queue.isEmpty()) {
            int course = queue.poll();
            taken++;
            for (int next : graph.get(course)) if (--indegree[next] == 0) queue.add(next);
        }
        return taken == numCourses;
    }
}`,
    "p-coin-change": `class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`,
    "p-house-robber": `class Solution {
    public int rob(int[] nums) {
        int prev = 0, curr = 0;
        for (int n : nums) {
            int next = Math.max(curr, prev + n);
            prev = curr;
            curr = next;
        }
        return curr;
    }
}`,
    "p-partition-k-equal-sum-subsets": `class Solution {
    public boolean canPartitionKSubsets(int[] nums, int k) {
        int sum = 0;
        for (int n : nums) sum += n;
        if (sum % k != 0) return false;
        int target = sum / k, n = nums.length;
        int[] dp = new int[1 << n];
        Arrays.fill(dp, -1);
        dp[0] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask] == -1) continue;
            for (int i = 0; i < n; i++) {
                int next = mask | (1 << i);
                if (next != mask && dp[next] == -1 && dp[mask] + nums[i] <= target) dp[next] = (dp[mask] + nums[i]) % target;
            }
        }
        return dp[(1 << n) - 1] == 0;
    }
}`,
    "p-product-of-array-except-self": `class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        int prefix = 1;
        for (int i = 0; i < n; i++) { answer[i] = prefix; prefix *= nums[i]; }
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) { answer[i] *= suffix; suffix *= nums[i]; }
        return answer;
    }
}`,
    "p-two-sum": `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[] { j, i };
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    "p-container-with-most-water": `class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
            if (height[left] < height[right]) left++; else right--;
        }
        return best;
    }
}`,
    "p-evaluate-reverse-polish-notation": `class Solution {
    public int evalRPN(String[] tokens) {
        Deque<Integer> stack = new ArrayDeque<>();
        for (String t : tokens) {
            switch (t) {
                case "+": stack.push(stack.pop() + stack.pop()); break;
                case "-": { int b = stack.pop(), a = stack.pop(); stack.push(a - b); break; }
                case "*": stack.push(stack.pop() * stack.pop()); break;
                case "/": { int b = stack.pop(), a = stack.pop(); stack.push(a / b); break; }
                default: stack.push(Integer.parseInt(t));
            }
        }
        return stack.pop();
    }
}`,
    "p-find-minimum-rotated-sorted-array": `class Solution {
    public int findMin(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] > nums[hi]) lo = mid + 1; else hi = mid;
        }
        return nums[lo];
    }
}`,
    "p-koko-eating-bananas": `class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int lo = 1, hi = 0;
        for (int p : piles) hi = Math.max(hi, p);
        while (lo < hi) {
            int k = lo + (hi - lo) / 2;
            long hours = 0;
            for (int p : piles) hours += (p + (long) k - 1) / k;
            if (hours <= h) hi = k; else lo = k + 1;
        }
        return lo;
    }
}`,
    "p-kth-largest-element": `class Solution {
    public int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        for (int n : nums) {
            heap.add(n);
            if (heap.size() > k) heap.poll();
        }
        return heap.peek();
    }
}`,
    "p-k-closest-points-to-origin": `class Solution {
    public int[][] kClosest(int[][] points, int k) {
        int[][] sorted = points.clone();
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0] * a[0] + a[1] * a[1], b[0] * b[0] + b[1] * b[1]));
        return Arrays.copyOf(sorted, k);
    }
}`,
    "p-subsets": `class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), out);
        return out;
    }

    private void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            backtrack(nums, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }
}`,
    "p-combination-sum": `class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        List<List<Integer>> out = new ArrayList<>();
        dfs(candidates, 0, target, new ArrayList<>(), out);
        return out;
    }

    private void dfs(int[] c, int start, int remaining, List<Integer> path, List<List<Integer>> out) {
        if (remaining == 0) { out.add(new ArrayList<>(path)); return; }
        for (int i = start; i < c.length; i++) {
            if (c[i] > remaining) continue;
            path.add(c[i]);
            dfs(c, i, remaining - c[i], path, out);
            path.remove(path.size() - 1);
        }
    }
}`,
  },
  cpp: {
    "p-longest-substring-without-repeating": `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char, int> last;
        int best = 0, left = 0;
        for (int right = 0; right < (int)s.size(); right++) {
            auto it = last.find(s[right]);
            if (it != last.end() && it->second >= left) left = it->second + 1;
            last[s[right]] = right;
            best = max(best, right - left + 1);
        }
        return best;
    }
};`,
    "p-trapping-rain-water": `class Solution {
public:
    int trap(vector<int>& height) {
        int left = 0, right = (int)height.size() - 1, leftMax = 0, rightMax = 0, water = 0;
        while (left < right) {
            if (height[left] < height[right]) { leftMax = max(leftMax, height[left]); water += leftMax - height[left++]; }
            else { rightMax = max(rightMax, height[right]); water += rightMax - height[right--]; }
        }
        return water;
    }
};`,
    "p-daily-temperatures": `class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        vector<int> answer(temperatures.size(), 0);
        vector<int> stack;
        for (int i = 0; i < (int)temperatures.size(); i++) {
            while (!stack.empty() && temperatures[stack.back()] < temperatures[i]) {
                answer[stack.back()] = i - stack.back();
                stack.pop_back();
            }
            stack.push_back(i);
        }
        return answer;
    }
};`,
    "p-search-rotated-sorted-array": `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) { if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1; }
            else { if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1; }
        }
        return -1;
    }
};`,
    "p-top-k-frequent-elements": `class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int n : nums) count[n]++;
        vector<pair<int, int>> items(count.begin(), count.end());
        sort(items.begin(), items.end(), [](const auto& a, const auto& b) { return a.second > b.second; });
        vector<int> out;
        for (int i = 0; i < k; i++) out.push_back(items[i].first);
        return out;
    }
};`,
    "p-course-schedule": `class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> graph(numCourses);
        vector<int> indegree(numCourses, 0);
        for (auto& p : prerequisites) { graph[p[1]].push_back(p[0]); indegree[p[0]]++; }
        queue<int> q;
        for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.push(i);
        int taken = 0;
        while (!q.empty()) {
            int c = q.front();
            q.pop();
            taken++;
            for (int next : graph[c]) if (--indegree[next] == 0) q.push(next);
        }
        return taken == numCourses;
    }
};`,
    "p-coin-change": `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, amount + 1);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins) if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }
};`,
    "p-house-robber": `class Solution {
public:
    int rob(vector<int>& nums) {
        int prev = 0, curr = 0;
        for (int n : nums) { int next = max(curr, prev + n); prev = curr; curr = next; }
        return curr;
    }
};`,
    "p-partition-k-equal-sum-subsets": `class Solution {
public:
    bool canPartitionKSubsets(vector<int>& nums, int k) {
        int sum = accumulate(nums.begin(), nums.end(), 0);
        if (sum % k != 0) return false;
        int target = sum / k, n = nums.size();
        vector<int> dp(1 << n, -1);
        dp[0] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask] == -1) continue;
            for (int i = 0; i < n; i++) {
                int next = mask | (1 << i);
                if (next != mask && dp[next] == -1 && dp[mask] + nums[i] <= target) dp[next] = (dp[mask] + nums[i]) % target;
            }
        }
        return dp[(1 << n) - 1] == 0;
    }
};`,
    "p-product-of-array-except-self": `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> answer(n, 1);
        int prefix = 1;
        for (int i = 0; i < n; i++) { answer[i] = prefix; prefix *= nums[i]; }
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) { answer[i] *= suffix; suffix *= nums[i]; }
        return answer;
    }
};`,
    "p-two-sum": `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = seen.find(target - nums[i]);
            if (it != seen.end()) return {it->second, i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
    "p-container-with-most-water": `class Solution {
public:
    int maxArea(vector<int>& height) {
        int left = 0, right = (int)height.size() - 1, best = 0;
        while (left < right) {
            best = max(best, min(height[left], height[right]) * (right - left));
            if (height[left] < height[right]) left++; else right--;
        }
        return best;
    }
};`,
    "p-evaluate-reverse-polish-notation": `class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<long long> st;
        for (auto& t : tokens) {
            if (t == "+" || t == "-" || t == "*" || t == "/") {
                long long b = st.back(); st.pop_back();
                long long a = st.back(); st.pop_back();
                if (t == "+") st.push_back(a + b);
                else if (t == "-") st.push_back(a - b);
                else if (t == "*") st.push_back(a * b);
                else st.push_back(a / b);
            } else {
                st.push_back(stoll(t));
            }
        }
        return (int)st.back();
    }
};`,
    "p-find-minimum-rotated-sorted-array": `class Solution {
public:
    int findMin(vector<int>& nums) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1; else hi = mid;
        }
        return nums[lo];
    }
};`,
    "p-koko-eating-bananas": `class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1, hi = *max_element(piles.begin(), piles.end());
        while (lo < hi) {
            int k = lo + (hi - lo) / 2;
            long long hours = 0;
            for (int p : piles) hours += (p + (long long)k - 1) / k;
            if (hours <= h) hi = k; else lo = k + 1;
        }
        return lo;
    }
};`,
    "p-kth-largest-element": `class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        priority_queue<int, vector<int>, greater<int>> heap;
        for (int n : nums) { heap.push(n); if ((int)heap.size() > k) heap.pop(); }
        return heap.top();
    }
};`,
    "p-k-closest-points-to-origin": `class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
        vector<vector<int>> sorted = points;
        sort(sorted.begin(), sorted.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[0] * a[0] + a[1] * a[1] < b[0] * b[0] + b[1] * b[1];
        });
        sorted.resize(k);
        return sorted;
    }
};`,
    "p-subsets": `class Solution {
    void backtrack(vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& out) {
        out.push_back(path);
        for (int i = start; i < (int)nums.size(); i++) {
            path.push_back(nums[i]);
            backtrack(nums, i + 1, path, out);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> out;
        vector<int> path;
        backtrack(nums, 0, path, out);
        return out;
    }
};`,
    "p-combination-sum": `class Solution {
    void dfs(vector<int>& c, int start, int remaining, vector<int>& path, vector<vector<int>>& out) {
        if (remaining == 0) { out.push_back(path); return; }
        for (int i = start; i < (int)c.size(); i++) {
            if (c[i] > remaining) continue;
            path.push_back(c[i]);
            dfs(c, i, remaining - c[i], path, out);
            path.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        vector<vector<int>> out;
        vector<int> path;
        dfs(candidates, 0, target, path, out);
        return out;
    }
};`,
  },
  go: {
    "p-longest-substring-without-repeating": `func lengthOfLongestSubstring(s string) int {
	last := map[byte]int{}
	best, left := 0, 0
	for right := 0; right < len(s); right++ {
		if j, ok := last[s[right]]; ok && j >= left {
			left = j + 1
		}
		last[s[right]] = right
		if right-left+1 > best {
			best = right - left + 1
		}
	}
	return best
}`,
    "p-trapping-rain-water": `func trap(height []int) int {
	left, right := 0, len(height)-1
	leftMax, rightMax, water := 0, 0, 0
	for left < right {
		if height[left] < height[right] {
			if height[left] > leftMax {
				leftMax = height[left]
			}
			water += leftMax - height[left]
			left++
		} else {
			if height[right] > rightMax {
				rightMax = height[right]
			}
			water += rightMax - height[right]
			right--
		}
	}
	return water
}`,
    "p-daily-temperatures": `func dailyTemperatures(temperatures []int) []int {
	answer := make([]int, len(temperatures))
	stack := []int{}
	for i, t := range temperatures {
		for len(stack) > 0 && temperatures[stack[len(stack)-1]] < t {
			j := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			answer[j] = i - j
		}
		stack = append(stack, i)
	}
	return answer
}`,
    "p-search-rotated-sorted-array": `func search(nums []int, target int) int {
	lo, hi := 0, len(nums)-1
	for lo <= hi {
		mid := (lo + hi) / 2
		if nums[mid] == target {
			return mid
		}
		if nums[lo] <= nums[mid] {
			if nums[lo] <= target && target < nums[mid] {
				hi = mid - 1
			} else {
				lo = mid + 1
			}
		} else {
			if nums[mid] < target && target <= nums[hi] {
				lo = mid + 1
			} else {
				hi = mid - 1
			}
		}
	}
	return -1
}`,
    "p-top-k-frequent-elements": `import "sort"

func topKFrequent(nums []int, k int) []int {
	count := map[int]int{}
	for _, n := range nums {
		count[n]++
	}
	keys := make([]int, 0, len(count))
	for n := range count {
		keys = append(keys, n)
	}
	sort.Slice(keys, func(a, b int) bool { return count[keys[a]] > count[keys[b]] })
	return keys[:k]
}`,
    "p-course-schedule": `func canFinish(numCourses int, prerequisites [][]int) bool {
	graph := make([][]int, numCourses)
	indegree := make([]int, numCourses)
	for _, p := range prerequisites {
		graph[p[1]] = append(graph[p[1]], p[0])
		indegree[p[0]]++
	}
	queue := []int{}
	for i := 0; i < numCourses; i++ {
		if indegree[i] == 0 {
			queue = append(queue, i)
		}
	}
	taken := 0
	for len(queue) > 0 {
		c := queue[0]
		queue = queue[1:]
		taken++
		for _, next := range graph[c] {
			indegree[next]--
			if indegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}
	return taken == numCourses
}`,
    "p-coin-change": `func coinChange(coins []int, amount int) int {
	dp := make([]int, amount+1)
	for i := 1; i <= amount; i++ {
		dp[i] = amount + 1
		for _, c := range coins {
			if c <= i && dp[i-c]+1 < dp[i] {
				dp[i] = dp[i-c] + 1
			}
		}
	}
	if dp[amount] > amount {
		return -1
	}
	return dp[amount]
}`,
    "p-house-robber": `func rob(nums []int) int {
	prev, curr := 0, 0
	for _, n := range nums {
		next := curr
		if prev+n > next {
			next = prev + n
		}
		prev, curr = curr, next
	}
	return curr
}`,
    "p-partition-k-equal-sum-subsets": `func canPartitionKSubsets(nums []int, k int) bool {
	sum := 0
	for _, n := range nums {
		sum += n
	}
	if sum%k != 0 {
		return false
	}
	target, n := sum/k, len(nums)
	dp := make([]int, 1<<n)
	for i := range dp {
		dp[i] = -1
	}
	dp[0] = 0
	for mask := 0; mask < 1<<n; mask++ {
		if dp[mask] == -1 {
			continue
		}
		for i := 0; i < n; i++ {
			next := mask | 1<<i
			if next != mask && dp[next] == -1 && dp[mask]+nums[i] <= target {
				dp[next] = (dp[mask] + nums[i]) % target
			}
		}
	}
	return dp[1<<n-1] == 0
}`,
    "p-product-of-array-except-self": `func productExceptSelf(nums []int) []int {
	answer := make([]int, len(nums))
	prefix := 1
	for i, n := range nums {
		answer[i] = prefix
		prefix *= n
	}
	suffix := 1
	for i := len(nums) - 1; i >= 0; i-- {
		answer[i] *= suffix
		suffix *= nums[i]
	}
	return answer
}`,
    "p-two-sum": `func twoSum(nums []int, target int) []int {
	seen := map[int]int{}
	for i, n := range nums {
		if j, ok := seen[target-n]; ok {
			return []int{j, i}
		}
		seen[n] = i
	}
	return nil
}`,
    "p-container-with-most-water": `func maxArea(height []int) int {
	left, right, best := 0, len(height)-1, 0
	for left < right {
		h := height[left]
		if height[right] < h {
			h = height[right]
		}
		if h*(right-left) > best {
			best = h * (right - left)
		}
		if height[left] < height[right] {
			left++
		} else {
			right--
		}
	}
	return best
}`,
    "p-evaluate-reverse-polish-notation": `import "strconv"

func evalRPN(tokens []string) int {
	stack := []int{}
	for _, t := range tokens {
		switch t {
		case "+", "-", "*", "/":
			b, a := stack[len(stack)-1], stack[len(stack)-2]
			stack = stack[:len(stack)-2]
			switch t {
			case "+":
				stack = append(stack, a+b)
			case "-":
				stack = append(stack, a-b)
			case "*":
				stack = append(stack, a*b)
			default:
				stack = append(stack, a/b)
			}
		default:
			n, _ := strconv.Atoi(t)
			stack = append(stack, n)
		}
	}
	return stack[0]
}`,
    "p-find-minimum-rotated-sorted-array": `func findMin(nums []int) int {
	lo, hi := 0, len(nums)-1
	for lo < hi {
		mid := (lo + hi) / 2
		if nums[mid] > nums[hi] {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return nums[lo]
}`,
    "p-koko-eating-bananas": `func minEatingSpeed(piles []int, h int) int {
	lo, hi := 1, 0
	for _, p := range piles {
		if p > hi {
			hi = p
		}
	}
	for lo < hi {
		k := (lo + hi) / 2
		hours := 0
		for _, p := range piles {
			hours += (p + k - 1) / k
		}
		if hours <= h {
			hi = k
		} else {
			lo = k + 1
		}
	}
	return lo
}`,
    "p-kth-largest-element": `import "sort"

func findKthLargest(nums []int, k int) int {
	sorted := append([]int(nil), nums...)
	sort.Sort(sort.Reverse(sort.IntSlice(sorted)))
	return sorted[k-1]
}`,
    "p-k-closest-points-to-origin": `import "sort"

func kClosest(points [][]int, k int) [][]int {
	sorted := append([][]int(nil), points...)
	dist := func(p []int) int { return p[0]*p[0] + p[1]*p[1] }
	sort.Slice(sorted, func(a, b int) bool { return dist(sorted[a]) < dist(sorted[b]) })
	return sorted[:k]
}`,
    "p-subsets": `func subsets(nums []int) [][]int {
	out := [][]int{}
	path := []int{}
	var backtrack func(start int)
	backtrack = func(start int) {
		out = append(out, append([]int(nil), path...))
		for i := start; i < len(nums); i++ {
			path = append(path, nums[i])
			backtrack(i + 1)
			path = path[:len(path)-1]
		}
	}
	backtrack(0)
	return out
}`,
    "p-combination-sum": `func combinationSum(candidates []int, target int) [][]int {
	out := [][]int{}
	path := []int{}
	var dfs func(start, remaining int)
	dfs = func(start, remaining int) {
		if remaining == 0 {
			out = append(out, append([]int(nil), path...))
			return
		}
		for i := start; i < len(candidates); i++ {
			if candidates[i] > remaining {
				continue
			}
			path = append(path, candidates[i])
			dfs(i, remaining-candidates[i])
			path = path[:len(path)-1]
		}
	}
	dfs(0, target)
	return out
}`,
  },
  typescript: {
    "p-longest-substring-without-repeating": `function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let best = 0, left = 0;
  for (let right = 0; right < s.length; right++) {
    const seen = last.get(s[right]);
    if (seen !== undefined && seen >= left) left = seen + 1;
    last.set(s[right], right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    "p-trapping-rain-water": `function trap(height: number[]): number {
  let left = 0, right = height.length - 1, leftMax = 0, rightMax = 0, water = 0;
  while (left < right) {
    if (height[left] < height[right]) { leftMax = Math.max(leftMax, height[left]); water += leftMax - height[left++]; }
    else { rightMax = Math.max(rightMax, height[right]); water += rightMax - height[right--]; }
  }
  return water;
}`,
    "p-daily-temperatures": `function dailyTemperatures(temperatures: number[]): number[] {
  const answer = new Array<number>(temperatures.length).fill(0);
  const stack: number[] = [];
  temperatures.forEach((t, i) => {
    while (stack.length && temperatures[stack[stack.length - 1]] < t) {
      const j = stack.pop()!;
      answer[j] = i - j;
    }
    stack.push(i);
  });
  return answer;
}`,
    "p-search-rotated-sorted-array": `function search(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
    }
  }
  return -1;
}`,
    "p-top-k-frequent-elements": `function topKFrequent(nums: number[], k: number): number[] {
  const count = new Map<number, number>();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n]) => n);
}`,
    "p-course-schedule": `function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array<number>(numCourses).fill(0);
  for (const [course, pre] of prerequisites) { graph[pre].push(course); indegree[course]++; }
  const queue = indegree.flatMap((d, i) => (d === 0 ? [i] : []));
  let taken = 0;
  for (let head = 0; head < queue.length; head++) {
    taken++;
    for (const next of graph[queue[head]]) if (--indegree[next] === 0) queue.push(next);
  }
  return taken === numCourses;
}`,
    "p-coin-change": `function coinChange(coins: number[], amount: number): number {
  const dp = new Array<number>(amount + 1).fill(amount + 1);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  return dp[amount] > amount ? -1 : dp[amount];
}`,
    "p-house-robber": `function rob(nums: number[]): number {
  let prev = 0, curr = 0;
  for (const n of nums) [prev, curr] = [curr, Math.max(curr, prev + n)];
  return curr;
}`,
    "p-partition-k-equal-sum-subsets": `function canPartitionKSubsets(nums: number[], k: number): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % k !== 0) return false;
  const target = sum / k, n = nums.length;
  const dp = new Array<number>(1 << n).fill(-1);
  dp[0] = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    if (dp[mask] === -1) continue;
    for (let i = 0; i < n; i++) {
      const next = mask | (1 << i);
      if (next !== mask && dp[next] === -1 && dp[mask] + nums[i] <= target) dp[next] = (dp[mask] + nums[i]) % target;
    }
  }
  return dp[(1 << n) - 1] === 0;
}`,
    "p-product-of-array-except-self": `function productExceptSelf(nums: number[]): number[] {
  const answer = new Array<number>(nums.length).fill(1);
  let prefix = 1;
  for (let i = 0; i < nums.length; i++) { answer[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i--) { answer[i] *= suffix; suffix *= nums[i]; }
  return answer.map((value) => value + 0);
}`,
    "p-two-sum": `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    "p-container-with-most-water": `function maxArea(height: number[]): number {
  let left = 0, right = height.length - 1, best = 0;
  while (left < right) {
    best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
    if (height[left] < height[right]) left++; else right--;
  }
  return best;
}`,
    "p-evaluate-reverse-polish-notation": `function evalRPN(tokens: string[]): number {
  const stack: number[] = [];
  for (const token of tokens) {
    if (token.length === 1 && "+-*/".includes(token)) {
      const b = stack.pop()!, a = stack.pop()!;
      stack.push(token === "+" ? a + b : token === "-" ? a - b : token === "*" ? a * b : Math.trunc(a / b));
    } else stack.push(Number(token));
  }
  return stack[0] + 0;
}`,
    "p-find-minimum-rotated-sorted-array": `function findMin(nums: number[]): number {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1; else hi = mid;
  }
  return nums[lo];
}`,
    "p-koko-eating-bananas": `function minEatingSpeed(piles: number[], h: number): number {
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const k = Math.floor((lo + hi) / 2);
    const hours = piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
    if (hours <= h) hi = k; else lo = k + 1;
  }
  return lo;
}`,
    "p-kth-largest-element": `function findKthLargest(nums: number[], k: number): number {
  return [...nums].sort((a, b) => b - a)[k - 1];
}`,
    "p-k-closest-points-to-origin": `function kClosest(points: number[][], k: number): number[][] {
  const dist = ([x, y]: number[]) => x * x + y * y;
  return [...points].sort((a, b) => dist(a) - dist(b)).slice(0, k);
}`,
    "p-subsets": `function subsets(nums: number[]): number[][] {
  const out: number[][] = [];
  const path: number[] = [];
  const backtrack = (start: number): void => {
    out.push([...path]);
    for (let i = start; i < nums.length; i++) { path.push(nums[i]); backtrack(i + 1); path.pop(); }
  };
  backtrack(0);
  return out;
}`,
    "p-combination-sum": `function combinationSum(candidates: number[], target: number): number[][] {
  const out: number[][] = [];
  const path: number[] = [];
  const dfs = (start: number, remaining: number): void => {
    if (remaining === 0) { out.push([...path]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) continue;
      path.push(candidates[i]);
      dfs(i, remaining - candidates[i]);
      path.pop();
    }
  };
  dfs(0, target);
  return out;
}`,
  },
};

/** The reference solution for `problemId` in a server-compiled language, or undefined. */
export function nativeReference(problemId: string, language: NativeLanguage): string | undefined {
  const batch = BATCHES[problemId];
  if (batch) return batch[language];
  const node = (NODE_REFERENCES as Record<string, Record<NativeLanguage, string>>)[problemId];
  if (node) return node[language];
  const more = MORE[language][problemId];
  if (more) return more;
  return BASE[language][problemId]?.();
}
