import "server-only";

import { getProblem, NATIVE_LANGUAGES, nativeToolchains, runNativeTests, type NativeLanguage } from "@synapse/core";
import type { JudgeLanguagesResponse, JudgeRunResponse } from "@/lib/types";
import { badRequest, forbidden, notFound } from "./http";

const MAX_TESTS = 50;

/**
 * The server judge executes submitted code on this machine. On by default for local
 * development; production must opt in with SYNAPSE_NATIVE_JUDGE=1 (and =0 always disables).
 */
export function nativeJudgeEnabled(): boolean {
  const flag = process.env.SYNAPSE_NATIVE_JUDGE?.trim();
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export async function judgeLanguages(): Promise<JudgeLanguagesResponse> {
  if (!nativeJudgeEnabled()) return { available: [], enabled: false };
  const toolchains = await nativeToolchains();
  return { available: NATIVE_LANGUAGES.filter((language) => toolchains[language]), enabled: true };
}

function parseArgs(argsJson: string): unknown[][] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(argsJson);
  } catch {
    throw badRequest("argsJson is not valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_TESTS || !parsed.every(Array.isArray)) {
    throw badRequest(`argsJson must be a list of at most ${MAX_TESTS} argument lists.`);
  }
  return parsed as unknown[][];
}

export async function runOnServer(input: { problemId: string; language: NativeLanguage; code: string; argsJson: string }): Promise<JudgeRunResponse> {
  if (!nativeJudgeEnabled()) throw forbidden("The server judge is disabled. Set SYNAPSE_NATIVE_JUDGE=1 to enable Java, C++, Go, and TypeScript.");
  const problem = getProblem(input.problemId);
  if (!problem) throw notFound(`Unknown problem "${input.problemId}".`);
  const stage = problem.stages.code;
  const args = parseArgs(input.argsJson);
  if (args.some((list) => list.length !== stage.params.length)) throw badRequest("Each argument list must match the problem's parameters.");
  const toolchains = await nativeToolchains();
  if (!toolchains[input.language]) throw badRequest(`${input.language} is not installed on this server.`);
  return { raw: await runNativeTests(input.language, input.code, stage, JSON.stringify(args)) };
}
