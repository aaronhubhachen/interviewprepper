import type { CodeLanguage } from "@synapse/core/judge";

export interface CodeEditorProps {
  value: string;
  language: CodeLanguage;
  onChange: (value: string) => void;
  /** Ctrl/Cmd + ' */
  onRun: () => void;
  /** Ctrl/Cmd + Enter */
  onSubmit: () => void;
  /** Ctrl/Cmd + L (Cursor-style): show or hide the AI panel. */
  onToggleAi?: () => void;
  /** Ctrl/Cmd + K (Cursor-style): edit the selected lines (1-based, inclusive) with the AI. */
  onInlineEdit?: (selection: { startLine: number; endLine: number }) => void;
  ariaLabel: string;
  /** CSS height of the editing surface (fixed, so loading never shifts layout). */
  height: string;
  /** Distinct model per problem + language (keeps separate undo stacks). */
  path: string;
  readOnly?: boolean;
}
