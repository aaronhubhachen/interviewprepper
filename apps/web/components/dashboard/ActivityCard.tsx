"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatPercent, plural } from "@/lib/format";
import type { StatsResponse } from "@/lib/types";
import { ACTIVITY_SERIES, formatDayKey, type ReviewActivityResponse } from "./activity-data";
import {
  ChartLegend,
  ChartTable,
  ChartViewToggle,
  ColumnChart,
  type ChartView,
  type ColumnDatum,
  type ColumnSeries,
} from "./ColumnChart";

const PLOT_HEIGHT = 168;
const SOURCE_SERIES: readonly ColumnSeries[] = ACTIVITY_SERIES.map(({ key, label, color }) => ({ key, label, color }));
/** Fallback when the per-source endpoint is unavailable: one series (slot 1), no legend. */
const TOTAL_SERIES: readonly ColumnSeries[] = [{ key: "reviews", label: "Reviews", color: "#3987e5" }];

export interface ActivityCardProps {
  /** Per-source buckets (preferred). */
  activity: ReviewActivityResponse | null;
  /** Core's per-day totals (fallback). */
  reviewsByDay: StatsResponse["reviewsByDay"];
  demoScale: boolean;
  className?: string;
}

interface ChartModel {
  data: ColumnDatum[];
  series: readonly ColumnSeries[];
  passedByKey: Map<string, number>;
  reviews: number;
  passed: number;
  totals?: Record<string, number>;
}

function buildModel(activity: ReviewActivityResponse | null, reviewsByDay: StatsResponse["reviewsByDay"]): ChartModel {
  if (activity) {
    return {
      data: activity.buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        fullLabel: bucket.fullLabel,
        values: { ...bucket.bySource },
      })),
      series: SOURCE_SERIES,
      passedByKey: new Map(activity.buckets.map((bucket) => [bucket.key, bucket.passed])),
      reviews: activity.totals.reviews,
      passed: activity.totals.passed,
      totals: { ...activity.totals.bySource },
    };
  }
  const last = reviewsByDay.length - 1;
  return {
    data: reviewsByDay.map((day, index) => ({
      key: day.dayKey,
      label: index === last ? "Today" : formatDayKey(day.dayKey),
      fullLabel: formatDayKey(day.dayKey, true),
      values: { reviews: day.reviews },
    })),
    series: TOTAL_SERIES,
    passedByKey: new Map(reviewsByDay.map((day) => [day.dayKey, day.passed])),
    reviews: reviewsByDay.reduce((sum, day) => sum + day.reviews, 0),
    passed: reviewsByDay.reduce((sum, day) => sum + day.passed, 0),
  };
}

export function ActivityCard({ activity, reviewsByDay, demoScale, className }: ActivityCardProps) {
  const [view, setView] = useState<ChartView>("chart");
  const model = useMemo(() => buildModel(activity, reviewsByDay), [activity, reviewsByDay]);
  const span = activity?.demoScale ?? demoScale ? "30 SRS days" : "30 days";
  const empty = model.reviews === 0;

  return (
    <Card className={className} aria-labelledby="activity-title">
      <CardHeader
        title={<span id="activity-title">Review activity</span>}
        description={
          empty
            ? `Reviews per day over the last ${span}, by surface.`
            : `${plural(model.reviews, "review")} in the last ${span} · ${formatPercent(model.passed / model.reviews)} recalled`
        }
        actions={<ChartViewToggle view={view} onChange={setView} label="Review activity" />}
      />
      {model.series.length > 1 ? <ChartLegend series={model.series} totals={model.totals} className="mb-3" /> : null}
      {view === "chart" ? (
        <ColumnChart
          title={`Reviews per day by surface, last ${span}`}
          data={model.data}
          series={model.series}
          unit={["review", "reviews"]}
          plotHeight={PLOT_HEIGHT}
          labelEvery={7}
          mobileLabelEvery={7}
          valueLabelIndices={[model.data.length - 1]}
          note={(datum, total) => {
            if (total === 0) return null;
            const passed = model.passedByKey.get(datum.key) ?? 0;
            return `${passed} of ${total} recalled (👍 or ❤️)`;
          }}
          overlay={
            empty ? (
              <p className="rounded-lg bg-ink-850/90 px-3 py-1.5 text-center text-sm text-fg-muted">
                No reviews yet. Answer a card here or over iMessage.
              </p>
            ) : null
          }
        />
      ) : (
        <ChartTable
          title={`Reviews per day by surface, last ${span}`}
          data={model.data}
          series={model.series}
          height={PLOT_HEIGHT + 24}
          order="desc"
        />
      )}
    </Card>
  );
}
