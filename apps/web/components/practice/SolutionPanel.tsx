"use client";

import { useEffect, useState } from "react";
import type { JudgeLanguage } from "@synapse/core/content";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ProblemSolutionResponse } from "@/lib/types";
import { Segmented } from "./bits";

export type SolutionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: ProblemSolutionResponse }
  | { status: "error"; message: string; locked: boolean };

const LANGUAGES: ReadonlyArray<{ value: JudgeLanguage; label: string }> = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
];

export function SolutionPanel({ state, initialLanguage, onRetry }: { state: SolutionState; initialLanguage: JudgeLanguage; onRetry: () => void }) {
  const [language, setLanguage] = useState<JudgeLanguage>(initialLanguage);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (state.status === "idle") return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="solution-heading" className="motion-safe:animate-fade-up">
      <CardHeader
        title={<span id="solution-heading">Reference solution</span>}
        eyebrow="Unlocked"
        description="Compare it with yours: the invariant from Stage 1 should be visible in the loop."
        actions={state.status === "ready" ? <Segmented label="Solution language" value={language} options={LANGUAGES} onChange={setLanguage} /> : undefined}
      />
      {state.status === "loading" ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading the reference solution">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : state.status === "error" ? (
        <Banner
          tone={state.locked ? "info" : "danger"}
          title={state.locked ? "Still locked" : "Couldn't load the solution"}
          action={
            state.locked ? undefined : (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )
          }
        >
          {state.message}
        </Banner>
      ) : (
        <div className="space-y-5">
          <div className="relative">
            <pre className="scrollbar-thin max-h-[28rem] overflow-auto rounded-2xl border border-line bg-ink-900 p-4 pr-20 font-mono text-[0.8125rem] leading-relaxed text-fg">
              <code>{state.data.reference[language]}</code>
            </pre>
            <div className="absolute right-3 top-3">
              <Button size="sm" variant="secondary" onClick={() => void copy(state.data.reference[language])} aria-label={copied ? "Copied to clipboard" : "Copy the reference solution"}>
                {copied ? "Copied ✓" : "Copy"}
              </Button>
            </div>
          </div>
          <dl className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-synapse/30 bg-synapse/10 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-synapse-soft">🧭 Invariant</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg">{state.data.invariantAnswer}</dd>
            </div>
            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">⚠️ Edge-case trap</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg">{state.data.edgeCaseAnswer}</dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
  );
}
