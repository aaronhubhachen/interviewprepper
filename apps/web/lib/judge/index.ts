/**
 * Browser judge for the card-flip IDE. The worker (public/judge-worker.js)
 * only executes; this module orchestrates, compares with core's
 * compareOutput (via judgeResults), and enforces the time limit.
 */
export {
  BOOT_TIMEOUT_MS,
  JUDGE_WORKER_URL,
  JudgeClient,
  PYTHON_LOAD_TIMEOUT_MS,
  RUN_TIMEOUT_MS,
  timeoutMessage,
  type ExecuteOutcome,
  type ExecuteRequest,
  type JudgeClientOptions,
  type PythonRuntimeStatus,
  type WorkerLike,
} from "./client";
export { formatArgs, formatMs, formatValue, STATUS_LABELS, summarizeReport } from "./format";
export {
  firstFailure,
  judgeCode,
  planTests,
  remapReport,
  totalRuntime,
  type JudgeMode,
  type JudgeOutcome,
  type JudgePlan,
  type JudgeRunner,
  type JudgeStage,
} from "./judge";
export { isWorkerResponse, normalizeRaw, type WorkerRequest, type WorkerResponse } from "./protocol";
