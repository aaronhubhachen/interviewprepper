"use client";

import type { CodeLanguage } from "@synapse/core/judge";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, fetchBotReport, fetchPracticeSessions, requestInlineEdit, sendBotMessage } from "@/lib/api";
import { LANGUAGE_EXTENSIONS } from "@synapse/core/judge";
import type { BotEvent, BotMessage, BotReport } from "@/lib/types";

/** An edit that adds this many characters at once is logged as a paste. */
const PASTE_CHARS = 60;
const TRAP_KEY = "synapse:ai-traps:v1";

interface Stored {
  messages: BotMessage[];
  traps: Array<{ messageIndex: number; token: string }>;
  events: BotEvent[];
  startedAt: number;
}

const chatKey = (problemId: string) => `synapse:ai-chat:v1:${problemId}`;

function load(problemId: string): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(chatKey(problemId));
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    return parsed && Array.isArray(parsed.messages) && Array.isArray(parsed.events) ? parsed : null;
  } catch {
    return null;
  }
}

export interface AiAssistant {
  messages: BotMessage[];
  sending: boolean;
  error: string | null;
  offline: boolean;
  trapMode: boolean;
  setTrapMode: (on: boolean) => void;
  send: (text: string) => void;
  /** Log an accepted suggested edit (the caller applies it to the editor). */
  noteAccept: (code: string, stats: { added: number; removed: number }) => void;
  /** Log a suggested edit the candidate reviewed and discarded. */
  noteReject: (stats: { added: number; removed: number }) => void;
  noteCopy: (snippet: string) => void;
  /** Call on every editor change; detects pastes (inserts are excluded). */
  noteEdit: (previous: string, next: string) => void;
  noteRun: (mode: "run" | "submit", passed: number, total: number, status: string) => void;
  /** Cmd+K: asks for an edit of the selected lines; resolves with the complete updated file, or throws. */
  inlineEdit: (selection: { startLine: number; endLine: number }, instruction: string) => Promise<string>;
  review: () => void;
  reviewing: boolean;
  report: BotReport | null;
  reviewError: string | null;
  /** Saved AI-use scores, oldest first (loaded after each review). */
  history: number[];
  dismissReport: () => void;
  clear: () => void;
}

/**
 * Chat state for the in-problem AI panel: transcript, sealed planted-bug tokens, and an
 * interaction log (prompts, inserts, pastes, runs) that the "Review my AI use" report scores.
 * Persists per problem in sessionStorage so switching stages or reloading keeps the thread.
 */
export function useAiAssistant({ problemId, language, getCode }: { problemId: string; language: CodeLanguage; getCode: () => string }): AiAssistant {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [traps, setTraps] = useState<Stored["traps"]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [trapMode, setTrapModeState] = useState(true);
  const [report, setReport] = useState<BotReport | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const events = useRef<BotEvent[]>([]);
  const startedAt = useRef(0);
  const lastResult = useRef<{ status: string; passed: number; total: number } | null>(null);
  const inserted = useRef<string | null>(null);

  useEffect(() => {
    const stored = load(problemId);
    startedAt.current = stored?.startedAt ?? Date.now();
    events.current = stored?.events ?? [];
    try {
      if (window.localStorage.getItem(TRAP_KEY) === "0") setTrapModeState(false);
    } catch {
      // storage blocked
    }
    // Restored after hydration: sessionStorage is not readable during the server render.
    if (stored) {
      setMessages(stored.messages);
      setTraps(stored.traps ?? []);
    }
  }, [problemId]);

  const persist = useCallback(
    (nextMessages: BotMessage[], nextTraps: Stored["traps"]) => {
      try {
        const data: Stored = { messages: nextMessages, traps: nextTraps, events: events.current, startedAt: startedAt.current };
        window.sessionStorage.setItem(chatKey(problemId), JSON.stringify(data));
      } catch {
        // storage full or blocked: the thread still works for this page view
      }
    },
    [problemId],
  );

  const log = useCallback((event: Omit<BotEvent, "at">) => {
    events.current = [...events.current, { ...event, at: Math.max(0, Date.now() - startedAt.current) }].slice(-400);
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      const next: BotMessage[] = [...messages, { role: "user", content }];
      setMessages(next);
      setError(null);
      setSending(true);
      log({ kind: "prompt", detail: content.slice(0, 500) });
      sendBotMessage({ problemId, language, code: getCode(), messages: next.slice(-40), trapMode, trapsUsed: traps.length })
        .then((response) => {
          const withReply: BotMessage[] = [...next, { role: "assistant", content: response.reply }];
          const nextTraps = response.trapToken ? [...traps, { messageIndex: next.length, token: response.trapToken }] : traps;
          setMessages(withReply);
          setTraps(nextTraps);
          setOffline(response.source === "heuristic");
          persist(withReply, nextTraps);
        })
        .catch((sendError: unknown) => {
          setError(errorMessage(sendError));
          setMessages(messages);
        })
        .finally(() => setSending(false));
    },
    [getCode, language, log, messages, persist, problemId, sending, trapMode, traps],
  );

  const noteAccept = useCallback(
    (code: string, stats: { added: number; removed: number }) => {
      inserted.current = code;
      log({ kind: "accept", detail: `accepted a suggested edit (+${stats.added} −${stats.removed} lines)` });
      persist(messages, traps);
    },
    [log, messages, persist, traps],
  );

  const noteReject = useCallback(
    (stats: { added: number; removed: number }) => {
      log({ kind: "reject", detail: `rejected a suggested edit (+${stats.added} −${stats.removed} lines)` });
      persist(messages, traps);
    },
    [log, messages, persist, traps],
  );

  const noteCopy = useCallback((snippet: string) => log({ kind: "copy", detail: `${snippet.split("\n").length} lines` }), [log]);

  const noteEdit = useCallback(
    (previous: string, next: string) => {
      if (next === inserted.current) {
        inserted.current = null;
        return;
      }
      const added = next.length - previous.length;
      if (added >= PASTE_CHARS) log({ kind: "paste", detail: `${added} characters` });
    },
    [log],
  );

  const noteRun = useCallback(
    (mode: "run" | "submit", passed: number, total: number, status: string) => {
      log({ kind: mode, passed, total });
      if (mode === "submit") lastResult.current = { status, passed, total };
    },
    [log],
  );

  const setTrapMode = useCallback((on: boolean) => {
    setTrapModeState(on);
    try {
      window.localStorage.setItem(TRAP_KEY, on ? "1" : "0");
    } catch {
      // storage blocked
    }
  }, []);

  const inlineEdit = useCallback(
    async (selection: { startLine: number; endLine: number }, instruction: string): Promise<string> => {
      const range = selection.startLine === selection.endLine ? `line ${selection.startLine}` : `lines ${selection.startLine}–${selection.endLine}`;
      log({ kind: "prompt", detail: `inline edit (${range}): ${instruction.slice(0, 400)}` });
      const response = await requestInlineEdit({
        problemId,
        language,
        code: getCode(),
        startLine: selection.startLine,
        endLine: selection.endLine,
        instruction,
        trapMode,
        trapsUsed: traps.length,
      });
      if (response.code === null) throw new Error(response.explanation);
      // Record the exchange in the transcript so it shows in the chat and the review sees it.
      const withEdit: BotMessage[] = [
        ...messages,
        { role: "user", content: `✦ Edit ${range}: ${instruction}` },
        { role: "assistant", content: `${response.explanation}\n\n\`\`\`${LANGUAGE_EXTENSIONS[language]}\n${response.code}\n\`\`\`` },
      ];
      const nextTraps = response.trapToken ? [...traps, { messageIndex: withEdit.length - 1, token: response.trapToken }] : traps;
      setMessages(withEdit);
      setTraps(nextTraps);
      persist(withEdit, nextTraps);
      return response.code;
    },
    [getCode, language, log, messages, persist, problemId, trapMode, traps],
  );

  const review = useCallback(() => {
    setReviewing(true);
    setReviewError(null);
    fetchBotReport({
      problemId,
      language,
      finalCode: getCode(),
      durationMs: Math.max(0, Date.now() - startedAt.current),
      messages: messages.slice(-60),
      events: events.current,
      traps,
      lastResult: lastResult.current,
    })
      .then((result) => {
        setReport(result);
        return fetchPracticeSessions("bot", 10).then((saved) => setHistory(saved.sessions.map((session) => session.score).reverse()));
      })
      .catch((reviewFailure: unknown) => setReviewError(errorMessage(reviewFailure)))
      .finally(() => setReviewing(false));
  }, [getCode, language, messages, problemId, traps]);

  const clear = useCallback(() => {
    setMessages([]);
    setTraps([]);
    setReport(null);
    events.current = [];
    startedAt.current = Date.now();
    lastResult.current = null;
    try {
      window.sessionStorage.removeItem(chatKey(problemId));
    } catch {
      // storage blocked
    }
  }, [problemId]);

  return {
    messages,
    sending,
    error,
    offline,
    trapMode,
    setTrapMode,
    send,
    noteAccept,
    noteReject,
    noteCopy,
    noteEdit,
    noteRun,
    inlineEdit,
    review,
    reviewing,
    report,
    reviewError,
    history,
    dismissReport: () => setReport(null),
    clear,
  };
}
