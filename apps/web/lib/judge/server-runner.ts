/**
 * Runner for Java / C++ / Go / TypeScript: the Next.js server compiles and executes
 * (see /api/judge/run); comparison still happens here via judgeResults.
 */
import { isNativeLanguage, type RawTestResult, type RunFailure } from "@synapse/core/judge";
import { ApiError, runOnServer } from "@/lib/api";
import type { ExecuteOutcome } from "./client";
import type { RunRequest } from "./judge";

export async function runServerJudge(request: RunRequest): Promise<ExecuteOutcome> {
  if (!isNativeLanguage(request.language)) return { ok: false, reason: "runtime-unavailable", message: "This language runs in the browser." };
  if (!request.problemId) return { ok: false, reason: "runtime-unavailable", message: "This language needs a problem context." };
  const started = performance.now();
  try {
    const { raw } = await runOnServer({ problemId: request.problemId, language: request.language, code: request.code, argsJson: request.argsJson });
    return { ok: true, raw: raw as RawTestResult[] | RunFailure, wallMs: performance.now() - started, setupLogs: [] };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Could not reach the judge server.";
    return { ok: false, reason: "runtime-unavailable", message };
  }
}
