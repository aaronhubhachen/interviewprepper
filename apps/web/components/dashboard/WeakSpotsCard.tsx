"use client";

import { useId, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar, type ProgressTone } from "@/components/ui/ProgressBar";
import { formatRelative } from "@/lib/format";
import type { StatsResponse } from "@/lib/types";
import { WEAK_SCORE_MAX, WEAK_SEVERITY_LABEL, weakSeverity, weakWhy, type WeakSeverity } from "./insights";

const SEVERITY_TONE: Record<WeakSeverity, ProgressTone> = { high: "danger", medium: "warning", low: "violet" };
const VISIBLE = 4;

export interface WeakSpotsCardProps {
  weakTags: StatsResponse["weakTags"];
  now: number;
  className?: string;
}

export function WeakSpotsCard({ weakTags, now, className }: WeakSpotsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const shown = expanded ? weakTags : weakTags.slice(0, VISIBLE);
  const hidden = weakTags.length - VISIBLE;

  return (
    <Card className={className} aria-labelledby="weak-title">
      <CardHeader
        title={<span id="weak-title">Weak spots</span>}
        description="These get extra practice here and over iMessage. Scores fade as you recall them."
      />
      {weakTags.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-ink-900/50 px-4 py-6 text-center">
          <p aria-hidden="true" className="text-2xl">
            💪
          </p>
          <p className="mt-2 text-sm font-medium text-fg">No weak spots right now</p>
          <p className="mt-1 text-sm text-fg-muted">
            Struggle in the IDE, miss a review, or tap ‼️ on a text and the pattern shows up here.
          </p>
        </div>
      ) : (
        <>
          <ul id={listId} className="space-y-2.5">
            {shown.map((weak) => {
              const severity = weakSeverity(weak.score);
              const why = weakWhy(weak.source);
              return (
                <li key={weak.tag} className="rounded-xl border border-line bg-ink-800/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-medium text-fg">{weak.label}</p>
                    <ButtonLink
                      href={`/review?tag=${encodeURIComponent(weak.tag)}`}
                      variant="secondary"
                      size="sm"
                      aria-label={`Drill ${weak.label} now`}
                      className="shrink-0"
                    >
                      Drill now
                    </ButtonLink>
                  </div>
                  <p className="mt-1 text-xs text-fg-subtle">
                    <span aria-hidden="true">{why.icon} </span>
                    {why.text}
                    <span aria-hidden="true"> · </span>
                    <time className="whitespace-nowrap" dateTime={new Date(weak.lastFlaggedAt).toISOString()}>
                      {formatRelative(weak.lastFlaggedAt, now)}
                    </time>
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar
                      value={weak.score}
                      max={WEAK_SCORE_MAX}
                      label={`${weak.label} weakness`}
                      valueText={`${WEAK_SEVERITY_LABEL[severity]}, ${weak.score.toFixed(1)} of ${WEAK_SCORE_MAX}`}
                      tone={SEVERITY_TONE[severity]}
                      size="xs"
                    />
                    <span className="w-14 shrink-0 text-right text-xs font-medium text-fg-muted">
                      {WEAK_SEVERITY_LABEL[severity]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {hidden > 0 ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 text-sm font-medium text-synapse hover:text-synapse-soft"
            >
              {expanded ? "Show fewer" : `Show ${hidden} more`}
            </button>
          ) : null}
        </>
      )}
    </Card>
  );
}
