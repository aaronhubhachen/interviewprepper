"use client";

import type { CodeLanguage } from "@synapse/core/judge";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const MonacoDiffView = dynamic(() => import("./MonacoDiffView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <Spinner size="md" label="Loading the diff…" />
    </div>
  ),
});

/** Added / removed line counts via a longest-common-subsequence over lines (inputs are small). */
export function lineDiffStats(before: string, after: string): { added: number; removed: number } {
  const a = before.replace(/\s+$/, "").split("\n");
  const b = after.replace(/\s+$/, "").split("\n");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const common = lcs[0]![0]!;
  return { added: b.length - common, removed: a.length - common };
}

export interface DiffReviewProps {
  original: string;
  suggestion: string;
  language: CodeLanguage;
  height: string;
  onAccept: (code: string) => void;
  onReject: () => void;
}

/** Cursor-style review of an AI edit: see the diff, optionally tweak the right side, then accept or reject. */
export function DiffReview({ original, suggestion, language, height, onAccept, onReject }: DiffReviewProps) {
  const getModified = useRef<() => string>(() => suggestion);
  const regionRef = useRef<HTMLDivElement>(null);
  const stats = lineDiffStats(original, suggestion);
  const identical = original.trimEnd() === suggestion.trimEnd();

  // Apply is clicked in the chat, which may have scrolled the page: bring the diff into view.
  useEffect(() => {
    regionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onReject();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onReject]);

  return (
    <div ref={regionRef} role="region" aria-label="Suggested edit from Prepr Bot" className="flex scroll-mt-20 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-synapse/40 bg-synapse/10 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span aria-hidden="true" className="text-synapse">
            ✦
          </span>
          <span className="font-semibold text-fg">Suggested edit</span>
          {identical ? (
            <span className="text-fg-subtle">No changes</span>
          ) : (
            <span className="font-mono text-xs">
              <span className="text-success">+{stats.added}</span> <span className="text-danger">−{stats.removed}</span>
            </span>
          )}
          <span className="hidden text-xs text-fg-subtle md:inline">Red is your code, green is the suggestion (editable before you accept)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onReject} title="Discard the suggestion (Esc)">
            Reject
          </Button>
          <Button size="sm" onClick={() => onAccept(getModified.current())} disabled={identical}>
            Accept
          </Button>
        </div>
      </div>
      <div style={{ height }} className="bg-ink-900">
        <MonacoDiffView
          original={original}
          modified={suggestion}
          language={language}
          height={height}
          onReady={(getter) => {
            getModified.current = getter;
          }}
        />
      </div>
    </div>
  );
}
