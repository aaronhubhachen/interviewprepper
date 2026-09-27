"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { CodeEditorProps } from "./editorTypes";

/**
 * Fallback editor (Monaco failed to load, e.g. offline). Tab indents; press
 * Escape first to let Tab move focus instead, matching Monaco's behaviour.
 */
export function PlainCodeEditor({ value, language, onChange, onRun, onSubmit, onToggleAi, ariaLabel, height, readOnly, notice }: CodeEditorProps & { notice?: string }) {
  const escaped = useRef(false);
  const indent = language === "go" ? "\t" : language === "javascript" || language === "typescript" ? "  " : "    ";

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "'") {
      event.preventDefault();
      onRun();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "l" && onToggleAi) {
      event.preventDefault();
      onToggleAi();
      return;
    }
    if (event.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (event.key === "Tab" && !escaped.current && !readOnly) {
      event.preventDefault();
      const target = event.currentTarget;
      const { selectionStart, selectionEnd } = target;
      const next = `${value.slice(0, selectionStart)}${indent}${value.slice(selectionEnd)}`;
      onChange(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = selectionStart + indent.length;
      });
      return;
    }
    escaped.current = false;
  };

  return (
    <div className="flex h-full flex-col" style={{ height }}>
      {notice ? (
        <p role="status" className="border-b border-line bg-warning/10 px-4 py-2 text-xs text-warning">
          {notice}
        </p>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={ariaLabel}
        className={cn(
          "scrollbar-thin block min-h-0 w-full flex-1 resize-none bg-ink-900 px-4 py-3.5 font-mono text-sm leading-[22px] text-fg",
          "focus-visible:outline-2 focus-visible:-outline-offset-2",
        )}
      />
    </div>
  );
}
