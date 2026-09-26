import type { JudgeLanguage } from "@synapse/core/content";

export interface CodeEditorProps {
  value: string;
  language: JudgeLanguage;
  onChange: (value: string) => void;
  /** Ctrl/Cmd + ' */
  onRun: () => void;
  /** Ctrl/Cmd + Enter */
  onSubmit: () => void;
  ariaLabel: string;
  /** CSS height of the editing surface (fixed, so loading never shifts layout). */
  height: string;
  /** Distinct model per problem + language (keeps separate undo stacks). */
  path: string;
  readOnly?: boolean;
}
