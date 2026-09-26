/**
 * A deliberately small Markdown subset for problem statements, parsed to an
 * AST that is rendered as React elements (never raw HTML), so content is
 * safe by construction. Blocks: headings, paragraphs, bullet / numbered
 * lists, fenced code. Inline: `code`, **bold**, *italic* / _italic_,
 * [links](https://…) (http/https only), and optionally 10^4 superscripts.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "sup"; base: string; exponent: string }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: Inline[][] }
  | { type: "code"; language: string; text: string };

export interface InlineOptions {
  /** Render `10^4` as 10<sup>4</sup> (constraints). */
  superscript?: boolean;
  /** Typographic comparison operators outside code: <= → ≤, >= → ≥, != → ≠. */
  typography?: boolean;
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
const FENCE = /^\s*```\s*([\w+-]*)\s*$/;

export function parseMarkdown(source: string, options: InlineOptions = {}): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" "), options) });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    const fence = FENCE.exec(line);
    if (fence) {
      flushParagraph();
      const body: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i]!)) body.push(lines[i++]!);
      blocks.push({ type: "code", language: fence[1] ?? "", text: body.join("\n") });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1]!.length as 1 | 2 | 3 | 4, children: parseInline(heading[2]!.trim(), options) });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const start = numbered ? Number(numbered[1]) : 1;
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!;
        const match = ordered ? NUMBERED.exec(current) : BULLET.exec(current);
        if (match) {
          items.push((ordered ? match[2] : match[1])!.trim());
        } else if (current.trim() !== "" && /^\s{2,}\S/.test(current) && items.length > 0) {
          items[items.length - 1] += ` ${current.trim()}`; // lazy continuation line
        } else {
          break;
        }
        i++;
      }
      i--;
      blocks.push({ type: "list", ordered, start, items: items.map((item) => parseInline(item, options)) });
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();
  return blocks;
}

function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function typographic(text: string): string {
  return text.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠");
}

function pushText(out: Inline[], text: string, options: InlineOptions): void {
  if (!text) return;
  const value = options.typography ? typographic(text) : text;
  if (options.superscript) {
    const pattern = /(\d+)\^(-?\d+)/g;
    let last = 0;
    for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
      if (match.index > last) appendText(out, value.slice(last, match.index));
      out.push({ type: "sup", base: match[1]!, exponent: match[2]! });
      last = match.index + match[0].length;
    }
    if (last < value.length) appendText(out, value.slice(last));
    return;
  }
  appendText(out, value);
}

function appendText(out: Inline[], text: string): void {
  const previous = out[out.length - 1];
  if (previous?.type === "text") previous.text += text;
  else out.push({ type: "text", text });
}

/** Index of the ")" that balances an already-open "(" (URLs may contain parentheses). */
function closingParen(text: string, from: number): number {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** Finds the closing delimiter for emphasis: not preceded by whitespace. */
function findClose(text: string, from: number, delimiter: string): number {
  let index = text.indexOf(delimiter, from);
  while (index !== -1) {
    if (index > from && !/\s/.test(text[index - 1]!)) return index;
    index = text.indexOf(delimiter, index + 1);
  }
  return -1;
}

export function parseInline(text: string, options: InlineOptions = {}): Inline[] {
  const out: Inline[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    pushText(out, buffer, options);
    buffer = "";
  };

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === "\\" && i + 1 < text.length && /[\\`*_[\]()#+\-.!]/.test(text[i + 1]!)) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (ch === "`") {
      let ticks = 1;
      while (text[i + ticks] === "`") ticks++;
      const fence = "`".repeat(ticks);
      const close = text.indexOf(fence, i + ticks);
      if (close !== -1) {
        flush();
        out.push({ type: "code", text: text.slice(i + ticks, close).replace(/^ (.*) $/, "$1") });
        i = close + ticks;
        continue;
      }
    }

    if ((ch === "*" || ch === "_") && text[i + 1] === ch) {
      const delimiter = ch + ch;
      const next = text[i + 2];
      if (next && !/\s/.test(next)) {
        const close = findClose(text, i + 2, delimiter);
        if (close !== -1) {
          flush();
          out.push({ type: "strong", children: parseInline(text.slice(i + 2, close), options) });
          i = close + 2;
          continue;
        }
      }
    }

    if (ch === "*" || ch === "_") {
      const next = text[i + 1];
      const prev = i > 0 ? text[i - 1]! : " ";
      // Intraword underscores (snake_case) are literal.
      const opens = next && !/\s/.test(next) && next !== ch && (ch === "*" || !/\w/.test(prev));
      if (opens) {
        let close = findClose(text, i + 1, ch);
        while (close !== -1 && ch === "_" && /\w/.test(text[close + 1] ?? "")) close = findClose(text, close + 1, ch);
        if (close !== -1 && text[close + 1] !== ch) {
          flush();
          out.push({ type: "em", children: parseInline(text.slice(i + 1, close), options) });
          i = close + 1;
          continue;
        }
      }
    }

    if (ch === "[") {
      const labelEnd = text.indexOf("]", i + 1);
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const hrefEnd = closingParen(text, labelEnd + 2);
        if (hrefEnd !== -1) {
          const href = safeHref(text.slice(labelEnd + 2, hrefEnd));
          const label = text.slice(i + 1, labelEnd);
          flush();
          if (href) out.push({ type: "link", href, children: parseInline(label, options) });
          else pushText(out, label, options);
          i = hrefEnd + 1;
          continue;
        }
      }
    }

    buffer += ch;
    i++;
  }
  flush();
  return out;
}

/** Plain-text rendering of inline nodes (for aria labels and titles). */
export function inlineToText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "code":
          return node.text;
        case "sup":
          return `${node.base}^${node.exponent}`;
        default:
          return inlineToText(node.children);
      }
    })
    .join("");
}
