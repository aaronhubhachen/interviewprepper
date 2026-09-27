import type { NativeLanguage, Signature } from "../judge/native";

export const TAGS = [
  { id: "arrays", label: "Arrays" },
  { id: "two_pointers", label: "Two Pointers" },
  { id: "sliding_window", label: "Sliding Window" },
  { id: "stack", label: "Stack" },
  { id: "monotonic_stack", label: "Monotonic Stack" },
  { id: "binary_search", label: "Binary Search" },
  { id: "hashing", label: "Hashing" },
  { id: "prefix_sum", label: "Prefix Sum" },
  { id: "linked_list", label: "Linked List" },
  { id: "intervals", label: "Intervals" },
  { id: "heap", label: "Heap / Priority Queue" },
  { id: "bfs", label: "BFS" },
  { id: "dfs", label: "DFS" },
  { id: "tree_traversal", label: "Tree Traversal" },
  { id: "bst", label: "Binary Search Tree" },
  { id: "topological_sort", label: "Topological Sort" },
  { id: "union_find", label: "Union-Find" },
  { id: "trie", label: "Trie" },
  { id: "graph_shortest_path", label: "Shortest Paths" },
  { id: "backtracking", label: "Backtracking" },
  { id: "greedy", label: "Greedy" },
  { id: "dp_1d", label: "1D DP" },
  { id: "dp_2d", label: "2D DP" },
  { id: "dp_knapsack", label: "Knapsack DP" },
  { id: "dp_state_compression", label: "Bitmask DP" },
  { id: "bit_manipulation", label: "Bit Manipulation" },
  { id: "sorting", label: "Sorting" },
  { id: "string", label: "Strings" },
  { id: "matrix", label: "Matrix" },
  { id: "design", label: "Design" },
  { id: "recursion", label: "Recursion" },
  { id: "math", label: "Math" },
] as const;

export type Tag = (typeof TAGS)[number]["id"];

export const TAG_IDS: readonly Tag[] = TAGS.map((tag) => tag.id);

const TAG_LABELS = new Map<string, string>(TAGS.map((tag) => [tag.id, tag.label]));

export function isTag(value: string): value is Tag {
  return TAG_LABELS.has(value);
}

export function tagLabel(tag: string): string {
  return TAG_LABELS.get(tag) ?? tag.replace(/_/g, " ");
}

/** A concept the answer must contain; `anyOf` holds lowercase synonyms for heuristic grading. */
export interface KeyPoint {
  label: string;
  anyOf: string[];
}

export type CardDifficulty = 1 | 2 | 3;

export interface ProblemRef {
  title: string;
  leetcodeSlug: string;
}

export interface MicroCard {
  /** Stable kebab-case id prefixed with "mc-". */
  id: string;
  title: string;
  /** Plain text, iMessage-ready, at most 280 characters, ends with a clear ask. */
  prompt: string;
  answerKey: string;
  keyPoints: KeyPoint[];
  hint: string;
  explanation: string;
  tags: Tag[];
  difficulty: CardDifficulty;
  relatedProblem?: ProblemRef;
}

export interface StagePrompt {
  prompt: string;
  answerKey: string;
  keyPoints: KeyPoint[];
  hint: string;
}

export type CompareMode = "exact" | "unordered" | "unordered-nested" | "float";

export type JudgeLanguage = "javascript" | "python";

export interface CodeTest {
  /** Positional arguments; JSON-serializable only. */
  args: unknown[];
  expected: unknown;
  hidden?: boolean;
}

export interface CodeStage {
  functionName: string;
  params: string[];
  /** Parameter and return types, used to generate Java / C++ / Go / TypeScript starters and harnesses. */
  signature: Signature;
  starter: Record<JudgeLanguage, string>;
  /** Hand-written starters for server-compiled languages (node-based problems ship adapters). */
  nativeStarters?: Partial<Record<NativeLanguage, string>>;
  reference: Record<JudgeLanguage, string>;
  tests: CodeTest[];
  compare: CompareMode;
}

export type ProblemDifficulty = "easy" | "medium" | "hard";

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  /** Stable kebab-case id prefixed with "p-". */
  id: string;
  title: string;
  leetcodeSlug: string;
  difficulty: ProblemDifficulty;
  tags: Tag[];
  /** Markdown. */
  statement: string;
  examples: ProblemExample[];
  constraints: string[];
  stages: {
    invariant: StagePrompt;
    edgeCase: StagePrompt;
    code: CodeStage;
  };
  /** Tags flagged as weak when the user struggles with this problem. */
  weakTags: Tag[];
  /** Micro-card ids drilled after a struggle. */
  relatedCardIds: string[];
}

export interface BehavioralQuestion {
  /** Stable kebab-case id prefixed with "bq-". */
  id: string;
  prompt: string;
  competency: string;
  followUps: string[];
  lookFor: string[];
  redFlags: string[];
}

export type CardKind = "micro" | "problem";

/**
 * The unit the scheduler reviews. Micro-cards map 1:1; problems are reviewed
 * through their Stage 1 invariant prompt.
 */
export interface ReviewCard {
  id: string;
  kind: CardKind;
  title: string;
  prompt: string;
  answerKey: string;
  keyPoints: KeyPoint[];
  hint: string;
  explanation: string;
  tags: Tag[];
  difficulty: CardDifficulty;
  relatedProblem?: ProblemRef;
  /** Set for kind "problem": the IDE problem id. */
  problemId?: string;
}
