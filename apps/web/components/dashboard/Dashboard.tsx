"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { DUE_CHANGED_EVENT, errorMessage, fetchReviewActivity, fetchStats, isAbort } from "@/lib/api";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import type { StatsResponse } from "@/lib/types";
import { ActivityCard } from "./ActivityCard";
import type { ReviewActivityResponse } from "./activity-data";
import { ForecastCard } from "./ForecastCard";
import { useNow, useVisiblePolling } from "./hooks";
import { LinkCard } from "./LinkCard";
import { MasteryCard } from "./MasteryCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { StatsRow } from "./StatsRow";
import { TrendsCard } from "./TrendsCard";
import { WeakSpotsCard } from "./WeakSpotsCard";

/** Real time: refresh every 30 s. Demo scale (1 SRS day = minutes): every 10 s so cards visibly come due. */
const POLL_MS = 30_000;
const DEMO_POLL_MS = 10_000;

export function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [activity, setActivity] = useState<ReviewActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const now = useNow(15_000);

  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const [statsResult, activityResult] = await Promise.allSettled([
      fetchStats({ signal: current.signal }),
      fetchReviewActivity({ signal: current.signal }),
    ]);
    if (current.signal.aborted) return;
    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
      setError(null);
    } else if (!isAbort(statsResult.reason)) {
      setError(errorMessage(statsResult.reason));
    }
    // The per-source chart is an enhancement: keep the last good copy, fall back to core's totals.
    if (activityResult.status === "fulfilled") setActivity(activityResult.value);
  }, []);

  useEffect(() => {
    void load();
    const onDueChanged = () => void load();
    window.addEventListener(DUE_CHANGED_EVENT, onDueChanged);
    return () => {
      window.removeEventListener(DUE_CHANGED_EVENT, onDueChanged);
      controller.current?.abort();
    };
  }, [load]);

  useVisiblePolling(() => void load(), stats?.timeScale.demoScale ? DEMO_POLL_MS : POLL_MS);

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  return (
    <DashboardView
      stats={stats}
      activity={activity}
      error={error}
      retrying={retrying}
      now={now}
      onRetry={retry}
      onLinkChange={() => void load()}
    />
  );
}

export interface DashboardViewProps {
  stats: StatsResponse | null;
  activity: ReviewActivityResponse | null;
  /** Last load error (with stats: stale data banner; without: blocking banner). */
  error: string | null;
  retrying?: boolean;
  now: number;
  onRetry?: () => void;
  onLinkChange?: () => void;
}

/** Presentational dashboard (no fetching), so every state is renderable in tests. */
export function DashboardView({ stats, activity, error, retrying = false, now, onRetry, onLinkChange }: DashboardViewProps) {
  const due = stats?.dueNow ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Your progress"
        description="Spaced repetition across iMessage, the web, and the IDE, all on one SM-2 schedule."
        actions={
          <>
            <ButtonLink href="/practice" variant="secondary">
              Practice a problem
            </ButtonLink>
            <ButtonLink href="/review" rightIcon={<span aria-hidden="true">→</span>}>
              {stats && due > 0 ? `Review ${plural(due, "card")}` : "Start review"}
            </ButtonLink>
          </>
        }
      />

      {error && !stats ? (
        <Banner
          tone="danger"
          title="Couldn't load your dashboard"
          action={
            <Button size="sm" variant="secondary" onClick={onRetry} loading={retrying} loadingLabel="Retrying…">
              Retry
            </Button>
          }
          className="mb-6"
        >
          {error}
        </Banner>
      ) : null}

      {stats ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <StatusPills stats={stats} />
          {error ? (
            <Banner
              tone="warning"
              title="Showing the last loaded numbers"
              action={
                <Button size="sm" variant="ghost" onClick={onRetry} loading={retrying} loadingLabel="Retrying…">
                  Retry
                </Button>
              }
            >
              {error}
            </Banner>
          ) : null}

          <StatsRow stats={stats} now={now} />

          {/*
            Two independent columns on lg (cards keep their natural height; the
            last card in each column stretches so the bottoms align). Below lg the
            column wrappers are display: contents and `order` interleaves them:
            forecast, link, activity, weak spots, mastery, recent.
          */}
          <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-3 lg:items-stretch">
            <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">
              <ForecastCard
                className="order-1 lg:order-none"
                forecast={stats.forecast14}
                timezone={stats.timeScale.timezone}
                demoScale={stats.timeScale.demoScale}
              />
              <ActivityCard
                className="order-3 lg:order-none"
                activity={activity}
                reviewsByDay={stats.reviewsByDay}
                demoScale={stats.timeScale.demoScale}
              />
              <MasteryCard className="order-5 lg:order-none lg:flex-1" mastery={stats.masteryByTag} />
            </div>
            <div className="contents lg:flex lg:flex-col lg:gap-6">
              <LinkCard className="order-2 lg:order-none" initial={stats.link} onChange={onLinkChange} />
              <TrendsCard className="order-3 lg:order-none" trends={stats.trends} />
              <WeakSpotsCard className="order-4 lg:order-none" weakTags={stats.weakTags} now={now} />
              <RecentActivityCard className="order-6 lg:order-none lg:flex-1" events={stats.recentActivity} now={now} />
            </div>
          </div>
        </div>
      ) : error ? null : (
        <DashboardSkeleton />
      )}
    </>
  );
}

function StatusPills({ stats }: { stats: StatsResponse }) {
  const { llm, timeScale } = stats;
  return (
    <div className="-mt-2 flex flex-wrap items-center gap-2 sm:-mt-4" aria-label="System status">
      {llm.configured ? (
        <Pill tone="violet" icon="🤖" title="Free-text answers are graded by an LLM, with a heuristic fallback">
          Socratic grading · {llm.model ?? llm.provider ?? "LLM"}
        </Pill>
      ) : (
        <Pill tone="neutral" icon="⚙️" title="No LLM key configured: answers are graded by key-point matching">
          Heuristic grading (offline)
        </Pill>
      )}
      {timeScale.demoScale ? (
        <Pill tone="cyan" icon="⚡" title="SYNAPSE_DAY_MS demo scale: intervals are shown in SRS days">
          Demo time · {timeScale.description}
        </Pill>
      ) : (
        <Pill tone="neutral" icon="🕰️">
          Real time · {timeScale.timezone}
        </Pill>
      )}
    </div>
  );
}

/** Same grid and heights as the loaded dashboard, so nothing jumps when data lands. */
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>
      <div className="-mt-2 flex gap-2 sm:-mt-4">
        <Skeleton className="h-6 w-52 rounded-full" />
        <Skeleton className="h-6 w-44 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-card border border-line bg-ink-850/85 p-4 sm:p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-3">
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">
          <SkeletonCard className="order-1 h-[20rem] lg:order-none" />
          <SkeletonCard className="order-3 h-[21.5rem] lg:order-none" />
          <SkeletonCard className="order-5 h-72 lg:order-none" />
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <SkeletonCard className="order-2 h-[25rem] lg:order-none" />
          <SkeletonCard className="order-4 h-80 lg:order-none" />
          <SkeletonCard className="order-6 h-72 lg:order-none" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card border border-line bg-ink-850/85 p-5 sm:p-6", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      <Skeleton className="mt-6 h-[60%] w-full" />
    </div>
  );
}
