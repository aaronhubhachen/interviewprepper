"use client";

import { useMemo, useState } from "react";
import type { StatsResponse } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { plural } from "@/lib/format";
import { peakIndex } from "./chart-math";
import { ChartTable, ChartViewToggle, ColumnChart, type ChartView, type ColumnDatum, type ColumnSeries } from "./ColumnChart";
import { summarizeForecast } from "./insights";

/** Single series: brand violet (synapse-500, 4.5:1 on the card surface). No legend; the title names it. */
const FORECAST_SERIES: readonly ColumnSeries[] = [{ key: "due", label: "Cards due", color: "#8b5cf6" }];
const PLOT_HEIGHT = 168;

export interface ForecastCardProps {
  forecast: StatsResponse["forecast14"];
  timezone: string;
  demoScale: boolean;
  className?: string;
}

export function ForecastCard({ forecast, timezone, demoScale, className }: ForecastCardProps) {
  const [view, setView] = useState<ChartView>("chart");

  const data = useMemo<ColumnDatum[]>(() => {
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" });
    return forecast.map((day) => ({
      key: String(day.offset),
      label: day.label,
      fullLabel:
        day.offset === 0
          ? "Today (incl. overdue)"
          : demoScale
            ? `In ${plural(day.offset, "SRS day")}`
            : formatter.format(day.startsAt),
      values: { due: day.count },
    }));
  }, [forecast, timezone, demoScale]);

  const summary = summarizeForecast(forecast);
  const peak = peakIndex(forecast.map((day) => day.count));
  const valueLabels = [0, peak].filter((index, position, list) => index >= 0 && list.indexOf(index) === position);
  const empty = summary.total === 0;
  const unitDays = demoScale ? "SRS days" : "days";

  return (
    <Card className={className} aria-labelledby="forecast-title">
      <CardHeader
        title={<span id="forecast-title">14-day forecast</span>}
        description={
          empty
            ? "Cards coming due each day."
            : `${plural(summary.nextWeek, "card")} due in the next 7 ${unitDays}${summary.peak ? ` · busiest: ${summary.peak.label} (${summary.peak.count})` : ""}`
        }
        actions={<ChartViewToggle view={view} onChange={setView} label="Forecast" />}
      />
      {view === "chart" ? (
        <ColumnChart
          title={`Cards due per ${demoScale ? "SRS day" : "day"}, next 14 ${unitDays}`}
          data={data}
          series={FORECAST_SERIES}
          unit={["card due", "cards due"]}
          plotHeight={PLOT_HEIGHT}
          labelEvery={1}
          mobileLabelEvery={2}
          valueLabelIndices={valueLabels}
          initialIndex={0}
          overlay={
            empty ? (
              <p className="rounded-lg bg-ink-850/90 px-3 py-1.5 text-center text-sm text-fg-muted">
                Nothing scheduled yet. Review a card to start your forecast.
              </p>
            ) : null
          }
        />
      ) : (
        <ChartTable title="Cards due per day" data={data} series={FORECAST_SERIES} height={PLOT_HEIGHT + 24} />
      )}
    </Card>
  );
}
