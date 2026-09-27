"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatRelative } from "@/lib/format";
import type { StatsResponse } from "@/lib/types";
import { describeEvent } from "./feed";

const VISIBLE = 6;

export interface RecentActivityCardProps {
  events: StatsResponse["recentActivity"];
  now: number;
  className?: string;
}

export function RecentActivityCard({ events, now, className }: RecentActivityCardProps) {
  const rows = useMemo(() => events.map(describeEvent), [events]);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const shown = expanded ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.length - VISIBLE;

  return (
    <Card className={className} aria-labelledby="recent-title">
      <CardHeader title={<span id="recent-title">Recent activity</span>} />
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-ink-900/50 px-4 py-6 text-center">
          <p aria-hidden="true" className="text-2xl">
            🌱
          </p>
          <p className="mt-2 text-sm font-medium text-fg">Nothing yet</p>
          <p className="mt-1 text-sm text-fg-muted">Answer your first card and it shows up here.</p>
        </div>
      ) : (
        <>
          <ol id={listId} className="-my-1 divide-y divide-line/70">
            {shown.map((row) => (
              <li key={row.id} className="flex items-start gap-3 py-2.5">
                <span
                  role="img"
                  aria-label={row.iconLabel}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-ink-800 text-sm"
                >
                  {row.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">
                    {row.href ? (
                      <Link href={row.href} className="block truncate hover:text-synapse-soft">
                        {row.title}
                      </Link>
                    ) : (
                      row.title
                    )}
                  </p>
                  {row.detail ? <p className="truncate text-xs text-fg-subtle">{row.detail}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {row.tapback ? (
                    <span role="img" aria-label={`Rated ${row.tapback.label}`} className="text-sm leading-5">
                      {row.tapback.emoji}
                    </span>
                  ) : null}
                  <time dateTime={new Date(row.createdAt).toISOString()} className="whitespace-nowrap text-xs text-fg-subtle">
                    {formatRelative(row.createdAt, now)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
          {hidden > 0 ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 text-sm font-medium text-synapse hover:text-synapse-soft"
            >
              {expanded ? "Show less" : `Show ${hidden} more`}
            </button>
          ) : null}
        </>
      )}
    </Card>
  );
}
