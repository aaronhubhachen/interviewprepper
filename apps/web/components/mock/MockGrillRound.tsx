"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GrillRoom } from "@/components/grill/GrillRoom";
import { Card, Spinner } from "@/components/ui";
import { ApiError, errorMessage, fetchGrillQuestion, fetchGrillReport } from "@/lib/api";
import type { GrillNextResponse, GrillTurn, MockGrillRound as MockGrillResult } from "@/lib/types";

/** Shorter than the standalone grill: the loop already has two rounds behind it. */
export const MOCK_GRILL_QUESTIONS = 4;

export function MockGrillRound({ resume, onDone }: { resume: string; onDone: (result: MockGrillResult) => void }) {
  const [asked, setAsked] = useState<GrillNextResponse[]>([]);
  const [turns, setTurns] = useState<GrillTurn[]>([]);
  const [thinking, setThinking] = useState<"question" | "report" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  const request = useCallback(
    async (history: GrillTurn[], kind: "question" | "report") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      retryRef.current = () => void request(history, kind);
      setError(null);
      setThinking(kind);
      try {
        if (kind === "question") {
          const next = await fetchGrillQuestion({ resume, turns: history }, { signal: controller.signal });
          setAsked((current) => [...current.slice(0, history.length), { ...next, total: MOCK_GRILL_QUESTIONS }]);
        } else {
          const report = await fetchGrillReport({ resume, turns: history }, { signal: controller.signal });
          const count = (verdict: string) => report.claims.filter((claim) => claim.verdict === verdict).length;
          onDone({ overall: report.overall, summary: report.summary, held: count("held"), shaky: count("shaky"), cracked: count("cracked") });
        }
      } catch (failure) {
        if (failure instanceof ApiError && failure.code === "aborted") return;
        setError(errorMessage(failure));
      } finally {
        if (abortRef.current === controller) setThinking(null);
      }
    },
    [onDone, resume],
  );

  useEffect(() => {
    void request([], "question");
    return () => abortRef.current?.abort();
    // Ask the first question once, when the round opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (text: string) => {
    const current = asked[turns.length];
    if (!current) return;
    const history = [...turns, { question: current.question, target: current.target, answer: text }];
    setTurns(history);
    void request(history, history.length >= MOCK_GRILL_QUESTIONS ? "report" : "question");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-synapse">Round 3 of 3 · Resume grill</p>
        <h2 className="mt-1 text-2xl font-semibold text-fg">Defend your resume</h2>
      </div>
      {thinking === "report" ? (
        <Card className="flex items-center gap-3" role="status">
          <Spinner size="md" label="" />
          <p className="font-semibold text-fg">The panel is scoring your claims</p>
        </Card>
      ) : null}
      <GrillRoom
        asked={asked}
        turns={turns}
        total={MOCK_GRILL_QUESTIONS}
        thinking={thinking}
        error={error}
        voiceEnabled={false}
        voiceSupported={null}
        onToggleVoice={() => undefined}
        onAnswer={answer}
        onRetry={() => retryRef.current?.()}
        onEnd={() => void request(turns, "report")}
      />
    </div>
  );
}
