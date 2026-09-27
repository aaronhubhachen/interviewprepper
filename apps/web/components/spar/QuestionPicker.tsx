"use client";

import type { BehavioralQuestion } from "@synapse/core/content";
import { useState, type Ref } from "react";
import { Button, EmptyState, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PracticeStat } from "@/lib/voice/sessions";

type Filter = "all" | "new" | "practiced";

export interface QuestionPickerProps {
  questions: readonly BehavioralQuestion[];
  stats: ReadonlyMap<string, PracticeStat>;
  onPick: (question: BehavioralQuestion) => void;
  onSurprise: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function QuestionPicker({ questions, stats, onPick, onSurprise, headingRef }: QuestionPickerProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const practiced = questions.filter((question) => stats.has(question.id)).length;
  const counts: Record<Filter, number> = { all: questions.length, new: questions.length - practiced, practiced };
  const shown = questions.filter((question) =>
    filter === "all" ? true : filter === "new" ? !stats.has(question.id) : stats.has(question.id),
  );

  return (
    <section aria-labelledby="picker-title">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="picker-title" ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold text-fg outline-none">
            Choose a question
          </h2>
        </div>
        <Button onClick={onSurprise} leftIcon={<span aria-hidden="true">🎲</span>} className="self-start sm:self-auto">
          Surprise me
        </Button>
      </div>

      <div role="group" aria-label="Filter questions" className="mb-4 inline-flex rounded-xl border border-line bg-ink-900 p-1">
        {(
          [
            ["all", "All"],
            ["new", "New to you"],
            ["practiced", "Practiced"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              filter === key ? "bg-ink-700 text-fg shadow-card" : "text-fg-muted hover:text-fg",
            )}
          >
            {label}
            <span className="tabular-nums text-xs text-fg-subtle">{counts[key]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={filter === "new" ? "🏁" : "🎙️"}
          level={3}
          title={filter === "new" ? "You've practiced every question" : "Nothing practiced yet"}
          description={filter === "new" ? "Retry one to push your best score higher." : "Pick any question to start your first session."}
          action={
            <Button variant="secondary" onClick={() => setFilter("all")}>
              Show all questions
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((question) => {
            const stat = stats.get(question.id);
            return (
              <li key={question.id} className="flex">
                <button
                  type="button"
                  onClick={() => onPick(question)}
                  className={cn(
                    "group flex w-full flex-col rounded-card border border-line bg-ink-850/85 p-4 text-left shadow-card backdrop-blur-sm",
                    "transition-[border-color,transform,box-shadow] duration-200 hover:border-synapse/50 hover:shadow-glow motion-safe:hover:-translate-y-0.5",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <Pill tone="violet">{question.competency}</Pill>
                    {stat ? (
                      <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                        Best <span className="font-semibold text-fg">{stat.best}</span> · {stat.count}×
                      </span>
                    ) : (
                      <Pill tone="cyan">New</Pill>
                    )}
                  </span>
                  <span className="mt-3 line-clamp-3 text-[0.95rem] leading-snug text-fg">{question.prompt}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-synapse-soft">
                    Start answering
                    <span aria-hidden="true" className="transition-transform duration-200 motion-safe:group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
