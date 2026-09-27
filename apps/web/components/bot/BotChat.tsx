"use client";

import { LANGUAGE_LABELS, type CodeLanguage } from "@synapse/core/judge";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Markdown } from "@/components/practice/Markdown";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { BotMessage } from "@/lib/types";

const STARTERS = [
  "Before any code: what constraints and edge cases should I clarify?",
  "What approaches would you consider, with their time complexity?",
  "Review my current code for bugs. Don't rewrite it.",
  "Suggest three tricky test cases for this problem.",
];

type Part = { kind: "text"; text: string } | { kind: "code"; lang: string; code: string };

/** Splits a Markdown reply into prose and fenced code blocks (so code gets action buttons). */
export function splitFences(markdown: string): Part[] {
  const parts: Part[] = [];
  const fence = /```([\w+#-]*)[^\n]*\n([\s\S]*?)```/g;
  let last = 0;
  for (const match of markdown.matchAll(fence)) {
    if (match.index > last) parts.push({ kind: "text", text: markdown.slice(last, match.index) });
    parts.push({ kind: "code", lang: match[1] ?? "", code: match[2]!.replace(/\n$/, "") });
    last = match.index + match[0].length;
  }
  if (last < markdown.length) parts.push({ kind: "text", text: markdown.slice(last) });
  return parts.filter((part) => part.kind === "code" || part.text.trim());
}

export function BotChat({
  messages,
  sending,
  error,
  offline,
  language,
  onSend,
  onInsert,
  onCopy,
  docked = false,
  actions,
  children,
}: {
  /** Inside the code card (Cursor-style side panel) instead of a floating card. */
  docked?: boolean;
  /** Extra header controls (toggles, review, hide). */
  actions?: ReactNode;
  /** Rendered between the transcript and the composer (e.g. the AI-use report). */
  children?: ReactNode;
  messages: BotMessage[];
  sending: boolean;
  error: string | null;
  offline: boolean;
  language: CodeLanguage;
  onSend: (text: string) => void;
  onInsert: (code: string) => void;
  onCopy: (code: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const submit = () => {
    if (!draft.trim() || sending) return;
    onSend(draft);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section
      aria-label="Prepr Bot assistant"
      className={cn(
        "flex flex-col overflow-hidden",
        docked
          ? "h-full min-h-[26rem] bg-ink-900/40"
          : "h-[min(46rem,calc(100dvh-9rem))] min-h-[28rem] rounded-card border border-line bg-ink-850/85 shadow-card lg:sticky lg:top-20",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", offline ? "bg-warning" : "bg-success")} title={offline ? "Offline: hints only" : "Online"} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Prepr Bot</p>
            <p className="truncate text-xs text-fg-subtle">AI assistant · it can be wrong</p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>

      <div ref={listRef} role="log" aria-live="polite" className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">Use the assistant the way you would in a real round. Some ways to start:</p>
            <div className="flex flex-col gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => setDraft(starter)}
                  className="rounded-xl border border-line bg-ink-900/60 px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:border-synapse/60 hover:text-fg"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="ml-8 whitespace-pre-wrap rounded-2xl rounded-br-md bg-bubble-you px-3.5 py-2.5 text-sm text-white">
              {message.content}
            </div>
          ) : (
            <div key={index} className="mr-4 space-y-2 rounded-2xl rounded-bl-md border border-line bg-bubble-agent px-3.5 py-2.5 text-sm text-fg">
              {splitFences(message.content).map((part, partIndex) =>
                part.kind === "text" ? (
                  <Markdown key={partIndex} source={part.text} className="text-sm" />
                ) : (
                  <CodeBlock key={partIndex} code={part.code} lang={part.lang || LANGUAGE_LABELS[language]} onInsert={onInsert} onCopy={onCopy} />
                ),
              )}
            </div>
          ),
        )}
        {sending ? (
          <div className="mr-4 inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-bubble-agent px-4 py-3" role="status">
            <span className="sr-only">Prepr Bot is thinking…</span>
            {[0, 150, 300].map((delay) => (
              <span key={delay} aria-hidden="true" className="h-2 w-2 rounded-full bg-fg-muted motion-safe:animate-typing" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        ) : null}
      </div>

      {children}

      <div className="border-t border-line p-3">
        {error ? (
          <Banner tone="danger" className="mb-2">
            {error}
          </Banner>
        ) : null}
        <label htmlFor="bot-input" className="sr-only">
          Message Prepr Bot
        </label>
        <textarea
          id="bot-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          maxLength={4000}
          placeholder="Ask Prepr Bot… (Enter to send, Shift+Enter for a new line)"
          className="scrollbar-thin w-full resize-none rounded-xl border border-line bg-ink-900 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-synapse focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={submit} disabled={!draft.trim()} loading={sending} loadingLabel="Waiting for Prepr Bot">
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}

function CodeBlock({ code, lang, onInsert, onCopy }: { code: string; lang: string; onInsert: (code: string) => void; onCopy: (code: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked
    }
    onCopy(code);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink-950">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="font-mono text-xs text-fg-subtle">{lang}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => onInsert(code)} title="Replace the editor contents with this code">
            Use in editor
          </Button>
        </div>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-3 font-mono text-xs leading-relaxed text-fg-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}
