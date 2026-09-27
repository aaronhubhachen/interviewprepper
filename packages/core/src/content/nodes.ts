import { nativeTypeName, type NativeLanguage, type Signature, type ValueType } from "../judge/native";
import { LIST_NODE, TREE_NODE, type AdapterLanguage, type SourceSet } from "./adapters";

/**
 * General node adapters: any mix of trees, linked lists, lists of lists, cyclic lists, and
 * plain values in; a tree, a list, a plain value, or an in-place-modified node out. The judge
 * still speaks JSON (level-order arrays for trees, plain arrays for lists), so each language
 * gets small build/serialize helpers plus a marked wrapper around the function the user writes.
 */
export type NodeParam =
  /** Level-order array (null for gaps) → TreeNode. */
  | { kind: "tree"; name: string }
  /** Array → ListNode. */
  | { kind: "list"; name: string }
  /** Array of arrays → ListNode[] (vector<ListNode*>, []*ListNode). */
  | { kind: "lists"; name: string }
  /** Two JSON args: values and pos; the tail links back to node `pos` (-1 = no cycle). */
  | { kind: "cycle"; name: string }
  /** Passed through unchanged. */
  | { kind: "value"; name: string; type: ValueType };

export type NodeReturn =
  | { kind: "tree" }
  | { kind: "list" }
  | { kind: "value"; type: ValueType }
  /** The user's function returns nothing and edits parameter `param` (a list or a tree) in place. */
  | { kind: "inPlace"; param: number };

export interface NodeSpec {
  /** Entry point the judge calls (JSON-friendly values). */
  wrapper: string;
  /** The function the user implements. */
  call: string;
  params: NodeParam[];
  returns: NodeReturn;
}

const MARK = "Judge adapter: builds the input from the test's arrays. No need to edit below.";

interface WrapperArg {
  name: string;
  type: ValueType;
}

function wrapperArgs(spec: NodeSpec): WrapperArg[] {
  return spec.params.flatMap((param): WrapperArg[] => {
    switch (param.kind) {
      case "tree":
        return [{ name: param.name, type: "int?[]" }];
      case "list":
        return [{ name: param.name, type: "int[]" }];
      case "lists":
        return [{ name: param.name, type: "list<list<int>>" }];
      case "cycle":
        return [
          { name: param.name, type: "int[]" },
          { name: "pos", type: "int" },
        ];
      case "value":
        return [{ name: param.name, type: param.type }];
    }
  });
}

function returnKind(spec: NodeSpec): "tree" | "list" | "value" {
  const out = spec.returns;
  if (out.kind === "inPlace") {
    const param = spec.params[out.param];
    if (!param || (param.kind !== "tree" && param.kind !== "list")) throw new Error(`${spec.wrapper}: inPlace must point at a tree or list parameter`);
    return param.kind;
  }
  return out.kind;
}

function returnType(spec: NodeSpec): ValueType {
  const kind = returnKind(spec);
  if (kind === "tree") return "int?[]";
  if (kind === "list") return "int[]";
  return (spec.returns as { type: ValueType }).type;
}

/** The wrapper's judge signature and parameter names (for CodeStage.signature / params). */
export function nodeSignature(spec: NodeSpec): { params: string[]; signature: Signature } {
  const args = wrapperArgs(spec);
  return { params: args.map((arg) => arg.name), signature: { params: args.map((arg) => arg.type), returns: returnType(spec) } };
}

const usesTree = (spec: NodeSpec) => spec.params.some((p) => p.kind === "tree") || returnKind(spec) === "tree";
const usesList = (spec: NodeSpec) => spec.params.some((p) => p.kind === "list" || p.kind === "lists" || p.kind === "cycle") || returnKind(spec) === "list";

// ── Helpers per language ─────────────────────────────────────────────────────

const HELPERS: Record<AdapterLanguage, { tree: string; list: string }> = {
  javascript: {
    tree: `function _buildTree(values) {
  if (values.length === 0 || values[0] === null) return null;
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
  return root;
}
function _treeValues(root) {
  const out = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node) {
      out.push(node.val);
      queue.push(node.left, node.right);
    } else out.push(null);
    if (out.length > 200000) throw new Error("tree too large (is there a cycle?)");
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}`,
    list: `function _buildList(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}
function _buildLists(lists) {
  return lists.map(_buildList);
}
function _buildCycle(values, pos) {
  const nodes = values.map((v) => new ListNode(v));
  nodes.forEach((node, i) => (node.next = nodes[i + 1] ?? null));
  if (pos >= 0 && nodes.length) nodes[nodes.length - 1].next = nodes[pos];
  return nodes[0] ?? null;
}
function _listValues(head) {
  const out = [];
  for (let node = head; node; node = node.next) {
    out.push(node.val);
    if (out.length > 100000) throw new Error("list too long (is there a cycle?)");
  }
  return out;
}`,
  },
  typescript: {
    tree: `function _buildTree(values: (number | null)[]): TreeNode | null {
  if (values.length === 0 || values[0] === null) return null;
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
  return root;
}
function _treeValues(root: TreeNode | null): (number | null)[] {
  const out: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node) {
      out.push(node.val);
      queue.push(node.left, node.right);
    } else out.push(null);
    if (out.length > 200000) throw new Error("tree too large (is there a cycle?)");
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}`,
    list: `function _buildList(values: number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}
function _buildLists(lists: number[][]): (ListNode | null)[] {
  return lists.map(_buildList);
}
function _buildCycle(values: number[], pos: number): ListNode | null {
  const nodes = values.map((v) => new ListNode(v));
  nodes.forEach((node, i) => (node.next = nodes[i + 1] ?? null));
  if (pos >= 0 && nodes.length) nodes[nodes.length - 1].next = nodes[pos];
  return nodes[0] ?? null;
}
function _listValues(head: ListNode | null): number[] {
  const out: number[] = [];
  for (let node = head; node; node = node.next) {
    out.push(node.val);
    if (out.length > 100000) throw new Error("list too long (is there a cycle?)");
  }
  return out;
}`,
  },
  python: {
    tree: `def _build_tree(values):
    if not values or values[0] is None:
        return None
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
    return root


def _tree_values(root):
    out = []
    queue = [root]
    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        if node:
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            out.append(None)
        if len(out) > 200000:
            raise ValueError("tree too large (is there a cycle?)")
    while out and out[-1] is None:
        out.pop()
    return out`,
    list: `def _build_list(values):
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    return head


def _build_lists(lists):
    return [_build_list(values) for values in lists]


def _build_cycle(values, pos):
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def _list_values(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
        if len(out) > 100000:
            raise ValueError("list too long (is there a cycle?)")
    return out`,
  },
  java: {
    tree: `    static TreeNode buildTree(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
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
        return root;
    }

    static Integer[] treeValues(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        List<TreeNode> queue = new ArrayList<>();
        queue.add(root);
        for (int head = 0; head < queue.size(); head++) {
            TreeNode node = queue.get(head);
            if (node != null) { out.add(node.val); queue.add(node.left); queue.add(node.right); }
            else out.add(null);
            if (out.size() > 200000) throw new IllegalStateException("tree too large (is there a cycle?)");
        }
        while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
        return out.toArray(new Integer[0]);
    }`,
    list: `    static ListNode buildList(int[] values) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        return head;
    }

    static ListNode[] buildLists(List<List<Integer>> lists) {
        ListNode[] out = new ListNode[lists.size()];
        for (int i = 0; i < out.length; i++) out[i] = buildList(lists.get(i).stream().mapToInt(Integer::intValue).toArray());
        return out;
    }

    static ListNode buildCycle(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode(values[i]);
        for (int i = 0; i + 1 < values.length; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0) nodes[values.length - 1].next = nodes[pos];
        return nodes[0];
    }

    static int[] listValues(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode node = head; node != null; node = node.next) {
            out.add(node.val);
            if (out.size() > 100000) throw new IllegalStateException("list too long (is there a cycle?)");
        }
        return out.stream().mapToInt(Integer::intValue).toArray();
    }`,
  },
  cpp: {
    tree: `TreeNode* buildTree(const vector<optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
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
    return root;
}

vector<optional<int>> treeValues(TreeNode* root) {
    vector<optional<int>> out;
    vector<TreeNode*> order{root};
    for (size_t head = 0; head < order.size(); head++) {
        TreeNode* node = order[head];
        if (node) { out.push_back(node->val); order.push_back(node->left); order.push_back(node->right); }
        else out.push_back(nullopt);
        if (out.size() > 200000) throw runtime_error("tree too large (is there a cycle?)");
    }
    while (!out.empty() && !out.back()) out.pop_back();
    return out;
}`,
    list: `ListNode* buildList(const vector<int>& values) {
    ListNode* head = nullptr;
    for (int i = (int)values.size() - 1; i >= 0; i--) head = new ListNode(values[i], head);
    return head;
}

vector<ListNode*> buildLists(const vector<vector<int>>& lists) {
    vector<ListNode*> out;
    for (const auto& values : lists) out.push_back(buildList(values));
    return out;
}

ListNode* buildCycle(const vector<int>& values, int pos) {
    if (values.empty()) return nullptr;
    vector<ListNode*> nodes;
    for (int v : values) nodes.push_back(new ListNode(v));
    for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0) nodes.back()->next = nodes[pos];
    return nodes[0];
}

vector<int> listValues(ListNode* head) {
    vector<int> out;
    for (ListNode* node = head; node; node = node->next) {
        out.push_back(node->val);
        if (out.size() > 100000) throw runtime_error("list too long (is there a cycle?)");
    }
    return out;
}`,
  },
  go: {
    tree: `func judgeBuildTree(values []*int) *TreeNode {
	if len(values) == 0 || values[0] == nil {
		return nil
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
	return root
}

func judgeTreeValues(root *TreeNode) []*int {
	out := []*int{}
	queue := []*TreeNode{root}
	for head := 0; head < len(queue); head++ {
		node := queue[head]
		if node != nil {
			v := node.Val
			out = append(out, &v)
			queue = append(queue, node.Left, node.Right)
		} else {
			out = append(out, nil)
		}
		if len(out) > 200000 {
			panic("tree too large (is there a cycle?)")
		}
	}
	for len(out) > 0 && out[len(out)-1] == nil {
		out = out[:len(out)-1]
	}
	return out
}`,
    list: `func judgeBuildList(values []int) *ListNode {
	var head *ListNode
	for i := len(values) - 1; i >= 0; i-- {
		head = &ListNode{Val: values[i], Next: head}
	}
	return head
}

func judgeBuildLists(lists [][]int) []*ListNode {
	out := make([]*ListNode, len(lists))
	for i, values := range lists {
		out[i] = judgeBuildList(values)
	}
	return out
}

func judgeBuildCycle(values []int, pos int) *ListNode {
	if len(values) == 0 {
		return nil
	}
	nodes := make([]*ListNode, len(values))
	for i, v := range values {
		nodes[i] = &ListNode{Val: v}
	}
	for i := 0; i+1 < len(nodes); i++ {
		nodes[i].Next = nodes[i+1]
	}
	if pos >= 0 {
		nodes[len(nodes)-1].Next = nodes[pos]
	}
	return nodes[0]
}

func judgeListValues(head *ListNode) []int {
	out := []int{}
	for node := head; node != nil; node = node.Next {
		out = append(out, node.Val)
		if len(out) > 100000 {
			panic("list too long (is there a cycle?)")
		}
	}
	return out
}`,
  },
};

// ── Wrapper per language ─────────────────────────────────────────────────────

type Namer = { tree: string; treeOut: string; list: string; lists: string; cycle: string; listOut: string };

const NAMES: Record<AdapterLanguage, Namer> = {
  javascript: { tree: "_buildTree", treeOut: "_treeValues", list: "_buildList", lists: "_buildLists", cycle: "_buildCycle", listOut: "_listValues" },
  typescript: { tree: "_buildTree", treeOut: "_treeValues", list: "_buildList", lists: "_buildLists", cycle: "_buildCycle", listOut: "_listValues" },
  python: { tree: "_build_tree", treeOut: "_tree_values", list: "_build_list", lists: "_build_lists", cycle: "_build_cycle", listOut: "_list_values" },
  java: { tree: "JudgeIO.buildTree", treeOut: "JudgeIO.treeValues", list: "JudgeIO.buildList", lists: "JudgeIO.buildLists", cycle: "JudgeIO.buildCycle", listOut: "JudgeIO.listValues" },
  cpp: { tree: "buildTree", treeOut: "treeValues", list: "buildList", lists: "buildLists", cycle: "buildCycle", listOut: "listValues" },
  go: { tree: "judgeBuildTree", treeOut: "judgeTreeValues", list: "judgeBuildList", lists: "judgeBuildLists", cycle: "judgeBuildCycle", listOut: "judgeListValues" },
};

const JAVA_NODE_TYPES = { tree: "TreeNode", list: "ListNode", lists: "ListNode[]", cycle: "ListNode" } as const;

/** Call arguments (and local node declarations) for the user's function. */
function callParts(language: AdapterLanguage, spec: NodeSpec): { locals: string[]; args: string[] } {
  const names = NAMES[language];
  const locals: string[] = [];
  const args: string[] = [];
  spec.params.forEach((param, i) => {
    if (param.kind === "value") {
      args.push(param.name);
      return;
    }
    const build = param.kind === "cycle" ? `${names.cycle}(${param.name}, pos)` : `${names[param.kind]}(${param.name})`;
    const local = `n${i}`;
    switch (language) {
      case "javascript":
      case "typescript":
        locals.push(`const ${local} = ${build};`);
        break;
      case "python":
        locals.push(`${local} = ${build}`);
        break;
      case "java":
        locals.push(`${JAVA_NODE_TYPES[param.kind]} ${local} = ${build};`);
        break;
      case "cpp":
        locals.push(`auto ${local} = ${build};`);
        break;
      case "go":
        locals.push(`${local} := ${build}`);
        break;
    }
    args.push(local);
  });
  return { locals, args };
}

function wrapper(language: AdapterLanguage, spec: NodeSpec): string {
  const names = NAMES[language];
  const args = wrapperArgs(spec);
  const { locals, args: callArgs } = callParts(language, spec);
  const kind = returnKind(spec);
  const inPlace = spec.returns.kind === "inPlace" ? `n${spec.returns.param}` : null;
  const call = `${spec.call}(${callArgs.join(", ")})`;
  const out = (value: string) => (kind === "tree" ? `${names.treeOut}(${value})` : kind === "list" ? `${names.listOut}(${value})` : value);
  const ret = returnType(spec);
  const native = (type: ValueType, lang: NativeLanguage) => nativeTypeName(lang, type);

  switch (language) {
    case "javascript":
    case "typescript": {
      const sig =
        language === "typescript"
          ? `${args.map((a) => `${a.name}: ${native(a.type, "typescript")}`).join(", ")}): ${native(ret, "typescript")}`
          : `${args.map((a) => a.name).join(", ")})`;
      const body = inPlace ? [...locals, `${call};`, `return ${out(inPlace)};`] : [...locals, `return ${out(call)};`];
      return `// ${MARK}\nfunction ${spec.wrapper}(${sig} {\n${body.map((line) => `  ${line}`).join("\n")}\n}`;
    }
    case "python": {
      const body = inPlace ? [...locals, call, `return ${out(inPlace)}`] : [...locals, `return ${out(call)}`];
      return `# ${MARK}\ndef ${spec.wrapper}(${args.map((a) => a.name).join(", ")}):\n${body.map((line) => `    ${line}`).join("\n")}`;
    }
    case "java": {
      const body = inPlace ? [...locals, `${call};`, `return ${out(inPlace)};`] : [...locals, `return ${out(call)};`];
      return `    // ${MARK}\n    public ${native(ret, "java")} ${spec.wrapper}(${args.map((a) => `${native(a.type, "java")} ${a.name}`).join(", ")}) {\n${body.map((line) => `        ${line}`).join("\n")}\n    }`;
    }
    case "cpp": {
      const param = (a: WrapperArg) => {
        const type = native(a.type, "cpp");
        return type.startsWith("vector") ? `${type}& ${a.name}` : `${type} ${a.name}`;
      };
      const body = inPlace ? [...locals, `${call};`, `return ${out(inPlace)};`] : [...locals, `return ${out(call)};`];
      return `    // ${MARK}\n    ${native(ret, "cpp")} ${spec.wrapper}(${args.map(param).join(", ")}) {\n${body.map((line) => `        ${line}`).join("\n")}\n    }`;
    }
    case "go": {
      const body = inPlace ? [...locals, call, `return ${out(inPlace)}`] : [...locals, `return ${out(call)}`];
      return `// ${MARK}\nfunc ${spec.wrapper}(${args.map((a) => `${a.name} ${native(a.type, "go")}`).join(", ")}) ${native(ret, "go")} {\n${body.map((line) => `\t${line}`).join("\n")}\n}`;
    }
  }
}

function compose(language: AdapterLanguage, user: string, spec: NodeSpec): string {
  const tree = usesTree(spec);
  const list = usesList(spec);
  const nodes = [tree ? TREE_NODE[language] : "", list ? LIST_NODE[language] : ""].filter(Boolean);
  const helpers = [tree ? HELPERS[language].tree : "", list ? HELPERS[language].list : ""].filter(Boolean);
  const adapter = wrapper(language, spec);
  if (language === "java") {
    return `${nodes.join("\n\n")}\n\nclass Solution {\n${user}\n\n${adapter}\n}\n\n// ${MARK}\nclass JudgeIO {\n${helpers.join("\n\n")}\n}\n`;
  }
  if (language === "cpp") {
    return `${nodes.join("\n\n")}\n\n// ${MARK}\n${helpers.join("\n\n")}\n\nclass Solution {\npublic:\n${user}\n\n${adapter}\n};\n`;
  }
  if (language === "python") {
    return `from typing import List, Optional\n\n\n${nodes.join("\n\n\n")}\n\n\n${user}\n\n\n${adapter}\n\n\n${helpers.join("\n\n\n")}\n`;
  }
  return `${nodes.join("\n\n")}\n\n${user}\n\n${adapter}\n\n${helpers.join("\n")}\n`;
}

/** Full sources (starter stubs or references) for a node-based problem in all six languages. */
export function nodeSources(user: SourceSet, spec: NodeSpec): SourceSet {
  return Object.fromEntries(
    (Object.keys(user) as AdapterLanguage[]).map((language) => [language, compose(language, user[language], spec)]),
  ) as SourceSet;
}
