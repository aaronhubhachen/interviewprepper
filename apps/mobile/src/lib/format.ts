const TAG_LABELS: Record<string, string> = {
  arrays: 'Arrays',
  two_pointers: 'Two Pointers',
  sliding_window: 'Sliding Window',
  stack: 'Stack',
  monotonic_stack: 'Monotonic Stack',
  binary_search: 'Binary Search',
  linked_list: 'Linked List',
  heap: 'Heap',
  bfs: 'BFS',
  dfs: 'DFS',
  tree_traversal: 'Trees',
  bst: 'BST',
  trie: 'Trie',
  dp_1d: '1D DP',
  dp_2d: '2D DP',
  dp_knapsack: 'Knapsack DP',
  dp_state_compression: 'Bitmask DP',
};

export function humanizeTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/_/g, ' ').replace(/\b\w/, (c) => c.toUpperCase());
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Matches the web's typed-answer estimate (150 wpm), clamped to the API's 1 s .. 30 min range. */
export function spokenDurationMs(text: string): number {
  const ms = Math.round((wordCount(text) / 150) * 60_000);
  return Math.min(30 * 60_000, Math.max(1_000, ms));
}

export type Block = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] } | { kind: 'code'; text: string };

/** Problem statements are light markdown; the phone renders paragraphs, bullets, and code as plain text. */
export function statementBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const clean = (text: string) => text.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim();
  for (const chunk of markdown.split(/\n{2,}/)) {
    if (chunk.startsWith('```')) {
      blocks.push({ kind: 'code', text: chunk.replace(/^```\w*\n?|```$/g, '') });
      continue;
    }
    const lines = chunk.split('\n');
    if (lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line))) {
      blocks.push({ kind: 'list', items: lines.map((line) => clean(line.replace(/^\s*([-*]|\d+\.)\s+/, ''))) });
    } else {
      blocks.push({ kind: 'paragraph', text: clean(chunk) });
    }
  }
  return blocks.filter((block) => block.kind !== 'paragraph' || block.text);
}
