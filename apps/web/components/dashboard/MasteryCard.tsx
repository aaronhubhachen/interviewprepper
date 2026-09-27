"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent } from "@/lib/format";
import type { StatsResponse } from "@/lib/types";
import { cn } from "@/lib/cn";
import { WEAK_THRESHOLD, sortMastery } from "./insights";

/** Below lg, show this many until expanded (lg shows every pattern: the column has room). */
const VISIBLE = 12;

export interface MasteryCardProps {
  mastery: StatsResponse["masteryByTag"];
  className?: string;
}

export function MasteryCard({ mastery, className }: MasteryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const sorted = useMemo(() => sortMastery(mastery), [mastery]);
  const started = sorted.filter((entry) => entry.progress > 0 || entry.learned > 0).length;
  const hidden = sorted.length - VISIBLE;

  return (
    <Card className={className} aria-labelledby="mastery-title">
      <CardHeader
        title={<span id="mastery-title">Mastery by pattern</span>}
        description={`${started} of ${sorted.length} started`}
      />
      <ul id={listId} className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
        {sorted.map((entry, index) => {
          const weak = entry.weakScore >= WEAK_THRESHOLD;
          return (
            <li key={entry.tag} className={cn(!expanded && index >= VISIBLE && "hidden lg:block")}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <Link
                  href={`/review?tag=${encodeURIComponent(entry.tag)}`}
                  className="min-w-0 truncate font-medium text-fg hover:text-synapse-soft"
                  title={`Review ${entry.label}`}
                >
                  {weak ? (
                    <span className="mr-1" role="img" aria-label="Weak spot:">
                      ‼️
                    </span>
                  ) : null}
                  {entry.label}
                </Link>
                <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                  {entry.learned}/{entry.cards} learned
                  {entry.mastered > 0 ? ` · ${entry.mastered} mastered` : ""}
                </span>
              </div>
              <ProgressBar
                value={entry.progress}
                label={`${entry.label} mastery`}
                valueText={`${formatPercent(entry.progress)} toward mastery, ${entry.learned} of ${entry.cards} cards learned`}
                size="xs"
              />
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
          className="mt-4 text-sm font-medium text-synapse hover:text-synapse-soft lg:hidden"
        >
          {expanded ? "Show fewer patterns" : `Show all ${sorted.length} patterns`}
        </button>
      ) : null}
    </Card>
  );
}
