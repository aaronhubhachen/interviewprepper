"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JudgeLanguage } from "@synapse/core/content";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";
import type { JudgeMode, JudgeOutcome } from "@/lib/judge";
import { useJudge } from "@/lib/judge/useJudge";
import { shortcutLabels, useIsApplePlatform } from "@/lib/keyboard";
import type { ClientProblem } from "@/lib/types";
import { ConfirmButton, Segmented, StageTimer } from "./bits";
import { CodeEditor } from "./CodeEditor";
import { JudgeResults } from "./JudgeResults";
import { canGiveUp, codeStorageKey, LANGUAGE_STORAGE_KEY, safeStorage, STAGE_META, type CodeStageState } from "./session";

const LANGUAGES: ReadonlyArray<{ value: JudgeLanguage; label: string }> = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
];

const EDITOR_HEIGHT = "clamp(20rem, 52vh, 34rem)";
const SAVE_DEBOUNCE_MS = 350;

export interface CodeStagePanelProps {
  problem: ClientProblem;
  state: CodeStageState;
  /** Stage already completed: runs and submits are free practice, nothing is recorded. */
  practiceMode: boolean;
  /** An attempt is being saved (disables Submit / Give up). */
  saving: boolean;
  saveError: string | null;
  notes: { invariant: string | null; edgeCase: string | null };
  getElapsed: () => number;
  onLanguage: (language: JudgeLanguage) => void;
  /** Every finished Run / Submit (the parent records submits). */
  onJudged: (outcome: JudgeOutcome) => void;
  onGiveUp: () => void;
  onRetrySave: () => void;
  /** Offered when an accepted submit / give-up could not be saved. */
  onSkipSave?: () => void;
  onShowSummary?: () => void;
}

const storage = safeStorage("local");

function loadCode(problem: ClientProblem, language: JudgeLanguage): string {
  return storage.getItem(codeStorageKey(problem.id, language)) ?? problem.stages.code.starter[language];
}

export function CodeStagePanel({
  problem,
  state,
  practiceMode,
  saving,
  saveError,
  notes,
  getElapsed,
  onLanguage,
  onJudged,
  onGiveUp,
  onRetrySave,
  onSkipSave,
  onShowSummary,
}: CodeStagePanelProps) {
  const stage = problem.stages.code;
  const language = state.language;
  const { judge, preloadPython, pythonStatus, pythonError } = useJudge();
  const [code, setCode] = useState<Record<JudgeLanguage, string>>(() => ({
    javascript: loadCode(problem, "javascript"),
    python: loadCode(problem, "python"),
  }));
  const [running, setRunning] = useState<JudgeMode | null>(null);
  const [outcome, setOutcome] = useState<JudgeOutcome | null>(null);
  const [recordedNote, setRecordedNote] = useState<string | null>(null);
  const saveTimers = useRef<Partial<Record<JudgeLanguage, number>>>({});
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const visibleCount = useMemo(() => stage.tests.filter((test) => !test.hidden).length || stage.tests.length, [stage.tests]);
  const totalCount = stage.tests.length;

  // Warm Pyodide as soon as Python is the active language.
  useEffect(() => {
    if (language === "python") preloadPython();
  }, [language, preloadPython]);

  // Flush pending saves on unmount.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const lang of Object.keys(timers) as JudgeLanguage[]) {
        window.clearTimeout(timers[lang]);
        storage.setItem(codeStorageKey(problem.id, lang), codeRef.current[lang]);
      }
    };
  }, [problem.id]);

  const updateCode = useCallback(
    (next: string) => {
      codeRef.current = { ...codeRef.current, [language]: next };
      setCode((current) => ({ ...current, [language]: next }));
      window.clearTimeout(saveTimers.current[language]);
      saveTimers.current[language] = window.setTimeout(() => {
        storage.setItem(codeStorageKey(problem.id, language), next);
        delete saveTimers.current[language];
      }, SAVE_DEBOUNCE_MS);
    },
    [language, problem.id],
  );

  const resetCode = () => {
    window.clearTimeout(saveTimers.current[language]);
    delete saveTimers.current[language];
    storage.removeItem(codeStorageKey(problem.id, language));
    codeRef.current = { ...codeRef.current, [language]: stage.starter[language] };
    setCode((current) => ({ ...current, [language]: stage.starter[language] }));
  };

  const switchLanguage = (next: JudgeLanguage) => {
    storage.setItem(LANGUAGE_STORAGE_KEY, next);
    onLanguage(next);
  };

  const execute = useCallback(
    async (mode: JudgeMode) => {
      if (running) return;
      if (mode === "submit" && saving) return;
      setRunning(mode);
      const result = await judge({ stage, mode, language, code: codeRef.current[language] });
      setRunning(null);
      setOutcome(result);
      if (mode === "run") setRecordedNote("Run is free practice: only Submit is recorded");
      else if (practiceMode) setRecordedNote("Practice mode: not recorded");
      else if (result.ok && result.report.status === "compile_error") setRecordedNote("Compile errors don't count as a submission");
      else setRecordedNote(null);
      onJudged(result);
    },
    [judge, language, onJudged, practiceMode, running, saving, stage],
  );

  const onRun = useCallback(() => void execute("run"), [execute]);
  const onSubmit = useCallback(() => void execute("submit"), [execute]);

  // Shortcuts when focus is elsewhere in the panel (Monaco handles its own).
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.defaultPrevented) return;
      if (!panelRef.current || panelRef.current.closest("[hidden]")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(".monaco-editor") || target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return;
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      } else if (event.key === "'") {
        event.preventDefault();
        onRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRun, onSubmit]);

  // Monaco binds CtrlCmd (⌘ on macOS) and toggles Tab focus with Ctrl+Shift+M there: label what actually works.
  const keys = shortcutLabels(useIsApplePlatform());
  const pythonLoading = language === "python" && pythonStatus === "loading";
  const giveUpAllowed = running === null && canGiveUp(state, saving);
  const meta = STAGE_META.code;
  const submitsLabel =
    state.submits === 0 ? "No submissions yet" : `${state.submits} submission${state.submits === 1 ? "" : "s"}${state.failedSubmits ? ` · ${state.failedSubmits} failed` : ""}`;

  return (
    <div ref={panelRef} className="space-y-4">
      <Card glow padded={false} as="article" aria-labelledby="code-stage-heading" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">
              <span aria-hidden="true">{meta.icon} </span>
              Stage 3 of 3 · Code{practiceMode ? " · practice" : ""}
            </p>
            <h2 id="code-stage-heading" tabIndex={-1} className="mt-1 text-xl font-semibold text-fg outline-none">
              Implement <code className="font-mono text-[0.95em] text-axon-soft">{stage.functionName}({stage.params.join(", ")})</code>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!practiceMode ? <StageTimer getElapsed={getElapsed} /> : null}
            <Segmented label="Language" value={language} options={LANGUAGES} onChange={switchLanguage} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-line bg-ink-900/60 px-4 py-2 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-2" aria-live="polite">
            <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", runtimeDot(language, pythonStatus))} />
            {runtimeLabel(language, pythonStatus)}
          </span>
          <span className="hidden items-center gap-1.5 2xl:inline-flex">
            <Kbd>{keys.mod}</Kbd>
            <Kbd>&apos;</Kbd> run
            <span className="mx-1 text-fg-faint" aria-hidden="true">
              ·
            </span>
            <Kbd>{keys.mod}</Kbd>
            <Kbd>Enter</Kbd> submit
            <span className="mx-1 text-fg-faint" aria-hidden="true">
              ·
            </span>
            {keys.tabFocusKeys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}{" "}
            Tab moves focus
          </span>
          <ConfirmButton
            size="sm"
            confirmLabel="Reset to starter"
            prompt="Discard your changes?"
            onConfirm={resetCode}
            disabled={code[language] === stage.starter[language]}
            leftIcon={<span aria-hidden="true">↺</span>}
            className="h-7"
          >
            Reset
          </ConfirmButton>
        </div>

        <CodeEditor
          value={code[language]}
          language={language}
          onChange={updateCode}
          onRun={onRun}
          onSubmit={onSubmit}
          ariaLabel={`${language === "python" ? "Python" : "JavaScript"} solution for ${problem.title}. Press ${keys.tabFocusSpoken} to let Tab move focus.`}
          height={EDITOR_HEIGHT}
          path={`file:///synapse/${problem.id}/solution.${language === "python" ? "py" : "js"}`}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-xs text-fg-subtle">{practiceMode ? "Practice mode: runs are not recorded." : submitsLabel}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={onRun}
              loading={running === "run"}
              loadingLabel="Running visible tests"
              disabled={running !== null}
              aria-keyshortcuts={keys.aria("'")}
              title={`Run the visible tests (${keys.combo("'")})`}
              leftIcon={
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                  <path d="M3 1.8v8.4a.6.6 0 0 0 .92.5l6.5-4.2a.6.6 0 0 0 0-1L3.92 1.3A.6.6 0 0 0 3 1.8Z" />
                </svg>
              }
            >
              Run
            </Button>
            <Button
              onClick={onSubmit}
              loading={running === "submit" || saving}
              loadingLabel={saving ? "Saving your attempt" : "Submitting"}
              disabled={running !== null || saving}
              aria-keyshortcuts={keys.aria("Enter")}
              title={`Run every test, hidden ones included (${keys.combo("Enter")})`}
            >
              Submit
            </Button>
          </div>
        </div>

        {pythonError && language === "python" ? (
          <div className="px-4 pb-3">
            <Banner tone="warning" title="Python runtime unavailable">
              {pythonError} JavaScript still works offline.
            </Banner>
          </div>
        ) : null}

        <div className="border-t border-line bg-ink-900/40">
          <JudgeResults
            outcome={outcome}
            running={running}
            loadingRuntime={pythonLoading && running !== null}
            params={stage.params}
            visibleCount={visibleCount}
            totalCount={totalCount}
            recordedNote={recordedNote ?? undefined}
          />
        </div>
      </Card>

      {saveError ? (
        <Banner
          tone="danger"
          title="Couldn't save your submission"
          action={
            <>
              {onSkipSave ? (
                <Button size="sm" variant="ghost" onClick={onSkipSave}>
                  Finish without saving
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={onRetrySave}>
                Retry
              </Button>
            </>
          }
        >
          {saveError}
        </Banner>
      ) : null}

      <div className="flex flex-col gap-3">
        {notes.invariant || notes.edgeCase ? (
          <details className="group rounded-2xl border border-line bg-ink-850/80 px-4 py-2 text-sm">
            <summary className="cursor-pointer select-none py-1 font-medium text-fg-muted marker:text-fg-subtle hover:text-fg">
              Your notes from Stages 1 and 2
            </summary>
            <dl className="space-y-3 pb-2 pt-2">
              {notes.invariant ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-synapse-soft">🧭 Invariant</dt>
                  <dd className="mt-1 text-fg-muted">{notes.invariant}</dd>
                </div>
              ) : null}
              {notes.edgeCase ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-synapse-soft">⚠️ Edge-case trap</dt>
                  <dd className="mt-1 text-fg-muted">{notes.edgeCase}</dd>
                </div>
              ) : null}
            </dl>
          </details>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {practiceMode ? (
            onShowSummary ? (
              <Button variant="ghost" size="sm" onClick={onShowSummary} rightIcon={<span aria-hidden="true">→</span>}>
                Back to summary
              </Button>
            ) : null
          ) : (
            <ConfirmButton
              confirmLabel="Show the solution"
              prompt="Give up? This counts as a struggle and queues drills."
              onConfirm={() => {
                // An open confirm must not record a give-up on top of a submit that is judging, saving or accepted.
                if (giveUpAllowed) onGiveUp();
              }}
              disabled={!giveUpAllowed}
              leftIcon={<span aria-hidden="true">🏳️</span>}
            >
              Give up
            </ConfirmButton>
          )}
        </div>
      </div>
    </div>
  );
}

function runtimeLabel(language: JudgeLanguage, status: string): string {
  if (language === "javascript") return "JavaScript · runs in a sandboxed worker";
  switch (status) {
    case "ready":
      return "Python 3 (Pyodide) · ready";
    case "loading":
      return "Python 3 (Pyodide) · loading runtime…";
    case "error":
      return "Python 3 (Pyodide) · failed to load";
    default:
      return "Python 3 (Pyodide) · loads on first run";
  }
}

function runtimeDot(language: JudgeLanguage, status: string): string {
  if (language === "javascript" || status === "ready") return "bg-success";
  if (status === "loading") return "bg-warning motion-safe:animate-pulse";
  if (status === "error") return "bg-danger";
  return "bg-fg-subtle";
}
