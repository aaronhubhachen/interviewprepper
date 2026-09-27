export type Part = { kind: 'text' | 'code'; text: string };

/** Splits a Markdown reply into prose and fenced code (rendered monospace). */
export function replyParts(markdown: string): Part[] {
  const parts: Part[] = [];
  const fence = /```[\w+#-]*[^\n]*\n([\s\S]*?)```/g;
  let last = 0;
  for (const match of markdown.matchAll(fence)) {
    if (match.index > last) parts.push({ kind: 'text', text: markdown.slice(last, match.index) });
    parts.push({ kind: 'code', text: match[1]!.replace(/\n$/, '') });
    last = match.index + match[0].length;
  }
  if (last < markdown.length) parts.push({ kind: 'text', text: markdown.slice(last) });
  return parts
    .map((part) => (part.kind === 'text' ? { ...part, text: part.text.replace(/\*\*|__|`/g, '').trim() } : part))
    .filter((part) => part.text);
}

