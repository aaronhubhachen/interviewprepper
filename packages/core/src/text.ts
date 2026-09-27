/** Text helpers shared by the agent (iMessage shows plain text only) and the evaluators. */

const LATEX_WORDS: Record<string, string> = {
  log: "log",
  cdot: "·",
  times: "×",
  le: "≤",
  ge: "≥",
  in: "∈",
  to: "→",
};

/**
 * Strips markdown and LaTeX so text reads naturally in iMessage:
 * "**O(1)** via `map`" → "O(1) via map", "$O(n \log n)$" → "O(n log n)".
 */
export function toPlainText(text: string): string {
  return text
    .replace(/```[a-z]*\n?([\s\S]*?)```/gi, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\\(log|cdot|times|le|ge|in|to)\b/g, (_, command: string) => LATEX_WORDS[command] ?? command)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // *italic* only when the asterisks hug the text, so "O(n * 2^n) ... O(n^2 * 2^n)" keeps its multiplications.
    .replace(/(^|\s)\*(\S(?:[^*\n]*\S)?)\*(?=\s|$|[.,!?])/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Keeps at most `maxSentences` sentences and `maxChars` characters (ellipsis when cut). */
export function clampSentences(text: string, maxSentences: number, maxChars = 320): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const kept = normalized
    .split(/(?<=[.!?])\s+/)
    .slice(0, maxSentences)
    .join(" ");
  if (kept.length <= maxChars) return kept;
  const cut = kept.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Wraps untrusted user text in labeled delimiters for LLM prompts, truncating it.
 * Every angle bracket inside becomes a look-alike (‹ ›), so no tag in the text
 * (nested "</candi</candidate_answer>date_answer>", "</candidate_answer >", attributes)
 * can close the fence early and pose as trusted prompt text.
 */
export function fenceUntrusted(label: string, text: string, maxChars = 4000): string {
  const clipped = text.length > maxChars ? `${text.slice(0, maxChars)} [truncated]` : text;
  const safe = clipped.replace(/</g, "‹").replace(/>/g, "›");
  return `<${label}>\n${safe}\n</${label}>`;
}

/**
 * fenceUntrusted for code: < and > must survive (generics, comparisons, arrows), so instead of
 * escaping them the block is bounded by a random nonce that the untrusted text cannot forge.
 */
export function fenceCode(label: string, text: string, maxChars = 8000): string {
  const clipped = text.length > maxChars ? `${text.slice(0, maxChars)} [truncated]` : text;
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `[${label} ${nonce}]\n${clipped}\n[/${label} ${nonce}]`;
}

/** Appended to every prompt that writes about the candidate: models otherwise guess a gender from a resume or name. */
export const NEUTRAL_PRONOUNS = 'Never guess the candidate\'s gender: say "the candidate" or "they", or address them as "you".';
