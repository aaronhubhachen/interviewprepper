"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { JudgeClient, type PythonRuntimeStatus } from "./client";
import { judgeCode, type JudgeOutcome, type JudgeStage, type JudgeMode } from "./judge";
import type { JudgeLanguage } from "@synapse/core/content";

export interface UseJudge {
  /** Executes in the worker and compares on the main thread. Never throws. */
  judge: (input: { stage: JudgeStage; mode: JudgeMode; language: JudgeLanguage; code: string }) => Promise<JudgeOutcome>;
  /** Start downloading Pyodide in the background (call when the user picks Python). */
  preloadPython: () => void;
  pythonStatus: PythonRuntimeStatus;
  pythonError: string | null;
}

/** One JudgeClient per mounted IDE; workers are terminated on unmount. */
export function useJudge(): UseJudge {
  const clientRef = useRef<JudgeClient | null>(null);
  const [pythonStatus, setPythonStatus] = useState<PythonRuntimeStatus>("cold");
  const [pythonError, setPythonError] = useState<string | null>(null);

  useEffect(() => {
    const client = new JudgeClient({
      onPythonStatus: (status, message) => {
        setPythonStatus(status);
        setPythonError(status === "error" ? (message ?? "The Python runtime failed to load.") : null);
      },
    });
    clientRef.current = client;
    return () => {
      client.dispose();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, []);

  const judge = useCallback<UseJudge["judge"]>(async (input) => {
    const client = clientRef.current;
    if (!client) {
      return { ok: false, mode: input.mode, language: input.language, reason: "disposed", message: "The judge is still starting. Try again." };
    }
    return judgeCode(client, input);
  }, []);

  const preloadPython = useCallback(() => clientRef.current?.preloadPython(), []);

  return { judge, preloadPython, pythonStatus, pythonError };
}
