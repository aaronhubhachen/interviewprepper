"use client";

import Editor, { loader, type BeforeMount, type Monaco, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import type { CodeEditorProps } from "./editorTypes";
import { PlainCodeEditor } from "./PlainCodeEditor";

/** Monaco comes from the jsDelivr CDN (@monaco-editor/loader's default); fall back to a textarea if it never arrives. */
const MONACO_LOAD_TIMEOUT_MS = 15_000;
export const THEME_DARK = "prepr-dark";
export const THEME_LIGHT = "prepr-light";

let themed = false;

export function monoFontFamily(): string {
  const fallback = "ui-monospace, 'Cascadia Code', Consolas, 'SFMono-Regular', Menlo, monospace";
  if (typeof document === "undefined") return fallback;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim();
  return family ? `${family}, ${fallback}` : fallback;
}

interface LanguageServiceDefaults {
  setDiagnosticsOptions?: (options: { noSemanticValidation?: boolean; noSyntaxValidation?: boolean }) => void;
}

export const beforeMount: BeforeMount = (monaco) => {
  if (themed) return;
  themed = true;
  monaco.editor.defineTheme(THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "A0A0A0", fontStyle: "italic" },
      { token: "keyword", foreground: "FFBD8A" },
      { token: "string", foreground: "F97316" },
      { token: "string.escape", foreground: "FFBD8A" },
      { token: "number", foreground: "FFFFFF" },
      { token: "regexp", foreground: "FF8A3D" },
      { token: "type", foreground: "FFBD8A" },
      { token: "type.identifier", foreground: "FFBD8A" },
      { token: "delimiter", foreground: "C4C4C4" },
      { token: "operator", foreground: "C4C4C4" },
    ],
    colors: {
      "editor.background": "#101010",
      "editor.foreground": "#ffffff",
      "editorGutter.background": "#101010",
      "editorLineNumber.foreground": "#7a7a7a",
      "editorLineNumber.activeForeground": "#c4c4c4",
      "editor.lineHighlightBackground": "#20202099",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#c2410c70",
      "editor.inactiveSelectionBackground": "#c2410c45",
      "editor.selectionHighlightBackground": "#f9731628",
      "editor.wordHighlightBackground": "#ff8a3d24",
      "editorCursor.foreground": "#ff8a3d",
      "editorIndentGuide.background1": "#2a2a2a",
      "editorIndentGuide.activeBackground1": "#4a4a4a",
      "editorBracketMatch.background": "#f9731628",
      "editorBracketMatch.border": "#f9731670",
      "editorWidget.background": "#202020",
      "editorWidget.border": "#4a4a4a",
      "editorSuggestWidget.background": "#202020",
      "editorSuggestWidget.border": "#4a4a4a",
      "editorSuggestWidget.selectedBackground": "#383838",
      "editorHoverWidget.background": "#202020",
      "editorHoverWidget.border": "#4a4a4a",
      "scrollbarSlider.background": "#38383899",
      "scrollbarSlider.hoverBackground": "#4a4a4acc",
      "scrollbarSlider.activeBackground": "#7a7a7acc",
      focusBorder: "#f97316",
    },
  });
  monaco.editor.defineTheme(THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "767676", fontStyle: "italic" },
      { token: "keyword", foreground: "9A3412" },
      { token: "string", foreground: "C2410C" },
      { token: "string.escape", foreground: "9A3412" },
      { token: "number", foreground: "111111" },
      { token: "regexp", foreground: "C2410C" },
      { token: "type", foreground: "9A3412" },
      { token: "type.identifier", foreground: "9A3412" },
      { token: "delimiter", foreground: "3A3A3A" },
      { token: "operator", foreground: "3A3A3A" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#111111",
      "editorGutter.background": "#f6f6f6",
      "editorLineNumber.foreground": "#767676",
      "editorLineNumber.activeForeground": "#3a3a3a",
      "editor.lineHighlightBackground": "#ededed",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#c2410c35",
      "editor.inactiveSelectionBackground": "#c2410c20",
      "editor.selectionHighlightBackground": "#c2410c18",
      "editor.wordHighlightBackground": "#9a341218",
      "editorCursor.foreground": "#c2410c",
      "editorIndentGuide.background1": "#d7d7d7",
      "editorIndentGuide.activeBackground1": "#b5b5b5",
      "editorBracketMatch.background": "#c2410c18",
      "editorBracketMatch.border": "#c2410c66",
      "editorWidget.background": "#fcfcfc",
      "editorWidget.border": "#b5b5b5",
      "editorSuggestWidget.background": "#fcfcfc",
      "editorSuggestWidget.border": "#b5b5b5",
      "editorSuggestWidget.selectedBackground": "#ededed",
      "editorHoverWidget.background": "#fcfcfc",
      "editorHoverWidget.border": "#b5b5b5",
      "scrollbarSlider.background": "#d0d0d099",
      "scrollbarSlider.hoverBackground": "#b5b5b5cc",
      "scrollbarSlider.activeBackground": "#767676cc",
      focusBorder: "#c2410c",
    },
  });
  // Starter code only ever defines one global function; semantic checks across
  // models would just be noise. Syntax errors still get squiggles. (The API
  // moved between Monaco versions, so look it up defensively.)
  try {
    type Defaults = { javascriptDefaults?: LanguageServiceDefaults; typescriptDefaults?: LanguageServiceDefaults };
    const api = monaco as unknown as { typescript?: Defaults; languages: { typescript?: Defaults } };
    const service = api.typescript ?? api.languages.typescript;
    for (const defaults of [service?.javascriptDefaults, service?.typescriptDefaults]) {
      defaults?.setDiagnosticsOptions?.({ noSemanticValidation: true, noSyntaxValidation: false });
    }
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
  const { value, language, onChange, onRun, onSubmit, onToggleAi, ariaLabel, height, path, readOnly } = props;
  const [failed, setFailed] = useState(false);
  const [editorTheme, setEditorTheme] = useState(THEME_DARK);
  const handlers = useRef({ onRun, onSubmit, onToggleAi });
  useEffect(() => {
    handlers.current = { onRun, onSubmit, onToggleAi };
  }, [onRun, onSubmit, onToggleAi]);

  useEffect(() => {
    const syncTheme = () => setEditorTheme(document.documentElement.dataset.theme === "light" ? THEME_LIGHT : THEME_DARK);
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    syncTheme();
    return () => observer.disconnect();
  }, []);

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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => handlers.current.onToggleAi?.());
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
      theme={editorTheme}
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
        tabSize: language === "javascript" || language === "typescript" ? 2 : 4,
        insertSpaces: language !== "go",
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
