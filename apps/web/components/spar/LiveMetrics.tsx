"use client";

import type { StarPart, TranscriptAnalysis } from "@synapse/core/transcript";
import { Card, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import {
  fillerReading,
  liveNudge,
  ownershipReading,
  PACE_BAND,
  paceReading,
  STAR_COPY,
  STAR_PARTS,
  starCount,
  TARGET_MS,
  timerProgress,
  timerReading,
  TYPED_WPM,
  type Reading,
} from "@/lib/voice/metrics";
import { LEVEL_FILL, LEVEL_ICON, LEVEL_TONE, SERIES_COMPARE, SERIES_PRIMARY } from "./levels";

export type AnswerMode = "voice" | "typed";

export interface LiveMetricsProps {
  analysis: TranscriptAnalysis;
  /** Speaking time (voice) or estimated spoken time (typed). */
  elapsedMs: number;
  mode: AnswerMode;
  /** Recording (voice) or has text (typed): shows the Live badge. */
  live: boolean;
  /** Held at reduced opacity while feedback is generated (no skeleton flash). */
  dimmed?: boolean;
  className?: string;
}

function ReadingPill({ reading }: { reading: Reading }) {
  return (
    <Pill tone={LEVEL_TONE[reading.level]} icon={LEVEL_ICON[reading.level]} className="shrink-0">
      {reading.label}
    </Pill>
  );
}

/** Live coaching panel: every number is recomputed client-side with core's analyzeTranscript. */
export function LiveMetrics({ analysis, elapsedMs, mode, live, dimmed, className }: LiveMetricsProps) {
  const nudge = liveNudge(analysis, elapsedMs, mode);
  return (
    <Card
      as="aside"
      aria-labelledby="live-metrics-title"
      className={cn("transition-opacity duration-300", dimmed && "opacity-60", className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="live-metrics-title" className="text-lg font-semibold text-fg">
          Live metrics
        </h2>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
            live ? "border-danger/40 bg-danger/10 text-danger" : "border-line-strong bg-ink-800 text-fg-subtle",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-danger motion-safe:animate-pulse" : "bg-fg-faint")}
          />
          {live ? (mode === "voice" ? "Live" : "Updating") : "Waiting"}
        </span>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <TimerRing elapsedMs={elapsedMs} estimated={mode === "typed"} />
        <div className="min-w-0 space-y-4">
          <PaceMeter analysis={analysis} elapsedMs={elapsedMs} mode={mode} />
          <FillerMeter analysis={analysis} />
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <OwnershipMeter analysis={analysis} />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <StarChecklist analysis={analysis} />
      </div>

      <div
        className={cn(
          "mt-4 flex min-h-[3.25rem] items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
          nudge.tone === "warning" ? "border-warning/40 bg-warning/10 text-fg" : "border-line bg-ink-900/60 text-fg-muted",
        )}
      >
        <span aria-hidden="true" className="mt-px">
          {nudge.tone === "warning" ? "⏱️" : "💡"}
        </span>
        <p>{nudge.text}</p>
      </div>
    </Card>
  );
}

// ── Timer ring ─────────────────────────────────────────────────────────────

const RING_SIZE = 120;
const RING_STROKE = 9;
const RING_R = (RING_SIZE - RING_STROKE) / 2 - 1;
const RING_C = 2 * Math.PI * RING_R;
const OVER_R = RING_R - RING_STROKE - 3;
const OVER_C = 2 * Math.PI * OVER_R;

/** Meter ring: fills to the 2:00 target; overtime draws an inner warning arc (a full lap = one extra minute). */
export function TimerRing({ elapsedMs, estimated }: { elapsedMs: number; estimated?: boolean }) {
  const reading = timerReading(elapsedMs);
  const progress = timerProgress(elapsedMs);
  const overtime = Math.min(1, Math.max(0, (elapsedMs - TARGET_MS) / 60_000));
  const color = LEVEL_FILL[reading.level === "idle" ? "good" : reading.level];
  const label = `${estimated ? "Estimated speaking time" : "Elapsed"} ${formatClock(elapsedMs)} of a ${formatClock(TARGET_MS)} target. ${reading.label}.`;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[7.5rem] w-[7.5rem]" role="img" aria-label={label}>
        <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke={SERIES_PRIMARY} strokeOpacity={0.16} strokeWidth={RING_STROKE} />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeLinecap={progress > 0 && progress < 1 ? "round" : "butt"}
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
            className="transition-[stroke-dashoffset,stroke] duration-300 ease-linear"
          />
          {overtime > 0 ? (
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={OVER_R}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={OVER_C}
              strokeDashoffset={OVER_C * (1 - overtime)}
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-fg">
            {estimated ? "≈" : ""}
            {formatClock(elapsedMs)}
          </span>
          <span className="text-[0.7rem] text-fg-subtle">of {formatClock(TARGET_MS)}</span>
        </div>
      </div>
      <ReadingPill reading={reading} />
    </div>
  );
}

// ── Pace ───────────────────────────────────────────────────────────────────

const PACE_MIN = 60;
const PACE_MAX = 220;
const pacePct = (wpm: number) => ((Math.min(PACE_MAX, Math.max(PACE_MIN, wpm)) - PACE_MIN) / (PACE_MAX - PACE_MIN)) * 100;

function MeterHeader({ title, value, unit, reading }: { title: string; value: string; unit?: string; reading: Reading }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">{title}</p>
        <ReadingPill reading={reading} />
      </div>
      <p className="mt-1 flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-xl font-semibold tabular-nums text-fg">{value}</span>
        {unit ? <span className="truncate text-xs text-fg-subtle">{unit}</span> : null}
      </p>
    </div>
  );
}

export function PaceMeter({ analysis, elapsedMs, mode }: { analysis: TranscriptAnalysis; elapsedMs: number; mode: AnswerMode }) {
  if (mode === "typed") {
    return (
      <div>
        <MeterHeader title="Pace" value={String(TYPED_WPM)} unit="wpm, assumed" reading={{ level: "idle", label: "Typed" }} />
        <p className="mt-2 text-xs text-fg-subtle">Typed answers are timed as if spoken at a steady pace.</p>
      </div>
    );
  }
  const reading = paceReading(analysis.wpm, analysis.wordCount, elapsedMs);
  const ready = reading.level !== "idle";
  return (
    <div>
      <MeterHeader title="Pace" value={ready ? String(analysis.wpm) : "—"} unit="wpm" reading={reading} />
      <div
        className="relative mt-2.5 h-2 rounded-full"
        style={{ backgroundColor: "rgb(139 92 246 / 0.14)" }}
        role="img"
        aria-label={
          ready
            ? `Pace ${analysis.wpm} words per minute; target ${PACE_BAND.min} to ${PACE_BAND.max}.`
            : `Pace target ${PACE_BAND.min} to ${PACE_BAND.max} words per minute.`
        }
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${pacePct(PACE_BAND.min)}%`,
            width: `${pacePct(PACE_BAND.max) - pacePct(PACE_BAND.min)}%`,
            backgroundColor: "rgb(139 92 246 / 0.38)",
          }}
        />
        {ready ? (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-ink-850 transition-[left] duration-500 ease-out"
            style={{ left: `${pacePct(analysis.wpm)}%`, backgroundColor: LEVEL_FILL[reading.level] }}
          />
        ) : null}
      </div>
      <div aria-hidden="true" className="relative mt-1 h-3 text-[0.625rem] tabular-nums text-fg-subtle">
        <span className="absolute -translate-x-1/2" style={{ left: `${pacePct(PACE_BAND.min)}%` }}>
          {PACE_BAND.min}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${pacePct(PACE_BAND.max)}%` }}>
          {PACE_BAND.max}
        </span>
      </div>
    </div>
  );
}

// ── Fillers ────────────────────────────────────────────────────────────────

const FILLER_SCALE = 10;

export function FillerMeter({ analysis }: { analysis: TranscriptAnalysis }) {
  const reading = fillerReading(analysis.fillerRate, analysis.wordCount);
  const top = analysis.fillers.slice(0, 3);
  return (
    <div>
      <MeterHeader title="Fillers" value={analysis.wordCount ? analysis.fillerRate.toFixed(1) : "—"} unit="/ 100 words" reading={reading} />
      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "rgb(139 92 246 / 0.14)" }}
        role="img"
        aria-label={`${analysis.fillerCount} filler words, ${analysis.fillerRate.toFixed(1)} per 100 words. Under 3 is clean.`}
      >
        <span
          aria-hidden="true"
          className="block h-full rounded-full transition-[width,background-color] duration-500 ease-out"
          style={{
            width: `${Math.min(100, (analysis.fillerRate / FILLER_SCALE) * 100)}%`,
            backgroundColor: LEVEL_FILL[reading.level === "idle" ? "good" : reading.level],
          }}
        />
      </div>
      <p className="mt-1.5 h-4 truncate text-xs text-fg-subtle">
        {top.length ? (
          top.map((filler, index) => (
            <span key={filler.word}>
              {index > 0 ? " · " : ""}
              <span className="text-fg-muted">“{filler.word}”</span> ×{filler.count}
            </span>
          ))
        ) : (
          <span>No fillers yet</span>
        )}
      </p>
    </div>
  );
}

// ── Ownership (I vs we) ────────────────────────────────────────────────────

/** Part-to-whole split bar: "I" (violet) vs "we" (teal), separated by a 2px surface gap. */
export function OwnershipMeter({ analysis }: { analysis: TranscriptAnalysis }) {
  const { iStatements, weStatements } = analysis;
  const total = iStatements + weStatements;
  const reading = ownershipReading(iStatements, weStatements);
  const iShare = total > 0 ? iStatements / total : 0;
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">Ownership</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            “I” vs “we”
            {total > 0 ? <span className="tabular-nums text-fg"> · {Math.round(iShare * 100)}% I</span> : null}
          </p>
        </div>
        <ReadingPill reading={reading} />
      </div>
      <div
        className="relative mt-3"
        role="img"
        aria-label={`${iStatements} “I” statements and ${weStatements} “we” statements. Aim for mostly “I” when describing your own actions.`}
      >
        <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" style={{ backgroundColor: total ? undefined : "rgb(139 92 246 / 0.14)" }}>
          {total > 0 ? (
            <>
              {iStatements > 0 ? (
                <span
                  className="h-full transition-[flex-grow] duration-500 ease-out"
                  style={{ flexGrow: iStatements, flexBasis: 0, backgroundColor: SERIES_PRIMARY }}
                />
              ) : null}
              {weStatements > 0 ? (
                <span
                  className="h-full transition-[flex-grow] duration-500 ease-out"
                  style={{ flexGrow: weStatements, flexBasis: 0, backgroundColor: SERIES_COMPARE }}
                />
              ) : null}
            </>
          ) : null}
        </div>
        {/* 60% "I" target marker. */}
        <span aria-hidden="true" className="absolute -top-1 h-[1.125rem] w-px bg-fg-subtle" style={{ left: "60%" }} />
      </div>
      <div aria-hidden="true" className="mt-1.5 flex items-center justify-between text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SERIES_PRIMARY }} />I
          <span className="tabular-nums text-fg">{iStatements}</span>
        </span>
        <span className="text-[0.625rem] text-fg-subtle">target: 60% “I”</span>
        <span className="inline-flex items-center gap-1.5">
          we <span className="tabular-nums text-fg">{weStatements}</span>
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SERIES_COMPARE }} />
        </span>
      </div>
    </div>
  );
}

// ── STAR checklist ─────────────────────────────────────────────────────────

const SHORT_CUES: Record<StarPart, string> = {
  situation: "Team, product, stakes",
  task: "What you owned",
  action: "What you did, in first person",
  result: "Outcome, ideally a number",
};

export function StarChecklist({ analysis }: { analysis: TranscriptAnalysis }) {
  const count = starCount(analysis.star);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">STAR checklist</p>
        <span className="text-xs tabular-nums text-fg-muted">
          <span className="font-semibold text-fg">{count}</span>/4
        </span>
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-2" aria-label={`STAR structure: ${count} of 4 parts detected`}>
        {STAR_PARTS.map((part) => {
          const item = analysis.star[part];
          const lit = item.present;
          return (
            <li
              key={part}
              className={cn(
                "h-[5.25rem] rounded-xl border p-2.5 transition-colors duration-300",
                lit ? "border-success/40 bg-success/10" : "border-line bg-ink-900/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-300",
                    lit ? "bg-success text-ink-950 motion-safe:animate-fade-up" : "border border-line-strong text-fg-subtle",
                  )}
                >
                  {lit ? "✓" : STAR_COPY[part].letter}
                </span>
                <span className={cn("text-sm font-semibold", lit ? "text-fg" : "text-fg-muted")}>{STAR_COPY[part].label}</span>
                <span className="sr-only">{lit ? " detected" : " not yet"}</span>
              </div>
              <p className={cn("mt-1 line-clamp-2 text-xs leading-snug", lit ? "text-fg-muted" : "text-fg-subtle")}>
                {lit && item.evidence ? `“${item.evidence}”` : SHORT_CUES[part]}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-fg-subtle">
        <span aria-hidden="true">📈</span>
        {analysis.hasMetrics ? (
          <span className="truncate">
            Numbers: <span className="text-fg-muted">{analysis.metrics.slice(0, 3).join(", ")}</span>
          </span>
        ) : (
          <span>No numbers yet. Quantify the result.</span>
        )}
      </p>
    </div>
  );
}
