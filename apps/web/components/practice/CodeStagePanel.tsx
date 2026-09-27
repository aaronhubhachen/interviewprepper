"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CODE_LANGUAGES, isNativeLanguage, LANGUAGE_EXTENSIONS, LANGUAGE_LABELS, type CodeLanguage, type NativeLanguage } from "@synapse/core/judge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";
import type { JudgeMode, JudgeOutcome } from "@/lib/judge";
import { BotChat } from "@/components/bot/BotChat";
import { BotReportView } from "@/components/bot/BotReportView";
import { useAiAssistant } from "@/components/bot/useAiAssistant";
import { fetchJudgeLanguages } from "@/lib/api";
import { useJudge } from "@/lib/judge/useJudge";
import { shortcutLabels, useIsApplePlatform } from "@/lib/keyboard";
import type { ClientProblem } from "@/lib/types";
import { ConfirmButton, StageTimer } from "./bits";
import { CodeEditor } from "./CodeEditor";
import { JudgeResults } from "./JudgeResults";
import { canGiveUp, codeStorageKey, LANGUAGE_STORAGE_KEY, safeStorage, STAGE_META, type CodeStageState } from "./session";


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
  onLanguage: (language: CodeLanguage) => void;
  /** Every finished Run / Submit (the parent records submits). */
  onJudged: (outcome: JudgeOutcome) => void;
  onGiveUp: () => void;
  onRetrySave: () => void;
  /** Offered when an accepted submit / give-up could not be saved. */
  onSkipSave?: () => void;
  onShowSummary?: () => void;
  /** Cursor-style AI side panel beside the editor. */
  aiOpen: boolean;
  onToggleAi: () => void;
}

const storage = safeStorage("local");

function loadCode(problem: ClientProblem, language: CodeLanguage): string {
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
  aiOpen,
  onToggleAi,
}: CodeStagePanelProps) {
  const stage = problem.stages.code;
  const language = state.language;
  const { judge, preloadPython, pythonStatus, pythonError } = useJudge();
  const [code, setCode] = useState<Record<CodeLanguage, string>>(
    () => Object.fromEntries(CODE_LANGUAGES.map((lang) => [lang, loadCode(problem, lang)])) as Record<CodeLanguage, string>,
  );
  /** null until the server says which compiled languages it can run. */
  const [serverLanguages, setServerLanguages] = useState<NativeLanguage[] | null>(null);
  const [running, setRunning] = useState<JudgeMode | null>(null);
  const [outcome, setOutcome] = useState<JudgeOutcome | null>(null);
  const [recordedNote, setRecordedNote] = useState<string | null>(null);
  const saveTimers = useRef<Partial<Record<CodeLanguage, number>>>({});
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  const getCode = useCallback(() => codeRef.current[language], [language]);
  const ai = useAiAssistant({ problemId: problem.id, language, getCode });

  const visibleCount = useMemo(() => stage.tests.filter((test) => !test.hidden).length || stage.tests.length, [stage.tests]);
  const totalCount = stage.tests.length;

  useEffect(() => {
    const controller = new AbortController();
    fetchJudgeLanguages({ signal: controller.signal })
      .then((response) => setServerLanguages(response.available))
      .catch(() => {
        if (!controller.signal.aborted) setServerLanguages([]);
      });
    return () => controller.abort();
  }, []);

  // Warm Pyodide as soon as Python is the active language.
  useEffect(() => {
    if (language === "python") preloadPython();
  }, [language, preloadPython]);

  // Flush pending saves on unmount.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const lang of Object.keys(timers) as CodeLanguage[]) {
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

  const switchLanguage = (next: CodeLanguage) => {
    storage.setItem(LANGUAGE_STORAGE_KEY, next);
    onLanguage(next);
  };

  const execute = useCallback(
    async (mode: JudgeMode) => {
      if (running) return;
      if (mode === "submit" && saving) return;
      setRunning(mode);
      const result = await judge({ stage, mode, language, code: codeRef.current[language], problemId: problem.id });
      setRunning(null);
      setOutcome(result);
      if (result.ok) ai.noteRun(mode, result.report.passed, result.report.total, result.report.status);
      if (mode === "run") setRecordedNote("Run is free practice: only Submit is recorded");
      else if (practiceMode) setRecordedNote("Practice mode: not recorded");
      else if (result.ok && result.report.status === "compile_error") setRecordedNote("Compile errors don't count as a submission");
      else setRecordedNote(null);
      onJudged(result);
    },
    [ai, judge, language, onJudged, practiceMode, problem.id, running, saving, stage],
  );

  const onRun = useCallback(() => void execute("run"), [execute]);
  const onSubmit = useCallback(() => void execute("submit"), [execute]);

  // Shortcuts when focus is elsewhere in the panel (Monaco handles its own).
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.defaultPrevented) return;
      if (!panelRef.current || panelRef.current.closest("[hidden]")) return;
      if (event.key.toLowerCase() === "l" && !event.shiftKey) {
        event.preventDefault();
        onToggleAi();
        return;
      }
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
  }, [onRun, onSubmit, onToggleAi]);

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
            <LanguagePicker value={language} serverLanguages={serverLanguages} onChange={switchLanguage} />
            <button
              type="button"
              onClick={onToggleAi}
              aria-pressed={aiOpen}
              aria-keyshortcuts={keys.aria("L")}
              title={`${aiOpen ? "Hide" : "Show"} the AI assistant (${keys.combo("L")})`}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
                aiOpen ? "border-synapse bg-synapse/15 text-fg" : "border-line-strong bg-ink-900/80 text-fg-muted hover:border-synapse/60 hover:text-fg",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current text-synapse">
                <path d="M8 1.5 9.4 5.6 13.5 7 9.4 8.4 8 12.5 6.6 8.4 2.5 7l4.1-1.4L8 1.5Zm4.5 8.5.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
              </svg>
              {aiOpen ? "Hide AI" : "Show AI"}
              <span className="hidden font-mono text-[0.7rem] text-fg-subtle sm:inline">{keys.combo("L")}</span>
            </button>
          </div>
        </div>

        <div className={cn("border-t border-line", aiOpen && "grid xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]")}>
        <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ink-900/60 px-4 py-2 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-2" aria-live="polite">
            <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", runtimeDot(language, pythonStatus, serverLanguages))} />
            {runtimeLabel(language, pythonStatus, serverLanguages)}
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
          onChange={(next) => {
            ai.noteEdit(codeRef.current[language], next);
            updateCode(next);
          }}
          onRun={onRun}
          onSubmit={onSubmit}
          onToggleAi={onToggleAi}
          ariaLabel={`${LANGUAGE_LABELS[language]} solution for ${problem.title}. Press ${keys.tabFocusSpoken} to let Tab move focus.`}
          height={EDITOR_HEIGHT}
          path={`file:///synapse/${problem.id}/solution.${LANGUAGE_EXTENSIONS[language]}`}
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
            runsOnServer={isNativeLanguage(language)}
            recordedNote={recordedNote ?? undefined}
          />
        </div>
        </div>
        {aiOpen ? (
          <div className="h-[34rem] border-t border-line xl:h-auto xl:border-l xl:border-t-0">
            <BotChat
              docked
              messages={ai.messages}
              sending={ai.sending}
              error={ai.error}
              offline={ai.offline}
              language={language}
              onSend={ai.send}
              onInsert={(snippet) => {
                ai.noteInsert(snippet);
                updateCode(snippet);
              }}
              onCopy={ai.noteCopy}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => ai.setTrapMode(!ai.trapMode)}
                    aria-pressed={ai.trapMode}
                    title="When on, the assistant sometimes writes code with a subtle bug, like real AI. Catching it counts in your review."
                    className={cn(
                      "h-7 rounded-lg border px-2 text-xs font-medium transition-colors",
                      ai.trapMode ? "border-synapse/60 text-synapse-soft" : "border-line text-fg-subtle hover:text-fg",
                    )}
                  >
                    Mistakes {ai.trapMode ? "on" : "off"}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={ai.review}
                    loading={ai.reviewing}
                    loadingLabel="Reviewing your AI use"
                    disabled={!ai.messages.some((message) => message.role === "user")}
                    title="Score how you used the AI: framing, prompting, verification, catching its mistakes"
                  >
                    Review
                  </Button>
                  {ai.messages.length > 0 ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={ai.clear} title="Start a fresh conversation">
                      Clear
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className="h-7 w-7 px-0" onClick={onToggleAi} aria-label="Hide the AI assistant" title={`Hide (${keys.combo("L")})`}>
                    <span aria-hidden="true">×</span>
                  </Button>
                </>
              }
            >
              {ai.reviewError ? (
                <div className="px-3 pb-2">
                  <Banner tone="danger">{ai.reviewError}</Banner>
                </div>
              ) : null}
            </BotChat>
          </div>
        ) : null}
        </div>
      </Card>

      {ai.report ? (
        <Card className="space-y-4" aria-label="Review of your AI use">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">AI-assisted interview review</p>
              <p className="mt-1 text-sm text-fg-muted">How an interviewer running an AI-enabled round would read your session so far.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={ai.dismissReport}>
              Close
            </Button>
          </div>
          <BotReportView embedded problem={problem} report={ai.report} />
        </Card>
      ) : null}

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

const NATIVE_RUNTIME: Record<NativeLanguage, string> = {
  java: "Java 21 · compiled and run on the server",
  cpp: "C++17 · compiled and run on the server",
  go: "Go · compiled and run on the server",
  typescript: "TypeScript · types stripped, runs on the server (types are not checked)",
};

function runtimeLabel(language: CodeLanguage, status: string, serverLanguages: NativeLanguage[] | null): string {
  if (isNativeLanguage(language)) {
    if (serverLanguages && !serverLanguages.includes(language)) return `${LANGUAGE_LABELS[language]} · not available on this server`;
    return NATIVE_RUNTIME[language];
  }
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

function runtimeDot(language: CodeLanguage, status: string, serverLanguages: NativeLanguage[] | null): string {
  if (isNativeLanguage(language)) {
    if (!serverLanguages) return "bg-fg-subtle";
    return serverLanguages.includes(language) ? "bg-success" : "bg-danger";
  }
  if (language === "javascript" || status === "ready") return "bg-success";
  if (status === "loading") return "bg-warning motion-safe:animate-pulse";
  if (status === "error") return "bg-danger";
  return "bg-fg-subtle";
}

function LanguagePicker({
  value,
  serverLanguages,
  onChange,
}: {
  value: CodeLanguage;
  serverLanguages: NativeLanguage[] | null;
  onChange: (language: CodeLanguage) => void;
}) {
  const unavailable = (language: CodeLanguage) => isNativeLanguage(language) && serverLanguages !== null && !serverLanguages.includes(language);
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Language</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CodeLanguage)}
        className="h-9 appearance-none rounded-xl border border-line-strong bg-ink-900/80 py-1 pl-3 pr-8 text-sm font-medium text-fg transition-colors hover:border-synapse/60 focus:border-synapse focus:outline-none"
      >
        {CODE_LANGUAGES.map((language) => (
          <option key={language} value={language} disabled={unavailable(language) && language !== value}>
            {LANGUAGE_LABELS[language]}
            {unavailable(language) ? " (not installed)" : ""}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute right-3 h-3 w-3 text-fg-subtle" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="m3 4.5 3 3 3-3" />
      </svg>
    </label>
  );
}
