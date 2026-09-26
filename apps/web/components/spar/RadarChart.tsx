"use client";

import { SPAR_AXES, type SparAxis, type SparScores } from "@synapse/core/transcript";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { axisAngle, labelPlacement, radarPoint, radarPolygon, ringPolygon, splitLabel } from "@/lib/voice/radar";
import { CHART_AXIS, CHART_GRID, CHART_SURFACE, SERIES_COMPARE, SERIES_PRIMARY } from "./levels";

export interface RadarSeries {
  key: string;
  label: string;
  scores: SparScores;
  role: "primary" | "compare";
}

export interface RadarChartProps {
  /** One or two series; the primary one is drawn on top. */
  series: readonly RadarSeries[];
  /** Axis highlighted by hover/focus here or in the companion score table. */
  activeAxis: SparAxis | null;
  onActiveAxisChange: (axis: SparAxis | null) => void;
  /** Accessible name, e.g. "Feedback scores". */
  label: string;
  className?: string;
}

const W = 400;
const H = 326;
const CENTER = { x: 200, y: 166 };
const R = 116;
const RINGS = [0.25, 0.5, 0.75, 1] as const;
const COUNT = SPAR_AXES.length;

const colorOf = (series: RadarSeries) => (series.role === "primary" ? SERIES_PRIMARY : SERIES_COMPARE);

/** Hit wedge for axis i: the slice of the disc closest to that axis (a nearest-axis layer, not a pinpoint). */
function wedge(index: number): string {
  const half = Math.PI / COUNT;
  const angle = axisAngle(index, COUNT);
  const reach = R + 34;
  const point = (a: number) => `${CENTER.x + reach * Math.cos(a)},${CENTER.y + reach * Math.sin(a)}`;
  return [`${CENTER.x},${CENTER.y}`, point(angle - half), point(angle), point(angle + half)].join(" ");
}

/**
 * Hand-rolled SVG radar (six spar axes, 0-100). Thin 2px outlines over a ~10%
 * wash, 8px vertex dots with a 2px surface ring, solid hairline grid, text in
 * text tokens only. Hover or arrow keys reveal every series' value on an axis;
 * the companion ScoreTable is the always-visible table view.
 */
export function RadarChart({ series, activeAxis, onActiveAxisChange, label, className }: RadarChartProps) {
  const [drawn, setDrawn] = useState(false);
  const [focused, setFocused] = useState(false);
  const titleId = useId();

  // A timeout (not rAF, which background tabs pause) so the grow-in always completes.
  useEffect(() => {
    const id = window.setTimeout(() => setDrawn(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  const activeIndex = activeAxis ? SPAR_AXES.findIndex((axis) => axis.key === activeAxis) : -1;
  const drawOrder = [...series].sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? 1 : -1));
  const primary = series.find((item) => item.role === "primary") ?? series[0];

  const summary = `${label}: ${SPAR_AXES.map(
    (axis) => `${axis.label} ${series.map((item) => `${item.scores[axis.key]}${series.length > 1 ? ` (${item.label})` : ""}`).join(", ")}`,
  ).join("; ")}.`;

  const move = (delta: number) => {
    const from = activeIndex < 0 ? (delta > 0 ? -1 : 0) : activeIndex;
    const next = (from + delta + COUNT) % COUNT;
    onActiveAxisChange(SPAR_AXES[next]!.key);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        onActiveAxisChange(SPAR_AXES[0]!.key);
        break;
      case "End":
        event.preventDefault();
        onActiveAxisChange(SPAR_AXES[COUNT - 1]!.key);
        break;
      case "Escape":
        onActiveAxisChange(null);
        break;
    }
  };

  const tooltipAxis = activeIndex >= 0 ? SPAR_AXES[activeIndex]! : null;
  const anchor = tooltipAxis && primary ? radarPoint(activeIndex, COUNT, primary.scores[tooltipAxis.key], R, CENTER) : null;
  // Place the tooltip on the chart-center side of the vertex so it never covers the axis label it describes.
  const tipLeft = anchor ? (anchor.x / W) * 100 : 50;
  const tipTop = anchor ? (anchor.y / H) * 100 : 50;
  const tipTransform = (() => {
    if (activeIndex < 0) return "translate(-50%, -50%)";
    const angle = axisAngle(activeIndex, COUNT);
    const cos = Math.cos(angle);
    if (cos > 0.2) return "translate(calc(-100% - 14px), -50%)";
    if (cos < -0.2) return "translate(14px, -50%)";
    return Math.sin(angle) < 0 ? "translate(-50%, 14px)" : "translate(-50%, calc(-100% - 14px))";
  })();

  return (
    <figure className={cn("relative m-0", className)} aria-labelledby={titleId}>
      <figcaption id={titleId} className="sr-only">
        {label}
      </figcaption>
      <div
        tabIndex={0}
        role="group"
        aria-roledescription="radar chart"
        aria-label={`${label}. Arrow keys read each axis.`}
        onKeyDown={(event) => {
          setFocused(true);
          onKeyDown(event);
        }}
        onFocus={(event) => {
          // Keyboard focus shows the same readout as hover; a mouse click just focuses.
          const keyboard = event.currentTarget.matches(":focus-visible");
          setFocused(keyboard);
          if (keyboard && activeIndex < 0) onActiveAxisChange(SPAR_AXES[0]!.key);
        }}
        onBlur={() => {
          setFocused(false);
          onActiveAxisChange(null);
        }}
        onPointerLeave={() => {
          if (!focused) onActiveAxisChange(null);
        }}
        className="relative rounded-2xl"
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={summary}>
          {/* Grid: solid hairlines one step off the surface; the outer ring is the axis. */}
          <g fill="none" strokeWidth={1} aria-hidden="true">
            {RINGS.map((level) => (
              <polygon key={level} points={ringPolygon(level, COUNT, R, CENTER)} stroke={level === 1 ? CHART_AXIS : CHART_GRID} />
            ))}
            {SPAR_AXES.map((axis, index) => {
              const end = radarPoint(index, COUNT, 100, R, CENTER);
              return (
                <line
                  key={axis.key}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={index === activeIndex ? "var(--color-fg-subtle)" : CHART_GRID}
                  className="transition-[stroke] duration-150"
                />
              );
            })}
          </g>
          {/* No in-plot tick labels: every value is labeled in the companion score table, and ticks collide with vertices. */}

          {/* Series: ~10% wash + 2px outline, then dots with a 2px surface ring. */}
          <g
            aria-hidden="true"
            style={{
              transformOrigin: `${CENTER.x}px ${CENTER.y}px`,
              transform: drawn ? "scale(1)" : "scale(0.35)",
              opacity: drawn ? 1 : 0,
              transition: "transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 350ms ease-out",
            }}
          >
            {drawOrder.map((item) => {
              const values = SPAR_AXES.map((axis) => item.scores[axis.key]);
              const color = colorOf(item);
              return (
                <polygon
                  key={item.key}
                  points={radarPolygon(values, R, CENTER)}
                  fill={color}
                  fillOpacity={item.role === "primary" ? 0.14 : 0.08}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              );
            })}
            {drawOrder.map((item) =>
              SPAR_AXES.map((axis, index) => {
                const point = radarPoint(index, COUNT, item.scores[axis.key], R, CENTER);
                const active = index === activeIndex;
                return (
                  <circle
                    key={`${item.key}-${axis.key}`}
                    cx={point.x}
                    cy={point.y}
                    r={active ? 5.5 : 4}
                    fill={colorOf(item)}
                    stroke={CHART_SURFACE}
                    strokeWidth={2}
                    className="transition-[r] duration-150"
                  />
                );
              }),
            )}
          </g>

          {/* Axis labels (text tokens, never series colors). */}
          <g aria-hidden="true" fontFamily="var(--font-sans)" fontSize={12.5}>
            {SPAR_AXES.map((axis, index) => {
              const place = labelPlacement(index, COUNT, R, CENTER);
              const lines = place.anchor === "middle" ? [axis.label] : splitLabel(axis.label);
              const active = index === activeIndex;
              const firstDy = lines.length > 1 && place.anchor !== "middle" ? place.dy - 0.55 : place.dy;
              return (
                <text
                  key={axis.key}
                  x={place.x}
                  y={place.y}
                  textAnchor={place.anchor}
                  className={cn("transition-[fill] duration-150", active ? "fill-fg font-semibold" : "fill-fg-muted font-medium")}
                >
                  {lines.map((line, lineIndex) => (
                    <tspan key={line} x={place.x} dy={`${lineIndex === 0 ? firstDy : 1.15}em`}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </g>

          {/* Nearest-axis hit layer: each wedge of the disc activates its axis. */}
          <g aria-hidden="true">
            {SPAR_AXES.map((axis, index) => (
              <polygon
                key={axis.key}
                points={wedge(index)}
                fill="transparent"
                onPointerEnter={() => onActiveAxisChange(axis.key)}
                onPointerMove={() => {
                  if (activeIndex !== index) onActiveAxisChange(axis.key);
                }}
              />
            ))}
          </g>
        </svg>

        {tooltipAxis && anchor ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-line-strong bg-ink-800/95 px-3 py-2 shadow-card backdrop-blur-sm"
            style={{
              left: `${tipLeft}%`,
              top: `${tipTop}%`,
              transform: tipTransform,
            }}
          >
            <p className="text-xs font-medium text-fg-subtle">{tooltipAxis.label}</p>
            <ul className="mt-1 space-y-0.5">
              {series.map((item) => (
                <li key={item.key} className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: colorOf(item) }} />
                  <span className="text-sm font-semibold tabular-nums text-fg">{item.scores[tooltipAxis.key]}</span>
                  <span className="text-xs text-fg-muted">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {focused && tooltipAxis
          ? `${tooltipAxis.label}: ${series.map((item) => `${item.scores[tooltipAxis.key]} ${item.label}`).join(", ")}`
          : ""}
      </p>
    </figure>
  );
}

/** Legend for two or more series (line keys mirror the outlined marks). */
export function RadarLegend({ series, className }: { series: readonly RadarSeries[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted", className)} aria-label="Legend">
      {series.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="relative inline-flex h-3 w-5 items-center">
            <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: colorOf(item) }} />
            <span
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-ink-850"
              style={{ backgroundColor: colorOf(item) }}
            />
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
