import { StatTile } from "@/components/ui/StatTile";
import { formatPercent, formatRelative, plural } from "@/lib/format";
import type { StatsResponse } from "@/lib/types";
import { retentionBand } from "./insights";

export interface StatsRowProps {
  stats: StatsResponse;
  now: number;
}

const RETENTION_TONE = { none: "neutral", strong: "success", ok: "cyan", weak: "warning" } as const;
const RETENTION_HINT = {
  strong: "Strong recall",
  ok: "Healthy recall",
  weak: "Below target (85%)",
} as const;

/** KPI row: due now, 30-day retention, streak, cards learned. */
export function StatsRow({ stats, now }: StatsRowProps) {
  const { queue } = stats;
  // Same window as core's retention30d (local calendar days).
  const reviews30 = stats.reviewsByDay.reduce((sum, day) => sum + day.reviews, 0);
  const band = retentionBand(stats.retention30d);
  const learnedShare = stats.totalCards > 0 ? stats.cardsLearned / stats.totalCards : 0;

  const dueHint =
    stats.dueNow > 0
      ? queue.newRemaining > 0
        ? `+ ${plural(queue.newRemaining, "new card")} today`
        : "New-card cap reached today"
      : queue.nextDueAt
        ? `Next due ${formatRelative(queue.nextDueAt, now)}`
        : queue.newRemaining > 0
          ? `${plural(queue.newRemaining, "new card")} ready`
          : "Nothing scheduled";

  return (
    <section aria-label="Key stats" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile label="Due now" icon="⏰" tone={stats.dueNow > 0 ? "cyan" : "neutral"} value={stats.dueNow} hint={dueHint} />
      <StatTile
        label="30-day retention"
        icon="🧠"
        tone={RETENTION_TONE[band]}
        value={formatPercent(stats.retention30d)}
        hint={band === "none" ? "No reviews yet" : `${RETENTION_HINT[band]} · ${plural(reviews30, "review")}`}
      />
      <StatTile
        label="Streak"
        icon="🔥"
        tone="neutral"
        value={
          <>
            {stats.streakDays}
            <span className="ml-1.5 text-base font-medium text-fg-muted">{stats.streakDays === 1 ? "day" : "days"}</span>
          </>
        }
        hint={stats.reviewedToday > 0 ? `✓ ${plural(stats.reviewedToday, "review")} today` : "Review today to keep it alive"}
      />
      <StatTile
        label="Cards learned"
        icon="🃏"
        tone="violet"
        value={
          <>
            {stats.cardsLearned}
            <span className="ml-1 text-base font-medium text-fg-muted">/ {stats.totalCards}</span>
          </>
        }
        hint={`${formatPercent(learnedShare)} of the deck`}
      />
    </section>
  );
}
