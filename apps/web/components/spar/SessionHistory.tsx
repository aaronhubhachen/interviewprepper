"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Banner, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatClock, formatRelative, plural } from "@/lib/format";
import type { SparSessionSummary } from "@/lib/types";
import { scoreBand } from "@/lib/voice/metrics";
import { sparklinePoints } from "@/lib/voice/radar";
import { scoreTrend } from "@/lib/voice/sessions";
import { CHART_GRID, CHART_SURFACE, SERIES_PRIMARY } from "./levels";

const BADGE_TONE = {
  good: "border-success/45 bg-success/10",
  warn: "border-warning/45 bg-warning/10",
  bad: "border-danger/45 bg-danger/10",
} as const;

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const band = scoreBand(score);
  return (
    <span
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-base font-semibold text-fg",
        BADGE_TONE[band.level],
        className,
      )}
    >
      {score}
      <span className="sr-only"> out of 100</span>
    </span>
  );
}

const SPARK_W = 300;
const SPARK_H = 72;
const SPARK_PAD = 10;
const LABEL_ROOM = 28;

/** Single-series trend (no legend; the caption names it). Crosshair + tooltip on hover; the list below is the table view. */
function ScoreSparkline({ sessions, now }: { sessions: readonly SparSessionSummary[]; now: number }) {
  const trend = scoreTrend(sessions);
  // Plot inside SPARK_W - LABEL_ROOM so the end label sits to the right of the last point, clear of the line.
  const coords = sparklinePoints(
    trend.map((point) => point.overall),
    SPARK_W - LABEL_ROOM,
    SPARK_H,
    SPARK_PAD,
  );
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  if (coords.length < 2) return null;

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * SPARK_W;
    let nearest = 0;
    coords.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(coords[nearest]!.x - x)) nearest = index;
    });
    setHover(nearest);
  };

  const first = coords[0]!;
  const last = coords.at(-1)!;
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${last.x},${SPARK_H - SPARK_PAD} L${first.x},${SPARK_H - SPARK_PAD} Z`;
  const lastScore = trend.at(-1)!.overall;
  const best = Math.max(...trend.map((point) => point.overall));
  const hovered = hover === null ? null : { point: coords[hover]!, data: trend[hover]! };

  return (
    <figure className="relative m-0 mb-4">
      <figcaption className="mb-1 flex items-center justify-between text-xs text-fg-subtle">
        <span>Overall score trend</span>
        <span>last {plural(trend.length, "session")}</span>
      </figcaption>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          className="block h-auto w-full"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          aria-hidden="true"
        >
          <line x1={0} x2={SPARK_W} y1={SPARK_H - SPARK_PAD} y2={SPARK_H - SPARK_PAD} stroke={CHART_GRID} strokeWidth={1} />
          <path d={area} fill={SERIES_PRIMARY} fillOpacity={0.1} />
          <path d={line} fill="none" stroke={SERIES_PRIMARY} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hovered ? (
            <>
              <line x1={hovered.point.x} x2={hovered.point.x} y1={4} y2={SPARK_H - SPARK_PAD} stroke="var(--color-fg-subtle)" strokeWidth={1} />
              <circle cx={hovered.point.x} cy={hovered.point.y} r={4.5} fill={SERIES_PRIMARY} stroke={CHART_SURFACE} strokeWidth={2} />
            </>
          ) : null}
          <circle cx={last.x} cy={last.y} r={4} fill={SERIES_PRIMARY} stroke={CHART_SURFACE} strokeWidth={2} />
          <text
            x={last.x + 9}
            y={last.y + 4}
            textAnchor="start"
            fontSize={12}
            fontWeight={600}
            className="fill-fg"
            fontFamily="var(--font-sans)"
          >
            {lastScore}
          </text>
        </svg>
        {hovered ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line-strong bg-ink-800/95 px-2.5 py-1.5 text-xs shadow-card"
            style={{
              left: `${Math.min(85, Math.max(15, (hovered.point.x / SPARK_W) * 100))}%`,
              top: `${(hovered.point.y / SPARK_H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
          >
            <span className="font-semibold tabular-nums text-fg">{hovered.data.overall}</span>{" "}
            <span className="text-fg-muted">{formatRelative(hovered.data.createdAt, now)}</span>
          </div>
        ) : null}
      </div>
      <p className="sr-only">
        Overall scores for the last {plural(trend.length, "session")}: from {trend[0]!.overall} to {lastScore}, best {best}.
      </p>
    </figure>
  );
}

export interface SessionHistoryProps {
  sessions: readonly SparSessionSummary[];
  status: "ready" | "loading" | "error";
  error?: string | null;
  onRetry: () => void;
  onOpen: (session: SparSessionSummary) => void;
  activeId?: number | null;
  /** Answers and best score over every session (`sessions` is only the latest page); null: label the list as recent. */
  totals?: { count: number; best: number | null } | null;
  now: number;
  className?: string;
}

const COLLAPSED = 6;

/** "32 answers · best 81" over all sessions, or "30 recent answers · best 78" when only the list is known. */
export function historySummary(sessions: readonly Pick<SparSessionSummary, "overall">[], totals?: SessionHistoryProps["totals"]): string | null {
  if (totals && totals.count >= sessions.length && totals.count > 0) {
    return `${plural(totals.count, "answer")}${totals.best === null ? "" : ` · best ${totals.best}`}`;
  }
  if (!sessions.length) return null;
  const best = Math.max(...sessions.map((session) => session.overall));
  return `${plural(sessions.length, "recent answer")} · best ${best}`;
}

export function SessionHistory({ sessions, status, error, onRetry, onOpen, activeId, totals, now, className }: SessionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sessions : sessions.slice(0, COLLAPSED);
  const summary = historySummary(sessions, totals);

  return (
    <Card as="aside" aria-labelledby="history-title" className={className}>
      <div className="mb-4">
        <h2 id="history-title" className="text-lg font-semibold text-fg">
          Past sessions
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {status === "ready" && sessions.length && summary ? summary : "Every answer is scored and saved here."}
        </p>
      </div>

      {status === "loading" ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading sessions">
          <Skeleton className="mb-4 h-[4.5rem] w-full" />
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[4.25rem] w-full rounded-xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <Banner
          tone="danger"
          title="Couldn't load sessions"
          action={
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          }
        >
          {error ?? "Something went wrong."}
        </Banner>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="🎙️"
          level={3}
          title="No sessions yet"
          description="Answer your first question. Your scores and trend show up here."
          className="py-8"
        />
      ) : (
        <>
          <ScoreSparkline sessions={sessions} now={now} />
          <ul className="space-y-2">
            {visible.map((session) => {
              const active = session.id === activeId;
              const band = scoreBand(session.overall);
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(session)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150",
                      active ? "border-synapse/60 bg-synapse/10" : "border-line bg-ink-900/50 hover:border-synapse/40 hover:bg-ink-800",
                    )}
                  >
                    <ScoreBadge score={session.overall} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-snug text-fg">
                        {session.round === 2 && session.followUpOf ? session.followUpOf : (session.questionPrompt ?? "Behavioral question")}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-subtle">
                        <span className="text-fg-muted">{band.label}</span>
                        {session.round === 2 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-axon-soft">Follow-up</span>
                          </>
                        ) : null}
                        <span aria-hidden="true">·</span>
                        <span>{formatRelative(session.createdAt, now)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatClock(session.durationMs)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {sessions.length > COLLAPSED ? (
            <Button variant="ghost" size="sm" fullWidth className="mt-3" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
              {expanded ? "Show fewer" : `Show all ${sessions.length}`}
            </Button>
          ) : null}
        </>
      )}
    </Card>
  );
}
