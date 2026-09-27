"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { JudgeStatus, TestCaseResult } from "@synapse/core/judge";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { firstFailure, formatArgs, formatMs, formatValue, STATUS_LABELS, summarizeReport, totalRuntime, type JudgeMode, type JudgeOutcome } from "@/lib/judge";
import { plural } from "@/lib/format";

const STATUS_TONE: Record<JudgeStatus, { tone: PillTone; emoji: string }> = {
  accepted: { tone: "success", emoji: "✅" },
  wrong_answer: { tone: "danger", emoji: "❌" },
  runtime_error: { tone: "danger", emoji: "💥" },
  compile_error: { tone: "warning", emoji: "🧱" },
  timeout: { tone: "warning", emoji: "⏳" },
};

export interface JudgeResultsProps {
  outcome: JudgeOutcome | null;
  running: JudgeMode | null;
  /** First Python run: Pyodide is downloading. */
  loadingRuntime: boolean;
  params: readonly string[];
  visibleCount: number;
  totalCount: number;
  /** Whether the last submit was recorded (false in practice mode or for compile errors). */
  recordedNote?: ReactNode;
  /** Java / C++ / Go / TypeScript compile and run on the server instead of in the browser. */
  runsOnServer?: boolean;
}

type Tab = "tests" | "console";

export function JudgeResults({ outcome, running, loadingRuntime, params, visibleCount, totalCount, recordedNote, runsOnServer = false }: JudgeResultsProps) {
  const [tab, setTab] = useState<Tab>("tests");
  const baseId = useId();
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ tests: null, console: null });

  const report = outcome?.ok ? outcome.report : null;
  const logCount = useMemo(() => {
    if (!outcome?.ok) return 0;
    return outcome.setupLogs.length + outcome.report.cases.reduce((sum, testCase) => sum + testCase.logs.length, 0);
  }, [outcome]);

  const onTabKey = (event: KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next: Tab = tab === "tests" ? "console" : "tests";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabButton = (key: Tab, label: ReactNode) => (
    <button
      ref={(element) => {
        tabRefs.current[key] = element;
      }}
      id={`${baseId}-tab-${key}`}
      type="button"
      role="tab"
      aria-selected={tab === key}
      aria-controls={`${baseId}-panel-${key}`}
      tabIndex={tab === key ? 0 : -1}
      onClick={() => setTab(key)}
      onKeyDown={onTabKey}
      className={cn(
        "relative -mb-px inline-flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors",
        tab === key ? "border-axon text-fg" : "border-transparent text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );

  return (
    <section aria-label="Run results" className="flex min-h-[15rem] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4">
        <div role="tablist" aria-label="Results" className="flex items-center gap-5">
          {tabButton(
            "tests",
            <>
              Test results
              {report ? (
                <span className="rounded-full bg-ink-700 px-1.5 text-[0.7rem] tabular-nums text-fg-muted">
                  {report.passed}/{report.total}
                </span>
              ) : null}
            </>,
          )}
          {tabButton(
            "console",
            <>
              Console
              {logCount > 0 ? <span className="rounded-full bg-ink-700 px-1.5 text-[0.7rem] tabular-nums text-fg-muted">{logCount}</span> : null}
            </>,
          )}
        </div>
        {outcome?.ok ? (
          <span className="hidden text-xs text-fg-subtle sm:inline">
            {outcome.mode === "run" ? "Run · visible tests" : "Submit · all tests"} · {outcome.language === "python" ? "Python" : "JavaScript"}
          </span>
        ) : null}
      </div>

      {/* Screen-reader announcement of each finished run. */}
      <p role="status" aria-live="polite" className="sr-only">
        {running ? "" : report ? summarizeReport(report) : outcome && !outcome.ok ? outcome.message : ""}
      </p>

      <div className="relative flex-1">
        {running ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink-900/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-full border border-line-strong bg-ink-800 px-4 py-2 text-sm text-fg shadow-card">
              <Spinner size="sm" label="" />
              {loadingRuntime
                ? "Loading the Python runtime (first run only)…"
                : running === "run"
                  ? `Running ${plural(visibleCount, "visible test")}…`
                  : `Submitting: running all ${totalCount} tests…`}
            </div>
          </div>
        ) : null}

        <div
          id={`${baseId}-panel-tests`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-tests`}
          hidden={tab !== "tests"}
          className="h-full"
        >
          {!outcome ? (
            <IdleHint visibleCount={visibleCount} totalCount={totalCount} runsOnServer={runsOnServer} />
          ) : !outcome.ok ? (
            <div className="p-4">
              <div role="alert" className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                <p className="font-semibold text-warning">The judge couldn&apos;t run your code</p>
                <p className="mt-1 text-fg-muted">{outcome.message}</p>
              </div>
            </div>
          ) : (
            <ReportView outcome={outcome} params={params} recordedNote={recordedNote} />
          )}
        </div>

        <div
          id={`${baseId}-panel-console`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-console`}
          hidden={tab !== "console"}
          className="h-full"
        >
          <ConsoleView outcome={outcome} />
        </div>
      </div>
    </section>
  );
}

function IdleHint({ visibleCount, totalCount, runsOnServer }: { visibleCount: number; totalCount: number; runsOnServer: boolean }) {
  const hidden = totalCount - visibleCount;
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      <span aria-hidden="true" className="text-2xl">
        🧪
      </span>
      <p className="text-sm text-fg">
        <span className="font-semibold">Run</span> checks the {plural(visibleCount, "visible test")}.{" "}
        <span className="font-semibold">Submit</span> runs all {totalCount}
        {hidden > 0 ? `, including ${hidden} hidden` : ""}.
      </p>
      <p className="text-xs text-fg-subtle">
        {runsOnServer
          ? "Your code is compiled and run on the Prepr server in a throwaway folder. 10 s time limit per run."
          : "Code runs in a sandboxed worker in your browser and is never uploaded. 3 s time limit per run."}
      </p>
    </div>
  );
}

function ReportView({ outcome, params, recordedNote }: { outcome: Extract<JudgeOutcome, { ok: true }>; params: readonly string[]; recordedNote?: ReactNode }) {
  const { report } = outcome;
  const tone = STATUS_TONE[report.status];
  const runtime = totalRuntime(report);
  const failureIndex = firstFailure(report);
  const whole = report.status === "compile_error" || report.status === "timeout" || (report.message !== undefined && report.cases.every((c) => c.error === report.message));

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill tone={tone.tone} size="md" icon={tone.emoji}>
          {STATUS_LABELS[report.status]}
        </Pill>
        <span className="text-sm tabular-nums text-fg">
          {report.passed}/{report.total} passed
        </span>
        {runtime !== null && !whole ? <span className="text-sm tabular-nums text-fg-subtle">Σ {formatMs(runtime)}</span> : null}
        {recordedNote ? <span className="text-xs text-fg-subtle sm:ml-auto">{recordedNote}</span> : null}
      </div>

      {whole ? (
        <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-danger/30 bg-danger/5 p-3 font-mono text-[0.8125rem] leading-relaxed text-danger">
          {report.message}
        </pre>
      ) : (
        <div className="scrollbar-thin -mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">{summarizeReport(report)}</caption>
            <thead>
              <tr className="text-xs uppercase tracking-[0.1em] text-fg-subtle">
                <th scope="col" className="border-b border-line py-2 pr-3 font-semibold">
                  Test
                </th>
                <th scope="col" className="border-b border-line py-2 pr-3 font-semibold">
                  Input
                </th>
                <th scope="col" className="border-b border-line py-2 pr-3 font-semibold">
                  Expected
                </th>
                <th scope="col" className="border-b border-line py-2 pr-3 font-semibold">
                  Output
                </th>
                <th scope="col" className="border-b border-line py-2 text-right font-semibold">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {report.cases.map((testCase, position) => (
                <CaseRow key={testCase.index} testCase={testCase} params={params} reveal={!testCase.hidden || position === failureIndex} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ValueCell({ children, tone }: { children: ReactNode; tone?: "danger" | "success" | "muted" }) {
  return (
    <code
      className={cn(
        "scrollbar-thin block max-h-24 max-w-[18rem] overflow-auto whitespace-pre-wrap break-all font-mono text-[0.8125rem] leading-5",
        tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : tone === "muted" ? "text-fg-subtle" : "text-fg",
      )}
    >
      {children}
    </code>
  );
}

function CaseRow({ testCase, params, reveal }: { testCase: TestCaseResult; params: readonly string[]; reveal: boolean }) {
  const label = `Test ${testCase.index + 1}`;
  const cell = "border-b border-line/70 py-2.5 pr-3 align-top";
  return (
    <tr className={cn(!testCase.passed && "bg-danger/[0.04]")}>
      <th scope="row" className={cn(cell, "whitespace-nowrap font-medium")}>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={cn("grid h-5 w-5 place-items-center rounded-full text-xs font-bold", testCase.passed ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
            {testCase.passed ? "✓" : "✗"}
          </span>
          <span className="text-fg">{label}</span>
          <span className="sr-only">{testCase.passed ? "passed" : "failed"}</span>
          {testCase.hidden ? (
            <span className="rounded-md border border-line-strong px-1.5 text-[0.65rem] uppercase tracking-wider text-fg-subtle">hidden</span>
          ) : null}
        </span>
      </th>
      {reveal ? (
        <>
          <td className={cell}>
            <ValueCell>{formatArgs(params, testCase.args)}</ValueCell>
          </td>
          <td className={cell}>
            <ValueCell>{formatValue(testCase.expected)}</ValueCell>
          </td>
          <td className={cell}>
            {testCase.error ? (
              <ValueCell tone="danger">{testCase.error}</ValueCell>
            ) : (
              <ValueCell tone={testCase.passed ? "success" : "danger"}>{"actual" in testCase ? formatValue(testCase.actual) : "—"}</ValueCell>
            )}
          </td>
        </>
      ) : (
        <td className={cn(cell, "text-fg-subtle")} colSpan={3}>
          {testCase.passed ? "Hidden test passed" : "Hidden test failed"}
        </td>
      )}
      <td className={cn(cell, "whitespace-nowrap pr-0 text-right tabular-nums text-fg-muted")}>{formatMs(testCase.ms)}</td>
    </tr>
  );
}

function ConsoleView({ outcome }: { outcome: JudgeOutcome | null }) {
  if (!outcome?.ok) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center p-6 text-center text-sm text-fg-subtle">
        Output from <code className="mx-1 font-mono text-fg-muted">console.log</code> or <code className="mx-1 font-mono text-fg-muted">print</code> shows up here, per test.
      </div>
    );
  }
  const groups = [
    ...(outcome.setupLogs.length > 0 ? [{ key: "setup", title: "While loading", logs: outcome.setupLogs }] : []),
    ...outcome.report.cases.filter((testCase) => testCase.logs.length > 0).map((testCase) => ({ key: String(testCase.index), title: `Test ${testCase.index + 1}${testCase.hidden ? " (hidden)" : ""}`, logs: testCase.logs })),
  ];
  if (groups.length === 0) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center p-6 text-center text-sm text-fg-subtle">
        No console output this run. Add <code className="mx-1 font-mono text-fg-muted">{outcome.language === "python" ? "print(…)" : "console.log(…)"}</code> to debug.
      </div>
    );
  }
  return (
    <div className="scrollbar-thin max-h-80 space-y-3 overflow-auto p-4">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">{group.title}</p>
          <pre className="mt-1 whitespace-pre-wrap break-words rounded-xl border border-line bg-ink-900 p-3 font-mono text-[0.8125rem] leading-5 text-fg">{group.logs.join("\n")}</pre>
        </div>
      ))}
    </div>
  );
}
