"use client";

import { useEffect, useRef, useState } from "react";
import { Banner, Button, Card } from "@/components/ui";
import { errorMessage, evaluateSpar } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { BehavioralQuestion, MockBehavioralRound as MockBehavioralResult } from "@/lib/types";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { formatClock } from "./MockCodingRound";

export const BEHAVIORAL_MINUTES = 5;
const MIN_WORDS = 25;
const MAX_CHARS = 20_000;

function joinText(base: string, addition: string): string {
  const extra = addition.trim();
  if (!extra) return base;
  return base.trim() ? `${base.trimEnd()} ${extra}` : extra;
}

/** One STAR story, typed or dictated, graded by the same Engineering Manager as /spar. */
export function MockBehavioralRound({ question, onDone }: { question: BehavioralQuestion; onDone: (result: MockBehavioralResult) => void }) {
  const speech = useSpeechRecognition();
  const { snapshot } = speech;
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef("");
  const startedAt = useRef(0);
  const budget = BEHAVIORAL_MINUTES * 60_000;

  useEffect(() => {
    startedAt.current = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  const listening = snapshot.status === "starting" || snapshot.status === "listening" || snapshot.status === "stopping";
  const live = listening ? joinText(baseRef.current, joinText(snapshot.finalText, snapshot.interimText)) : draft;
  const words = live.trim() ? live.trim().split(/\s+/).length : 0;
  const remaining = budget - elapsed;

  const toggleMic = async () => {
    if (listening) {
      setDraft(joinText(baseRef.current, await speech.stop()));
      return;
    }
    baseRef.current = draft;
    speech.reset();
    speech.start();
  };

  const submit = async () => {
    let answer = draft;
    if (listening) answer = joinText(baseRef.current, await speech.stop());
    answer = answer.trim().slice(0, MAX_CHARS);
    setDraft(answer);
    setGrading(true);
    setError(null);
    try {
      const durationMs = Math.min(30 * 60_000, Math.max(1_000, Math.round(performance.now() - startedAt.current)));
      const result = await evaluateSpar({ questionId: question.id, transcript: answer, durationMs });
      onDone({
        question: question.prompt,
        competency: question.competency,
        overall: result.feedback.overall,
        strengths: result.feedback.strengths.slice(0, 3),
        improvements: result.feedback.improvements.slice(0, 3),
      });
    } catch (failure) {
      setError(errorMessage(failure));
      setGrading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">Round 2 of 3 · Behavioral</p>
          <h2 className="mt-1 text-2xl font-semibold text-fg">{question.competency}</h2>
        </div>
        <span className={cn("rounded-full border px-3 py-1 font-mono text-sm tabular-nums", remaining < 60_000 ? "border-danger/50 text-danger" : "border-line text-fg-muted")}>
          {remaining > 0 ? `${formatClock(remaining)} left` : "Over time"}
        </span>
      </div>
      <Card>
        <p className="text-lg font-medium leading-relaxed text-fg">{question.prompt}</p>
        <p className="mt-2 text-sm text-fg-subtle">Answer in STAR form: situation, task, the actions you took, and a measurable result. Aim for about two minutes spoken.</p>
        <label htmlFor="mock-behavioral" className="sr-only">
          Your answer
        </label>
        <textarea
          id="mock-behavioral"
          value={live}
          onChange={(event) => setDraft(event.target.value)}
          readOnly={listening}
          disabled={grading}
          rows={9}
          maxLength={MAX_CHARS}
          placeholder="Type your story, or press the mic and tell it."
          className="mt-4 w-full resize-y rounded-xl border border-line bg-ink-900/60 px-4 py-3 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-subtle focus:border-synapse/60"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-fg-subtle">
            {speech.supported ? (
              <Button variant="secondary" onClick={() => void toggleMic()} disabled={grading}>
                {listening ? "■ Stop dictation" : "🎙 Dictate"}
              </Button>
            ) : null}
            <span className="tabular-nums">{words} words</span>
          </div>
          <Button onClick={() => void submit()} loading={grading} loadingLabel="The EM is grading" disabled={words < MIN_WORDS}>
            Submit answer
          </Button>
        </div>
        {words > 0 && words < MIN_WORDS ? <p className="mt-2 text-xs text-fg-subtle">At least {MIN_WORDS} words so there is a story to grade.</p> : null}
      </Card>
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </div>
  );
}
