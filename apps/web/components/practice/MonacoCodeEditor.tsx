"use client";

import Editor, { loader, type BeforeMount, type Monaco, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import type { CodeEditorProps } from "./editorTypes";
import { PlainCodeEditor } from "./PlainCodeEditor";

/** Monaco comes from the jsDelivr CDN (@monaco-editor/loader's default); fall back to a textarea if it never arrives. */
const MONACO_LOAD_TIMEOUT_MS = 15_000;
const THEME = "synapse-night";

let themed = false;

function monoFontFamily(): string {
  const fallback = "ui-monospace, 'Cascadia Code', Consolas, 'SFMono-Regular', Menlo, monospace";
  if (typeof document === "undefined") return fallback;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim();
  return family ? `${family}, ${fallback}` : fallback;
}

interface LanguageServiceDefaults {
  setDiagnosticsOptions?: (options: { noSemanticValidation?: boolean; noSyntaxValidation?: boolean }) => void;
}

const beforeMount: BeforeMount = (monaco) => {
  if (themed) return;
  themed = true;
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7f7da6", fontStyle: "italic" },
      { token: "keyword", foreground: "c4b5fd" },
      { token: "string", foreground: "67e8f9" },
      { token: "string.escape", foreground: "a5f3fc" },
      { token: "number", foreground: "fcd34d" },
      { token: "regexp", foreground: "f9a8d4" },
      { token: "type", foreground: "a78bfa" },
      { token: "type.identifier", foreground: "a78bfa" },
      { token: "delimiter", foreground: "a6a4c8" },
      { token: "operator", foreground: "a6a4c8" },
    ],
    colors: {
      "editor.background": "#0b0b17",
      "editor.foreground": "#eeedff",
      "editorGutter.background": "#0b0b17",
      "editorLineNumber.foreground": "#4b4973",
      "editorLineNumber.activeForeground": "#a6a4c8",
      "editor.lineHighlightBackground": "#14142599",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#7c3aed59",
      "editor.inactiveSelectionBackground": "#7c3aed2e",
      "editor.selectionHighlightBackground": "#a78bfa1f",
      "editor.wordHighlightBackground": "#22d3ee1a",
      "editorCursor.foreground": "#22d3ee",
      "editorIndentGuide.background1": "#1f1f38",
      "editorIndentGuide.activeBackground1": "#36365e",
      "editorBracketMatch.background": "#22d3ee1f",
      "editorBracketMatch.border": "#22d3ee66",
      "editorWidget.background": "#161629",
      "editorWidget.border": "#36365e",
      "editorSuggestWidget.background": "#161629",
      "editorSuggestWidget.border": "#36365e",
      "editorSuggestWidget.selectedBackground": "#2a2a4a",
      "editorHoverWidget.background": "#161629",
      "editorHoverWidget.border": "#36365e",
      "scrollbarSlider.background": "#2a2a4a99",
      "scrollbarSlider.hoverBackground": "#36365ecc",
      "scrollbarSlider.activeBackground": "#4b4973cc",
      focusBorder: "#22d3ee",
    },
  });
  // Starter code only ever defines one global function; semantic checks across
  // models would just be noise. Syntax errors still get squiggles. (The API
  // moved between Monaco versions, so look it up defensively.)
  try {
    const api = monaco as unknown as { typescript?: { javascriptDefaults?: LanguageServiceDefaults }; languages: { typescript?: { javascriptDefaults?: LanguageServiceDefaults } } };
    const defaults = api.typescript?.javascriptDefaults ?? api.languages.typescript?.javascriptDefaults;
    defaults?.setDiagnosticsOptions?.({ noSemanticValidation: true, noSyntaxValidation: false });
  } catch {
    // optional polish
  }
};

function EditorLoading({ height }: { height: string }) {
  return (
    <div className="relative" style={{ height }}>
      <div className="space-y-3 p-5" aria-hidden="true">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <Spinner size="md" label="Loading the code editor…" />
      </div>
    </div>
  );
}

export default function MonacoCodeEditor(props: CodeEditorProps) {
  const { value, language, onChange, onRun, onSubmit, ariaLabel, height, path, readOnly } = props;
  const [failed, setFailed] = useState(false);
  const handlers = useRef({ onRun, onSubmit });
  useEffect(() => {
    handlers.current = { onRun, onSubmit };
  }, [onRun, onSubmit]);

  useEffect(() => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) setFailed(true);
    }, MONACO_LOAD_TIMEOUT_MS);
    // Shared, cached promise (the <Editor> awaits the same one); never cancel it here.
    loader.init().then(
      () => {
        settled = true;
        window.clearTimeout(timer);
      },
      (error: unknown) => {
        if ((error as { type?: string } | null)?.type === "cancelation") return;
        settled = true;
        window.clearTimeout(timer);
        setFailed(true);
      },
    );
    return () => window.clearTimeout(timer);
  }, []);

  const onMount: OnMount = (editor, monaco: Monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => handlers.current.onSubmit());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => handlers.current.onRun());
    // Code autosaves; keep Ctrl+S from opening the browser's "Save page" dialog.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => undefined);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => monaco.editor.remeasureFonts());
    }
  };

  if (failed) {
    return <PlainCodeEditor {...props} notice="The Monaco editor couldn't load from the CDN, so this is a plain editor. Your code, Run and Submit work the same." />;
  }

  return (
    <Editor
      height={height}
      path={path}
      language={language}
      value={value}
      theme={THEME}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(next) => onChange(next ?? "")}
      loading={<EditorLoading height={height} />}
      options={{
        ariaLabel,
        readOnly,
        fontFamily: monoFontFamily(),
        fontSize: 14,
        lineHeight: 22,
        tabSize: language === "python" ? 4 : 2,
        insertSpaces: true,
        detectIndentation: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 14, bottom: 14 },
        lineNumbersMinChars: 3,
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        bracketPairColorization: { enabled: true },
        guides: { indentation: true },
        fixedOverflowWidgets: true,
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, alwaysConsumeMouseWheel: false },
        "semanticHighlighting.enabled": false,
      }}
    />
  );
}
