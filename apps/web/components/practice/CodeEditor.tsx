"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import type { CodeEditorProps } from "./editorTypes";

function EditorPlaceholder() {
  return (
    <div className="relative h-full" aria-busy="true">
      <div className="space-y-3 p-5" aria-hidden="true">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <Spinner size="md" label="Loading the code editor…" />
      </div>
    </div>
  );
}

/** Monaco is browser-only: load it client-side, never during SSR. */
const MonacoCodeEditor = dynamic(() => import("./MonacoCodeEditor"), {
  ssr: false,
  loading: () => <EditorPlaceholder />,
});

/** Fixed-height frame so the editor, its skeleton, and the fallback all occupy the same space. */
export function CodeEditor(props: CodeEditorProps) {
  return (
    <div className="overflow-hidden bg-ink-900" style={{ height: props.height }}>
      <MonacoCodeEditor {...props} />
    </div>
  );
}
