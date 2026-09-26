"use client";

import { useEffect, useState } from "react";
import { Button, ProgressBar, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { INTERVIEWER } from "./InterviewerPanel";

const STEPS = [
  { at: 0, label: "Measuring pace and filler words" },
  { at: 1_200, label: "Checking your STAR arc" },
  { at: 3_500, label: "Scoring ownership and impact" },
  { at: 7_000, label: `${INTERVIEWER.name} is writing feedback and a follow-up` },
] as const;

/**
 * Covers the answer card while feedback is generated (no layout shift). Progress
 * is an honest estimate: it eases toward 92% and never claims to be done.
 */
export function EvaluatingOverlay({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - started), 200);
    return () => window.clearInterval(id);
  }, []);

  const current = STEPS.reduce((index, step, i) => (elapsed >= step.at ? i : index), 0);
  const progress = 0.92 * (1 - Math.exp(-elapsed / 9_000));

  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-card bg-ink-950/80 p-4 backdrop-blur-sm motion-safe:animate-fade-up">
      <div className="w-full max-w-sm rounded-2xl border border-synapse/40 bg-ink-850 p-5 shadow-glow">
        <p className="sr-only" role="status">
          {STEPS[current]!.label}
        </p>
        <div className="flex items-center gap-3">
          <Spinner size="md" label="" />
          <div className="min-w-0">
            <p className="font-semibold text-fg">Reviewing your answer</p>
            <p className="text-xs text-fg-subtle">Usually 5 to 20 seconds</p>
          </div>
        </div>
        <ProgressBar value={progress} label="Feedback progress" valueText="Working…" className="mt-4" />
        <ol className="mt-4 space-y-2 text-sm">
          {STEPS.map((step, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li key={step.label} className={cn("flex items-center gap-2.5", done ? "text-fg-muted" : active ? "text-fg" : "text-fg-subtle")}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.65rem]",
                    done ? "border-success/50 bg-success/15 text-success" : active ? "border-synapse bg-synapse/15 text-synapse-soft" : "border-line-strong",
                  )}
                >
                  {done ? "✓" : active ? <span className="h-1.5 w-1.5 rounded-full bg-synapse motion-safe:animate-pulse" /> : ""}
                </span>
                <span>{step.label}</span>
                {active ? <span className="sr-only"> (in progress)</span> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
