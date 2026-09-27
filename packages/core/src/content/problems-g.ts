import type { NativeLanguage } from "../judge/native";
import { browserPart, nativePart, type AdapterLanguage, type SourceSet } from "./adapters";
import { nodeSignature, nodeSources, type NodeSpec } from "./nodes";
import type { Problem } from "./types";

/**
 * Blind 75 batch G: linked lists (on the general node adapter), graphs, and the two-heaps
 * median design problem. Clone Graph and Find Median ship hand-written adapters in every language.
 */

const LIST_NOTE = (call: string, extra = "") =>
  `**Judge note:** The judge passes each list as a plain array. The starter's adapter builds real \`ListNode\`s, calls your \`${call}\`${extra}, and converts the result back to an array.`;

// ───────────────────────────────────────────────────────────── Linked List Cycle

const CYCLE: NodeSpec = {
  wrapper: "hasCycleValues",
  call: "hasCycle",
  params: [{ kind: "cycle", name: "head" }],
  returns: { kind: "value", type: "bool" },
};

const CYCLE_STUB: SourceSet = {
  javascript: `/**
 * @param {ListNode | null} head
 * @return {boolean}
 */
function hasCycle(head) {
  // Your code here
  return false;
}`,
  python: `def hasCycle(head: Optional[ListNode]) -> bool:
    # Your code here
    return False`,
  java: `    public boolean hasCycle(ListNode head) {
        // Your code here
        return false;
    }`,
  cpp: `    bool hasCycle(ListNode* head) {
        // Your code here
        return false;
    }`,
  go: `func hasCycle(head *ListNode) bool {
	// Your code here
	return false
}`,
  typescript: `function hasCycle(head: ListNode | null): boolean {
  // Your code here
  return false;
}`,
};

const CYCLE_REF: SourceSet = {
  javascript: `function hasCycle(head) {
  // Floyd: fast gains one node per step on slow, so inside a cycle they must meet.
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
  python: `def hasCycle(head: Optional[ListNode]) -> bool:
    # Floyd: fast gains one node per step on slow, so inside a cycle they must meet.
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
  java: `    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }`,
  cpp: `    bool hasCycle(ListNode* head) {
        ListNode *slow = head, *fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) return true;
        }
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
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
};

const cycleStarters = nodeSources(CYCLE_STUB, CYCLE);
const cycleReference = nodeSources(CYCLE_REF, CYCLE);

// ───────────────────────────────────────────────────────────── Merge Two Sorted Lists

const MERGE_TWO: NodeSpec = {
  wrapper: "mergeTwoListsValues",
  call: "mergeTwoLists",
  params: [
    { kind: "list", name: "list1" },
    { kind: "list", name: "list2" },
  ],
  returns: { kind: "list" },
};

const MERGE_TWO_STUB: SourceSet = {
  javascript: `/**
 * @param {ListNode | null} list1
 * @param {ListNode | null} list2
 * @return {ListNode | null}
 */
function mergeTwoLists(list1, list2) {
  // Your code here
  return null;
}`,
  python: `def mergeTwoLists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
    # Your code here
    return None`,
  java: `    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // Your code here
        return null;
    }`,
  cpp: `    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // Your code here
        return nullptr;
    }`,
  go: `func mergeTwoLists(list1 *ListNode, list2 *ListNode) *ListNode {
	// Your code here
	return nil
}`,
  typescript: `function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
  // Your code here
  return null;
}`,
};

const MERGE_TWO_REF: SourceSet = {
  javascript: `function mergeTwoLists(list1, list2) {
  const dummy = new ListNode();
  let tail = dummy;
  while (list1 && list2) {
    if (list1.val <= list2.val) {
      tail.next = list1;
      list1 = list1.next;
    } else {
      tail.next = list2;
      list2 = list2.next;
    }
    tail = tail.next;
  }
  tail.next = list1 ?? list2; // the leftover is already sorted
  return dummy.next;
}`,
  python: `def mergeTwoLists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
    dummy = tail = ListNode()
    while list1 and list2:
        if list1.val <= list2.val:
            tail.next, list1 = list1, list1.next
        else:
            tail.next, list2 = list2, list2.next
        tail = tail.next
    tail.next = list1 or list2  # the leftover is already sorted
    return dummy.next`,
  java: `    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }
            else { tail.next = list2; list2 = list2.next; }
            tail = tail.next;
        }
        tail.next = list1 != null ? list1 : list2;
        return dummy.next;
    }`,
  cpp: `    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        ListNode dummy(0);
        ListNode* tail = &dummy;
        while (list1 && list2) {
            if (list1->val <= list2->val) { tail->next = list1; list1 = list1->next; }
            else { tail->next = list2; list2 = list2->next; }
            tail = tail->next;
        }
        tail->next = list1 ? list1 : list2;
        return dummy.next;
    }`,
  go: `func mergeTwoLists(list1 *ListNode, list2 *ListNode) *ListNode {
	dummy := &ListNode{}
	tail := dummy
	for list1 != nil && list2 != nil {
		if list1.Val <= list2.Val {
			tail.Next, list1 = list1, list1.Next
		} else {
			tail.Next, list2 = list2, list2.Next
		}
		tail = tail.Next
	}
	if list1 != nil {
		tail.Next = list1
	} else {
		tail.Next = list2
	}
	return dummy.Next
}`,
  typescript: `function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;
  while (list1 && list2) {
    if (list1.val <= list2.val) {
      tail.next = list1;
      list1 = list1.next;
    } else {
      tail.next = list2;
      list2 = list2.next;
    }
    tail = tail.next;
  }
  tail.next = list1 ?? list2;
  return dummy.next;
}`,
};

const mergeTwoStarters = nodeSources(MERGE_TWO_STUB, MERGE_TWO);
const mergeTwoReference = nodeSources(MERGE_TWO_REF, MERGE_TWO);

// ───────────────────────────────────────────────────────────── Merge k Sorted Lists

const MERGE_K: NodeSpec = {
  wrapper: "mergeKListsValues",
  call: "mergeKLists",
  params: [{ kind: "lists", name: "lists" }],
  returns: { kind: "list" },
};

const MERGE_K_STUB: SourceSet = {
  javascript: `/**
 * @param {(ListNode | null)[]} lists
 * @return {ListNode | null}
 */
function mergeKLists(lists) {
  // Your code here
  return null;
}`,
  python: `def mergeKLists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:
    # Your code here
    return None`,
  java: `    public ListNode mergeKLists(ListNode[] lists) {
        // Your code here
        return null;
    }`,
  cpp: `    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // Your code here
        return nullptr;
    }`,
  go: `func mergeKLists(lists []*ListNode) *ListNode {
	// Your code here
	return nil
}`,
  typescript: `function mergeKLists(lists: (ListNode | null)[]): ListNode | null {
  // Your code here
  return null;
}`,
};

const MERGE_K_REF: SourceSet = {
  javascript: `// Pairwise (divide and conquer) merging: each node takes part in log k merges, so O(N log k),
// the same bound as a size-k min-heap without writing a heap.
function mergeKLists(lists) {
  if (lists.length === 0) return null;
  for (let step = 1; step < lists.length; step *= 2) {
    for (let i = 0; i + step < lists.length; i += 2 * step) {
      lists[i] = mergeTwo(lists[i], lists[i + step]);
    }
  }
  return lists[0];
}

function mergeTwo(a, b) {
  const dummy = new ListNode();
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}`,
  python: `import heapq


def mergeKLists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:
    # One entry per list: its current head. The index breaks ties so nodes are never compared.
    heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
    heapq.heapify(heap)
    dummy = tail = ListNode()
    while heap:
        _, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next`,
  java: `    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
        for (ListNode head : lists) if (head != null) heap.add(head);
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.poll();
            tail.next = node;
            tail = node;
            if (node.next != null) heap.add(node.next);
        }
        return dummy.next;
    }`,
  cpp: `    ListNode* mergeKLists(vector<ListNode*>& lists) {
        auto later = [](ListNode* a, ListNode* b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(later)> heap(later);
        for (ListNode* head : lists) if (head) heap.push(head);
        ListNode dummy(0);
        ListNode* tail = &dummy;
        while (!heap.empty()) {
            ListNode* node = heap.top();
            heap.pop();
            tail->next = node;
            tail = node;
            if (node->next) heap.push(node->next);
        }
        return dummy.next;
    }`,
  go: `// Pairwise (divide and conquer) merging: O(N log k), the same bound as a size-k min-heap.
func mergeKLists(lists []*ListNode) *ListNode {
	if len(lists) == 0 {
		return nil
	}
	for step := 1; step < len(lists); step *= 2 {
		for i := 0; i+step < len(lists); i += 2 * step {
			lists[i] = mergeTwo(lists[i], lists[i+step])
		}
	}
	return lists[0]
}

func mergeTwo(a, b *ListNode) *ListNode {
	dummy := &ListNode{}
	tail := dummy
	for a != nil && b != nil {
		if a.Val <= b.Val {
			tail.Next, a = a, a.Next
		} else {
			tail.Next, b = b, b.Next
		}
		tail = tail.Next
	}
	if a != nil {
		tail.Next = a
	} else {
		tail.Next = b
	}
	return dummy.Next
}`,
  typescript: `// Pairwise (divide and conquer) merging: O(N log k), the same bound as a size-k min-heap.
function mergeKLists(lists: (ListNode | null)[]): ListNode | null {
  if (lists.length === 0) return null;
  for (let step = 1; step < lists.length; step *= 2) {
    for (let i = 0; i + step < lists.length; i += 2 * step) {
      lists[i] = mergeTwo(lists[i], lists[i + step]);
    }
  }
  return lists[0];
}

function mergeTwo(a: ListNode | null, b: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}`,
};

const mergeKStarters = nodeSources(MERGE_K_STUB, MERGE_K);
const mergeKReference = nodeSources(MERGE_K_REF, MERGE_K);

// ───────────────────────────────────────────────────────────── Reorder List

const REORDER: NodeSpec = {
  wrapper: "reorderListValues",
  call: "reorderList",
  params: [{ kind: "list", name: "head" }],
  returns: { kind: "inPlace", param: 0 },
};

const REORDER_STUB: SourceSet = {
  javascript: `/**
 * Reorders the list in place; returns nothing.
 * @param {ListNode | null} head
 * @return {void}
 */
function reorderList(head) {
  // Your code here
}`,
  python: `def reorderList(head: Optional[ListNode]) -> None:
    # Your code here (reorder in place, return nothing)
    pass`,
  java: `    public void reorderList(ListNode head) {
        // Your code here (reorder in place)
    }`,
  cpp: `    void reorderList(ListNode* head) {
        // Your code here (reorder in place)
    }`,
  go: `func reorderList(head *ListNode) {
	// Your code here (reorder in place)
}`,
  typescript: `function reorderList(head: ListNode | null): void {
  // Your code here (reorder in place)
}`,
};

const REORDER_REF: SourceSet = {
  javascript: `function reorderList(head) {
  if (!head || !head.next) return;
  // 1. Find the end of the first half.
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  // 2. Cut after slow and reverse the second half.
  let prev = null;
  let curr = slow.next;
  slow.next = null;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  // 3. Weave: one node from the front half, then one from the reversed back half.
  let first = head;
  let second = prev;
  while (second) {
    const nextFirst = first.next;
    const nextSecond = second.next;
    first.next = second;
    second.next = nextFirst;
    first = nextFirst;
    second = nextSecond;
  }
}`,
  python: `def reorderList(head: Optional[ListNode]) -> None:
    if not head or not head.next:
        return
    # 1. Find the end of the first half.
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    # 2. Cut after slow and reverse the second half.
    prev, curr = None, slow.next
    slow.next = None
    while curr:
        curr.next, prev, curr = prev, curr, curr.next
    # 3. Weave the halves together.
    first, second = head, prev
    while second:
        next_first, next_second = first.next, second.next
        first.next = second
        second.next = next_first
        first, second = next_first, next_second`,
  java: `    public void reorderList(ListNode head) {
        if (head == null || head.next == null) return;
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode prev = null, curr = slow.next;
        slow.next = null;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        ListNode first = head, second = prev;
        while (second != null) {
            ListNode nextFirst = first.next, nextSecond = second.next;
            first.next = second;
            second.next = nextFirst;
            first = nextFirst;
            second = nextSecond;
        }
    }`,
  cpp: `    void reorderList(ListNode* head) {
        if (!head || !head->next) return;
        ListNode *slow = head, *fast = head;
        while (fast->next && fast->next->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        ListNode *prev = nullptr, *curr = slow->next;
        slow->next = nullptr;
        while (curr) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        ListNode *first = head, *second = prev;
        while (second) {
            ListNode *nextFirst = first->next, *nextSecond = second->next;
            first->next = second;
            second->next = nextFirst;
            first = nextFirst;
            second = nextSecond;
        }
    }`,
  go: `func reorderList(head *ListNode) {
	if head == nil || head.Next == nil {
		return
	}
	slow, fast := head, head
	for fast.Next != nil && fast.Next.Next != nil {
		slow, fast = slow.Next, fast.Next.Next
	}
	var prev *ListNode
	curr := slow.Next
	slow.Next = nil
	for curr != nil {
		curr.Next, prev, curr = prev, curr, curr.Next
	}
	first, second := head, prev
	for second != nil {
		nextFirst, nextSecond := first.Next, second.Next
		first.Next = second
		second.Next = nextFirst
		first, second = nextFirst, nextSecond
	}
}`,
  typescript: `function reorderList(head: ListNode | null): void {
  if (!head || !head.next) return;
  let slow: ListNode = head;
  let fast: ListNode = head;
  while (fast.next && fast.next.next) {
    slow = slow.next!;
    fast = fast.next.next;
  }
  let prev: ListNode | null = null;
  let curr = slow.next;
  slow.next = null;
  while (curr) {
    const next: ListNode | null = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  let first: ListNode | null = head;
  let second: ListNode | null = prev;
  while (first && second) {
    const nextFirst: ListNode | null = first.next;
    const nextSecond: ListNode | null = second.next;
    first.next = second;
    second.next = nextFirst;
    first = nextFirst;
    second = nextSecond;
  }
}`,
};

const reorderStarters = nodeSources(REORDER_STUB, REORDER);
const reorderReference = nodeSources(REORDER_REF, REORDER);

// ───────────────────────────────────────────────────────────── Clone Graph (hand-written adapter)

const GRAPH_MARK = "Judge adapter: builds the graph from the test's adjacency list, checks your clone, and serializes it. No need to edit below.";

const GRAPH_NODE: SourceSet = {
  javascript: `class Node {
  constructor(val = 0, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}`,
  python: `class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []`,
  java: `class Node {
    public int val;
    public List<Node> neighbors;
    public Node() { val = 0; neighbors = new ArrayList<>(); }
    public Node(int val) { this.val = val; neighbors = new ArrayList<>(); }
    public Node(int val, ArrayList<Node> neighbors) { this.val = val; this.neighbors = neighbors; }
}`,
  cpp: `class Node {
public:
    int val;
    vector<Node*> neighbors;
    Node() : val(0) {}
    Node(int _val) : val(_val) {}
    Node(int _val, vector<Node*> _neighbors) : val(_val), neighbors(_neighbors) {}
};`,
  go: `type Node struct {
	Val       int
	Neighbors []*Node
}`,
  typescript: `class Node {
  val: number;
  neighbors: Node[];
  constructor(val = 0, neighbors: Node[] = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}`,
};

const GRAPH_ADAPTER: SourceSet = {
  javascript: `// ${GRAPH_MARK}
function cloneGraphAdjacency(adjList) {
  const nodes = adjList.map((_, i) => new Node(i + 1));
  adjList.forEach((neighbors, i) => {
    nodes[i].neighbors = neighbors.map((v) => nodes[v - 1]);
  });
  const originals = new Set(nodes);
  const clone = cloneGraph(nodes.length ? nodes[0] : null);
  if (!clone) return [];
  const out = adjList.map(() => []);
  const seen = new Set([clone]);
  const queue = [clone];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (originals.has(node)) throw new Error("cloneGraph returned an original node: build new Node objects");
    if (!(node.val >= 1 && node.val <= adjList.length)) throw new Error("unexpected node value " + node.val);
    out[node.val - 1] = node.neighbors.map((next) => next.val);
    for (const next of node.neighbors) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return out;
}`,
  python: `# ${GRAPH_MARK}
def cloneGraphAdjacency(adjList: List[List[int]]) -> List[List[int]]:
    nodes = [Node(i + 1) for i in range(len(adjList))]
    for i, neighbors in enumerate(adjList):
        nodes[i].neighbors = [nodes[v - 1] for v in neighbors]
    originals = {id(node) for node in nodes}
    clone = cloneGraph(nodes[0] if nodes else None)
    if clone is None:
        return []
    out = [[] for _ in adjList]
    seen = {id(clone)}
    queue = [clone]
    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        if id(node) in originals:
            raise ValueError("cloneGraph returned an original node: build new Node objects")
        if not 1 <= node.val <= len(adjList):
            raise ValueError("unexpected node value " + str(node.val))
        out[node.val - 1] = [nxt.val for nxt in node.neighbors]
        for nxt in node.neighbors:
            if id(nxt) not in seen:
                seen.add(id(nxt))
                queue.append(nxt)
    return out`,
  java: `    // ${GRAPH_MARK}
    public int[][] cloneGraphAdjacency(int[][] adjList) {
        int n = adjList.length;
        Node[] nodes = new Node[n];
        for (int i = 0; i < n; i++) nodes[i] = new Node(i + 1);
        for (int i = 0; i < n; i++) for (int v : adjList[i]) nodes[i].neighbors.add(nodes[v - 1]);
        Set<Node> originals = Collections.newSetFromMap(new IdentityHashMap<>());
        originals.addAll(Arrays.asList(nodes));
        Node clone = cloneGraph(n > 0 ? nodes[0] : null);
        if (clone == null) return new int[0][];
        int[][] out = new int[n][0];
        Set<Node> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        Deque<Node> queue = new ArrayDeque<>();
        seen.add(clone);
        queue.add(clone);
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            if (originals.contains(node)) throw new IllegalStateException("cloneGraph returned an original node: build new Node objects");
            if (node.val < 1 || node.val > n) throw new IllegalStateException("unexpected node value " + node.val);
            out[node.val - 1] = new int[node.neighbors.size()];
            for (int j = 0; j < node.neighbors.size(); j++) {
                Node next = node.neighbors.get(j);
                out[node.val - 1][j] = next.val;
                if (seen.add(next)) queue.add(next);
            }
        }
        return out;
    }`,
  cpp: `    // ${GRAPH_MARK}
    vector<vector<int>> cloneGraphAdjacency(vector<vector<int>>& adjList) {
        int n = adjList.size();
        vector<Node*> nodes;
        for (int i = 0; i < n; i++) nodes.push_back(new Node(i + 1));
        for (int i = 0; i < n; i++) for (int v : adjList[i]) nodes[i]->neighbors.push_back(nodes[v - 1]);
        unordered_set<Node*> originals(nodes.begin(), nodes.end());
        Node* clone = cloneGraph(n > 0 ? nodes[0] : nullptr);
        if (!clone) return {};
        vector<vector<int>> out(n);
        unordered_set<Node*> seen{clone};
        vector<Node*> order{clone};
        for (size_t head = 0; head < order.size(); head++) {
            Node* node = order[head];
            if (originals.count(node)) throw runtime_error("cloneGraph returned an original node: build new Node objects");
            if (node->val < 1 || node->val > n) throw runtime_error("unexpected node value " + to_string(node->val));
            out[node->val - 1].clear();
            for (Node* next : node->neighbors) {
                out[node->val - 1].push_back(next->val);
                if (seen.insert(next).second) order.push_back(next);
            }
        }
        return out;
    }`,
  go: `// ${GRAPH_MARK}
func cloneGraphAdjacency(adjList [][]int) [][]int {
	n := len(adjList)
	nodes := make([]*Node, n)
	originals := map[*Node]bool{}
	for i := range nodes {
		nodes[i] = &Node{Val: i + 1}
		originals[nodes[i]] = true
	}
	for i, neighbors := range adjList {
		for _, v := range neighbors {
			nodes[i].Neighbors = append(nodes[i].Neighbors, nodes[v-1])
		}
	}
	var start *Node
	if n > 0 {
		start = nodes[0]
	}
	clone := cloneGraph(start)
	if clone == nil {
		return [][]int{}
	}
	out := make([][]int, n)
	for i := range out {
		out[i] = []int{}
	}
	seen := map[*Node]bool{clone: true}
	queue := []*Node{clone}
	for head := 0; head < len(queue); head++ {
		node := queue[head]
		if originals[node] {
			panic("cloneGraph returned an original node: build new Node objects")
		}
		if node.Val < 1 || node.Val > n {
			panic("unexpected node value (values must be 1..n)")
		}
		out[node.Val-1] = []int{}
		for _, next := range node.Neighbors {
			out[node.Val-1] = append(out[node.Val-1], next.Val)
			if !seen[next] {
				seen[next] = true
				queue = append(queue, next)
			}
		}
	}
	return out
}`,
  typescript: `// ${GRAPH_MARK}
function cloneGraphAdjacency(adjList: number[][]): number[][] {
  const nodes = adjList.map((_, i) => new Node(i + 1));
  adjList.forEach((neighbors, i) => {
    nodes[i].neighbors = neighbors.map((v) => nodes[v - 1]);
  });
  const originals = new Set<Node>(nodes);
  const clone = cloneGraph(nodes.length ? nodes[0] : null);
  if (!clone) return [];
  const out: number[][] = adjList.map(() => []);
  const seen = new Set<Node>([clone]);
  const queue: Node[] = [clone];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (originals.has(node)) throw new Error("cloneGraph returned an original node: build new Node objects");
    if (!(node.val >= 1 && node.val <= adjList.length)) throw new Error("unexpected node value " + node.val);
    out[node.val - 1] = node.neighbors.map((next) => next.val);
    for (const next of node.neighbors) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return out;
}`,
};

const CLONE_STUB: SourceSet = {
  javascript: `/**
 * Returns a deep copy of the connected graph containing node.
 * @param {Node | null} node
 * @return {Node | null}
 */
function cloneGraph(node) {
  // Your code here
  return null;
}`,
  python: `def cloneGraph(node: Optional[Node]) -> Optional[Node]:
    # Your code here
    return None`,
  java: `    public Node cloneGraph(Node node) {
        // Your code here
        return null;
    }`,
  cpp: `    Node* cloneGraph(Node* node) {
        // Your code here
        return nullptr;
    }`,
  go: `func cloneGraph(node *Node) *Node {
	// Your code here
	return nil
}`,
  typescript: `function cloneGraph(node: Node | null): Node | null {
  // Your code here
  return null;
}`,
};

const CLONE_REF: SourceSet = {
  javascript: `function cloneGraph(node) {
  if (!node) return null;
  const copies = new Map(); // original -> copy, recorded before visiting neighbors
  const visit = (original) => {
    if (copies.has(original)) return copies.get(original);
    const copy = new Node(original.val);
    copies.set(original, copy);
    copy.neighbors = original.neighbors.map(visit);
    return copy;
  };
  return visit(node);
}`,
  python: `def cloneGraph(node: Optional[Node]) -> Optional[Node]:
    if node is None:
        return None
    copies = {node: Node(node.val)}  # original -> copy, recorded when first discovered
    queue = [node]
    head = 0
    while head < len(queue):
        original = queue[head]
        head += 1
        for nxt in original.neighbors:
            if nxt not in copies:
                copies[nxt] = Node(nxt.val)
                queue.append(nxt)
            copies[original].neighbors.append(copies[nxt])
    return copies[node]`,
  java: `    private final Map<Node, Node> copies = new HashMap<>();

    public Node cloneGraph(Node node) {
        if (node == null) return null;
        Node existing = copies.get(node);
        if (existing != null) return existing;
        Node copy = new Node(node.val);
        copies.put(node, copy); // record before visiting neighbors
        for (Node next : node.neighbors) copy.neighbors.add(cloneGraph(next));
        return copy;
    }`,
  cpp: `    unordered_map<Node*, Node*> copies;

    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        auto it = copies.find(node);
        if (it != copies.end()) return it->second;
        Node* copy = new Node(node->val);
        copies[node] = copy;  // record before visiting neighbors
        for (Node* next : node->neighbors) copy->neighbors.push_back(cloneGraph(next));
        return copy;
    }`,
  go: `func cloneGraph(node *Node) *Node {
	copies := map[*Node]*Node{}
	var visit func(*Node) *Node
	visit = func(original *Node) *Node {
		if original == nil {
			return nil
		}
		if copy, ok := copies[original]; ok {
			return copy
		}
		copy := &Node{Val: original.Val}
		copies[original] = copy // record before visiting neighbors
		for _, next := range original.Neighbors {
			copy.Neighbors = append(copy.Neighbors, visit(next))
		}
		return copy
	}
	return visit(node)
}`,
  typescript: `function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;
  const copies = new Map<Node, Node>(); // original -> copy, recorded before visiting neighbors
  const visit = (original: Node): Node => {
    const existing = copies.get(original);
    if (existing) return existing;
    const copy = new Node(original.val);
    copies.set(original, copy);
    copy.neighbors = original.neighbors.map(visit);
    return copy;
  };
  return visit(node);
}`,
};

function graphSources(user: SourceSet): SourceSet {
  return Object.fromEntries(
    (Object.keys(user) as AdapterLanguage[]).map((language) => {
      const node = GRAPH_NODE[language];
      const adapter = GRAPH_ADAPTER[language];
      const body = user[language];
      if (language === "java") return [language, `${node}\n\nclass Solution {\n${body}\n\n${adapter}\n}\n`];
      if (language === "cpp") return [language, `${node}\n\nclass Solution {\npublic:\n${body}\n\n${adapter}\n};\n`];
      if (language === "python") return [language, `from typing import List, Optional\n\n\n${node}\n\n\n${body}\n\n\n${adapter}\n`];
      return [language, `${node}\n\n${body}\n\n${adapter}\n`];
    }),
  ) as SourceSet;
}

const cloneStarters = graphSources(CLONE_STUB);
const cloneReference = graphSources(CLONE_REF);

// ───────────────────────────────────────────────────────────── Find Median from Data Stream

const MEDIAN_MARK = "Judge adapter: replays the operations on one MedianFinder. No need to edit below.";

const MEDIAN_ADAPTER: SourceSet = {
  javascript: `// ${MEDIAN_MARK}
function runMedianFinder(operations, values) {
  const finder = new MedianFinder();
  return operations.map((op, i) => {
    if (op === "addNum") {
      finder.addNum(values[i]);
      return null;
    }
    return finder.findMedian();
  });
}`,
  python: `# ${MEDIAN_MARK}
def runMedianFinder(operations: List[str], values: List[int]) -> List[Optional[float]]:
    finder = MedianFinder()
    out = []
    for op, value in zip(operations, values):
        if op == "addNum":
            finder.addNum(value)
            out.append(None)
        else:
            out.append(finder.findMedian())
    return out`,
  java: `    // ${MEDIAN_MARK}
    public List<Double> runMedianFinder(String[] operations, int[] values) {
        MedianFinder finder = new MedianFinder();
        List<Double> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            if (operations[i].equals("addNum")) { finder.addNum(values[i]); out.add(null); }
            else out.add(finder.findMedian());
        }
        return out;
    }`,
  cpp: `    // ${MEDIAN_MARK}
    vector<optional<double>> runMedianFinder(vector<string>& operations, vector<int>& values) {
        MedianFinder finder;
        vector<optional<double>> out;
        for (size_t i = 0; i < operations.size(); i++) {
            if (operations[i] == "addNum") { finder.addNum(values[i]); out.push_back(nullopt); }
            else out.push_back(finder.findMedian());
        }
        return out;
    }`,
  go: `// ${MEDIAN_MARK}
func runMedianFinder(operations []string, values []int) []*float64 {
	finder := Constructor()
	out := make([]*float64, len(operations))
	for i, op := range operations {
		if op == "addNum" {
			finder.AddNum(values[i])
		} else {
			median := finder.FindMedian()
			out[i] = &median
		}
	}
	return out
}`,
  typescript: `// ${MEDIAN_MARK}
function runMedianFinder(operations: string[], values: number[]): (number | null)[] {
  const finder = new MedianFinder();
  return operations.map((op, i) => {
    if (op === "addNum") {
      finder.addNum(values[i]);
      return null;
    }
    return finder.findMedian();
  });
}`,
};

const MEDIAN_STUB: SourceSet = {
  javascript: `class MedianFinder {
  constructor() {
    // Your code here
  }

  /** @param {number} num */
  addNum(num) {}

  /** @return {number} */
  findMedian() {
    return 0;
  }
}`,
  python: `class MedianFinder:
    def __init__(self):
        # Your code here
        pass

    def addNum(self, num: int) -> None:
        pass

    def findMedian(self) -> float:
        return 0.0`,
  java: `class MedianFinder {
    public MedianFinder() {
        // Your code here
    }

    public void addNum(int num) {
    }

    public double findMedian() {
        return 0.0;
    }
}`,
  cpp: `class MedianFinder {
public:
    MedianFinder() {
        // Your code here
    }

    void addNum(int num) {
    }

    double findMedian() {
        return 0.0;
    }
};`,
  go: `type MedianFinder struct {
	// Your fields here
}

func Constructor() MedianFinder {
	return MedianFinder{}
}

func (this *MedianFinder) AddNum(num int) {
}

func (this *MedianFinder) FindMedian() float64 {
	return 0
}`,
  typescript: `class MedianFinder {
  constructor() {
    // Your code here
  }

  addNum(num: number): void {}

  findMedian(): number {
    return 0;
  }
}`,
};

const MEDIAN_REF: SourceSet = {
  javascript: `class Heap {
  constructor(before) {
    this.items = [];
    this.before = before; // before(a, b): a belongs above b
  }

  get size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(value) {
    const a = this.items;
    a.push(value);
    for (let i = a.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (!this.before(a[i], a[parent])) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }

  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let best = i;
        if (l < a.length && this.before(a[l], a[best])) best = l;
        if (r < a.length && this.before(a[r], a[best])) best = r;
        if (best === i) break;
        [a[i], a[best]] = [a[best], a[i]];
        i = best;
      }
    }
    return top;
  }
}

class MedianFinder {
  constructor() {
    this.low = new Heap((a, b) => a > b); // max-heap: the smaller half
    this.high = new Heap((a, b) => a < b); // min-heap: the larger half
  }

  addNum(num) {
    // Route through low so every value in low stays <= every value in high,
    // then keep low the same size as high or one larger.
    this.low.push(num);
    this.high.push(this.low.pop());
    if (this.high.size > this.low.size) this.low.push(this.high.pop());
  }

  findMedian() {
    if (this.low.size > this.high.size) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;
  }
}`,
  python: `import heapq


class MedianFinder:
    def __init__(self):
        self.low = []  # max-heap of the smaller half (values negated)
        self.high = []  # min-heap of the larger half

    def addNum(self, num: int) -> None:
        # Route through low so low's values stay <= high's, then rebalance sizes.
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2`,
  java: `class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // smaller half
    private final PriorityQueue<Integer> high = new PriorityQueue<>(); // larger half

    public void addNum(int num) {
        low.add(num);
        high.add(low.poll());
        if (high.size() > low.size()) low.add(high.poll());
    }

    public double findMedian() {
        if (low.size() > high.size()) return low.peek();
        return (low.peek() + (double) high.peek()) / 2.0;
    }
}`,
  cpp: `class MedianFinder {
    priority_queue<int> low;                              // max-heap: the smaller half
    priority_queue<int, vector<int>, greater<int>> high;  // min-heap: the larger half

public:
    void addNum(int num) {
        low.push(num);
        high.push(low.top());
        low.pop();
        if (high.size() > low.size()) {
            low.push(high.top());
            high.pop();
        }
    }

    double findMedian() {
        if (low.size() > high.size()) return low.top();
        return (low.top() + (double)high.top()) / 2.0;
    }
};`,
  go: `import "container/heap"

// intHeap is a min-heap of ints; the smaller half stores negated values so it acts as a max-heap.
type intHeap []int

func (h intHeap) Len() int            { return len(h) }
func (h intHeap) Less(i, j int) bool  { return h[i] < h[j] }
func (h intHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *intHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *intHeap) Pop() interface{} {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

type MedianFinder struct {
	low  *intHeap // smaller half, negated
	high *intHeap // larger half
}

func Constructor() MedianFinder {
	return MedianFinder{low: &intHeap{}, high: &intHeap{}}
}

func (this *MedianFinder) AddNum(num int) {
	heap.Push(this.low, -num)
	heap.Push(this.high, -heap.Pop(this.low).(int))
	if this.high.Len() > this.low.Len() {
		heap.Push(this.low, -heap.Pop(this.high).(int))
	}
}

func (this *MedianFinder) FindMedian() float64 {
	if this.low.Len() > this.high.Len() {
		return float64(-(*this.low)[0])
	}
	return float64(-(*this.low)[0]+(*this.high)[0]) / 2
}`,
  typescript: `class Heap {
  items: number[] = [];
  before: (a: number, b: number) => boolean;

  constructor(before: (a: number, b: number) => boolean) {
    this.before = before; // before(a, b): a belongs above b
  }

  get size(): number {
    return this.items.length;
  }

  peek(): number {
    return this.items[0];
  }

  push(value: number): void {
    const a = this.items;
    a.push(value);
    for (let i = a.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (!this.before(a[i], a[parent])) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }

  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let best = i;
        if (l < a.length && this.before(a[l], a[best])) best = l;
        if (r < a.length && this.before(a[r], a[best])) best = r;
        if (best === i) break;
        [a[i], a[best]] = [a[best], a[i]];
        i = best;
      }
    }
    return top;
  }
}

class MedianFinder {
  low = new Heap((a, b) => a > b); // max-heap: the smaller half
  high = new Heap((a, b) => a < b); // min-heap: the larger half

  addNum(num: number): void {
    this.low.push(num);
    this.high.push(this.low.pop());
    if (this.high.size > this.low.size) this.low.push(this.high.pop());
  }

  findMedian(): number {
    if (this.low.size > this.high.size) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;
  }
}`,
};

function medianSources(user: SourceSet): SourceSet {
  return Object.fromEntries(
    (Object.keys(user) as AdapterLanguage[]).map((language) => {
      const adapter = MEDIAN_ADAPTER[language];
      const body = user[language];
      if (language === "java") return [language, `${body}\n\nclass Solution {\n${adapter}\n}\n`];
      if (language === "cpp") return [language, `${body}\n\nclass Solution {\npublic:\n${adapter}\n};\n`];
      if (language === "python") return [language, `from typing import List, Optional\n\n\n${body}\n\n\n${adapter}\n`];
      return [language, `${body}\n\n${adapter}\n`];
    }),
  ) as SourceSet;
}

const medianStarters = medianSources(MEDIAN_STUB);
const medianReference = medianSources(MEDIAN_REF);

// ───────────────────────────────────────────────────────────── Graph references (plain signatures)

const PACIFIC_REF: SourceSet = {
  javascript: `function pacificAtlantic(heights) {
  const m = heights.length;
  const n = heights[0].length;
  // Walk uphill from an ocean's border cells: everything reached can drain into that ocean.
  const flood = (starts) => {
    const seen = Array.from({ length: m }, () => new Array(n).fill(false));
    const stack = [];
    for (const [r, c] of starts) {
      if (!seen[r][c]) {
        seen[r][c] = true;
        stack.push([r, c]);
      }
    }
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= m || nc >= n || seen[nr][nc]) continue;
        if (heights[nr][nc] < heights[r][c]) continue; // water can't flow uphill to us
        seen[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }
    return seen;
  };
  const pacificStarts = [];
  const atlanticStarts = [];
  for (let r = 0; r < m; r++) {
    pacificStarts.push([r, 0]);
    atlanticStarts.push([r, n - 1]);
  }
  for (let c = 0; c < n; c++) {
    pacificStarts.push([0, c]);
    atlanticStarts.push([m - 1, c]);
  }
  const pacific = flood(pacificStarts);
  const atlantic = flood(atlanticStarts);
  const out = [];
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) if (pacific[r][c] && atlantic[r][c]) out.push([r, c]);
  }
  return out;
}
`,
  python: `from typing import List


def pacificAtlantic(heights: List[List[int]]) -> List[List[int]]:
    m, n = len(heights), len(heights[0])

    def flood(starts):
        # Walk uphill from an ocean's border cells: everything reached drains into that ocean.
        seen = set(starts)
        stack = list(seen)
        while stack:
            r, c = stack.pop()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < m and 0 <= nc < n and (nr, nc) not in seen and heights[nr][nc] >= heights[r][c]:
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        return seen

    pacific = flood([(r, 0) for r in range(m)] + [(0, c) for c in range(n)])
    atlantic = flood([(r, n - 1) for r in range(m)] + [(m - 1, c) for c in range(n)])
    return [[r, c] for r in range(m) for c in range(n) if (r, c) in pacific and (r, c) in atlantic]
`,
  java: `class Solution {
    private static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        int m = heights.length, n = heights[0].length;
        boolean[][] pacific = new boolean[m][n], atlantic = new boolean[m][n];
        for (int r = 0; r < m; r++) { flood(heights, pacific, r, 0); flood(heights, atlantic, r, n - 1); }
        for (int c = 0; c < n; c++) { flood(heights, pacific, 0, c); flood(heights, atlantic, m - 1, c); }
        List<List<Integer>> out = new ArrayList<>();
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (pacific[r][c] && atlantic[r][c]) out.add(Arrays.asList(r, c));
        return out;
    }

    private void flood(int[][] heights, boolean[][] seen, int r, int c) {
        if (seen[r][c]) return;
        seen[r][c] = true;
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[] {r, c});
        while (!stack.isEmpty()) {
            int[] cell = stack.pop();
            for (int[] d : DIRS) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr < 0 || nc < 0 || nr >= heights.length || nc >= heights[0].length || seen[nr][nc]) continue;
                if (heights[nr][nc] < heights[cell[0]][cell[1]]) continue;
                seen[nr][nc] = true;
                stack.push(new int[] {nr, nc});
            }
        }
    }
}
`,
  cpp: `class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        int m = heights.size(), n = heights[0].size();
        vector<vector<bool>> pacific(m, vector<bool>(n)), atlantic(m, vector<bool>(n));
        for (int r = 0; r < m; r++) { flood(heights, pacific, r, 0); flood(heights, atlantic, r, n - 1); }
        for (int c = 0; c < n; c++) { flood(heights, pacific, 0, c); flood(heights, atlantic, m - 1, c); }
        vector<vector<int>> out;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++)
                if (pacific[r][c] && atlantic[r][c]) out.push_back({r, c});
        return out;
    }

private:
    void flood(const vector<vector<int>>& heights, vector<vector<bool>>& seen, int r, int c) {
        if (seen[r][c]) return;
        seen[r][c] = true;
        vector<pair<int, int>> stack{{r, c}};
        const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!stack.empty()) {
            auto [cr, cc] = stack.back();
            stack.pop_back();
            for (const auto& d : dirs) {
                int nr = cr + d[0], nc = cc + d[1];
                if (nr < 0 || nc < 0 || nr >= (int)heights.size() || nc >= (int)heights[0].size() || seen[nr][nc]) continue;
                if (heights[nr][nc] < heights[cr][cc]) continue;
                seen[nr][nc] = true;
                stack.push_back({nr, nc});
            }
        }
    }
};
`,
  go: `func pacificAtlantic(heights [][]int) [][]int {
	m, n := len(heights), len(heights[0])
	newGrid := func() [][]bool {
		g := make([][]bool, m)
		for i := range g {
			g[i] = make([]bool, n)
		}
		return g
	}
	pacific, atlantic := newGrid(), newGrid()
	var flood func(seen [][]bool, r, c int)
	flood = func(seen [][]bool, r, c int) {
		if seen[r][c] {
			return
		}
		seen[r][c] = true
		for _, d := range [][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}} {
			nr, nc := r+d[0], c+d[1]
			if nr >= 0 && nc >= 0 && nr < m && nc < n && heights[nr][nc] >= heights[r][c] {
				flood(seen, nr, nc)
			}
		}
	}
	for r := 0; r < m; r++ {
		flood(pacific, r, 0)
		flood(atlantic, r, n-1)
	}
	for c := 0; c < n; c++ {
		flood(pacific, 0, c)
		flood(atlantic, m-1, c)
	}
	out := [][]int{}
	for r := 0; r < m; r++ {
		for c := 0; c < n; c++ {
			if pacific[r][c] && atlantic[r][c] {
				out = append(out, []int{r, c})
			}
		}
	}
	return out
}
`,
  typescript: `function pacificAtlantic(heights: number[][]): number[][] {
  const m = heights.length;
  const n = heights[0].length;
  const flood = (starts: [number, number][]): boolean[][] => {
    const seen = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
    const stack: [number, number][] = [];
    for (const [r, c] of starts) {
      if (!seen[r][c]) {
        seen[r][c] = true;
        stack.push([r, c]);
      }
    }
    while (stack.length) {
      const [r, c] = stack.pop()!;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= m || nc >= n || seen[nr][nc]) continue;
        if (heights[nr][nc] < heights[r][c]) continue;
        seen[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }
    return seen;
  };
  const pacificStarts: [number, number][] = [];
  const atlanticStarts: [number, number][] = [];
  for (let r = 0; r < m; r++) {
    pacificStarts.push([r, 0]);
    atlanticStarts.push([r, n - 1]);
  }
  for (let c = 0; c < n; c++) {
    pacificStarts.push([0, c]);
    atlanticStarts.push([m - 1, c]);
  }
  const pacific = flood(pacificStarts);
  const atlantic = flood(atlanticStarts);
  const out: number[][] = [];
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) if (pacific[r][c] && atlantic[r][c]) out.push([r, c]);
  }
  return out;
}
`,
};

const ALIEN_REF: SourceSet = {
  javascript: `function alienOrder(words) {
  const letters = []; // first-appearance order
  const adj = new Map();
  const indegree = new Map();
  for (const word of words) {
    for (const ch of word) {
      if (!adj.has(ch)) {
        adj.set(ch, new Set());
        indegree.set(ch, 0);
        letters.push(ch);
      }
    }
  }
  // Each adjacent pair gives at most one edge: its first differing letter.
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    const len = Math.min(a.length, b.length);
    let j = 0;
    while (j < len && a[j] === b[j]) j++;
    if (j === len) {
      if (a.length > b.length) return ""; // a word listed before its own prefix
      continue;
    }
    if (!adj.get(a[j]).has(b[j])) {
      adj.get(a[j]).add(b[j]);
      indegree.set(b[j], indegree.get(b[j]) + 1);
    }
  }
  // Kahn's algorithm; leftover letters sit on a cycle.
  const queue = letters.filter((ch) => indegree.get(ch) === 0);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const ch = queue[head];
    order.push(ch);
    for (const next of adj.get(ch)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return order.length === letters.length ? order.join("") : "";
}
`,
  python: `from collections import deque
from typing import List


def alienOrder(words: List[str]) -> str:
    adj = {}  # dicts keep first-appearance order
    indegree = {}
    for word in words:
        for ch in word:
            adj.setdefault(ch, set())
            indegree.setdefault(ch, 0)
    # Each adjacent pair gives at most one edge: its first differing letter.
    for a, b in zip(words, words[1:]):
        for x, y in zip(a, b):
            if x != y:
                if y not in adj[x]:
                    adj[x].add(y)
                    indegree[y] += 1
                break
        else:
            if len(a) > len(b):
                return ""  # a word listed before its own prefix
    # Kahn's algorithm; leftover letters sit on a cycle.
    queue = deque(ch for ch in adj if indegree[ch] == 0)
    order = []
    while queue:
        ch = queue.popleft()
        order.append(ch)
        for nxt in adj[ch]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return "".join(order) if len(order) == len(adj) else ""
`,
  java: `class Solution {
    public String alienOrder(String[] words) {
        Map<Character, Set<Character>> adj = new LinkedHashMap<>();
        Map<Character, Integer> indegree = new HashMap<>();
        for (String word : words)
            for (char c : word.toCharArray()) { adj.putIfAbsent(c, new LinkedHashSet<>()); indegree.putIfAbsent(c, 0); }
        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int len = Math.min(a.length(), b.length()), j = 0;
            while (j < len && a.charAt(j) == b.charAt(j)) j++;
            if (j == len) {
                if (a.length() > b.length()) return "";
                continue;
            }
            if (adj.get(a.charAt(j)).add(b.charAt(j))) indegree.merge(b.charAt(j), 1, Integer::sum);
        }
        Deque<Character> queue = new ArrayDeque<>();
        for (char c : adj.keySet()) if (indegree.get(c) == 0) queue.add(c);
        StringBuilder order = new StringBuilder();
        while (!queue.isEmpty()) {
            char c = queue.poll();
            order.append(c);
            for (char next : adj.get(c)) if (indegree.merge(next, -1, Integer::sum) == 0) queue.add(next);
        }
        return order.length() == adj.size() ? order.toString() : "";
    }
}
`,
  cpp: `class Solution {
public:
    string alienOrder(vector<string>& words) {
        vector<set<int>> adj(26);
        vector<int> indegree(26, 0);
        vector<bool> present(26, false);
        string letters;
        for (const string& w : words)
            for (char ch : w)
                if (!present[ch - 'a']) { present[ch - 'a'] = true; letters += ch; }
        for (size_t i = 0; i + 1 < words.size(); i++) {
            const string& a = words[i];
            const string& b = words[i + 1];
            size_t len = min(a.size(), b.size()), j = 0;
            while (j < len && a[j] == b[j]) j++;
            if (j == len) {
                if (a.size() > b.size()) return "";
                continue;
            }
            if (adj[a[j] - 'a'].insert(b[j] - 'a').second) indegree[b[j] - 'a']++;
        }
        queue<int> ready;
        for (char ch : letters) if (indegree[ch - 'a'] == 0) ready.push(ch - 'a');
        string order;
        while (!ready.empty()) {
            int c = ready.front();
            ready.pop();
            order += char('a' + c);
            for (int next : adj[c]) if (--indegree[next] == 0) ready.push(next);
        }
        return order.size() == letters.size() ? order : "";
    }
};
`,
  go: `func alienOrder(words []string) string {
	adj := map[byte]map[byte]bool{}
	indegree := map[byte]int{}
	letters := []byte{}
	for _, w := range words {
		for i := 0; i < len(w); i++ {
			if _, ok := adj[w[i]]; !ok {
				adj[w[i]] = map[byte]bool{}
				letters = append(letters, w[i])
			}
		}
	}
	for i := 0; i+1 < len(words); i++ {
		a, b := words[i], words[i+1]
		j := 0
		for j < len(a) && j < len(b) && a[j] == b[j] {
			j++
		}
		if j == len(a) || j == len(b) {
			if len(a) > len(b) {
				return ""
			}
			continue
		}
		if !adj[a[j]][b[j]] {
			adj[a[j]][b[j]] = true
			indegree[b[j]]++
		}
	}
	queue := []byte{}
	for _, c := range letters {
		if indegree[c] == 0 {
			queue = append(queue, c)
		}
	}
	order := []byte{}
	for len(queue) > 0 {
		c := queue[0]
		queue = queue[1:]
		order = append(order, c)
		for next := range adj[c] {
			indegree[next]--
			if indegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}
	if len(order) != len(letters) {
		return ""
	}
	return string(order)
}
`,
  typescript: `function alienOrder(words: string[]): string {
  const letters: string[] = [];
  const adj = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  for (const word of words) {
    for (const ch of word) {
      if (!adj.has(ch)) {
        adj.set(ch, new Set());
        indegree.set(ch, 0);
        letters.push(ch);
      }
    }
  }
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    const len = Math.min(a.length, b.length);
    let j = 0;
    while (j < len && a[j] === b[j]) j++;
    if (j === len) {
      if (a.length > b.length) return "";
      continue;
    }
    const edges = adj.get(a[j])!;
    if (!edges.has(b[j])) {
      edges.add(b[j]);
      indegree.set(b[j], indegree.get(b[j])! + 1);
    }
  }
  const queue = letters.filter((ch) => indegree.get(ch) === 0);
  const order: string[] = [];
  for (let head = 0; head < queue.length; head++) {
    const ch = queue[head];
    order.push(ch);
    for (const next of adj.get(ch)!) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return order.length === letters.length ? order.join("") : "";
}
`,
};

const VALID_TREE_REF: SourceSet = {
  javascript: `function validTree(n, edges) {
  // A tree on n nodes has exactly n - 1 edges and no cycle (which then forces connectivity).
  if (edges.length !== n - 1) return false;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path halving
      x = parent[x];
    }
    return x;
  };
  for (const [a, b] of edges) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false; // this edge closes a cycle
    parent[ra] = rb;
  }
  return true;
}
`,
  python: `from typing import List


def validTree(n: int, edges: List[List[int]]) -> bool:
    # A tree on n nodes has exactly n - 1 edges and no cycle (which then forces connectivity).
    if len(edges) != n - 1:
        return False
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path halving
            x = parent[x]
        return x

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False  # this edge closes a cycle
        parent[ra] = rb
    return True
`,
  java: `class Solution {
    private int[] parent;

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    public boolean validTree(int n, int[][] edges) {
        if (edges.length != n - 1) return false;
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (int[] e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return false;
            parent[ra] = rb;
        }
        return true;
    }
}
`,
  cpp: `class Solution {
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

public:
    bool validTree(int n, vector<vector<int>>& edges) {
        if ((int)edges.size() != n - 1) return false;
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        for (const auto& e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return false;
            parent[ra] = rb;
        }
        return true;
    }
};
`,
  go: `func validTree(n int, edges [][]int) bool {
	if len(edges) != n-1 {
		return false
	}
	parent := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	find := func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	for _, e := range edges {
		ra, rb := find(e[0]), find(e[1])
		if ra == rb {
			return false
		}
		parent[ra] = rb
	}
	return true
}
`,
  typescript: `function validTree(n: number, edges: number[][]): boolean {
  if (edges.length !== n - 1) return false;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const [a, b] of edges) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
  }
  return true;
}
`,
};

const COMPONENTS_REF: SourceSet = {
  javascript: `function countComponents(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path halving
      x = parent[x];
    }
    return x;
  };
  let count = n; // every node starts as its own component
  for (const [a, b] of edges) {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) continue; // redundant edge: already connected
    if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    if (rank[ra] === rank[rb]) rank[ra]++;
    count--;
  }
  return count;
}
`,
  python: `from typing import List


def countComponents(n: int, edges: List[List[int]]) -> int:
    parent = list(range(n))
    rank = [0] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path halving
            x = parent[x]
        return x

    count = n  # every node starts as its own component
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            continue  # redundant edge: already connected
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1
        count -= 1
    return count
`,
  java: `class Solution {
    private int[] parent, rank;

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    public int countComponents(int n, int[][] edges) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int count = n;
        for (int[] e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) continue;
            if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
            parent[rb] = ra;
            if (rank[ra] == rank[rb]) rank[ra]++;
            count--;
        }
        return count;
    }
}
`,
  cpp: `class Solution {
    vector<int> parent, rnk;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

public:
    int countComponents(int n, vector<vector<int>>& edges) {
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        rnk.assign(n, 0);
        int count = n;
        for (const auto& e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) continue;
            if (rnk[ra] < rnk[rb]) swap(ra, rb);
            parent[rb] = ra;
            if (rnk[ra] == rnk[rb]) rnk[ra]++;
            count--;
        }
        return count;
    }
};
`,
  go: `func countComponents(n int, edges [][]int) int {
	parent := make([]int, n)
	rank := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	find := func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	count := n
	for _, e := range edges {
		ra, rb := find(e[0]), find(e[1])
		if ra == rb {
			continue
		}
		if rank[ra] < rank[rb] {
			ra, rb = rb, ra
		}
		parent[rb] = ra
		if rank[ra] == rank[rb] {
			rank[ra]++
		}
		count--
	}
	return count
}
`,
  typescript: `function countComponents(n: number, edges: number[][]): number {
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array<number>(n).fill(0);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let count = n;
  for (const [a, b] of edges) {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) continue;
    if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    if (rank[ra] === rank[rb]) rank[ra]++;
    count--;
  }
  return count;
}
`,
};

// ───────────────────────────────────────────────────────────── Problems

/** Blind 75 batch G. */
export const PROBLEMS_G: Problem[] = [
  // ---------------------------------------------------------------- linked lists
  {
    id: "p-linked-list-cycle",
    title: "Linked List Cycle",
    leetcodeSlug: "linked-list-cycle",
    difficulty: "easy",
    tags: ["linked_list", "two_pointers"],
    statement: `Given \`head\`, the head of a linked list, determine whether the list has a cycle in it. A list has a cycle if some node can be reached again by continuously following the \`next\` pointer.

Internally, \`pos\` is the index of the node that the tail's \`next\` pointer connects to (\`-1\` means there is no cycle). **\`pos\` is not passed to your function.**

Return \`true\` if there is a cycle in the linked list. Otherwise, return \`false\`.

**Follow up:** Can you solve it using \`O(1)\` (constant) memory?

**Judge note:** The judge passes the list values and \`pos\` as JSON. The starter's adapter builds real \`ListNode\`s, links the tail back to node \`pos\`, and calls your \`hasCycle(head)\`.`,
    examples: [
      { input: "head = [3,2,0,-4], pos = 1", output: "true", explanation: "The tail connects back to the node at index 1." },
      { input: "head = [1,2], pos = 0", output: "true", explanation: "The tail connects back to the head." },
      { input: "head = [1], pos = -1", output: "false", explanation: "There is no cycle." },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 10^4].",
      "-10^5 <= Node.val <= 10^5",
      "pos is -1 or a valid index in the linked list.",
    ],
    stages: {
      invariant: {
        prompt:
          "🐢 Linked List Cycle with Floyd's algorithm: how do the two pointers move, why must they meet if there is a cycle, and what's the space cost? Reply in 1-2 sentences.",
        answerKey:
          "Move slow one step and fast two steps at a time; if fast reaches null there is no cycle, but inside a cycle fast gains one node per step on slow, so the gap shrinks to zero and they must meet. It uses O(1) extra space instead of a visited set.",
        keyPoints: [
          { label: "Slow moves one step, fast moves two", anyOf: ["two steps", "2 steps", "twice as fast", "fast moves two", "double speed"] },
          { label: "Fast reaching null means no cycle", anyOf: ["reaches null", "hits null", "reaches the end", "fast is null", "becomes null"] },
          { label: "The gap closes by one each step, so they meet", anyOf: ["gains one", "gap shrinks", "closes by one", "must meet", "they meet", "catches up"] },
          { label: "O(1) space", anyOf: ["o(1)", "constant space", "constant extra", "no extra space", "instead of a visited set"] },
        ],
        hint: "Two runners on a circular track at different speeds: does the faster one ever lap the slower one?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: head = [1] with pos = -1, and head = [1] with pos = 0 (the node points to itself). What does each return, and which loop condition keeps the first from crashing? Reply in 1-2 sentences.",
        answerKey:
          "A single node with pos = -1 has no cycle, so false; with pos = 0 it is a self-loop, so true, because fast laps back onto slow after one step. Loop only while fast and fast.next are both non-null, so fast.next.next never dereferences null.",
        keyPoints: [
          { label: "pos = -1: false", anyOf: ["no cycle, so false", "has no cycle", "so false", "returns false"] },
          { label: "Self-loop: true", anyOf: ["self-loop, so true", "self-loop", "self loop", "points to itself", "so true"] },
          { label: "Check fast and fast.next", anyOf: ["fast and fast.next", "fast.next", "fast next", "null check"] },
        ],
        hint: "What does fast = fast.next.next do when fast is the last node?",
      },
      code: {
        functionName: CYCLE.wrapper,
        ...nodeSignature(CYCLE),
        starter: browserPart(cycleStarters),
        nativeStarters: nativePart(cycleStarters),
        reference: browserPart(cycleReference),
        tests: [
          { args: [[3, 2, 0, -4], 1], expected: true },
          { args: [[1, 2], 0], expected: true },
          { args: [[1], -1], expected: false },
          { args: [[], -1], expected: false },
          { args: [[1], 0], expected: true },
          { args: [[1, 2, 3, 4, 5], -1], expected: false },
          { args: [[1, 2, 3, 4, 5, 6], 5], expected: true, hidden: true },
          { args: [[5, 5, 5, 5], -1], expected: false, hidden: true },
          { args: [[7, 8, 9, 10, 11, 12, 13, 14], 3], expected: true, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["linked_list", "two_pointers"],
    relatedCardIds: ["mc-floyd-cycle-entry", "mc-fast-slow-middle"],
  },
  {
    id: "p-merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    leetcodeSlug: "merge-two-sorted-lists",
    difficulty: "easy",
    tags: ["linked_list", "two_pointers"],
    statement: `You are given the heads of two sorted linked lists \`list1\` and \`list2\`.

Merge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

${LIST_NOTE("mergeTwoLists(list1, list2)")}`,
    examples: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
      { input: "list1 = [], list2 = []", output: "[]" },
      { input: "list1 = [], list2 = [0]", output: "[0]" },
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order.",
    ],
    stages: {
      invariant: {
        prompt:
          "🔗 Merge Two Sorted Lists: why start from a dummy head, what does each loop step splice, and what happens when one list runs out? Reply in 1-2 sentences.",
        answerKey:
          "A dummy head gives the tail pointer a node to attach to, so the first node needs no special case. Each step compares the two heads and splices the smaller one onto the tail, then advances that list and the tail; when one list runs out, attach the rest of the other in one step because it is already sorted, and return dummy.next.",
        keyPoints: [
          { label: "Dummy head avoids a first-node special case", anyOf: ["dummy head", "dummy node", "sentinel"] },
          { label: "Splice the smaller head onto the tail", anyOf: ["smaller one", "smaller head", "smaller node", "compares the two heads", "compare the heads"] },
          { label: "Attach the leftover list", anyOf: ["rest of the other", "attach the rest", "remaining list", "leftover", "already sorted"] },
          { label: "Return dummy.next", anyOf: ["dummy.next", "dummy next"] },
        ],
        hint: "Where does the tail pointer start before any node has been chosen?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: list1 = [] and list2 = [0]. What should you return, and which common loop bug returns [] or crashes here? Reply in 1-2 sentences.",
        answerKey:
          "Return [0]: the loop never runs because list1 is empty, and the leftover step attaches all of list2. The bug is forgetting the leftover attachment, so the result is empty, or reading list1.val without checking list1 for null first.",
        keyPoints: [
          { label: "Return [0], the other list", anyOf: ["return [0]", "all of list2", "the other list", "return list2"] },
          { label: "Forgetting the leftover attachment", anyOf: ["forgetting the leftover", "forget the leftover", "leftover attachment", "result is empty"] },
          { label: "Null check before reading .val", anyOf: ["checking list1 for null", "null check", "check for null", "for null first"] },
        ],
        hint: "After the loop, is anything still left in one of the lists?",
      },
      code: {
        functionName: MERGE_TWO.wrapper,
        ...nodeSignature(MERGE_TWO),
        starter: browserPart(mergeTwoStarters),
        nativeStarters: nativePart(mergeTwoStarters),
        reference: browserPart(mergeTwoReference),
        tests: [
          { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
          { args: [[], []], expected: [] },
          { args: [[], [0]], expected: [0] },
          { args: [[5], [1, 2, 3]], expected: [1, 2, 3, 5] },
          { args: [[1, 1, 1], [1, 1]], expected: [1, 1, 1, 1, 1] },
          { args: [[-3, 0, 7], [-5, -2, 8, 9]], expected: [-5, -3, -2, 0, 7, 8, 9], hidden: true },
          { args: [[2], [1]], expected: [1, 2], hidden: true },
          { args: [[1, 3, 5, 7], [2, 4, 6, 8, 10, 12]], expected: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["linked_list"],
    relatedCardIds: ["mc-dummy-head-remove-nth", "mc-heap-k-way-merge"],
  },
  {
    id: "p-merge-k-sorted-lists",
    title: "Merge k Sorted Lists",
    leetcodeSlug: "merge-k-sorted-lists",
    difficulty: "hard",
    tags: ["linked_list", "heap"],
    statement: `You are given an array of \`k\` linked lists \`lists\`, each linked list is sorted in ascending order.

Merge all the linked lists into one sorted linked list and return it.

**Judge note:** The judge passes \`lists\` as an array of arrays. The starter's adapter builds a real \`ListNode\` list for each one (an empty array becomes \`null\`), calls your \`mergeKLists(lists)\`, and converts the result back to an array.`,
    examples: [
      { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
      { input: "lists = []", output: "[]" },
      { input: "lists = [[]]", output: "[]" },
    ],
    constraints: [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4",
      "lists[i] is sorted in ascending order.",
      "The sum of lists[i].length will not exceed 10^4.",
    ],
    stages: {
      invariant: {
        prompt:
          "🧺 Merge k Sorted Lists with a min-heap: what sits in the heap, what do you do after popping, and what's the time complexity for N total nodes? Reply in 1-2 sentences.",
        answerKey:
          "The heap holds at most one node per list, its current head, keyed by value. Pop the smallest, append it to the result tail, and push that node's next if it exists; each of the N nodes is pushed and popped once in a heap of size k, so O(N log k).",
        keyPoints: [
          { label: "One head per list in the heap", anyOf: ["one node per list", "one per list", "current head", "head of each list", "k heads"] },
          { label: "Push the popped node's next", anyOf: ["push that node's next", "node's next", "push its next", "push next", "next node"] },
          { label: "O(N log k)", anyOf: ["o(n log k)", "n log k", "nlogk"] },
        ],
        hint: "At any moment, which k nodes are the only candidates for the next smallest value?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: lists = [[], [1], []]. What goes wrong if you push every list head into the heap, and what should the answer be? Reply in 1-2 sentences.",
        answerKey:
          "Empty lists have a null head, so pushing them puts null into the heap and comparing null.val crashes; skip null heads when seeding and when pushing a missing next. The answer is [1], and lists = [] or [[]] must return an empty list.",
        keyPoints: [
          { label: "Skip null heads", anyOf: ["skip null", "only push non-null", "non-null heads", "skip empty"] },
          { label: "Comparing null crashes", anyOf: ["crashes", "null.val", "error", "compare null"] },
          { label: "Answer is [1]", anyOf: ["answer is [1]", "is [1]", "return [1]"] },
          { label: "Empty input returns an empty list", anyOf: ["return an empty list", "empty list", "empty result"] },
        ],
        hint: "What is the head of an empty list, and what happens when the heap compares it?",
      },
      code: {
        functionName: MERGE_K.wrapper,
        ...nodeSignature(MERGE_K),
        starter: browserPart(mergeKStarters),
        nativeStarters: nativePart(mergeKStarters),
        reference: browserPart(mergeKReference),
        tests: [
          { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
          { args: [[]], expected: [] },
          { args: [[[]]], expected: [] },
          { args: [[[], [1], []]], expected: [1] },
          { args: [[[5], [1], [3]]], expected: [1, 3, 5] },
          { args: [[[-1, 5, 11], [], [6, 10], [-3]]], expected: [-3, -1, 5, 6, 10, 11], hidden: true },
          { args: [[[1, 2, 3]]], expected: [1, 2, 3], hidden: true },
          { args: [[[2, 2], [2], [1, 3]]], expected: [1, 2, 2, 2, 3], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["heap", "linked_list"],
    relatedCardIds: ["mc-heap-k-way-merge", "mc-dummy-head-remove-nth"],
  },
  {
    id: "p-reorder-list",
    title: "Reorder List",
    leetcodeSlug: "reorder-list",
    difficulty: "medium",
    tags: ["linked_list", "two_pointers"],
    statement: `You are given the head of a singly linked-list. The list can be represented as:

\`L0 → L1 → … → Ln - 1 → Ln\`

Reorder the list to be on the following form:

\`L0 → Ln → L1 → Ln - 1 → L2 → Ln - 2 → …\`

You may not modify the values in the list's nodes. Only nodes themselves may be changed.

**Judge note:** The judge passes the list as a plain array. The starter's adapter builds real \`ListNode\`s, calls your \`reorderList(head)\` (which returns nothing), and reads the list back from the original head.`,
    examples: [
      { input: "head = [1,2,3,4]", output: "[1,4,2,3]" },
      { input: "head = [1,2,3,4,5]", output: "[1,5,2,4,3]" },
    ],
    constraints: ["The number of nodes in the list is in the range [1, 5 * 10^4].", "1 <= Node.val <= 1000"],
    stages: {
      invariant: {
        prompt:
          "🔀 Reorder List (L0, Ln, L1, Ln-1, ...) in O(1) extra space: what are the three phases, and how do you find where the second half starts? Reply in 1-2 sentences.",
        answerKey:
          "Use slow and fast pointers to find the middle, cut the list there and reverse the second half, then weave the two halves by alternating one node from each. Fast moves two steps per slow step, so when fast stops, slow sits at the end of the first half.",
        keyPoints: [
          { label: "Find the middle with slow/fast pointers", anyOf: ["find the middle", "slow and fast", "fast pointer", "middle"] },
          { label: "Reverse the second half", anyOf: ["reverse the second half", "reverse the back half", "reversing the second half", "reverse the second"] },
          { label: "Alternate nodes from the two halves", anyOf: ["alternating", "alternate", "interleave", "weave"] },
        ],
        hint: "The order wants the tail next to the head. Which half would be easy to walk if it pointed backwards?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: head = [1,2,3,4,5]. After finding the middle (3), what happens if you never set 3's next to null before weaving the halves? Reply in 1-2 sentences.",
        answerKey:
          "Node 3 keeps its stale next pointing at 4, and after the weave 4 points back to 3, so the list has a cycle and reading it never ends. Cut the list with slow.next = null before reversing; the correct result is [1,5,2,4,3].",
        keyPoints: [
          { label: "It creates a cycle", anyOf: ["cycle", "loops back", "never ends", "infinite loop"] },
          { label: "Cut with slow.next = null", anyOf: ["slow.next = null", "cut the list", "set slow.next"] },
          { label: "Correct result [1,5,2,4,3]", anyOf: ["[1,5,2,4,3]", "1,5,2,4,3", "1 5 2 4 3"] },
        ],
        hint: "After reversing 4 → 5 into 5 → 4, where does 3.next still point?",
      },
      code: {
        functionName: REORDER.wrapper,
        ...nodeSignature(REORDER),
        starter: browserPart(reorderStarters),
        nativeStarters: nativePart(reorderStarters),
        reference: browserPart(reorderReference),
        tests: [
          { args: [[1, 2, 3, 4]], expected: [1, 4, 2, 3] },
          { args: [[1, 2, 3, 4, 5]], expected: [1, 5, 2, 4, 3] },
          { args: [[1]], expected: [1] },
          { args: [[1, 2]], expected: [1, 2] },
          { args: [[1, 2, 3]], expected: [1, 3, 2] },
          { args: [[10, 20, 30, 40, 50, 60]], expected: [10, 60, 20, 50, 30, 40], hidden: true },
          { args: [[5, 5, 1, 1]], expected: [5, 1, 5, 1], hidden: true },
          { args: [[7, 8, 9, 10, 11, 12, 13]], expected: [7, 13, 8, 12, 9, 11, 10], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["linked_list", "two_pointers"],
    relatedCardIds: ["mc-reorder-list-three-steps", "mc-reverse-linked-list", "mc-fast-slow-middle"],
  },

  // ---------------------------------------------------------------- graphs
  {
    id: "p-clone-graph",
    title: "Clone Graph",
    leetcodeSlug: "clone-graph",
    difficulty: "medium",
    tags: ["dfs", "bfs", "hashing"],
    statement: `Given a reference of a node in a **connected** undirected graph, return a **deep copy** (clone) of the graph.

Each node in the graph contains a value (\`int\`) and a list (\`List[Node]\`) of its neighbors.

**Test case format:** Each node's value equals its index (1-indexed). The graph is given as an adjacency list: \`adjList[i]\` lists the neighbors of the node with value \`i + 1\`. The given node is always the node with \`val = 1\` (or \`null\` for an empty graph). Return a copy of the given node as a reference to the cloned graph.

**Judge note:** The judge passes the adjacency list. The starter's adapter builds real \`Node\`s, calls your \`cloneGraph(node)\`, checks that no node in your result is one of the original nodes (so returning the input fails), and serializes your clone back to an adjacency list, keeping each neighbor list's order.`,
    examples: [
      {
        input: "adjList = [[2,4],[1,3],[2,4],[1,3]]",
        output: "[[2,4],[1,3],[2,4],[1,3]]",
        explanation: "Four nodes in a square: 1-2, 2-3, 3-4, 4-1. The clone has the same shape with new nodes.",
      },
      { input: "adjList = [[]]", output: "[[]]", explanation: "One node with no neighbors." },
      { input: "adjList = []", output: "[]", explanation: "An empty graph." },
    ],
    constraints: [
      "The number of nodes in the graph is in the range [0, 100].",
      "1 <= Node.val <= 100",
      "Node.val is unique for each node.",
      "There are no repeated edges and no self-loops in the graph.",
      "The graph is connected and all nodes can be visited starting from the given node.",
    ],
    stages: {
      invariant: {
        prompt:
          "🧬 Clone Graph: what map do you keep, and at what moment must you record a node in it so cycles don't recurse forever? Reply in 1-2 sentences.",
        answerKey:
          "Keep a hash map from each original node to its copy. Create the copy and put it in the map before visiting the neighbors, when it is first discovered, so a cycle that leads back finds the existing copy instead of cloning again; each node and edge is handled once, O(V + E).",
        keyPoints: [
          { label: "Map original node to its copy", anyOf: ["hash map", "original node to its copy", "original to copy", "old to new", "original to clone"] },
          { label: "Record the copy before visiting neighbors", anyOf: ["before visiting the neighbors", "before visiting", "before recursing", "first discovered", "before exploring"] },
          { label: "O(V + E)", anyOf: ["o(v + e)", "o(v+e)", "v + e", "linear"] },
        ],
        hint: "An undirected edge means node 2 lists node 1 as a neighbor too. What stops you from cloning node 1 twice?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: adjList = [[2],[1]] (two nodes pointing at each other). What happens if you only record a node's copy after its neighbors are done, and what does an empty graph return? Reply in 1-2 sentences.",
        answerKey:
          "Cloning node 1 clones node 2, which looks up node 1, finds no copy yet, and clones it again, so the recursion never stops and you get a stack overflow. Store the copy in the map before touching neighbors. An empty graph (a null node) returns null.",
        keyPoints: [
          { label: "Infinite recursion", anyOf: ["never stops", "infinite", "stack overflow", "clones it again"] },
          { label: "Store the copy before touching neighbors", anyOf: ["store the copy", "in the map before", "before touching neighbors", "map before"] },
          { label: "Null in, null out", anyOf: ["returns null", "return null", "null node"] },
        ],
        hint: "Trace cloneGraph(1) → neighbor 2 → neighbor 1. Is node 1 in the map yet?",
      },
      code: {
        functionName: "cloneGraphAdjacency",
        params: ["adjList"],
        signature: { params: ["int[][]"], returns: "int[][]" },
        starter: browserPart(cloneStarters),
        nativeStarters: nativePart(cloneStarters),
        reference: browserPart(cloneReference),
        tests: [
          { args: [[[2, 4], [1, 3], [2, 4], [1, 3]]], expected: [[2, 4], [1, 3], [2, 4], [1, 3]] },
          { args: [[[]]], expected: [[]] },
          { args: [[]], expected: [] },
          { args: [[[2], [1]]], expected: [[2], [1]] },
          { args: [[[2, 3], [1, 3], [1, 2]]], expected: [[2, 3], [1, 3], [1, 2]] },
          { args: [[[2], [1, 3], [2, 4], [3]]], expected: [[2], [1, 3], [2, 4], [3]], hidden: true },
          { args: [[[2, 3, 4, 5], [1], [1], [1], [1]]], expected: [[2, 3, 4, 5], [1], [1], [1], [1]], hidden: true },
          { args: [[[3, 2], [3, 1], [2, 1]]], expected: [[3, 2], [3, 1], [2, 1]], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dfs", "hashing"],
    relatedCardIds: ["mc-clone-graph-visited-map", "mc-bfs-unweighted-shortest-path"],
  },
  {
    id: "p-pacific-atlantic-water-flow",
    title: "Pacific Atlantic Water Flow",
    leetcodeSlug: "pacific-atlantic-water-flow",
    difficulty: "medium",
    tags: ["bfs", "dfs", "matrix"],
    statement: `There is an \`m x n\` rectangular island that borders both the **Pacific Ocean** and **Atlantic Ocean**. The Pacific Ocean touches the island's left and top edges, and the Atlantic Ocean touches the island's right and bottom edges.

The island is partitioned into a grid of square cells. You are given an \`m x n\` integer matrix \`heights\` where \`heights[r][c]\` represents the height above sea level of the cell at coordinate \`(r, c)\`.

Rain water can flow to neighboring cells directly north, south, east, and west if the neighboring cell's height is **less than or equal to** the current cell's height. Water can flow from any cell adjacent to an ocean into the ocean.

Return a 2D list of grid coordinates \`result\` where \`result[i] = [r_i, c_i]\` denotes that rain water can flow from cell \`(r_i, c_i)\` to **both** the Pacific and Atlantic oceans. The cells may be returned in any order.`,
    examples: [
      {
        input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
      },
      { input: "heights = [[1]]", output: "[[0,0]]", explanation: "The single cell touches both oceans." },
    ],
    constraints: ["m == heights.length", "n == heights[r].length", "1 <= m, n <= 200", "0 <= heights[r][c] <= 10^5"],
    stages: {
      invariant: {
        prompt:
          "🌊 Pacific Atlantic Water Flow: instead of simulating water from every cell, where do you start the search, which direction do you walk, and how do you get the answer? Reply in 1-2 sentences.",
        answerKey:
          "Search in reverse from the ocean edges: run one BFS or DFS from every Pacific border cell (top row and left column) and one from every Atlantic border cell (bottom row and right column), stepping only to neighbors whose height is greater than or equal to the current cell. The answer is the intersection of the two reachable sets, O(m * n) total.",
        keyPoints: [
          { label: "Start from the ocean borders", anyOf: ["ocean edges", "border cell", "from the ocean", "from the edges", "border"] },
          { label: "Walk uphill (height >= current)", anyOf: ["greater than or equal", "uphill", "higher or equal", "at least as high"] },
          { label: "Intersect the two reachable sets", anyOf: ["intersection", "reachable from both", "both sets", "in both"] },
          { label: "O(m * n)", anyOf: ["o(m * n)", "o(m*n)", "o(mn)", "m * n"] },
        ],
        hint: "Water flows downhill into an ocean. Which cells can an ocean reach if you let water flow backwards?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: heights = [[1,1],[1,1]] (a flat grid). Which cells are in the answer, and what comparison bug drops some of them? Reply in 1-2 sentences.",
        answerKey:
          "All four cells, because water flows between equal heights, so every cell reaches both oceans. A strict greater-than when walking inward blocks equal neighbors, so [0,0] never reaches the Atlantic and [1,1] never reaches the Pacific; the test must be greater than or equal.",
        keyPoints: [
          { label: "All four cells", anyOf: ["all four", "all 4", "every cell", "all cells"] },
          { label: "Water flows between equal heights", anyOf: ["equal heights", "equal neighbors", "equal height", "same height"] },
          { label: "Use greater than or equal", anyOf: ["greater than or equal", "or equal", "non-strict"] },
        ],
        hint: "Can water move from a cell of height 1 to a neighbor of height 1?",
      },
      code: {
        functionName: "pacificAtlantic",
        params: ["heights"],
        signature: { params: ["int[][]"], returns: "list<list<int>>" },
        starter: {
          javascript: `/**
 * @param {number[][]} heights
 * @return {number[][]} [row, col] cells that reach both oceans, in any order
 */
function pacificAtlantic(heights) {
  // Your code here
  return [];
}
`,
          python: `def pacificAtlantic(heights: List[List[int]]) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: { javascript: PACIFIC_REF.javascript, python: PACIFIC_REF.python },
        tests: [
          {
            args: [[[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]],
            expected: [[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]],
          },
          { args: [[[1]]], expected: [[0, 0]] },
          { args: [[[1, 1], [1, 1]]], expected: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { args: [[[1, 2, 3]]], expected: [[0, 0], [0, 1], [0, 2]] },
          { args: [[[3, 3, 3], [3, 1, 3], [0, 2, 4]]], expected: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]] },
          { args: [[[1, 2, 3], [8, 9, 4], [7, 6, 5]]], expected: [[0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
          { args: [[[10, 10, 10], [10, 1, 10], [10, 10, 10]]], expected: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]], hidden: true },
          { args: [[[5, 4, 3], [6, 1, 2], [7, 8, 9]]], expected: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [2, 1], [2, 2]], hidden: true },
          { args: [[[1], [2], [3]]], expected: [[0, 0], [1, 0], [2, 0]], hidden: true },
        ],
        compare: "unordered",
      },
    },
    weakTags: ["bfs", "matrix"],
    relatedCardIds: ["mc-grid-flood-fill-from-border", "mc-multi-source-bfs"],
  },
  {
    id: "p-alien-dictionary",
    title: "Alien Dictionary",
    leetcodeSlug: "alien-dictionary",
    difficulty: "hard",
    tags: ["topological_sort", "bfs", "string"],
    statement: `There is a new alien language that uses the English lowercase letters, but the order among the letters is unknown to you.

You are given a list of strings \`words\` from the alien language's dictionary, where the strings in \`words\` are **sorted lexicographically** by the rules of this new language.

Return a string of the unique letters in the new alien language sorted in **lexicographically increasing order** by the new language's rules. If there is no valid order, return \`""\`. If there are multiple solutions, return any of them. The result contains exactly the letters that appear in \`words\`, each once.

**Judge note:** Every test here has exactly one valid order (or none), so the judge compares your string exactly.`,
    examples: [
      {
        input: 'words = ["wrt","wrf","er","ett","rftt"]',
        output: '"wertf"',
        explanation: "The pairs give t < f, w < e, r < t and e < r, so w < e < r < t < f.",
      },
      { input: 'words = ["z","x"]', output: '"zx"' },
      { input: 'words = ["z","x","z"]', output: '""', explanation: "z < x and x < z form a cycle." },
    ],
    constraints: ["1 <= words.length <= 100", "1 <= words[i].length <= 100", "words[i] consists of only lowercase English letters."],
    stages: {
      invariant: {
        prompt:
          "👽 Alien Dictionary: where do the ordering edges come from, how many does each adjacent pair of words give, and how do you turn them into an order? Reply in 1-2 sentences.",
        answerKey:
          "Compare each adjacent pair of words and look only at the first position where they differ: that gives one edge, the letter from the first word comes before the letter from the second. Then topologically sort all letters that appear with Kahn's algorithm (indegree 0 first); if some letters are never output there is a cycle, so return an empty string.",
        keyPoints: [
          { label: "Adjacent pairs, first differing letter", anyOf: ["first position where they differ", "first differing", "first difference", "first mismatch"] },
          { label: "At most one edge per pair", anyOf: ["one edge", "single edge", "at most one"] },
          { label: "Topological sort", anyOf: ["topologically", "topological", "topo sort", "kahn"] },
          { label: "Cycle means an empty string", anyOf: ["there is a cycle", "cycle", "empty string"] },
        ],
        hint: "In a real dictionary, what does 'cat' before 'cow' tell you, and what does it not tell you about later letters?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: words = ['abc', 'ab']. What must you return, and why does a loop that only looks for the first differing letter miss the problem? Reply in 1-2 sentences.",
        answerKey:
          "Return an empty string: 'ab' is a prefix of 'abc' yet comes after it, which no letter order allows. The pair has no mismatch, so that loop finds no edge and silently accepts it; when two words match up to the shorter length, the first must not be the longer one.",
        keyPoints: [
          { label: "Return an empty string", anyOf: ["empty string", "invalid"] },
          { label: "A prefix listed after its extension", anyOf: ["is a prefix", "prefix of", "prefix after"] },
          { label: "No mismatch means no edge, so check lengths", anyOf: ["no mismatch", "no edge", "shorter length", "longer one", "check the lengths"] },
        ],
        hint: "Is there any letter order in which 'abc' sorts before 'ab'?",
      },
      code: {
        functionName: "alienOrder",
        params: ["words"],
        signature: { params: ["string[]"], returns: "string" },
        starter: {
          javascript: `/**
 * @param {string[]} words - sorted by the alien alphabet
 * @return {string} the alphabet (letters that appear), or "" if impossible
 */
function alienOrder(words) {
  // Your code here
  return "";
}
`,
          python: `def alienOrder(words: List[str]) -> str:
    # Your code here
    return ""
`,
        },
        reference: { javascript: ALIEN_REF.javascript, python: ALIEN_REF.python },
        tests: [
          { args: [["wrt", "wrf", "er", "ett", "rftt"]], expected: "wertf" },
          { args: [["z", "x"]], expected: "zx" },
          { args: [["z", "x", "z"]], expected: "" },
          { args: [["abc", "ab"]], expected: "" },
          { args: [["z", "z"]], expected: "z" },
          { args: [["ba", "bc", "ac", "cab"]], expected: "bac" },
          { args: [["caa", "aaa", "aab"]], expected: "cab", hidden: true },
          { args: [["a", "b", "c", "a"]], expected: "", hidden: true },
          { args: [["zy", "zx", "yx"]], expected: "zyx", hidden: true },
          { args: [["x", "xy", "y"]], expected: "xy", hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["topological_sort"],
    relatedCardIds: ["mc-alien-dictionary-edges", "mc-kahn-cycle-detection", "mc-dfs-directed-cycle-colors"],
  },
  {
    id: "p-graph-valid-tree",
    title: "Graph Valid Tree",
    leetcodeSlug: "graph-valid-tree",
    difficulty: "medium",
    tags: ["union_find", "dfs", "bfs"],
    statement: `You have a graph of \`n\` nodes labeled from \`0\` to \`n - 1\`. You are given an integer \`n\` and a list of \`edges\` where \`edges[i] = [a_i, b_i]\` indicates that there is an undirected edge between nodes \`a_i\` and \`b_i\` in the graph.

Return \`true\` if the edges of the given graph make up a valid tree, and \`false\` otherwise.`,
    examples: [
      { input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", output: "true" },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]", output: "false", explanation: "1-2-3 forms a cycle." },
    ],
    constraints: [
      "1 <= n <= 2000",
      "0 <= edges.length <= 5000",
      "edges[i].length == 2",
      "0 <= a_i, b_i < n",
      "a_i != b_i",
      "There are no self-loops or repeated edges.",
    ],
    stages: {
      invariant: {
        prompt:
          "🌳 Graph Valid Tree: which two conditions make n nodes and a list of edges a tree, and how does union-find check them in one pass? Reply in 1-2 sentences.",
        answerKey:
          "A tree has exactly n - 1 edges and no cycle, which together force it to be connected. Reject if the edge count is off, then union each edge's endpoints; if an edge joins two nodes that already share a root it closes a cycle, so return false, otherwise it is a tree.",
        keyPoints: [
          { label: "Exactly n - 1 edges", anyOf: ["n - 1 edges", "n-1 edges", "exactly n - 1", "edge count"] },
          { label: "No cycle (so connected)", anyOf: ["no cycle", "acyclic", "connected"] },
          { label: "Union-find: same root means a cycle", anyOf: ["already share a root", "share a root", "same root", "same set"] },
        ],
        hint: "How many edges does every tree on n nodes have, and what does one extra or one missing edge do?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: n = 4, edges = [[0,1],[1,2],[2,0]]. It has n - 1 edges; is it a tree, and why is counting edges alone not enough? Reply in 1-2 sentences.",
        answerKey:
          "It is not a tree, so return false: the three edges form a cycle 0-1-2 and node 3 is left disconnected. With exactly n - 1 edges a cycle always leaves some node disconnected, so you still need the cycle or connectivity check on top of the count.",
        keyPoints: [
          { label: "Return false", anyOf: ["return false", "false"] },
          { label: "0-1-2 is a cycle", anyOf: ["form a cycle", "cycle 0-1-2", "cycle"] },
          { label: "Node 3 is disconnected", anyOf: ["node 3", "disconnected", "isolated"] },
        ],
        hint: "Draw it. Which node has no edges at all?",
      },
      code: {
        functionName: "validTree",
        params: ["n", "edges"],
        signature: { params: ["int", "int[][]"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {number} n
 * @param {number[][]} edges - undirected [a, b] pairs
 * @return {boolean}
 */
function validTree(n, edges) {
  // Your code here
  return false;
}
`,
          python: `def validTree(n: int, edges: List[List[int]]) -> bool:
    # Your code here
    return False
`,
        },
        reference: { javascript: VALID_TREE_REF.javascript, python: VALID_TREE_REF.python },
        tests: [
          { args: [5, [[0, 1], [0, 2], [0, 3], [1, 4]]], expected: true },
          { args: [5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]], expected: false },
          { args: [1, []], expected: true },
          { args: [2, []], expected: false },
          { args: [4, [[0, 1], [1, 2], [2, 0]]], expected: false },
          { args: [2, [[1, 0]]], expected: true },
          { args: [3, [[1, 0], [2, 0]]], expected: true, hidden: true },
          { args: [6, [[0, 1], [0, 2], [2, 3], [2, 4], [4, 5]]], expected: true, hidden: true },
          { args: [4, [[0, 1], [2, 3]]], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["union_find"],
    relatedCardIds: ["mc-union-find-valid-tree", "mc-union-find-rank-compression"],
  },
  {
    id: "p-number-of-connected-components",
    title: "Number of Connected Components in an Undirected Graph",
    leetcodeSlug: "number-of-connected-components-in-an-undirected-graph",
    difficulty: "medium",
    tags: ["union_find", "dfs", "bfs"],
    statement: `You have a graph of \`n\` nodes. You are given an integer \`n\` and an array \`edges\` where \`edges[i] = [a_i, b_i]\` indicates that there is an edge between \`a_i\` and \`b_i\` in the graph.

Return the number of connected components in the graph.`,
    examples: [
      { input: "n = 5, edges = [[0,1],[1,2],[3,4]]", output: "2" },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", output: "1" },
    ],
    constraints: [
      "1 <= n <= 2000",
      "1 <= edges.length <= 5000 (tests here also include no edges)",
      "edges[i].length == 2",
      "0 <= a_i <= b_i < n",
      "a_i != b_i",
      "There are no repeated edges.",
    ],
    stages: {
      invariant: {
        prompt:
          "🧩 Number of Connected Components: with union-find, what count do you start with, when does it change, and what's the complexity? Reply in 1-2 sentences.",
        answerKey:
          "Start with n components, one per node. For each edge, find both roots; if they differ, union them and decrement the count, and if they already match the edge changes nothing. With path compression and union by rank this is nearly O(n + E).",
        keyPoints: [
          { label: "Start with n components", anyOf: ["start with n", "n components", "one per node"] },
          { label: "Decrement on a successful union", anyOf: ["decrement", "subtract one", "minus one", "reduce the count"] },
          { label: "Near-linear with path compression and rank", anyOf: ["path compression", "union by rank", "nearly o(n + e)", "inverse ackermann", "near-linear"] },
        ],
        hint: "Every node begins alone. What exactly happens to the number of groups when an edge joins two different groups?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: n = 4 with edges = [], and n = 3 with edges = [[0,1],[1,2],[0,2]]. What are the counts, and why is the second not n minus the edge count? Reply in 1-2 sentences.",
        answerKey:
          "No edges gives 4, since every node is its own component. The triangle gives 1, but n minus edges would say 0: the edge [0,2] joins nodes that already share a root, so it forms a cycle and must be skipped without changing the count.",
        keyPoints: [
          { label: "No edges: 4", anyOf: ["gives 4", "own component", "4 components", "is 4"] },
          { label: "Triangle: 1", anyOf: ["gives 1", "one component", "1 component", "is 1"] },
          { label: "A redundant edge changes nothing", anyOf: ["already share a root", "same root", "forms a cycle", "redundant"] },
        ],
        hint: "When you reach [0,2], are 0 and 2 already connected?",
      },
      code: {
        functionName: "countComponents",
        params: ["n", "edges"],
        signature: { params: ["int", "int[][]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number} n
 * @param {number[][]} edges - undirected [a, b] pairs
 * @return {number}
 */
function countComponents(n, edges) {
  // Your code here
  return 0;
}
`,
          python: `def countComponents(n: int, edges: List[List[int]]) -> int:
    # Your code here
    return 0
`,
        },
        reference: { javascript: COMPONENTS_REF.javascript, python: COMPONENTS_REF.python },
        tests: [
          { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2 },
          { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expected: 1 },
          { args: [1, []], expected: 1 },
          { args: [4, []], expected: 4 },
          { args: [6, [[0, 1], [1, 2], [0, 2], [3, 4]]], expected: 3 },
          { args: [3, [[0, 1], [0, 2]]], expected: 1, hidden: true },
          { args: [7, [[1, 2], [3, 4], [5, 6], [2, 3]]], expected: 3, hidden: true },
          { args: [10, [[0, 9], [8, 9], [5, 6]]], expected: 7, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["union_find", "dfs"],
    relatedCardIds: ["mc-union-find-rank-compression", "mc-union-find-optimizations"],
  },

  // ---------------------------------------------------------------- heap / design
  {
    id: "p-find-median-from-data-stream",
    title: "Find Median from Data Stream",
    leetcodeSlug: "find-median-from-data-stream",
    difficulty: "hard",
    tags: ["heap", "design"],
    statement: `The **median** is the middle value in an ordered integer list. If the size of the list is even, there is no middle value, and the median is the mean of the two middle values.

- For \`arr = [2,3,4]\`, the median is \`3\`.
- For \`arr = [2,3]\`, the median is \`(2 + 3) / 2 = 2.5\`.

Implement the \`MedianFinder\` class:

- \`MedianFinder()\` initializes the \`MedianFinder\` object.
- \`addNum(num)\` adds the integer \`num\` from the data stream to the data structure.
- \`findMedian()\` returns the median of all elements so far. Answers within \`10^-5\` of the actual answer will be accepted.

**Judge note:** The judge replays a list of operations on one \`MedianFinder\` through the starter's \`runMedianFinder\` adapter. \`values[i]\` is the number for \`addNum\` (it is ignored for \`findMedian\`), and \`addNum\` records \`null\`.`,
    examples: [
      {
        input: 'operations = ["addNum","addNum","findMedian","addNum","findMedian"], values = [1,2,0,3,0]',
        output: "[null,null,1.5,null,2.0]",
        explanation: "After 1 and 2 the median is 1.5; after 3 it is 2.",
      },
    ],
    constraints: [
      "-10^5 <= num <= 10^5",
      "There will be at least one element in the data structure before calling findMedian.",
      "At most 5 * 10^4 calls will be made to addNum and findMedian.",
    ],
    stages: {
      invariant: {
        prompt:
          "⚖️ Find Median from Data Stream: what do the two heaps hold, what size rule do you keep after each addNum, and where is the median read from? Reply in 1-2 sentences.",
        answerKey:
          "A max-heap holds the smaller half and a min-heap holds the larger half, with every value in the max-heap at most every value in the min-heap. After each add, rebalance so the max-heap has the same size or one more; the median is its top when the count is odd, else the average of the two tops, so addNum is O(log n) and findMedian O(1).",
        keyPoints: [
          { label: "Max-heap for the smaller half, min-heap for the larger", anyOf: ["smaller half", "max-heap holds", "max-heap", "max heap"] },
          { label: "Sizes equal or the max-heap one larger", anyOf: ["same size or one more", "one more", "differ by at most one", "rebalance"] },
          { label: "Median from the heap tops", anyOf: ["average of the two tops", "two tops", "its top"] },
          { label: "O(log n) add, O(1) median", anyOf: ["o(log n)", "log n"] },
        ],
        hint: "You only ever need the one or two middle values. Which structure hands you the largest of the lower half instantly?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: addNum(1), addNum(2), addNum(3), then findMedian(). What should it return, and what breaks if each number goes straight onto the max-heap and you only rebalance sizes? Reply in 1-2 sentences.",
        answerKey:
          "It should return 2. With size-only balancing, 3 lands in the smaller-half max-heap above the 2 sitting in the min-heap, so findMedian returns 3 and the order rule breaks. Push each number onto the max-heap, move the top to the min-heap, then move one back if the min-heap got bigger.",
        keyPoints: [
          { label: "Returns 2", anyOf: ["should return 2", "return 2", "median is 2"] },
          { label: "Size-only balancing puts 3 on the wrong side", anyOf: ["lands in the smaller", "returns 3", "wrong side", "wrong heap", "order rule"] },
          { label: "Move the top across before rebalancing", anyOf: ["move the top", "move its top", "top to the min-heap", "route"] },
        ],
        hint: "After adding 3 to the max-heap, is its top still at most the min-heap's top?",
      },
      code: {
        functionName: "runMedianFinder",
        params: ["operations", "values"],
        signature: { params: ["string[]", "int[]"], returns: "list<double?>" },
        starter: browserPart(medianStarters),
        nativeStarters: nativePart(medianStarters),
        reference: browserPart(medianReference),
        tests: [
          {
            args: [["addNum", "addNum", "findMedian", "addNum", "findMedian"], [1, 2, 0, 3, 0]],
            expected: [null, null, 1.5, null, 2],
          },
          { args: [["addNum", "findMedian"], [5, 0]], expected: [null, 5] },
          { args: [["addNum", "addNum", "findMedian"], [-1, -2, 0]], expected: [null, null, -1.5] },
          {
            args: [
              ["addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian"],
              [-1, 0, -2, 0, -3, 0, -4, 0, -5, 0],
            ],
            expected: [null, -1, null, -1.5, null, -2, null, -2.5, null, -3],
          },
          {
            args: [
              ["addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian"],
              [100000, 0, -100000, 0, 3, 0, 7, 0],
            ],
            expected: [null, 100000, null, 0, null, 3, null, 5],
          },
          {
            args: [
              [
                "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum",
                "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian",
              ],
              [6, 0, 10, 0, 2, 0, 6, 0, 5, 0, 0, 0, 6, 0, 3, 0, 1, 0, 0, 0, 0, 0],
            ],
            expected: [null, 6, null, 8, null, 6, null, 6, null, 6, null, 5.5, null, 6, null, 5.5, null, 5, null, 4, null, 3],
            hidden: true,
          },
          {
            args: [
              ["addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian"],
              [2, 0, 2, 0, 2, 0, 2, 0],
            ],
            expected: [null, 2, null, 2, null, 2, null, 2],
            hidden: true,
          },
          {
            args: [
              [
                "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum",
                "findMedian", "addNum", "findMedian",
              ],
              [1, 0, 3, 0, 5, 0, 7, 0, 9, 0, 11, 0, 2, 0],
            ],
            expected: [null, 1, null, 2, null, 3, null, 4, null, 5, null, 6, null, 5],
            hidden: true,
          },
        ],
        compare: "float",
      },
    },
    weakTags: ["heap"],
    relatedCardIds: ["mc-two-heaps-median", "mc-heap-top-k-min-heap"],
  },
];

/** Java / C++ / Go / TypeScript reference solutions for this batch, by problem id. */
export const NATIVE_REFERENCES_G: Record<string, Record<NativeLanguage, string>> = {
  "p-linked-list-cycle": nativePart(cycleReference),
  "p-merge-two-sorted-lists": nativePart(mergeTwoReference),
  "p-merge-k-sorted-lists": nativePart(mergeKReference),
  "p-reorder-list": nativePart(reorderReference),
  "p-clone-graph": nativePart(cloneReference),
  "p-pacific-atlantic-water-flow": nativePart(PACIFIC_REF),
  "p-alien-dictionary": nativePart(ALIEN_REF),
  "p-graph-valid-tree": nativePart(VALID_TREE_REF),
  "p-number-of-connected-components": nativePart(COMPONENTS_REF),
  "p-find-median-from-data-stream": nativePart(medianReference),
};
