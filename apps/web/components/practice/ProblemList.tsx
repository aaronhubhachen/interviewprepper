"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { getStudyPlan, STUDY_PLANS, type StudyPlanId } from "@synapse/core/plans";
import { TAG_IDS, tagLabel, type ProblemDifficulty, type Tag } from "@synapse/core/tags";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill, TagPill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { errorMessage, fetchProblems, fetchStats } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRelative, plural } from "@/lib/format";
import type { ProblemSummary } from "@/lib/types";
import { DifficultyPill, Segmented, StageDots } from "./bits";
import { StudyPlanView } from "./StudyPlanView";
import {
  DIFFICULTIES,
  EMPTY_FILTERS,
  filterProblems,
  filtersToQuery,
  hasActiveFilters,
  problemStatus,
  recommendProblem,
  tagOptions,
  weakHits,
  type ProblemFilters,
  type ProblemStatus,
  type Recommendation,
} from "./filters";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; problems: ProblemSummary[]; now: number };

const STATUS_META: Record<ProblemStatus, { glyph: string; label: string; orb: string }> = {
  due: { glyph: "⏰", label: "Due for review", orb: "border-axon/50 bg-axon/10 text-axon" },
  solved: { glyph: "✓", label: "Solved", orb: "border-success/40 bg-success/10 text-success" },
  "in-progress": { glyph: "◐", label: "In progress", orb: "border-synapse/45 bg-synapse/10 text-synapse-soft" },
  new: { glyph: "○", label: "Not started", orb: "border-line-strong bg-ink-800 text-fg-subtle" },
};

const RECOMMEND_COPY: Record<Recommendation["reason"], string> = {
  due: "Due for review: the problem card came back around.",
  weak: "Drills a current weak spot",
  new: "A fresh problem to add to your deck",
  unfinished: "Pick up where you left off: you haven't solved this one yet",
  review: "Everything is solved: revisit the one due soonest",
};

const RECOMMEND_ICON: Record<Recommendation["reason"], string> = {
  due: "⏰",
  weak: "‼️",
  new: "✨",
  unfinished: "🧩",
  review: "🔁",
};

export function ProblemList({ initialFilters }: { initialFilters: ProblemFilters }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [weak, setWeak] = useState<ReadonlySet<Tag>>(() => new Set());
  const [filters, setFilters] = useState<ProblemFilters>(initialFilters);

  const load = useCallback((signal?: AbortSignal) => {
    setState({ status: "loading" });
    fetchProblems({ signal })
      .then(({ problems }) => setState({ status: "ready", problems, now: Date.now() }))
      .catch((error: unknown) => {
        if (signal?.aborted) return;
        setState({ status: "error", message: errorMessage(error) });
      });
    fetchStats({ signal })
      .then((stats) => setWeak(new Set(stats.weakTags.map((entry) => entry.tag))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Keep the URL shareable (/practice?tag=dp_state_compression) without a navigation.
  useEffect(() => {
    const query = filtersToQuery(filters);
    const target = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (target !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", target);
  }, [filters]);

  return (
    <>
      <PageHeader
        eyebrow="Card-flip IDE"
        title="Practice"
        description="Invariant, edge case, then code."
        actions={
          <ButtonLink href="/review" variant="secondary" leftIcon={<span aria-hidden="true">🃏</span>}>
            Flashcards
          </ButtonLink>
        }
      />
      {state.status === "loading" ? (
        <ListSkeleton />
      ) : state.status === "error" ? (
        <EmptyState
          icon="🔌"
          title="Couldn't load problems"
          description={state.message}
          action={
            <Button variant="secondary" onClick={() => load()}>
              Try again
            </Button>
          }
        />
      ) : (
        <ProblemBrowser problems={state.problems} now={state.now} weak={weak} filters={filters} onFilters={setFilters} />
      )}
    </>
  );
}

function ProblemBrowser({
  problems,
  now,
  weak,
  filters,
  onFilters,
}: {
  problems: ProblemSummary[];
  now: number;
  weak: ReadonlySet<Tag>;
  filters: ProblemFilters;
  onFilters: (filters: ProblemFilters) => void;
}) {
  const searchId = useId();
  const tagId = useId();
  const visible = useMemo(() => filterProblems(problems, filters, weak), [problems, filters, weak]);
  const recommendation = useMemo(() => recommendProblem(problems, weak), [problems, weak]);
  const tags = useMemo(() => tagOptions(problems, TAG_IDS), [problems]);
  const solved = problems.filter((problem) => problem.progress.solved).length;
  const due = problems.filter((problem) => problem.progress.card.due).length;
  const weakCount = problems.filter((problem) => weakHits(problem, weak).length > 0).length;
  const set = (patch: Partial<ProblemFilters>) => onFilters({ ...filters, ...patch });
  const clear = () => onFilters({ ...EMPTY_FILTERS, plan: filters.plan ?? null });
  const plan = filters.plan ? getStudyPlan(filters.plan) : undefined;

  if (problems.length === 0) {
    return <EmptyState icon="🧩" title="No problems yet" description="The content deck is empty. Add problems in packages/core/src/content/problems.ts." />;
  }

  return (
    <div className="space-y-6">
      {recommendation ? <UpNext recommendation={recommendation} /> : null}

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Solved" value={`${solved}/${problems.length}`} icon="✅" tone="success" hint={solved === problems.length ? "Full deck" : `${problems.length - solved} to go`} />
        <StatTile label="Due" value={due} icon="⏰" tone="cyan" hint={due === 1 ? "problem card" : "problem cards"} />
        <StatTile label="Weak spots" value={weakCount} icon="‼️" tone="warning" hint={weak.size > 0 ? plural(weak.size, "weak tag") : "None flagged"} />
      </div>

      <section aria-labelledby="all-problems-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="all-problems-heading" className="text-xl font-semibold text-fg">
              {plan ? "Study plan" : "All problems"}
            </h2>
            <Segmented<"all" | StudyPlanId>
              label="Study plan"
              size="md"
              value={filters.plan ?? "all"}
              options={[{ value: "all", label: "All" }, ...STUDY_PLANS.map((option) => ({ value: option.id, label: option.title }))]}
              onChange={(value) => set({ plan: value === "all" ? null : value })}
            />
          </div>
          {plan ? null : (
            <p className="text-sm text-fg-muted" aria-live="polite">
            {visible.length === problems.length ? plural(problems.length, "problem") : `${visible.length} of ${problems.length} shown`}
          </p>
          )}
        </div>

        <Card padded={false} className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search problems
            </label>
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
              ⌕
            </span>
            <input
              id={searchId}
              type="search"
              value={filters.query}
              onChange={(event) => set({ query: event.target.value.slice(0, 80) })}
              placeholder="Search by title or topic…"
              className="h-10 w-full rounded-xl border border-line-strong bg-ink-900/80 pl-8 pr-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-synapse/60"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<"all" | ProblemDifficulty>
              label="Difficulty"
              size="md"
              value={filters.difficulty ?? "all"}
              options={[{ value: "all", label: "All" }, ...DIFFICULTIES.map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }))]}
              onChange={(value) => set({ difficulty: value === "all" ? null : value })}
            />
            <label htmlFor={tagId} className="sr-only">
              Topic
            </label>
            <select
              id={tagId}
              value={filters.tag ?? ""}
              onChange={(event) => set({ tag: (event.target.value || null) as Tag | null })}
              className="h-10 rounded-xl border border-line-strong bg-ink-900/80 px-3 text-sm text-fg focus-visible:border-synapse/60"
            >
              <option value="">All topics</option>
              {tags.map((option) => (
                <option key={option.tag} value={option.tag}>
                  {weak.has(option.tag) ? "‼️ " : ""}
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={filters.weakOnly}
              disabled={weak.size === 0 && !filters.weakOnly}
              onClick={() => set({ weakOnly: !filters.weakOnly })}
              title={weak.size === 0 ? "No weak spots flagged yet" : "Only problems that drill a current weak spot"}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                filters.weakOnly ? "border-warning/60 bg-warning/15 text-warning" : "border-line-strong bg-ink-900/80 text-fg-muted hover:text-fg",
              )}
            >
              <span aria-hidden="true">‼️</span> Weak spots
            </button>
            {hasActiveFilters(filters) ? (
              <Button variant="ghost" size="md" onClick={clear}>
                Clear
              </Button>
            ) : null}
          </div>
        </Card>

        {plan ? (
          <StudyPlanView plan={plan} problems={problems} filters={filters} weak={weak} onClear={clear} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="🔍"
            level={3}
            title="No problems match"
            description={filters.tag ? `Nothing tagged ${tagLabel(filters.tag)} with these filters.` : "Try a different search or clear the filters."}
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((problem) => (
              <ProblemRow key={problem.id} problem={problem} now={now} weak={weak} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function statusLine(problem: ProblemSummary, now: number): string {
  const { progress } = problem;
  const status = problemStatus(problem);
  if (status === "due") return progress.card.intervalLabel ? `Due now · last interval ${progress.card.intervalLabel}` : "Due for review";
  if (status === "solved") return progress.card.intervalLabel ? `Solved · next review in ${progress.card.intervalLabel}` : "Solved";
  if (status === "in-progress") {
    const when = progress.lastAttemptAt ? ` · ${formatRelative(progress.lastAttemptAt, now)}` : "";
    return `${progress.stagesPassed.length}/3 stages${when}`;
  }
  return "Not started";
}

function ProblemRow({ problem, now, weak }: { problem: ProblemSummary; now: number; weak: ReadonlySet<Tag> }) {
  const status = problemStatus(problem);
  const meta = STATUS_META[status];
  const hits = weakHits(problem, weak);
  const isWeak = hits.length > 0;
  return (
    <li>
      <Link
        href={`/practice/${problem.id}`}
        className={cn(
          "group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-card border p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5",
          "motion-safe:hover:-translate-y-0.5",
          isWeak
            ? "border-warning/40 bg-[linear-gradient(100deg,rgb(249_115_22/0.08),transparent_45%)] bg-ink-850/85 hover:border-warning/70"
            : "border-line bg-ink-850/85 hover:border-synapse/50 hover:shadow-glow",
        )}
      >
        <span aria-hidden="true" className={cn("grid h-10 w-10 place-items-center rounded-full border text-base font-semibold", meta.orb)}>
          {meta.glyph}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-fg transition-colors group-hover:text-synapse-soft">{problem.title}</h3>
            <DifficultyPill difficulty={problem.difficulty} />
            {isWeak ? (
              <Pill tone="warning" icon="‼️">
                Weak spot
              </Pill>
            ) : null}
            {problem.progress.struggled && !problem.progress.solved ? <Pill tone="neutral">Struggled</Pill> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <TagPill key={tag} tag={tag} weak={weak.has(tag)} />
            ))}
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-line/70 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <StageDots passed={problem.progress.stagesPassed} />
          <span className="text-xs text-fg-muted">
            <span className="sr-only">{meta.label}. </span>
            {statusLine(problem, now)}
          </span>
        </div>
      </Link>
    </li>
  );
}

function UpNext({ recommendation }: { recommendation: Recommendation }) {
  const { problem, reason, weakHits: hits } = recommendation;
  const why = reason === "weak" && hits.length > 0 ? `${RECOMMEND_COPY.weak}: ${hits.map(tagLabel).join(" + ")}` : RECOMMEND_COPY[reason];
  const started = problem.progress.attempts > 0;
  return (
    <Card glow as="section" aria-labelledby="up-next-heading" className="overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-synapse/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p id="up-next-heading" className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">
            Up next
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight text-fg">{problem.title}</span>
            <DifficultyPill difficulty={problem.difficulty} />
          </p>
          <p className="mt-1.5 text-sm text-fg-muted">
            <span aria-hidden="true">{RECOMMEND_ICON[reason]} </span>
            {why}
          </p>
        </div>
        <ButtonLink href={`/practice/${problem.id}`} size="lg" rightIcon={<span aria-hidden="true">→</span>} className="shrink-0">
          {reason === "due" ? "Review it" : started ? "Continue" : "Start"}
        </ButtonLink>
      </div>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading problems" className="space-y-6">
      <Skeleton className="h-[7.5rem] rounded-card" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[7.25rem] rounded-card" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-[4.5rem] rounded-card" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-[5.75rem] rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
