"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { axisLabelIndices, niceScale, stackHeights, tooltipAlign } from "./chart-math";

/**
 * Hand-rolled (stacked) column chart: HTML columns on a hairline grid, so it
 * is responsive without measuring. Follows the dataviz mark specs: bars at
 * most 24px wide with 4px rounded data-ends, square at the baseline; 2px
 * surface gaps between stacked segments; solid hairline gridlines; text in
 * text tokens (never the series colour); a per-column hover/focus tooltip;
 * arrow-key inspection; and a table-view twin (ChartTable).
 */

export interface ColumnSeries {
  key: string;
  label: string;
  /** Mark colour only. */
  color: string;
}

export interface ColumnDatum {
  key: string;
  /** Short x-axis label ("Tmrw", "Sep 26"). */
  label: string;
  /** Tooltip / table label ("Wed, Sep 30"). */
  fullLabel: string;
  values: Record<string, number>;
}

export interface ColumnChartProps {
  /** Accessible name of the plot, e.g. "Reviews per day, last 30 days". */
  title: string;
  data: readonly ColumnDatum[];
  /** Stacking order, bottom → top. */
  series: readonly ColumnSeries[];
  /** Unit for totals: ["card", "cards"]. */
  unit: readonly [string, string];
  /** Plot height in px (the x-axis band is extra and always included). */
  plotHeight?: number;
  /** Show every n-th x label counted back from the last column (sm and up). */
  labelEvery?: number;
  /** Same, below the sm breakpoint. */
  mobileLabelEvery?: number;
  /** Columns that get their total printed on the cap (label selectively). */
  valueLabelIndices?: readonly number[];
  /** Column focused first by the keyboard (default: the last one). */
  initialIndex?: number;
  /** Extra line in the tooltip. */
  note?: (datum: ColumnDatum, total: number) => string | null;
  /** Rendered centred over the plot (e.g. an empty-state message). */
  overlay?: ReactNode;
  className?: string;
}

function totalOf(datum: ColumnDatum, series: readonly ColumnSeries[]): number {
  return series.reduce((sum, entry) => sum + Math.max(0, datum.values[entry.key] ?? 0), 0);
}

function unitFor(unit: readonly [string, string], count: number): string {
  return count === 1 ? unit[0] : unit[1];
}

function describe(
  datum: ColumnDatum,
  series: readonly ColumnSeries[],
  unit: readonly [string, string],
  note: string | null,
): string {
  const total = totalOf(datum, series);
  const parts = [`${datum.fullLabel}: ${total} ${unitFor(unit, total)}`];
  if (series.length > 1 && total > 0) {
    parts.push(
      series
        .filter((entry) => (datum.values[entry.key] ?? 0) > 0)
        .map((entry) => `${entry.label} ${datum.values[entry.key]}`)
        .join(", "),
    );
  }
  if (note) parts.push(note);
  return `${parts.join(". ")}.`;
}

export function ColumnChart({
  title,
  data,
  series,
  unit,
  plotHeight = 168,
  labelEvery = 1,
  mobileLabelEvery,
  valueLabelIndices = [],
  initialIndex,
  note,
  overlay,
  className,
}: ColumnChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const liveId = useId();
  const count = data.length;

  const totals = useMemo(() => data.map((datum) => totalOf(datum, series)), [data, series]);
  const scale = useMemo(() => niceScale(Math.max(0, ...totals)), [totals]);
  const desktopLabels = useMemo(() => axisLabelIndices(count, labelEvery), [count, labelEvery]);
  const mobileLabels = useMemo(
    () => axisLabelIndices(count, mobileLabelEvery ?? labelEvery),
    [count, mobileLabelEvery, labelEvery],
  );
  const valueLabels = useMemo(
    () => new Set(valueLabelIndices.filter((index) => (totals[index] ?? 0) > 0)),
    [valueLabelIndices, totals],
  );

  // Touch: a tap shows the tooltip; tapping anywhere else hides it.
  useEffect(() => {
    if (active === null) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active]);

  const safeActive = active !== null && active < count ? active : null;
  const activeDatum = safeActive !== null ? data[safeActive] : undefined;
  const activeTotal = safeActive !== null ? totals[safeActive] ?? 0 : 0;
  const activeNote = activeDatum && note ? note(activeDatum, activeTotal) : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    const current = safeActive ?? initialIndex ?? count - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(count - 1, current + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(0, current - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  const activate = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.buttons !== 0) return;
    setActive(index);
  };

  const barHeights = useMemo(
    () =>
      data.map((datum) =>
        stackHeights(
          series.map((entry) => datum.values[entry.key] ?? 0),
          scale.max,
          plotHeight,
        ),
      ),
    [data, series, scale.max, plotHeight],
  );

  const tooltipBottom =
    safeActive !== null
      ? (barHeights[safeActive] ?? []).reduce((sum, height) => sum + height, 0) + 12 + (valueLabels.has(safeActive) ? 16 : 0)
      : 0;
  const align = safeActive !== null ? tooltipAlign(safeActive, count) : "center";

  return (
    <div ref={rootRef} className={cn("relative select-none", className)}>
      <div className="flex">
        {/* Y-axis ticks (decorative: the table view and tooltips carry the values). */}
        <div aria-hidden="true" className="relative w-8 shrink-0" style={{ height: plotHeight }}>
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2 text-[0.7rem] leading-none text-fg-subtle tabular-nums"
              style={{ bottom: `${(tick / scale.max) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            role="group"
            tabIndex={0}
            aria-label={`${title}. Use the arrow keys to read each column.`}
            aria-describedby={liveId}
            onKeyDown={onKeyDown}
            onFocus={() => setActive((current) => current ?? initialIndex ?? count - 1)}
            onBlur={() => setActive(null)}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setActive(null);
            }}
            className="relative rounded-md focus-visible:outline-offset-4"
            style={{ height: plotHeight }}
          >
            {/* Solid hairline grid; the baseline one step stronger. */}
            {scale.ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden="true"
                className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-line-strong" : "border-line/70")}
                style={{ bottom: `${(tick / scale.max) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-end">
              {data.map((datum, index) => {
                const heights = barHeights[index] ?? [];
                const topSegment = heights.reduce((top, height, segment) => (height > 0 ? segment : top), -1);
                const isActive = safeActive === index;
                return (
                  <div
                    key={datum.key}
                    aria-hidden="true"
                    onPointerEnter={activate(index)}
                    onPointerMove={isActive ? undefined : activate(index)}
                    onPointerDown={() => setActive(index)}
                    className={cn(
                      "relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-md transition-colors duration-150",
                      isActive && "bg-fg/[0.045]",
                    )}
                  >
                    {valueLabels.has(index) ? (
                      <span className="mb-1 text-[0.7rem] font-medium leading-none text-fg-muted tabular-nums">
                        {totals[index]}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "flex w-[min(24px,64%)] flex-col-reverse gap-[2px] transition-[filter] duration-150",
                        isActive && "brightness-125",
                      )}
                    >
                      {series.map((entry, segment) => {
                        const height = heights[segment] ?? 0;
                        if (height <= 0) return null;
                        return (
                          <div
                            key={entry.key}
                            className={cn("w-full", segment === topSegment && "rounded-t-[4px]")}
                            style={{ height, backgroundColor: entry.color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {overlay ? <div className="pointer-events-none absolute inset-0 grid place-items-center px-4">{overlay}</div> : null}

            {activeDatum && safeActive !== null ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-20 w-max min-w-32 max-w-56 rounded-xl border border-line-strong bg-ink-900/95 px-3 py-2 text-xs shadow-card backdrop-blur"
                style={{
                  left: `${((safeActive + 0.5) / count) * 100}%`,
                  bottom: tooltipBottom,
                  transform:
                    align === "center"
                      ? "translateX(-50%)"
                      : align === "end"
                        ? "translateX(calc(-100% + 14px))"
                        : "translateX(-14px)",
                }}
              >
                <p className="text-fg-subtle">{activeDatum.fullLabel}</p>
                <p className="mt-0.5 text-sm text-fg">
                  <span className="text-base font-semibold tabular-nums">{activeTotal}</span>{" "}
                  <span className="text-fg-muted">{unitFor(unit, activeTotal)}</span>
                </p>
                {series.length > 1 ? (
                  <ul className="mt-1.5 space-y-1">
                    {series.map((entry) => (
                      <li key={entry.key} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-fg-muted">{entry.label}</span>
                        <span className="ml-auto pl-3 font-medium text-fg tabular-nums">
                          {activeDatum.values[entry.key] ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {activeNote ? <p className="mt-1.5 text-fg-subtle">{activeNote}</p> : null}
              </div>
            ) : null}
          </div>

          {/* X-axis band (included in the component height; never clipped). */}
          <div aria-hidden="true" className="flex h-6 pt-2">
            {data.map((datum, index) => (
              <div key={datum.key} className="relative min-w-0 flex-1">
                <span
                  className={cn(
                    "absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-[0.7rem] leading-none",
                    safeActive === index ? "text-fg" : "text-fg-subtle",
                    mobileLabels.has(index) ? "inline" : "hidden",
                    desktopLabels.has(index) ? "sm:inline" : "sm:hidden",
                  )}
                >
                  {datum.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p id={liveId} className="sr-only" aria-live="polite">
        {activeDatum ? describe(activeDatum, series, unit, activeNote) : ""}
      </p>
    </div>
  );
}

export interface ChartTableProps {
  title: string;
  data: readonly ColumnDatum[];
  series: readonly ColumnSeries[];
  /** Header of the first column ("Day"). */
  rowHeader?: string;
  /** Matches the chart's plot + axis height so toggling never shifts layout. */
  height?: number;
  /** Row order: "desc" lists the last column first (newest day on top). */
  order?: "asc" | "desc";
  className?: string;
}

/** The accessibility twin of a ColumnChart: every value, no hovering required. */
export function ChartTable({ title, data, series, rowHeader = "Day", height = 192, order = "asc", className }: ChartTableProps) {
  const showTotal = series.length > 1;
  const rows = order === "desc" ? [...data].reverse() : data;
  return (
    <div
      className={cn("scrollbar-thin overflow-auto rounded-xl border border-line", className)}
      style={{ height }}
      tabIndex={0}
      role="region"
      aria-label={`${title} (table)`}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="sticky top-0 z-10 bg-ink-800 text-[0.7rem] uppercase tracking-wider text-fg-subtle">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              {rowHeader}
            </th>
            {series.map((entry) => (
              <th key={entry.key} scope="col" className="px-3 py-2 text-right font-semibold">
                {entry.label}
              </th>
            ))}
            {showTotal ? (
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Total
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((datum) => (
            <tr key={datum.key} className="border-t border-line/70">
              <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal text-fg-muted">
                {datum.fullLabel}
              </th>
              {series.map((entry) => (
                <td key={entry.key} className="px-3 py-1.5 text-right text-fg tabular-nums">
                  {datum.values[entry.key] ?? 0}
                </td>
              ))}
              {showTotal ? (
                <td className="px-3 py-1.5 text-right font-medium text-fg tabular-nums">{totalOf(datum, series)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Legend for two or more series: rect swatch (mirrors the bar mark) + label + total. */
export function ChartLegend({
  series,
  totals,
  className,
}: {
  series: readonly ColumnSeries[];
  totals?: Record<string, number>;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs", className)} aria-label="Legend">
      {series.map((entry) => (
        <li key={entry.key} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: entry.color }} />
          <span className="text-fg-muted">{entry.label}</span>
          {totals ? <span className="font-medium text-fg tabular-nums">{totals[entry.key] ?? 0}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export type ChartView = "chart" | "table";

/** Chart ⇄ table segmented toggle for a card header. */
export function ChartViewToggle({
  view,
  onChange,
  label,
}: {
  view: ChartView;
  onChange: (view: ChartView) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${label} view`}
      className="inline-flex rounded-lg border border-line-strong bg-ink-800 p-0.5 text-xs"
    >
      {(["chart", "table"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium capitalize transition-colors",
            view === option ? "bg-ink-600 text-fg" : "text-fg-subtle hover:text-fg",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
