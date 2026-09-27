"use client";

import { SPAR_AXES, type SparAxis, type SparScores, type StarPart } from "@synapse/core/transcript";
import { useMemo, useState, type ReactNode, type Ref } from "react";
import { Button, Card, CardHeader, ChatBubble, Pill, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatClock, formatRelative, plural } from "@/lib/format";
import { countFillerSegments, segmentFillers } from "@/lib/voice/fillers";
import { scoreBand, STAR_COPY, STAR_PARTS } from "@/lib/voice/metrics";
import type { Comparison, SparResultView } from "@/lib/voice/sessions";
import type { SpeechSynthesisControls } from "@/lib/voice/useSpeechSynthesis";
import { INTERVIEWER, InterviewerAvatar } from "./InterviewerPanel";
import { LEVEL_ICON, LEVEL_TONE, SERIES_COMPARE, SERIES_PRIMARY } from "./levels";
import { RadarChart, RadarLegend, type RadarSeries } from "./RadarChart";
import { HighlightedText } from "./Transcript";

export interface SparResultsProps {
  view: SparResultView;
  comparison: Comparison | null;
  /** Round 1 only: start round 2 on the EM's follow-up. */
  onAnswerFollowUp: (() => void) | null;
  /** Answer the same question again (null when the question is no longer in the bank). */
  onRetry: (() => void) | null;
  onNewQuestion: () => void;
  tts: SpeechSynthesisControls;
  /** Just evaluated (vs. opened from history). */
  fresh: boolean;
  now: number;
  headingRef?: Ref<HTMLHeadingElement>;
}

function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const glyph = direction === "up" ? "▲" : direction === "down" ? "▼" : "■";
  const tone = direction === "up" ? "text-success" : direction === "down" ? "text-danger" : "text-fg-subtle";
  const text = `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)}`;
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums font-medium", tone)}>
      <span aria-hidden="true" className="text-[0.6rem]">
        {glyph}
      </span>
      {text}
      {suffix ? <span className="font-normal text-fg-muted">{suffix}</span> : null}
    </span>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <span aria-hidden="true" className="hidden h-1.5 w-14 overflow-hidden rounded-full @sm:inline-block" style={{ backgroundColor: "rgb(249 115 22 / 0.14)" }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
    </span>
  );
}

/** The radar's table-view twin: every value readable without hovering; rows and axes highlight together. */
function ScoreTable({
  scores,
  primaryLabel,
  comparison,
  activeAxis,
  onActiveAxisChange,
}: {
  scores: SparScores;
  primaryLabel: string;
  comparison: Comparison | null;
  activeAxis: SparAxis | null;
  onActiveAxisChange: (axis: SparAxis | null) => void;
}) {
  return (
    <table className="mt-3 w-full text-sm">
      <caption className="sr-only">Scores by axis, 0 to 100</caption>
      <thead>
        <tr className="text-xs text-fg-subtle">
          <th scope="col" className="py-1.5 text-left font-medium">
            Axis
          </th>
          <th scope="col" className="py-1.5 text-right font-medium">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES_PRIMARY }} />
              {primaryLabel}
            </span>
          </th>
          {comparison ? (
            <>
              <th scope="col" className="py-1.5 text-right font-medium">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES_COMPARE }} />
                  {comparison.label}
                </span>
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                Change
              </th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {SPAR_AXES.map((axis) => {
          const value = scores[axis.key];
          const before = comparison?.scores[axis.key];
          return (
            <tr
              key={axis.key}
              onPointerEnter={() => onActiveAxisChange(axis.key)}
              onPointerLeave={() => onActiveAxisChange(null)}
              className={cn("border-t border-line transition-colors duration-150", activeAxis === axis.key && "bg-ink-700/50")}
            >
              <th scope="row" className="py-2 pl-1 pr-2 text-left font-normal text-fg-muted">
                {axis.label}
              </th>
              <td className="py-2 text-right">
                <span className="inline-flex items-center gap-2">
                  <MiniBar value={value} color={SERIES_PRIMARY} />
                  <span className="w-7 font-semibold tabular-nums text-fg">{value}</span>
                </span>
              </td>
              {comparison && before !== undefined ? (
                <>
                  <td className="py-2 text-right tabular-nums text-fg-muted">{before}</td>
                  <td className="py-2 pl-2 pr-1 text-right">
                    <Delta value={value - before} />
                  </td>
                </>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-ink-900/60 px-3 py-2.5">
      <dt className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-lg font-semibold text-fg" title={hint}>
        {value}
      </dd>
    </div>
  );
}

const STAR_ORDER: readonly StarPart[] = STAR_PARTS;

export function SparResults({
  view,
  comparison,
  onAnswerFollowUp,
  onRetry,
  onNewQuestion,
  tts,
  fresh,
  now,
  headingRef,
}: SparResultsProps) {
  const { toast } = useToast();
  const [activeAxis, setActiveAxis] = useState<SparAxis | null>(null);
  const { feedback } = view;
  const { analysis } = feedback;
  const band = scoreBand(feedback.overall);
  const segments = useMemo(() => segmentFillers(view.transcript), [view.transcript]);
  const primaryLabel = view.round === 2 ? "Follow-up" : "This answer";

  const series: RadarSeries[] = [
    { key: "primary", label: primaryLabel, scores: feedback.scores, role: "primary" },
    ...(comparison ? [{ key: "compare", label: comparison.label, scores: comparison.scores, role: "compare" as const }] : []),
  ];

  const copyOpening = async () => {
    try {
      await navigator.clipboard.writeText(feedback.rewrittenOpening);
      toast({ title: "Opening copied", tone: "success", duration: 2500 });
    } catch {
      toast({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", tone: "warning" });
    }
  };

  const speakButton = (text: string, label: string) =>
    tts.supported ? (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => (tts.speaking ? tts.cancel() : tts.speak(text))}
        leftIcon={<span aria-hidden="true">{tts.speaking ? "⏹" : "🔊"}</span>}
        aria-label={tts.speaking ? "Stop audio" : label}
      >
        {tts.speaking ? "Stop" : "Hear it"}
      </Button>
    ) : null;

  const asked = view.round === 2 && view.followUpOf ? view.followUpOf : view.questionPrompt;

  return (
    <div className="space-y-6 motion-safe:animate-fade-up">
      <Card glow padded={false} aria-labelledby="results-title">
        {/* Desktop: info + score table on the left, radar spanning both rows on the right. Mobile: info, radar, table. */}
        <div className="grid gap-x-8 gap-y-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr]">
          <div className="@container flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={view.round === 2 ? "cyan" : "violet"}>{view.round === 2 ? "Round 2 · Follow-up" : "Round 1"}</Pill>
              {view.competency ? <Pill>{view.competency}</Pill> : null}
              <Pill
                tone={feedback.source === "llm" ? "cyan" : "neutral"}
                icon={feedback.source === "llm" ? "🤖" : "⚙️"}
                title={
                  feedback.source === "llm"
                    ? "Scored by the AI interviewer"
                    : "No model was available (or it timed out), so this was scored with transcript heuristics"
                }
              >
                {feedback.source === "llm" ? "AI interviewer" : "Offline scoring"}
              </Pill>
            </div>
            <h2
              id="results-title"
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 scroll-mt-24 text-2xl font-semibold text-fg outline-none sm:text-3xl"
            >
              {fresh ? `${INTERVIEWER.name}'s feedback` : "Session replay"}
            </h2>
            <p className="mt-1 text-xs text-fg-subtle">
              {fresh ? "Just now" : formatRelative(view.createdAt, now)} · {formatClock(view.durationMs)} · {plural(analysis.wordCount, "word")}
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">{asked}</p>
            {view.round === 2 ? (
              <p className="mt-1 line-clamp-1 text-xs text-fg-subtle">Following up on: {view.questionPrompt}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">Overall</p>
                <p className="flex items-baseline gap-1">
                  <span className="font-sans text-6xl font-semibold tracking-tight text-fg">{feedback.overall}</span>
                  <span className="text-lg text-fg-subtle">/100</span>
                </p>
              </div>
              <div className="flex flex-col items-start gap-1.5 pb-2">
                <Pill tone={LEVEL_TONE[band.level]} icon={LEVEL_ICON[band.level]} size="md">
                  {band.label}
                </Pill>
                {comparison ? (
                  <span className="text-sm">
                    <Delta value={feedback.overall - comparison.overall} suffix={` vs ${comparison.label.toLowerCase()}`} />
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-2.5 @md:grid-cols-4">
              <Stat label="Pace" value={analysis.wpm ? `${analysis.wpm} wpm` : "—"} />
              <Stat label="Fillers" value={`${analysis.fillerRate.toFixed(1)}`} hint={`${analysis.fillerCount} filler words, per 100 words`} />
              <Stat
                label="I vs we"
                value={analysis.iStatements + analysis.weStatements > 0 ? `${Math.round(analysis.ownershipRatio * 100)}% I` : "—"}
                hint={`${analysis.iStatements} “I”, ${analysis.weStatements} “we”`}
              />
              <Stat label="Numbers" value={analysis.metrics.length ? analysis.metrics.length : "None"} hint={analysis.metrics.join(", ") || undefined} />
            </dl>
          </div>

          <div className="flex min-w-0 flex-col justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-fg-muted">Score profile</h3>
              <RadarLegend series={series} />
            </div>
            <RadarChart
              key={view.sessionId}
              series={series}
              activeAxis={activeAxis}
              onActiveAxisChange={setActiveAxis}
              label="Feedback scores out of 100"
              className="mx-auto mt-2 w-full max-w-lg"
            />
            <p className="mt-1 text-center text-xs text-fg-subtle">Rings mark 25, 50, 75 and 100. Hover or use the arrow keys to compare.</p>
          </div>

          <div className="@container min-w-0 lg:col-start-1 lg:row-start-2">
            <h3 className="sr-only">Scores by axis</h3>
            <ScoreTable
              scores={feedback.scores}
              primaryLabel={primaryLabel}
              comparison={comparison}
              activeAxis={activeAxis}
              onActiveAxisChange={setActiveAxis}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card aria-labelledby="strengths-title">
          <CardHeader eyebrow="Strengths" title={<span id="strengths-title">What worked</span>} level={3} />
          <ul className="space-y-3">
            {feedback.strengths.map((item, index) => (
              <li key={`${index}-${item}`} className="flex gap-3 text-[0.95rem] leading-relaxed text-fg">
                <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/15 text-xs text-success">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card aria-labelledby="improvements-title">
          <CardHeader eyebrow="Improvements" title={<span id="improvements-title">Tighten next time</span>} level={3} />
          <ol className="space-y-3">
            {feedback.improvements.map((item, index) => (
              <li key={`${index}-${item}`} className="flex gap-3 text-[0.95rem] leading-relaxed text-fg">
                <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-warning/15 text-xs font-semibold text-warning">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card aria-labelledby="star-title">
        <CardHeader
          eyebrow="Structure"
          title={<span id="star-title">STAR breakdown</span>}
          description={`What ${INTERVIEWER.name} heard for each part of the story.`}
          level={3}
        />
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STAR_ORDER.map((part) => {
            const item = feedback.starBreakdown[part];
            return (
              <li
                key={part}
                className={cn("flex flex-col rounded-2xl border p-4", item.present ? "border-success/35 bg-success/5" : "border-warning/35 bg-warning/5")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full text-sm font-bold",
                        item.present ? "bg-success text-ink-950" : "border border-warning/50 text-warning",
                      )}
                    >
                      {STAR_COPY[part].letter}
                    </span>
                    <span className="font-semibold text-fg">{STAR_COPY[part].label}</span>
                  </span>
                  <Pill tone={item.present ? "success" : "warning"} icon={item.present ? "✓" : "!"}>
                    {item.present ? "Covered" : "Missing"}
                  </Pill>
                </div>
                {item.evidence ? (
                  <blockquote className="mt-3 border-l-2 border-line-strong pl-3 text-sm italic leading-relaxed text-fg-muted">
                    “{item.evidence}”
                  </blockquote>
                ) : null}
                {item.note ? <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.note}</p> : null}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="opening-title">
          <CardHeader
            eyebrow="Rewrite"
            title={<span id="opening-title">A tighter opening</span>}
            description="Say this out loud a couple of times, then answer again."
            level={3}
            actions={
              <>
                {speakButton(feedback.rewrittenOpening, "Hear the rewritten opening")}
                <Button size="sm" variant="ghost" onClick={() => void copyOpening()} leftIcon={<span aria-hidden="true">📋</span>}>
                  Copy
                </Button>
              </>
            }
          />
          <blockquote className="rounded-2xl border border-synapse/30 bg-synapse/10 p-4 text-[1.02rem] leading-relaxed text-fg">
            “{feedback.rewrittenOpening}”
          </blockquote>
        </Card>

        <Card glow={Boolean(onAnswerFollowUp)} aria-labelledby="followup-title">
          <CardHeader
            eyebrow={view.round === 1 ? "Round 2" : "Next probe"}
            title={<span id="followup-title">{view.round === 1 ? `${INTERVIEWER.name}'s follow-up` : `${INTERVIEWER.name} would ask next`}</span>}
            level={3}
            actions={speakButton(feedback.followUp, "Hear the follow-up question")}
          />
          <div className="flex items-end gap-3">
            <InterviewerAvatar size="sm" speaking={false} />
            <ChatBubble from="agent" name={INTERVIEWER.name} className="min-w-0 flex-1">
              {feedback.followUp}
            </ChatBubble>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {onAnswerFollowUp ? (
              <Button onClick={onAnswerFollowUp} leftIcon={<span aria-hidden="true">🎙️</span>}>
                Answer the follow-up
              </Button>
            ) : (
              <p className="text-sm text-fg-subtle">Two rounds done. Retry the question to see the scores move.</p>
            )}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-semibold text-fg">Your transcript</span>
              <span className="ml-2 text-sm text-fg-subtle">
                {plural(analysis.wordCount, "word")} · {plural(countFillerSegments(segments), "filler")} highlighted
              </span>
            </span>
            <span aria-hidden="true" className="text-fg-subtle transition-transform duration-200 group-open:rotate-180">
              ▾
            </span>
          </summary>
          <p className="whitespace-pre-wrap break-words border-t border-line px-5 py-4 text-[0.95rem] leading-relaxed text-fg sm:px-6">
            <HighlightedText segments={segments} />
          </p>
        </details>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {onAnswerFollowUp ? (
          <Button size="lg" onClick={onAnswerFollowUp} leftIcon={<span aria-hidden="true">🎙️</span>}>
            Answer the follow-up
          </Button>
        ) : null}
        {onRetry ? (
          <Button size="lg" variant="secondary" onClick={onRetry} leftIcon={<span aria-hidden="true">🔁</span>}>
            Retry this question
          </Button>
        ) : null}
        <Button size="lg" variant="ghost" onClick={onNewQuestion}>
          Pick another question
        </Button>
      </div>
    </div>
  );
}
