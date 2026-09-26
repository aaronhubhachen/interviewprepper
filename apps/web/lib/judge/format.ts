/** Display helpers for judge results (pure, browser-safe). */
import type { JudgeReport, JudgeStatus } from "@synapse/core/judge";

/** Compact JSON for test values: strings quoted, long values truncated with "…". */
export function formatValue(value: unknown, maxLength = 4000): string {
  let text: string;
  if (value === undefined) text = "undefined";
  else if (typeof value === "number" && !Number.isFinite(value)) text = String(value);
  else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

/** `s = "abc", k = 2` (falls back to positional `arg1 = …` when params are missing). */
export function formatArgs(params: readonly string[], args: readonly unknown[], maxLength = 4000): string {
  return args
    .map((arg, index) => `${params[index] ?? `arg${index + 1}`} = ${formatValue(arg, maxLength)}`)
    .join(", ");
}

/** 0.042 → "0.04 ms", 12.3 → "12 ms", 1530 → "1.53 s". */
export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 0.01) return "<0.01 ms";
  if (ms < 10) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export const STATUS_LABELS: Readonly<Record<JudgeStatus, string>> = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  runtime_error: "Runtime error",
  compile_error: "Compile error",
  timeout: "Time limit exceeded",
};

/** One line for screen readers and summaries: "Wrong answer: 5 of 9 tests passed." */
export function summarizeReport(report: JudgeReport): string {
  const label = STATUS_LABELS[report.status];
  if (report.status === "compile_error" || report.status === "timeout") return `${label}. ${report.message ?? ""}`.trim();
  return `${label}: ${report.passed} of ${report.total} tests passed.`;
}
