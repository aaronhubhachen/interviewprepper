"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Banner, Button, Card, CardHeader, ChatBubble, Pill, PageHeader, Spinner } from "@/components/ui";
import { ApiError, errorMessage, fetchDesignQuestion, fetchDesignReport } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { DesignComponentKind, DesignDiagram, DesignNextResponse, DesignPrompt, DesignReport, DesignTurn } from "@/lib/types";
import { DiagramBoard } from "./DiagramBoard";

const INTERVIEW_MINUTES = 45;
const MAX_ANSWER = 6_000;
const EMPTY: DesignDiagram = { nodes: [], edges: [] };

type Stage = "pick" | "interview" | "report";

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function DesignStudio({
  prompts,
  components,
  phaseLabels,
}: {
  prompts: DesignPrompt[];
  components: Array<{ kind: DesignComponentKind; label: string }>;
  phaseLabels: Record<string, string>;
}) {
  const [stage, setStage] = useState<Stage>("pick");
  const [prompt, setPrompt] = useState<DesignPrompt | null>(null);
  const [diagram, setDiagram] = useState<DesignDiagram>(EMPTY);
  const [notes, setNotes] = useState("");
  const [asked, setAsked] = useState<DesignNextResponse[]>([]);
  const [turns, setTurns] = useState<DesignTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState<"question" | "report" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DesignReport | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<(() => void) | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  /** Latest board and notes, so Retry sends what is on screen now rather than what failed. */
  const boardRef = useRef({ diagram, notes });
  useEffect(() => {
    boardRef.current = { diagram, notes };
  }, [diagram, notes]);

  useEffect(() => {
    if (stage !== "interview") return;
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [asked.length, turns.length, thinking]);

  const request = useCallback(
    async (current: DesignPrompt, history: DesignTurn[], board: DesignDiagram, text: string, kind: "question" | "report") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      retryRef.current = () => void request(current, history, boardRef.current.diagram, boardRef.current.notes, kind);
      setError(null);
      setThinking(kind);
      const body = { promptId: current.id, diagram: board, notes: text, turns: history };
      try {
        if (kind === "question") {
          const next = await fetchDesignQuestion(body, { signal: controller.signal });
          setAsked((existing) => [...existing.slice(0, history.length), next]);
        } else {
          setReport(await fetchDesignReport(body, { signal: controller.signal }));
          setStage("report");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (failure) {
        if (failure instanceof ApiError && failure.code === "aborted") return;
        setError(errorMessage(failure));
      } finally {
        if (abortRef.current === controller) setThinking(null);
      }
    },
    [],
  );

  const start = (choice: DesignPrompt) => {
    setPrompt(choice);
    setDiagram(EMPTY);
    setNotes("");
    setAsked([]);
    setTurns([]);
    setDraft("");
    setReport(null);
    setStage("interview");
    startedAt.current = performance.now();
    setElapsed(0);
    void request(choice, [], EMPTY, "", "question");
  };

  const current = asked[turns.length];
  const total = asked[0]?.total ?? 6;
  const awaiting = Boolean(current) && !thinking;

  const answer = () => {
    if (!prompt || !current) return;
    const text = draft.trim().slice(0, MAX_ANSWER);
    if (!text) return;
    const history = [...turns, { phase: current.phase, question: current.question, answer: text }];
    setTurns(history);
    setDraft("");
    void request(prompt, history, diagram, notes, history.length >= total ? "report" : "question");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      answer();
    }
  };

  const remaining = INTERVIEW_MINUTES * 60_000 - elapsed;

  return (
    <>
      <PageHeader
        eyebrow="System design"
        title={stage === "pick" ? "Design it on the whiteboard" : (prompt?.title ?? "System design")}
        description={
          stage === "pick"
            ? "Draw the architecture. The interviewer reads your diagram."
            : undefined
        }
        actions={
          stage === "interview" ? (
            <div className="flex items-center gap-3">
              <span className={cn("rounded-full border px-3 py-1 font-mono text-sm tabular-nums", remaining < 5 * 60_000 ? "border-danger/50 text-danger" : "border-line text-fg-muted")}>
                {remaining > 0 ? `${clock(remaining)} left` : "Over time"}
              </span>
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setThinking(null);
                  setError(null);
                  setStage("pick");
                }}
                className="text-sm font-medium text-fg-subtle hover:text-fg"
              >
                ← Quit
              </button>
            </div>
          ) : null
        }
      />

      {stage === "pick" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {prompts.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => start(choice)}
              className="group flex flex-col rounded-card border border-line bg-ink-850/85 p-5 text-left shadow-card transition-[border-color,box-shadow,transform] hover:border-synapse/50 hover:shadow-glow motion-safe:hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-fg group-hover:text-synapse-soft">{choice.title}</span>
                <Pill tone={choice.difficulty === "hard" ? "danger" : "warning"}>{choice.difficulty}</Pill>
              </span>
              <span className="mt-2 text-sm text-fg-muted">{choice.prompt}</span>
            </button>
          ))}
        </div>
      ) : null}

      {stage === "interview" && prompt ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-4">
            <Card padded={false} className="h-[36rem] overflow-hidden">
              <DiagramBoard diagram={diagram} onChange={setDiagram} components={components} />
            </Card>
            <details className="rounded-card border border-line bg-ink-850/85 px-5 py-3">
              <summary className="cursor-pointer select-none text-sm font-semibold text-fg">Notes</summary>
              <label htmlFor="design-notes" className="sr-only">
                Notes
              </label>
              <textarea
                id="design-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value.slice(0, 8_000))}
                rows={6}
                placeholder={"POST /links {url} → {code}\nlinks(code PK, url, created_at)\n~40 writes/s, ~4k reads/s"}
                className="mt-3 w-full resize-y rounded-xl border border-line bg-ink-900/60 px-4 py-3 font-mono text-xs leading-relaxed text-fg outline-none placeholder:text-fg-subtle focus:border-synapse/60"
              />
            </details>
          </div>

          <Card padded={false} className="flex h-[36rem] flex-col overflow-hidden xl:sticky xl:top-20" aria-label="Interviewer">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-fg">Interviewer</p>
                <p className="text-xs text-fg-subtle">
                  {current ? `${phaseLabels[current.phase] ?? current.phase} · question ${current.number} of ${total}` : "Getting ready…"}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void request(prompt, turns, diagram, notes, "report")}
                disabled={turns.length === 0 || thinking !== null}
              >
                Finish & score
              </Button>
            </div>
            <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
              {asked.map((question, index) => (
                <div key={index} className="space-y-3">
                  <ChatBubble from="agent" name={index === 0 ? "Interviewer" : undefined}>
                    {question.reaction ? <span className="mb-1 block text-fg-muted">{question.reaction}</span> : null}
                    {question.question}
                  </ChatBubble>
                  {turns[index] ? <ChatBubble from="you">{turns[index]!.answer}</ChatBubble> : null}
                </div>
              ))}
              {thinking === "question" ? (
                <p className="flex items-center gap-2 text-xs text-fg-subtle">
                  <Spinner size="sm" label="" /> Looking at your board…
                </p>
              ) : null}
              {thinking === "report" ? (
                <p className="flex items-center gap-2 text-xs text-fg-subtle">
                  <Spinner size="sm" label="" /> The panel is scoring your design…
                </p>
              ) : null}
              {error ? (
                <Banner tone="danger" action={<Button size="sm" variant="secondary" onClick={() => retryRef.current?.()}>Retry</Button>}>
                  {error}
                </Banner>
              ) : null}
            </div>
            <div className="border-t border-line p-3">
              <label htmlFor="design-answer" className="sr-only">
                Your answer
              </label>
              <textarea
                id="design-answer"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                disabled={!awaiting}
                rows={4}
                maxLength={MAX_ANSWER}
                placeholder={awaiting ? "Talk it through… (⌘Enter to send)" : "Waiting for the interviewer…"}
                className="w-full resize-none rounded-xl border border-line bg-ink-900/60 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-synapse/60 disabled:opacity-60"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={answer} disabled={!awaiting || !draft.trim()}>
                  {turns.length + 1 >= total ? "Final answer" : "Answer"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {stage === "report" && report && prompt ? (
        <DesignReportView report={report} diagram={diagram} components={components} onAgain={() => start(prompt)} onPick={() => setStage("pick")} />
      ) : null}
    </>
  );
}

function DesignReportView({
  report,
  diagram,
  components,
  onAgain,
  onPick,
}: {
  report: DesignReport;
  diagram: DesignDiagram;
  components: Array<{ kind: DesignComponentKind; label: string }>;
  onAgain: () => void;
  onPick: () => void;
}) {
  return (
    <div className="grid gap-5 motion-safe:animate-fade-up" aria-label="Design feedback">
      <Card glow>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-6xl font-bold tracking-tight text-fg tabular-nums">{report.overall}</span>
            <span className="text-lg text-fg-subtle">/100</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-fg-muted">{report.summary}</p>
            {report.source === "heuristic" ? <p className="mt-2 text-xs text-fg-subtle">Offline scoring.</p> : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Scorecard" level={3} />
          <ul className="space-y-3">
            {report.dimensions.map((dimension) => (
              <li key={dimension.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-fg">{dimension.label}</span>
                  <span className="tabular-nums text-fg-muted">{dimension.score}</span>
                </div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden="true">
                  <span
                    className={cn("block h-full rounded-full", dimension.score >= 70 ? "bg-success" : dimension.score >= 50 ? "bg-synapse" : "bg-danger")}
                    style={{ width: `${dimension.score}%` }}
                  />
                </span>
                <p className="mt-1 text-xs text-fg-subtle">{dimension.note}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card padded={false} className="h-[22rem] overflow-hidden">
          <DiagramBoard diagram={diagram} components={components} readOnly />
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          { title: "Strengths", items: report.strengths, marker: "+", tone: "text-success" },
          { title: "Gaps", items: report.gaps, marker: "−", tone: "text-danger" },
          { title: "They'd ask next", items: report.followUps, marker: "?", tone: "text-synapse" },
        ].map((block) => (
          <Card key={block.title}>
            <CardHeader title={block.title} level={3} />
            <ul className="space-y-2 text-sm text-fg-muted">
              {block.items.length ? (
                block.items.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className={block.tone}>{block.marker}</span>
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-fg-subtle">Nothing noted.</li>
              )}
            </ul>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onAgain}>Try this prompt again</Button>
        <Button variant="secondary" onClick={onPick}>
          Pick another prompt
        </Button>
      </div>
    </div>
  );
}
