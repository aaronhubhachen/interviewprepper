"use client";

import { planProgress, titleFromSlug, type StudyPlan } from "@synapse/core/plans";
import type { Tag } from "@synapse/core/tags";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import type { ProblemSummary } from "@/lib/types";
import { DifficultyPill } from "./bits";
import { filterProblems, hasActiveFilters, problemStatus, type ProblemFilters } from "./filters";

const ORB: Record<ReturnType<typeof problemStatus>, { glyph: string; className: string; label: string }> = {
  due: { glyph: "⏰", className: "border-axon/50 bg-axon/10 text-axon", label: "Due for review" },
  solved: { glyph: "✓", className: "border-success/40 bg-success/10 text-success", label: "Solved" },
  "in-progress": { glyph: "◐", className: "border-synapse/45 bg-synapse/10 text-synapse-soft", label: "In progress" },
  new: { glyph: "○", className: "border-line-strong bg-ink-800 text-fg-subtle", label: "Not started" },
};

function Bar({ solved, available, total }: { solved: number; available: number; total: number }) {
  return (
    <span className="relative block h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full bg-synapse/25" style={{ width: `${(available / total) * 100}%` }} />
      <span className="absolute inset-y-0 left-0 rounded-full bg-synapse" style={{ width: `${(solved / total) * 100}%` }} />
    </span>
  );
}

/** A study plan grouped by NeetCode roadmap category: solved / in Prepr / total, with every item listed. */
export function StudyPlanView({
  plan,
  problems,
  filters,
  weak,
  onClear,
}: {
  plan: StudyPlan;
  problems: ProblemSummary[];
  filters: ProblemFilters;
  weak: ReadonlySet<Tag>;
  onClear: () => void;
}) {
  const bySlug = useMemo(() => new Map(problems.map((problem) => [problem.leetcodeSlug, problem])), [problems]);
  const visible = useMemo(() => new Set(filterProblems(problems, filters, weak).map((problem) => problem.leetcodeSlug)), [problems, filters, weak]);
  const catalog = useMemo(() => new Set(bySlug.keys()), [bySlug]);
  const solved = useMemo(() => new Set(problems.filter((problem) => problem.progress.solved).map((problem) => problem.leetcodeSlug)), [problems]);
  const overall = planProgress(plan, catalog, solved);
  const filtering = hasActiveFilters(filters);
  const anyVisible = !filtering || plan.categories.some((category) => category.slugs.some((slug) => visible.has(slug)));

  return (
    <section aria-labelledby="plan-heading" className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 id="plan-heading" className="text-xl font-semibold text-fg">
              {plan.title}
            </h2>
            <p className="mt-0.5 text-sm text-fg-muted">{plan.description}</p>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums text-fg">
            {overall.solved}
            <span className="text-base font-medium text-fg-subtle">/{overall.total} solved</span>
          </p>
        </div>
        <div className="mt-4">
          <Bar {...overall} />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          {overall.available === overall.total
            ? `All ${overall.total} are playable in Prepr with the full invariant → trap → code flow.`
            : `${overall.available} of ${overall.total} are in Prepr with the full invariant → trap → code flow; the rest link out to LeetCode.`}
        </p>
      </Card>

      {!anyVisible ? (
        <EmptyState
          icon="🔍"
          level={3}
          title="No plan problems match"
          description="Try a different search or clear the filters."
          action={
            <Button variant="secondary" onClick={onClear}>
              Clear filters
            </Button>
          }
        />
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {plan.categories.map((category) => {
          const items = category.slugs.filter((slug) => (filtering ? visible.has(slug) : true));
          if (items.length === 0) return null;
          const progress = planProgress({ ...plan, categories: [category] }, catalog, solved);
          return (
            <Card key={category.name} padded={false} className="overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-fg">{category.name}</h3>
                  <span className="text-xs tabular-nums text-fg-muted">
                    {progress.solved}/{progress.total}
                  </span>
                </div>
                <div className="mt-2">
                  <Bar {...progress} />
                </div>
              </div>
              <ul className="divide-y divide-line/70">
                {items.map((slug) => {
                  const problem = bySlug.get(slug);
                  if (!problem) {
                    return (
                      <li key={slug} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="flex min-w-0 items-center gap-3 text-fg-subtle">
                          <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-xs">
                            ·
                          </span>
                          <span className="truncate">{titleFromSlug(slug)}</span>
                        </span>
                        <a
                          href={`https://leetcode.com/problems/${slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs font-medium text-fg-subtle hover:text-fg"
                          aria-label={`${titleFromSlug(slug)} on LeetCode (opens in a new tab)`}
                        >
                          LeetCode ↗
                        </a>
                      </li>
                    );
                  }
                  const status = ORB[problemStatus(problem)];
                  return (
                    <li key={slug}>
                      <Link href={`/practice/${problem.id}`} className="group flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-ink-800/60">
                        <span className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", status.className)}>
                            {status.glyph}
                          </span>
                          <span className="sr-only">{status.label}: </span>
                          <span className="truncate font-medium text-fg group-hover:text-synapse-soft">{problem.title}</span>
                        </span>
                        <DifficultyPill difficulty={problem.difficulty} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
