"use client";

import { DiffEditor, type DiffOnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type { CodeLanguage } from "@synapse/core/judge";
import { beforeMount, monoFontFamily, THEME_DARK, THEME_LIGHT } from "./MonacoCodeEditor";

export interface MonacoDiffViewProps {
  original: string;
  modified: string;
  language: CodeLanguage;
  height: string;
  /** Hands back a getter for the (possibly hand-edited) suggested side. */
  onReady: (getModified: () => string) => void;
}

/** Side-by-side diff of the candidate's code (left, read-only) and the AI's suggestion (right, editable). */
export default function MonacoDiffView({ original, modified, language, height, onReady }: MonacoDiffViewProps) {
  const [theme, setTheme] = useState(THEME_DARK);
  const diffRef = useRef<Parameters<DiffOnMount>[0] | null>(null);

  // The wrapper disposes models before resetting the widget on unmount, which Monaco reports as an error.
  // Keep the models, detach them from the widget first, then dispose them ourselves.
  useEffect(
    () => () => {
      const editor = diffRef.current;
      if (!editor) return;
      const models = editor.getModel();
      editor.setModel(null);
      models?.original.dispose();
      models?.modified.dispose();
    },
    [],
  );

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === "light" ? THEME_LIGHT : THEME_DARK);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    sync();
    return () => observer.disconnect();
  }, []);

  const onMount: DiffOnMount = (editor) => {
    diffRef.current = editor;
    onReady(() => editor.getModifiedEditor().getValue());
  };

  return (
    <DiffEditor
      height={height}
      language={language}
      original={original}
      modified={modified}
      theme={theme}
      beforeMount={beforeMount}
      onMount={onMount}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      options={{
        fontFamily: monoFontFamily(),
        fontSize: 13,
        lineHeight: 20,
        renderSideBySide: true,
        originalEditable: false,
        readOnly: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderOverviewRuler: false,
        ignoreTrimWhitespace: false,
        padding: { top: 10, bottom: 10 },
      }}
    />
  );
}
