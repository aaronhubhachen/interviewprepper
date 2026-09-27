"use client";

import { LANGUAGE_EXTENSIONS, LANGUAGE_LABELS, isNativeLanguage, type CodeLanguage } from "@synapse/core/judge";
import { useCallback, useEffect, useRef, useState } from "react";
import { BotChat } from "@/components/bot/BotChat";
import { useAiAssistant } from "@/components/bot/useAiAssistant";
import { CodeEditor } from "@/components/practice/CodeEditor";
import { DiffReview, lineDiffStats } from "@/components/practice/DiffReview";
import { JudgeResults } from "@/components/practice/JudgeResults";
import { Markdown } from "@/components/practice/Markdown";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { JudgeMode, JudgeOutcome } from "@/lib/judge";
import { useJudge } from "@/lib/judge/useJudge";
import type { ClientProblem, MockCodingRound as MockCodingResult } from "@/lib/types";

export const CODING_MINUTES = 25;

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Timed coding round: the IDE, the judge, and (when allowed) the AI panel. Submits on time-out or finish. */
export function MockCodingRound({
  problem,
  language,
  aiAllowed,
  scope,
  onDone,
}: {
  problem: ClientProblem;
  language: CodeLanguage;
  aiAllowed: boolean;
  /** Unique per loop so the AI panel starts with an empty thread. */
  scope: string;
  onDone: (result: MockCodingResult) => void;
}) {
  const stage = problem.stages.code;
  const { judge, preloadPython, pythonStatus } = useJudge();
  const [code, setCode] = useState(stage.starter[language]);
  const codeRef = useRef(code);
  const [running, setRunning] = useState<JudgeMode | null>(null);
  const [outcome, setOutcome] = useState<JudgeOutcome | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [suggestion, setSuggestion] = useState<{ base: string; code: string } | null>(null);
  const [pending, setPending] = useState<{ submit: { passed: number; total: number; status: string }; minutesUsed: number; reviewAi: boolean } | null>(null);
  const startedAt = useRef(0);
  const lastSubmit = useRef<{ passed: number; total: number; status: string } | null>(null);
  const finished = useRef(false);
  const getCode = useCallback(() => codeRef.current, []);
  const ai = useAiAssistant({ problemId: problem.id, language, getCode, scope });
  const budget = CODING_MINUTES * 60_000;

  useEffect(() => {
    startedAt.current = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (language === "python") preloadPython();
  }, [language, preloadPython]);

  const updateCode = (next: string) => {
    ai.noteEdit(codeRef.current, next);
    codeRef.current = next;
    setCode(next);
  };

  const inflight = useRef<Promise<JudgeOutcome> | null>(null);

  const execute = async (mode: JudgeMode): Promise<JudgeOutcome> => {
    // One judge run at a time: a second call would come back "busy" and clobber the first.
    if (inflight.current) return inflight.current;
    setRunning(mode);
    const run = judge({ stage, mode, language, code: codeRef.current, problemId: problem.id });
    inflight.current = run;
    const result = await run.finally(() => {
      inflight.current = null;
    });
    setRunning(null);
    setOutcome(result);
    if (result.ok) {
      ai.noteRun(mode, result.report.passed, result.report.total, result.report.status);
      if (mode === "submit") lastSubmit.current = { passed: result.report.passed, total: result.report.total, status: result.report.status };
    }
    return result;
  };

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setFinishing(true);
    // A submit still running when time runs out (or Finish is pressed) is the one that counts.
    if (inflight.current) await inflight.current;
    if (!lastSubmit.current) await execute("submit");
    const submit = lastSubmit.current ?? { passed: 0, total: stage.tests.length, status: "not_submitted" };
    const minutesUsed = Math.round(((performance.now() - startedAt.current) / 60_000) * 10) / 10;
    const reviewAi = aiAllowed && ai.messages.some((message) => message.role === "user");
    if (reviewAi) ai.review();
    setPending({ submit, minutesUsed, reviewAi });
    // execute is recreated every render; the refs it reads are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiAllowed, ai]);

  // Hand the result back once the submit and, when the candidate used the AI, its review have settled.
  useEffect(() => {
    if (!pending || ai.reviewing) return;
    if (pending.reviewAi && !ai.report && !ai.reviewError) return;
    setPending(null);
    onDone({
      problemTitle: problem.title,
      difficulty: problem.difficulty,
      language: LANGUAGE_LABELS[language],
      passed: pending.submit.passed,
      total: pending.submit.total,
      status: pending.submit.status,
      minutesUsed: pending.minutesUsed,
      minutesAllowed: CODING_MINUTES,
      aiAllowed,
      aiUse: ai.report ? { overall: ai.report.overall, summary: ai.report.summary } : null,
    });
  }, [ai.report, ai.reviewError, ai.reviewing, aiAllowed, language, onDone, pending, problem.difficulty, problem.title]);

  useEffect(() => {
    if (elapsed >= budget && !finished.current) void finish();
  }, [budget, elapsed, finish]);

  const remaining = budget - elapsed;
  const visibleCount = stage.tests.filter((test) => !test.hidden).length || stage.tests.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">Round 1 of 3 · Coding{aiAllowed ? " · AI allowed" : " · no AI"}</p>
          <h2 className="mt-1 text-2xl font-semibold text-fg">{problem.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full border px-3 py-1 font-mono text-sm tabular-nums", remaining < 5 * 60_000 ? "border-danger/50 text-danger" : "border-line text-fg-muted")}>
            {formatClock(remaining)} left
          </span>
          <Button onClick={() => void finish()} loading={finishing} loadingLabel="Wrapping up" disabled={running !== null && !finishing}>
            Finish coding round
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-4", aiAllowed && "xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]")}>
        <div className="min-w-0 space-y-4">
          <details className="rounded-card border border-line bg-ink-850/85 px-5 py-4" open>
            <summary className="cursor-pointer select-none text-sm font-semibold text-fg">Problem</summary>
            <div className="mt-3">
              <Markdown source={problem.statement} />
            </div>
          </details>
          <Card padded={false} className="overflow-hidden">
            {suggestion ? (
              <DiffReview
                original={suggestion.base}
                suggestion={suggestion.code}
                language={language}
                height="clamp(18rem, 46vh, 30rem)"
                onAccept={(accepted) => {
                  ai.noteAccept(accepted, lineDiffStats(suggestion.base, accepted));
                  updateCode(accepted);
                  setSuggestion(null);
                }}
                onReject={() => {
                  ai.noteReject(lineDiffStats(suggestion.base, suggestion.code));
                  setSuggestion(null);
                }}
              />
            ) : (
              <CodeEditor
                value={code}
                language={language}
                onChange={updateCode}
                onRun={() => void execute("run")}
                onSubmit={() => void execute("submit")}
                ariaLabel={`${LANGUAGE_LABELS[language]} solution for ${problem.title}`}
                height="clamp(18rem, 46vh, 30rem)"
                path={`file:///synapse/mock/${problem.id}/solution.${LANGUAGE_EXTENSIONS[language]}`}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <p className="text-xs text-fg-subtle">Submit as often as you like; the last submit counts.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => void execute("run")} loading={running === "run"} disabled={running !== null || finishing}>
                  Run
                </Button>
                <Button onClick={() => void execute("submit")} loading={running === "submit"} disabled={running !== null || finishing}>
                  Submit
                </Button>
              </div>
            </div>
            <div className="border-t border-line bg-ink-900/40">
              <JudgeResults
                outcome={outcome}
                running={running}
                loadingRuntime={language === "python" && pythonStatus === "loading" && running !== null}
                params={stage.params}
                visibleCount={visibleCount}
                totalCount={stage.tests.length}
                runsOnServer={isNativeLanguage(language)}
              />
            </div>
          </Card>
        </div>
        {aiAllowed ? (
          <div className="h-[40rem] overflow-hidden rounded-card border border-line xl:sticky xl:top-20">
            <BotChat
              docked
              messages={ai.messages}
              sending={ai.sending}
              error={ai.error}
              offline={ai.offline}
              language={language}
              onSend={ai.send}
              onApply={(snippet) => setSuggestion({ base: codeRef.current, code: snippet })}
              onCopy={ai.noteCopy}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
