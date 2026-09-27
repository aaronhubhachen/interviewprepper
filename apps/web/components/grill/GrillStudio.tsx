"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, PageHeader, Spinner } from "@/components/ui";
import { ApiError, errorMessage, fetchGrillQuestion, fetchGrillReport } from "@/lib/api";
import type { GrillNextResponse, GrillReport, GrillTurn } from "@/lib/types";
import { useSpeechSynthesis } from "@/lib/voice/useSpeechSynthesis";
import { useLeaveGuard } from "@/lib/useLeaveGuard";
import { useStoredBoolean } from "@/lib/voice/useStoredBoolean";
import { GrillReportView } from "./GrillReportView";
import { GrillRoom } from "./GrillRoom";
import { PastRounds } from "./PastRounds";
import { ResumeSetup } from "./ResumeSetup";

const RESUME_KEY = "prepr.grill.resume";
const VOICE_KEY = "prepr.grill.voice";
const DEFAULT_TOTAL = 8;

type Stage = "setup" | "interview" | "report";

export function GrillStudio() {
  const tts = useSpeechSynthesis();
  const [voiceEnabled, setVoiceEnabled] = useStoredBoolean(VOICE_KEY, false);
  const [resume, setResume] = useState("");
  const [stage, setStage] = useState<Stage>("setup");
  const [asked, setAsked] = useState<GrillNextResponse[]>([]);
  const [turns, setTurns] = useState<GrillTurn[]>([]);
  const [thinking, setThinking] = useState<"question" | "report" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GrillReport | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RESUME_KEY);
      // Restored after hydration: storage is not readable during the server render.
      if (saved) setResume(saved);
    } catch {
      // Storage blocked: start empty.
    }
    return () => abortRef.current?.abort();
  }, []);

  const updateResume = (text: string) => {
    setResume(text);
    try {
      window.localStorage.setItem(RESUME_KEY, text);
    } catch {
      // ignore
    }
  };

  const total = asked[0]?.total ?? DEFAULT_TOTAL;
  useLeaveGuard(stage === "interview" && turns.length > 0);

  const askNext = useCallback(
    async (history: GrillTurn[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      retryRef.current = () => void askNext(history);
      setError(null);
      setThinking("question");
      try {
        const next = await fetchGrillQuestion({ resume, turns: history }, { signal: controller.signal });
        setAsked((current) => [...current.slice(0, history.length), next]);
        if (voiceEnabled) tts.speak([next.reaction, next.question].filter(Boolean).join(" "));
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.code === "aborted") return;
        setError(errorMessage(requestError));
      } finally {
        if (abortRef.current === controller) setThinking(null);
      }
    },
    [resume, tts, voiceEnabled],
  );

  const finish = useCallback(
    async (history: GrillTurn[]) => {
      abortRef.current?.abort();
      tts.cancel();
      const controller = new AbortController();
      abortRef.current = controller;
      retryRef.current = () => void finish(history);
      setError(null);
      setThinking("report");
      try {
        const result = await fetchGrillReport({ resume, turns: history }, { signal: controller.signal });
        setReport(result);
        setStage("report");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.code === "aborted") return;
        setError(errorMessage(requestError));
      } finally {
        if (abortRef.current === controller) setThinking(null);
      }
    },
    [resume, tts],
  );

  const start = () => {
    setAsked([]);
    setTurns([]);
    setReport(null);
    setStage("interview");
    void askNext([]);
  };

  const answer = (text: string) => {
    const current = asked[turns.length];
    if (!current) return;
    tts.cancel();
    const history = [...turns, { question: current.question, target: current.target, answer: text }];
    setTurns(history);
    if (history.length >= total) void finish(history);
    else void askNext(history);
  };

  const backToSetup = () => {
    abortRef.current?.abort();
    tts.cancel();
    setStage("setup");
    setAsked([]);
    setTurns([]);
    setReport(null);
    setError(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Resume grill"
        title="Defend every line"
        description="Upload your resume and defend each claim."
        actions={
          stage === "interview" ? (
            <button type="button" onClick={backToSetup} className="text-sm font-medium text-fg-subtle hover:text-fg">
              ← Quit
            </button>
          ) : null
        }
      />

      {stage === "setup" ? (
        <>
          <ResumeSetup resume={resume} onResumeChange={updateResume} onStart={start} />
          <PastRounds
            onOpen={(saved) => {
              setTurns([]);
              setReport(saved);
              setStage("report");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      ) : null}

      {stage === "interview" ? (
        <div className="grid gap-4">
          {thinking === "report" ? (
            <Card className="flex items-center gap-3" role="status">
              <Spinner size="md" label="" />
              <div>
                <p className="font-semibold text-fg">The panel is reviewing your answers</p>
                <p className="text-sm text-fg-subtle">Usually 10 to 30 seconds</p>
              </div>
            </Card>
          ) : null}
          <GrillRoom
            asked={asked}
            turns={turns}
            total={total}
            thinking={thinking}
            error={error}
            voiceEnabled={voiceEnabled}
            voiceSupported={tts.supported}
            onToggleVoice={() => {
              if (voiceEnabled) tts.cancel();
              setVoiceEnabled(!voiceEnabled);
            }}
            onAnswer={answer}
            onRetry={() => retryRef.current?.()}
            onEnd={() => void finish(turns)}
          />
        </div>
      ) : null}

      {stage === "report" && report ? <GrillReportView report={report} turns={turns} onAgain={start} onNewResume={backToSetup} /> : null}
    </>
  );
}
