"use client";

import type { BehavioralQuestion } from "@synapse/core/content";
import type { Ref } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";

export const INTERVIEWER = { name: "Morgan", title: "Engineering Manager" } as const;

/** Glowing avatar; sound bars pulse while the question is being read aloud. */
export function InterviewerAvatar({ speaking, size = "md" }: { speaking?: boolean; size?: "sm" | "md" }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center", size === "md" ? "h-14 w-14" : "h-10 w-10")} aria-hidden="true">
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-synapse/30 blur-md transition-opacity duration-300",
          speaking ? "opacity-100 motion-safe:animate-pulse-glow" : "opacity-40",
        )}
      />
      <span
        className={cn(
          "relative grid h-full w-full place-items-center rounded-full border border-synapse/50 font-display font-semibold text-white",
          "bg-[linear-gradient(135deg,var(--color-synapse-strong),var(--color-axon-strong))]",
          size === "md" ? "text-xl" : "text-base",
        )}
      >
        M
      </span>
      {speaking ? (
        <span className="absolute -bottom-1 -right-1 flex h-5 items-end gap-0.5 rounded-full border border-ink-950 bg-ink-800 px-1.5 py-1">
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="w-0.5 rounded-full bg-axon motion-safe:animate-typing"
              style={{ height: `${delay === 160 ? 10 : 7}px`, animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

export interface InterviewerPanelProps {
  question: BehavioralQuestion;
  round: 1 | 2;
  /** What is being asked right now (the question, or the follow-up in round 2). */
  prompt: string;
  speaking: boolean;
  /** null while hydrating, false when the browser has no speechSynthesis. */
  ttsSupported: boolean | null;
  onReplay: () => void;
  onStopSpeaking: () => void;
  /** Disable Read aloud (e.g. while recording, so the mic never hears the interviewer). */
  replayDisabled?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function InterviewerPanel({
  question,
  round,
  prompt,
  speaking,
  ttsSupported,
  onReplay,
  onStopSpeaking,
  replayDisabled,
  headingRef,
}: InterviewerPanelProps) {
  return (
    <Card glow aria-labelledby="interviewer-question">
      <div className="flex items-start gap-4">
        <InterviewerAvatar speaking={speaking} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">
                {INTERVIEWER.name} <span className="font-normal text-fg-subtle">· {INTERVIEWER.title}</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Pill tone="violet">{question.competency}</Pill>
                <Pill tone={round === 2 ? "cyan" : "neutral"}>{round === 2 ? "Round 2 · Follow-up" : "Round 1"}</Pill>
              </div>
            </div>
            {ttsSupported ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={speaking ? onStopSpeaking : onReplay}
                disabled={replayDisabled && !speaking}
                title={replayDisabled && !speaking ? "Stop recording to replay the question" : undefined}
                leftIcon={<span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span>}
                aria-label={speaking ? "Stop reading the question" : "Read the question aloud"}
              >
                {speaking ? "Stop" : "Read aloud"}
              </Button>
            ) : null}
          </div>

          {round === 2 ? (
            <p className="mt-4 line-clamp-2 text-sm text-fg-subtle">
              <span className="font-medium text-fg-muted">Following up on:</span> {question.prompt}
            </p>
          ) : null}
          <h2
            id="interviewer-question"
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 scroll-mt-24 text-xl font-semibold leading-snug text-fg outline-none sm:text-2xl"
          >
            {prompt}
          </h2>
          <p className="sr-only" aria-live="polite">
            {speaking ? `${INTERVIEWER.name} is reading the question aloud.` : ""}
          </p>

          <details className="group mt-4 rounded-xl border border-line bg-ink-900/50 open:bg-ink-900/70">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium text-synapse-soft hover:text-fg [&::-webkit-details-marker]:hidden">
              What {INTERVIEWER.name} listens for
              <span aria-hidden="true" className="text-fg-subtle transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="grid gap-4 px-3 pb-3 pt-1 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-success">Strong signals</p>
                <ul className="mt-1.5 space-y-1.5 text-sm text-fg-muted">
                  {question.lookFor.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="text-success">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-danger">Red flags</p>
                <ul className="mt-1.5 space-y-1.5 text-sm text-fg-muted">
                  {question.redFlags.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="text-danger">
                        ✕
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}
